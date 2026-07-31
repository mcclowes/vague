import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dateFunctions } from './date.js';
import { setSeed } from '../random.js';
import type { GeneratorContext } from '../context.js';

// Mock context for testing
const mockContext = {} as GeneratorContext;

describe('Date Functions', () => {
  beforeEach(() => {
    setSeed(12345);
    // Mock current date to 2024-06-15T12:00:00.000Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    setSeed(null);
    vi.useRealTimers();
  });

  describe('now', () => {
    it('returns current ISO datetime', () => {
      const result = dateFunctions.now([], mockContext);
      expect(result).toBe('2024-06-15T12:00:00.000Z');
    });

    it('returns valid ISO 8601 format', () => {
      const result = dateFunctions.now([], mockContext);
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('ignores arguments', () => {
      const result = dateFunctions.now(['ignored', 123], mockContext);
      expect(result).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('today', () => {
    it('returns current date in YYYY-MM-DD format', () => {
      const result = dateFunctions.today([], mockContext);
      expect(result).toBe('2024-06-15');
    });

    it('returns valid date format', () => {
      const result = dateFunctions.today([], mockContext);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('ignores arguments', () => {
      const result = dateFunctions.today(['ignored'], mockContext);
      expect(result).toBe('2024-06-15');
    });
  });

  describe('datetime', () => {
    it('generates random datetime within default range', () => {
      const result = dateFunctions.datetime([], mockContext);
      const date = new Date(result);

      expect(date.getFullYear()).toBeGreaterThanOrEqual(2020);
      expect(date.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('generates datetime within year range', () => {
      const result = dateFunctions.datetime([2022, 2023], mockContext);
      const date = new Date(result);

      expect(date.getFullYear()).toBeGreaterThanOrEqual(2022);
      expect(date.getFullYear()).toBeLessThanOrEqual(2023);
    });

    it('generates datetime within ISO string range', () => {
      const result = dateFunctions.datetime(
        ['2023-01-01T00:00:00.000Z', '2023-12-31T23:59:59.999Z'],
        mockContext
      );
      const date = new Date(result);

      expect(date.getFullYear()).toBe(2023);
    });

    it('handles only min argument', () => {
      const result = dateFunctions.datetime([2023], mockContext);
      const date = new Date(result);

      expect(date.getFullYear()).toBeGreaterThanOrEqual(2023);
    });

    it('returns valid ISO 8601 format', () => {
      const result = dateFunctions.datetime([2020, 2024], mockContext);
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('produces deterministic results with seed', () => {
      setSeed(999);
      const result1 = dateFunctions.datetime([2020, 2024], mockContext);

      setSeed(999);
      const result2 = dateFunctions.datetime([2020, 2024], mockContext);

      expect(result1).toBe(result2);
    });
  });

  describe('daysAgo', () => {
    it('returns date n days in the past', () => {
      const result = dateFunctions.daysAgo([7], mockContext);
      expect(result).toBe('2024-06-08');
    });

    it('returns today with 0 days', () => {
      const result = dateFunctions.daysAgo([0], mockContext);
      expect(result).toBe('2024-06-15');
    });

    it('uses 0 as default', () => {
      const result = dateFunctions.daysAgo([], mockContext);
      expect(result).toBe('2024-06-15');
    });

    it('handles large numbers of days', () => {
      const result = dateFunctions.daysAgo([365], mockContext);
      // 2024 is a leap year, so 365 days ago from 2024-06-15 is 2023-06-16
      expect(result).toBe('2023-06-16');
    });

    it('handles negative days (future dates)', () => {
      const result = dateFunctions.daysAgo([-7], mockContext);
      expect(result).toBe('2024-06-22');
    });

    it('returns YYYY-MM-DD format', () => {
      const result = dateFunctions.daysAgo([1], mockContext);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles month boundaries', () => {
      const result = dateFunctions.daysAgo([15], mockContext);
      expect(result).toBe('2024-05-31');
    });
  });

  describe('daysFromNow', () => {
    it('returns date n days in the future', () => {
      const result = dateFunctions.daysFromNow([7], mockContext);
      expect(result).toBe('2024-06-22');
    });

    it('returns today with 0 days', () => {
      const result = dateFunctions.daysFromNow([0], mockContext);
      expect(result).toBe('2024-06-15');
    });

    it('uses 0 as default', () => {
      const result = dateFunctions.daysFromNow([], mockContext);
      expect(result).toBe('2024-06-15');
    });

    it('handles large numbers of days', () => {
      const result = dateFunctions.daysFromNow([365], mockContext);
      expect(result).toBe('2025-06-15');
    });

    it('handles negative days (past dates)', () => {
      const result = dateFunctions.daysFromNow([-7], mockContext);
      expect(result).toBe('2024-06-08');
    });

    it('returns YYYY-MM-DD format', () => {
      const result = dateFunctions.daysFromNow([1], mockContext);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles month boundaries', () => {
      const result = dateFunctions.daysFromNow([16], mockContext);
      expect(result).toBe('2024-07-01');
    });

    it('handles year boundaries', () => {
      const result = dateFunctions.daysFromNow([200], mockContext);
      expect(new Date(result).getFullYear()).toBe(2025);
    });
  });

  describe('dateBetween', () => {
    it('generates date between two ISO strings', () => {
      const result = dateFunctions.dateBetween(['2023-01-01', '2023-12-31'], mockContext);
      const date = new Date(result);

      expect(date.getFullYear()).toBe(2023);
    });

    it('generates date between two years', () => {
      const result = dateFunctions.dateBetween([2022, 2023], mockContext);
      const date = new Date(result);

      expect(date.getFullYear()).toBeGreaterThanOrEqual(2022);
      expect(date.getFullYear()).toBeLessThanOrEqual(2023);
    });

    it('handles "today" as start date', () => {
      const result = dateFunctions.dateBetween(['today', '2025-12-31'], mockContext);
      const date = new Date(result);

      expect(date.getTime()).toBeGreaterThanOrEqual(new Date('2024-06-15').setHours(0, 0, 0, 0));
    });

    it('handles "today" as end date', () => {
      const result = dateFunctions.dateBetween(['2023-01-01', 'today'], mockContext);
      const date = new Date(result);

      expect(date.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('handles "today" for both dates', () => {
      const result = dateFunctions.dateBetween(['today', 'today'], mockContext);
      expect(result).toBe('2024-06-15');
    });

    it('returns YYYY-MM-DD format', () => {
      const result = dateFunctions.dateBetween(['2020-01-01', '2024-12-31'], mockContext);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('produces deterministic results with seed', () => {
      setSeed(888);
      const result1 = dateFunctions.dateBetween(['2020-01-01', '2024-12-31'], mockContext);

      setSeed(888);
      const result2 = dateFunctions.dateBetween(['2020-01-01', '2024-12-31'], mockContext);

      expect(result1).toBe(result2);
    });

    it('handles mixed formats (year and ISO string)', () => {
      const result = dateFunctions.dateBetween([2023, '2023-06-30'], mockContext);
      const date = new Date(result);

      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBeLessThanOrEqual(5); // June is month 5 (0-indexed)
    });
  });

  describe('formatDate', () => {
    it('formats date with default YYYY-MM-DD', () => {
      const result = dateFunctions.formatDate(['2024-06-15T12:30:45.000Z'], mockContext);
      expect(result).toBe('2024-06-15');
    });

    it('formats with custom format', () => {
      const result = dateFunctions.formatDate(
        ['2024-06-15T12:30:45.000Z', 'DD/MM/YYYY'],
        mockContext
      );
      expect(result).toBe('15/06/2024');
    });

    it('formats with time components', () => {
      const result = dateFunctions.formatDate(
        ['2024-06-15T12:30:45.000Z', 'YYYY-MM-DD HH:mm:ss'],
        mockContext
      );
      expect(result).toBe('2024-06-15 12:30:45');
    });

    it('handles HH:mm format', () => {
      const result = dateFunctions.formatDate(['2024-06-15T09:05:00.000Z', 'HH:mm'], mockContext);
      expect(result).toBe('09:05');
    });

    it('handles single-digit values with padding', () => {
      const result = dateFunctions.formatDate(
        ['2024-01-05T03:07:09.000Z', 'YYYY-MM-DD HH:mm:ss'],
        mockContext
      );
      expect(result).toBe('2024-01-05 03:07:09');
    });

    it('handles year only', () => {
      const result = dateFunctions.formatDate(['2024-06-15T12:30:45.000Z', 'YYYY'], mockContext);
      expect(result).toBe('2024');
    });

    it('handles complex custom format', () => {
      const result = dateFunctions.formatDate(
        ['2024-06-15T12:30:45.000Z', 'DD-MM-YYYY at HH:mm'],
        mockContext
      );
      expect(result).toBe('15-06-2024 at 12:30');
    });

    it('handles date-only input', () => {
      // Note: Date parsing for date-only strings is timezone-dependent
      const result = dateFunctions.formatDate(['2024-06-15', 'YYYY-MM-DD'], mockContext);
      expect(result).toMatch(/^2024-06-1[45]$/); // May be 14 or 15 depending on timezone
    });

    it('preserves literal text in format', () => {
      const result = dateFunctions.formatDate(
        ['2024-06-15T12:30:45.000Z', 'Date: YYYY-MM-DD'],
        mockContext
      );
      expect(result).toBe('Date: 2024-06-15');
    });
  });
});
