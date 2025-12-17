import { describe, it, expect, beforeEach } from 'vitest';
import { compile, warningCollector } from './index.js';

describe('Warnings', () => {
  beforeEach(() => {
    warningCollector.clear();
  });

  describe('UniqueValueExhaustionWarning', () => {
    it('warns when unique values are exhausted', async () => {
      const source = `
        schema X {
          id: unique int in 1..3
        }
        dataset Test {
          items: 10 * X
        }
      `;

      const result = await compile(source);

      // Should still produce results
      expect(result.items).toHaveLength(10);

      // Should have warning about exhaustion
      expect(warningCollector.hasWarnings()).toBe(true);
      const warnings = warningCollector.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);

      const exhaustionWarning = warnings.find((w) => w.type === 'UniqueValueExhaustion');
      expect(exhaustionWarning).toBeDefined();
      expect(exhaustionWarning!.field).toBe('id');
      expect(exhaustionWarning!.schema).toBe('X');
      expect(exhaustionWarning!.message).toContain('unique value');
    });

    it('does not warn when unique values are sufficient', async () => {
      const source = `
        schema X {
          id: unique int in 1..100
        }
        dataset Test {
          items: 10 * X
        }
      `;

      const result = await compile(source);

      expect(result.items).toHaveLength(10);
      expect(warningCollector.hasWarnings()).toBe(false);

      // All values should be unique
      const ids = (result.items as Array<{ id: number }>).map((x) => x.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('warns for exhausted superposition unique values', async () => {
      const source = `
        schema X {
          status: unique "a" | "b" | "c"
        }
        dataset Test {
          items: 10 * X
        }
      `;

      const result = await compile(source);

      expect(result.items).toHaveLength(10);
      expect(warningCollector.hasWarnings()).toBe(true);

      const warnings = warningCollector.getWarnings();
      const exhaustionWarning = warnings.find((w) => w.type === 'UniqueValueExhaustion');
      expect(exhaustionWarning).toBeDefined();
      expect(exhaustionWarning!.field).toBe('status');
    });
  });

  describe('Warning collector', () => {
    it('can clear warnings', async () => {
      const source = `
        schema X {
          id: unique int in 1..2
        }
        dataset Test {
          items: 5 * X
        }
      `;

      await compile(source);
      expect(warningCollector.hasWarnings()).toBe(true);

      warningCollector.clear();
      expect(warningCollector.hasWarnings()).toBe(false);
      expect(warningCollector.getWarnings()).toEqual([]);
    });

    it('accumulates warnings across multiple fields', async () => {
      const source = `
        schema X {
          id: unique int in 1..2,
          code: unique "x" | "y"
        }
        dataset Test {
          items: 10 * X
        }
      `;

      await compile(source);

      const warnings = warningCollector.getWarnings();
      // Should have warnings for both fields
      const idWarnings = warnings.filter((w) => w.field === 'id');
      const codeWarnings = warnings.filter((w) => w.field === 'code');

      expect(idWarnings.length).toBeGreaterThan(0);
      expect(codeWarnings.length).toBeGreaterThan(0);
    });
  });
});
