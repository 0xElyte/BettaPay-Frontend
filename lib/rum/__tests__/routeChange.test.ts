import { normalizeRoute } from '../normalize';
import { sanitizeErrorMessage, sanitizeComponentStack } from '../useHydrationCapture';

// Test route-change tracking
describe('route-change tracking', () => {
  it('normalizes route for route change events', () => {
    const route = normalizeRoute('/dashboard?foo=bar#section');
    expect(route).toBe('/dashboard');
  });
});

describe('sanitizeErrorMessage', () => {
  it('removes URLs', () => {
    const result = sanitizeErrorMessage('Error at http://localhost:3000/dashboard');
    expect(result).not.toContain('http://localhost:3000');
    expect(result).toContain('[url]');
  });

  it('removes email addresses', () => {
    const result = sanitizeErrorMessage('Error from user@test.com');
    expect(result).not.toContain('user@test.com');
    expect(result).toContain('[email]');
  });

  it('redacts long strings (potential tokens)', () => {
    const result = sanitizeErrorMessage('Token abcdefghijklmnopqrstuvwxyz123456 failed');
    expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
    expect(result).toContain('[redacted]');
  });

  it('limits message length', () => {
    const longMessage = 'x'.repeat(500);
    const result = sanitizeErrorMessage(longMessage);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('returns default for empty message', () => {
    expect(sanitizeErrorMessage('')).toBe('Unknown hydration error');
  });
});

describe('sanitizeComponentStack', () => {
  it('removes home directory paths', () => {
    const stack = 'at Component (/home/john/src/app/page.tsx:10:5)';
    const result = sanitizeComponentStack(stack);
    expect(result).not.toContain('/home/john');
    expect(result).toContain('/home/[user]');
  });

  it('removes macOS user paths', () => {
    const stack = 'at Component (/Users/jane/src/app/page.tsx:10:5)';
    const result = sanitizeComponentStack(stack);
    expect(result).not.toContain('/Users/jane');
    expect(result).toContain('/Users/[user]');
  });

  it('returns undefined for undefined input', () => {
    expect(sanitizeComponentStack(undefined)).toBeUndefined();
  });

  it('limits output length', () => {
    const longStack = 'at Component (/home/user/file.tsx)\n'.repeat(200);
    const result = sanitizeComponentStack(longStack);
    expect(result!.length).toBeLessThanOrEqual(500);
  });
});
