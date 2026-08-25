/**
 * __tests__/SystemHealthCard.test.tsx
 *
 * Tests for the SystemHealthCard component (and indirectly useSystemHealth).
 *
 * Coverage:
 *  1. Initial loading state — skeleton renders, no service rows yet
 *  2. Successful fetch — all 4 service rows appear
 *  3. Healthy services display correctly (green indicator + label)
 *  4. Degraded services display correctly (yellow indicator + label)
 *  5. Unhealthy services display correctly (red indicator + error message)
 *  6. Error state — banner shown, stale data preserved
 *  7. Refresh button triggers a new fetch
 *  8. Polling cleanup on unmount
 *  9. One failing service does not prevent others from rendering
 */

import React from "react";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import type { HealthResponse } from "@/lib/types/health";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Stub lucide-react icons
jest.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return {
    RefreshCw: icon("RefreshCw"),
    CheckCircle2: icon("CheckCircle2"),
    AlertTriangle: icon("AlertTriangle"),
    XCircle: icon("XCircle"),
  };
});

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// Stub Card components
jest.mock("@/components/ui/card", () => {
  const Card = ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="card" className={className}>{children}</div>
  );
  const CardHeader = ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="card-header" className={className}>{children}</div>
  );
  const CardTitle = ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="card-title" className={className}>{children}</div>
  );
  const CardContent = ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="card-content" className={className}>{children}</div>
  );
  return { Card, CardHeader, CardTitle, CardContent };
});

// Stub Skeleton
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const makeHealthResponse = (
  overrides?: Partial<HealthResponse["services"][number]>[]
): HealthResponse => ({
  aggregatedAt: "2026-07-27T16:00:00.000Z",
  services: [
    {
      service: "horizon",
      label: "Horizon API",
      status: "healthy",
      latencyMs: 45,
      checkedAt: "2026-07-27T16:00:00.000Z",
    },
    {
      service: "soroban",
      label: "Soroban RPC",
      status: "healthy",
      latencyMs: 120,
      checkedAt: "2026-07-27T16:00:00.000Z",
    },
    {
      service: "sep24",
      label: "SEP-24 Anchor",
      status: "healthy",
      latencyMs: 80,
      checkedAt: "2026-07-27T16:00:00.000Z",
    },
    {
      service: "postgres",
      label: "PostgreSQL",
      status: "healthy",
      latencyMs: 12,
      checkedAt: "2026-07-27T16:00:00.000Z",
    },
    ...(overrides ?? []),
  ].slice(0, 4 + (overrides?.length ?? 0) - (overrides ? overrides.length : 0)) as HealthResponse["services"],
});

// Build a response where one service has a specific status
function responseWithStatus(
  serviceIndex: number,
  patch: Partial<HealthResponse["services"][number]>
): HealthResponse {
  const base = makeHealthResponse();
  base.services[serviceIndex] = { ...base.services[serviceIndex], ...patch };
  return base;
}

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(response: HealthResponse | null, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
  });
}

