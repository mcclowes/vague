import { describe, it, expect } from 'vitest';
import { Lexer } from './lexer/index.js';
import { Parser } from './parser/index.js';
import { Generator } from './interpreter/index.js';
import { setSeed } from './interpreter/index.js';
import type { Program, ContractDefinition, SchemaDefinition } from './ast/index.js';

function parse(source: string): Program {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

async function compile(source: string): Promise<Record<string, unknown[]>> {
  const ast = parse(source);
  const generator = new Generator();
  return generator.generate(ast);
}

describe('Contracts and Invariants', () => {
  describe('Contract parsing', () => {
    it('parses a simple contract definition', () => {
      const ast = parse(`
        contract PositiveAmount {
          invariant amount > 0
        }
      `);

      expect(ast.statements).toHaveLength(1);
      const contract = ast.statements[0] as ContractDefinition;
      expect(contract.type).toBe('ContractDefinition');
      expect(contract.name).toBe('PositiveAmount');
      expect(contract.invariants).toHaveLength(1);
    });

    it('parses contract with multiple invariants', () => {
      const ast = parse(`
        contract InvoiceContract {
          invariant amount > 0
          invariant due_date >= issued_date
          invariant status == "draft" or status == "sent" or status == "paid"
        }
      `);

      const contract = ast.statements[0] as ContractDefinition;
      expect(contract.invariants).toHaveLength(3);
    });

    it('parses invariant with error message', () => {
      const ast = parse(`
        contract ValidInvoice {
          invariant amount > 0 "Amount must be positive"
        }
      `);

      const contract = ast.statements[0] as ContractDefinition;
      expect(contract.invariants[0].message).toBe('Amount must be positive');
    });

    it('parses conditional invariants', () => {
      const ast = parse(`
        contract PaymentContract {
          invariant if status == "paid" {
            amount_paid >= total
          }
        }
      `);

      const contract = ast.statements[0] as ContractDefinition;
      expect(contract.invariants[0].condition).toBeDefined();
      expect(contract.invariants[0].constraints).toHaveLength(1);
    });
  });

  describe('Schema with contracts', () => {
    it('parses schema implementing a contract', () => {
      const ast = parse(`
        contract PositiveAmount {
          invariant amount > 0
        }

        schema Invoice implements PositiveAmount {
          amount: decimal in 1..1000
        }
      `);

      expect(ast.statements).toHaveLength(2);
      const schema = ast.statements[1] as SchemaDefinition;
      expect(schema.type).toBe('SchemaDefinition');
      expect(schema.contracts).toContain('PositiveAmount');
    });

    it('parses schema implementing multiple contracts', () => {
      const ast = parse(`
        contract PositiveAmount {
          invariant amount > 0
        }

        contract ValidDates {
          invariant due_date >= issued_date
        }

        schema Invoice implements PositiveAmount, ValidDates {
          amount: decimal in 1..1000,
          issued_date: int in 1..20,
          due_date: int in 1..30
        }
      `);

      const schema = ast.statements[2] as SchemaDefinition;
      expect(schema.contracts).toContain('PositiveAmount');
      expect(schema.contracts).toContain('ValidDates');
    });

    it('parses schema with contracts and contexts', () => {
      const ast = parse(`
        contract PositiveAmount {
          invariant amount > 0
        }

        schema Invoice implements PositiveAmount with Geography {
          amount: decimal in 1..1000
        }
      `);

      const schema = ast.statements[1] as SchemaDefinition;
      expect(schema.contracts).toContain('PositiveAmount');
    });

    it('parses schema with inline invariants', () => {
      const ast = parse(`
        schema Invoice {
          amount: decimal in 1..1000,
          invariant amount > 0 "Amount must be positive"
        }
      `);

      const schema = ast.statements[0] as SchemaDefinition;
      expect(schema.invariants).toHaveLength(1);
      expect(schema.invariants![0].message).toBe('Amount must be positive');
    });
  });

  describe('Contract enforcement', () => {
    it('generates data satisfying contract invariants', async () => {
      setSeed(42);

      const result = await compile(`
        contract PositiveAmount {
          invariant amount > 0
        }

        schema Invoice implements PositiveAmount {
          amount: decimal in 1..1000
        }

        dataset Test {
          invoices: 100 of Invoice
        }
      `);

      const invoices = result.invoices as { amount: number }[];
      expect(invoices).toHaveLength(100);

      // All amounts must be positive (invariant enforced)
      for (const invoice of invoices) {
        expect(invoice.amount).toBeGreaterThan(0);
      }

      setSeed(null);
    });

    it('enforces inline invariants', async () => {
      setSeed(42);

      const result = await compile(`
        schema Invoice {
          amount: decimal in 1..1000,
          invariant amount > 0
        }

        dataset Test {
          invoices: 50 of Invoice
        }
      `);

      const invoices = result.invoices as { amount: number }[];
      for (const invoice of invoices) {
        expect(invoice.amount).toBeGreaterThan(0);
      }

      setSeed(null);
    });

    it('invariants cannot be violated even in violating mode', async () => {
      setSeed(42);

      // The assume can be violated, but invariants cannot
      const result = await compile(`
        schema Invoice {
          issued_date: int in 1..20,
          due_date: int in 1..30,
          assume due_date >= issued_date,
          invariant due_date > 0 "Due date must be positive"
        }

        dataset Invalid violating {
          invoices: 50 of Invoice
        }
      `);

      const invoices = result.invoices as { issued_date: number; due_date: number }[];

      // Invariants must still hold even in violating mode
      for (const invoice of invoices) {
        expect(invoice.due_date).toBeGreaterThan(0);
      }

      // But assumes should be violated
      const violatedCount = invoices.filter((i) => i.due_date < i.issued_date).length;
      expect(violatedCount).toBeGreaterThan(0);

      setSeed(null);
    });

    it('enforces multiple invariants from contract', async () => {
      setSeed(42);

      const result = await compile(`
        contract InvoiceContract {
          invariant amount > 0
          invariant due_day >= 1
        }

        schema Invoice implements InvoiceContract {
          amount: decimal in 1..1000,
          due_day: int in 1..31
        }

        dataset Test {
          invoices: 50 of Invoice
        }
      `);

      const invoices = result.invoices as { amount: number; due_day: number }[];
      for (const invoice of invoices) {
        expect(invoice.amount).toBeGreaterThan(0);
        expect(invoice.due_day).toBeGreaterThanOrEqual(1);
      }

      setSeed(null);
    });

    it('enforces conditional invariants', async () => {
      setSeed(42);

      const result = await compile(`
        schema Invoice {
          status: "draft" | "paid",
          amount: decimal in 100..1000,
          amount_paid: int in 0..1200,
          invariant if status == "paid" {
            amount_paid >= amount
          }
        }

        dataset Test {
          invoices: 100 of Invoice
        }
      `);

      const invoices = result.invoices as { status: string; amount: number; amount_paid: number }[];

      // All paid invoices must have amount_paid >= amount
      for (const invoice of invoices) {
        if (invoice.status === 'paid') {
          expect(invoice.amount_paid).toBeGreaterThanOrEqual(invoice.amount);
        }
      }

      setSeed(null);
    });
  });

  describe('Contract combination', () => {
    it('combines contract and inline invariants', async () => {
      setSeed(42);

      const result = await compile(`
        contract PositiveAmount {
          invariant amount > 0
        }

        schema Invoice implements PositiveAmount {
          amount: decimal in 1..1000,
          status: "draft" | "sent",
          invariant status == "draft" or status == "sent"
        }

        dataset Test {
          invoices: 50 of Invoice
        }
      `);

      const invoices = result.invoices as { amount: number; status: string }[];
      for (const invoice of invoices) {
        expect(invoice.amount).toBeGreaterThan(0);
        expect(['draft', 'sent']).toContain(invoice.status);
      }

      setSeed(null);
    });

    it('handles missing contracts gracefully', async () => {
      setSeed(42);

      // Should not throw, just warn
      const result = await compile(`
        schema Invoice implements NonExistentContract {
          amount: decimal in 1..1000
        }

        dataset Test {
          invoices: 10 of Invoice
        }
      `);

      expect(result.invoices).toHaveLength(10);

      setSeed(null);
    });
  });
});

import { compareDatasets, formatComparisonResult, datasetsEqual } from './compare/index.js';
import { diffSchemas, formatDiffResult } from './compare/schema-diff.js';

describe('Dataset Comparison', () => {
  describe('compareDatasets', () => {
    it('detects identical datasets', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };

      const result = compareDatasets(data, data);
      expect(result.identical).toBe(true);
      expect(result.summary.totalDifferences).toBe(0);
    });

    it('detects missing fields', () => {
      const expected = {
        users: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
      };
      const actual = {
        users: [{ id: 1, name: 'Alice' }],
      };

      const result = compareDatasets(expected, actual);
      expect(result.identical).toBe(false);
      expect(result.collectionDiffs[0].recordDiffs[0].differences).toContainEqual(
        expect.objectContaining({ path: 'email', type: 'missing_field' })
      );
    });

    it('detects extra fields', () => {
      const expected = {
        users: [{ id: 1, name: 'Alice' }],
      };
      const actual = {
        users: [{ id: 1, name: 'Alice', extra: 'field' }],
      };

      const result = compareDatasets(expected, actual);
      expect(result.identical).toBe(false);
      expect(result.collectionDiffs[0].recordDiffs[0].differences).toContainEqual(
        expect.objectContaining({ path: 'extra', type: 'extra_field' })
      );
    });

    it('detects value mismatches', () => {
      const expected = {
        users: [{ id: 1, name: 'Alice' }],
      };
      const actual = {
        users: [{ id: 1, name: 'Bob' }],
      };

      const result = compareDatasets(expected, actual);
      expect(result.identical).toBe(false);
      expect(result.collectionDiffs[0].recordDiffs[0].differences).toContainEqual(
        expect.objectContaining({
          path: 'name',
          type: 'value_mismatch',
          expected: 'Alice',
          actual: 'Bob',
        })
      );
    });

    it('detects type mismatches', () => {
      const expected = {
        users: [{ id: 1 }],
      };
      const actual = {
        users: [{ id: '1' }],
      };

      const result = compareDatasets(expected, actual);
      expect(result.identical).toBe(false);
      expect(result.collectionDiffs[0].recordDiffs[0].differences).toContainEqual(
        expect.objectContaining({ path: 'id', type: 'type_mismatch' })
      );
    });

    it('detects count mismatches', () => {
      const expected = {
        users: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      const actual = {
        users: [{ id: 1 }],
      };

      const result = compareDatasets(expected, actual);
      expect(result.identical).toBe(false);
      expect(result.collectionDiffs[0].missingRecords).toBe(2);
    });

    it('handles numeric tolerance', () => {
      const expected = {
        values: [{ amount: 100.001 }],
      };
      const actual = {
        values: [{ amount: 100.002 }],
      };

      const withTolerance = compareDatasets(expected, actual, { numericTolerance: 0.01 });
      expect(withTolerance.identical).toBe(true);

      const withoutTolerance = compareDatasets(expected, actual, { numericTolerance: 0.0001 });
      expect(withoutTolerance.identical).toBe(false);
    });

    it('ignores specified fields', () => {
      const expected = {
        users: [{ id: 1, timestamp: 1000 }],
      };
      const actual = {
        users: [{ id: 1, timestamp: 2000 }],
      };

      const result = compareDatasets(expected, actual, { ignoreFields: ['timestamp'] });
      expect(result.identical).toBe(true);
    });
  });

  describe('formatComparisonResult', () => {
    it('formats identical datasets', () => {
      const result = compareDatasets({ users: [{ id: 1 }] }, { users: [{ id: 1 }] });
      const formatted = formatComparisonResult(result);
      expect(formatted).toContain('identical');
    });

    it('formats differences', () => {
      const result = compareDatasets(
        { users: [{ id: 1, name: 'Alice' }] },
        { users: [{ id: 1, name: 'Bob' }] }
      );
      const formatted = formatComparisonResult(result);
      expect(formatted).toContain('differ');
      expect(formatted).toContain('name');
    });
  });

  describe('datasetsEqual', () => {
    it('returns true for equal datasets', () => {
      const data = { users: [{ id: 1 }] };
      expect(datasetsEqual(data, data)).toBe(true);
    });

    it('returns false for different datasets', () => {
      expect(datasetsEqual({ users: [{ id: 1 }] }, { users: [{ id: 2 }] })).toBe(false);
    });
  });
});

