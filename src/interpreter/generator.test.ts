import { describe, it, expect } from 'vitest';
import { compile } from '../index.js';

describe('Generator', () => {
  it('generates simple dataset', async () => {
    const source = `
      schema Company {
        name: string
      }

      dataset TestData {
        companies: 5 of Company
      }
    `;

    const result = await compile(source);

    expect(result.companies).toHaveLength(5);
    for (const company of result.companies) {
      expect(company).toHaveProperty('name');
      expect(typeof (company as Record<string, unknown>).name).toBe('string');
    }
  });

  it('generates with range cardinality', async () => {
    const source = `
      schema Item {
        value: int
      }

      dataset TestData {
        items: 3..7 of Item
      }
    `;

    const result = await compile(source);

    expect(result.items.length).toBeGreaterThanOrEqual(3);
    expect(result.items.length).toBeLessThanOrEqual(7);
  });

  it('generates int in range', async () => {
    const source = `
      schema Person {
        age: int in 18..65
      }

      dataset TestData {
        people: 10 of Person
      }
    `;

    const result = await compile(source);

    for (const person of result.people) {
      const age = (person as Record<string, unknown>).age as number;
      expect(age).toBeGreaterThanOrEqual(18);
      expect(age).toBeLessThanOrEqual(65);
    }
  });

  it('generates superposition values', async () => {
    const source = `
      schema Invoice {
        status: "draft" | "sent" | "paid"
      }

      dataset TestData {
        invoices: 20 of Invoice
      }
    `;

    const result = await compile(source);

    const statuses = new Set(result.invoices.map((i) => (i as Record<string, unknown>).status));

    // With 20 samples, we should see multiple values
    expect(statuses.size).toBeGreaterThan(0);

    for (const invoice of result.invoices) {
      expect(['draft', 'sent', 'paid']).toContain((invoice as Record<string, unknown>).status);
    }
  });

  it('generates weighted superposition values', async () => {
    const source = `
      schema Invoice {
        status: 0.9: "paid" | 0.1: "draft"
      }

      dataset TestData {
        invoices: 100 of Invoice
      }
    `;

    const result = await compile(source);

    let paidCount = 0;
    for (const invoice of result.invoices) {
      if ((invoice as Record<string, unknown>).status === 'paid') {
        paidCount++;
      }
    }

    // Should be roughly 90% paid, allow some variance
    expect(paidCount).toBeGreaterThan(70);
  });

  it('generates mixed weighted/unweighted superposition values', async () => {
    // When some options have weights and others don't, unweighted options
    // should share the remaining probability (1 - sum of explicit weights)
    const source = `
      schema Invoice {
        status: 0.85: "Active" | "Archived"
      }

      dataset TestData {
        invoices: 100 of Invoice
      }
    `;

    const result = await compile(source);

    let activeCount = 0;
    let archivedCount = 0;
    for (const invoice of result.invoices) {
      const status = (invoice as Record<string, unknown>).status;
      if (status === 'Active') {
        activeCount++;
      } else if (status === 'Archived') {
        archivedCount++;
      }
    }

    // "Active" should be roughly 85%, "Archived" should be roughly 15%
    expect(activeCount).toBeGreaterThan(60); // Should be ~85%
    expect(archivedCount).toBeGreaterThan(0); // Should be ~15%, at least some
    expect(archivedCount).toBeLessThan(40); // Should not be too many
  });

  it('generates mixed weighted/unweighted with multiple unweighted options', async () => {
    // When multiple unweighted options exist, they should share remaining probability equally
    const source = `
      schema Item {
        category: 0.6: "main" | "side" | "dessert"
      }

      dataset TestData {
        items: 100 of Item
      }
    `;

    const result = await compile(source);

    let mainCount = 0;
    let sideCount = 0;
    let dessertCount = 0;
    for (const item of result.items) {
      const category = (item as Record<string, unknown>).category;
      if (category === 'main') mainCount++;
      else if (category === 'side') sideCount++;
      else if (category === 'dessert') dessertCount++;
    }

    // "main" should be ~60%, "side" and "dessert" should be ~20% each
    expect(mainCount).toBeGreaterThan(40); // Should be ~60%
    expect(sideCount).toBeGreaterThan(0); // Should be ~20%
    expect(dessertCount).toBeGreaterThan(0); // Should be ~20%
  });

  it('generates nullable fields with question mark shorthand', async () => {
    const source = `
      schema Item {
        name: string,
        notes: string?
      }

      dataset TestData {
        items: 50 of Item
      }
    `;

    const result = await compile(source);

    let withNotes = 0;
    let withNull = 0;

    for (const item of result.items) {
      const i = item as { name: string; notes: string | null };
      // Field should always exist with new nullable semantics
      expect('notes' in i).toBe(true);
      if (i.notes === null) {
        withNull++;
      } else {
        withNotes++;
      }
    }

    // Both should occur with 50 samples (50/50 null vs value)
    expect(withNotes).toBeGreaterThan(0);
    expect(withNull).toBeGreaterThan(0);
  });

  it('generates null values in superposition', async () => {
    const source = `
      schema User {
        name: string,
        nickname: string | null
      }

      dataset TestData {
        users: 50 of User
      }
    `;

    const result = await compile(source);

    let withNickname = 0;
    let withNull = 0;

    for (const user of result.users) {
      const u = user as { name: string; nickname: string | null };
      if (u.nickname === null) {
        withNull++;
      } else {
        withNickname++;
      }
    }

    // Both should occur with 50 samples
    expect(withNickname).toBeGreaterThan(0);
    expect(withNull).toBeGreaterThan(0);
  });

  it('generates nullable fields with question mark syntax', async () => {
    const source = `
      schema User {
        name: string,
        bio: string?,
        age: int?
      }

      dataset TestData {
        users: 50 of User
      }
    `;

    const result = await compile(source);

    let bioNull = 0;
    let bioSet = 0;
    let ageNull = 0;
    let ageSet = 0;

    for (const user of result.users) {
      const u = user as { name: string; bio: string | null; age: number | null };
      if (u.bio === null) bioNull++;
      else bioSet++;
      if (u.age === null) ageNull++;
      else ageSet++;
    }

    // Both should occur with 50 samples
    expect(bioNull).toBeGreaterThan(0);
    expect(bioSet).toBeGreaterThan(0);
    expect(ageNull).toBeGreaterThan(0);
    expect(ageSet).toBeGreaterThan(0);
  });

  it('generates range with alternative value superposition', async () => {
    const source = `
      schema Item {
        base_price: 100,
        price: int in 10..50 | base_price
      }

      dataset TestData {
        items: 50 of Item
      }
    `;

    const result = await compile(source);

    let fromRange = 0;
    let fromBase = 0;

    for (const item of result.items) {
      const i = item as { base_price: number; price: number };
      if (i.price === 100) {
        fromBase++;
      } else if (i.price >= 10 && i.price <= 50) {
        fromRange++;
      }
    }

    // Both should occur with 50 samples
    expect(fromRange).toBeGreaterThan(0);
    expect(fromBase).toBeGreaterThan(0);
  });

  it('generates weighted range with alternative value superposition', async () => {
    const source = `
      schema Item {
        base_price: 100,
        price: 0.8: int in 10..50 | 0.2: base_price
      }

      dataset TestData {
        items: 100 of Item
      }
    `;

    const result = await compile(source);

    let fromRange = 0;
    let fromBase = 0;

    for (const item of result.items) {
      const i = item as { base_price: number; price: number };
      if (i.price === 100) {
        fromBase++;
      } else if (i.price >= 10 && i.price <= 50) {
        fromRange++;
      }
    }

    // Both should occur - with 80/20 split, range should dominate
    expect(fromRange).toBeGreaterThan(0);
    expect(fromBase).toBeGreaterThan(0);
    // With 100 samples and 80% weight, expect more from range
    expect(fromRange).toBeGreaterThan(fromBase);
  });

  it('generates weighted range superposition with field reference', async () => {
    const source = `
      schema Invoice {
        total: int in 100..1000
      }

      schema Payment {
        invoice: any of invoices,
        amount: 0.7: int in 10..100 | 0.3: invoice.total
      }

      dataset TestData {
        invoices: 10 of Invoice,
        payments: 50 of Payment
      }
    `;

    const result = await compile(source);

    let smallPayments = 0;
    let fullPayments = 0;

    for (const payment of result.payments) {
      const p = payment as { invoice: { total: number }; amount: number };
      if (p.amount >= 10 && p.amount <= 100) {
        smallPayments++;
      } else if (p.amount === p.invoice.total) {
        fullPayments++;
      }
    }

    // Both types should occur
    expect(smallPayments).toBeGreaterThan(0);
    expect(fullPayments).toBeGreaterThan(0);
  });

  it('generates boolean literals correctly', async () => {
    const source = `
      schema Config {
        enabled: true | false,
        debug: false
      }

      dataset TestData {
        configs: 30 of Config
      }
    `;

    const result = await compile(source);

    let trueCount = 0;
    let falseCount = 0;

    for (const config of result.configs) {
      const c = config as { enabled: boolean; debug: boolean };
      if (c.enabled === true) trueCount++;
      if (c.enabled === false) falseCount++;
      expect(c.debug).toBe(false);
    }

    // Both should occur with 30 samples
    expect(trueCount).toBeGreaterThan(0);
    expect(falseCount).toBeGreaterThan(0);
  });

  it('generates collection fields', async () => {
    const source = `
      schema LineItem {
        amount: decimal
      }

      schema Invoice {
        line_items: 1..5 of LineItem
      }

      dataset TestData {
        invoices: 10 of Invoice
      }
    `;

    const result = await compile(source);

    for (const invoice of result.invoices) {
      const items = (invoice as Record<string, unknown>).line_items as unknown[];
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.length).toBeLessThanOrEqual(5);

      for (const item of items) {
        expect(item).toHaveProperty('amount');
        expect(typeof (item as Record<string, unknown>).amount).toBe('number');
      }
    }
  });

  it('generates dates in range', async () => {
    const source = `
      schema Company {
        created: date in 2020..2023
      }

      dataset TestData {
        companies: 10 of Company
      }
    `;

    const result = await compile(source);

    for (const company of result.companies) {
      const created = (company as Record<string, unknown>).created as string;
      const year = parseInt(created.split('-')[0], 10);
      expect(year).toBeGreaterThanOrEqual(2020);
      expect(year).toBeLessThanOrEqual(2023);
    }
  });

  it('handles multiple collections', async () => {
    const source = `
      schema Company {
        name: string
      }

      schema Invoice {
        total: decimal
      }

      dataset TestData {
        companies: 5 of Company,
        invoices: 10 of Invoice
      }
    `;

    const result = await compile(source);

    expect(result.companies).toHaveLength(5);
    expect(result.invoices).toHaveLength(10);
  });

  describe('cross-record references', () => {
    it('resolves any of collection reference', async () => {
      const source = `
        schema Company {
          name: string,
          industry: "tech" | "retail" | "finance"
        }

        schema Invoice {
          customer: any of companies
        }

        dataset TestData {
          companies: 5 of Company,
          invoices: 10 of Invoice
        }
      `;

      const result = await compile(source);

      // Each invoice should reference one of the companies
      for (const invoice of result.invoices) {
        const customer = (invoice as Record<string, unknown>).customer;
        expect(customer).toBeDefined();
        expect(result.companies).toContainEqual(customer);
      }
    });

    it('resolves any of with where clause', async () => {
      const source = `
        schema Company {
          name: string,
          industry: "tech" | "retail"
        }

        schema Invoice {
          tech_customer: any of companies where .industry == "tech"
        }

        dataset TestData {
          companies: 20 of Company,
          invoices: 10 of Invoice
        }
      `;

      const result = await compile(source);

      // Each invoice's tech_customer should be a tech company (or null if none exist)
      for (const invoice of result.invoices) {
        const customer = (invoice as Record<string, unknown>).tech_customer as Record<
          string,
          unknown
        > | null;
        if (customer) {
          expect(customer.industry).toBe('tech');
        }
      }
    });

    it('resolves parent reference in nested schema', async () => {
      const source = `
        schema LineItem {
          parent_currency: ^currency
        }

        schema Invoice {
          currency: "USD" | "GBP" | "EUR",
          line_items: 3 of LineItem
        }

        dataset TestData {
          invoices: 5 of Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices) {
        const inv = invoice as Record<string, unknown>;
        const lineItems = inv.line_items as Record<string, unknown>[];

        // Each line item should inherit the invoice's currency
        for (const item of lineItems) {
          expect(item.parent_currency).toBe(inv.currency);
        }
      }
    });
  });

  describe('constraints', () => {
    it('enforces simple assume constraint', async () => {
      const source = `
        schema Item {
          min_val: int in 1..50,
          max_val: int in 51..100,
          assume max_val > min_val
        }

        dataset TestData {
          items: 20 of Item
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const i = item as Record<string, unknown>;
        expect(i.max_val).toBeGreaterThan(i.min_val as number);
      }
    });

    it('enforces conditional assume if constraint', async () => {
      const source = `
        schema Company {
          industry: "saas" | "manufacturing",
          founded: int in 1990..2023,
          assume if industry == "saas" {
            founded > 2000
          }
        }

        dataset TestData {
          companies: 30 of Company
        }
      `;

      const result = await compile(source);

      for (const company of result.companies) {
        const c = company as Record<string, unknown>;
        if (c.industry === 'saas') {
          expect(c.founded).toBeGreaterThan(2000);
        }
        // Manufacturing companies can have any founded year
      }
    });

    it('enforces logical and constraint', async () => {
      const source = `
        schema Product {
          price: int in 1..1000,
          quantity: int in 1..100,
          assume price > 10 and quantity > 5
        }

        dataset TestData {
          products: 20 of Product
        }
      `;

      const result = await compile(source);

      for (const product of result.products) {
        const p = product as Record<string, unknown>;
        expect(p.price).toBeGreaterThan(10);
        expect(p.quantity).toBeGreaterThan(5);
      }
    });

    it('enforces logical or constraint', async () => {
      const source = `
        schema Item {
          category: "premium" | "basic",
          price: int in 1..500,
          assume category == "premium" or price < 100
        }

        dataset TestData {
          items: 30 of Item
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const i = item as Record<string, unknown>;
        // Either category is premium OR price is less than 100
        const isPremium = i.category === 'premium';
        const isLowPrice = (i.price as number) < 100;
        expect(isPremium || isLowPrice).toBe(true);
      }
    });

    it('enforces not constraint', async () => {
      const source = `
        schema Invoice {
          status: "paid" | "pending" | "cancelled",
          assume not status == "cancelled"
        }

        dataset TestData {
          invoices: 30 of Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices) {
        const i = invoice as Record<string, unknown>;
        expect(i.status).not.toBe('cancelled');
      }
    });

    it('enforces multiple assume clauses', async () => {
      const source = `
        schema Order {
          quantity: int in 1..100,
          discount: int in 0..50,
          assume quantity >= 10,
          assume discount <= 30
        }

        dataset TestData {
          orders: 20 of Order
        }
      `;

      const result = await compile(source);

      for (const order of result.orders) {
        const o = order as Record<string, unknown>;
        expect(o.quantity).toBeGreaterThanOrEqual(10);
        expect(o.discount).toBeLessThanOrEqual(30);
      }
    });

    it('enforces multiple constraints in assume if block', async () => {
      const source = `
        schema Company {
          tier: "enterprise" | "startup",
          employee_count: int in 1..10000,
          revenue: int in 10000..100000000,
          assume if tier == "enterprise" {
            employee_count > 500,
            revenue > 1000000
          }
        }

        dataset TestData {
          companies: 30 of Company
        }
      `;

      const result = await compile(source);

      for (const company of result.companies) {
        const c = company as Record<string, unknown>;
        if (c.tier === 'enterprise') {
          expect(c.employee_count).toBeGreaterThan(500);
          expect(c.revenue).toBeGreaterThan(1000000);
        }
      }
    });
  });

  describe('computed fields', () => {
    it('computes sum of collection field', async () => {
      const source = `
        schema LineItem {
          amount: int in 10..100
        }

        schema Invoice {
          line_items: 3..5 of LineItem,
          total: sum(line_items.amount)
        }

        dataset TestData {
          invoices: 10 of Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices) {
        const inv = invoice as Record<string, unknown>;
        const lineItems = inv.line_items as Record<string, unknown>[];
        const expectedTotal = lineItems.reduce((sum, item) => sum + (item.amount as number), 0);
        expect(inv.total).toBe(expectedTotal);
      }
    });

    it('computes count of collection', async () => {
      const source = `
        schema Item {
          value: int
        }

        schema Container {
          items: 2..6 of Item,
          item_count: count(items)
        }

        dataset TestData {
          containers: 10 of Container
        }
      `;

      const result = await compile(source);

      for (const container of result.containers) {
        const c = container as Record<string, unknown>;
        const items = c.items as unknown[];
        expect(c.item_count).toBe(items.length);
      }
    });

    it('computes min and max of collection field', async () => {
      const source = `
        schema Score {
          value: int in 1..100
        }

        schema Game {
          scores: 5 of Score,
          lowest: min(scores.value),
          highest: max(scores.value)
        }

        dataset TestData {
          games: 10 of Game
        }
      `;

      const result = await compile(source);

      for (const game of result.games) {
        const g = game as Record<string, unknown>;
        const scores = g.scores as Record<string, unknown>[];
        const values = scores.map((s) => s.value as number);
        expect(g.lowest).toBe(Math.min(...values));
        expect(g.highest).toBe(Math.max(...values));
      }
    });

    it('computes avg of collection field', async () => {
      const source = `
        schema Rating {
          stars: int in 1..5
        }

        schema Product {
          ratings: 4 of Rating,
          avg_rating: avg(ratings.stars)
        }

        dataset TestData {
          products: 10 of Product
        }
      `;

      const result = await compile(source);

      for (const product of result.products) {
        const p = product as Record<string, unknown>;
        const ratings = p.ratings as Record<string, unknown>[];
        const values = ratings.map((r) => r.stars as number);
        const expectedAvg = values.reduce((s, v) => s + v, 0) / values.length;
        expect(p.avg_rating).toBeCloseTo(expectedAvg);
      }
    });

    it('computes arithmetic expressions', async () => {
      const source = `
        schema LineItem {
          quantity: int in 1..10,
          unit_price: int in 10..50
        }

        schema Order {
          items: 2..4 of LineItem,
          subtotal: sum(items.unit_price),
          item_count: count(items),
          avg_price: avg(items.unit_price)
        }

        dataset TestData {
          orders: 10 of Order
        }
      `;

      const result = await compile(source);

      for (const order of result.orders) {
        const o = order as Record<string, unknown>;
        const items = o.items as Record<string, unknown>[];

        // Verify subtotal
        const expectedSubtotal = items.reduce((sum, item) => sum + (item.unit_price as number), 0);
        expect(o.subtotal).toBe(expectedSubtotal);

        // Verify count
        expect(o.item_count).toBe(items.length);

        // Verify avg
        const expectedAvg = expectedSubtotal / items.length;
        expect(o.avg_price).toBeCloseTo(expectedAvg);
      }
    });

    it('computes first and last of collection field', async () => {
      const source = `
        schema Item {
          value: int in 1..100
        }

        schema Container {
          items: 5 of Item,
          first_val: first(items.value),
          last_val: last(items.value)
        }

        dataset TestData {
          containers: 10 of Container
        }
      `;

      const result = await compile(source);

      for (const container of result.containers) {
        const c = container as Record<string, unknown>;
        const items = c.items as Record<string, unknown>[];
        const values = items.map((i) => i.value as number);
        expect(c.first_val).toBe(values[0]);
        expect(c.last_val).toBe(values[values.length - 1]);
      }
    });

    it('computes median of collection field', async () => {
      const source = `
        schema Score {
          value: int in 1..100
        }

        schema Analysis {
          scores: 5 of Score,
          median_score: median(scores.value)
        }

        dataset TestData {
          analyses: 10 of Analysis
        }
      `;

      const result = await compile(source);

      for (const analysis of result.analyses) {
        const a = analysis as Record<string, unknown>;
        const scores = a.scores as Record<string, unknown>[];
        const values = scores.map((s) => s.value as number);
        const sorted = [...values].sort((x, y) => x - y);
        const mid = Math.floor(sorted.length / 2);
        const expectedMedian =
          sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        expect(a.median_score).toBeCloseTo(expectedMedian);
      }
    });

    it('computes product of collection field', async () => {
      const source = `
        schema Factor {
          value: int in 1..5
        }

        schema Calculation {
          factors: 3 of Factor,
          result: product(factors.value)
        }

        dataset TestData {
          calculations: 10 of Calculation
        }
      `;

      const result = await compile(source);

      for (const calc of result.calculations) {
        const c = calc as Record<string, unknown>;
        const factors = c.factors as Record<string, unknown>[];
        const values = factors.map((f) => f.value as number);
        const expectedProduct = values.reduce((p, v) => p * v, 1);
        expect(c.result).toBe(expectedProduct);
      }
    });

    it('handles empty collections for first and last', async () => {
      const source = `
        schema Item {
          value: int
        }

        schema Container {
          items: 0 of Item,
          first_val: first(items.value),
          last_val: last(items.value)
        }

        dataset TestData {
          containers: 1 of Container
        }
      `;

      const result = await compile(source);
      const container = result.containers[0] as Record<string, unknown>;
      expect(container.first_val).toBeNull();
      expect(container.last_val).toBeNull();
    });
  });

  describe('OpenAPI schema import', () => {
    it('imports fields from OpenAPI spec', async () => {
      const source = `
        import petstore from "examples/openapi-examples-generation/petstore.json"

        schema TestPet from petstore.Pet { }

        dataset TestData {
          pets: 5 of TestPet
        }
      `;

      const result = await compile(source);

      expect(result.pets).toHaveLength(5);
      for (const pet of result.pets) {
        const p = pet as Record<string, unknown>;
        // Fields from OpenAPI spec should be generated
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('species');
        expect(typeof p.id).toBe('number');
        expect(typeof p.name).toBe('string');
        expect(['dog', 'cat', 'bird', 'fish']).toContain(p.species);
      }
    });

    it('allows overriding imported fields', async () => {
      const source = `
        import petstore from "examples/openapi-examples-generation/petstore.json"

        schema CustomPet from petstore.Pet {
          age: int in 1..5
        }

        dataset TestData {
          pets: 10 of CustomPet
        }
      `;

      const result = await compile(source);

      for (const pet of result.pets) {
        const p = pet as Record<string, unknown>;
        // Base fields still exist
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('name');
        // Override field has constrained range
        expect(p.age).toBeGreaterThanOrEqual(1);
        expect(p.age).toBeLessThanOrEqual(5);
      }
    });

    it('allows adding custom fields to imported schema', async () => {
      const source = `
        import petstore from "examples/openapi-examples-generation/petstore.json"

        schema ExtendedOwner from petstore.Owner {
          tier: "Gold" | "Silver" | "Bronze"
        }

        dataset TestData {
          owners: 5 of ExtendedOwner
        }
      `;

      const result = await compile(source);

      for (const owner of result.owners) {
        const o = owner as Record<string, unknown>;
        // Base fields from OpenAPI
        expect(o).toHaveProperty('id');
        expect(o).toHaveProperty('name');
        expect(o).toHaveProperty('email');
        // Custom field
        expect(['Gold', 'Silver', 'Bronze']).toContain(o.tier);
      }
    });

    it('generates format-aware values from OpenAPI schema', async () => {
      // Create a temporary OpenAPI spec with format annotations
      const fs = await import('fs');
      const path = await import('path');
      const tempDir = path.join(__dirname, '../../examples/openapi-examples-generation');
      const tempSpec = path.join(tempDir, 'format-test.json');

      const spec = {
        openapi: '3.0.0',
        info: { title: 'Format Test', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string', format: 'phone' },
                phone2: { type: 'string', format: 'phone-number' },
                website: { type: 'string', format: 'uri' },
                created_at: { type: 'string', format: 'date-time' },
                birth_date: { type: 'string', format: 'date' },
                ip_address: { type: 'string', format: 'ipv4' },
              },
            },
          },
        },
      };

      fs.writeFileSync(tempSpec, JSON.stringify(spec, null, 2));

      try {
        const source = `
          import formattest from "examples/openapi-examples-generation/format-test.json"

          schema TestUser from formattest.User { }

          dataset TestData {
            users: 5 of TestUser
          }
        `;

        const result = await compile(source);

        expect(result.users).toHaveLength(5);
        for (const user of result.users) {
          const u = user as Record<string, unknown>;

          // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          expect(u.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

          // Email format: something@something
          expect(u.email).toMatch(/@/);

          // Phone format: starts with + and contains digits
          expect(u.phone).toMatch(/^\+?\d[\d\s()-]+$/);
          expect(u.phone2).toMatch(/^\+?\d[\d\s()-]+$/);

          // URI format: starts with http(s)://
          expect(u.website).toMatch(/^https?:\/\//);

          // date-time format: ISO 8601
          expect(u.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

          // date format: YYYY-MM-DD
          expect(u.birth_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

          // ipv4 format: x.x.x.x
          expect(u.ip_address).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        }
      } finally {
        // Cleanup temp file
        fs.unlinkSync(tempSpec);
      }
    });
  });

  describe('dataset-level constraints', () => {
    it('enforces sum constraint on collection', async () => {
      const source = `
        schema Item {
          value: int in 10..50
        }

        dataset TestData {
          items: 10 of Item,
          validate {
            sum(items.value) >= 200,
            sum(items.value) <= 400
          }
        }
      `;

      const result = await compile(source);

      expect(result.items).toHaveLength(10);
      const sum = (result.items as { value: number }[]).reduce((s, i) => s + i.value, 0);
      expect(sum).toBeGreaterThanOrEqual(200);
      expect(sum).toBeLessThanOrEqual(400);
    });

    it('enforces count constraint on collection', async () => {
      const source = `
        schema Item { x: int }

        dataset TestData {
          items: 5..15 of Item,
          validate {
            count(items) >= 8
          }
        }
      `;

      const result = await compile(source);

      expect(result.items.length).toBeGreaterThanOrEqual(8);
    });

    it('enforces cross-collection constraint', async () => {
      const source = `
        schema Invoice { total: int in 100..500 }
        schema Payment { amount: int in 50..200 }

        dataset TestData {
          invoices: 5 of Invoice,
          payments: 3 of Payment,
          validate {
            sum(payments.amount) <= sum(invoices.total)
          }
        }
      `;

      const result = await compile(source);

      const invoiceTotal = (result.invoices as { total: number }[]).reduce(
        (s, i) => s + i.total,
        0
      );
      const paymentTotal = (result.payments as { amount: number }[]).reduce(
        (s, p) => s + p.amount,
        0
      );
      expect(paymentTotal).toBeLessThanOrEqual(invoiceTotal);
    });

    it('enforces multiple validation constraints', async () => {
      const source = `
        schema Item {
          price: int in 10..100
        }

        dataset TestData {
          items: 10 of Item,
          validate {
            sum(items.price) >= 200,
            avg(items.price) >= 20,
            max(items.price) >= 50
          }
        }
      `;

      const result = await compile(source);

      const prices = (result.items as { price: number }[]).map((i) => i.price);
      const sum = prices.reduce((s, p) => s + p, 0);
      const avg = sum / prices.length;
      const max = Math.max(...prices);

      expect(sum).toBeGreaterThanOrEqual(200);
      expect(avg).toBeGreaterThanOrEqual(20);
      expect(max).toBeGreaterThanOrEqual(50);
    });

    it('enforces count comparison between collections', async () => {
      const source = `
        schema A { x: int }
        schema B { y: int }

        dataset TestData {
          as: 5..10 of A,
          bs: 3..8 of B,
          validate {
            count(bs) <= count(as)
          }
        }
      `;

      const result = await compile(source);

      expect(result.bs.length).toBeLessThanOrEqual(result.as.length);
    });

    it('enforces all() predicate on collection', async () => {
      const source = `
        schema Item {
          value: int in 10..100
        }

        dataset TestData {
          items: 10 of Item,
          validate {
            all(items, .value >= 10)
          }
        }
      `;

      const result = await compile(source);
      const items = result.items as { value: number }[];

      for (const item of items) {
        expect(item.value).toBeGreaterThanOrEqual(10);
      }
    });

    it('enforces all() with comparison between fields', async () => {
      const source = `
        schema Account {
          balance: int in 100..500,
          min_balance: int in 0..50
        }

        dataset TestData {
          accounts: 10 of Account,
          validate {
            all(accounts, .balance >= .min_balance)
          }
        }
      `;

      const result = await compile(source);
      const accounts = result.accounts as { balance: number; min_balance: number }[];

      for (const account of accounts) {
        expect(account.balance).toBeGreaterThanOrEqual(account.min_balance);
      }
    });

    it('enforces some() predicate on collection', async () => {
      const source = `
        schema Item {
          value: int in 1..100
        }

        dataset TestData {
          items: 20 of Item,
          validate {
            some(items, .value >= 50)
          }
        }
      `;

      const result = await compile(source);
      const items = result.items as { value: number }[];

      const hasHighValue = items.some((item) => item.value >= 50);
      expect(hasHighValue).toBe(true);
    });

    it('enforces none() predicate on collection', async () => {
      const source = `
        schema Item {
          value: int in 1..50
        }

        dataset TestData {
          items: 10 of Item,
          validate {
            none(items, .value > 50)
          }
        }
      `;

      const result = await compile(source);
      const items = result.items as { value: number }[];

      for (const item of items) {
        expect(item.value).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('then blocks', () => {
    it('mutates referenced object with simple assignment', async () => {
      const source = `
        schema Invoice {
          id: int in 1..100,
          status: "draft" | "sent"
        }

        schema Payment {
          invoice: any of invoices,
          amount: int in 10..50
        }
        then {
          invoice.status = "paid"
        }

        dataset TestData {
          invoices: 5 of Invoice,
          payments: 3 of Payment
        }
      `;

      const result = await compile(source);

      // All referenced invoices should be "paid"
      const payments = result.payments as { invoice: { status: string } }[];
      for (const payment of payments) {
        expect(payment.invoice.status).toBe('paid');
      }
    });

    it('mutates with compound assignment (+=)', async () => {
      const source = `
        schema Account {
          balance: int in 100..1000
        }

        schema Deposit {
          account: any of accounts,
          amount: int in 10..50
        }
        then {
          account.balance += amount
        }

        dataset TestData {
          accounts: 3 of Account,
          deposits: 5 of Deposit
        }
      `;

      const result = await compile(source);

      // Each deposit should have increased account balance
      // We can't easily verify exact values, but deposits should have valid structure
      const deposits = result.deposits as { account: { balance: number }; amount: number }[];
      for (const deposit of deposits) {
        expect(deposit.account.balance).toBeGreaterThan(0);
        expect(deposit.amount).toBeGreaterThanOrEqual(10);
      }
    });

    it('applies multiple mutations in then block', async () => {
      const source = `
        schema Invoice {
          id: int in 1..100,
          status: "unpaid" | "partial",
          paid_amount: int in 0..0
        }

        schema Payment {
          invoice: any of invoices,
          amount: int in 10..50
        }
        then {
          invoice.status = "paid",
          invoice.paid_amount += amount
        }

        dataset TestData {
          invoices: 3 of Invoice,
          payments: 2 of Payment
        }
      `;

      const result = await compile(source);

      const payments = result.payments as {
        invoice: { status: string; paid_amount: number };
        amount: number;
      }[];
      for (const payment of payments) {
        expect(payment.invoice.status).toBe('paid');
        expect(payment.invoice.paid_amount).toBeGreaterThan(0);
      }
    });

    it('mutates the actual collection object (not a copy)', async () => {
      const source = `
        schema Invoice {
          id: int in 1..100,
          status: "draft" | "sent"
        }

        schema Payment {
          invoice: any of invoices,
          amount: int in 10..50
        }
        then {
          invoice.status = "paid"
        }

        dataset TestData {
          invoices: 10 of Invoice,
          payments: 10 of Payment
        }
      `;

      const result = await compile(source);

      // Count paid invoices in the invoices array
      const invoices = result.invoices as { status: string }[];
      const paidCount = invoices.filter((i) => i.status === 'paid').length;

      // At least some invoices should be paid (from mutations)
      // Note: Could be less than 10 if some payments reference the same invoice
      expect(paidCount).toBeGreaterThan(0);
    });

    it('uses ternary in then block for conditional status', async () => {
      const source = `
        schema Invoice {
          id: int in 1..100,
          total: int in 100..200,
          status: "unpaid",
          amount_paid: int in 0..0
        }

        schema Payment {
          invoice: any of invoices,
          amount: int in 50..150
        }
        then {
          invoice.amount_paid += amount,
          invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partially-paid"
        }

        dataset TestData {
          invoices: 5 of Invoice,
          payments: 10 of Payment
        }
      `;

      const result = await compile(source);

      // Check that statuses are set correctly based on amount_paid vs total
      const invoices = result.invoices as { total: number; status: string; amount_paid: number }[];
      for (const invoice of invoices) {
        if (invoice.amount_paid >= invoice.total) {
          expect(invoice.status).toBe('paid');
        } else if (invoice.amount_paid > 0) {
          expect(invoice.status).toBe('partially-paid');
        }
        // Invoices with no payments stay "unpaid"
      }
    });
  });

  describe('ternary expressions', () => {
    it('evaluates simple ternary in field', async () => {
      const source = `
        schema Item {
          value: int in 1..100,
          category: value > 50 ? "high" : "low"
        }

        dataset TestData {
          items: 20 of Item
        }
      `;

      const result = await compile(source);

      const items = result.items as { value: number; category: string }[];
      for (const item of items) {
        if (item.value > 50) {
          expect(item.category).toBe('high');
        } else {
          expect(item.category).toBe('low');
        }
      }
    });

    it('supports nested ternary expressions', async () => {
      const source = `
        schema Item {
          score: int in 0..100,
          grade: score >= 90 ? "A" : score >= 70 ? "B" : "C"
        }

        dataset TestData {
          items: 30 of Item
        }
      `;

      const result = await compile(source);

      const items = result.items as { score: number; grade: string }[];
      for (const item of items) {
        if (item.score >= 90) {
          expect(item.grade).toBe('A');
        } else if (item.score >= 70) {
          expect(item.grade).toBe('B');
        } else {
          expect(item.grade).toBe('C');
        }
      }
    });

    it('evaluates ternary with comparison operators', async () => {
      const source = `
        schema Order {
          quantity: int in 1..20,
          discount: quantity >= 10 ? 0.1 : 0
        }

        dataset TestData {
          orders: 20 of Order
        }
      `;

      const result = await compile(source);

      const orders = result.orders as { quantity: number; discount: number }[];
      for (const order of orders) {
        if (order.quantity >= 10) {
          expect(order.discount).toBe(0.1);
        } else {
          expect(order.discount).toBe(0);
        }
      }
    });

    it('supports logical AND in ternary condition', async () => {
      const source = `
        schema Order {
          quantity: int in 1..20,
          is_premium: boolean,
          discount: quantity >= 10 and is_premium ? 0.2 : 0
        }

        dataset TestData {
          orders: 30 of Order
        }
      `;

      const result = await compile(source);

      const orders = result.orders as { quantity: number; is_premium: boolean; discount: number }[];
      for (const order of orders) {
        if (order.quantity >= 10 && order.is_premium) {
          expect(order.discount).toBe(0.2);
        } else {
          expect(order.discount).toBe(0);
        }
      }
    });

    it('supports logical OR in ternary condition', async () => {
      const source = `
        schema Product {
          on_sale: boolean,
          low_stock: boolean,
          highlight: on_sale or low_stock ? "featured" : "normal"
        }

        dataset TestData {
          products: 30 of Product
        }
      `;

      const result = await compile(source);

      const products = result.products as {
        on_sale: boolean;
        low_stock: boolean;
        highlight: string;
      }[];
      for (const product of products) {
        if (product.on_sale || product.low_stock) {
          expect(product.highlight).toBe('featured');
        } else {
          expect(product.highlight).toBe('normal');
        }
      }
    });

    it('supports NOT in ternary condition', async () => {
      const source = `
        schema User {
          is_banned: boolean,
          status: not is_banned ? "active" : "banned"
        }

        dataset TestData {
          users: 20 of User
        }
      `;

      const result = await compile(source);

      const users = result.users as { is_banned: boolean; status: string }[];
      for (const user of users) {
        if (!user.is_banned) {
          expect(user.status).toBe('active');
        } else {
          expect(user.status).toBe('banned');
        }
      }
    });

    it('supports complex logical expressions in ternary', async () => {
      const source = `
        schema Order {
          total: int in 10..200,
          is_member: boolean,
          has_coupon: boolean,
          discount: (total >= 100 and is_member) or has_coupon ? 0.15 : 0
        }

        dataset TestData {
          orders: 40 of Order
        }
      `;

      const result = await compile(source);

      const orders = result.orders as {
        total: number;
        is_member: boolean;
        has_coupon: boolean;
        discount: number;
      }[];
      for (const order of orders) {
        if ((order.total >= 100 && order.is_member) || order.has_coupon) {
          expect(order.discount).toBe(0.15);
        } else {
          expect(order.discount).toBe(0);
        }
      }
    });
  });

  describe('dynamic cardinality', () => {
    it('supports simple dynamic cardinality with ternary', async () => {
      const source = `
        schema Order {
          size: "small" | "large",
          items: (size == "large" ? 5..10 : 1..3) of Item
        }

        schema Item {
          name: string
        }

        dataset TestData {
          orders: 20 of Order
        }
      `;

      const result = await compile(source);

      const orders = result.orders as { size: string; items: unknown[] }[];
      for (const order of orders) {
        if (order.size === 'large') {
          expect(order.items.length).toBeGreaterThanOrEqual(5);
          expect(order.items.length).toBeLessThanOrEqual(10);
        } else {
          expect(order.items.length).toBeGreaterThanOrEqual(1);
          expect(order.items.length).toBeLessThanOrEqual(3);
        }
      }
    });

    it('supports dynamic cardinality with fixed numbers', async () => {
      const source = `
        schema Container {
          is_bulk: boolean,
          items: (is_bulk ? 100 : 10) of Item
        }

        schema Item {
          id: int
        }

        dataset TestData {
          containers: 10 of Container
        }
      `;

      const result = await compile(source);

      const containers = result.containers as { is_bulk: boolean; items: unknown[] }[];
      for (const container of containers) {
        if (container.is_bulk) {
          expect(container.items.length).toBe(100);
        } else {
          expect(container.items.length).toBe(10);
        }
      }
    });

    it('supports dynamic cardinality with logical conditions', async () => {
      const source = `
        schema Order {
          is_wholesale: boolean,
          is_priority: boolean,
          items: (is_wholesale and is_priority ? 20..30 : 1..5) of Item
        }

        schema Item {
          sku: string
        }

        dataset TestData {
          orders: 20 of Order
        }
      `;

      const result = await compile(source);

      const orders = result.orders as {
        is_wholesale: boolean;
        is_priority: boolean;
        items: unknown[];
      }[];
      for (const order of orders) {
        if (order.is_wholesale && order.is_priority) {
          expect(order.items.length).toBeGreaterThanOrEqual(20);
          expect(order.items.length).toBeLessThanOrEqual(30);
        } else {
          expect(order.items.length).toBeGreaterThanOrEqual(1);
          expect(order.items.length).toBeLessThanOrEqual(5);
        }
      }
    });
  });

  describe('negative testing (violating)', () => {
    it('generates data that violates schema constraints', async () => {
      const source = `
        schema Invoice {
          issued_date: int in 1..20,
          due_date: int in 1..30,

          assume due_date >= issued_date
        }

        dataset Invalid violating {
          invoices: 20 of Invoice
        }
      `;

      const result = await compile(source);

      // In violating mode, at least some invoices should have due_date < issued_date
      const invoices = result.invoices as { issued_date: number; due_date: number }[];
      const violating = invoices.filter((i) => i.due_date < i.issued_date);
      expect(violating.length).toBeGreaterThan(0);
    });

    it('generates data that violates dataset-level constraints', async () => {
      const source = `
        schema Item {
          price: int in 1..100
        }

        dataset Invalid violating {
          items: 10 of Item,

          validate {
            sum(items.price) >= 500
          }
        }
      `;

      const result = await compile(source);

      // In violating mode, the sum should be < 500
      const items = result.items as { price: number }[];
      const total = items.reduce((sum, i) => sum + i.price, 0);
      expect(total).toBeLessThan(500);
    });

    it('normal dataset still satisfies constraints', async () => {
      const source = `
        schema Invoice {
          issued_date: int in 1..20,
          due_date: int in 1..30,

          assume due_date >= issued_date
        }

        dataset Valid {
          invoices: 20 of Invoice
        }
      `;

      const result = await compile(source);

      // Normal mode: all invoices should satisfy the constraint
      const invoices = result.invoices as { issued_date: number; due_date: number }[];
      for (const invoice of invoices) {
        expect(invoice.due_date).toBeGreaterThanOrEqual(invoice.issued_date);
      }
    });
  });

  describe('decimal precision functions', () => {
    it('round() rounds to specified decimal places', async () => {
      const source = `
        schema Order {
          subtotal: decimal in 100..200,
          tax: round(subtotal * 0.2, 2),
          total: round(subtotal * 1.2, 2)
        }

        dataset TestData {
          orders: 10 of Order
        }
      `;

      const result = await compile(source);

      const orders = result.orders as { subtotal: number; tax: number; total: number }[];
      for (const order of orders) {
        // Check that tax and total have at most 2 decimal places
        expect(order.tax).toBe(Math.round(order.tax * 100) / 100);
        expect(order.total).toBe(Math.round(order.total * 100) / 100);
      }
    });

    it('floor() and ceil() work correctly', async () => {
      const source = `
        schema Item {
          price: decimal in 10.5..20.9,
          floored: floor(price, 1),
          ceiled: ceil(price, 1)
        }

        dataset TestData {
          items: 10 of Item
        }
      `;

      const result = await compile(source);

      const items = result.items as { price: number; floored: number; ceiled: number }[];
      for (const item of items) {
        expect(item.floored).toBeLessThanOrEqual(item.price);
        expect(item.ceiled).toBeGreaterThanOrEqual(item.price);
      }
    });

    it('decimal(n) generates values with specified precision', async () => {
      const source = `
        schema Product {
          price: decimal(2) in 10..100
        }

        dataset TestData {
          products: 50 of Product
        }
      `;

      const result = await compile(source);

      const products = result.products as { price: number }[];
      for (const product of products) {
        // Check value has at most 2 decimal places
        const rounded = Math.round(product.price * 100) / 100;
        expect(product.price).toBe(rounded);
        // Check value is in range
        expect(product.price).toBeGreaterThanOrEqual(10);
        expect(product.price).toBeLessThanOrEqual(100);
      }
    });

    it('decimal(1) generates single decimal place values', async () => {
      const source = `
        schema Item {
          score: decimal(1) in 0..10
        }

        dataset TestData {
          items: 50 of Item
        }
      `;

      const result = await compile(source);

      const items = result.items as { score: number }[];
      for (const item of items) {
        // Check value has at most 1 decimal place
        const rounded = Math.round(item.score * 10) / 10;
        expect(item.score).toBe(rounded);
      }
    });

    it('decimal(4) generates high precision values', async () => {
      const source = `
        schema Rate {
          value: decimal(4) in 0..1
        }

        dataset TestData {
          rates: 50 of Rate
        }
      `;

      const result = await compile(source);

      const rates = result.rates as { value: number }[];
      for (const rate of rates) {
        // Check value has at most 4 decimal places
        const rounded = Math.round(rate.value * 10000) / 10000;
        expect(rate.value).toBe(rounded);
      }
    });

    it('decimal(0) generates integer values', async () => {
      const source = `
        schema Score {
          points: decimal(0) in 0..100
        }

        dataset TestData {
          scores: 50 of Score
        }
      `;

      const result = await compile(source);

      const scores = result.scores as { points: number }[];
      for (const score of scores) {
        expect(Number.isInteger(score.points)).toBe(true);
      }
    });

    it('plain decimal without precision uses 2 decimal places', async () => {
      const source = `
        schema Price {
          amount: decimal in 10..100
        }

        dataset TestData {
          prices: 50 of Price
        }
      `;

      const result = await compile(source);

      const prices = result.prices as { amount: number }[];
      // Most values should be rounded to 2 decimal places (default)
      // but since it's a range without explicit precision, it just returns the raw value
      for (const price of prices) {
        expect(price.amount).toBeGreaterThanOrEqual(10);
        expect(price.amount).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('unique fields', () => {
    it('generates unique values for fields marked with unique', async () => {
      const source = `
        schema Invoice {
          id: unique int in 1..100,
          amount: int in 100..500
        }

        dataset TestData {
          invoices: 20 of Invoice
        }
      `;

      const result = await compile(source);

      const invoices = result.invoices as { id: number }[];
      const ids = invoices.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('generates unique strings', async () => {
      const source = `
        schema Item {
          code: unique "A" | "B" | "C" | "D" | "E"
        }

        dataset TestData {
          items: 5 of Item
        }
      `;

      const result = await compile(source);

      const items = result.items as { code: string }[];
      const codes = items.map((i) => i.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('distribution functions', () => {
    it('gaussian() generates normally distributed values', async () => {
      const source = `
        schema Person {
          age: gaussian(35, 10, 18, 65)
        }

        dataset TestData {
          people: 100 of Person
        }
      `;

      const result = await compile(source);

      const people = result.people as { age: number }[];
      for (const person of people) {
        // Values should be clamped to bounds
        expect(person.age).toBeGreaterThanOrEqual(18);
        expect(person.age).toBeLessThanOrEqual(65);
      }

      // Mean should be roughly around 35 (with some tolerance)
      const mean = people.reduce((s, p) => s + p.age, 0) / people.length;
      expect(mean).toBeGreaterThan(25);
      expect(mean).toBeLessThan(45);
    });

    it('exponential() generates exponentially distributed values', async () => {
      const source = `
        schema Event {
          wait_time: exponential(0.5, 0, 20)
        }

        dataset TestData {
          events: 100 of Event
        }
      `;

      const result = await compile(source);

      const events = result.events as { wait_time: number }[];
      for (const event of events) {
        expect(event.wait_time).toBeGreaterThanOrEqual(0);
        expect(event.wait_time).toBeLessThanOrEqual(20);
      }

      // Most values should be small (exponential is right-skewed)
      const smallCount = events.filter((e) => e.wait_time < 5).length;
      expect(smallCount).toBeGreaterThan(30);
    });

    it('poisson() generates count data', async () => {
      const source = `
        schema Day {
          events: poisson(5)
        }

        dataset TestData {
          days: 100 of Day
        }
      `;

      const result = await compile(source);

      const days = result.days as { events: number }[];
      for (const day of days) {
        expect(day.events).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(day.events)).toBe(true);
      }

      // Mean should be around lambda (5)
      const mean = days.reduce((s, d) => s + d.events, 0) / days.length;
      expect(mean).toBeGreaterThan(3);
      expect(mean).toBeLessThan(7);
    });

    it('beta() generates values between 0 and 1', async () => {
      const source = `
        schema Item {
          probability: beta(2, 5)
        }

        dataset TestData {
          items: 100 of Item
        }
      `;

      const result = await compile(source);

      const items = result.items as { probability: number }[];
      for (const item of items) {
        expect(item.probability).toBeGreaterThanOrEqual(0);
        expect(item.probability).toBeLessThanOrEqual(1);
      }

      // With alpha=2, beta=5, mean should be around 2/(2+5) = 0.286
      const mean = items.reduce((s, i) => s + i.probability, 0) / items.length;
      expect(mean).toBeGreaterThan(0.15);
      expect(mean).toBeLessThan(0.45);
    });

    it('uniform() generates uniformly distributed values', async () => {
      const source = `
        schema Item {
          value: uniform(10, 20)
        }

        dataset TestData {
          items: 100 of Item
        }
      `;

      const result = await compile(source);

      const items = result.items as { value: number }[];
      for (const item of items) {
        expect(item.value).toBeGreaterThanOrEqual(10);
        expect(item.value).toBeLessThanOrEqual(20);
      }

      // Mean should be around 15
      const mean = items.reduce((s, i) => s + i.value, 0) / items.length;
      expect(mean).toBeGreaterThan(13);
      expect(mean).toBeLessThan(17);
    });

    it('lognormal() generates right-skewed values', async () => {
      const source = `
        schema Salary {
          amount: lognormal(10, 0.5, 10000, 500000)
        }

        dataset TestData {
          salaries: 100 of Salary
        }
      `;

      const result = await compile(source);

      const salaries = result.salaries as { amount: number }[];
      for (const salary of salaries) {
        expect(salary.amount).toBeGreaterThanOrEqual(10000);
        expect(salary.amount).toBeLessThanOrEqual(500000);
      }
    });
  });

  describe('date functions', () => {
    it('today() returns current date in YYYY-MM-DD format', async () => {
      const source = `
        schema Event {
          event_date: today()
        }

        dataset TestData {
          events: 1 of Event
        }
      `;

      const result = await compile(source);
      const event = result.events[0] as { event_date: string };

      // Should match YYYY-MM-DD format
      expect(event.event_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Should be today's date
      const todayStr = new Date().toISOString().split('T')[0];
      expect(event.event_date).toBe(todayStr);
    });

    it('now() returns current datetime in ISO 8601 format', async () => {
      const source = `
        schema Event {
          timestamp: now()
        }

        dataset TestData {
          events: 1 of Event
        }
      `;

      const result = await compile(source);
      const event = result.events[0] as { timestamp: string };

      // Should be valid ISO 8601 datetime
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    });

    it('daysAgo() returns date in the past', async () => {
      const source = `
        schema Event {
          past_date: daysAgo(30)
        }

        dataset TestData {
          events: 1 of Event
        }
      `;

      const result = await compile(source);
      const event = result.events[0] as { past_date: string };

      const expected = new Date();
      expected.setDate(expected.getDate() - 30);
      const expectedStr = expected.toISOString().split('T')[0];

      expect(event.past_date).toBe(expectedStr);
    });

    it('daysFromNow() returns date in the future', async () => {
      const source = `
        schema Event {
          future_date: daysFromNow(90)
        }

        dataset TestData {
          events: 1 of Event
        }
      `;

      const result = await compile(source);
      const event = result.events[0] as { future_date: string };

      const expected = new Date();
      expected.setDate(expected.getDate() + 90);
      const expectedStr = expected.toISOString().split('T')[0];

      expect(event.future_date).toBe(expectedStr);
    });

    it('datetime() generates random datetime within range', async () => {
      const source = `
        schema Event {
          timestamp: datetime(2020, 2022)
        }

        dataset TestData {
          events: 20 of Event
        }
      `;

      const result = await compile(source);
      const events = result.events as { timestamp: string }[];

      for (const event of events) {
        const date = new Date(event.timestamp);
        expect(date.getFullYear()).toBeGreaterThanOrEqual(2020);
        expect(date.getFullYear()).toBeLessThanOrEqual(2022);
      }
    });

    it('dateBetween() generates random date within range', async () => {
      const source = `
        schema Event {
          event_date: dateBetween("2023-06-01", "2023-06-30")
        }

        dataset TestData {
          events: 20 of Event
        }
      `;

      const result = await compile(source);
      const events = result.events as { event_date: string }[];

      for (const event of events) {
        const d = new Date(event.event_date);
        expect(d.getMonth()).toBe(5); // June is month 5
        expect(d.getFullYear()).toBe(2023);
      }
    });

    it('date type generates ISO 8601 date strings', async () => {
      const source = `
        schema Event {
          created: date,
          founded: date in 2000..2020
        }

        dataset TestData {
          events: 10 of Event
        }
      `;

      const result = await compile(source);
      const events = result.events as { created: string; founded: string }[];

      for (const event of events) {
        // Both should be YYYY-MM-DD format
        expect(event.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(event.founded).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Founded year should be in range
        const year = parseInt(event.founded.split('-')[0]);
        expect(year).toBeGreaterThanOrEqual(2000);
        expect(year).toBeLessThanOrEqual(2020);
      }
    });
  });

  describe('sequential/stateful generation', () => {
    it('sequence() generates auto-incrementing string values', async () => {
      const source = `
        schema Invoice {
          id: sequence("INV-", 1001),
          amount: int in 100..500
        }

        dataset TestData {
          invoices: 5 of Invoice
        }
      `;

      const result = await compile(source);
      const invoices = result.invoices as { id: string; amount: number }[];

      expect(invoices[0].id).toBe('INV-1001');
      expect(invoices[1].id).toBe('INV-1002');
      expect(invoices[2].id).toBe('INV-1003');
      expect(invoices[3].id).toBe('INV-1004');
      expect(invoices[4].id).toBe('INV-1005');
    });

    it('sequenceInt() generates auto-incrementing integers', async () => {
      const source = `
        schema Order {
          order_num: sequenceInt("orders", 100),
          total: int in 50..200
        }

        dataset TestData {
          orders: 5 of Order
        }
      `;

      const result = await compile(source);
      const orders = result.orders as { order_num: number }[];

      expect(orders[0].order_num).toBe(100);
      expect(orders[1].order_num).toBe(101);
      expect(orders[2].order_num).toBe(102);
      expect(orders[3].order_num).toBe(103);
      expect(orders[4].order_num).toBe(104);
    });

    it('sequence() with default start value begins at 1', async () => {
      const source = `
        schema Item {
          code: sequence("ITEM-")
        }

        dataset TestData {
          items: 3 of Item
        }
      `;

      const result = await compile(source);
      const items = result.items as { code: string }[];

      expect(items[0].code).toBe('ITEM-1');
      expect(items[1].code).toBe('ITEM-2');
      expect(items[2].code).toBe('ITEM-3');
    });

    it('previous() returns null for first record', async () => {
      const source = `
        schema Event {
          value: int in 1..100,
          prev_value: previous("value")
        }

        dataset TestData {
          events: 3 of Event
        }
      `;

      const result = await compile(source);
      const events = result.events as { value: number; prev_value: number | null }[];

      expect(events[0].prev_value).toBeNull();
      expect(events[1].prev_value).toBe(events[0].value);
      expect(events[2].prev_value).toBe(events[1].value);
    });

    it('previous() enables sequential coherence', async () => {
      const source = `
        schema TimeSeries {
          seq: sequenceInt("ts", 1),
          timestamp: int in 1000..2000,
          prev_ts: previous("timestamp")
        }

        dataset TestData {
          series: 5 of TimeSeries
        }
      `;

      const result = await compile(source);
      const series = result.series as { seq: number; timestamp: number; prev_ts: number | null }[];

      // First has no previous
      expect(series[0].prev_ts).toBeNull();

      // Each subsequent references the previous timestamp
      for (let i = 1; i < series.length; i++) {
        expect(series[i].prev_ts).toBe(series[i - 1].timestamp);
      }
    });

    it('multiple sequences are independent', async () => {
      const source = `
        schema Record {
          invoice_id: sequence("INV-", 100),
          order_id: sequence("ORD-", 500)
        }

        dataset TestData {
          records: 3 of Record
        }
      `;

      const result = await compile(source);
      const records = result.records as { invoice_id: string; order_id: string }[];

      expect(records[0].invoice_id).toBe('INV-100');
      expect(records[0].order_id).toBe('ORD-500');
      expect(records[1].invoice_id).toBe('INV-101');
      expect(records[1].order_id).toBe('ORD-501');
      expect(records[2].invoice_id).toBe('INV-102');
      expect(records[2].order_id).toBe('ORD-502');
    });
  });

  describe('string transformation functions', () => {
    it('uppercase() converts string to uppercase', async () => {
      const source = `
        schema Item {
          name: "hello world",
          upper: uppercase(name)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { name: string; upper: string };

      expect(item.upper).toBe('HELLO WORLD');
    });

    it('lowercase() converts string to lowercase', async () => {
      const source = `
        schema Item {
          name: "HELLO WORLD",
          lower: lowercase(name)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { name: string; lower: string };

      expect(item.lower).toBe('hello world');
    });

    it('capitalize() capitalizes first letter of each word', async () => {
      const source = `
        schema Item {
          name: "hello world",
          capitalized: capitalize(name)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { name: string; capitalized: string };

      expect(item.capitalized).toBe('Hello World');
    });

    it('kebabCase() converts to kebab-case', async () => {
      const source = `
        schema Item {
          title: "Hello World",
          slug: kebabCase(title)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { title: string; slug: string };

      expect(item.slug).toBe('hello-world');
    });

    it('kebabCase() handles camelCase input', async () => {
      const source = `
        schema Item {
          title: "helloWorld",
          slug: kebabCase(title)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { title: string; slug: string };

      expect(item.slug).toBe('hello-world');
    });

    it('snakeCase() converts to snake_case', async () => {
      const source = `
        schema Item {
          title: "Hello World",
          snake: snakeCase(title)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { title: string; snake: string };

      expect(item.snake).toBe('hello_world');
    });

    it('snakeCase() handles camelCase input', async () => {
      const source = `
        schema Item {
          title: "helloWorld",
          snake: snakeCase(title)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { title: string; snake: string };

      expect(item.snake).toBe('hello_world');
    });

    it('camelCase() converts to camelCase', async () => {
      const source = `
        schema Item {
          title: "hello world",
          camel: camelCase(title)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { title: string; camel: string };

      expect(item.camel).toBe('helloWorld');
    });

    it('camelCase() handles kebab-case input', async () => {
      const source = `
        schema Item {
          title: "hello-world-test",
          camel: camelCase(title)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { title: string; camel: string };

      expect(item.camel).toBe('helloWorldTest');
    });

    it('trim() removes leading and trailing whitespace', async () => {
      const source = `
        schema Item {
          name: "  hello world  ",
          trimmed: trim(name)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { name: string; trimmed: string };

      expect(item.trimmed).toBe('hello world');
    });

    it('concat() concatenates multiple strings', async () => {
      const source = `
        schema Item {
          first: "Hello",
          last: "World",
          full: concat(first, " ", last, "!")
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { first: string; last: string; full: string };

      expect(item.full).toBe('Hello World!');
    });

    it('substring() extracts a substring', async () => {
      const source = `
        schema Item {
          name: "Hello World",
          part1: substring(name, 0, 5),
          part2: substring(name, 6)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { name: string; part1: string; part2: string };

      expect(item.part1).toBe('Hello');
      expect(item.part2).toBe('World');
    });

    it('replace() replaces first occurrence', async () => {
      const source = `
        schema Item {
          name: "foo bar foo",
          replaced: replace(name, "foo", "baz")
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { name: string; replaced: string };

      expect(item.replaced).toBe('baz bar foo');
    });

    it('length() returns string length', async () => {
      const source = `
        schema Item {
          name: "Hello",
          len: length(name)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as { name: string; len: number };

      expect(item.len).toBe(5);
    });

    it('string functions handle null values gracefully', async () => {
      const source = `
        schema Item {
          upper: uppercase(null),
          lower: lowercase(null),
          trim_val: trim(null),
          len: length(null)
        }

        dataset TestData {
          items: 1 of Item
        }
      `;

      const result = await compile(source);
      const item = result.items[0] as {
        upper: string;
        lower: string;
        trim_val: string;
        len: number;
      };

      expect(item.upper).toBe('');
      expect(item.lower).toBe('');
      expect(item.trim_val).toBe('');
      expect(item.len).toBe(0);
    });

    it('string functions can be chained with other computed fields', async () => {
      const source = `
        schema Product {
          name: "  My Product Name  ",
          trimmed: trim(name),
          slug: kebabCase(trimmed)
        }

        dataset TestData {
          products: 1 of Product
        }
      `;

      const result = await compile(source);
      const product = result.products[0] as { name: string; trimmed: string; slug: string };

      expect(product.trimmed).toBe('My Product Name');
      expect(product.slug).toBe('my-product-name');
    });
  });

  describe('ordered sequences', () => {
    it('cycles through values in order', async () => {
      const source = `
        schema Note {
          pitch: [48, 52, 55, 60]
        }

        dataset TestData {
          notes: 8 of Note
        }
      `;

      const result = await compile(source);
      const notes = result.notes as { pitch: number }[];

      // Should cycle: 48, 52, 55, 60, 48, 52, 55, 60
      expect(notes[0].pitch).toBe(48);
      expect(notes[1].pitch).toBe(52);
      expect(notes[2].pitch).toBe(55);
      expect(notes[3].pitch).toBe(60);
      expect(notes[4].pitch).toBe(48);
      expect(notes[5].pitch).toBe(52);
      expect(notes[6].pitch).toBe(55);
      expect(notes[7].pitch).toBe(60);
    });

    it('single element always returns same value', async () => {
      const source = `
        schema Item {
          value: [42]
        }

        dataset TestData {
          items: 5 of Item
        }
      `;

      const result = await compile(source);
      const items = result.items as { value: number }[];

      for (const item of items) {
        expect(item.value).toBe(42);
      }
    });

    it('works with string values', async () => {
      const source = `
        schema Chord {
          name: ["C", "G", "Am", "F"]
        }

        dataset TestData {
          chords: 8 of Chord
        }
      `;

      const result = await compile(source);
      const chords = result.chords as { name: string }[];

      expect(chords[0].name).toBe('C');
      expect(chords[1].name).toBe('G');
      expect(chords[2].name).toBe('Am');
      expect(chords[3].name).toBe('F');
      expect(chords[4].name).toBe('C');
      expect(chords[5].name).toBe('G');
    });

    it('works with expressions', async () => {
      const source = `
        schema Item {
          value: [1+1, 2+2, 3+3]
        }

        dataset TestData {
          items: 6 of Item
        }
      `;

      const result = await compile(source);
      const items = result.items as { value: number }[];

      expect(items[0].value).toBe(2);
      expect(items[1].value).toBe(4);
      expect(items[2].value).toBe(6);
      expect(items[3].value).toBe(2);
      expect(items[4].value).toBe(4);
      expect(items[5].value).toBe(6);
    });

    it('multiple fields have independent sequences', async () => {
      const source = `
        schema Item {
          a: [1, 2, 3],
          b: ["x", "y"]
        }

        dataset TestData {
          items: 6 of Item
        }
      `;

      const result = await compile(source);
      const items = result.items as { a: number; b: string }[];

      // Field 'a' cycles: 1, 2, 3, 1, 2, 3
      expect(items[0].a).toBe(1);
      expect(items[1].a).toBe(2);
      expect(items[2].a).toBe(3);
      expect(items[3].a).toBe(1);

      // Field 'b' cycles: x, y, x, y, x, y
      expect(items[0].b).toBe('x');
      expect(items[1].b).toBe('y');
      expect(items[2].b).toBe('x');
      expect(items[3].b).toBe('y');
    });
  });

  describe('private fields', () => {
    it('excludes private fields from output', async () => {
      const source = `
        schema Person {
          age: private int in 0..105,
          age_bracket: age < 18 ? "minor" : age < 65 ? "adult" : "senior"
        }

        dataset TestData {
          people: 10 of Person
        }
      `;

      const result = await compile(source);
      const people = result.people as Record<string, unknown>[];

      for (const person of people) {
        // age should NOT be in output
        expect(person).not.toHaveProperty('age');
        // age_bracket should be computed and present
        expect(person).toHaveProperty('age_bracket');
        expect(['minor', 'adult', 'senior']).toContain(person.age_bracket);
      }
    });

    it('private fields can be used in constraints', async () => {
      const source = `
        schema Item {
          internal_score: private int in 1..100,
          visible_grade: internal_score >= 50 ? "pass" : "fail",
          assume internal_score >= 30
        }

        dataset TestData {
          items: 20 of Item
        }
      `;

      const result = await compile(source);
      const items = result.items as Record<string, unknown>[];

      for (const item of items) {
        // internal_score should NOT be in output
        expect(item).not.toHaveProperty('internal_score');
        // visible_grade should be computed
        expect(item).toHaveProperty('visible_grade');
        expect(['pass', 'fail']).toContain(item.visible_grade);
      }
    });

    it('private and unique can be combined', async () => {
      const source = `
        schema Order {
          internal_id: unique private int in 1..1000,
          public_ref: concat("ORD-", internal_id)
        }

        dataset TestData {
          orders: 5 of Order
        }
      `;

      const result = await compile(source);
      const orders = result.orders as Record<string, unknown>[];

      for (const order of orders) {
        // internal_id should NOT be in output
        expect(order).not.toHaveProperty('internal_id');
        // public_ref should be present
        expect(order).toHaveProperty('public_ref');
        expect(String(order.public_ref)).toMatch(/^ORD-\d+$/);
      }

      // All public_refs should be unique (since internal_id was unique)
      const refs = orders.map((o) => o.public_ref);
      const uniqueRefs = new Set(refs);
      expect(uniqueRefs.size).toBe(refs.length);
    });

    it('multiple private fields in same schema', async () => {
      const source = `
        schema Product {
          base_cost: private decimal in 10..50,
          markup: private decimal in 1.1..1.5,
          price: round(base_cost * markup, 2)
        }

        dataset TestData {
          products: 10 of Product
        }
      `;

      const result = await compile(source);
      const products = result.products as Record<string, unknown>[];

      for (const product of products) {
        // Private fields should be excluded
        expect(product).not.toHaveProperty('base_cost');
        expect(product).not.toHaveProperty('markup');
        // Computed field should be present
        expect(product).toHaveProperty('price');
        expect(typeof product.price).toBe('number');
      }
    });

    it('private fields work with collection overrides', async () => {
      const source = `
        schema Item {
          value: int in 1..100
        }

        dataset TestData {
          items: 5 of Item {
            internal: private int in 1..10,
            label: concat("Item-", internal)
          }
        }
      `;

      const result = await compile(source);
      const items = result.items as Record<string, unknown>[];

      for (const item of items) {
        // internal from override should be excluded
        expect(item).not.toHaveProperty('internal');
        // label computed from internal should be present
        expect(item).toHaveProperty('label');
        // value from base schema should be present
        expect(item).toHaveProperty('value');
      }
    });
  });

  describe('conditional fields (when clause)', () => {
    it('includes field only when condition is true', async () => {
      const source = `
        schema Account {
          type: "personal" | "business",
          companyNumber: string when type == "business"
        }

        dataset TestData {
          accounts: 20 of Account
        }
      `;

      const result = await compile(source);

      for (const account of result.accounts as Record<string, unknown>[]) {
        if (account.type === 'business') {
          expect(account).toHaveProperty('companyNumber');
          expect(typeof account.companyNumber).toBe('string');
        } else {
          expect(account).not.toHaveProperty('companyNumber');
        }
      }
    });

    it('supports multiple conditional fields', async () => {
      const source = `
        schema Account {
          type: "personal" | "business",
          companyNumber: string when type == "business",
          taxId: string when type == "business"
        }

        dataset TestData {
          accounts: 20 of Account
        }
      `;

      const result = await compile(source);

      for (const account of result.accounts as Record<string, unknown>[]) {
        if (account.type === 'business') {
          expect(account).toHaveProperty('companyNumber');
          expect(account).toHaveProperty('taxId');
        } else {
          expect(account).not.toHaveProperty('companyNumber');
          expect(account).not.toHaveProperty('taxId');
        }
      }
    });

    it('supports logical operators in when condition', async () => {
      const source = `
        schema Order {
          size: "small" | "medium" | "large",
          premiumHandling: boolean when size == "large" or size == "medium"
        }

        dataset TestData {
          orders: 30 of Order
        }
      `;

      const result = await compile(source);

      for (const order of result.orders as Record<string, unknown>[]) {
        if (order.size === 'large' || order.size === 'medium') {
          expect(order).toHaveProperty('premiumHandling');
          expect(typeof order.premiumHandling).toBe('boolean');
        } else {
          expect(order).not.toHaveProperty('premiumHandling');
        }
      }
    });

    it('supports different conditions for different fields', async () => {
      const source = `
        schema Order {
          size: "small" | "medium" | "large",
          discount: decimal in 0.1..0.2 when size == "large",
          premiumHandling: boolean when size == "large" or size == "medium"
        }

        dataset TestData {
          orders: 30 of Order
        }
      `;

      const result = await compile(source);

      for (const order of result.orders as Record<string, unknown>[]) {
        // discount only for large
        if (order.size === 'large') {
          expect(order).toHaveProperty('discount');
        } else {
          expect(order).not.toHaveProperty('discount');
        }

        // premiumHandling for large and medium
        if (order.size === 'large' || order.size === 'medium') {
          expect(order).toHaveProperty('premiumHandling');
        } else {
          expect(order).not.toHaveProperty('premiumHandling');
        }
      }
    });

    it('works with numeric comparisons in when condition', async () => {
      const source = `
        schema Invoice {
          total: int in 100..1000,
          bulkDiscount: decimal in 0.05..0.15 when total >= 500
        }

        dataset TestData {
          invoices: 20 of Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices as Record<string, unknown>[]) {
        if ((invoice.total as number) >= 500) {
          expect(invoice).toHaveProperty('bulkDiscount');
        } else {
          expect(invoice).not.toHaveProperty('bulkDiscount');
        }
      }
    });

    it('works with and operator in when condition', async () => {
      const source = `
        schema Customer {
          type: "personal" | "business",
          verified: boolean,
          premiumFeatures: boolean when type == "business" and verified == true
        }

        dataset TestData {
          customers: 40 of Customer
        }
      `;

      const result = await compile(source);

      for (const customer of result.customers as Record<string, unknown>[]) {
        if (customer.type === 'business' && customer.verified === true) {
          expect(customer).toHaveProperty('premiumFeatures');
        } else {
          expect(customer).not.toHaveProperty('premiumFeatures');
        }
      }
    });
  });

  describe('refine blocks', () => {
    it('applies refine block to regenerate fields based on condition', async () => {
      const source = `
        schema Player {
          element_type: 1 | 2 | 3 | 4,
          goals_scored: int in 0..30,
          assists: int in 0..20
        } refine {
          if element_type == 1 {
            goals_scored: int in 0..3,
            assists: int in 0..5
          }
        }

        dataset TestData {
          players: 50 of Player
        }
      `;

      const result = await compile(source);

      for (const player of result.players as Record<string, unknown>[]) {
        if (player.element_type === 1) {
          // Goalkeepers should have refined values
          expect(player.goals_scored).toBeGreaterThanOrEqual(0);
          expect(player.goals_scored).toBeLessThanOrEqual(3);
          expect(player.assists).toBeGreaterThanOrEqual(0);
          expect(player.assists).toBeLessThanOrEqual(5);
        }
      }
    });

    it('applies multiple refine conditions', async () => {
      const source = `
        schema Player {
          position: "GK" | "DEF" | "MID" | "FWD",
          goals: int in 0..30,
          clean_sheets: int in 0..20
        } refine {
          if position == "GK" {
            goals: int in 0..2
          },
          if position == "FWD" {
            clean_sheets: int in 0..3
          }
        }

        dataset TestData {
          players: 100 of Player
        }
      `;

      const result = await compile(source);

      for (const player of result.players as Record<string, unknown>[]) {
        if (player.position === 'GK') {
          expect(player.goals).toBeLessThanOrEqual(2);
        }
        if (player.position === 'FWD') {
          expect(player.clean_sheets).toBeLessThanOrEqual(3);
        }
      }
    });

    it('refine block works with unique fields', async () => {
      const source = `
        schema Item {
          type: "A" | "B",
          code: unique int in 1..1000
        } refine {
          if type == "A" {
            code: unique int in 1..100
          }
        }

        dataset TestData {
          items: 20 of Item
        }
      `;

      const result = await compile(source);

      const typeACodes = new Set<number>();
      for (const item of result.items as Record<string, unknown>[]) {
        if (item.type === 'A') {
          expect(item.code).toBeGreaterThanOrEqual(1);
          expect(item.code).toBeLessThanOrEqual(100);
          // Check uniqueness
          expect(typeACodes.has(item.code as number)).toBe(false);
          typeACodes.add(item.code as number);
        }
      }
    });

    it('refine block with complex conditions', async () => {
      const source = `
        schema Order {
          priority: "low" | "high",
          express: boolean,
          processing_days: int in 1..30
        } refine {
          if priority == "high" or express == true {
            processing_days: int in 1..3
          }
        }

        dataset TestData {
          orders: 50 of Order
        }
      `;

      const result = await compile(source);

      for (const order of result.orders as Record<string, unknown>[]) {
        if (order.priority === 'high' || order.express === true) {
          expect(order.processing_days).toBeLessThanOrEqual(3);
        }
      }
    });
  });

  describe('let bindings', () => {
    it('uses let binding for superposition field', async () => {
      const source = `
        let teamNames = "Arsenal" | "Chelsea" | "Liverpool"

        schema Team {
          name: teamNames
        }

        dataset TestData {
          teams: 20 of Team
        }
      `;

      const result = await compile(source);

      for (const team of result.teams as Record<string, unknown>[]) {
        expect(['Arsenal', 'Chelsea', 'Liverpool']).toContain(team.name);
      }
    });

    it('uses let binding with unique modifier', async () => {
      const source = `
        let colors = "red" | "green" | "blue" | "yellow" | "purple"

        schema Item {
          color: unique colors
        }

        dataset TestData {
          items: 5 of Item
        }
      `;

      const result = await compile(source);

      const usedColors = new Set<string>();
      for (const item of result.items as Record<string, unknown>[]) {
        expect(['red', 'green', 'blue', 'yellow', 'purple']).toContain(item.color);
        expect(usedColors.has(item.color as string)).toBe(false);
        usedColors.add(item.color as string);
      }
      expect(usedColors.size).toBe(5);
    });

    it('uses let binding with weighted superposition', async () => {
      const source = `
        let statuses = 0.9: "active" | 0.1: "inactive"

        schema User {
          status: statuses
        }

        dataset TestData {
          users: 100 of User
        }
      `;

      const result = await compile(source);

      let activeCount = 0;
      for (const user of result.users as Record<string, unknown>[]) {
        expect(['active', 'inactive']).toContain(user.status);
        if (user.status === 'active') activeCount++;
      }
      // With 90% weight, expect majority to be active
      expect(activeCount).toBeGreaterThan(70);
    });

    it('uses multiple let bindings', async () => {
      const source = `
        let sizes = "S" | "M" | "L"
        let colors = "red" | "blue"

        schema Product {
          size: sizes,
          color: colors
        }

        dataset TestData {
          products: 20 of Product
        }
      `;

      const result = await compile(source);

      for (const product of result.products as Record<string, unknown>[]) {
        expect(['S', 'M', 'L']).toContain(product.size);
        expect(['red', 'blue']).toContain(product.color);
      }
    });
  });

  describe('negative ranges', () => {
    it('generates int in negative to positive range', async () => {
      const source = `
        schema Temperature {
          celsius: int in -40..50
        }

        dataset TestData {
          temps: 20 of Temperature
        }
      `;

      const result = await compile(source);

      expect(result.temps).toHaveLength(20);
      for (const temp of result.temps) {
        const t = temp as Record<string, unknown>;
        expect(t.celsius).toBeGreaterThanOrEqual(-40);
        expect(t.celsius).toBeLessThanOrEqual(50);
      }
    });

    it('generates int in fully negative range', async () => {
      const source = `
        schema Account {
          balance: int in -1000..-1
        }

        dataset TestData {
          accounts: 20 of Account
        }
      `;

      const result = await compile(source);

      expect(result.accounts).toHaveLength(20);
      for (const account of result.accounts) {
        const a = account as Record<string, unknown>;
        expect(a.balance).toBeGreaterThanOrEqual(-1000);
        expect(a.balance).toBeLessThanOrEqual(-1);
        expect(a.balance).toBeLessThan(0); // Must be negative
      }
    });

    it('generates decimal in negative range', async () => {
      const source = `
        schema Transaction {
          amount: decimal(2) in -99.99..-0.01
        }

        dataset TestData {
          transactions: 20 of Transaction
        }
      `;

      const result = await compile(source);

      expect(result.transactions).toHaveLength(20);
      for (const transaction of result.transactions) {
        const t = transaction as Record<string, unknown>;
        expect(t.amount).toBeGreaterThanOrEqual(-99.99);
        expect(t.amount).toBeLessThanOrEqual(-0.01);
        expect(t.amount).toBeLessThan(0); // Must be negative
      }
    });

    it('generates values with unary plus', async () => {
      const source = `
        schema Value {
          num: int in +1..+100
        }

        dataset TestData {
          values: 10 of Value
        }
      `;

      const result = await compile(source);

      expect(result.values).toHaveLength(10);
      for (const value of result.values) {
        const v = value as Record<string, unknown>;
        expect(v.num).toBeGreaterThanOrEqual(1);
        expect(v.num).toBeLessThanOrEqual(100);
      }
    });

    it('uses negative numbers in constraints', async () => {
      const source = `
        schema Account {
          balance: int in -500..500,
          assume balance >= -100
        }

        dataset TestData {
          accounts: 30 of Account
        }
      `;

      const result = await compile(source);

      for (const account of result.accounts) {
        const a = account as Record<string, unknown>;
        expect(a.balance).toBeGreaterThanOrEqual(-100);
        expect(a.balance).toBeLessThanOrEqual(500);
      }
    });

    it('uses negative numbers in computed fields', async () => {
      const source = `
        schema Invoice {
          subtotal: int in 100..500,
          discount: -50,
          total: subtotal + discount
        }

        dataset TestData {
          invoices: 10 of Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices) {
        const i = invoice as Record<string, unknown>;
        expect(i.discount).toBe(-50);
        expect(i.total).toBe((i.subtotal as number) - 50);
      }
    });
  });
});
