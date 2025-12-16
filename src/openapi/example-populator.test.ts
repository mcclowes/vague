import { describe, it, expect } from 'vitest';
import { OpenAPIExamplePopulator } from './example-populator.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('OpenAPIExamplePopulator', () => {
  const createTestDocument = (): OpenAPIV3.Document => ({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Pet' },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createPet',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Pet: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
        },
        Owner: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string' },
          },
        },
      },
    },
  });

  describe('detectMapping', () => {
    it('detects exact case-insensitive matches', () => {
      const populator = new OpenAPIExamplePopulator();
      const mapping = populator.detectMapping(['pet', 'owner'], ['Pet', 'Owner']);
      expect(mapping).toEqual({ pet: 'Pet', owner: 'Owner' });
    });

    it('detects plural to singular mappings', () => {
      const populator = new OpenAPIExamplePopulator();
      const mapping = populator.detectMapping(['pets', 'owners'], ['Pet', 'Owner']);
      expect(mapping).toEqual({ pets: 'Pet', owners: 'Owner' });
    });

    it('handles -ies plural form', () => {
      const populator = new OpenAPIExamplePopulator();
      const mapping = populator.detectMapping(['companies'], ['Company']);
      expect(mapping).toEqual({ companies: 'Company' });
    });

    it('handles -es plural form', () => {
      const populator = new OpenAPIExamplePopulator();
      const mapping = populator.detectMapping(['boxes'], ['Box']);
      expect(mapping).toEqual({ boxes: 'Box' });
    });

    it('handles snake_case to PascalCase', () => {
      const populator = new OpenAPIExamplePopulator();
      const mapping = populator.detectMapping(['user_accounts'], ['UserAccount']);
      expect(mapping).toEqual({ user_accounts: 'UserAccount' });
    });

    it('handles snake_case plural to PascalCase singular', () => {
      const populator = new OpenAPIExamplePopulator();
      const mapping = populator.detectMapping(['line_items'], ['LineItem']);
      expect(mapping).toEqual({ line_items: 'LineItem' });
    });

    it('returns empty mapping for no matches', () => {
      const populator = new OpenAPIExamplePopulator();
      const mapping = populator.detectMapping(['foo'], ['Bar']);
      expect(mapping).toEqual({});
    });
  });

  describe('populate - schema-level examples', () => {
    it('adds single example when exampleCount is 1', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [
          { id: 1, name: 'Fluffy' },
          { id: 2, name: 'Spot' },
        ],
      };

      const { document } = populator.populate(doc, data, {
        externalRefs: false,
        exampleCount: 1,
        mapping: { pets: 'Pet' },
      });

      const petSchema = document.components?.schemas?.Pet as OpenAPIV3.SchemaObject;
      expect(petSchema.example).toEqual({ id: 1, name: 'Fluffy' });
    });

    it('adds multiple named examples when exampleCount > 1', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [
          { id: 1, name: 'Fluffy' },
          { id: 2, name: 'Spot' },
          { id: 3, name: 'Buddy' },
        ],
      };

      const { document } = populator.populate(doc, data, {
        externalRefs: false,
        exampleCount: 2,
        mapping: { pets: 'Pet' },
      });

      const petSchema = document.components?.schemas?.Pet as OpenAPIV3.SchemaObject & {
        examples?: Record<string, { value: unknown }>;
      };
      expect(petSchema.examples).toBeDefined();
      expect(petSchema.examples?.example1?.value).toEqual({ id: 1, name: 'Fluffy' });
      expect(petSchema.examples?.example2?.value).toEqual({ id: 2, name: 'Spot' });
    });

    it('limits examples to available data', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [{ id: 1, name: 'Fluffy' }],
      };

      const { document } = populator.populate(doc, data, {
        externalRefs: false,
        exampleCount: 5,
        mapping: { pets: 'Pet' },
      });

      const petSchema = document.components?.schemas?.Pet as OpenAPIV3.SchemaObject & {
        examples?: Record<string, { value: unknown }>;
      };
      expect(Object.keys(petSchema.examples || {})).toHaveLength(1);
    });
  });

  describe('populate - path-level examples', () => {
    it('populates response examples for array responses', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [
          { id: 1, name: 'Fluffy' },
          { id: 2, name: 'Spot' },
        ],
      };

      const { document } = populator.populate(doc, data, {
        externalRefs: false,
        exampleCount: 1,
        mapping: { pets: 'Pet' },
      });

      const response = document.paths?.['/pets']?.get?.responses?.[
        '200'
      ] as OpenAPIV3.ResponseObject;
      const mediaType = response?.content?.['application/json'];
      expect(mediaType?.example).toEqual([
        { id: 1, name: 'Fluffy' },
        { id: 2, name: 'Spot' },
      ]);
    });

    it('populates request body examples', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [{ id: 1, name: 'Fluffy' }],
      };

      const { document } = populator.populate(doc, data, {
        externalRefs: false,
        exampleCount: 1,
        mapping: { pets: 'Pet' },
      });

      const requestBody = document.paths?.['/pets']?.post
        ?.requestBody as OpenAPIV3.RequestBodyObject;
      const mediaType = requestBody?.content?.['application/json'];
      expect(mediaType?.example).toEqual({ id: 1, name: 'Fluffy' });
    });
  });

  describe('populate - external references', () => {
    it('creates external file references for single example', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [{ id: 1, name: 'Fluffy' }],
      };

      const { document, externalFiles } = populator.populate(doc, data, {
        externalRefs: true,
        exampleCount: 1,
        outputDir: '/tmp',
        mapping: { pets: 'Pet' },
      });

      const petSchema = document.components?.schemas?.Pet as OpenAPIV3.SchemaObject & {
        externalValue?: string;
      };
      expect(petSchema.externalValue).toBe('./examples/Pet.json');
      expect(externalFiles?.size).toBeGreaterThan(0);
    });

    it('creates numbered external files for multiple examples', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [
          { id: 1, name: 'Fluffy' },
          { id: 2, name: 'Spot' },
        ],
      };

      const { document, externalFiles } = populator.populate(doc, data, {
        externalRefs: true,
        exampleCount: 2,
        outputDir: '/tmp',
        mapping: { pets: 'Pet' },
      });

      const petSchema = document.components?.schemas?.Pet as OpenAPIV3.SchemaObject & {
        examples?: Record<string, { externalValue: string }>;
      };
      expect(petSchema.examples?.example1?.externalValue).toBe('./examples/Pet-1.json');
      expect(petSchema.examples?.example2?.externalValue).toBe('./examples/Pet-2.json');
      expect(externalFiles?.size).toBeGreaterThanOrEqual(2);
    });

    it('external file content is valid JSON', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [{ id: 1, name: 'Fluffy' }],
      };

      const { externalFiles } = populator.populate(doc, data, {
        externalRefs: true,
        exampleCount: 1,
        outputDir: '/tmp',
        mapping: { pets: 'Pet' },
      });

      for (const [, content] of externalFiles!) {
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });
  });

  describe('populate - auto-detection', () => {
    it('auto-detects mapping when not provided', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        pets: [{ id: 1, name: 'Fluffy' }],
        owners: [{ id: 1, email: 'test@example.com' }],
      };

      const { document } = populator.populate(doc, data, {
        externalRefs: false,
        exampleCount: 1,
      });

      const petSchema = document.components?.schemas?.Pet as OpenAPIV3.SchemaObject;
      const ownerSchema = document.components?.schemas?.Owner as OpenAPIV3.SchemaObject;
      expect(petSchema.example).toBeDefined();
      expect(ownerSchema.example).toBeDefined();
    });

    it('manual mapping overrides auto-detection', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const data = {
        animals: [{ id: 1, name: 'Fluffy' }],
      };

      const { document } = populator.populate(doc, data, {
        externalRefs: false,
        exampleCount: 1,
        mapping: { animals: 'Pet' },
      });

      const petSchema = document.components?.schemas?.Pet as OpenAPIV3.SchemaObject;
      expect(petSchema.example).toEqual({ id: 1, name: 'Fluffy' });
    });
  });

  describe('document cloning', () => {
    it('does not mutate the original document', () => {
      const populator = new OpenAPIExamplePopulator();
      const doc = createTestDocument();
      const originalPetSchema = JSON.stringify(doc.components?.schemas?.Pet);

      populator.populate(
        doc,
        { pets: [{ id: 1, name: 'Fluffy' }] },
        {
          externalRefs: false,
          exampleCount: 1,
          mapping: { pets: 'Pet' },
        }
      );

      expect(JSON.stringify(doc.components?.schemas?.Pet)).toBe(originalPetSchema);
    });
  });
});
