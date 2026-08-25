import { act, render, screen, waitFor } from "@testing-library/react";
import { RateLimitDisplay } from "../RateLimitDisplay";
import { useRateLimitStore } from "@/lib/store/rateLimitStore";

describe("RateLimitDisplay", () => {
  afterEach(() => {
    act(() => {
      useRateLimitStore.getState().clearRateLimit();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("shows header values, counts down, and warns at 80% usage", async () => {
    const now = new Date("2026-07-23T12:00:00Z");
    jest.useFakeTimers();
    jest.setSystemTime(now);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "20",
        "X-RateLimit-Reset": String(Math.floor(now.getTime() / 1000) + 60),
      }),
    });

    render(<RateLimitDisplay />);

    await waitFor(() => expect(screen.getByText("20")).toBeInTheDocument());
    expect(screen.getByText("00:01:00")).toBeInTheDocument();
    expect(screen.getByText("80% used")).toBeInTheDocument();
    expect(screen.getByText("Approaching rate limit")).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText("00:00:59")).toBeInTheDocument();
  });

  it("subscribes to useRateLimitStore and displays 429 rate limit details (countdown, endpoint, policy)", async () => {
    const now = new Date("2026-07-23T12:00:00Z");
    jest.useFakeTimers();
    jest.setSystemTime(now);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "50",
        "X-RateLimit-Reset": String(Math.floor(now.getTime() / 1000) + 120),
      }),
    });

    // Set 429 rate limit state in store
    act(() => {
      useRateLimitStore.getState().setRateLimited(30, "/api/v1/payments", 100);
    });

    render(<RateLimitDisplay />);

    await waitFor(() => expect(screen.getByText("50")).toBeInTheDocument());

    // Check 429 active banner details
    expect(screen.getByText("Rate Limit Exceeded (HTTP 429)")).toBeInTheDocument();
    expect(screen.getByText("00:00:30")).toBeInTheDocument();
    expect(screen.getByText("(30s remaining)")).toBeInTheDocument();
    expect(screen.getByText("/api/v1/payments")).toBeInTheDocument();
    expect(screen.getByText("100 max requests / window")).toBeInTheDocument();

    // Advance 1s and check tick function decrements timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText("00:00:29")).toBeInTheDocument();
    expect(screen.getByText("(29s remaining)")).toBeInTheDocument();
  });
});
