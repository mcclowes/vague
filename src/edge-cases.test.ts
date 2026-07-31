import { describe, it, expect, beforeEach } from 'vitest';
import { compile, setSeed } from './index.js';
import { warningCollector } from './warnings.js';

describe('Edge Cases', () => {
  beforeEach(() => {
    warningCollector.clear();
    warningCollector.setSilent(true);
    setSeed(null);
  });

  describe('Division by Zero', () => {
    it('throws an error on division by zero', async () => {
      const source = `
        schema Test {
          x: 10 / 0
        }
        dataset D { items: 1 of Test }
      `;

      await expect(compile(source)).rejects.toThrow('Division by zero');
    });

    it('allows division by non-zero values', async () => {
      const source = `
        schema Test {
          x: 10 / 2
        }
        dataset D { items: 1 of Test }
      `;

      const result = await compile(source);
      expect((result.items[0] as { x: number }).x).toBe(5);
    });
  });

  describe('Cardinality Validation', () => {
    it('generates zero items for zero cardinality', async () => {
      const source = `
        schema Item { x: int }
        dataset D { items: 0 of Item }
      `;

      const result = await compile(source);
      expect(result.items).toHaveLength(0);
    });

    it('handles valid range cardinality', async () => {
      setSeed(42);
      const source = `
        schema Item { x: int }
        dataset D { items: 1..5 of Item }
      `;

      const result = await compile(source);
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Warning Collector Reset', () => {
    it('clears warnings between compilations', async () => {
      // First compilation with a source that may generate warnings
      const source1 = `
        schema Test { x: unique int in 1..2 }
        dataset D { items: 5 of Test }
      `;

      await compile(source1);
      const warningsAfterFirst = warningCollector.count();

      // First compilation should have produced warnings (unique exhaustion)
      expect(warningsAfterFirst).toBeGreaterThan(0);

      // Second compilation
      const source2 = `
        schema Test { x: int }
        dataset D { items: 1 of Test }
      `;

      await compile(source2);
      const warningsAfterSecond = warningCollector.count();

      // Warnings should have been cleared at the start of second compilation
      // If warnings weren't cleared, count would be >= warningsAfterFirst
      expect(warningsAfterSecond).toBe(0);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('throws an error for circular computed field dependencies', async () => {
      const source = `
        schema Test {
          a: b * 2,
          b: a + 1
        }
        dataset D { items: 1 of Test }
      `;

      await expect(compile(source)).rejects.toThrow(/[Cc]ircular dependency/);
    });

    it('handles valid computed field dependencies', async () => {
      const source = `
        schema Test {
          x: int in 1..10,
          y: x * 2,
          z: y + 1
        }
        dataset D { items: 1 of Test }
      `;

      setSeed(42);
      const result = await compile(source);
      const item = result.items[0] as { x: number; y: number; z: number };

      expect(item.y).toBe(item.x * 2);
      expect(item.z).toBe(item.y + 1);
    });

    it('handles computed fields that depend on non-computed fields', async () => {
      const source = `
        schema Test {
          price: decimal in 10.00..100.00,
          quantity: int in 1..5,
          total: price * quantity
        }
        dataset D { items: 1 of Test }
      `;

      setSeed(42);
      const result = await compile(source);
      const item = result.items[0] as { price: number; quantity: number; total: number };

      expect(item.total).toBeCloseTo(item.price * item.quantity, 2);
    });
  });

  describe('Empty Collections', () => {
    it('handles any of with empty collection', async () => {
      const source = `
        schema Item { x: int }
        schema Test {
          ref: any of items
        }
        dataset D {
          items: 0 of Item,
          tests: 1 of Test
        }
      `;

      const result = await compile(source);
      const test = result.tests[0] as { ref: unknown };
      expect(test.ref).toBeNull();
    });
  });

  describe('Numeric Edge Cases', () => {
    it('handles negative numbers in ranges', async () => {
      const source = `
        schema Test {
          x: int in -100..-50
        }
        dataset D { items: 10 of Test }
      `;

      const result = await compile(source);
      for (const item of result.items) {
        const x = (item as { x: number }).x;
        expect(x).toBeGreaterThanOrEqual(-100);
        expect(x).toBeLessThanOrEqual(-50);
      }
    });

    it('handles zero in ranges', async () => {
      const source = `
        schema Test {
          x: int in -5..5
        }
        dataset D { items: 20 of Test }
      `;

      const result = await compile(source);
      const values = result.items.map((i) => (i as { x: number }).x);

      expect(values.some((v) => v < 0)).toBe(true);
      expect(values.some((v) => v >= 0)).toBe(true);
    });
  });

  describe('Inequality via not operator', () => {
    it('supports not (x == value) in constraints', async () => {
      const source = `
        schema Test {
          x: "a" | "b" | "c",
          assume not (x == "a")
        }
        dataset D { items: 50 of Test }
      `;

      setSeed(42);
      const result = await compile(source);
      for (const item of result.items) {
        expect((item as { x: string }).x).not.toBe('a');
      }
    });
  });

  describe('Computed Field Order', () => {
    it('generates computed fields in dependency order', async () => {
      // Fields defined in reverse dependency order
      const source = `
        schema Test {
          d: c + 1,
          c: b + 1,
          b: a + 1,
          a: int in 1..10
        }
        dataset D { items: 1 of Test }
      `;

      setSeed(42);
      const result = await compile(source);
      const item = result.items[0] as { a: number; b: number; c: number; d: number };

      expect(item.b).toBe(item.a + 1);
      expect(item.c).toBe(item.b + 1);
      expect(item.d).toBe(item.c + 1);
    });
  });
});
