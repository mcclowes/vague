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
          total: = sum(line_items)
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
          line_items: 1..10 * LineItem
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
          companies: 100 * Company
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
          companies: 100 * Company
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
          companies: 100 * Company,
          invoices: 10..50 per company * Invoice
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
          currency: = ^company.currency
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
          items: 1..5 * LineItem
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
});
