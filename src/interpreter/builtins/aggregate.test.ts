import { describe, it, expect } from 'vitest';
import { aggregateFunctions } from './aggregate.js';
import type { GeneratorContext } from '../context.js';

// Mock context for testing
const mockContext = {} as GeneratorContext;

describe('Aggregate Functions', () => {
  describe('sum', () => {
    it('sums an array of numbers', () => {
      expect(aggregateFunctions.sum([[1, 2, 3, 4, 5]], mockContext)).toBe(15);
    });

    it('returns 0 for empty array', () => {
      expect(aggregateFunctions.sum([[]], mockContext)).toBe(0);
    });

    it('returns 0 for non-array input', () => {
      expect(aggregateFunctions.sum([null], mockContext)).toBe(0);
      expect(aggregateFunctions.sum([undefined], mockContext)).toBe(0);
      expect(aggregateFunctions.sum([42], mockContext)).toBe(0);
      expect(aggregateFunctions.sum(['string'], mockContext)).toBe(0);
    });

    it('ignores non-number elements in array', () => {
      expect(aggregateFunctions.sum([[1, 'two', 3, null, 5]], mockContext)).toBe(9);
    });

    it('handles negative numbers', () => {
      expect(aggregateFunctions.sum([[-1, -2, 3]], mockContext)).toBe(0);
    });

    it('handles floating point numbers', () => {
      expect(aggregateFunctions.sum([[0.1, 0.2, 0.3]], mockContext)).toBeCloseTo(0.6);
    });

    it('handles large numbers', () => {
      expect(aggregateFunctions.sum([[1e10, 2e10, 3e10]], mockContext)).toBe(6e10);
    });

    it('handles single element array', () => {
      expect(aggregateFunctions.sum([[42]], mockContext)).toBe(42);
    });

    it('handles NaN in array (filters it out as non-number behavior)', () => {
      // NaN is typeof 'number' but should be handled gracefully
      const result = aggregateFunctions.sum([[1, NaN, 3]], mockContext);
      expect(result).toBeNaN(); // NaN propagates through addition
    });

    it('handles Infinity', () => {
      expect(aggregateFunctions.sum([[1, Infinity, 3]], mockContext)).toBe(Infinity);
    });
  });

  describe('count', () => {
    it('counts elements in array', () => {
      expect(aggregateFunctions.count([[1, 2, 3, 4, 5]], mockContext)).toBe(5);
    });

    it('returns 0 for empty array', () => {
      expect(aggregateFunctions.count([[]], mockContext)).toBe(0);
    });

    it('returns 0 for non-array input', () => {
      expect(aggregateFunctions.count([null], mockContext)).toBe(0);
      expect(aggregateFunctions.count([undefined], mockContext)).toBe(0);
      expect(aggregateFunctions.count([42], mockContext)).toBe(0);
    });

    it('counts all elements including non-numbers', () => {
      expect(aggregateFunctions.count([[1, 'two', null, undefined, {}]], mockContext)).toBe(5);
    });

    it('counts single element', () => {
      expect(aggregateFunctions.count([['single']], mockContext)).toBe(1);
    });
  });

  describe('min', () => {
    it('finds minimum in array', () => {
      expect(aggregateFunctions.min([[5, 2, 8, 1, 9]], mockContext)).toBe(1);
    });

    it('returns 0 for empty array', () => {
      expect(aggregateFunctions.min([[]], mockContext)).toBe(0);
    });

    it('returns 0 for array with no numbers', () => {
      expect(aggregateFunctions.min([['a', 'b', null]], mockContext)).toBe(0);
    });

    it('handles negative numbers', () => {
      expect(aggregateFunctions.min([[-5, -2, -8, -1]], mockContext)).toBe(-8);
    });

    it('handles mixed positive and negative', () => {
      expect(aggregateFunctions.min([[-5, 0, 5]], mockContext)).toBe(-5);
    });

    it('handles floating point numbers', () => {
      expect(aggregateFunctions.min([[0.5, 0.1, 0.9]], mockContext)).toBeCloseTo(0.1);
    });

    it('ignores non-number elements', () => {
      expect(aggregateFunctions.min([[5, 'two', 3, null, 1]], mockContext)).toBe(1);
    });

    it('handles single element', () => {
      expect(aggregateFunctions.min([[42]], mockContext)).toBe(42);
    });

    it('handles direct number arguments (fallback)', () => {
      expect(aggregateFunctions.min([5, 2, 8, 1, 9], mockContext)).toBe(1);
    });

    it('returns 0 for non-array with no number arguments', () => {
      expect(aggregateFunctions.min(['a', 'b'], mockContext)).toBe(0);
    });
  });

  describe('max', () => {
    it('finds maximum in array', () => {
      expect(aggregateFunctions.max([[5, 2, 8, 1, 9]], mockContext)).toBe(9);
    });

    it('returns 0 for empty array', () => {
      expect(aggregateFunctions.max([[]], mockContext)).toBe(0);
    });

    it('returns 0 for array with no numbers', () => {
      expect(aggregateFunctions.max([['a', 'b', null]], mockContext)).toBe(0);
    });

    it('handles negative numbers', () => {
      expect(aggregateFunctions.max([[-5, -2, -8, -1]], mockContext)).toBe(-1);
    });

    it('handles mixed positive and negative', () => {
      expect(aggregateFunctions.max([[-5, 0, 5]], mockContext)).toBe(5);
    });

    it('handles floating point numbers', () => {
      expect(aggregateFunctions.max([[0.5, 0.1, 0.9]], mockContext)).toBeCloseTo(0.9);
    });

    it('ignores non-number elements', () => {
      expect(aggregateFunctions.max([[5, 'two', 3, null, 9]], mockContext)).toBe(9);
    });

    it('handles single element', () => {
      expect(aggregateFunctions.max([[42]], mockContext)).toBe(42);
    });

    it('handles direct number arguments (fallback)', () => {
      expect(aggregateFunctions.max([5, 2, 8, 1, 9], mockContext)).toBe(9);
    });
  });

  describe('avg', () => {
    it('calculates average of array', () => {
      expect(aggregateFunctions.avg([[2, 4, 6, 8, 10]], mockContext)).toBe(6);
    });

    it('returns 0 for empty array', () => {
      expect(aggregateFunctions.avg([[]], mockContext)).toBe(0);
    });

    it('returns 0 for non-array input', () => {
      expect(aggregateFunctions.avg([null], mockContext)).toBe(0);
      expect(aggregateFunctions.avg([42], mockContext)).toBe(0);
    });

    it('returns 0 for array with no numbers', () => {
      expect(aggregateFunctions.avg([['a', 'b', null]], mockContext)).toBe(0);
    });

    it('handles floating point result', () => {
      expect(aggregateFunctions.avg([[1, 2, 3]], mockContext)).toBeCloseTo(2);
    });

    it('handles negative numbers', () => {
      expect(aggregateFunctions.avg([[-4, -2, 0, 2, 4]], mockContext)).toBe(0);
    });

    it('ignores non-number elements', () => {
      expect(aggregateFunctions.avg([[2, 'skip', 4, null, 6]], mockContext)).toBe(4);
    });

    it('handles single element', () => {
      expect(aggregateFunctions.avg([[42]], mockContext)).toBe(42);
    });

    it('handles floating point precision', () => {
      expect(aggregateFunctions.avg([[0.1, 0.2, 0.3]], mockContext)).toBeCloseTo(0.2);
    });
  });

  describe('first', () => {
    it('returns first element of array', () => {
      expect(aggregateFunctions.first([['a', 'b', 'c']], mockContext)).toBe('a');
    });

    it('returns first number from number array', () => {
      expect(aggregateFunctions.first([[1, 2, 3]], mockContext)).toBe(1);
    });

    it('returns null for empty array', () => {
      expect(aggregateFunctions.first([[]], mockContext)).toBe(null);
    });

    it('returns null for non-array input', () => {
      expect(aggregateFunctions.first([null], mockContext)).toBe(null);
      expect(aggregateFunctions.first([undefined], mockContext)).toBe(null);
      expect(aggregateFunctions.first([42], mockContext)).toBe(null);
    });

    it('returns first element even if null', () => {
      expect(aggregateFunctions.first([[null, 'b', 'c']], mockContext)).toBe(null);
    });

    it('returns first element even if undefined', () => {
      expect(aggregateFunctions.first([[undefined, 'b', 'c']], mockContext)).toBe(undefined);
    });

    it('handles object first element', () => {
      const obj = { key: 'value' };
      expect(aggregateFunctions.first([[obj, 'b']], mockContext)).toBe(obj);
    });
  });

  describe('last', () => {
    it('returns last element of array', () => {
      expect(aggregateFunctions.last([['a', 'b', 'c']], mockContext)).toBe('c');
    });

    it('returns last number from number array', () => {
      expect(aggregateFunctions.last([[1, 2, 3]], mockContext)).toBe(3);
    });

    it('returns null for empty array', () => {
      expect(aggregateFunctions.last([[]], mockContext)).toBe(null);
    });

    it('returns null for non-array input', () => {
      expect(aggregateFunctions.last([null], mockContext)).toBe(null);
      expect(aggregateFunctions.last([undefined], mockContext)).toBe(null);
      expect(aggregateFunctions.last([42], mockContext)).toBe(null);
    });

    it('returns last element even if null', () => {
      expect(aggregateFunctions.last([['a', 'b', null]], mockContext)).toBe(null);
    });

    it('handles single element', () => {
      expect(aggregateFunctions.last([['only']], mockContext)).toBe('only');
    });

    it('handles object last element', () => {
      const obj = { key: 'value' };
      expect(aggregateFunctions.last([['a', obj]], mockContext)).toBe(obj);
    });
  });

  describe('median', () => {
    it('returns middle value for odd-length array', () => {
      expect(aggregateFunctions.median([[1, 3, 5, 7, 9]], mockContext)).toBe(5);
    });

    it('returns average of two middle values for even-length array', () => {
      expect(aggregateFunctions.median([[1, 2, 3, 4]], mockContext)).toBe(2.5);
    });

    it('handles unsorted array', () => {
      expect(aggregateFunctions.median([[9, 1, 7, 3, 5]], mockContext)).toBe(5);
    });

    it('returns 0 for empty array', () => {
      expect(aggregateFunctions.median([[]], mockContext)).toBe(0);
    });

    it('returns 0 for non-array input', () => {
      expect(aggregateFunctions.median([null], mockContext)).toBe(0);
      expect(aggregateFunctions.median([42], mockContext)).toBe(0);
    });

    it('returns 0 for array with no numbers', () => {
      expect(aggregateFunctions.median([['a', 'b', 'c']], mockContext)).toBe(0);
    });

    it('ignores non-number elements', () => {
      expect(aggregateFunctions.median([[1, 'skip', 3, null, 5]], mockContext)).toBe(3);
    });

    it('handles single element', () => {
      expect(aggregateFunctions.median([[42]], mockContext)).toBe(42);
    });

    it('handles two elements', () => {
      expect(aggregateFunctions.median([[10, 20]], mockContext)).toBe(15);
    });

    it('handles negative numbers', () => {
      expect(aggregateFunctions.median([[-5, -3, -1, 1, 3]], mockContext)).toBe(-1);
    });

    it('handles floating point numbers', () => {
      expect(aggregateFunctions.median([[0.1, 0.5, 0.9]], mockContext)).toBeCloseTo(0.5);
    });

    it('handles duplicates', () => {
      expect(aggregateFunctions.median([[1, 1, 1, 1, 1]], mockContext)).toBe(1);
    });
  });

  describe('product', () => {
    it('multiplies all numbers in array', () => {
      expect(aggregateFunctions.product([[1, 2, 3, 4]], mockContext)).toBe(24);
    });

    it('returns 0 for empty array', () => {
      expect(aggregateFunctions.product([[]], mockContext)).toBe(0);
    });

    it('returns 0 for non-array input', () => {
      expect(aggregateFunctions.product([null], mockContext)).toBe(0);
      expect(aggregateFunctions.product([42], mockContext)).toBe(0);
    });

    it('returns 0 for array with no numbers', () => {
      expect(aggregateFunctions.product([['a', 'b', 'c']], mockContext)).toBe(0);
    });

    it('returns 0 when array contains zero', () => {
      expect(aggregateFunctions.product([[1, 2, 0, 4]], mockContext)).toBe(0);
    });

    it('handles negative numbers', () => {
      expect(aggregateFunctions.product([[-2, 3]], mockContext)).toBe(-6);
    });

    it('handles two negatives (positive result)', () => {
      expect(aggregateFunctions.product([[-2, -3]], mockContext)).toBe(6);
    });

    it('handles floating point numbers', () => {
      expect(aggregateFunctions.product([[0.5, 4, 2]], mockContext)).toBeCloseTo(4);
    });

    it('ignores non-number elements', () => {
      expect(aggregateFunctions.product([[2, 'skip', 3, null, 4]], mockContext)).toBe(24);
    });

    it('handles single element', () => {
      expect(aggregateFunctions.product([[42]], mockContext)).toBe(42);
    });

    it('handles large products', () => {
      expect(aggregateFunctions.product([[1000, 1000, 1000]], mockContext)).toBe(1e9);
    });
  });
});
