/**
 * Hydration error capture for RUM.
 *
 * Uses React's onUncaughtError callback (React 18.3+) to detect hydration
 * failures. Falls back to window error event listening for older React versions.
 *
 * Captures only sanitized, non-PII error context: error message, component
 * stack (if available), and route. Never captures user content, request data,
 * auth information, or other PII.
 */

"use client";

import { useEffect } from "react";
import { recordRumEvent } from "./index";
import { normalizeRoute } from "./normalize";

/**
 * Sanitize an error message to remove potential PII.
 * Strips URLs, email addresses, and user-controlled strings.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return "Unknown hydration error";

  return message
    // Remove URLs (could contain tokens or PII in query strings)
    .replace(/https?:\/\/[^\s"']+/g, "[url]")
    // Remove email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    // Remove anything that looks like a token or key
    .replace(/[A-Za-z0-9]{32,}/g, "[redacted]")
    // Limit length
    .slice(0, 200);
}

/**
 * Sanitize component stack to remove PII.
 */
export function sanitizeComponentStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;

  return stack
    // Remove file paths that might contain usernames
    .replace(/\/home\/[^/]+/g, "/home/[user]")
    .replace(/\/Users\/[^/]+/g, "/Users/[user]")
    // Limit length
    .slice(0, 500);
}

/**
 * Detect hydration errors using React's onUncaughtError callback.
 * This is the cleanest approach for React 18.3+.
 */
export function createHydrationErrorHandler() {
  return function onUncaughtError(error: Error) {
    const message = error?.message || "";

    // Only capture hydration-related errors
    const isHydrationError =
      message.includes("hydrat") ||
      message.includes("Hydration") ||
      message.includes("server HTML") ||
      message.includes("does not match") ||
      message.includes("mismatch") ||
      message.includes("Expected server HTML");

    if (!isHydrationError) return;

    const route =
      typeof window !== "undefined"
        ? normalizeRoute(window.location.pathname)
        : "/";

    recordRumEvent("hydration_error", 1, route);

    // Log sanitized context for debugging (never PII)
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[RUM] Hydration error captured:",
        sanitizeErrorMessage(message)
      );
    }
  };
}

/**
 * Fallback hydration error detection via window error events.
 * Used when React's onUncaughtError is not available.
 */
export function useHydrationCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleError(event: ErrorEvent) {
      const message = event?.message || "";
      const isHydrationError =
        message.includes("hydrat") ||
        message.includes("Hydration") ||
        message.includes("server HTML") ||
        message.includes("does not match") ||
        message.includes("mismatch");

      if (!isHydrationError) return;

      const route = normalizeRoute(window.location.pathname);

      recordRumEvent("hydration_error", 1, route);
    }

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);
}
