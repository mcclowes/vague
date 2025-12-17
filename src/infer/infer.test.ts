import { describe, it, expect } from 'vitest';
import { detectValueType, aggregateTypes } from './type-detector.js';
import {
  detectNumericRange,
  detectDateRange,
  detectArrayCardinality,
  detectUniqueness,
} from './range-detector.js';
import { detectSuperposition } from './enum-detector.js';
import { detectFormat, detectFieldNamePattern } from './format-detector.js';
import { inferSchema, inferSchemaOnly } from './index.js';

describe('Type Detector', () => {
  describe('detectValueType', () => {
    it('detects null', () => {
      expect(detectValueType(null)).toBe('null');
      expect(detectValueType(undefined)).toBe('null');
    });

    it('detects boolean', () => {
      expect(detectValueType(true)).toBe('boolean');
      expect(detectValueType(false)).toBe('boolean');
    });

    it('detects int', () => {
      expect(detectValueType(42)).toBe('int');
      expect(detectValueType(0)).toBe('int');
      expect(detectValueType(-10)).toBe('int');
    });

    it('detects decimal', () => {
      expect(detectValueType(3.14)).toBe('decimal');
      expect(detectValueType(0.5)).toBe('decimal');
      expect(detectValueType(-2.5)).toBe('decimal');
    });

    it('detects string', () => {
      expect(detectValueType('hello')).toBe('string');
      expect(detectValueType('')).toBe('string');
    });

    it('detects date strings', () => {
      expect(detectValueType('2024-03-15')).toBe('date');
      expect(detectValueType('2024-03-15T10:30:00.000Z')).toBe('date');
    });

    it('detects array', () => {
      expect(detectValueType([])).toBe('array');
      expect(detectValueType([1, 2, 3])).toBe('array');
    });

    it('detects object', () => {
      expect(detectValueType({})).toBe('object');
      expect(detectValueType({ a: 1 })).toBe('object');
    });
  });

  describe('aggregateTypes', () => {
    it('returns single type when all same', () => {
      const result = aggregateTypes(['int', 'int', 'int']);
      expect(result.primaryType).toBe('int');
      expect(result.nullable).toBe(false);
    });

    it('detects nullable fields', () => {
      const result = aggregateTypes(['string', 'null', 'string']);
      expect(result.primaryType).toBe('string');
      expect(result.nullable).toBe(true);
    });

    it('upgrades int to decimal when mixed', () => {
      const result = aggregateTypes(['int', 'decimal', 'int']);
      expect(result.primaryType).toBe('decimal');
    });
  });
});

describe('Range Detector', () => {
  describe('detectNumericRange', () => {
    it('finds min/max for integers', () => {
      const result = detectNumericRange([10, 50, 30, 5, 100]);
      expect(result?.min).toBe(5);
      expect(result?.max).toBe(100);
      expect(result?.allInteger).toBe(true);
    });

    it('finds min/max for decimals', () => {
      const result = detectNumericRange([1.5, 2.5, 0.5, 3.0]);
      expect(result?.min).toBe(0.5);
      expect(result?.max).toBe(3.0);
      expect(result?.allInteger).toBe(false);
    });

    it('returns null for empty array', () => {
      expect(detectNumericRange([])).toBeNull();
    });
  });

  describe('detectDateRange', () => {
    it('finds date range', () => {
      const result = detectDateRange(['2023-01-15', '2024-06-20', '2023-12-01']);
      expect(result?.minYear).toBe(2023);
      expect(result?.maxYear).toBe(2024);
    });

    it('detects datetime format', () => {
      const result = detectDateRange(['2024-03-15T10:30:00.000Z']);
      expect(result?.hasTime).toBe(true);
    });
  });

  describe('detectArrayCardinality', () => {
    it('finds min/max array lengths', () => {
      const result = detectArrayCardinality([[1], [1, 2, 3], [1, 2]]);
      expect(result?.min).toBe(1);
      expect(result?.max).toBe(3);
    });
  });

  describe('detectUniqueness', () => {
    it('detects unique values', () => {
      expect(detectUniqueness([1, 2, 3, 4, 5], 'int')).toBe(true);
    });

    it('detects non-unique values', () => {
      expect(detectUniqueness([1, 2, 2, 3], 'int')).toBe(false);
    });
  });
});

