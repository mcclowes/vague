import { describe, it, expect } from 'vitest';
import { DataValidator } from './data-validator.js';

describe('DataValidator', () => {
  describe('loadSchema', () => {
    it('loads schemas from Vague source', () => {
      const validator = new DataValidator();
      const schemas = validator.loadSchema(`
        schema Invoice {
          id: int,
          amount: decimal
        }

        schema Customer {
          name: string
        }
      `);

      expect(schemas).toContain('Invoice');
      expect(schemas).toContain('Customer');
    });
  });

  describe('validateRecord', () => {
    it('validates a record against simple constraints', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Invoice {
          amount: decimal,
          assume amount > 0
        }
      `);

      const validRecord = { amount: 100 };
      const invalidRecord = { amount: -50 };

      expect(validator.validateRecord('Invoice', validRecord, 0)).toHaveLength(0);
      expect(validator.validateRecord('Invoice', invalidRecord, 0)).toHaveLength(1);
    });

    it('validates conditional constraints', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Invoice {
          status: string,
          amount: decimal,

          assume if status == "paid" {
            amount >= 100
          }
        }
      `);

      // Paid invoice with high amount - valid
      expect(validator.validateRecord('Invoice', { status: 'paid', amount: 150 }, 0)).toHaveLength(
        0
      );

      // Paid invoice with low amount - invalid
      const errors = validator.validateRecord('Invoice', { status: 'paid', amount: 50 }, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('amount >= 100');

      // Draft invoice with low amount - valid (condition not met)
      expect(validator.validateRecord('Invoice', { status: 'draft', amount: 50 }, 0)).toHaveLength(
        0
      );
    });

    it('validates comparison operators', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Order {
          start_date: int,
          end_date: int,

          assume end_date >= start_date
        }
      `);

      // Valid: end after start
      expect(validator.validateRecord('Order', { start_date: 1, end_date: 10 }, 0)).toHaveLength(0);

      // Valid: same date
      expect(validator.validateRecord('Order', { start_date: 5, end_date: 5 }, 0)).toHaveLength(0);

      // Invalid: end before start
      const errors = validator.validateRecord('Order', { start_date: 10, end_date: 5 }, 0);
      expect(errors).toHaveLength(1);
    });

    it('returns error for unknown schema', () => {
      const validator = new DataValidator();
      validator.loadSchema(`schema Invoice { id: int }`);

      const errors = validator.validateRecord('Unknown', { id: 1 }, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Schema "Unknown" not found');
    });
  });

  describe('validateCollection', () => {
    it('validates multiple records', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Item {
          price: decimal,
          assume price > 0
        }
      `);

      const records = [
        { price: 100 },
        { price: -10 }, // invalid
        { price: 50 },
        { price: 0 }, // invalid (not > 0)
      ];

      const result = validator.validateCollection('Item', records);
      expect(result.valid).toBe(false);
      expect(result.recordsValidated).toBe(4);
      expect(result.recordsFailed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it('returns valid for all passing records', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Item {
          price: decimal,
          assume price >= 0
        }
      `);

      const records = [{ price: 100 }, { price: 0 }, { price: 50 }];

      const result = validator.validateCollection('Item', records);
      expect(result.valid).toBe(true);
      expect(result.recordsValidated).toBe(3);
      expect(result.recordsFailed).toBe(0);
    });
  });

  describe('validateDataset', () => {
    it('validates multiple collections', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Invoice {
          amount: decimal,
          assume amount > 0
        }

        schema Customer {
          name: string
        }
      `);

      const data = {
        invoices: [{ amount: 100 }, { amount: -50 }],
        customers: [{ name: 'Acme' }, { name: 'Beta' }],
      };

      const result = validator.validateDataset(data, {
        invoices: 'Invoice',
        customers: 'Customer',
      });

      expect(result.valid).toBe(false);
      expect(result.totalRecords).toBe(4);
      expect(result.totalFailed).toBe(1);

      const invoiceResult = result.collections.get('invoices');
      expect(invoiceResult?.valid).toBe(false);
      expect(invoiceResult?.recordsFailed).toBe(1);

      const customerResult = result.collections.get('customers');
      expect(customerResult?.valid).toBe(true);
    });

    it('handles missing collections', () => {
      const validator = new DataValidator();
      validator.loadSchema(`schema Invoice { amount: decimal }`);

      const data = { orders: [{ total: 100 }] };

      const result = validator.validateDataset(data, { invoices: 'Invoice' });

      expect(result.valid).toBe(false);
      const invoiceResult = result.collections.get('invoices');
      expect(invoiceResult?.errors[0].message).toContain('not found in data');
    });
  });

  describe('logical operators', () => {
    it('validates and constraints', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Order {
          quantity: int,
          price: decimal,

          assume quantity > 0 and price > 0
        }
      `);

      // Both valid
      expect(validator.validateRecord('Order', { quantity: 5, price: 100 }, 0)).toHaveLength(0);

      // First invalid
      expect(validator.validateRecord('Order', { quantity: 0, price: 100 }, 0)).toHaveLength(1);

      // Second invalid
      expect(validator.validateRecord('Order', { quantity: 5, price: 0 }, 0)).toHaveLength(1);

      // Both invalid
      expect(validator.validateRecord('Order', { quantity: 0, price: 0 }, 0)).toHaveLength(1);
    });

    it('validates or constraints', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Payment {
          method: string,

          assume method == "cash" or method == "card"
        }
      `);

      expect(validator.validateRecord('Payment', { method: 'cash' }, 0)).toHaveLength(0);
      expect(validator.validateRecord('Payment', { method: 'card' }, 0)).toHaveLength(0);
      expect(validator.validateRecord('Payment', { method: 'crypto' }, 0)).toHaveLength(1);
    });
  });
});