describe('Schema Diff', () => {
  describe('diffSchemas', () => {
    it('detects no changes', () => {
      const schema = `
        schema Invoice {
          id: int,
          amount: decimal
        }
      `;

      const result = diffSchemas(schema, schema);
      expect(result.hasBreakingChanges).toBe(false);
      expect(result.schemaDiffs).toHaveLength(0);
    });

    it('detects added schemas', () => {
      const old = `
        schema Invoice {
          id: int
        }
      `;
      const new_ = `
        schema Invoice {
          id: int
        }
        schema Payment {
          amount: decimal
        }
      `;

      const result = diffSchemas(old, new_);
      expect(result.summary.schemasAdded).toContain('Payment');
    });

    it('detects removed schemas (breaking)', () => {
      const old = `
        schema Invoice { id: int }
        schema Payment { amount: decimal }
      `;
      const new_ = `
        schema Invoice { id: int }
      `;

      const result = diffSchemas(old, new_);
      expect(result.hasBreakingChanges).toBe(true);
      expect(result.summary.schemasRemoved).toContain('Payment');
    });

    it('detects added fields', () => {
      const old = `
        schema Invoice { id: int }
      `;
      const new_ = `
        schema Invoice { id: int, amount: decimal }
      `;

      const result = diffSchemas(old, new_);
      expect(result.schemaDiffs[0].fieldChanges).toContainEqual(
        expect.objectContaining({ field: 'amount', changeType: 'compatible' })
      );
    });

    it('detects removed fields (breaking)', () => {
      const old = `
        schema Invoice { id: int, amount: decimal }
      `;
      const new_ = `
        schema Invoice { id: int }
      `;

      const result = diffSchemas(old, new_);
      expect(result.hasBreakingChanges).toBe(true);
      expect(result.schemaDiffs[0].fieldChanges).toContainEqual(
        expect.objectContaining({ field: 'amount', changeType: 'breaking' })
      );
    });

    it('detects added constraints (breaking)', () => {
      const old = `
        schema Invoice {
          amount: int in 0..1000
        }
      `;
      const new_ = `
        schema Invoice {
          amount: int in 0..1000,
          assume amount > 0
        }
      `;

      const result = diffSchemas(old, new_);
      expect(result.hasBreakingChanges).toBe(true);
      expect(result.schemaDiffs[0].constraintChanges).toContainEqual(
        expect.objectContaining({ action: 'added', changeType: 'breaking' })
      );
    });

    it('detects removed constraints (compatible)', () => {
      const old = `
        schema Invoice {
          amount: int in 0..1000,
          assume amount > 0
        }
      `;
      const new_ = `
        schema Invoice {
          amount: int in 0..1000
        }
      `;

      const result = diffSchemas(old, new_);
      // Removing constraints is compatible (loosens validation)
      expect(result.schemaDiffs[0].constraintChanges).toContainEqual(
        expect.objectContaining({ action: 'removed', changeType: 'compatible' })
      );
    });

    it('detects added invariants (breaking)', () => {
      const old = `
        schema Invoice {
          amount: int in 0..1000
        }
      `;
      const new_ = `
        schema Invoice {
          amount: int in 0..1000,
          invariant amount > 0
        }
      `;

      const result = diffSchemas(old, new_);
      expect(result.hasBreakingChanges).toBe(true);
    });

    it('detects added contracts (breaking)', () => {
      const old = `
        contract Positive { invariant amount > 0 }
        schema Invoice { amount: int }
      `;
      const new_ = `
        contract Positive { invariant amount > 0 }
        schema Invoice implements Positive { amount: int }
      `;

      const result = diffSchemas(old, new_);
      expect(result.hasBreakingChanges).toBe(true);
    });
  });

  describe('formatDiffResult', () => {
    it('formats no changes', () => {
      const result = diffSchemas('schema A { id: int }', 'schema A { id: int }');
      const formatted = formatDiffResult(result);
      expect(formatted).toContain('No changes');
    });

    it('formats breaking changes', () => {
      const result = diffSchemas('schema A { id: int, amount: decimal }', 'schema A { id: int }');
      const formatted = formatDiffResult(result);
      expect(formatted).toContain('BREAKING');
    });
  });
});
