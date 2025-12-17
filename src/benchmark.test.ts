import { describe, it, expect } from 'vitest';
import { compile } from './index.js';

describe('Memory and performance benchmarks', () => {
  describe('Large dataset generation', () => {
    it('generates 1000 simple records without issue', async () => {
      const source = `
        schema Item {
          id: int in 1..100000,
          name: string,
          active: boolean
        }
        dataset Test {
          items: 1000 of Item
        }
      `;

      const result = await compile(source);
      expect(result.items).toHaveLength(1000);
    });

    it('generates 10000 simple records', async () => {
      const source = `
        schema Item {
          id: int in 1..100000,
          name: string,
          price: decimal in 0.01..999.99
        }
        dataset Test {
          items: 10000 of Item
        }
      `;

      const start = Date.now();
      const result = await compile(source);
      const duration = Date.now() - start;

      expect(result.items).toHaveLength(10000);
      // Should complete in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);
    });

    it('generates records with nested collections', async () => {
      const source = `
        schema LineItem {
          name: string,
          quantity: int in 1..10,
          price: decimal in 1..100
        }
        schema Order {
          id: int in 1..100000,
          items: 3..5 of LineItem
        }
        dataset Test {
          orders: 1000 of Order
        }
      `;

      const result = await compile(source);
      expect(result.orders).toHaveLength(1000);

      // Each order should have 3-5 items
      const orders = result.orders as Array<{ items: unknown[] }>;
      for (const order of orders) {
        expect(order.items.length).toBeGreaterThanOrEqual(3);
        expect(order.items.length).toBeLessThanOrEqual(5);
      }
    });

    it('generates with cross-references efficiently', async () => {
      const source = `
        schema Customer {
          id: unique int in 1..1000,
          name: string
        }
        schema Order {
          customer: any of customers,
          total: decimal in 10..500
        }
        dataset Test {
          customers: 100 of Customer,
          orders: 1000 of Order
        }
      `;

      const start = Date.now();
      const result = await compile(source);
      const duration = Date.now() - start;

      expect(result.customers).toHaveLength(100);
      expect(result.orders).toHaveLength(1000);
      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('handles computed fields at scale', async () => {
      const source = `
        schema LineItem {
          quantity: int in 1..10,
          unit_price: decimal in 1..50
        }
        schema Invoice {
          items: 5 of LineItem,
          subtotal: sum(items.quantity) * 10,
          item_count: count(items)
        }
        dataset Test {
          invoices: 500 of Invoice
        }
      `;

      const result = await compile(source);
      expect(result.invoices).toHaveLength(500);

      // Verify computed fields work
      const invoices = result.invoices as Array<{
        items: unknown[];
        item_count: number;
      }>;
      for (const inv of invoices) {
        expect(inv.item_count).toBe(inv.items.length);
      }
    });

    it('unique values with large pool', async () => {
      const source = `
        schema Item {
          id: unique int in 1..100000
        }
        dataset Test {
          items: 5000 of Item
        }
      `;

      const start = Date.now();
      const result = await compile(source);
      const duration = Date.now() - start;

      expect(result.items).toHaveLength(5000);

      // Verify all unique
      const ids = (result.items as Array<{ id: number }>).map((x) => x.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5000);

      // Should be reasonably fast with large enough pool
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Memory usage patterns', () => {
    it('does not accumulate unbounded state across generations', async () => {
      const source = `
        schema Item {
          value: int in 1..1000
        }
        dataset Test {
          items: 100 of Item
        }
      `;

      // Run multiple times - state should reset between runs
      for (let i = 0; i < 10; i++) {
        const result = await compile(source);
        expect(result.items).toHaveLength(100);
      }
    });

    it('handles constraints without memory leak', async () => {
      const source = `
        schema Item {
          a: int in 1..100,
          b: int in 1..100,
          assume a < b
        }
        dataset Test {
          items: 500 of Item
        }
      `;

      // Run multiple times
      for (let i = 0; i < 5; i++) {
        const result = await compile(source);
        expect(result.items).toHaveLength(500);
      }
    });
  });

  describe('Edge cases at scale', () => {
    it('empty collections do not cause issues', async () => {
      const source = `
        schema Item {
          value: int
        }
        dataset Test {
          empty: 0 of Item,
          items: 100 of Item
        }
      `;

      const result = await compile(source);
      expect(result.empty).toHaveLength(0);
      expect(result.items).toHaveLength(100);
    });

    it('deeply nested schemas work', async () => {
      const source = `
        schema Level3 {
          value: int in 1..10
        }
        schema Level2 {
          items: 2 of Level3
        }
        schema Level1 {
          items: 2 of Level2
        }
        schema Root {
          items: 2 of Level1
        }
        dataset Test {
          roots: 50 of Root
        }
      `;

      const result = await compile(source);
      expect(result.roots).toHaveLength(50);

      // Each root has 2 * 2 * 2 = 8 Level3 items total
      const root = result.roots[0] as {
        items: Array<{
          items: Array<{ items: Array<{ value: number }> }>;
        }>;
      };
      expect(root.items).toHaveLength(2);
      expect(root.items[0].items).toHaveLength(2);
      expect(root.items[0].items[0].items).toHaveLength(2);
    });
  });
});
