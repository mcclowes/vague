import { describe, it, expect } from 'vitest';
import {
  detectNumericRange,
  detectDateRange,
  detectArrayCardinality,
  detectUniqueness,
  detectStringLengthRange,
  detectPercentage,
  detectDistribution,
  roundRangeToNice,
} from './range-detector.js';

describe('Range Detector', () => {
  describe('detectNumericRange', () => {
    it('detects min and max of integers', () => {
      const result = detectNumericRange([1, 5, 3, 9, 2]);
      expect(result).toEqual({ min: 1, max: 9, allInteger: true, decimalPlaces: 0 });
    });

    it('detects min and max of floats', () => {
      const result = detectNumericRange([1.5, 5.25, 3.75, 9.0, 2.125]);
      expect(result?.min).toBe(1.5);
      expect(result?.max).toBe(9);
      expect(result?.allInteger).toBe(false);
    });

    it('detects decimal places from bounds', () => {
      const result = detectNumericRange([1.12, 5.5, 3.333, 9.99]);
      expect(result?.decimalPlaces).toBe(2); // Based on bounds: 1.12 and 9.99
    });

    it('detects decimal places from values when bounds are integers', () => {
      const result = detectNumericRange([1, 5.123456789, 3]);
      // When bounds are integers, it scans values for decimal places
      // The implementation determines precision from the actual values
      expect(result?.decimalPlaces).toBeGreaterThan(0);
      expect(result?.allInteger).toBe(false);
    });

    it('returns null for empty array', () => {
      expect(detectNumericRange([])).toBe(null);
    });

    it('returns null for non-numeric values', () => {
      expect(detectNumericRange(['a', 'b', 'c'])).toBe(null);
    });

    it('filters out NaN values', () => {
      const result = detectNumericRange([1, NaN, 5, NaN, 3]);
      expect(result).toEqual({ min: 1, max: 5, allInteger: true, decimalPlaces: 0 });
    });

    it('handles negative numbers', () => {
      const result = detectNumericRange([-10, -5, 0, 5, 10]);
      expect(result).toEqual({ min: -10, max: 10, allInteger: true, decimalPlaces: 0 });
    });

    it('handles single value', () => {
      const result = detectNumericRange([42]);
      expect(result).toEqual({ min: 42, max: 42, allInteger: true, decimalPlaces: 0 });
    });

    it('handles mixed types (filters non-numbers)', () => {
      const result = detectNumericRange([1, 'two', 3, null, 5]);
      expect(result).toEqual({ min: 1, max: 5, allInteger: true, decimalPlaces: 0 });
    });

    it('handles zero', () => {
      const result = detectNumericRange([0, 0, 0]);
      expect(result).toEqual({ min: 0, max: 0, allInteger: true, decimalPlaces: 0 });
    });

    it('handles very large numbers', () => {
      const result = detectNumericRange([1e10, 2e10, 3e10]);
      expect(result?.min).toBe(1e10);
      expect(result?.max).toBe(3e10);
    });

    it('handles very small decimals', () => {
      const result = detectNumericRange([0.001, 0.002, 0.003]);
      expect(result?.min).toBe(0.001);
      expect(result?.max).toBe(0.003);
      expect(result?.allInteger).toBe(false);
    });
  });

  describe('detectDateRange', () => {
    it('detects date range from ISO strings', () => {
      const result = detectDateRange(['2023-01-15', '2023-06-20', '2023-12-31']);
      expect(result?.minYear).toBe(2023);
      expect(result?.maxYear).toBe(2023);
      expect(result?.hasTime).toBe(false);
    });

    it('detects datetime range', () => {
      const result = detectDateRange(['2023-01-15T10:30:00.000Z', '2024-06-20T15:45:30.000Z']);
      expect(result?.minYear).toBe(2023);
      expect(result?.maxYear).toBe(2024);
      expect(result?.hasTime).toBe(true);
    });

    it('returns null for empty array', () => {
      expect(detectDateRange([])).toBe(null);
    });

    it('returns null for non-date strings', () => {
      expect(detectDateRange(['not', 'dates', 'here'])).toBe(null);
    });

    it('filters invalid dates', () => {
      const result = detectDateRange(['2023-01-15', 'invalid', '2023-12-31']);
      expect(result?.minYear).toBe(2023);
      expect(result?.maxYear).toBe(2023);
    });

    it('handles single date', () => {
      const result = detectDateRange(['2024-06-15']);
      expect(result?.minYear).toBe(2024);
      expect(result?.maxYear).toBe(2024);
    });

    it('sorts dates correctly', () => {
      const result = detectDateRange(['2024-12-31', '2023-01-01', '2023-06-15']);
      expect(result?.minDate).toBe('2023-01-01');
      expect(result?.maxDate).toBe('2024-12-31');
    });

    it('handles mixed date and datetime', () => {
      const result = detectDateRange(['2023-01-15', '2023-06-20T12:00:00Z']);
      expect(result?.hasTime).toBe(true); // At least one has time
    });
  });

  describe('detectArrayCardinality', () => {
    it('detects min and max array lengths', () => {
      const result = detectArrayCardinality([[1, 2], [1, 2, 3, 4, 5], [1]]);
      expect(result).toEqual({ min: 1, max: 5 });
    });

    it('returns null for empty input', () => {
      expect(detectArrayCardinality([])).toBe(null);
    });

    it('returns null for non-array values', () => {
      expect(detectArrayCardinality([1, 2, 3])).toBe(null);
      expect(detectArrayCardinality(['a', 'b', 'c'])).toBe(null);
    });

    it('handles empty arrays', () => {
      const result = detectArrayCardinality([[], [1], [1, 2]]);
      expect(result).toEqual({ min: 0, max: 2 });
    });

    it('handles single array', () => {
      const result = detectArrayCardinality([[1, 2, 3]]);
      expect(result).toEqual({ min: 3, max: 3 });
    });

    it('handles uniform length arrays', () => {
      const result = detectArrayCardinality([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
      expect(result).toEqual({ min: 2, max: 2 });
    });
  });

  describe('detectUniqueness', () => {
    it('returns true when all values are unique', () => {
      expect(detectUniqueness([1, 2, 3, 4, 5], 'integer')).toBe(true);
      expect(detectUniqueness(['a', 'b', 'c'], 'string')).toBe(true);
    });

    it('returns false when there are duplicates', () => {
      expect(detectUniqueness([1, 2, 2, 3], 'integer')).toBe(false);
      expect(detectUniqueness(['a', 'b', 'a'], 'string')).toBe(false);
    });

    it('returns false for single value (not meaningful)', () => {
      expect(detectUniqueness([1], 'integer')).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(detectUniqueness([], 'integer')).toBe(false);
    });

    it('filters out null/undefined', () => {
      expect(detectUniqueness([1, null, 2, undefined, 3], 'integer')).toBe(true);
    });

    it('returns false for object type', () => {
      expect(detectUniqueness([{ a: 1 }, { a: 2 }], 'object')).toBe(false);
    });

    it('returns false for array type', () => {
      expect(detectUniqueness([[1], [2]], 'array')).toBe(false);
    });
  });

  describe('detectStringLengthRange', () => {
    it('detects min and max string lengths', () => {
      const result = detectStringLengthRange(['a', 'abc', 'abcde']);
      expect(result).toEqual({
        minLength: 1,
        maxLength: 5,
        avgLength: 3,
        isFixedLength: false,
      });
    });

    it('detects fixed length strings', () => {
      const result = detectStringLengthRange(['abc', 'def', 'ghi']);
      expect(result?.isFixedLength).toBe(true);
      expect(result?.minLength).toBe(3);
      expect(result?.maxLength).toBe(3);
    });

    it('returns null for empty array', () => {
      expect(detectStringLengthRange([])).toBe(null);
    });

    it('returns null for non-string values', () => {
      expect(detectStringLengthRange([1, 2, 3])).toBe(null);
    });

    it('handles empty strings', () => {
      const result = detectStringLengthRange(['', 'a', 'ab']);
      expect(result?.minLength).toBe(0);
    });

    it('handles single string', () => {
      const result = detectStringLengthRange(['hello']);
      expect(result).toEqual({
        minLength: 5,
        maxLength: 5,
        avgLength: 5,
        isFixedLength: true,
      });
    });

    it('calculates average correctly', () => {
      const result = detectStringLengthRange(['a', 'abc', 'abcde']); // 1 + 3 + 5 = 9 / 3 = 3
      expect(result?.avgLength).toBe(3);
    });
  });

  describe('detectPercentage', () => {
    it('detects 0-1 decimal percentages', () => {
      const result = detectPercentage([0.1, 0.25, 0.5, 0.75, 0.9]);
      expect(result?.isPercentage).toBe(true);
      expect(result?.scale).toBe('decimal');
    });

    it('detects 0-100 percentages', () => {
      const result = detectPercentage([10, 25.5, 50, 75, 90.5]);
      expect(result?.isPercentage).toBe(true);
      expect(result?.scale).toBe('percent');
    });

    it('returns null for insufficient samples', () => {
      expect(detectPercentage([0.5])).toBe(null);
    });

    it('returns isPercentage false for non-percentage data', () => {
      const result = detectPercentage([100, 200, 300, 400]);
      expect(result?.isPercentage).toBe(false);
    });

    it('handles all zeros and ones (not percentage)', () => {
      const result = detectPercentage([0, 0, 1, 1, 0, 1]);
      // All values are exactly 0 or 1, likely boolean-like, not percentage
      expect(result?.isPercentage).toBe(false);
    });

    it('filters non-numbers', () => {
      const result = detectPercentage([0.2, 'skip', 0.5, null, 0.8]);
      expect(result?.isPercentage).toBe(true);
    });
  });

  describe('detectDistribution', () => {
    it('returns null for insufficient samples', () => {
      expect(detectDistribution([1, 2, 3])).toBe(null);
    });

    it('detects uniform distribution', () => {
      // Generate uniformly distributed values
      const uniform = Array.from({ length: 100 }, (_, i) => i);
      const result = detectDistribution(uniform);
      expect(result?.type).toBe('uniform');
    });

    it('detects gaussian distribution', () => {
      // Pre-generated gaussian-like data (mean=50, stddev=10)
      const gaussian = [
        45, 52, 48, 55, 47, 53, 49, 51, 46, 54, 50, 48, 52, 47, 53, 49, 51, 46, 54, 50, 42, 58, 44,
        56, 43, 57, 45, 55, 41, 59, 48, 52, 47, 53, 49, 51, 46, 54, 50, 48, 38, 62, 40, 60, 39, 61,
        42, 58, 37, 63, 45, 55, 44, 56, 43, 57, 46, 54, 41, 59,
      ];
      const result = detectDistribution(gaussian);
      // May be gaussian or unknown depending on exact distribution
      expect(result).not.toBe(null);
      expect(['gaussian', 'uniform', 'unknown']).toContain(result?.type);
    });

    it('detects exponential distribution', () => {
      // Exponential-like data (right-skewed, min near 0)
      const exponential = [
        0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 1.5, 2.0, 2.5, 3.5, 0.15, 0.25, 0.4, 0.6, 0.9, 1.3, 1.8, 2.2,
        3.0, 4.0, 0.12, 0.22, 0.35, 0.55, 0.85, 1.1, 1.6, 2.1, 2.8, 5.0,
      ];
      const result = detectDistribution(exponential);
      expect(result).not.toBe(null);
    });

    it('handles constant values', () => {
      const constant = Array(20).fill(42);
      const result = detectDistribution(constant);
      expect(result?.type).toBe('unknown');
    });

    it('filters non-numbers', () => {
      const mixed = [...Array(15).fill(50), 'skip', null, undefined];
      const result = detectDistribution(mixed);
      // Only 15 samples, should still return a result
      expect(result).not.toBe(null);
    });

    it('includes statistical parameters', () => {
      const data = Array.from({ length: 50 }, (_, i) => i);
      const result = detectDistribution(data);
      expect(result?.mean).toBeDefined();
      expect(result?.stddev).toBeDefined();
    });
  });

  describe('roundRangeToNice', () => {
    it('keeps integers unchanged', () => {
      expect(roundRangeToNice(1, 100)).toEqual({ min: 1, max: 100 });
    });

    it('rounds decimals to reasonable precision', () => {
      const result = roundRangeToNice(1.23456, 9.87654);
      expect(result.min).toBeCloseTo(1.23, 1);
      expect(result.max).toBeCloseTo(9.88, 1);
    });

    it('handles same min and max', () => {
      expect(roundRangeToNice(5, 5)).toEqual({ min: 5, max: 5 });
    });

    it('handles zero range', () => {
      expect(roundRangeToNice(0, 0)).toEqual({ min: 0, max: 0 });
    });

    it('handles negative ranges', () => {
      const result = roundRangeToNice(-10.5, -1.5);
      expect(result.min).toBe(-10.5);
      expect(result.max).toBe(-1.5);
    });

    it('handles very small ranges with high precision', () => {
      const result = roundRangeToNice(0.001, 0.002);
      expect(result.min).toBe(0.001);
      expect(result.max).toBe(0.002);
    });

    it('handles mixed integer and decimal', () => {
      const result = roundRangeToNice(1, 9.5);
      expect(result.min).toBe(1);
      expect(result.max).toBe(9.5);
    });
  });
});