function mockFetchError(message = "Network error") {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

// ---------------------------------------------------------------------------
// Timer / interval control
// ---------------------------------------------------------------------------

// We import the hook's exported constant to match its interval value exactly.
jest.mock("@/lib/hooks/useSystemHealth", () => {
  const actual = jest.requireActual("@/lib/hooks/useSystemHealth");
  return actual; // use the real implementation
});

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import { SystemHealthCard } from "@/components/admin/SystemHealthCard";
import { POLL_INTERVAL_MS } from "@/lib/hooks/useSystemHealth";

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
  // Document visibility defaults to visible
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Initial loading state
// ---------------------------------------------------------------------------

describe("SystemHealthCard — loading state", () => {
  it("shows skeleton rows before the first fetch resolves", async () => {
    // Never resolves fetch — keeps component in loading state
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<SystemHealthCard />);

    const skeletons = screen.getAllByTestId("skeleton");
    // 4 services × multiple skeleton elements per row (dot, name, sub-label, latency)
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("renders the 'System Health' card title", async () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<SystemHealthCard />);
    expect(screen.getByTestId("card-title")).toHaveTextContent("System Health");
  });

  it("announces 'Loading system health data' to screen readers while loading", () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<SystemHealthCard />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/loading/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Successful fetch — all services render
// ---------------------------------------------------------------------------

describe("SystemHealthCard — successful fetch", () => {
  it("renders all 4 service labels after a successful fetch", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => {
      expect(screen.getByText("Horizon API")).toBeInTheDocument();
      expect(screen.getByText("Soroban RPC")).toBeInTheDocument();
      expect(screen.getByText("SEP-24 Anchor")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    });
  });

  it("does not show skeleton after data arrives", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));
    // All skeletons should be gone
    expect(screen.queryAllByTestId("skeleton")).toHaveLength(0);
  });

  it("fetch is called exactly once on mount", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/health",
      expect.objectContaining({ cache: "no-store" })
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Healthy services display correctly
// ---------------------------------------------------------------------------

describe("SystemHealthCard — healthy services", () => {
  it("shows 'Healthy' label for all healthy services", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));
    const healthyLabels = screen.getAllByText("Healthy");
    expect(healthyLabels).toHaveLength(4);
  });

  it("displays latency in ms for healthy services", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("45ms"));
    expect(screen.getByText("120ms")).toBeInTheDocument();
    expect(screen.getByText("80ms")).toBeInTheDocument();
    expect(screen.getByText("12ms")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Degraded services display correctly
// ---------------------------------------------------------------------------

describe("SystemHealthCard — degraded services", () => {
  const degradedResponse = responseWithStatus(1, {
    status: "degraded",
    latencyMs: 2500,
    errorMessage: "High response time detected",
  });

  it("shows 'Degraded' label for a degraded service", async () => {
    mockFetch(degradedResponse);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Degraded"));
    expect(screen.getByText("Degraded")).toBeInTheDocument();
  });

  it("displays the degraded error message", async () => {
    mockFetch(degradedResponse);
    render(<SystemHealthCard />);

    await waitFor(() =>
      screen.getByText("High response time detected")
    );
  });

  it("still shows other services as Healthy", async () => {
    mockFetch(degradedResponse);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Degraded"));
    const healthyLabels = screen.getAllByText("Healthy");
    expect(healthyLabels).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 5. Unhealthy services display correctly
// ---------------------------------------------------------------------------

describe("SystemHealthCard — unhealthy services", () => {
  const unhealthyResponse = responseWithStatus(0, {
    status: "unhealthy",
    latencyMs: undefined,
    errorMessage: "Connection refused",
  });

  it("shows 'Unhealthy' label for a failed service", async () => {
    mockFetch(unhealthyResponse);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Unhealthy"));
    expect(screen.getByText("Unhealthy")).toBeInTheDocument();
  });

  it("renders the error message for an unhealthy service", async () => {
    mockFetch(unhealthyResponse);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Connection refused"));
  });

  it("still renders other healthy services", async () => {
    mockFetch(unhealthyResponse);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Unhealthy"));
    expect(screen.getByText("Soroban RPC")).toBeInTheDocument();
    expect(screen.getByText("SEP-24 Anchor")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. Error state — network failure
// ---------------------------------------------------------------------------

describe("SystemHealthCard — fetch error", () => {
  it("shows an error banner when the fetch fails", async () => {
    mockFetchError("Failed to fetch");
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("preserves last-known data after a refetch failure", async () => {
    // First fetch succeeds
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));

    // Second fetch fails
    mockFetchError("Network offline");

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS + 100);
    });

    // Data from first fetch is still visible
    expect(screen.getByText("Horizon API")).toBeInTheDocument();
    // And error banner has appeared
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows 'showing last known data' hint when stale data is preserved", async () => {
    // First fetch succeeds
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));

    // Second fetch fails
    mockFetchError("Network offline");

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS + 100);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/last known data/i);
  });

  it("shows error when the endpoint returns a non-200 status", async () => {
    mockFetch(null, 403);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. Manual refresh button
// ---------------------------------------------------------------------------

describe("SystemHealthCard — refresh button", () => {
  it("calls fetch again when the refresh button is clicked", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    const refreshBtn = screen.getByRole("button", { name: /refresh system health/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  it("refresh button is keyboard-accessible (has accessible name)", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));

    const refreshBtn = screen.getByRole("button", { name: /refresh system health/i });
    expect(refreshBtn).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Polling and cleanup on unmount
// ---------------------------------------------------------------------------

describe("SystemHealthCard — polling and cleanup", () => {
  it("polls again after the interval elapses", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));

    const callsAfterMount = (global.fetch as jest.Mock).mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS + 100);
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsAfterMount
    );
  });

  it("stops polling after unmount — no new fetch calls", async () => {
    mockFetch(makeHealthResponse());
    const { unmount } = render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));

    unmount();
    const callsAtUnmount = (global.fetch as jest.Mock).mock.calls.length;

    // Advance multiple intervals — no new calls should happen
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsAtUnmount);
  });

  it("pauses polling when the page becomes hidden", async () => {
    mockFetch(makeHealthResponse());
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));

    // Simulate tab hiding
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    const callsWhenHidden = (global.fetch as jest.Mock).mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    });

    // No new calls while hidden
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsWhenHidden);
  });
});

// ---------------------------------------------------------------------------
// 9. One failing service does not block others
// ---------------------------------------------------------------------------

describe("SystemHealthCard — partial failure", () => {
  it("renders all 4 rows even when one is unhealthy", async () => {
    const partial = responseWithStatus(2, {
      status: "unhealthy",
      errorMessage: "Anchor server error",
    });
    mockFetch(partial);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Horizon API"));
    expect(screen.getByText("Soroban RPC")).toBeInTheDocument();
    expect(screen.getByText("SEP-24 Anchor")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("shows Unhealthy for the bad service and Healthy for others", async () => {
    const partial = responseWithStatus(3, {
      status: "unhealthy",
      errorMessage: "DB connection pool exhausted",
    });
    mockFetch(partial);
    render(<SystemHealthCard />);

    await waitFor(() => screen.getByText("Unhealthy"));
    expect(screen.getByText("DB connection pool exhausted")).toBeInTheDocument();
    expect(screen.getAllByText("Healthy")).toHaveLength(3);
  });
});
