/**
 * Frontend error-reporting type definitions.
 *
 * Every field here is privacy-safe by construction: messages and stacks are
 * scrubbed before they are attached, and context carries coarse store state
 * (authenticated yes/no, wallet connector, network) rather than identities,
 * addresses, emails, or tokens.
 */

/** Where the exception was caught. */
export type ErrorSource =
  | 'boundary'
  | 'window'
  | 'unhandledrejection'
  | 'api'
  | 'wallet'
  | 'manual';

export const VALID_ERROR_SOURCES: ReadonlySet<string> = new Set<ErrorSource>([
  'boundary',
  'window',
  'unhandledrejection',
  'api',
  'wallet',
  'manual',
]);

/**
 * Coarse application context captured alongside the error.
 *
 * Deliberately excludes: user id, email, name, wallet address, auth token,
 * query parameters, and form values.
 */
export interface ErrorContext {
  /** Normalized route path (no query string, no fragment). */
  route: string;
  /** Whether a session was active — not who the user is. */
  isAuthenticated: boolean;
  /** Coarse role label (`merchant`, `admin`, …) or null. */
  role: string | null;
  /** Whether a wallet was connected — never the address. */
  walletConnected: boolean;
  /** `freighter` | `walletconnect` | null. */
  walletConnector: string | null;
  /** `testnet` | `public` | null. */
  walletNetwork: string | null;
  /** navigator.onLine at capture time. */
  online: boolean;
  /** Viewport bucket, e.g. `1280x720`. */
  viewport?: string;
}

export interface ErrorReport {
  /** Opaque client key shared with RUM — never derived from PII. */
  clientId: string;
  /** Stable hash of name + message + top stack frame, for grouping. */
  fingerprint: string;
  source: ErrorSource;
  /** Error constructor name, e.g. `TypeError`. */
  name: string;
  /** Scrubbed error message (truncated). */
  message: string;
  /** Scrubbed stack trace (truncated). */
  stack?: string;
  /** React component stack, boundary-caught errors only. */
  componentStack?: string;
  /** Number of occurrences collapsed into this report. */
  count: number;
  context: ErrorContext;
  /** Timestamp (ms since epoch) of the first occurrence in this report. */
  timestamp: number;
  /** Application version / build ID if available. */
  appVersion?: string;
}

export interface ErrorBatchPayload {
  errors: ErrorReport[];
}
