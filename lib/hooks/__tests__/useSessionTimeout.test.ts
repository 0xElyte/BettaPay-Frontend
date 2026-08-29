import { renderHook, act } from '@testing-library/react';
import { useSessionTimeout } from '../useSessionTimeout';

describe('useSessionTimeout Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, expiresAt: Date.now() + 1800000 }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('starts inactive timer and triggers warning after timeoutMs', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 1000,
        gracePeriodMs: 500,
        onTimeout,
      })
    );

    expect(result.current.showWarning).toBe(false);

    // Fast-forward past timeoutMs
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.showWarning).toBe(true);
  });

  it('triggers onTimeout after gracePeriodMs expires', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 1000,
        gracePeriodMs: 2000,
        onTimeout,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000); // Trigger warning
    });
    expect(result.current.showWarning).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2000); // Elapse grace period
    });

    expect(onTimeout).toHaveBeenCalled();
  });

  it('extends session via backend refresh call', async () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 1000,
        gracePeriodMs: 2000,
        onTimeout,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.showWarning).toBe(true);

    let extended = false;
    await act(async () => {
      extended = await result.current.extendSession();
    });

    expect(extended).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.current.showWarning).toBe(false);
  });
});
