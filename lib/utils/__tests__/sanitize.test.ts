import {
  trimInput,
  normalizeEmail,
  sanitizeSearchQuery,
  sanitizeFilename,
} from '@/lib/utils/sanitize';

describe('utils/sanitize', () => {
  describe('trimInput()', () => {
    it('trims whitespace', () => {
      expect(trimInput('  hello  ')).toBe('hello');
    });
  });

  describe('normalizeEmail()', () => {
    it('trims and lowercases', () => {
      expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });
  });

  describe('sanitizeSearchQuery()', () => {
    it('trims and caps length', () => {
      const long = 'a'.repeat(200);
      expect(sanitizeSearchQuery(long)).toHaveLength(100);
    });
  });

  describe('sanitizeFilename()', () => {
    it('lowercases the name', () => {
      expect(sanitizeFilename('Invoice.PDF')).toBe('invoice.pdf');
    });

    it('replaces unsafe characters with hyphens', () => {
      expect(sanitizeFilename('INV-01ABC/DEF:2026')).toBe('inv-01abc-def-2026');
    });

    it('collapses consecutive hyphens', () => {
      expect(sanitizeFilename('a---b')).toBe('a-b');
    });

    it('trims leading and trailing hyphens', () => {
      expect(sanitizeFilename('-hello-')).toBe('hello');
    });

    it('preserves dots and underscores', () => {
      expect(sanitizeFilename('file_name.v2.pdf')).toBe('file_name.v2.pdf');
    });

    it('handles empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('strips path-ish characters', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('etc-passwd');
    });
  });
});
