import { describe, it, expect } from 'vitest';
import { parse } from 'vague-lang';
import { toOpenAPI, toOpenAPIString, listSchemas, toOpenAPIPartial } from './index.js';

describe('toOpenAPI', () => {
  it('exports a simple schema', () => {
    const ast = parse(`
      schema User {
        id: int,
        name: string,
        active: boolean
      }
    `);

    const spec = toOpenAPI(ast);

    expect(spec.openapi).toBe('3.0.3');
    expect(spec.components?.schemas?.User).toEqual({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        active: { type: 'boolean' },
      },
      required: ['id', 'name', 'active'],
    });
  });

  it('exports with OpenAPI 3.1 version', () => {
    const ast = parse(`
      schema Item {
        price: decimal
      }
    `);

    const spec = toOpenAPI(ast, { version: '3.1' });

    expect(spec.openapi).toBe('3.1.0');
  });

  it('handles range types with min/max', () => {
    const ast = parse(`
      schema Person {
        age: int in 18..65,
        score: decimal in 0.0..100.0
      }
    `);

    const spec = toOpenAPI(ast);
    const schema = spec.components?.schemas?.Person;

    expect(schema?.properties?.age).toEqual({
      type: 'integer',
      minimum: 18,
      maximum: 65,
    });
    expect(schema?.properties?.score).toEqual({
      type: 'number',
      minimum: 0.0,
      maximum: 100.0,
    });
  });

  it('handles date type', () => {
    const ast = parse(`
      schema Event {
        event_date: date
      }
    `);

    const spec = toOpenAPI(ast);

    expect(spec.components?.schemas?.Event?.properties?.event_date).toEqual({
      type: 'string',
      format: 'date',
    });
  });

  it('handles optional fields with nullable (3.0)', () => {
    const ast = parse(`
      schema User {
        nickname: string?
      }
    `);

    const spec = toOpenAPI(ast, { version: '3.0' });
    const schema = spec.components?.schemas?.User;

    expect(schema?.properties?.nickname).toEqual({
      type: 'string',
      nullable: true,
    });
    expect(schema?.required).toBeUndefined();
  });

  it('handles optional fields with type array (3.1)', () => {
    const ast = parse(`
      schema User {
        nickname: string?
      }
    `);

    const spec = toOpenAPI(ast, { version: '3.1' });

    expect(spec.components?.schemas?.User?.properties?.nickname).toEqual({
      type: ['string', 'null'],
    });
  });

  it('handles superposition as enum', () => {
    const ast = parse(`
      schema Invoice {
        status: "draft" | "sent" | "paid"
      }
    `);

    const spec = toOpenAPI(ast);

    expect(spec.components?.schemas?.Invoice?.properties?.status).toEqual({
      enum: ['draft', 'sent', 'paid'],
    });
  });

  it('handles weighted superposition with extensions', () => {
    const ast = parse(`
      schema Invoice {
        status: 0.7: "paid" | 0.2: "pending" | 0.1: "draft"
      }
    `);

    const spec = toOpenAPI(ast, { includeExtensions: true });
    const statusSchema = spec.components?.schemas?.Invoice?.properties?.status;

    expect(statusSchema?.enum).toEqual(['paid', 'pending', 'draft']);
    expect(statusSchema?.['x-vague-weights']).toEqual([0.7, 0.2, 0.1]);
  });

  it('handles collection types', () => {
    const ast = parse(`
      schema LineItem {
        name: string,
        price: decimal
      }
      schema Invoice {
        items: 1..10 * LineItem
      }
    `);

    const spec = toOpenAPI(ast);
    const itemsSchema = spec.components?.schemas?.Invoice?.properties?.items;

    expect(itemsSchema).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/LineItem' },
      minItems: 1,
      maxItems: 10,
    });
  });

  it('handles generator types', () => {
    const ast = parse(`
      schema User {
        id: uuid(),
        email: email()
      }
    `);

    const spec = toOpenAPI(ast);
    const schema = spec.components?.schemas?.User;

    expect(schema?.properties?.id).toEqual({
      type: 'string',
      format: 'uuid',
    });
    expect(schema?.properties?.email).toEqual({
      type: 'string',
      format: 'email',
    });
  });

  it('includes generator info in extensions', () => {
    const ast = parse(`
      schema User {
        id: uuid()
      }
    `);

    const spec = toOpenAPI(ast, { includeExtensions: true });

    expect(spec.components?.schemas?.User?.properties?.id?.['x-vague-generator']).toBe('uuid');
  });

  it('marks computed fields as readOnly', () => {
    const ast = parse(`
      schema Invoice {
        subtotal: decimal,
        tax: = round(subtotal * 0.2, 2)
      }
    `);

    const spec = toOpenAPI(ast);

    expect(spec.components?.schemas?.Invoice?.properties?.tax?.readOnly).toBe(true);
  });

  it('includes computed extension when requested', () => {
    const ast = parse(`
      schema Invoice {
        subtotal: decimal,
        total: = subtotal * 1.2
      }
    `);

    const spec = toOpenAPI(ast, { includeExtensions: true });

    expect(spec.components?.schemas?.Invoice?.properties?.total?.['x-vague-computed']).toBe(true);
  });

  it('includes unique extension when requested', () => {
    const ast = parse(`
      schema Invoice {
        id: unique int in 1000..9999
      }
    `);

    const spec = toOpenAPI(ast, { includeExtensions: true });

    expect(spec.components?.schemas?.Invoice?.properties?.id?.['x-vague-unique']).toBe(true);
  });

  it('includes constraint extensions when requested', () => {
    const ast = parse(`
      schema Invoice {
        issued_date: int in 1..28,
        due_date: int in 1..28,
        assume due_date >= issued_date
      }
    `);

    const spec = toOpenAPI(ast, { includeExtensions: true });

    expect(spec.components?.schemas?.Invoice?.['x-vague-constraint']).toBe(
      'due_date >= issued_date'
    );
  });

  it('sets custom info fields', () => {
    const ast = parse(`
      schema User { name: string }
    `);

    const spec = toOpenAPI(ast, {
      title: 'My API',
      infoVersion: '2.0.0',
      description: 'API description',
    });

    expect(spec.info.title).toBe('My API');
    expect(spec.info.version).toBe('2.0.0');
    expect(spec.info.description).toBe('API description');
  });

  it('exports multiple schemas', () => {
    const ast = parse(`
      schema User {
        id: int,
        name: string
      }
      schema Product {
        sku: string,
        price: decimal
      }
    `);

    const spec = toOpenAPI(ast);

    expect(Object.keys(spec.components?.schemas ?? {})).toEqual(['User', 'Product']);
  });
});

