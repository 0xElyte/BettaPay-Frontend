import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useRateLimitStore, isRequestRateLimited } from '../store/rateLimitStore';
import { getCsrfTokenFromCookie, CSRF_HEADER_NAME } from '../utils/csrf';
import { toast } from 'sonner';
import { announce } from '@/lib/utils/announce';
import { parseApiError, isTimeoutError, ApiError } from '../utils/apiError';
import { getAppRouter } from '../navigation/appRouter';
import { captureException } from '../errorReporting';

// Deduplication: avoid showing multiple toasts for simultaneous errors
const recentErrors = new Map<string, number>();
const ERROR_DEDUP_WINDOW_MS = 3000;
let pendingErrorBatch: {
  count: number;
  message?: string;
  timer: ReturnType<typeof setTimeout> | null;
} | null = null;

function showErrorToast(message: string) {
  toast.error(message, { duration: 5000 });
  announce(message);
}

function notifyError(message: string, key?: string) {
  const dedupKey = key || message;
  const now = Date.now();
  const lastShown = recentErrors.get(dedupKey);

  if (lastShown && now - lastShown < ERROR_DEDUP_WINDOW_MS) {
    return;
  }

  recentErrors.set(dedupKey, now);

  if (pendingErrorBatch) {
    pendingErrorBatch.count += 1;
    return;
  }

  pendingErrorBatch = {
    count: 1,
    message,
    timer: setTimeout(() => {
      if (!pendingErrorBatch) {
        return;
      }

      const summaryMessage = pendingErrorBatch.count > 1 ? 'Multiple errors occurred' : pendingErrorBatch.message || message;
      showErrorToast(summaryMessage);
      pendingErrorBatch = null;
    }, 150),
  };

  // Clean up old entries
  if (recentErrors.size > 50) {
    for (const [k, v] of recentErrors) {
      if (now - v > ERROR_DEDUP_WINDOW_MS) {
        recentErrors.delete(k);
      }
    }
  }
}

/** Fallback used when nothing else supplies a base URL. */
export const DEFAULT_API_BASE_URL = 'http://localhost:3001';

/**
 * Explicit override set through `setApiBaseUrl`. Takes precedence over every
 * other source so tests and QA tooling can retarget the client at will.
 */
let baseUrlOverride: string | null = null;

/** The missing-config warning is noisy; emit it at most once per session. */
let hasWarnedAboutBaseUrl = false;

/** Trim trailing slashes so joining a path never produces a double slash. */
function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Runtime escape hatch for environments that cannot rebuild to change the
 * endpoint. `process.env.NEXT_PUBLIC_*` is inlined into the client bundle at
 * build time, so a deployed bundle can only be retargeted through a value that
 * is read at request time — this global, or `setApiBaseUrl`.
 */
function readRuntimeBaseUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const runtime = (window as unknown as Record<string, unknown>).__BETTAPAY_API_URL__;
  return typeof runtime === 'string' && runtime.trim() ? runtime : undefined;
}

/**
 * Resolve the base URL for the next request.
 *
 * Precedence: explicit override → runtime global → build-time env → default.
 * Called per request rather than captured at module load, so a change to any
 * of these sources takes effect on the very next call.
 */
export function resolveApiBaseUrl(): string {
  const configured =
    baseUrlOverride ?? readRuntimeBaseUrl() ?? process.env.NEXT_PUBLIC_API_URL;

  if (configured && configured.trim()) {
    return normalizeBaseUrl(configured);
  }

  if (!hasWarnedAboutBaseUrl && typeof window !== 'undefined') {
    hasWarnedAboutBaseUrl = true;
    console.warn(
      '[API Client] NEXT_PUBLIC_API_URL is not set. Defaulting to http://localhost:3001. ' +
      'This will cause API calls to fail in production. Please set NEXT_PUBLIC_API_URL environment variable.'
    );
  }

  return DEFAULT_API_BASE_URL;
}

/**
 * Point the client at a different backend. Affects every subsequent request;
 * in-flight requests keep the URL they were dispatched with.
 *
 * Pass `null` (or use `resetApiBaseUrl`) to fall back to the configured value.
 */
export function setApiBaseUrl(url: string | null): void {
  baseUrlOverride = url && url.trim() ? normalizeBaseUrl(url) : null;
}

/** Clear an override set by `setApiBaseUrl`. */
export function resetApiBaseUrl(): void {
  baseUrlOverride = null;
}

/** The base URL the next request would use. */
export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

// Default timeout for all requests unless a longer one is needed (e.g. payment submission).
export const DEFAULT_TIMEOUT_MS = 15000;
// Payment submission endpoints (charge creation, settlement processing) can take longer
// than standard reads because they may wait for provider confirmation.
export const PAYMENT_TIMEOUT_MS = 30000;
// URLs matching these paths get the extended payment timeout.
const PAYMENT_TIMEOUT_PATHS: ReadonlyArray<string> = ['/payments', '/settlements'];

// Auth is cookie-based (HttpOnly cookie set by the server); tokens are never
// read from localStorage.
//
// No `baseURL` here on purpose: leaving the instance default unset means a
// per-request baseURL from a caller is still distinguishable in the request
// interceptor, which resolves the current value for everything else.
export const apiClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send cookies for same-site or cross-site auth flows where backend sets HttpOnly cookie
  withCredentials: true,
});

