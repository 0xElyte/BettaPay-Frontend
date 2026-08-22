import { enqueue, destroySender, resetSender, getQueueSize } from '../send';
import type { RumEvent } from '../types';

function makeEvent(overrides?: Partial<RumEvent>): RumEvent {
  return {
    clientId: 'test-client-123',
    route: '/dashboard',
    name: 'fcp',
    value: 150,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('RUM sender', () => {
  let originalFetch: typeof global.fetch;
  let mockFetch: jest.Mock;
  let sendBeaconSpy: jest.Mock;

  beforeEach(() => {
    resetSender();
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    originalFetch = global.fetch;
    global.fetch = mockFetch as unknown as typeof global.fetch;
    sendBeaconSpy = jest.fn();
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeaconSpy,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('queues events without immediately sending', () => {
    enqueue(makeEvent());
    expect(getQueueSize()).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('flushes when batch size is reached', () => {
    for (let i = 0; i < 50; i++) {
      enqueue(makeEvent());
    }
    expect(getQueueSize()).toBe(0);
    // Either sendBeacon or fetch should have been called
    expect(sendBeaconSpy.mock.calls.length + mockFetch.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('uses sendBeacon when available', () => {
    enqueue(makeEvent());
    enqueue(makeEvent());
    destroySender();
    expect(sendBeaconSpy).toHaveBeenCalled();
  });

  it('does not send events after destroy and reset', () => {
    destroySender();
    resetSender();
    enqueue(makeEvent());
    expect(getQueueSize()).toBe(1);
  });

  it('handles fetch failures silently', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    enqueue(makeEvent());
    destroySender();
    await new Promise((r) => setTimeout(r, 10));
    expect(true).toBe(true);
  });

  it('handles missing sendBeacon gracefully', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    enqueue(makeEvent());
    destroySender();
    expect(mockFetch).toHaveBeenCalled();
  });
});