describe('toOpenAPIString', () => {
  it('returns valid JSON string', () => {
    const ast = parse(`
      schema Test { value: int }
    `);

    const json = toOpenAPIString(ast);
    const parsed = JSON.parse(json);

    expect(parsed.openapi).toBe('3.0.3');
    expect(parsed.components.schemas.Test).toBeDefined();
  });
});

describe('listSchemas', () => {
  it('returns schema names', () => {
    const ast = parse(`
      schema User { name: string }
      schema Product { sku: string }
      schema Order { id: int }
    `);

    const names = listSchemas(ast);

    expect(names).toEqual(['User', 'Product', 'Order']);
  });
});

describe('toOpenAPIPartial', () => {
  it('exports only specified schemas', () => {
    const ast = parse(`
      schema User { name: string }
      schema Product { sku: string }
      schema Order { id: int }
    `);

    const spec = toOpenAPIPartial(ast, ['User', 'Order']);
    const schemaNames = Object.keys(spec.components?.schemas ?? {});

    expect(schemaNames).toEqual(['User', 'Order']);
    expect(spec.components?.schemas?.Product).toBeUndefined();
  });
});

describe('type inference for expressions', () => {
  it('infers number type for arithmetic', () => {
    const ast = parse(`
      schema Invoice {
        subtotal: decimal,
        tax_rate: decimal,
        tax: = subtotal * tax_rate
      }
    `);

    const spec = toOpenAPI(ast);

    expect(spec.components?.schemas?.Invoice?.properties?.tax?.type).toBe('number');
  });

  it('infers number type for aggregate functions', () => {
    const ast = parse(`
      schema LineItem { amount: decimal }
      schema Invoice {
        items: 1..5 * LineItem,
        total: = sum(items.amount),
        count: = count(items)
      }
    `);

    const spec = toOpenAPI(ast);
    const props = spec.components?.schemas?.Invoice?.properties;

    expect(props?.total?.type).toBe('number');
    expect(props?.count?.type).toBe('number');
  });

  it('infers date-time type for date functions', () => {
    const ast = parse(`
      schema Event {
        created: = now(),
        scheduled: = daysFromNow(30)
      }
    `);

    const spec = toOpenAPI(ast);
    const props = spec.components?.schemas?.Event?.properties;

    expect(props?.created).toEqual({ type: 'string', format: 'date-time', readOnly: true });
    expect(props?.scheduled).toEqual({ type: 'string', format: 'date-time', readOnly: true });
  });

  it('infers string type for string functions', () => {
    const ast = parse(`
      schema Product {
        name: string,
        slug: = kebabCase(name),
        upper: = uppercase(name)
      }
    `);

    const spec = toOpenAPI(ast);
    const props = spec.components?.schemas?.Product?.properties;

    expect(props?.slug?.type).toBe('string');
    expect(props?.upper?.type).toBe('string');
  });

  it('infers integer type for sequence functions', () => {
    const ast = parse(`
      schema Invoice {
        num: = sequenceInt("inv", 1000)
      }
    `);

    const spec = toOpenAPI(ast);

    expect(spec.components?.schemas?.Invoice?.properties?.num?.type).toBe('integer');
  });
});
