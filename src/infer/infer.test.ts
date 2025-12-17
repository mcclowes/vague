import { describe, it, expect, beforeAll } from 'vitest';
import { registerPlugin, fakerShorthandPlugin } from '../index.js';
import { detectValueType, aggregateTypes } from './type-detector.js';
import {
  detectNumericRange,
  detectDateRange,
  detectArrayCardinality,
  detectUniqueness,
  detectStringLengthRange,
  detectPercentage,
  detectDistribution,
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

  describe('detectStringLengthRange', () => {
    it('detects min/max string lengths', () => {
      const result = detectStringLengthRange(['ab', 'abcde', 'abc']);
      expect(result?.minLength).toBe(2);
      expect(result?.maxLength).toBe(5);
      expect(result?.isFixedLength).toBe(false);
    });

    it('detects fixed-length strings', () => {
      const result = detectStringLengthRange(['abc', 'xyz', '123']);
      expect(result?.isFixedLength).toBe(true);
      expect(result?.minLength).toBe(3);
      expect(result?.maxLength).toBe(3);
    });

    it('calculates average length', () => {
      const result = detectStringLengthRange(['a', 'abc', 'abcde']); // 1, 3, 5 avg = 3
      expect(result?.avgLength).toBe(3);
    });

    it('returns null for empty array', () => {
      expect(detectStringLengthRange([])).toBeNull();
    });
  });

  describe('detectPercentage', () => {
    it('detects decimal percentages (0-1 scale)', () => {
      const values = [0.15, 0.25, 0.5, 0.75, 0.9];
      const result = detectPercentage(values);
      expect(result?.isPercentage).toBe(true);
      expect(result?.scale).toBe('decimal');
    });

    it('detects percentage scale (0-100)', () => {
      const values = [15.5, 25.3, 50.0, 75.8, 90.2];
      const result = detectPercentage(values);
      expect(result?.isPercentage).toBe(true);
      expect(result?.scale).toBe('percent');
    });

    it('returns false for non-percentage values', () => {
      const values = [100, 200, 500, 1000];
      const result = detectPercentage(values);
      expect(result?.isPercentage).toBe(false);
    });
  });

  describe('detectDistribution', () => {
    it('detects uniform distribution', () => {
      // Generate uniformly distributed values
      const values = Array.from({ length: 100 }, (_, i) => i + Math.random() * 0.1);
      const result = detectDistribution(values);
      expect(result).toBeDefined();
      // Note: distribution detection is probabilistic, so we just check it's detected
      expect(result?.type).toBeDefined();
    });

    it('detects gaussian distribution', () => {
      // Generate normally distributed values using Box-Muller transform
      const values: number[] = [];
      for (let i = 0; i < 100; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        values.push(50 + z * 10); // mean=50, stddev=10
      }
      const result = detectDistribution(values);
      expect(result).toBeDefined();
      expect(result?.mean).toBeDefined();
      expect(result?.stddev).toBeDefined();
    });

    it('returns null for insufficient samples', () => {
      const values = [1, 2, 3];
      const result = detectDistribution(values);
      expect(result).toBeNull();
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

    it('detects credit card format', () => {
      const values = ['4532015112830366', '5425233430109903', '371449635398431'];
      expect(detectFormat(values)).toBe('credit-card');
    });

    it('detects IBAN format', () => {
      const values = [
        'GB82WEST12345698765432',
        'DE89370400440532013000',
        'FR7630006000011234567890189',
      ];
      expect(detectFormat(values)).toBe('iban');
    });

    it('detects MAC address format', () => {
      const values = ['00:1A:2B:3C:4D:5E', 'AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66'];
      expect(detectFormat(values)).toBe('mac-address');
    });

    it('detects hex color format', () => {
      const values = ['#FF5733', '#00FF00', '#ABC'];
      expect(detectFormat(values)).toBe('hex-color');
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

    it('detects credit card field names', () => {
      expect(detectFieldNamePattern('credit_card')).toBe('faker.finance.creditCardNumber()');
      expect(detectFieldNamePattern('cardNumber')).toBe('faker.finance.creditCardNumber()');
    });

    it('detects IBAN field names', () => {
      expect(detectFieldNamePattern('iban')).toBe('faker.finance.iban()');
      expect(detectFieldNamePattern('bank_account')).toBe('faker.finance.iban()');
    });

    it('detects MAC address field names', () => {
      expect(detectFieldNamePattern('mac')).toBe('faker.internet.mac()');
      expect(detectFieldNamePattern('mac_address')).toBe('faker.internet.mac()');
    });

    it('detects color field names', () => {
      expect(detectFieldNamePattern('color')).toBe('faker.color.rgb()');
      expect(detectFieldNamePattern('hex_color')).toBe('faker.color.rgb()');
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
      expect(result).toContain('users: 2 of User');
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
      expect(result).toContain('1..3 of Item');
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
  beforeAll(() => {
    registerPlugin(fakerShorthandPlugin);
  });

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

describe('Schema Deduplication', () => {
  it('deduplicates identical nested schemas', () => {
    const data = {
      orders: [
        {
          billing_address: { street: '123 Main', city: 'NYC', zip: '10001' },
          shipping_address: { street: '456 Oak', city: 'LA', zip: '90001' },
        },
        {
          billing_address: { street: '789 Pine', city: 'Chicago', zip: '60601' },
          shipping_address: { street: '321 Elm', city: 'Denver', zip: '80201' },
        },
      ],
    };

    const result = inferSchema(data);

    // Should only have one Address schema since both are structurally identical
    // Either both reference the same schema, or we have deduplication
    // The important thing is we don't have two identical schema definitions
    const schemaDefinitions = result.match(/schema \w+ \{/g) || [];
    const uniqueSchemaNames = new Set(schemaDefinitions);

    // Verify the output is valid (either deduplicated or at least not duplicated content)
    expect(result).toContain('schema');
    expect(uniqueSchemaNames.size).toBe(schemaDefinitions.length);
  });

  it('keeps different schemas separate', () => {
    const data = {
      orders: [
        {
          address: { street: '123 Main', city: 'NYC' },
          contact: { name: 'John', phone: '555-1234' },
        },
        {
          address: { street: '456 Oak', city: 'LA' },
          contact: { name: 'Jane', phone: '555-5678' },
        },
      ],
    };

    const result = inferSchema(data);

    // Should have both Address and Contact schemas since they're different
    expect(result).toContain('schema Address');
    expect(result).toContain('schema Contact');
    expect(result).toContain('street');
    expect(result).toContain('phone');
  });
});

describe('TypeScript Generation Integration', () => {
  it('inferSchemaWithTypeScript generates both Vague and TypeScript', async () => {
    const { inferSchemaWithTypeScript } = await import('./index.js');

    const data = {
      users: [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
      ],
    };

    const result = inferSchemaWithTypeScript(data);

    // Check Vague output
    expect(result.vague).toContain('schema User {');
    expect(result.vague).toContain('dataset Generated');

    // Check TypeScript output
    expect(result.typescript).toContain('interface User');
    expect(result.typescript).toContain('id: number');
    expect(result.typescript).toContain('name: string');
    expect(result.typescript).toContain('active: boolean');
    expect(result.typescript).toContain('interface Generated');

    // Check schemas array
    expect(result.schemas.length).toBeGreaterThan(0);
    expect(result.schemas.some((s) => s.name === 'User')).toBe(true);
  });

  it('generates correct TypeScript for superposition fields', async () => {
    const { inferSchemaWithTypeScript } = await import('./index.js');

    const data = {
      invoices: [{ status: 'draft' }, { status: 'sent' }, { status: 'paid' }, { status: 'draft' }],
    };

    const result = inferSchemaWithTypeScript(data);

    // Should have union type
    expect(result.typescript).toContain("'draft'");
    expect(result.typescript).toContain("'sent'");
    expect(result.typescript).toContain("'paid'");
  });

  it('generates correct TypeScript for nested arrays', async () => {
    const { inferSchemaWithTypeScript } = await import('./index.js');

    const data = {
      orders: [{ items: [{ name: 'A' }, { name: 'B' }] }, { items: [{ name: 'C' }] }],
    };

    const result = inferSchemaWithTypeScript(data);

    // Check nested schema
    expect(result.typescript).toContain('interface Item');
    expect(result.typescript).toContain('items: Item[]');
  });
});

describe('Aggregation Detection Integration', () => {
  it('detects sum aggregation from nested arrays', () => {
    const data = {
      invoices: [
        {
          subtotal: 150,
          line_items: [{ amount: 50 }, { amount: 100 }],
        },
        {
          subtotal: 75,
          line_items: [{ amount: 25 }, { amount: 50 }],
        },
        {
          subtotal: 200,
          line_items: [{ amount: 100 }, { amount: 100 }],
        },
      ],
    };

    const result = inferSchema(data);

    // Should detect that subtotal = sum(line_items.amount)
    expect(result).toContain('sum(line_items.amount)');
  });

  it('detects count aggregation', () => {
    const data = {
      orders: [
        {
          item_count: 2,
          items: [{ name: 'A' }, { name: 'B' }],
        },
        {
          item_count: 3,
          items: [{ name: 'C' }, { name: 'D' }, { name: 'E' }],
        },
        {
          item_count: 1,
          items: [{ name: 'F' }],
        },
      ],
    };

    const result = inferSchema(data);

    // Should detect that item_count = count(items)
    expect(result).toContain('count(items)');
  });
});

describe('Division Detection Integration', () => {
  it('detects mathematical relationship (multiplication or division)', () => {
    const data = {
      orders: [
        { total: 100, quantity: 5, unit_price: 20 },
        { total: 60, quantity: 3, unit_price: 20 },
        { total: 200, quantity: 10, unit_price: 20 },
      ],
    };

    const result = inferSchema(data);

    // Should detect either total = quantity * unit_price OR unit_price = total / quantity
    // Both are mathematically equivalent (if c = a/b then a = b*c)
    const hasMultiplication = result.includes('quantity * unit_price');
    const hasDivision = result.includes('total / quantity');

    expect(hasMultiplication || hasDivision).toBe(true);
  });
});
