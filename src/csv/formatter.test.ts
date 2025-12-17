import { describe, it, expect } from 'vitest';
import { toCSV, datasetToCSV, datasetToSingleCSV } from './formatter.js';

describe('CSV Formatter', () => {
  describe('toCSV', () => {
    it('converts simple objects to CSV', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      const csv = toCSV(data);
      expect(csv).toBe('age,name\n30,Alice\n25,Bob');
    });

    it('handles empty array', () => {
      const csv = toCSV([]);
      expect(csv).toBe('');
    });

    it('escapes fields with commas', () => {
      const data = [{ name: 'Smith, John', age: 30 }];
      const csv = toCSV(data);
      expect(csv).toBe('age,name\n30,"Smith, John"');
    });

    it('escapes fields with quotes', () => {
      const data = [{ name: 'He said "hello"', age: 30 }];
      const csv = toCSV(data);
      expect(csv).toBe('age,name\n30,"He said ""hello"""');
    });

    it('escapes fields with newlines', () => {
      const data = [{ name: 'Line1\nLine2', age: 30 }];
      const csv = toCSV(data);
      expect(csv).toBe('age,name\n30,"Line1\nLine2"');
    });

    it('handles null and undefined values', () => {
      const data = [
        { name: 'Alice', age: null },
        { name: null, age: 25 },
      ];
      const csv = toCSV(data);
      expect(csv).toBe('age,name\n,Alice\n25,');
    });

    it('handles boolean values', () => {
      const data = [
        { active: true, name: 'Alice' },
        { active: false, name: 'Bob' },
      ];
      const csv = toCSV(data);
      expect(csv).toBe('active,name\ntrue,Alice\nfalse,Bob');
    });

    it('uses custom delimiter', () => {
      const data = [{ name: 'Alice', age: 30 }];
      const csv = toCSV(data, { delimiter: ';' });
      expect(csv).toBe('age;name\n30;Alice');
    });

    it('omits header when header: false', () => {
      const data = [{ name: 'Alice', age: 30 }];
      const csv = toCSV(data, { header: false });
      expect(csv).toBe('30,Alice');
    });

    it('uses custom null value', () => {
      const data = [{ name: null, age: 30 }];
      const csv = toCSV(data, { nullValue: 'N/A' });
      expect(csv).toBe('age,name\n30,N/A');
    });
  });

  describe('nested object handling', () => {
    it('flattens nested objects by default', () => {
      const data = [
        {
          name: 'Alice',
          address: { city: 'NYC', zip: 10001 },
        },
      ];
      const csv = toCSV(data);
      expect(csv).toBe('address.city,address.zip,name\nNYC,10001,Alice');
    });

    it('serializes nested objects as JSON when nestedHandling: json', () => {
      const data = [
        {
          name: 'Alice',
          address: { city: 'NYC', zip: 10001 },
        },
      ];
      const csv = toCSV(data, { nestedHandling: 'json' });
      expect(csv).toContain('address,name');
      // JSON objects are escaped in CSV (quotes become double quotes)
      expect(csv).toContain('"{""city"":""NYC"",""zip"":10001}"');
    });

    it('handles deeply nested objects', () => {
      const data = [
        {
          user: {
            profile: {
              name: 'Alice',
            },
          },
        },
      ];
      const csv = toCSV(data);
      expect(csv).toBe('user.profile.name\nAlice');
    });
  });

  describe('array handling', () => {
    it('serializes arrays as JSON by default', () => {
      const data = [{ tags: ['a', 'b', 'c'] }];
      const csv = toCSV(data);
      expect(csv).toBe('tags\n"[""a"",""b"",""c""]"');
    });

    it('takes first element when arrayHandling: first', () => {
      const data = [{ tags: ['a', 'b', 'c'] }, { tags: [] }];
      const csv = toCSV(data, { arrayHandling: 'first' });
      expect(csv).toBe('tags\na\n');
    });

    it('returns count when arrayHandling: count', () => {
      const data = [{ tags: ['a', 'b', 'c'] }, { tags: ['x'] }];
      const csv = toCSV(data, { arrayHandling: 'count' });
      expect(csv).toBe('tags\n3\n1');
    });
  });

  describe('datasetToCSV', () => {
    it('converts dataset with multiple collections', () => {
      const dataset = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
        orders: [
          { id: 1, total: 100 },
          { id: 2, total: 200 },
        ],
      };

      const result = datasetToCSV(dataset);

      expect(result.size).toBe(2);
      expect(result.get('users')).toBe('age,name\n30,Alice\n25,Bob');
      expect(result.get('orders')).toBe('id,total\n1,100\n2,200');
    });

    it('handles empty collections', () => {
      const dataset = {
        users: [],
        orders: [{ id: 1 }],
      };

      const result = datasetToCSV(dataset);

      expect(result.get('users')).toBe('');
      expect(result.get('orders')).toBe('id\n1');
    });
  });

  describe('datasetToSingleCSV', () => {
    it('combines collections with section markers', () => {
      const dataset = {
        users: [{ name: 'Alice' }],
        orders: [{ id: 1 }],
      };

      const csv = datasetToSingleCSV(dataset);

      expect(csv).toContain('# users');
      expect(csv).toContain('# orders');
      expect(csv).toContain('name\nAlice');
      expect(csv).toContain('id\n1');
    });

    it('skips empty collections', () => {
      const dataset = {
        users: [{ name: 'Alice' }],
        empty: [],
      };

      const csv = datasetToSingleCSV(dataset);

      expect(csv).toContain('# users');
      expect(csv).not.toContain('# empty');
    });
  });

  describe('edge cases', () => {
    it('handles objects with varying keys', () => {
      const data = [{ a: 1, b: 2 }, { b: 3, c: 4 }, { a: 5 }];
      const csv = toCSV(data);
      // All unique keys should be present
      expect(csv).toContain('a,b,c');
      // Missing values should be empty
      expect(csv).toBe('a,b,c\n1,2,\n,3,4\n5,,');
    });

    it('handles numeric string values', () => {
      const data = [{ value: '123' }];
      const csv = toCSV(data);
      expect(csv).toBe('value\n123');
    });

    it('handles special characters in field names', () => {
      const data = [{ 'field.name': 'value', 'field,name': 'value2' }];
      const csv = toCSV(data);
      expect(csv).toContain('"field,name"');
    });
  });
});
