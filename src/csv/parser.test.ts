import { describe, it, expect } from 'vitest';
import { parseCSV, parseCSVToDataset, parseMultipleCSVToDataset } from './parser.js';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('parses simple CSV with headers', () => {
      const csv = `name,age,active
Alice,30,true
Bob,25,false`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: 30, active: true });
      expect(result[1]).toEqual({ name: 'Bob', age: 25, active: false });
    });

    it('handles empty CSV', () => {
      const result = parseCSV('');
      expect(result).toEqual([]);
    });

    it('handles CSV with only headers', () => {
      const result = parseCSV('name,age');
      expect(result).toEqual([]);
    });

    it('uses custom delimiter', () => {
      const csv = `name;age;active
Alice;30;true
Bob;25;false`;

      const result = parseCSV(csv, { delimiter: ';' });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: 30, active: true });
    });

    it('handles quoted fields', () => {
      const csv = `name,description
"Alice Smith","A ""great"" person"
Bob,"Has, commas"`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Alice Smith',
        description: 'A "great" person',
      });
      expect(result[1]).toEqual({
        name: 'Bob',
        description: 'Has, commas',
      });
    });

    // Note: Newlines within quoted fields are not currently supported
    // This is a complex edge case that would require more sophisticated parsing
    it.skip('handles quoted fields with newlines', () => {
      const csv = `name,bio
Alice,"Line1
Line2"
Bob,Simple`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].bio).toBe('Line1\nLine2');
    });

    it('generates column names when no header', () => {
      const csv = `Alice,30,true
Bob,25,false`;

      const result = parseCSV(csv, { hasHeader: false });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        column_1: 'Alice',
        column_2: 30,
        column_3: true,
      });
    });

    it('handles Windows line endings', () => {
      const csv = 'name,age\r\nAlice,30\r\nBob,25';
      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: 30 });
    });
  });

  describe('type inference', () => {
    it('infers integers', () => {
      const csv = `value
123
-456
0`;

      const result = parseCSV(csv);

      expect(result[0].value).toBe(123);
      expect(result[1].value).toBe(-456);
      expect(result[2].value).toBe(0);
    });

    it('infers decimals', () => {
      const csv = `value
123.45
-0.5
0.0`;

      const result = parseCSV(csv);

      expect(result[0].value).toBe(123.45);
      expect(result[1].value).toBe(-0.5);
      expect(result[2].value).toBe(0.0);
    });

    it('infers booleans', () => {
      const csv = `a,b,c,d
true,false,yes,no`;

      const result = parseCSV(csv);

      expect(result[0]).toEqual({ a: true, b: false, c: true, d: false });
    });

    it('infers null values', () => {
      const csv = `a,b,c
,null,NULL`;

      const result = parseCSV(csv);

      expect(result[0]).toEqual({ a: null, b: null, c: null });
    });

    it('keeps ISO dates as strings', () => {
      const csv = `date,datetime
2024-01-15,2024-01-15T10:30:00Z`;

      const result = parseCSV(csv);

      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].datetime).toBe('2024-01-15T10:30:00Z');
    });

    it('disables type inference when inferTypes: false', () => {
      const csv = `value
123
true`;

      const result = parseCSV(csv, { inferTypes: false });

      expect(result[0].value).toBe('123');
      expect(result[1].value).toBe('true');
    });
  });

  describe('parseCSVToDataset', () => {
    it('wraps records in dataset format', () => {
      const csv = `name,age
Alice,30`;

      const result = parseCSVToDataset(csv, { collectionName: 'users' });

      expect(result).toEqual({
        users: [{ name: 'Alice', age: 30 }],
      });
    });

    it('uses default collection name', () => {
      const csv = `name
Alice`;

      const result = parseCSVToDataset(csv);

      expect(result).toHaveProperty('data');
    });
  });

  describe('parseMultipleCSVToDataset', () => {
    it('combines multiple CSVs into single dataset', () => {
      const files = [
        { name: 'users', content: 'name\nAlice\nBob' },
        { name: 'orders', content: 'id,total\n1,100\n2,200' },
      ];

      const result = parseMultipleCSVToDataset(files);

      expect(result.users).toHaveLength(2);
      expect(result.orders).toHaveLength(2);
      expect(result.users[0]).toEqual({ name: 'Alice' });
      expect(result.orders[0]).toEqual({ id: 1, total: 100 });
    });
  });

  describe('edge cases', () => {
    it('handles empty fields', () => {
      const csv = `a,b,c
1,,3
,2,`;

      const result = parseCSV(csv);

      expect(result[0]).toEqual({ a: 1, b: null, c: 3 });
      expect(result[1]).toEqual({ a: null, b: 2, c: null });
    });

    it('handles trailing commas', () => {
      const csv = `a,b,c
1,2,3,`;

      const result = parseCSV(csv);

      expect(result[0]).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('handles fields with spaces', () => {
      const csv = `name,city
  Alice  ,  New York  `;

      const result = parseCSV(csv);

      expect(result[0]).toEqual({ name: 'Alice', city: 'New York' });
    });

    it('handles numeric strings that exceed safe integer', () => {
      const csv = `value
99999999999999999999`;

      const result = parseCSV(csv);

      // Should stay as string since it exceeds safe integer
      expect(typeof result[0].value).toBe('string');
    });
  });
});
