import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compile, warningCollector } from './index.js';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TMP_DIR = join(__dirname, '..', '.test-tmp-warnings');

describe('Warnings', () => {
  beforeEach(() => {
    warningCollector.clear();
    if (!existsSync(TMP_DIR)) {
      mkdirSync(TMP_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TMP_DIR)) {
      rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });

  describe('UniqueValueExhaustionWarning', () => {
    it('warns when unique values are exhausted', async () => {
      const source = `
        schema X {
          id: unique int in 1..3
        }
        dataset Test {
          items: 10 of X
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
          items: 10 of X
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
          items: 10 of X
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
          items: 5 of X
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
          items: 10 of X
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

  describe('ConstraintRetryLimitWarning', () => {
    it('warns when schema constraint cannot be satisfied', async () => {
      // Create an impossible constraint
      const source = `
        schema X {
          value: int in 1..10,
          assume value > 100
        }
        dataset Test {
          items: 1 of X
        }
      `;

      await compile(source);

      const warnings = warningCollector.getWarnings();
      const retryWarning = warnings.find((w) => w.type === 'ConstraintRetryLimit');
      expect(retryWarning).toBeDefined();
      expect(retryWarning!.message).toContain('satisfying');
      expect(retryWarning!.message).toContain('X');
    });

    it('warns when violating mode cannot find violations', async () => {
      // Create a constraint that's always satisfied (hard to violate)
      const source = `
        schema X {
          value: 5,
          assume value == 5
        }
        dataset Test violating {
          items: 1 of X
        }
      `;

      await compile(source);

      const warnings = warningCollector.getWarnings();
      const retryWarning = warnings.find((w) => w.type === 'ConstraintRetryLimit');
      expect(retryWarning).toBeDefined();
      expect(retryWarning!.message).toContain('violating');
    });
  });

  describe('getWarningsByType', () => {
    it('filters warnings by type', async () => {
      const source = `
        schema X {
          id: unique int in 1..2
        }
        dataset Test {
          items: 10 of X
        }
      `;

      await compile(source);

      const uniqueWarnings = warningCollector.getWarningsByType('UniqueValueExhaustion');
      expect(uniqueWarnings.length).toBeGreaterThan(0);
      expect(uniqueWarnings.every((w) => w.type === 'UniqueValueExhaustion')).toBe(true);

      const constraintWarnings = warningCollector.getWarningsByType('ConstraintRetryLimit');
      expect(constraintWarnings).toEqual([]);
    });
  });

  describe('UnknownFieldInImportedSchemaWarning', () => {
    it('warns when schema adds fields not in imported OpenAPI schema', async () => {
      const specPath = join(TMP_DIR, 'api.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              User: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        })
      );

      const source = `
        import api from "${specPath}"
        schema User from api.User {
          id: int in 1..1000,
          name: string,
          unknownField: string,
          anotherUnknown: int
        }
        dataset Test {
          users: 5 of User
        }
      `;

      await compile(source);

      const warnings = warningCollector.getWarningsByType('UnknownFieldInImportedSchema');
      expect(warnings.length).toBe(2);

      const fieldNames = warnings.map((w) => w.field);
      expect(fieldNames).toContain('unknownField');
      expect(fieldNames).toContain('anotherUnknown');

      expect(warnings[0].schema).toBe('User');
      expect(warnings[0].message).toContain('api.User');
    });

    it('does not warn when all fields exist in imported schema', async () => {
      const specPath = join(TMP_DIR, 'api-valid.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Product: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                },
              },
            },
          },
        })
      );

      const source = `
        import api from "${specPath}"
        schema Product from api.Product {
          id: int in 1..1000,
          name: string,
          price: decimal in 0.01..999.99
        }
        dataset Test {
          products: 5 of Product
        }
      `;

      await compile(source);

      const warnings = warningCollector.getWarningsByType('UnknownFieldInImportedSchema');
      expect(warnings.length).toBe(0);
    });

    it('does not warn for schemas without base import', async () => {
      const source = `
        schema LocalSchema {
          id: int,
          anyFieldName: string
        }
        dataset Test {
          items: 5 of LocalSchema
        }
      `;

      await compile(source);

      const warnings = warningCollector.getWarningsByType('UnknownFieldInImportedSchema');
      expect(warnings.length).toBe(0);
    });
  });
});
