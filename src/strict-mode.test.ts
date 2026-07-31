/**
 * Tests for strict mode and new P0/P1 fixes
 */
import { describe, it, expect } from 'vitest';
import { compile, ConstraintSatisfactionError } from './index.js';

describe('Strict Mode', () => {
  describe('constraint satisfaction', () => {
    it('throws ConstraintSatisfactionError in strict mode when constraints cannot be satisfied', async () => {
      const source = `
        schema Impossible {
          x: int in 1..10,
          assume x > 100
        }
        dataset D { items: 1 of Impossible }
      `;

      await expect(compile(source, { strict: true })).rejects.toThrow(ConstraintSatisfactionError);
    });

    it('includes schema name and attempt count in error', async () => {
      const source = `
        schema MySchema {
          x: int in 1..10,
          assume x > 100
        }
        dataset D { items: 1 of MySchema }
      `;

      try {
        await compile(source, { strict: true });
        expect.fail('Expected ConstraintSatisfactionError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConstraintSatisfactionError);
        const csError = error as ConstraintSatisfactionError;
        expect(csError.schemaName).toBe('MySchema');
        expect(csError.attempts).toBeGreaterThan(0);
        expect(csError.mode).toBe('satisfying');
      }
    });

    it('does not throw in non-strict mode (default)', async () => {
      const source = `
        schema Impossible {
          x: int in 1..10,
          assume x > 100
        }
        dataset D { items: 1 of Impossible }
      `;

      // Should not throw, just return data (with a warning)
      const result = await compile(source);
      expect(result.items).toHaveLength(1);
    });

    it('works with satisfiable constraints in strict mode', async () => {
      const source = `
        schema Valid {
          x: int in 1..100,
          assume x > 50
        }
        dataset D { items: 5 of Valid }
      `;

      const result = await compile(source, { strict: true });
      expect(result.items).toHaveLength(5);

      for (const item of result.items) {
        expect((item as { x: number }).x).toBeGreaterThan(50);
      }
    });
  });

  describe('optionalFieldProbability', () => {
    it('respects optionalFieldProbability=1 (always include)', async () => {
      // Use double ?? to make field truly optional (first ? in type makes nullable, second makes optional)
      const source = `
        schema Item {
          required: int,
          maybePresent: int??
        }
        dataset D { items: 10 of Item }
      `;

      const result = await compile(source, { optionalFieldProbability: 1, seed: 42 });

      // With probability 1, all items should have the optional field
      for (const item of result.items) {
        expect(item).toHaveProperty('maybePresent');
      }
    });

    it('respects optionalFieldProbability=0 (never include)', async () => {
      // Use double ?? to make field truly optional
      const source = `
        schema Item {
          required: int,
          maybePresent: int??
        }
        dataset D { items: 10 of Item }
      `;

      const result = await compile(source, { optionalFieldProbability: 0, seed: 42 });

      // With probability 0, no items should have the optional field
      for (const item of result.items) {
        expect(item).not.toHaveProperty('maybePresent');
      }
    });
  });
});

describe('Context-based seeding', () => {
  it('produces deterministic output with seed option', async () => {
    const source = `
      schema Item { x: int in 1..1000 }
      dataset D { items: 10 of Item }
    `;

    const result1 = await compile(source, { seed: 12345 });
    const result2 = await compile(source, { seed: 12345 });

    expect(result1.items).toEqual(result2.items);
  });

  it('produces different output with different seeds', async () => {
    const source = `
      schema Item { x: int in 1..1000 }
      dataset D { items: 10 of Item }
    `;

    const result1 = await compile(source, { seed: 11111 });
    const result2 = await compile(source, { seed: 22222 });

    expect(result1.items).not.toEqual(result2.items);
  });

  it('allows concurrent compilations with different seeds without interference', async () => {
    const source = `
      schema Item { x: int in 1..1000 }
      dataset D { items: 5 of Item }
    `;

    // Run multiple compilations in parallel with different seeds
    const [r1a, r2a, r1b, r2b] = await Promise.all([
      compile(source, { seed: 100 }),
      compile(source, { seed: 200 }),
      compile(source, { seed: 100 }),
      compile(source, { seed: 200 }),
    ]);

    // Same seeds should produce same results, even when run concurrently
    expect(r1a.items).toEqual(r1b.items);
    expect(r2a.items).toEqual(r2b.items);

    // Different seeds should produce different results
    expect(r1a.items).not.toEqual(r2a.items);
  });
});
