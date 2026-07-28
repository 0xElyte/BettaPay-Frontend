/**
 * Shared types for the system health monitoring subsystem.
 */

export type ServiceStatus = "healthy" | "degraded" | "unhealthy";

export type ServiceName =
  | "horizon"
  | "soroban"
  | "sep24"
  | "postgres";

export interface ServiceHealth {
  /** Stable identifier for the service. */
  service: ServiceName;
  /** Human-readable display name. */
  label: string;
  status: ServiceStatus;
  /** Round-trip latency in milliseconds, when measurable. */
  latencyMs?: number;
  /** ISO-8601 timestamp of the last probe. */
  checkedAt: string;
  /**
   * Safe, user-facing error message. Must NOT expose
   * internal stack traces, connection strings, or credentials.
   */
  errorMessage?: string;
  /** Optional non-sensitive metadata (e.g. version string). */
  meta?: Record<string, string>;
}

export interface HealthResponse {
  /** ISO-8601 timestamp the aggregation completed. */
  aggregatedAt: string;
  services: ServiceHealth[];
}
