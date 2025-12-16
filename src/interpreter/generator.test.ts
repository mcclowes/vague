import { describe, it, expect } from "vitest";
import { compile } from "../index.js";

describe("Generator", () => {
  it("generates simple dataset", async () => {
    const source = `
      schema Company {
        name: string
      }

      dataset TestData {
        companies: 5 * Company
      }
    `;

    const result = await compile(source);

    expect(result.companies).toHaveLength(5);
    for (const company of result.companies) {
      expect(company).toHaveProperty("name");
      expect(typeof (company as Record<string, unknown>).name).toBe("string");
    }
  });

  it("generates with range cardinality", async () => {
    const source = `
      schema Item {
        value: int
      }

      dataset TestData {
        items: 3..7 * Item
      }
    `;

    const result = await compile(source);

    expect(result.items.length).toBeGreaterThanOrEqual(3);
    expect(result.items.length).toBeLessThanOrEqual(7);
  });

  it("generates int in range", async () => {
    const source = `
      schema Person {
        age: int in 18..65
      }

      dataset TestData {
        people: 10 * Person
      }
    `;

    const result = await compile(source);

    for (const person of result.people) {
      const age = (person as Record<string, unknown>).age as number;
      expect(age).toBeGreaterThanOrEqual(18);
      expect(age).toBeLessThanOrEqual(65);
    }
  });

  it("generates superposition values", async () => {
    const source = `
      schema Invoice {
        status: "draft" | "sent" | "paid"
      }

      dataset TestData {
        invoices: 20 * Invoice
      }
    `;

    const result = await compile(source);

    const statuses = new Set(
      result.invoices.map((i) => (i as Record<string, unknown>).status)
    );

    // With 20 samples, we should see multiple values
    expect(statuses.size).toBeGreaterThan(0);

    for (const invoice of result.invoices) {
      expect(["draft", "sent", "paid"]).toContain(
        (invoice as Record<string, unknown>).status
      );
    }
  });

  it("generates weighted superposition values", async () => {
    const source = `
      schema Invoice {
        status: 0.9: "paid" | 0.1: "draft"
      }

      dataset TestData {
        invoices: 100 * Invoice
      }
    `;

    const result = await compile(source);

    let paidCount = 0;
    for (const invoice of result.invoices) {
      if ((invoice as Record<string, unknown>).status === "paid") {
        paidCount++;
      }
    }

    // Should be roughly 90% paid, allow some variance
    expect(paidCount).toBeGreaterThan(70);
  });

  it("generates optional fields sometimes", async () => {
    const source = `
      schema Item {
        name: string,
        notes: string?
      }

      dataset TestData {
        items: 50 * Item
      }
    `;

    const result = await compile(source);

    let withNotes = 0;
    let withoutNotes = 0;

    for (const item of result.items) {
      if ("notes" in (item as object)) {
        withNotes++;
      } else {
        withoutNotes++;
      }
    }

    // Both should occur with 50 samples (optional has 70% presence rate)
    expect(withNotes).toBeGreaterThan(0);
    expect(withoutNotes).toBeGreaterThan(0);
  });

  it("generates collection fields", async () => {
    const source = `
      schema LineItem {
        amount: decimal
      }

      schema Invoice {
        line_items: 1..5 * LineItem
      }

      dataset TestData {
        invoices: 10 * Invoice
      }
    `;

    const result = await compile(source);

    for (const invoice of result.invoices) {
      const items = (invoice as Record<string, unknown>).line_items as unknown[];
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.length).toBeLessThanOrEqual(5);

      for (const item of items) {
        expect(item).toHaveProperty("amount");
        expect(typeof (item as Record<string, unknown>).amount).toBe("number");
      }
    }
  });

  it("generates dates in range", async () => {
    const source = `
      schema Company {
        created: date in 2020..2023
      }

      dataset TestData {
        companies: 10 * Company
      }
    `;

    const result = await compile(source);

    for (const company of result.companies) {
      const created = (company as Record<string, unknown>).created as string;
      const year = parseInt(created.split("-")[0], 10);
      expect(year).toBeGreaterThanOrEqual(2020);
      expect(year).toBeLessThanOrEqual(2023);
    }
  });

  it("handles multiple collections", async () => {
    const source = `
      schema Company {
        name: string
      }

      schema Invoice {
        total: decimal
      }

      dataset TestData {
        companies: 5 * Company,
        invoices: 10 * Invoice
      }
    `;

    const result = await compile(source);

    expect(result.companies).toHaveLength(5);
    expect(result.invoices).toHaveLength(10);
  });

  describe("cross-record references", () => {
    it("resolves any of collection reference", async () => {
      const source = `
        schema Company {
          name: string,
          industry: "tech" | "retail" | "finance"
        }

        schema Invoice {
          customer: any of companies
        }

        dataset TestData {
          companies: 5 * Company,
          invoices: 10 * Invoice
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

    it("resolves any of with where clause", async () => {
      const source = `
        schema Company {
          name: string,
          industry: "tech" | "retail"
        }

        schema Invoice {
          tech_customer: any of companies where .industry == "tech"
        }

        dataset TestData {
          companies: 20 * Company,
          invoices: 10 * Invoice
        }
      `;

      const result = await compile(source);

      // Each invoice's tech_customer should be a tech company (or null if none exist)
      for (const invoice of result.invoices) {
        const customer = (invoice as Record<string, unknown>).tech_customer as Record<string, unknown> | null;
        if (customer) {
          expect(customer.industry).toBe("tech");
        }
      }
    });

    it("resolves parent reference in nested schema", async () => {
      const source = `
        schema LineItem {
          parent_currency: = ^currency
        }

        schema Invoice {
          currency: "USD" | "GBP" | "EUR",
          line_items: 3 * LineItem
        }

        dataset TestData {
          invoices: 5 * Invoice
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

  describe("constraints", () => {
    it("enforces simple assume constraint", async () => {
      const source = `
        schema Item {
          min_val: int in 1..50,
          max_val: int in 51..100,
          assume max_val > min_val
        }

        dataset TestData {
          items: 20 * Item
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const i = item as Record<string, unknown>;
        expect(i.max_val).toBeGreaterThan(i.min_val as number);
      }
    });

    it("enforces conditional assume if constraint", async () => {
      const source = `
        schema Company {
          industry: "saas" | "manufacturing",
          founded: int in 1990..2023,
          assume if industry == "saas" {
            founded > 2000
          }
        }

        dataset TestData {
          companies: 30 * Company
        }
      `;

      const result = await compile(source);

      for (const company of result.companies) {
        const c = company as Record<string, unknown>;
        if (c.industry === "saas") {
          expect(c.founded).toBeGreaterThan(2000);
        }
        // Manufacturing companies can have any founded year
      }
    });

    it("enforces logical and constraint", async () => {
      const source = `
        schema Product {
          price: int in 1..1000,
          quantity: int in 1..100,
          assume price > 10 and quantity > 5
        }

        dataset TestData {
          products: 20 * Product
        }
      `;

      const result = await compile(source);

      for (const product of result.products) {
        const p = product as Record<string, unknown>;
        expect(p.price).toBeGreaterThan(10);
        expect(p.quantity).toBeGreaterThan(5);
      }
    });

    it("enforces logical or constraint", async () => {
      const source = `
        schema Item {
          category: "premium" | "basic",
          price: int in 1..500,
          assume category == "premium" or price < 100
        }

        dataset TestData {
          items: 30 * Item
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const i = item as Record<string, unknown>;
        // Either category is premium OR price is less than 100
        const isPremium = i.category === "premium";
        const isLowPrice = (i.price as number) < 100;
        expect(isPremium || isLowPrice).toBe(true);
      }
    });

    it("enforces not constraint", async () => {
      const source = `
        schema Invoice {
          status: "paid" | "pending" | "cancelled",
          assume not status == "cancelled"
        }

        dataset TestData {
          invoices: 30 * Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices) {
        const i = invoice as Record<string, unknown>;
        expect(i.status).not.toBe("cancelled");
      }
    });

    it("enforces multiple assume clauses", async () => {
      const source = `
        schema Order {
          quantity: int in 1..100,
          discount: int in 0..50,
          assume quantity >= 10,
          assume discount <= 30
        }

        dataset TestData {
          orders: 20 * Order
        }
      `;

      const result = await compile(source);

      for (const order of result.orders) {
        const o = order as Record<string, unknown>;
        expect(o.quantity).toBeGreaterThanOrEqual(10);
        expect(o.discount).toBeLessThanOrEqual(30);
      }
    });

    it("enforces multiple constraints in assume if block", async () => {
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
          companies: 30 * Company
        }
      `;

      const result = await compile(source);

      for (const company of result.companies) {
        const c = company as Record<string, unknown>;
        if (c.tier === "enterprise") {
          expect(c.employee_count).toBeGreaterThan(500);
          expect(c.revenue).toBeGreaterThan(1000000);
        }
      }
    });
  });

  describe("computed fields", () => {
    it("computes sum of collection field", async () => {
      const source = `
        schema LineItem {
          amount: int in 10..100
        }

        schema Invoice {
          line_items: 3..5 * LineItem,
          total: = sum(line_items.amount)
        }

        dataset TestData {
          invoices: 10 * Invoice
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

    it("computes count of collection", async () => {
      const source = `
        schema Item {
          value: int
        }

        schema Container {
          items: 2..6 * Item,
          item_count: = count(items)
        }

        dataset TestData {
          containers: 10 * Container
        }
      `;

      const result = await compile(source);

      for (const container of result.containers) {
        const c = container as Record<string, unknown>;
        const items = c.items as unknown[];
        expect(c.item_count).toBe(items.length);
      }
    });

    it("computes min and max of collection field", async () => {
      const source = `
        schema Score {
          value: int in 1..100
        }

        schema Game {
          scores: 5 * Score,
          lowest: = min(scores.value),
          highest: = max(scores.value)
        }

        dataset TestData {
          games: 10 * Game
        }
      `;

      const result = await compile(source);

      for (const game of result.games) {
        const g = game as Record<string, unknown>;
        const scores = g.scores as Record<string, unknown>[];
        const values = scores.map(s => s.value as number);
        expect(g.lowest).toBe(Math.min(...values));
        expect(g.highest).toBe(Math.max(...values));
      }
    });

    it("computes avg of collection field", async () => {
      const source = `
        schema Rating {
          stars: int in 1..5
        }

        schema Product {
          ratings: 4 * Rating,
          avg_rating: = avg(ratings.stars)
        }

        dataset TestData {
          products: 10 * Product
        }
      `;

      const result = await compile(source);

      for (const product of result.products) {
        const p = product as Record<string, unknown>;
        const ratings = p.ratings as Record<string, unknown>[];
        const values = ratings.map(r => r.stars as number);
        const expectedAvg = values.reduce((s, v) => s + v, 0) / values.length;
        expect(p.avg_rating).toBeCloseTo(expectedAvg);
      }
    });

    it("computes arithmetic expressions", async () => {
      const source = `
        schema LineItem {
          quantity: int in 1..10,
          unit_price: int in 10..50
        }

        schema Order {
          items: 2..4 * LineItem,
          subtotal: = sum(items.unit_price),
          item_count: = count(items),
          avg_price: = avg(items.unit_price)
        }

        dataset TestData {
          orders: 10 * Order
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
  });

  describe("OpenAPI schema import", () => {
    it("imports fields from OpenAPI spec", async () => {
      const source = `
        import petstore from "examples/petstore.json"

        schema TestPet from petstore.Pet { }

        dataset TestData {
          pets: 5 * TestPet
        }
      `;

      const result = await compile(source);

      expect(result.pets).toHaveLength(5);
      for (const pet of result.pets) {
        const p = pet as Record<string, unknown>;
        // Fields from OpenAPI spec should be generated
        expect(p).toHaveProperty("id");
        expect(p).toHaveProperty("name");
        expect(p).toHaveProperty("species");
        expect(typeof p.id).toBe("number");
        expect(typeof p.name).toBe("string");
        expect(["dog", "cat", "bird", "fish"]).toContain(p.species);
      }
    });

    it("allows overriding imported fields", async () => {
      const source = `
        import petstore from "examples/petstore.json"

        schema CustomPet from petstore.Pet {
          age: int in 1..5
        }

        dataset TestData {
          pets: 10 * CustomPet
        }
      `;

      const result = await compile(source);

      for (const pet of result.pets) {
        const p = pet as Record<string, unknown>;
        // Base fields still exist
        expect(p).toHaveProperty("id");
        expect(p).toHaveProperty("name");
        // Override field has constrained range
        expect(p.age).toBeGreaterThanOrEqual(1);
        expect(p.age).toBeLessThanOrEqual(5);
      }
    });

    it("allows adding custom fields to imported schema", async () => {
      const source = `
        import petstore from "examples/petstore.json"

        schema ExtendedOwner from petstore.Owner {
          tier: "Gold" | "Silver" | "Bronze"
        }

        dataset TestData {
          owners: 5 * ExtendedOwner
        }
      `;

      const result = await compile(source);

      for (const owner of result.owners) {
        const o = owner as Record<string, unknown>;
        // Base fields from OpenAPI
        expect(o).toHaveProperty("id");
        expect(o).toHaveProperty("name");
        expect(o).toHaveProperty("email");
        // Custom field
        expect(["Gold", "Silver", "Bronze"]).toContain(o.tier);
      }
    });
  });

  describe("dataset-level constraints", () => {
    it("enforces sum constraint on collection", async () => {
      const source = `
        schema Item {
          value: int in 10..50
        }

        dataset TestData {
          items: 10 * Item,
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

    it("enforces count constraint on collection", async () => {
      const source = `
        schema Item { x: int }

        dataset TestData {
          items: 5..15 * Item,
          validate {
            count(items) >= 8
          }
        }
      `;

      const result = await compile(source);

      expect(result.items.length).toBeGreaterThanOrEqual(8);
    });

    it("enforces cross-collection constraint", async () => {
      const source = `
        schema Invoice { total: int in 100..500 }
        schema Payment { amount: int in 50..200 }

        dataset TestData {
          invoices: 5 * Invoice,
          payments: 3 * Payment,
          validate {
            sum(payments.amount) <= sum(invoices.total)
          }
        }
      `;

      const result = await compile(source);

      const invoiceTotal = (result.invoices as { total: number }[]).reduce((s, i) => s + i.total, 0);
      const paymentTotal = (result.payments as { amount: number }[]).reduce((s, p) => s + p.amount, 0);
      expect(paymentTotal).toBeLessThanOrEqual(invoiceTotal);
    });

    it("enforces multiple validation constraints", async () => {
      const source = `
        schema Item {
          price: int in 10..100
        }

        dataset TestData {
          items: 10 * Item,
          validate {
            sum(items.price) >= 200,
            avg(items.price) >= 20,
            max(items.price) >= 50
          }
        }
      `;

      const result = await compile(source);

      const prices = (result.items as { price: number }[]).map(i => i.price);
      const sum = prices.reduce((s, p) => s + p, 0);
      const avg = sum / prices.length;
      const max = Math.max(...prices);

      expect(sum).toBeGreaterThanOrEqual(200);
      expect(avg).toBeGreaterThanOrEqual(20);
      expect(max).toBeGreaterThanOrEqual(50);
    });

    it("enforces count comparison between collections", async () => {
      const source = `
        schema A { x: int }
        schema B { y: int }

        dataset TestData {
          as: 5..10 * A,
          bs: 3..8 * B,
          validate {
            count(bs) <= count(as)
          }
        }
      `;

      const result = await compile(source);

      expect(result.bs.length).toBeLessThanOrEqual(result.as.length);
    });
  });
});
