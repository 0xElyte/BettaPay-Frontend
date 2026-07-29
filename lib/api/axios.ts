import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useRateLimitStore } from '../store/rateLimitStore';
import { getCsrfTokenFromCookie, CSRF_HEADER_NAME } from '../utils/csrf';
import { toast } from 'sonner';
import { announce } from '@/lib/utils/announce';
import { parseApiError } from '../utils/apiError';
import { getAppRouter } from '../navigation/appRouter';

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

// Use cookie-based auth (HttpOnly cookie set by the server). Do not read tokens from localStorage.
const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== 'undefined') {
  console.warn(
    '[API Client] NEXT_PUBLIC_API_URL is not set. Defaulting to http://localhost:3001. ' +
    'This will cause API calls to fail in production. Please set NEXT_PUBLIC_API_URL environment variable.'
  );
}

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000, // 15 seconds for normal requests
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

apiClient.interceptors.request.use((config) => {
  const method = (config.method || '').toLowerCase();
  if (STATE_METHODS.includes(method as (typeof STATE_METHODS)[number])) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  // Use 30 second timeout for payment submission endpoints, 15 seconds for others
  const url = config.url || '';
  if (url.includes('/payments') || url.includes('/settlements')) {
    config.timeout = 30000;
  } else {
    config.timeout = 15000;
  }

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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
    } else if (!error.response) {
      notifyError('Network error. Please check your connection.', 'network_error');
    } else if (error.response?.status >= 500) {
      const endpoint = originalRequest?.url || error.config?.url || 'unknown';
      notifyError('A server error occurred. Please try again later.', `5xx_${error.response.status}_${endpoint}`);
    }

    return Promise.reject(parseApiError(error));
  }
);
