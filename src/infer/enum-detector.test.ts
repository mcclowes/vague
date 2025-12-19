import { describe, it, expect } from 'vitest';
import {
  detectSuperposition,
  formatWeight,
  shouldIncludeWeights,
  type SuperpositionOption,
} from './enum-detector.js';

describe('Enum Detector', () => {
  describe('detectSuperposition', () => {
    it('detects enum-like values with few unique values', () => {
      const values = ['active', 'active', 'inactive', 'active', 'pending', 'inactive'];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(true);
      expect(result.options).toHaveLength(3);
    });

    it('returns options sorted by count descending', () => {
      const values = ['a', 'a', 'a', 'b', 'b', 'c'];
      const result = detectSuperposition(values);

      expect(result.options[0].value).toBe('a');
      expect(result.options[0].count).toBe(3);
      expect(result.options[1].value).toBe('b');
      expect(result.options[1].count).toBe(2);
      expect(result.options[2].value).toBe('c');
      expect(result.options[2].count).toBe(1);
    });

    it('calculates weights correctly', () => {
      const values = ['a', 'a', 'a', 'a', 'b', 'b'];
      const result = detectSuperposition(values);

      expect(result.options[0].weight).toBeCloseTo(4 / 6);
      expect(result.options[1].weight).toBeCloseTo(2 / 6);
    });

    it('detects equal weights', () => {
      const values = ['a', 'a', 'b', 'b', 'c', 'c'];
      const result = detectSuperposition(values);

      expect(result.hasEqualWeights).toBe(true);
    });

    it('detects unequal weights', () => {
      const values = ['a', 'a', 'a', 'a', 'a', 'b'];
      const result = detectSuperposition(values);

      expect(result.hasEqualWeights).toBe(false);
    });

    it('returns false for too many unique values', () => {
      const values = Array.from({ length: 15 }, (_, i) => `value${i}`);
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(false);
    });

    it('returns false for too few samples', () => {
      const values = ['a', 'b'];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(false);
    });

    it('returns false when uniqueness ratio is too high', () => {
      // Each value is unique - not enum-like
      const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(false);
    });

    it('filters out null and undefined', () => {
      const values = ['a', null, 'a', undefined, 'b', null, 'b'];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(true);
      expect(result.options).toHaveLength(2);
    });

    it('handles numeric values', () => {
      const values = [1, 1, 2, 2, 3, 3, 1, 2, 3];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(true);
      expect(result.options).toHaveLength(3);
    });

    it('handles boolean values', () => {
      const values = [true, true, false, true, false, true];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(true);
      expect(result.options).toHaveLength(2);
    });

    it('handles object values using JSON.stringify', () => {
      const values = [{ status: 'a' }, { status: 'a' }, { status: 'b' }, { status: 'b' }];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(true);
      expect(result.options).toHaveLength(2);
    });

    it('respects custom config maxUniqueValues', () => {
      const values = Array.from({ length: 20 }, (_, i) => `v${i % 5}`).concat(
        Array.from({ length: 20 }, (_, i) => `v${i % 5}`)
      );
      const result = detectSuperposition(values, { maxUniqueValues: 3 });

      expect(result.isSuperposition).toBe(false);
    });

    it('respects custom config minSamples', () => {
      const values = ['a', 'a', 'b'];
      const resultDefault = detectSuperposition(values);
      const resultCustom = detectSuperposition(values, { minSamples: 5 });

      expect(resultDefault.isSuperposition).toBe(true);
      expect(resultCustom.isSuperposition).toBe(false);
    });

    it('handles empty array', () => {
      const result = detectSuperposition([]);

      expect(result.isSuperposition).toBe(false);
      expect(result.options).toHaveLength(0);
    });

    it('handles single value repeated', () => {
      const values = ['same', 'same', 'same', 'same', 'same'];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(true);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].weight).toBe(1);
    });
  });

  describe('formatWeight', () => {
    it('formats weight to 2 decimal places', () => {
      expect(formatWeight(0.333333)).toBe('0.33');
      expect(formatWeight(0.666666)).toBe('0.67');
    });

    it('removes trailing zeros', () => {
      expect(formatWeight(0.5)).toBe('0.5');
      expect(formatWeight(0.25)).toBe('0.25');
      expect(formatWeight(1)).toBe('1');
    });

    it('handles 0', () => {
      expect(formatWeight(0)).toBe('0');
    });

    it('handles 1', () => {
      expect(formatWeight(1)).toBe('1');
    });

    it('rounds correctly', () => {
      expect(formatWeight(0.995)).toBe('1');
      expect(formatWeight(0.004)).toBe('0');
      expect(formatWeight(0.125)).toBe('0.13');
    });
  });

  describe('shouldIncludeWeights', () => {
    it('returns false for single option', () => {
      const options: SuperpositionOption[] = [{ value: 'a', count: 10, weight: 1.0 }];
      expect(shouldIncludeWeights(options)).toBe(false);
    });

    it('returns false for empty options', () => {
      expect(shouldIncludeWeights([])).toBe(false);
    });

    it('returns false for equal weights', () => {
      const options: SuperpositionOption[] = [
        { value: 'a', count: 10, weight: 0.5 },
        { value: 'b', count: 10, weight: 0.5 },
      ];
      expect(shouldIncludeWeights(options)).toBe(false);
    });

    it('returns false for nearly equal weights (within 10%)', () => {
      const options: SuperpositionOption[] = [
        { value: 'a', count: 35, weight: 0.35 },
        { value: 'b', count: 33, weight: 0.33 },
        { value: 'c', count: 32, weight: 0.32 },
      ];
      expect(shouldIncludeWeights(options)).toBe(false);
    });

    it('returns true for significantly different weights', () => {
      const options: SuperpositionOption[] = [
        { value: 'a', count: 70, weight: 0.7 },
        { value: 'b', count: 20, weight: 0.2 },
        { value: 'c', count: 10, weight: 0.1 },
      ];
      expect(shouldIncludeWeights(options)).toBe(true);
    });

    it('returns true when any weight differs by more than 10%', () => {
      const options: SuperpositionOption[] = [
        { value: 'a', count: 60, weight: 0.6 },
        { value: 'b', count: 40, weight: 0.4 },
      ];
      // Average is 0.5, both differ by 0.1 which equals threshold
      // 0.6 - 0.5 = 0.1, so it should be false (equals threshold, not greater)
      expect(shouldIncludeWeights(options)).toBe(false);

      const options2: SuperpositionOption[] = [
        { value: 'a', count: 65, weight: 0.65 },
        { value: 'b', count: 35, weight: 0.35 },
      ];
      // Average is 0.5, 0.65 - 0.5 = 0.15 > 0.1
      expect(shouldIncludeWeights(options2)).toBe(true);
    });

    it('handles three equal options', () => {
      const options: SuperpositionOption[] = [
        { value: 'a', count: 33, weight: 0.333 },
        { value: 'b', count: 33, weight: 0.333 },
        { value: 'c', count: 34, weight: 0.334 },
      ];
      expect(shouldIncludeWeights(options)).toBe(false);
    });
  });
});