describe('Enum Detector', () => {
  describe('detectSuperposition', () => {
    it('detects enum-like string fields', () => {
      const values = ['draft', 'sent', 'paid', 'draft', 'paid', 'paid'];
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(true);
      expect(result.options.length).toBe(3);
      expect(result.options[0].value).toBe('paid'); // Most common first
    });

    it('calculates weights correctly', () => {
      const values = ['a', 'a', 'a', 'b']; // 75% a, 25% b
      const result = detectSuperposition(values);

      expect(result.options[0].value).toBe('a');
      expect(result.options[0].weight).toBe(0.75);
      expect(result.options[1].value).toBe('b');
      expect(result.options[1].weight).toBe(0.25);
    });

    it('returns false for high cardinality fields', () => {
      const values = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      const result = detectSuperposition(values);

      expect(result.isSuperposition).toBe(false);
    });

    it('detects equal weights', () => {
      const values = ['a', 'b', 'c', 'a', 'b', 'c'];
      const result = detectSuperposition(values);

      expect(result.hasEqualWeights).toBe(true);
    });
  });
});

describe('Format Detector', () => {
  describe('detectFormat', () => {
    it('detects UUID format', () => {
      const values = [
        '550e8400-e29b-41d4-a716-446655440000',
        'a87ff679-a2f3-71e9-0000-000000000001',
      ];
      expect(detectFormat(values)).toBe('uuid');
    });

    it('detects email format', () => {
      const values = ['user@example.com', 'test@domain.org'];
      expect(detectFormat(values)).toBe('email');
    });

    it('detects URL format', () => {
      const values = ['https://example.com', 'http://test.org/path'];
      expect(detectFormat(values)).toBe('url');
    });

    it('detects IPv4 format', () => {
      const values = ['192.168.1.1', '10.0.0.1'];
      expect(detectFormat(values)).toBe('ipv4');
    });

    it('returns none for regular strings', () => {
      const values = ['hello', 'world', 'test'];
      expect(detectFormat(values)).toBe('none');
    });
  });

  describe('detectFieldNamePattern', () => {
    it('detects email field names', () => {
      expect(detectFieldNamePattern('email')).toBe('email()');
      expect(detectFieldNamePattern('email_address')).toBe('email()');
    });

    it('detects name field names', () => {
      expect(detectFieldNamePattern('first_name')).toBe('faker.person.firstName()');
      expect(detectFieldNamePattern('lastName')).toBe('faker.person.lastName()');
    });

    it('detects company field names', () => {
      expect(detectFieldNamePattern('company')).toBe('companyName()');
    });

    it('returns null for unknown patterns', () => {
      expect(detectFieldNamePattern('foobar')).toBeNull();
    });
  });
});

