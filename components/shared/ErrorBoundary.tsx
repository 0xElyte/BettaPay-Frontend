"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

const buttonBase =
  "inline-flex items-center justify-center rounded-lg px-4 h-11 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback; when omitted the default error card is shown. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors thrown by descendant page components (e.g. a chart that
 * blows up) and shows a recoverable fallback card instead of a white screen.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Log so the failure is still visible in the console / error reporting.
    console.error("Unhandled render error caught by ErrorBoundary", error, info);
  }

  handleReset = () => {
    // Reset the boundary so the children get a fresh render attempt.
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div
          role="alert"
          className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle
              className="h-6 w-6 text-destructive"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This page ran into an unexpected error. You can try again, or head
            back to your dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className={`${buttonBase} gap-2 bg-primary text-primary-foreground hover:bg-primary/80`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </button>
            <Link
              href="/dashboard"
              className={`${buttonBase} border border-border bg-background hover:bg-muted hover:text-foreground`}
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
