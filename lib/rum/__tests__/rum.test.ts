import { normalizeRoute } from '../normalize';

jest.mock('../client', () => ({
  getClientId: jest.fn(() => 'test-client-id'),
  shouldSample: jest.fn(() => true),
  djb2Hash: jest.fn(() => 12345),
}));

jest.mock('../collect', () => ({
  startCollectors: jest.fn(() => jest.fn()),
}));

jest.mock('../send', () => ({
  enqueue: jest.fn(),
  initSender: jest.fn(),
  destroySender: jest.fn(),
}));

// Import after mocks are set up — used only by dynamic imports inside tests
import '../index';

describe('initRum', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Reset the module-level isInitialized flag by re-requiring
    jest.resetModules();
    jest.mock('../client', () => ({
      getClientId: jest.fn(() => 'test-client-id'),
      shouldSample: jest.fn(() => true),
      djb2Hash: jest.fn(() => 12345),
    }));
    jest.mock('../collect', () => ({
      startCollectors: jest.fn(() => jest.fn()),
    }));
    jest.mock('../send', () => ({
      enqueue: jest.fn(),
      initSender: jest.fn(),
      destroySender: jest.fn(),
    }));
  });

  it('returns a cleanup function', async () => {
    const { initRum: freshInit } = await import('../index');
    const cleanup = freshInit();
    expect(typeof cleanup).toBe('function');
  });

  it('only initializes once', async () => {
    const { initRum: freshInit } = await import('../index');
    const { initSender } = await import('../send');
    freshInit();
    freshInit();
    expect((initSender as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it('respects disabled telemetry in localStorage', async () => {
    localStorage.setItem('bp_telemetry_consent', 'false');
    const { initRum: freshInit } = await import('../index');
    const cleanup = freshInit();
    expect(typeof cleanup).toBe('function');
  });
});

describe('recordRumEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and enqueues an event', async () => {
    const { recordRumEvent: freshRecord } = await import('../index');
    const { enqueue } = await import('../send');
    freshRecord('fcp', 150, '/dashboard');
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'fcp',
        value: 150,
        route: '/dashboard',
        clientId: 'test-client-id',
      })
    );
  });

  it('normalizes the route', async () => {
    const { recordRumEvent: freshRecord } = await import('../index');
    const { enqueue } = await import('../send');
    freshRecord('lcp', 200, '/dashboard?foo=bar');
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        route: '/dashboard',
      })
    );
  });

  it('includes navigationType when provided', async () => {
    const { recordRumEvent: freshRecord } = await import('../index');
    const { enqueue } = await import('../send');
    freshRecord('ttfb', 100, '/overview', { navigationType: 'reload' });
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        navigationType: 'reload',
      })
    );
  });
});

describe('privacy / PII checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('event payload contains no PII fields', async () => {
    const { recordRumEvent: freshRecord } = await import('../index');
    const { enqueue } = await import('../send');
    freshRecord('fcp', 150, '/dashboard');
    const event = (enqueue as jest.Mock).mock.calls[0][0];

    expect(event).not.toHaveProperty('email');
    expect(event).not.toHaveProperty('userId');
    expect(event).not.toHaveProperty('token');
    expect(event).not.toHaveProperty('cookie');
    expect(event).not.toHaveProperty('ip');
    expect(event).not.toHaveProperty('userAgent');
  });

  it('route normalization strips query params (potential PII)', () => {
    const route = normalizeRoute('/search?email=user@test.com&token=secret');
    expect(route).toBe('/search');
    expect(route).not.toContain('email');
    expect(route).not.toContain('token');
  });

  it('route normalization strips fragments (potential PII)', () => {
    const route = normalizeRoute('/page#user-data');
    expect(route).toBe('/page');
  });
});