describe('Schema Inference', () => {
  describe('inferSchema', () => {
    it('infers simple schema with basic types', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', active: true },
          { id: 2, name: 'Bob', active: false },
        ],
      };

      const result = inferSchema(data);

      expect(result).toContain('schema User {');
      expect(result).toContain('id:');
      expect(result).toContain('name:');
      expect(result).toContain('active:');
      expect(result).toContain('dataset Generated');
      expect(result).toContain('users: 2 * User');
    });

    it('infers ranges for numeric fields', () => {
      const data = {
        products: [{ price: 10.99 }, { price: 50.0 }, { price: 25.5 }],
      };

      const result = inferSchema(data);

      // Should emit decimal(2) since all values have at most 2 decimal places
      expect(result).toContain('decimal(2) in 10.99..50');
    });

    it('emits decimal(n) with detected precision', () => {
      const data = {
        measurements: [{ value: 1.5 }, { value: 2.3 }, { value: 4.7 }],
      };

      const result = inferSchema(data);

      // Values have 1 decimal place
      expect(result).toContain('decimal(1) in 1.5..4.7');
    });

    it('emits decimal(4) for high precision values', () => {
      const data = {
        rates: [{ rate: 0.0123 }, { rate: 0.9876 }, { rate: 0.5432 }],
      };

      const result = inferSchema(data);

      // Values have 4 decimal places
      expect(result).toContain('decimal(4) in 0.0123..0.9876');
    });

    it('emits plain decimal for high precision (>4 places)', () => {
      const data = {
        precise: [{ value: 0.123456 }, { value: 0.654321 }],
      };

      const result = inferSchema(data);

      // More than 4 decimal places, use plain decimal
      expect(result).toContain('decimal in');
      expect(result).not.toContain('decimal(');
    });

    it('infers superposition for enum-like fields', () => {
      const data = {
        orders: [
          { status: 'pending' },
          { status: 'shipped' },
          { status: 'pending' },
          { status: 'delivered' },
          { status: 'pending' },
        ],
      };

      const result = inferSchema(data);

      // Should contain the superposition values
      expect(result).toContain('"pending"');
      expect(result).toContain('"shipped"');
      expect(result).toContain('"delivered"');
    });

    it('detects email format from values', () => {
      const data = {
        contacts: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
      };

      const result = inferSchema(data);

      expect(result).toContain('email()');
    });

    it('detects UUID format from values', () => {
      const data = {
        items: [
          { id: '550e8400-e29b-41d4-a716-446655440000' },
          { id: 'a87ff679-a2f3-71e9-0000-000000000001' },
        ],
      };

      const result = inferSchema(data);

      expect(result).toContain('uuid()');
    });

    it('handles nullable fields', () => {
      const data = {
        people: [{ nickname: 'Al' }, { nickname: null }, { nickname: 'Bobby' }],
      };

      const result = inferSchema(data);

      expect(result).toContain('nickname:');
      expect(result).toContain('?');
    });

    it('handles nested objects', () => {
      const data = {
        orders: [
          { address: { city: 'NYC', zip: '10001' } },
          { address: { city: 'LA', zip: '90001' } },
        ],
      };

      const result = inferSchema(data);

      expect(result).toContain('schema Address {');
      expect(result).toContain('city:');
      expect(result).toContain('zip:');
    });

    it('handles arrays with cardinality', () => {
      const data = {
        invoices: [
          { items: [{ name: 'A' }, { name: 'B' }] },
          { items: [{ name: 'C' }] },
          { items: [{ name: 'D' }, { name: 'E' }, { name: 'F' }] },
        ],
      };

      const result = inferSchema(data);

      expect(result).toContain('schema Item {');
      expect(result).toContain('1..3 * Item');
    });

    it('detects unique fields', () => {
      const data = {
        products: [{ code: 1001 }, { code: 1002 }, { code: 1003 }],
      };

      const result = inferSchema(data);

      expect(result).toContain('unique');
      expect(result).toContain('int in 1001..1003');
    });

    it('handles date fields', () => {
      const data = {
        events: [{ date: '2023-01-15' }, { date: '2024-06-20' }],
      };

      const result = inferSchema(data);

      expect(result).toContain('date in 2023..2024');
    });

    it('uses custom dataset name', () => {
      const data = { items: [{ x: 1 }] };
      const result = inferSchema(data, { datasetName: 'TestFixtures' });

      expect(result).toContain('dataset TestFixtures');
    });

    it('respects detectFormats option', () => {
      const data = {
        contacts: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
      };

      const result = inferSchema(data, { detectFormats: false });

      expect(result).not.toContain('email()');
      expect(result).toContain('string');
    });

    it('respects weightedSuperpositions option', () => {
      const data = {
        orders: [{ status: 'a' }, { status: 'a' }, { status: 'a' }, { status: 'b' }],
      };

      // With weights
      const withWeights = inferSchema(data, { weightedSuperpositions: true });
      expect(withWeights).toContain('0.75');

      // Without weights
      const withoutWeights = inferSchema(data, { weightedSuperpositions: false });
      expect(withoutWeights).not.toContain('0.75');
    });
  });

  describe('inferSchemaOnly', () => {
    it('generates schema without dataset wrapper', () => {
      const records = [
        { id: 1, name: 'Test' },
        { id: 2, name: 'Test2' },
      ];

      const result = inferSchemaOnly('Product', records);

      expect(result).toContain('schema Product {');
      expect(result).not.toContain('dataset');
    });
  });
});

describe('End-to-end inference and compilation', () => {
  it('generates valid Vague code that can be compiled', async () => {
    // This test verifies the output is syntactically valid Vague code
    const { compile } = await import('../index.js');

    const data = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
        { id: 3, name: 'Carol', role: 'user' },
      ],
    };

    const vagueCode = inferSchema(data);

    // This should not throw - the generated code should be valid
    const result = await compile(vagueCode);

    expect(result.users).toBeDefined();
    expect(result.users.length).toBe(3);
  });
});
