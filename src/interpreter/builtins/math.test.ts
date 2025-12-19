import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mathFunctions, createUniqueFn } from './math.js';
import type { GeneratorContext } from '../context.js';
import type { CallExpression } from '../../ast/index.js';
import { warningCollector } from '../../warnings.js';

// Mock context for testing
const mockContext = {
  uniqueValues: new Map<string, Set<unknown>>(),
} as GeneratorContext;

describe('Math Functions', () => {
  describe('round', () => {
    it('rounds to integer by default', () => {
      expect(mathFunctions.round([4.5], mockContext)).toBe(5);
      expect(mathFunctions.round([4.4], mockContext)).toBe(4);
      expect(mathFunctions.round([4.6], mockContext)).toBe(5);
    });

    it('rounds to specified decimal places', () => {
      expect(mathFunctions.round([3.14159, 2], mockContext)).toBe(3.14);
      expect(mathFunctions.round([3.14159, 3], mockContext)).toBe(3.142);
      expect(mathFunctions.round([3.14159, 4], mockContext)).toBe(3.1416);
    });

    it('handles 0 decimal places explicitly', () => {
      expect(mathFunctions.round([4.7, 0], mockContext)).toBe(5);
    });

    it('rounds negative numbers', () => {
      expect(mathFunctions.round([-4.5], mockContext)).toBe(-4); // JavaScript rounds towards +Infinity
      expect(mathFunctions.round([-4.6], mockContext)).toBe(-5);
    });

    it('handles large decimal places', () => {
      expect(mathFunctions.round([1.23456789, 6], mockContext)).toBe(1.234568);
    });

    it('handles zero', () => {
      expect(mathFunctions.round([0], mockContext)).toBe(0);
      expect(mathFunctions.round([0.0, 2], mockContext)).toBe(0);
    });

    it('handles very small numbers', () => {
      expect(mathFunctions.round([0.001, 2], mockContext)).toBe(0);
      expect(mathFunctions.round([0.001, 3], mockContext)).toBe(0.001);
    });

    it('handles very large numbers', () => {
      expect(mathFunctions.round([1234567.89, 1], mockContext)).toBe(1234567.9);
    });

    it('handles banker rounding edge case', () => {
      // Note: JavaScript uses standard rounding, not banker's rounding
      expect(mathFunctions.round([2.5], mockContext)).toBe(3);
      expect(mathFunctions.round([3.5], mockContext)).toBe(4);
    });
  });

  describe('floor', () => {
    it('floors to integer by default', () => {
      expect(mathFunctions.floor([4.9], mockContext)).toBe(4);
      expect(mathFunctions.floor([4.1], mockContext)).toBe(4);
      expect(mathFunctions.floor([4.0], mockContext)).toBe(4);
    });

    it('floors to specified decimal places', () => {
      expect(mathFunctions.floor([3.14159, 2], mockContext)).toBe(3.14);
      expect(mathFunctions.floor([3.149, 2], mockContext)).toBe(3.14);
    });

    it('handles 0 decimal places explicitly', () => {
      expect(mathFunctions.floor([4.9, 0], mockContext)).toBe(4);
    });

    it('floors negative numbers (toward negative infinity)', () => {
      expect(mathFunctions.floor([-4.1], mockContext)).toBe(-5);
      expect(mathFunctions.floor([-4.9], mockContext)).toBe(-5);
    });

    it('handles zero', () => {
      expect(mathFunctions.floor([0], mockContext)).toBe(0);
      expect(mathFunctions.floor([0.0, 2], mockContext)).toBe(0);
    });

    it('handles integers', () => {
      expect(mathFunctions.floor([5], mockContext)).toBe(5);
      expect(mathFunctions.floor([5, 2], mockContext)).toBe(5);
    });

    it('handles very small positive numbers', () => {
      expect(mathFunctions.floor([0.001, 2], mockContext)).toBe(0);
      expect(mathFunctions.floor([0.009, 2], mockContext)).toBe(0);
    });
  });

  describe('ceil', () => {
    it('ceils to integer by default', () => {
      expect(mathFunctions.ceil([4.1], mockContext)).toBe(5);
      expect(mathFunctions.ceil([4.9], mockContext)).toBe(5);
      expect(mathFunctions.ceil([4.0], mockContext)).toBe(4);
    });

    it('ceils to specified decimal places', () => {
      expect(mathFunctions.ceil([3.141, 2], mockContext)).toBe(3.15);
      expect(mathFunctions.ceil([3.14, 2], mockContext)).toBe(3.14);
    });

    it('handles 0 decimal places explicitly', () => {
      expect(mathFunctions.ceil([4.1, 0], mockContext)).toBe(5);
    });

    it('ceils negative numbers (toward positive infinity)', () => {
      expect(mathFunctions.ceil([-4.1], mockContext)).toBe(-4);
      expect(mathFunctions.ceil([-4.9], mockContext)).toBe(-4);
    });

    it('handles zero', () => {
      expect(mathFunctions.ceil([0], mockContext)).toBe(0);
      expect(mathFunctions.ceil([0.0, 2], mockContext)).toBe(0);
    });

    it('handles integers', () => {
      expect(mathFunctions.ceil([5], mockContext)).toBe(5);
      expect(mathFunctions.ceil([5, 2], mockContext)).toBe(5);
    });

    it('handles very small positive numbers', () => {
      expect(mathFunctions.ceil([0.001, 2], mockContext)).toBe(0.01);
      expect(mathFunctions.ceil([0.001, 3], mockContext)).toBe(0.001);
    });
  });

  describe('unique function', () => {
    let context: GeneratorContext;

    beforeEach(() => {
      context = {
        uniqueValues: new Map<string, Set<unknown>>(),
      } as GeneratorContext;
      warningCollector.clear();
    });

    afterEach(() => {
      warningCollector.clear();
    });

    it('generates unique values within a key namespace', () => {
      let counter = 0;
      const evaluator = () => counter++;
      const uniqueFn = createUniqueFn(evaluator);
      const callExpr = {
        arguments: [{}, {}], // second arg is the generator expression
      } as CallExpression;

      const result1 = uniqueFn(['test.id', null], context, callExpr);
      const result2 = uniqueFn(['test.id', null], context, callExpr);
      const result3 = uniqueFn(['test.id', null], context, callExpr);

      expect(result1).toBe(0);
      expect(result2).toBe(1);
      expect(result3).toBe(2);
    });

    it('tracks separate namespaces independently', () => {
      let counter = 0;
      const evaluator = () => counter++;
      const uniqueFn = createUniqueFn(evaluator);
      const callExpr = { arguments: [{}, {}] } as CallExpression;

      const a1 = uniqueFn(['a.id', null], context, callExpr);
      const b1 = uniqueFn(['b.id', null], context, callExpr);
      const a2 = uniqueFn(['a.id', null], context, callExpr);
      const b2 = uniqueFn(['b.id', null], context, callExpr);

      expect(a1).toBe(0);
      expect(b1).toBe(1);
      expect(a2).toBe(2);
      expect(b2).toBe(3);

      expect(context.uniqueValues.get('a.id')?.has(0)).toBe(true);
      expect(context.uniqueValues.get('a.id')?.has(2)).toBe(true);
      expect(context.uniqueValues.get('b.id')?.has(1)).toBe(true);
      expect(context.uniqueValues.get('b.id')?.has(3)).toBe(true);
    });

    it('retries when collision occurs', () => {
      // Simulates generator that produces 0, 0, 0, 1, 2, 3...
      let counter = 0;
      const values = [0, 0, 0, 1, 2, 3];
      const evaluator = () => values[counter++] ?? counter;
      const uniqueFn = createUniqueFn(evaluator);
      const callExpr = { arguments: [{}, {}] } as CallExpression;

      const result1 = uniqueFn(['test.id', null], context, callExpr);
      expect(result1).toBe(0);
      expect(counter).toBe(1);

      const result2 = uniqueFn(['test.id', null], context, callExpr);
      expect(result2).toBe(1); // Had to retry past the duplicate 0s
      expect(counter).toBe(4); // Called 3 more times (0, 0, 1)
    });

    it('generates warning after max retries', () => {
      // Always returns the same value
      const evaluator = () => 'duplicate';
      const uniqueFn = createUniqueFn(evaluator);
      const callExpr = { arguments: [{}, {}] } as CallExpression;

      // First call succeeds
      const result1 = uniqueFn(['schema.field', null], context, callExpr);
      expect(result1).toBe('duplicate');

      // Second call exhausts retries and should add warning
      const result2 = uniqueFn(['schema.field', null], context, callExpr);
      expect(result2).toBe('duplicate'); // Falls back to generated value

      const warnings = warningCollector.getWarnings();
      expect(warnings.length).toBe(1);
      // Check the warning message contains relevant info
      expect(warnings[0].message).toContain('schema');
      expect(warnings[0].message).toContain('field');
    });

    it('handles string unique values', () => {
      const strings = ['a', 'b', 'c'];
      let idx = 0;
      const evaluator = () => strings[idx++ % strings.length];
      const uniqueFn = createUniqueFn(evaluator);
      const callExpr = { arguments: [{}, {}] } as CallExpression;

      const result1 = uniqueFn(['names', null], context, callExpr);
      const result2 = uniqueFn(['names', null], context, callExpr);
      const result3 = uniqueFn(['names', null], context, callExpr);

      expect(result1).toBe('a');
      expect(result2).toBe('b');
      expect(result3).toBe('c');
    });

    it('handles object values (by reference)', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const obj3 = { id: 3 };
      const objects = [obj1, obj2, obj3];
      let idx = 0;
      const evaluator = () => objects[idx++ % objects.length];
      const uniqueFn = createUniqueFn(evaluator);
      const callExpr = { arguments: [{}, {}] } as CallExpression;

      const result1 = uniqueFn(['objs', null], context, callExpr);
      const result2 = uniqueFn(['objs', null], context, callExpr);

      expect(result1).toBe(obj1);
      expect(result2).toBe(obj2);
    });
  });
});
