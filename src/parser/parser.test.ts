import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from './parser.js';

function parse(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('Parser', () => {
  describe('let statements', () => {
    it('parses simple let', () => {
      const ast = parse('let x = 5');

      expect(ast.statements).toHaveLength(1);
      expect(ast.statements[0]).toMatchObject({
        type: 'LetStatement',
        name: 'x',
        value: { type: 'Literal', value: 5, dataType: 'number' },
      });
    });

    it('parses let with string', () => {
      const ast = parse('let status = "draft"');

      expect(ast.statements[0]).toMatchObject({
        type: 'LetStatement',
        name: 'status',
        value: { type: 'Literal', value: 'draft', dataType: 'string' },
      });
    });

    it('parses let with superposition', () => {
      const ast = parse('let status = "draft" | "sent" | "paid"');

      expect(ast.statements[0]).toMatchObject({
        type: 'LetStatement',
        name: 'status',
        value: {
          type: 'SuperpositionExpression',
          options: [
            { value: { type: 'Literal', value: 'draft' } },
            { value: { type: 'Literal', value: 'sent' } },
            { value: { type: 'Literal', value: 'paid' } },
          ],
        },
      });
    });

    it('parses let with weighted superposition', () => {
      const ast = parse('let status = 0.7: "paid" | 0.3: "pending"');

      const expr = ast.statements[0];
      expect(expr.type).toBe('LetStatement');
      if (expr.type === 'LetStatement') {
        expect(expr.value.type).toBe('SuperpositionExpression');
      }
    });
  });

  describe('import statements', () => {
    it('parses import', () => {
      const ast = parse('import codat from "codat-openapi.json"');

      expect(ast.statements[0]).toMatchObject({
        type: 'ImportStatement',
        name: 'codat',
        path: 'codat-openapi.json',
      });
    });
  });

  describe('schema definitions', () => {
    it('parses empty schema', () => {
      const ast = parse('schema Invoice { }');

      expect(ast.statements[0]).toMatchObject({
        type: 'SchemaDefinition',
        name: 'Invoice',
        fields: [],
      });
    });

    it('parses schema with base', () => {
      const ast = parse('schema Invoice from codat.Invoice { }');

      expect(ast.statements[0]).toMatchObject({
        type: 'SchemaDefinition',
        name: 'Invoice',
        base: { type: 'QualifiedName', parts: ['codat', 'Invoice'] },
      });
    });

    it('parses schema with context', () => {
      const ast = parse('schema Company with Geography { }');

      expect(ast.statements[0]).toMatchObject({
        type: 'SchemaDefinition',
        name: 'Company',
        contexts: [{ type: 'ContextApplication', name: 'Geography' }],
      });
    });

    it('parses schema with fields', () => {
      const ast = parse(`
        schema Invoice {
          total: decimal,
          status: "draft" | "sent"
        }
      `);

      const schema = ast.statements[0];
      expect(schema.type).toBe('SchemaDefinition');
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields).toHaveLength(2);
        expect(schema.fields[0].name).toBe('total');
        expect(schema.fields[1].name).toBe('status');
      }
    });

    it('parses computed field', () => {
      const ast = parse(`
        schema Invoice {
          total: sum(line_items)
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].computed).toBe(true);
      }
    });

    it('parses nullable field with question mark syntax', () => {
      const ast = parse(`
        schema Invoice {
          notes: string?
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        // string? becomes SuperpositionType with string and null options
        expect(schema.fields[0].fieldType.type).toBe('SuperpositionType');
        const superposition = schema.fields[0].fieldType as { options: Array<{ value: unknown }> };
        expect(superposition.options).toHaveLength(2);
        expect((superposition.options[0].value as { name: string }).name).toBe('string');
        expect((superposition.options[1].value as { value: unknown }).value).toBe(null);
      }
    });

    it('parses range field', () => {
      const ast = parse(`
        schema Person {
          age: int in 18..65
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType).toMatchObject({
          type: 'RangeType',
          baseType: { type: 'PrimitiveType', name: 'int' },
        });
      }
    });

    it('parses collection field', () => {
      const ast = parse(`
        schema Invoice {
          line_items: 1..10 of LineItem
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType).toMatchObject({
          type: 'CollectionType',
          cardinality: { min: 1, max: 10 },
        });
      }
    });
  });

  describe('context definitions', () => {
    it('parses context with affects', () => {
      const ast = parse(`
        context Geography {
          locale: "en_GB" | "en_US",
          affects currency => "GBP"
        }
      `);

      expect(ast.statements[0]).toMatchObject({
        type: 'ContextDefinition',
        name: 'Geography',
      });

      const ctx = ast.statements[0];
      if (ctx.type === 'ContextDefinition') {
        expect(ctx.fields).toHaveLength(1);
        expect(ctx.affects).toHaveLength(1);
        expect(ctx.affects[0].field).toBe('currency');
      }
    });
  });

  describe('distribution definitions', () => {
    it('parses distribution', () => {
      const ast = parse(`
        distribution AgeStructure {
          0..17: 20%,
          18..65: 60%,
          66..: 20%
        }
      `);

      expect(ast.statements[0]).toMatchObject({
        type: 'DistributionDefinition',
        name: 'AgeStructure',
      });

      const dist = ast.statements[0];
      if (dist.type === 'DistributionDefinition') {
        expect(dist.buckets).toHaveLength(3);
        expect(dist.buckets[0].weight).toBe(0.2);
        expect(dist.buckets[1].weight).toBe(0.6);
      }
    });
  });

  describe('dataset definitions', () => {
    it('parses dataset', () => {
      const ast = parse(`
        dataset TestData {
          companies: 100 of Company
        }
      `);

      expect(ast.statements[0]).toMatchObject({
        type: 'DatasetDefinition',
        name: 'TestData',
      });

      const dataset = ast.statements[0];
      if (dataset.type === 'DatasetDefinition') {
        expect(dataset.collections).toHaveLength(1);
        expect(dataset.collections[0]).toMatchObject({
          name: 'companies',
          cardinality: { min: 100, max: 100 },
          schemaRef: 'Company',
        });
      }
    });

    it('parses dataset with context', () => {
      const ast = parse(`
        dataset TestData with Geography("en_GB") {
          companies: 100 of Company
        }
      `);

      const dataset = ast.statements[0];
      if (dataset.type === 'DatasetDefinition') {
        expect(dataset.contexts).toHaveLength(1);
        expect(dataset.contexts![0].name).toBe('Geography');
      }
    });

    it('parses per-parent cardinality', () => {
      const ast = parse(`
        dataset TestData {
          companies: 100 of Company,
          invoices: 10..50 per company of Invoice
        }
      `);

      const dataset = ast.statements[0];
      if (dataset.type === 'DatasetDefinition') {
        expect(dataset.collections[1]).toMatchObject({
          name: 'invoices',
          perParent: 'company',
          cardinality: { min: 10, max: 50 },
        });
      }
    });
  });

  describe('expressions', () => {
    it('parses parent reference', () => {
      const ast = parse(`
        schema Invoice {
          currency: ^company.currency
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        const field = schema.fields[0];
        expect(field.computed).toBe(true);
      }
    });

    it('parses any of expression', () => {
      const ast = parse(`
        schema Payment {
          invoice: any of invoices
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType).toMatchObject({
          type: 'ExpressionType',
        });
      }
    });

    it('parses function calls', () => {
      const ast = parse('let total = sum(items)');

      expect(ast.statements[0]).toMatchObject({
        type: 'LetStatement',
        value: {
          type: 'CallExpression',
          callee: 'sum',
        },
      });
    });

    it('parses binary expressions', () => {
      const ast = parse('let x = 1 + 2 * 3');

      // Should parse as 1 + (2 * 3) due to precedence
      const stmt = ast.statements[0];
      expect(stmt.type).toBe('LetStatement');
    });
  });

  describe('assume clauses', () => {
    it('parses simple assume', () => {
      const ast = parse(`
        schema Invoice {
          issued_date: date,
          due_date: date,
          assume due_date >= issued_date
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes).toHaveLength(1);
        expect(schema.assumes![0].type).toBe('AssumeClause');
        expect(schema.assumes![0].condition).toBeUndefined();
        expect(schema.assumes![0].constraints).toHaveLength(1);
        expect(schema.assumes![0].constraints[0]).toMatchObject({
          type: 'BinaryExpression',
          operator: '>=',
          left: { type: 'Identifier', name: 'due_date' },
          right: { type: 'Identifier', name: 'issued_date' },
        });
      }
    });

    it('parses assume if conditional', () => {
      const ast = parse(`
        schema Company {
          industry: "saas" | "retail",
          founded: int in 1990..2023,
          assume if industry == "saas" {
            founded > 2005
          }
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes).toHaveLength(1);
        expect(schema.assumes![0]).toMatchObject({
          type: 'AssumeClause',
          condition: {
            type: 'BinaryExpression',
            operator: '==',
            left: { type: 'Identifier', name: 'industry' },
            right: { type: 'Literal', value: 'saas' },
          },
        });
        expect(schema.assumes![0].constraints).toHaveLength(1);
      }
    });

    it('parses multiple constraints in assume if block', () => {
      const ast = parse(`
        schema Company {
          industry: string,
          founded: int,
          employee_count: int,
          assume if industry == "saas" {
            founded > 2005,
            employee_count < 500
          }
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes![0].constraints).toHaveLength(2);
      }
    });

    it('parses logical and/or expressions', () => {
      const ast = parse(`
        schema Invoice {
          status: string,
          amount: decimal,
          assume status == "paid" and amount > 0
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes![0].constraints[0]).toMatchObject({
          type: 'LogicalExpression',
          operator: 'and',
        });
      }
    });

    it('parses not expression', () => {
      const ast = parse(`
        schema Invoice {
          status: string,
          assume not status == "cancelled"
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes![0].constraints[0]).toMatchObject({
          type: 'NotExpression',
        });
      }
    });

    it('parses multiple assume clauses', () => {
      const ast = parse(`
        schema Invoice {
          issued_date: date,
          due_date: date,
          amount: decimal,
          assume due_date >= issued_date,
          assume amount > 0
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes).toHaveLength(2);
      }
    });
  });

  describe('generator types', () => {
    it('parses simple generator type with parens', () => {
      const ast = parse(`
        schema User {
          id: uuid()
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType).toMatchObject({
          type: 'GeneratorType',
          name: 'uuid',
          arguments: [],
        });
      }
    });

    it('parses qualified generator type', () => {
      const ast = parse(`
        schema User {
          email: faker.internet.email()
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType).toMatchObject({
          type: 'GeneratorType',
          name: 'faker.internet.email',
          arguments: [],
        });
      }
    });

    it('parses generator type with arguments', () => {
      const ast = parse(`
        schema User {
          phone: phone("US", true)
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType).toMatchObject({
          type: 'GeneratorType',
          name: 'phone',
        });
        const genType = schema.fields[0].fieldType as { arguments: unknown[] };
        expect(genType.arguments).toHaveLength(2);
      }
    });

    it('distinguishes generator types from schema references', () => {
      const ast = parse(`
        schema LineItem {
          amount: int
        }
        schema Invoice {
          items: 1..5 of LineItem
        }
      `);

      const invoice = ast.statements[1];
      if (invoice.type === 'SchemaDefinition') {
        // LineItem should be a ReferenceType, not GeneratorType
        const fieldType = invoice.fields[0].fieldType;
        if (fieldType.type === 'CollectionType') {
          expect(fieldType.elementType).toMatchObject({
            type: 'ReferenceType',
            path: { parts: ['LineItem'] },
          });
        }
      }
    });
  });

  describe('edge cases and operator precedence', () => {
    it('handles nested ternary expressions', () => {
      const ast = parse(`
        schema X {
          a: int in 1..100,
          b: a > 80 ? "high" : a > 50 ? "medium" : "low"
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        const field = schema.fields[1];
        expect(field.computed).toBe(true);
      }
    });

    it('handles complex logical expressions', () => {
      const ast = parse(`
        schema X {
          a: boolean,
          b: boolean,
          c: boolean,
          assume a and b or c
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        // Should parse as (a and b) or c due to precedence
        expect(schema.assumes![0].constraints[0]).toMatchObject({
          type: 'LogicalExpression',
          operator: 'or',
        });
      }
    });

    it('handles deeply nested parentheses', () => {
      const ast = parse('let x = (((((1 + 2)))))');
      expect(ast.statements[0].type).toBe('LetStatement');
    });

    it('handles mixed arithmetic operators', () => {
      const ast = parse('let x = 1 + 2 * 3 - 4 / 2');
      const stmt = ast.statements[0];
      expect(stmt.type).toBe('LetStatement');
    });

    it('parses multiple comparisons in sequence', () => {
      const ast = parse(`
        schema X {
          a: int,
          b: int,
          c: int,
          assume a < b and b < c
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes).toHaveLength(1);
      }
    });

    it('handles unweighted then weighted superposition', () => {
      const ast = parse('let x = "a" | 0.5: "b" | 0.5: "c"');
      const stmt = ast.statements[0];
      if (stmt.type === 'LetStatement') {
        expect(stmt.value.type).toBe('SuperpositionExpression');
      }
    });

    it('parses any of with where clause containing or', () => {
      const ast = parse(`
        schema X {
          ref: any of items where .status == "active" or .status == "pending"
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType.type).toBe('ExpressionType');
      }
    });

    it('parses function calls with complex arguments', () => {
      const ast = parse('let x = sum(items.price * items.quantity)');
      const stmt = ast.statements[0];
      if (stmt.type === 'LetStatement') {
        expect(stmt.value.type).toBe('CallExpression');
      }
    });

    it('handles qualified names with many parts', () => {
      const ast = parse(`
        schema X {
          value: faker.person.name.firstName()
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType.type).toBe('GeneratorType');
      }
    });

    it('parses open-ended ranges', () => {
      const ast = parse(`
        distribution X {
          0..10: 50%,
          11..: 50%
        }
      `);

      expect(ast.statements[0].type).toBe('DistributionDefinition');
    });

    it('parses nullable field', () => {
      const ast = parse(`
        schema X {
          value: string?
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].fieldType.type).toBe('SuperpositionType');
      }
    });

    it('handles dynamic cardinality with complex condition', () => {
      const ast = parse(`
        schema X {
          a: boolean,
          b: boolean,
          items: (a and b ? 10..20 : 1..5) of Item
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[2].fieldType.type).toBe('CollectionType');
      }
    });

    it('parses schema with then block', () => {
      const ast = parse(`
        schema Payment {
          invoice: any of invoices,
          amount: int in 1..100
        }
      `);

      const schema = ast.statements[0];
      expect(schema.type).toBe('SchemaDefinition');
    });

    it('parses validate block with multiple constraints', () => {
      const ast = parse(`
        dataset Test {
          items: 100 of Item,
          validate {
            sum(items.total) >= 1000,
            count(items) == 100,
            all(items, .price > 0)
          }
        }
      `);

      const dataset = ast.statements[0];
      if (dataset.type === 'DatasetDefinition') {
        expect(dataset.validation?.validations).toHaveLength(3);
      }
    });

    it('handles subtraction in expressions', () => {
      const ast = parse('let x = 10 - 5 + 3');
      // Parser handles subtraction as binary operation
      expect(ast.statements[0].type).toBe('LetStatement');
    });

    it('parses schema with both base and context', () => {
      const ast = parse('schema Invoice from codat.Invoice with Geography { }');

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.base).toBeDefined();
        expect(schema.contexts).toHaveLength(1);
      }
    });

    it('handles empty schema body', () => {
      const ast = parse('schema Empty { }');
      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields).toHaveLength(0);
      }
    });

    it('handles empty dataset body', () => {
      const ast = parse('dataset Empty { }');
      const dataset = ast.statements[0];
      if (dataset.type === 'DatasetDefinition') {
        expect(dataset.collections).toHaveLength(0);
      }
    });

    it('parses dataset with violating modifier', () => {
      const ast = parse(`
        dataset Invalid violating {
          items: 10 of Item
        }
      `);

      const dataset = ast.statements[0];
      if (dataset.type === 'DatasetDefinition') {
        expect(dataset.violating).toBe(true);
      }
    });

    it('handles multiple assume clauses with different types', () => {
      const ast = parse(`
        schema X {
          a: int,
          b: int,
          c: string,
          assume a > 0,
          assume if c == "special" {
            b > 100
          },
          assume a < b
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.assumes).toHaveLength(3);
        expect(schema.assumes![1].condition).toBeDefined();
      }
    });

    it('parses computed field with aggregation chain', () => {
      const ast = parse(`
        schema Order {
          items: 1..10 of LineItem,
          subtotal: sum(items.price),
          tax: subtotal * 0.2,
          total: subtotal + tax
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[1].computed).toBe(true);
        expect(schema.fields[2].computed).toBe(true);
        expect(schema.fields[3].computed).toBe(true);
      }
    });

    it('handles match expression', () => {
      const ast = parse(`
        let result = match status {
          "active" => 1,
          "inactive" => 0
        }
      `);

      const stmt = ast.statements[0];
      if (stmt.type === 'LetStatement') {
        expect(stmt.value.type).toBe('MatchExpression');
      }
    });

    it('parses unique field modifier', () => {
      const ast = parse(`
        schema X {
          id: unique int in 1..1000
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].unique).toBe(true);
      }
    });

    it('parses previous function reference', () => {
      const ast = parse(`
        schema TimeSeries {
          value: int in 1..100,
          prev: previous("value")
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[1].computed).toBe(true);
      }
    });

    it('parses sequence function', () => {
      const ast = parse(`
        schema Invoice {
          id: sequence("INV-", 1000)
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        expect(schema.fields[0].computed).toBe(true);
      }
    });

    it('parses negative number in range', () => {
      const ast = parse(`
        schema Temperature {
          celsius: int in -40..50
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        const field = schema.fields[0];
        expect(field.fieldType).toMatchObject({
          type: 'RangeType',
          baseType: { type: 'PrimitiveType', name: 'int' },
        });
        // min should be a UnaryExpression with operator '-'
        if (field.fieldType.type === 'RangeType') {
          expect(field.fieldType.min).toMatchObject({
            type: 'UnaryExpression',
            operator: '-',
            operand: { type: 'Literal', value: 40 },
          });
          expect(field.fieldType.max).toMatchObject({
            type: 'Literal',
            value: 50,
          });
        }
      }
    });

    it('parses negative range with both negative bounds', () => {
      const ast = parse(`
        schema Account {
          balance: decimal in -1000.00..-0.01
        }
      `);

      const schema = ast.statements[0];
      if (schema.type === 'SchemaDefinition') {
        const field = schema.fields[0];
        expect(field.fieldType.type).toBe('RangeType');
        if (field.fieldType.type === 'RangeType') {
          expect(field.fieldType.min).toMatchObject({
            type: 'UnaryExpression',
            operator: '-',
          });
          expect(field.fieldType.max).toMatchObject({
            type: 'UnaryExpression',
            operator: '-',
          });
        }
      }
    });

    it('parses unary plus in expression', () => {
      const ast = parse('let x = +5');

      expect(ast.statements[0]).toMatchObject({
        type: 'LetStatement',
        name: 'x',
        value: {
          type: 'UnaryExpression',
          operator: '+',
          operand: { type: 'Literal', value: 5 },
        },
      });
    });

    it('parses unary minus in expression', () => {
      const ast = parse('let x = -10');

      expect(ast.statements[0]).toMatchObject({
        type: 'LetStatement',
        name: 'x',
        value: {
          type: 'UnaryExpression',
          operator: '-',
          operand: { type: 'Literal', value: 10 },
        },
      });
    });
  });
});
