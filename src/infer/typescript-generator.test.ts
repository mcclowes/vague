import { describe, it, expect } from 'vitest';
import { generateTypeScript } from './typescript-generator.js';
import type { InferredSchema } from './codegen.js';

describe('typescript-generator', () => {
  describe('generateTypeScript', () => {
    it('generates basic interface for simple schema', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              unique: true,
              isSuperposition: false,
              isArray: false,
            },
            {
              name: 'name',
              type: 'string',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
            {
              name: 'age',
              type: 'int',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 10,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain('interface User');
      expect(result).toContain('id: number');
      expect(result).toContain('name: string');
      expect(result).toContain('age: number');
    });

    it('generates nullable fields correctly', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'Person',
          fields: [
            {
              name: 'nickname',
              type: 'string',
              nullable: true,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 5,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain('nickname?: string | null');
    });

    it('generates union types for superpositions', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'Invoice',
          fields: [
            {
              name: 'status',
              type: 'string',
              nullable: false,
              unique: false,
              isSuperposition: true,
              superpositionOptions: [
                { value: 'draft', count: 2, weight: 0.2 },
                { value: 'sent', count: 3, weight: 0.3 },
                { value: 'paid', count: 5, weight: 0.5 },
              ],
              isArray: false,
            },
          ],
          recordCount: 10,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain("'draft' | 'sent' | 'paid'");
    });

    it('generates array types', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'LineItem',
          fields: [
            {
              name: 'amount',
              type: 'decimal',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 0, // Nested schema
        },
        {
          name: 'Order',
          fields: [
            {
              name: 'items',
              type: 'array',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: true,
              nestedSchemaName: 'LineItem',
            },
          ],
          recordCount: 10,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain('items: LineItem[]');
    });

    it('generates dataset interface with all collections', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              unique: true,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 10,
        },
        {
          name: 'Invoice',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              unique: true,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 20,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain('interface TestData');
      expect(result).toContain('users: User[]');
      expect(result).toContain('invoices: Invoice[]');
    });

    it('handles nested objects', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'Address',
          fields: [
            {
              name: 'street',
              type: 'string',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
            {
              name: 'city',
              type: 'string',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 0,
        },
        {
          name: 'User',
          fields: [
            {
              name: 'name',
              type: 'string',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
            {
              name: 'address',
              type: 'object',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
              nestedSchemaName: 'Address',
            },
          ],
          recordCount: 10,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain('interface Address');
      expect(result).toContain('address: Address');
    });

    it('handles date type as string', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'Event',
          fields: [
            {
              name: 'created_at',
              type: 'date',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 5,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain('created_at: string');
    });

    it('handles boolean type', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'User',
          fields: [
            {
              name: 'active',
              type: 'boolean',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 5,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData');

      expect(result).toContain('active: boolean');
    });

    it('includes export keyword when exportInterfaces is true', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 5,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData', { exportInterfaces: true });

      expect(result).toContain('export interface User');
      expect(result).toContain('export interface TestData');
    });

    it('omits export keyword when exportInterfaces is false', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 5,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData', { exportInterfaces: false });

      expect(result).not.toContain('export interface');
      expect(result).toContain('interface User');
    });

    it('generates readonly arrays when readonlyArrays is true', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'Item',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 0,
        },
        {
          name: 'Order',
          fields: [
            {
              name: 'items',
              type: 'array',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: true,
              nestedSchemaName: 'Item',
            },
          ],
          recordCount: 5,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData', { readonlyArrays: true });

      expect(result).toContain('readonly Item[]');
    });

    it('omits comments when includeComments is false', () => {
      const schemas: InferredSchema[] = [
        {
          name: 'User',
          fields: [
            {
              name: 'id',
              type: 'int',
              nullable: false,
              unique: false,
              isSuperposition: false,
              isArray: false,
            },
          ],
          recordCount: 5,
        },
      ];

      const result = generateTypeScript(schemas, 'TestData', { includeComments: false });

      expect(result).not.toContain('/**');
      expect(result).not.toContain('Auto-generated');
    });
  });
});
