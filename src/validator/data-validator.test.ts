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

  describe('validateDatasetLevelConstraints', () => {
    it('validates sum constraints', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Invoice {
          total: decimal
        }

        dataset TestData {
          invoices: 10 of Invoice,

          validate {
            sum(invoices.total) >= 1000
          }
        }
      `);

      // Data that satisfies the constraint
      const validData = {
        invoices: [{ total: 500 }, { total: 600 }],
      };
      const validResult = validator.validateDatasetLevelConstraints('TestData', validData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Data that violates the constraint
      const invalidData = {
        invoices: [{ total: 100 }, { total: 200 }],
      };
      const invalidResult = validator.validateDatasetLevelConstraints('TestData', invalidData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors[0].message).toContain('sum(invoices.total) >= 1000');
    });

    it('validates count constraints', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Order {
          id: int
        }

        schema Shipment {
          id: int
        }

        dataset Logistics {
          orders: 20 of Order,
          shipments: 10 of Shipment,

          validate {
            count(shipments) <= count(orders)
          }
        }
      `);

      // Valid: fewer shipments than orders
      const validData = {
        orders: [{ id: 1 }, { id: 2 }, { id: 3 }],
        shipments: [{ id: 1 }, { id: 2 }],
      };
      expect(validator.validateDatasetLevelConstraints('Logistics', validData).valid).toBe(true);

      // Invalid: more shipments than orders
      const invalidData = {
        orders: [{ id: 1 }],
        shipments: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      const result = validator.validateDatasetLevelConstraints('Logistics', invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('count(shipments) <= count(orders)');
    });

    it('validates all() predicate', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Product {
          price: decimal,
          stock: int
        }

        dataset Inventory {
          products: 50 of Product,

          validate {
            all(products, .price > 0),
            all(products, .stock >= 0)
          }
        }
      `);

      // Valid: all products have positive price and non-negative stock
      const validData = {
        products: [
          { price: 10, stock: 5 },
          { price: 20, stock: 0 },
          { price: 5, stock: 100 },
        ],
      };
      expect(validator.validateDatasetLevelConstraints('Inventory', validData).valid).toBe(true);

      // Invalid: one product has zero price
      const invalidData = {
        products: [
          { price: 10, stock: 5 },
          { price: 0, stock: 10 }, // Invalid price
          { price: 5, stock: 100 },
        ],
      };
      const result = validator.validateDatasetLevelConstraints('Inventory', invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('validates some() predicate', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Invoice {
          status: string,
          amount: decimal
        }

        dataset Sales {
          invoices: 100 of Invoice,

          validate {
            some(invoices, .status == "paid"),
            some(invoices, .amount > 1000)
          }
        }
      `);

      // Valid: at least one paid invoice and one large invoice
      const validData = {
        invoices: [
          { status: 'draft', amount: 100 },
          { status: 'paid', amount: 2000 },
          { status: 'sent', amount: 500 },
        ],
      };
      expect(validator.validateDatasetLevelConstraints('Sales', validData).valid).toBe(true);

      // Invalid: no paid invoices
      const invalidData = {
        invoices: [
          { status: 'draft', amount: 2000 },
          { status: 'sent', amount: 1500 },
        ],
      };
      const result = validator.validateDatasetLevelConstraints('Sales', invalidData);
      expect(result.valid).toBe(false);
    });

    it('returns valid for dataset without validation block', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Item {
          name: string
        }

        dataset Simple {
          items: 10 of Item
        }
      `);

      const data = {
        items: [{ name: 'foo' }, { name: 'bar' }],
      };

      const result = validator.validateDatasetLevelConstraints('Simple', data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for unknown dataset', () => {
      const validator = new DataValidator();
      validator.loadSchema(`schema Item { name: string }`);

      const result = validator.validateDatasetLevelConstraints('Unknown', { items: [] });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Dataset "Unknown" not found');
    });
  });

  describe('validateFull', () => {
    it('validates both record and dataset-level constraints', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Invoice {
          amount: decimal,
          assume amount > 0
        }

        dataset TestData {
          invoices: 10 of Invoice,

          validate {
            sum(invoices.amount) >= 1000
          }
        }
      `);

      // Valid: records valid and sum >= 1000
      const validData = {
        invoices: [{ amount: 500 }, { amount: 600 }],
      };
      const validResult = validator.validateFull(validData, { invoices: 'Invoice' }, 'TestData');
      expect(validResult.valid).toBe(true);
      expect(validResult.datasetLevelValidation?.valid).toBe(true);

      // Invalid records: negative amount
      const invalidRecordsData = {
        invoices: [{ amount: 500 }, { amount: -100 }],
      };
      const invalidRecordsResult = validator.validateFull(
        invalidRecordsData,
        { invoices: 'Invoice' },
        'TestData'
      );
      expect(invalidRecordsResult.valid).toBe(false);
      expect(invalidRecordsResult.totalFailed).toBe(1);

      // Invalid dataset: sum < 1000
      const invalidDatasetData = {
        invoices: [{ amount: 100 }, { amount: 200 }],
      };
      const invalidDatasetResult = validator.validateFull(
        invalidDatasetData,
        { invoices: 'Invoice' },
        'TestData'
      );
      expect(invalidDatasetResult.valid).toBe(false);
      expect(invalidDatasetResult.datasetLevelValidation?.valid).toBe(false);
    });

    it('works without dataset name (no dataset-level validation)', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Invoice {
          amount: decimal,
          assume amount > 0
        }
      `);

      const data = {
        invoices: [{ amount: 100 }, { amount: 200 }],
      };

      const result = validator.validateFull(data, { invoices: 'Invoice' });
      expect(result.valid).toBe(true);
      expect(result.datasetLevelValidation).toBeUndefined();
    });
  });

  describe('getDatasetNames', () => {
    it('returns loaded dataset names', () => {
      const validator = new DataValidator();
      validator.loadSchema(`
        schema Item { name: string }

        dataset TestA {
          items: 10 of Item
        }

        dataset TestB {
          items: 20 of Item
        }
      `);

      const datasets = validator.getDatasetNames();
      expect(datasets).toContain('TestA');
      expect(datasets).toContain('TestB');
      expect(datasets).toHaveLength(2);
    });
  });
});
