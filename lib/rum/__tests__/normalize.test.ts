import { normalizeRoute } from '../normalize';

describe('normalizeRoute', () => {
  it('strips query strings', () => {
    expect(normalizeRoute('/dashboard?foo=bar')).toBe('/dashboard');
  });

  it('strips fragments', () => {
    expect(normalizeRoute('/dashboard#section')).toBe('/dashboard');
  });

  it('strips query strings and fragments together', () => {
    expect(normalizeRoute('/dashboard?foo=bar#section')).toBe('/dashboard');
  });

  it('collapses multiple slashes', () => {
    expect(normalizeRoute('//overview//')).toBe('/overview');
  });

  it('removes trailing slash', () => {
    expect(normalizeRoute('/dashboard/')).toBe('/dashboard');
  });

  it('preserves root path', () => {
    expect(normalizeRoute('/')).toBe('/');
  });

  it('preserves leading slash when missing', () => {
    expect(normalizeRoute('dashboard')).toBe('/dashboard');
  });

  it('handles empty string', () => {
    expect(normalizeRoute('')).toBe('/');
  });

  it('handles null/undefined input', () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    expect(normalizeRoute(null as unknown as string)).toBe('/');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    expect(normalizeRoute(undefined as unknown as string)).toBe('/');
  });

  it('preserves dynamic segments', () => {
    expect(normalizeRoute('/pay/link_abc123')).toBe('/pay/link_abc123');
  });

  it('handles deeply nested routes', () => {
    expect(normalizeRoute('/admin/transactions/123')).toBe('/admin/transactions/123');
  });

  it('strips PII-like query parameters', () => {
    expect(normalizeRoute('/search?email=test@test.com&name=John')).toBe('/search');
  });

  it('handles auth tokens in query params', () => {
    expect(normalizeRoute('/callback?token=abc123&state=xyz')).toBe('/callback');
  });
});
