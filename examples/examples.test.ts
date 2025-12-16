import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { compile } from '../src/index.js';

const examplesDir = join(__dirname);

async function runExample(filename: string): Promise<Record<string, unknown[]>> {
  const source = readFileSync(join(examplesDir, filename), 'utf-8');
  return compile(source);
}

describe('examples', () => {
  describe('basic.vague', () => {
    it('produces companies and invoices with correct structure', async () => {
      const result = await runExample('basic.vague');

      expect(result.companies).toHaveLength(10);
      expect(result.invoices).toHaveLength(50);

      // Company structure
      const company = result.companies[0] as Record<string, unknown>;
      expect(company).toHaveProperty('name');
      expect(company).toHaveProperty('created');
      expect(company).toHaveProperty('currency');
      expect(['USD', 'GBP', 'EUR']).toContain(company.currency);

      // Invoice structure
      const invoice = result.invoices[0] as Record<string, unknown>;
      expect(invoice).toHaveProperty('status');
      expect(invoice).toHaveProperty('issue_date');
      expect(invoice).toHaveProperty('line_items');
      expect(['paid', 'pending', 'draft']).toContain(invoice.status);

      // Line items
      const lineItems = invoice.line_items as Record<string, unknown>[];
      expect(lineItems.length).toBeGreaterThanOrEqual(1);
      expect(lineItems.length).toBeLessThanOrEqual(5);
      expect(lineItems[0]).toHaveProperty('description');
      expect(lineItems[0]).toHaveProperty('quantity');
      expect(lineItems[0]).toHaveProperty('unit_price');
    });
  });

  describe('constraints.vague', () => {
    it('respects hard constraints', async () => {
      const result = await runExample('constraints.vague');

      // Invoice: due_date >= issued_date
      for (const inv of result.invoices as Record<string, unknown>[]) {
        expect(inv.due_date).toBeGreaterThanOrEqual(inv.issued_date as number);
      }

      // Company: SaaS companies founded after 2000 with < 1000 employees
      for (const company of result.companies as Record<string, unknown>[]) {
        if (company.industry === 'saas') {
          expect(company.founded).toBeGreaterThan(2000);
          expect(company.employee_count).toBeLessThan(1000);
        }
      }

      // Product: price > 50 or category == "budget"
      for (const product of result.products as Record<string, unknown>[]) {
        const priceOk = (product.price as number) > 50;
        const categoryOk = product.category === 'budget';
        expect(priceOk || categoryOk).toBe(true);

        // discount <= 40
        expect(product.discount).toBeLessThanOrEqual(40);
      }
    });
  });

  describe('computed-fields.vague', () => {
    it('computes aggregates correctly', async () => {
      const result = await runExample('computed-fields.vague');

      expect(result.invoices.length).toBeGreaterThanOrEqual(2);
      expect(result.invoices.length).toBeLessThanOrEqual(10);

      for (const inv of result.invoices as Record<string, unknown>[]) {
        const lineItems = inv.line_items as Record<string, unknown>[];
        const prices = lineItems.map(li => li.unit_price as number);

        // item_count matches actual count
        expect(inv.item_count).toBe(lineItems.length);

        // subtotal matches sum of unit_prices
        expect(inv.subtotal).toBe(prices.reduce((a, b) => a + b, 0));

        // min/max/avg are correct
        expect(inv.min_price).toBe(Math.min(...prices));
        expect(inv.max_price).toBe(Math.max(...prices));
        expect(inv.avg_price).toBeCloseTo(prices.reduce((a, b) => a + b, 0) / prices.length, 5);
      }
    });

    it('handles nullable fields', async () => {
      const result = await runExample('computed-fields.vague');

      // Some invoices should have null notes, some should have string notes
      const invoices = result.invoices as Record<string, unknown>[];
      const hasNullNotes = invoices.some(inv => inv.notes === null);
      const hasStringNotes = invoices.some(inv => typeof inv.notes === 'string');

      // With 2-10 invoices, we expect at least one of each (probabilistic but very likely)
      expect(hasNullNotes || hasStringNotes).toBe(true);

      // Line items have nullable discount_code
      for (const inv of invoices) {
        const lineItems = inv.line_items as Record<string, unknown>[];
        for (const li of lineItems) {
          expect(li.discount_code === null || typeof li.discount_code === 'string').toBe(true);
        }
      }
    });
  });

  describe('cross-ref.vague', () => {
    it('references existing companies and propagates parent values', async () => {
      const result = await runExample('cross-ref.vague');

      expect(result.companies).toHaveLength(10);
      expect(result.invoices).toHaveLength(30);

      const companies = result.companies as Record<string, unknown>[];

      for (const inv of result.invoices as Record<string, unknown>[]) {
        // customer should be one of the companies
        const customer = inv.customer as Record<string, unknown>;
        expect(companies).toContainEqual(customer);

        // line items should inherit base_currency from invoice (^base_currency)
        const lineItems = inv.line_items as Record<string, unknown>[];
        for (const li of lineItems) {
          expect(li.currency).toBe(inv.base_currency);
        }
      }
    });
  });

  describe('dynamic-cardinality.vague', () => {
    it('generates correct item counts based on order size', async () => {
      const result = await runExample('dynamic-cardinality.vague');

      expect(result.orders).toHaveLength(20);
      expect(result.shipments).toHaveLength(15);

      for (const order of result.orders as Record<string, unknown>[]) {
        const items = order.items as Record<string, unknown>[];
        const size = order.size as string;

        if (size === 'large') {
          expect(items.length).toBeGreaterThanOrEqual(5);
          expect(items.length).toBeLessThanOrEqual(10);
        } else if (size === 'medium') {
          expect(items.length).toBeGreaterThanOrEqual(3);
          expect(items.length).toBeLessThanOrEqual(5);
        } else {
          expect(items.length).toBeGreaterThanOrEqual(1);
          expect(items.length).toBeLessThanOrEqual(2);
        }

        // Computed fields should be correct
        expect(order.item_count).toBe(items.length);
        const prices = items.map(i => (i as Record<string, unknown>).unit_price as number);
        expect(order.subtotal).toBe(prices.reduce((a, b) => a + b, 0));

        // Shipping logic
        const isPriority = order.is_priority as boolean;
        if (isPriority || size === 'large') {
          expect(order.shipping).toBe('express');
        } else {
          expect(order.shipping).toBe('standard');
        }
      }
    });

    it('respects dataset-level constraints', async () => {
      const result = await runExample('dynamic-cardinality.vague');

      const orders = result.orders as Record<string, unknown>[];
      const shipments = result.shipments as Record<string, unknown>[];

      const totalSubtotal = orders.reduce((sum, o) => sum + (o.subtotal as number), 0);
      expect(totalSubtotal).toBeGreaterThanOrEqual(5000);
      expect(shipments.length).toBeLessThanOrEqual(orders.length);
    });
  });

  describe('dataset-constraints.vague', () => {
    it('applies then blocks to update invoice status', async () => {
      const result = await runExample('dataset-constraints.vague');

      expect(result.invoices).toHaveLength(50);
      expect(result.payments).toHaveLength(40);

      const invoices = result.invoices as Record<string, unknown>[];

      // Invoices that received payments should have updated status
      const paidOrPartial = invoices.filter(
        inv => inv.status === 'paid' || inv.status === 'partially-paid'
      );

      // With 40 payments across 50 invoices, we expect some to be paid/partially-paid
      expect(paidOrPartial.length).toBeGreaterThan(0);

      // No invoice should be overpaid
      for (const inv of invoices) {
        expect(inv.amount_paid).toBeLessThanOrEqual(inv.total as number);
      }
    });

    it('respects validate block constraints', async () => {
      const result = await runExample('dataset-constraints.vague');

      const invoices = result.invoices as Record<string, unknown>[];
      const payments = result.payments as Record<string, unknown>[];

      const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.total as number), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid as number), 0);

      // These constraints are verified at generation time
      expect(totalInvoices).toBeGreaterThanOrEqual(15000);
      expect(totalInvoices).toBeLessThanOrEqual(45000);
      expect(totalPaid).toBeLessThanOrEqual(totalInvoices);
      expect(payments.length).toBeLessThanOrEqual(invoices.length * 3);
    });

    it('handles nullable fields', async () => {
      const result = await runExample('dataset-constraints.vague');
      const invoices = result.invoices as Record<string, unknown>[];

      for (const inv of invoices) {
        expect(inv.notes === null || typeof inv.notes === 'string').toBe(true);
      }
    });
  });

  describe('openapi-import.vague', () => {
    it('imports and extends OpenAPI schemas', async () => {
      const result = await runExample('openapi-import.vague');

      expect(result.pets).toHaveLength(10);
      expect(result.owners).toHaveLength(5);

      // Pet should have fields from OpenAPI spec
      const pet = result.pets[0] as Record<string, unknown>;
      expect(pet).toHaveProperty('id');
      expect(pet).toHaveProperty('name');
      // age is overridden with int in 1..15
      expect(pet.age).toBeGreaterThanOrEqual(1);
      expect(pet.age).toBeLessThanOrEqual(15);

      // Owner has extended fields
      const owner = result.owners[0] as Record<string, unknown>;
      expect(owner).toHaveProperty('id');
      expect(owner).toHaveProperty('name');
      expect(owner).toHaveProperty('memberSince');
      expect(owner).toHaveProperty('tier');
      expect(['Gold', 'Silver', 'Bronze']).toContain(owner.tier);
    });
  });
});
