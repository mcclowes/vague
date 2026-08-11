import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAPILoader } from './loader.js';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  warningCollector,
  type OpenAPIImportWarning,
  type OpenAPIValidationGapWarning,
} from '../warnings.js';

const TMP_DIR = join(__dirname, '..', '..', '.test-tmp-loader');

describe('OpenAPILoader', () => {
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

  describe('load()', () => {
    it('loads schemas from OpenAPI 3.0.x spec', async () => {
      const specPath = join(TMP_DIR, 'api-3.0.json');
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
                required: ['id', 'name'],
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

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);

      expect(schemas.size).toBe(1);
      expect(schemas.has('User')).toBe(true);

      const userSchema = schemas.get('User');
      expect(userSchema?.name).toBe('User');
      expect(userSchema?.fields).toHaveLength(3);
      expect(userSchema?.required).toEqual(['id', 'name']);
    });

    it('loads schemas from OpenAPI 3.1.x spec', async () => {
      const specPath = join(TMP_DIR, 'api-3.1.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: 'Test API 3.1', version: '1.0.0' },
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

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);

      expect(schemas.size).toBe(1);
      expect(schemas.has('Product')).toBe(true);
    });

    it('loads and dereferences YAML OpenAPI documents', async () => {
      const specPath = join(TMP_DIR, 'api.yaml');
      writeFileSync(
        specPath,
        `openapi: 3.1.0
info:
  title: YAML API
  version: 1.0.0
paths: {}
components:
  schemas:
    Identifier:
      type: string
      pattern: "^[A-Z]{2}[0-9]{4}$"
    Account:
      type: object
      required: [id]
      properties:
        id:
          $ref: "#/components/schemas/Identifier"
`
      );

      const account = (await new OpenAPILoader().load(specPath)).get('Account');

      expect(account?.fields[0]).toMatchObject({
        name: 'id',
        required: true,
        constraints: { pattern: '^[A-Z]{2}[0-9]{4}$' },
      });
    });

    it('dereferences local, nested, array-item, and external OpenAPI 3.1 schemas', async () => {
      const externalPath = join(TMP_DIR, 'external.json');
      const specPath = join(TMP_DIR, 'referenced-3.1.json');
      writeFileSync(
        externalPath,
        JSON.stringify({
          $defs: {
            Owner: {
              type: 'object',
              required: ['name'],
              properties: { name: { type: 'string' } },
            },
          },
        })
      );
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: 'Referenced API', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Tag: { type: 'string', enum: ['one', 'two'] },
              Item: {
                type: 'object',
                properties: {
                  owner: { $ref: './external.json#/$defs/Owner' },
                  tags: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Tag' },
                  },
                  nested: {
                    type: 'object',
                    properties: {
                      tag: { $ref: '#/components/schemas/Tag' },
                    },
                  },
                },
              },
            },
          },
        })
      );

      const schemas = await new OpenAPILoader().load(specPath);
      const item = schemas.get('Item');

      expect(item?.fields.find((field) => field.name === 'owner')?.type).toMatchObject({
        kind: 'object',
        fields: [{ name: 'name', required: true }],
      });
      expect(item?.fields.find((field) => field.name === 'tags')?.type).toEqual({
        kind: 'array',
        items: { kind: 'primitive', type: 'string', enum: ['one', 'two'] },
      });
      expect(item?.fields.find((field) => field.name === 'nested')?.type).toMatchObject({
        kind: 'object',
        fields: [{ name: 'tag', type: { enum: ['one', 'two'] } }],
      });
    });

    it('returns empty map when no schemas defined', async () => {
      const specPath = join(TMP_DIR, 'no-schemas.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Empty API', version: '1.0.0' },
          paths: {},
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);

      expect(schemas.size).toBe(0);
    });

    it('loads multiple schemas', async () => {
      const specPath = join(TMP_DIR, 'multi-schema.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Multi Schema API', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              User: {
                type: 'object',
                properties: { id: { type: 'integer' } },
              },
              Product: {
                type: 'object',
                properties: { name: { type: 'string' } },
              },
              Order: {
                type: 'object',
                properties: { total: { type: 'number' } },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);

      expect(schemas.size).toBe(3);
      expect(schemas.has('User')).toBe(true);
      expect(schemas.has('Product')).toBe(true);
      expect(schemas.has('Order')).toBe(true);
    });

    it('throws error for non-existent file', async () => {
      const loader = new OpenAPILoader();

      await expect(loader.load('/nonexistent/path.json')).rejects.toThrow();
    });

    it('throws error for invalid JSON', async () => {
      const specPath = join(TMP_DIR, 'invalid.json');
      writeFileSync(specPath, 'not valid json {{{');

      const loader = new OpenAPILoader();

      await expect(loader.load(specPath)).rejects.toThrow();
    });

    it('rejects JSON that is not a valid OpenAPI document', async () => {
      const specPath = join(TMP_DIR, 'not-openapi.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          components: { schemas: { User: { type: 'object', properties: {} } } },
        })
      );

      await expect(new OpenAPILoader().load(specPath)).rejects.toThrow(
        'expected an OpenAPI 3.0 or 3.1 version'
      );
    });

    it('rejects unsupported OpenAPI versions', async () => {
      const specPath = join(TMP_DIR, 'unsupported-version.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '4.0.0',
          info: { title: 'Future API', version: '1.0.0' },
          paths: {},
        })
      );

      await expect(new OpenAPILoader().load(specPath)).rejects.toThrow(
        'expected an OpenAPI 3.0 or 3.1 version'
      );
    });
  });

  describe('field type parsing', () => {
    it('preserves top-level oneOf object variants', async () => {
      const specPath = join(TMP_DIR, 'top-level-one-of.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Event: {
                oneOf: [
                  {
                    type: 'object',
                    required: ['email'],
                    properties: { email: { type: 'string', format: 'email' } },
                  },
                  {
                    type: 'object',
                    required: ['phone'],
                    properties: { phone: { type: 'string' } },
                  },
                ],
              },
            },
          },
        })
      );

      const event = (await new OpenAPILoader().load(specPath)).get('Event');

      expect(event?.variants).toHaveLength(2);
      expect(event?.variants?.[0].map((field) => field.name)).toEqual(['email']);
      expect(event?.variants?.[1].map((field) => field.name)).toEqual(['phone']);
      expect(event?.fields.map((field) => field.name)).toEqual(['email', 'phone']);
    });

    it('parses string fields', async () => {
      const specPath = join(TMP_DIR, 'string-field.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Test')?.fields.find((f) => f.name === 'name');

      expect(field?.type).toEqual({ kind: 'primitive', type: 'string' });
    });

    it('parses integer fields', async () => {
      const specPath = join(TMP_DIR, 'int-field.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  count: { type: 'integer' },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Test')?.fields.find((f) => f.name === 'count');

      expect(field?.type).toEqual({ kind: 'primitive', type: 'integer' });
    });

    it('parses number fields', async () => {
      const specPath = join(TMP_DIR, 'number-field.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Test')?.fields.find((f) => f.name === 'price');

      expect(field?.type).toEqual({ kind: 'primitive', type: 'number' });
    });

    it('parses boolean fields', async () => {
      const specPath = join(TMP_DIR, 'bool-field.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  active: { type: 'boolean' },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Test')?.fields.find((f) => f.name === 'active');

      expect(field?.type).toEqual({ kind: 'primitive', type: 'boolean' });
    });

    it('parses array fields', async () => {
      const specPath = join(TMP_DIR, 'array-field.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Test')?.fields.find((f) => f.name === 'tags');

      expect(field?.type).toEqual({
        kind: 'array',
        items: { kind: 'primitive', type: 'string' },
      });
    });

    it('parses nested array fields', async () => {
      const specPath = join(TMP_DIR, 'nested-array.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  matrix: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Test')?.fields.find((f) => f.name === 'matrix');

      expect(field?.type).toEqual({
        kind: 'array',
        items: {
          kind: 'array',
          items: { kind: 'primitive', type: 'integer' },
        },
      });
    });

    it('preserves object fields', async () => {
      const specPath = join(TMP_DIR, 'object-field.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  metadata: { type: 'object' },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Test')?.fields.find((f) => f.name === 'metadata');

      expect(field?.type).toEqual({ kind: 'object', fields: [] });
    });

    it('reports an unsupported field type', async () => {
      const specPath = join(TMP_DIR, 'unknown-type.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  weird: { type: 'unknown_type' },
                },
              },
            },
          },
        })
      );

      await expect(new OpenAPILoader().load(specPath)).rejects.toThrow(
        'Unsupported OpenAPI schema type: unknown_type'
      );
    });

    it('warns when generation can only approximate unsupported schema keywords', async () => {
      const specPath = join(TMP_DIR, 'unsupported-keywords.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Test: {
                type: 'object',
                properties: {
                  metadata: {
                    type: 'object',
                    additionalProperties: { type: 'string' },
                  },
                  values: {
                    type: 'array',
                    prefixItems: [{ type: 'string' }, { type: 'integer' }],
                  },
                  positive: { type: 'integer', not: { maximum: 0 } },
                },
              },
            },
          },
        })
      );

      const schemas = await new OpenAPILoader().load(specPath);
      const warnings = warningCollector.getWarningsByType<OpenAPIImportWarning>('OpenAPIImport');

      expect(schemas.get('Test')?.fields).toHaveLength(3);
      expect(warnings).toHaveLength(3);
      expect(warnings.map((warning) => warning.path)).toEqual([
        'components.schemas.Test.properties.metadata',
        'components.schemas.Test.properties.values',
        'components.schemas.Test.properties.positive',
      ]);
      expect(warnings.flatMap((warning) => warning.unsupportedKeywords)).toEqual([
        'additionalProperties',
        'prefixItems',
        'not',
      ]);
    });

    it('exposes validation constraints and warns about prose-only rules', async () => {
      const specPath = join(TMP_DIR, 'validation-metadata.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Payment: {
                type: 'object',
                properties: {
                  sortCode: {
                    type: 'string',
                    minLength: 6,
                    maxLength: 6,
                    pattern: '^[0-9]{6}$',
                    description: 'Must identify a UK branch.',
                  },
                  amount: { type: 'number', minimum: 0.01, maximum: 1000 },
                  states: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 4,
                    items: { type: 'string', enum: ['pending', 'paid'] },
                  },
                },
              },
            },
          },
        })
      );

      const payment = (await new OpenAPILoader().load(specPath)).get('Payment');
      const sortCode = payment?.fields.find((field) => field.name === 'sortCode');
      const amount = payment?.fields.find((field) => field.name === 'amount');
      const states = payment?.fields.find((field) => field.name === 'states');
      const warnings =
        warningCollector.getWarningsByType<OpenAPIValidationGapWarning>('OpenAPIValidationGap');

      expect(sortCode).toMatchObject({
        sourcePath: 'components.schemas.Payment.properties.sortCode',
        constraints: { minLength: 6, maxLength: 6, pattern: '^[0-9]{6}$' },
      });
      expect(amount?.constraints).toEqual({ minimum: 0.01, maximum: 1000 });
      expect(states?.constraints).toEqual({ minItems: 1, maxItems: 4 });
      expect(warnings).toMatchObject([
        {
          path: 'components.schemas.Payment.properties.sortCode',
          description: 'Must identify a UK branch.',
        },
      ]);
    });
  });

  describe('required fields', () => {
    it('marks required fields correctly', async () => {
      const specPath = join(TMP_DIR, 'required.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              User: {
                type: 'object',
                required: ['id', 'name'],
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

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const schema = schemas.get('User');

      expect(schema?.required).toEqual(['id', 'name']);
      expect(schema?.fields.find((f) => f.name === 'id')?.required).toBe(true);
      expect(schema?.fields.find((f) => f.name === 'name')?.required).toBe(true);
      expect(schema?.fields.find((f) => f.name === 'email')?.required).toBe(false);
    });

    it('handles schema with no required fields', async () => {
      const specPath = join(TMP_DIR, 'no-required.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Optional: {
                type: 'object',
                properties: {
                  a: { type: 'string' },
                  b: { type: 'integer' },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const schema = schemas.get('Optional');

      expect(schema?.required).toEqual([]);
      schema?.fields.forEach((f) => {
        expect(f.required).toBe(false);
      });
    });
  });

  describe('enum fields', () => {
    it('extracts string enum values', async () => {
      const specPath = join(TMP_DIR, 'string-enum.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Status: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['draft', 'pending', 'active', 'archived'],
                  },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Status')?.fields.find((f) => f.name === 'status');

      expect(field?.enum).toEqual(['draft', 'pending', 'active', 'archived']);
    });

    it('extracts numeric enum values', async () => {
      const specPath = join(TMP_DIR, 'num-enum.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Priority: {
                type: 'object',
                properties: {
                  level: {
                    type: 'integer',
                    enum: [1, 2, 3, 4, 5],
                  },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const field = schemas.get('Priority')?.fields.find((f) => f.name === 'level');

      expect(field?.enum).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('format hints', () => {
    it('extracts format from string fields', async () => {
      const specPath = join(TMP_DIR, 'formats.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              FormattedData: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  created: { type: 'string', format: 'date-time' },
                  birthDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const schema = schemas.get('FormattedData');

      expect(schema?.fields.find((f) => f.name === 'id')?.format).toBe('uuid');
      expect(schema?.fields.find((f) => f.name === 'email')?.format).toBe('email');
      expect(schema?.fields.find((f) => f.name === 'created')?.format).toBe('date-time');
      expect(schema?.fields.find((f) => f.name === 'birthDate')?.format).toBe('date');
    });
  });

  describe('description', () => {
    it('extracts field descriptions', async () => {
      const specPath = join(TMP_DIR, 'descriptions.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              Documented: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of the entity',
                  },
                  count: {
                    type: 'integer',
                    description: 'Number of items',
                  },
                },
              },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      const schemas = await loader.load(specPath);
      const schema = schemas.get('Documented');

      expect(schema?.fields.find((f) => f.name === 'name')?.description).toBe(
        'The name of the entity'
      );
      expect(schema?.fields.find((f) => f.name === 'count')?.description).toBe('Number of items');
    });
  });

  describe('getSchema() and getAllSchemas()', () => {
    it('getSchema returns undefined for non-existent schema', async () => {
      const specPath = join(TMP_DIR, 'get-schema.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              User: { type: 'object', properties: {} },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      await loader.load(specPath);

      expect(loader.getSchema('User')).toBeDefined();
      expect(loader.getSchema('NonExistent')).toBeUndefined();
    });

    it('getAllSchemas returns all loaded schemas', async () => {
      const specPath = join(TMP_DIR, 'all-schemas.json');
      writeFileSync(
        specPath,
        JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {
              A: { type: 'object', properties: {} },
              B: { type: 'object', properties: {} },
              C: { type: 'object', properties: {} },
            },
          },
        })
      );

      const loader = new OpenAPILoader();
      await loader.load(specPath);
      const all = loader.getAllSchemas();

      expect(all.size).toBe(3);
      expect(all.has('A')).toBe(true);
      expect(all.has('B')).toBe(true);
      expect(all.has('C')).toBe(true);
    });
  });

  describe('real-world spec', () => {
    it('loads petstore example spec', async () => {
      const loader = new OpenAPILoader();
      const specPath = join(
        __dirname,
        '..',
        '..',
        'examples',
        'openapi-examples-generation',
        'petstore.json'
      );
      const schemas = await loader.load(specPath);

      expect(schemas.size).toBeGreaterThan(0);
      expect(schemas.has('Pet')).toBe(true);

      const petSchema = schemas.get('Pet');
      expect(petSchema?.required).toContain('id');
      expect(petSchema?.required).toContain('name');
    });
  });
});
