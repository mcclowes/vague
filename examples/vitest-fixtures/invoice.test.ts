/**
 * Example: Using Vague as a seeded fixture generator for Vitest
 *
 * Benefits of this approach:
 * 1. Fixtures are deterministic (same seed = same data)
 * 2. Fixtures evolve with your schema definition
 * 3. No static JSON files to maintain
 * 4. Complex relationships are generated automatically
 * 5. TypeScript types keep fixtures aligned with code
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { vague } from '../../src/index.js';
import {
  Invoice,
  LineItem,
  calculateInvoiceTotals,
  canMarkAsPaid,
  getOverdueInvoices,
} from './invoice.js';

// Define the fixture shape - this couples your tests to your types
interface TestFixtures {
  invoices: Invoice[];
  lineItems: LineItem[];
}

// Seed ensures reproducibility - change it to get different test data
const FIXTURE_SEED = 42;

// Generate fixtures once before all tests
let fixtures: TestFixtures;

beforeAll(async () => {
  // The vague schema acts as executable documentation of your test data
  // When requirements change, update the schema and fixtures regenerate
  fixtures = await vague<TestFixtures>({ seed: FIXTURE_SEED })`
    schema LineItem {
      description: string,
      quantity: int in 1..10,
      unitPrice: decimal in 10.00..200.00,
      amount: = round(quantity * unitPrice, 2)
    }

    schema Invoice {
      id: unique int in 1000..9999,
      status: "draft" | "sent" | "paid",
      customerId: int in 1..100,
      lineItems: 1..5 * LineItem,
      subtotal: = round(sum(lineItems.amount), 2),
      taxRate: 0.2,
      tax: = round(subtotal * taxRate, 2),
      total: = round(subtotal + tax, 2)
    }

    dataset TestFixtures {
      invoices: 20 * Invoice,
      lineItems: 10 * LineItem
    }
  `;
});

describe('calculateInvoiceTotals', () => {
  it('calculates correct totals from line items', () => {
    // Use generated line items - deterministic due to seed
    const items = fixtures.lineItems.slice(0, 3);
    const taxRate = 0.2;

    const result = calculateInvoiceTotals(items, taxRate);

    // Calculate expected values
    const expectedSubtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const expectedTax = Math.round(expectedSubtotal * taxRate * 100) / 100;

    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.tax).toBe(expectedTax);
    expect(result.total).toBe(Math.round((expectedSubtotal + expectedTax) * 100) / 100);
  });

  it('handles empty line items', () => {
    const result = calculateInvoiceTotals([], 0.2);
    expect(result).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });
});

describe('canMarkAsPaid', () => {
  it('returns true for sent invoices with positive total', () => {
    const sentInvoices = fixtures.invoices.filter((i) => i.status === 'sent' && i.total > 0);

    // With seed 42, we should have some sent invoices
    if (sentInvoices.length > 0) {
      expect(canMarkAsPaid(sentInvoices[0])).toBe(true);
    }
  });

  it('returns false for draft invoices', () => {
    const draftInvoices = fixtures.invoices.filter((i) => i.status === 'draft');

    if (draftInvoices.length > 0) {
      expect(canMarkAsPaid(draftInvoices[0])).toBe(false);
    }
  });

  it('returns false for already paid invoices', () => {
    const paidInvoices = fixtures.invoices.filter((i) => i.status === 'paid');

    if (paidInvoices.length > 0) {
      expect(canMarkAsPaid(paidInvoices[0])).toBe(false);
    }
  });
});

describe('getOverdueInvoices', () => {
  it('returns sent invoices not in paid set', () => {
    const sentInvoices = fixtures.invoices.filter((i) => i.status === 'sent');
    const paidIds = new Set(sentInvoices.slice(0, 2).map((i) => i.id));

    const overdue = getOverdueInvoices(fixtures.invoices, paidIds);

    // Should not include any IDs from paidIds
    for (const inv of overdue) {
      expect(paidIds.has(inv.id)).toBe(false);
      expect(inv.status).toBe('sent');
    }
  });

  it('returns empty array when all sent invoices are paid', () => {
    const sentIds = new Set(fixtures.invoices.filter((i) => i.status === 'sent').map((i) => i.id));

    const overdue = getOverdueInvoices(fixtures.invoices, sentIds);
    expect(overdue).toHaveLength(0);
  });
});

describe('fixture properties (demonstrating determinism)', () => {
  it('generates consistent data across test runs', async () => {
    // Running with the same seed produces identical fixtures
    const fixtures2 = await vague<TestFixtures>({ seed: FIXTURE_SEED })`
      schema LineItem {
        description: string,
        quantity: int in 1..10,
        unitPrice: decimal in 10.00..200.00,
        amount: = round(quantity * unitPrice, 2)
      }

      schema Invoice {
        id: unique int in 1000..9999,
        status: "draft" | "sent" | "paid",
        customerId: int in 1..100,
        lineItems: 1..5 * LineItem,
        subtotal: = round(sum(lineItems.amount), 2),
        taxRate: 0.2,
        tax: = round(subtotal * taxRate, 2),
        total: = round(subtotal + tax, 2)
      }

      dataset TestFixtures {
        invoices: 20 * Invoice,
        lineItems: 10 * LineItem
      }
    `;

    expect(fixtures2).toEqual(fixtures);
  });

  it('has valid invoice totals (schema constraints enforced)', () => {
    for (const invoice of fixtures.invoices) {
      // Computed fields ensure consistency
      const expectedSubtotal = invoice.lineItems.reduce((sum, li) => sum + li.amount, 0);
      expect(invoice.subtotal).toBeCloseTo(expectedSubtotal, 1);
      expect(invoice.tax).toBeCloseTo(invoice.subtotal * 0.2, 1);
      expect(invoice.total).toBeCloseTo(invoice.subtotal + invoice.tax, 1);
    }
  });

  it('has unique invoice IDs', () => {
    const ids = fixtures.invoices.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