// Separate instance for refresh calls to avoid interceptor recursion.
// Must use same-origin (no baseURL) because /api/auth/refresh is a Next.js API route,
// not a backend endpoint. Cookies are sent to the Next.js server, not the backend.
const refreshClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach CSRF token to all state-changing requests (double-submit cookie pattern)
const STATE_METHODS = ['post', 'put', 'patch', 'delete'] as const;

// Resolve the timeout for a request. Payment submission endpoints get the extended
// timeout; everything else uses the default. Note that Axios merges the instance
// default into every request config, so the URL match is the authoritative signal
// here and cannot be distinguished from a caller-provided value at this point.
function resolveRequestTimeout(url: string | undefined): number {
  const safeUrl = url || '';
  return PAYMENT_TIMEOUT_PATHS.some((path) => safeUrl.includes(path)) ? PAYMENT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

/** Error code used for requests refused locally by the shared 429 window. */
export const RATE_LIMIT_BLOCKED_CODE = 'RATE_LIMIT_BLOCKED';

/** True for the synthetic error raised when a request is held back locally. */
function isRateLimitBlockedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === RATE_LIMIT_BLOCKED_CODE;
}

apiClient.interceptors.request.use((config) => {
  // Hold requests back while a rate-limit window is open — including one
  // opened in another tab. Without this, sibling tabs keep firing into a limit
  // the user is already waiting out, extending it for everyone.
  if (isRequestRateLimited(config.url)) {
    const { secondsRemaining } = useRateLimitStore.getState();
    throw new ApiError(
      `Rate limited. Please try again in ${secondsRemaining} seconds.`,
      RATE_LIMIT_BLOCKED_CODE,
      429
    );
  }

  // Resolve the base URL at dispatch time so runtime endpoint switches (QA,
  // tests) apply to the next request instead of being frozen at import.
  if (!config.baseURL) {
    config.baseURL = resolveApiBaseUrl();
  }

  const method = (config.method || '').toLowerCase();
  if (STATE_METHODS.includes(method as (typeof STATE_METHODS)[number])) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  config.timeout = resolveRequestTimeout(config.url);

  return config;
});

// Token refresh state
let isRefreshing = false;
// Auth is cookie-based (the refresh endpoint sets a fresh HttpOnly cookie and
// returns no token), so queued requests only need to know whether the refresh
// succeeded — there is no token to thread through. Each queued entry re-issues
// its original request on resolve, so the real response flows back to callers.
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
}

function redirectToLogin() {
  // Don't redirect if already on an auth page — prevents infinite redirect loops
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
    return;
  }
  useAuthStore.getState().logout();

  // Prefer a client-side navigation via the App Router so React state, context
  // and the query cache survive the redirect. The interceptor runs outside the
  // component tree, so the router is provided through a module-level singleton
  // registered by a top-level provider. Fall back to a full-page navigation
  // only when the router isn't available (SSR or before the provider mounts).
  const router = getAppRouter();
  if (router) {
    router.push('/auth/login');
  } else if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}

// Send server errors and network failures to the reporting backend. Only the
// method, path and status travel with the report — never request bodies,
// headers, or query strings, which routinely carry PII.
function reportApiFailure(error: AxiosError, kind: string) {
  const method = (error.config?.method || 'get').toUpperCase();
  const path = (error.config?.url || 'unknown').split('?')[0];
  const status = error.response?.status ?? 0;

  captureException(
    new Error(`API ${kind}: ${method} ${path} -> ${status || 'no response'}`),
    { source: 'api' }
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Requests refused by the shared rate-limit window never reached the
    // network. They still travel through this handler (a rejected request
    // interceptor shares the promise chain), so return early rather than
    // reporting them as a network failure and toasting a second time.
    if (isRateLimitBlockedError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 with token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes, then re-issue it and
        // resolve with the actual retried response (not undefined).
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshClient.post('/api/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        redirectToLogin();
        return Promise.reject(parseApiError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 429 rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const seconds = parseInt(String(retryAfter), 10) || 30;
      const endpoint = originalRequest?.url || error.config?.url || 'unknown';
      const rawLimit = error.response?.headers?.['x-ratelimit-limit'] || error.response?.headers?.['X-RateLimit-Limit'];
      const limit = rawLimit ? parseInt(String(rawLimit), 10) : undefined;
      useRateLimitStore.getState().setRateLimited(seconds, endpoint, limit);
      notifyError(`Too many attempts. Please try again in ${seconds} seconds.`, `429_${endpoint}`);
    } else if (isTimeoutError(error)) {
      // Axios aborts timed-out requests and surfaces an ECONNABORTED error.
      // Avoid the generic network message so the user knows the request was
      // given ample time and can retry.
      notifyError('The request timed out. Please try again.', `timeout_${originalRequest?.url || 'unknown'}`);
    } else if (!error.response) {
      notifyError('Network error. Please check your connection.', 'network_error');
      reportApiFailure(error, 'network');
    } else if (error.response?.status >= 500) {
      const endpoint = originalRequest?.url || error.config?.url || 'unknown';
      notifyError('A server error occurred. Please try again later.', `5xx_${error.response.status}_${endpoint}`);
      reportApiFailure(error, `http_${error.response.status}`);
    }

    return Promise.reject(parseApiError(error));
  }
);
