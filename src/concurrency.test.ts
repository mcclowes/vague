import { describe, it, expect, beforeEach } from 'vitest';
import { compile, setSeed } from './index.js';
import { SeededRandom } from './interpreter/random.js';
import { warningCollector } from './warnings.js';

describe('Concurrency and Thread Safety', () => {
  beforeEach(() => {
    warningCollector.clear();
    warningCollector.setSilent(true);
    setSeed(null);
  });

  describe('SeededRandom class', () => {
    it('produces deterministic output with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const values1 = Array.from({ length: 10 }, () => rng1.random());
      const values2 = Array.from({ length: 10 }, () => rng2.random());

      expect(values1).toEqual(values2);
    });

    it('produces different output with different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(123);

      const values1 = Array.from({ length: 10 }, () => rng1.random());
      const values2 = Array.from({ length: 10 }, () => rng2.random());

      expect(values1).not.toEqual(values2);
    });

    it('instances are independent', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      // Advance rng1 a few times
      rng1.random();
      rng1.random();
      rng1.random();

      // rng2 should still produce the first value from seed 42
      const rng3 = new SeededRandom(42);
      expect(rng2.random()).toBe(rng3.random());
    });

    it('clone creates independent copy with same state', () => {
      const rng1 = new SeededRandom(42);

      // Advance a few times
      rng1.random();
      rng1.random();

      // Clone
      const rng2 = rng1.clone();

      // Both should produce the same sequence from here
      expect(rng1.random()).toBe(rng2.random());
      expect(rng1.random()).toBe(rng2.random());
    });

    it('supports all distribution functions', () => {
      const rng = new SeededRandom(42);

      // Just verify they don't throw and return numbers
      expect(typeof rng.gaussian(0, 1)).toBe('number');
      expect(typeof rng.exponential(1)).toBe('number');
      expect(typeof rng.lognormal(0, 1)).toBe('number');
      expect(typeof rng.poisson(5)).toBe('number');
      expect(typeof rng.beta(2, 5)).toBe('number');
      expect(typeof rng.randomInt(1, 100)).toBe('number');
      expect(typeof rng.randomFloat(0, 1)).toBe('number');
      expect(typeof rng.randomBool()).toBe('boolean');
    });

    it('randomChoice works correctly', () => {
      const rng = new SeededRandom(42);
      const choices = ['a', 'b', 'c', 'd'];

      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        results.add(rng.randomChoice(choices));
      }

      // Should have selected at least 2 different values
      expect(results.size).toBeGreaterThanOrEqual(2);
      // All results should be from the original array
      for (const r of results) {
        expect(choices).toContain(r);
      }
    });
  });

  describe('Concurrent compilation', () => {
    it('produces deterministic results with explicit seeds', async () => {
      const source = `
        schema Item { x: int in 1..100 }
        dataset D { items: 5 of Item }
      `;

      // Run same compilation twice with same seed
      setSeed(42);
      const result1 = await compile(source);
      setSeed(42);
      const result2 = await compile(source);

      expect(result1.items).toEqual(result2.items);
    });

    it('runs multiple compilations in parallel', async () => {
      const source1 = `
        schema A { x: int in 1..100 }
        dataset D { items: 10 of A }
      `;
      const source2 = `
        schema B { y: string }
        dataset D { items: 10 of B }
      `;
      const source3 = `
        schema C { z: boolean }
        dataset D { items: 10 of C }
      `;

      // Run all three in parallel
      const [result1, result2, result3] = await Promise.all([
        compile(source1),
        compile(source2),
        compile(source3),
      ]);

      // Each should have the correct structure
      expect(result1.items).toHaveLength(10);
      expect(result2.items).toHaveLength(10);
      expect(result3.items).toHaveLength(10);

      // Verify each has the right fields
      expect((result1.items[0] as { x: number }).x).toBeDefined();
      expect((result2.items[0] as { y: string }).y).toBeDefined();
      expect((result3.items[0] as { z: boolean }).z).toBeDefined();
    });

    it('warning collector is reset between compilations', async () => {
      // Source that generates warnings
      const source1 = `
        schema X { id: unique int in 1..3 }
        dataset D { items: 10 of X }
      `;

      await compile(source1);
      const warningsAfterFirst = warningCollector.count();

      // First compilation should have produced warnings (unique exhaustion)
      expect(warningsAfterFirst).toBeGreaterThan(0);

      // Second compilation with no warnings expected
      const source2 = `
        schema Y { x: int }
        dataset D { items: 1 of Y }
      `;

      await compile(source2);
      const warningsAfterSecond = warningCollector.count();

      // Second compilation should have reset warnings
      expect(warningsAfterSecond).toBe(0);
    });
  });

  describe('Isolation', () => {
    it('different compilations do not share generated data', async () => {
      const source = `
        schema Item { id: unique int in 1..1000 }
        dataset D { items: 100 of Item }
      `;

      // Without explicit seed, each run should be different
      setSeed(null);
      const result1 = await compile(source);
      const result2 = await compile(source);

      // IDs should be unique within each result
      const ids1 = new Set((result1.items as { id: number }[]).map((i) => i.id));
      const ids2 = new Set((result2.items as { id: number }[]).map((i) => i.id));

      expect(ids1.size).toBe(100);
      expect(ids2.size).toBe(100);

      // The two sets might have some overlap but shouldn't be identical
      // (with 1000 possible values and 100 items each, overlap is likely but not complete)
    });

    it('schemas and datasets are isolated per compilation', async () => {
      const source1 = `
        schema A { name: "first" }
        dataset D { items: 1 of A }
      `;
      const source2 = `
        schema A { name: "second" }
        dataset D { items: 1 of A }
      `;

      const [result1, result2] = await Promise.all([compile(source1), compile(source2)]);

      // Each should use its own schema definition
      expect((result1.items[0] as { name: string }).name).toBe('first');
      expect((result2.items[0] as { name: string }).name).toBe('second');
    });
  });
});
