import { describe, it, expect } from 'vitest';
import {
  isRecord,
  isFiniteNumber,
  isSafeInteger,
  isString,
  isBoolean,
  isArray,
  isNonEmptyArray,
  isNullish,
  isValidDate,
  getProperty,
  setProperty,
  assertRecord,
  assertFiniteNumber,
} from './type-guards.js';

describe('Type Guards', () => {
  describe('isRecord', () => {
    it('returns true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: 1 })).toBe(true);
      expect(isRecord({ nested: { deep: true } })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('returns false for arrays', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isRecord('string')).toBe(false);
      expect(isRecord(42)).toBe(false);
      expect(isRecord(true)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe('isFiniteNumber', () => {
    it('returns true for finite numbers', () => {
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFiniteNumber(42)).toBe(true);
      expect(isFiniteNumber(-3.14)).toBe(true);
      expect(isFiniteNumber(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('returns false for Infinity', () => {
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFiniteNumber(-Infinity)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isFiniteNumber(NaN)).toBe(false);
    });

    it('returns false for non-numbers', () => {
      expect(isFiniteNumber('42')).toBe(false);
      expect(isFiniteNumber(null)).toBe(false);
    });
  });

  describe('isSafeInteger', () => {
    it('returns true for safe integers', () => {
      expect(isSafeInteger(0)).toBe(true);
      expect(isSafeInteger(42)).toBe(true);
      expect(isSafeInteger(-1000)).toBe(true);
      expect(isSafeInteger(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(isSafeInteger(Number.MIN_SAFE_INTEGER)).toBe(true);
    });

    it('returns false for unsafe integers', () => {
      expect(isSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    });

    it('returns false for floats', () => {
      expect(isSafeInteger(3.14)).toBe(false);
    });
  });

  describe('isString', () => {
    it('returns true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
    });

    it('returns false for non-strings', () => {
      expect(isString(42)).toBe(false);
      expect(isString(null)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('returns true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it('returns false for non-booleans', () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
    });
  });

  describe('isArray', () => {
    it('returns true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('returns false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('returns true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    it('returns false for empty arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
    });

    it('returns false for non-arrays', () => {
      expect(isNonEmptyArray({})).toBe(false);
    });
  });

  describe('isNullish', () => {
    it('returns true for null and undefined', () => {
      expect(isNullish(null)).toBe(true);
      expect(isNullish(undefined)).toBe(true);
    });

    it('returns false for other values', () => {
      expect(isNullish(0)).toBe(false);
      expect(isNullish('')).toBe(false);
      expect(isNullish(false)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2024-01-15'))).toBe(true);
    });

    it('returns false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('returns false for non-dates', () => {
      expect(isValidDate('2024-01-15')).toBe(false);
      expect(isValidDate(1705276800000)).toBe(false);
    });
  });

  describe('getProperty', () => {
    it('gets existing properties', () => {
      expect(getProperty({ a: 1, b: 2 }, 'a')).toBe(1);
    });

    it('returns undefined for missing properties', () => {
      expect(getProperty({ a: 1 }, 'b')).toBeUndefined();
    });

    it('returns undefined for non-objects', () => {
      expect(getProperty(null, 'a')).toBeUndefined();
      expect(getProperty('string', 'length')).toBeUndefined();
    });
  });

  describe('setProperty', () => {
    it('sets properties on objects', () => {
      const obj = { a: 1 };
      expect(setProperty(obj, 'b', 2)).toBe(true);
      expect(obj).toEqual({ a: 1, b: 2 });
    });

    it('returns false for non-objects', () => {
      expect(setProperty(null, 'a', 1)).toBe(false);
      expect(setProperty([], 'a', 1)).toBe(false);
    });
  });

  describe('assertRecord', () => {
    it('does not throw for valid records', () => {
      expect(() => assertRecord({}, 'test')).not.toThrow();
      expect(() => assertRecord({ a: 1 }, 'test')).not.toThrow();
    });

    it('throws for null', () => {
      expect(() => assertRecord(null, 'test')).toThrow('Expected object in test, got null');
    });

    it('throws for arrays', () => {
      expect(() => assertRecord([], 'test')).toThrow('Expected object in test, got array');
    });

    it('throws for primitives', () => {
      expect(() => assertRecord('string', 'test')).toThrow('Expected object in test, got string');
    });
  });

  describe('assertFiniteNumber', () => {
    it('does not throw for finite numbers', () => {
      expect(() => assertFiniteNumber(42, 'test')).not.toThrow();
      expect(() => assertFiniteNumber(0, 'test')).not.toThrow();
    });

    it('throws for NaN', () => {
      expect(() => assertFiniteNumber(NaN, 'test')).toThrow(
        'Expected finite number in test, got NaN'
      );
    });

    it('throws for Infinity', () => {
      expect(() => assertFiniteNumber(Infinity, 'test')).toThrow(
        'Expected finite number in test, got Infinity'
      );
    });

    it('throws for non-numbers', () => {
      expect(() => assertFiniteNumber('42', 'test')).toThrow(
        'Expected finite number in test, got string (42)'
      );
    });
  });
});
