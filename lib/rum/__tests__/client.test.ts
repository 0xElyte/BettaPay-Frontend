import { djb2Hash, shouldSample, getClientId } from '../client';

describe('djb2Hash', () => {
  it('returns a non-negative integer', () => {
    const hash = djb2Hash('test-string');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hash)).toBe(true);
  });

  it('is deterministic for the same input', () => {
    expect(djb2Hash('hello')).toBe(djb2Hash('hello'));
  });

  it('produces different values for different inputs', () => {
    expect(djb2Hash('hello')).not.toBe(djb2Hash('world'));
  });

  it('handles empty string', () => {
    const hash = djb2Hash('');
    expect(hash).toBeGreaterThanOrEqual(0);
  });
});

describe('shouldSample', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when sampleRate is 1', () => {
    expect(shouldSample('client1', 1)).toBe(true);
  });

  it('returns false when sampleRate is 0', () => {
    expect(shouldSample('client1', 0)).toBe(false);
  });

  it('returns false when clientId is empty', () => {
    expect(shouldSample('', 1)).toBe(false);
  });

  it('is deterministic for the same client in the same window', () => {
    const result1 = shouldSample('consistent-client', 0.5);
    const result2 = shouldSample('consistent-client', 0.5);
    expect(result1).toBe(result2);
  });

  it('returns false when sampleRate is negative', () => {
    expect(shouldSample('client1', -0.5)).toBe(false);
  });
});

describe('clientId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('generates and persists a client ID in sessionStorage', () => {
    const id1 = getClientId();
    const id2 = getClientId();
    expect(id1).toBeTruthy();
    expect(id2).toBe(id1);
  });
});
