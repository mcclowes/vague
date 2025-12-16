# Vitest Fixtures with Vague

This example demonstrates using Vague as a seeded fixture generator for Vitest tests.

## The Problem

Traditional test fixtures have drawbacks:

- **Static JSON files** become stale and disconnected from your types
- **Factory functions** require manual maintenance as schemas evolve
- **Random data** makes tests non-deterministic and hard to debug

## The Solution

Vague's tagged template API with seeding gives you:

```typescript
import { vague } from 'vague';

interface TestFixtures { invoices: Invoice[] }

let fixtures: TestFixtures;
beforeAll(async () => {
  fixtures = await vague<TestFixtures>({ seed: 42 })`
    schema Invoice {
      id: unique int in 1000..9999,
      status: "draft" | "sent" | "paid",
      total: decimal in 100..5000
    }
    dataset TestFixtures { invoices: 20 * Invoice }
  `;
});

it('calculates tax correctly', () => {
  // fixtures.invoices[0] is always the same
  expect(calculateTax(fixtures.invoices[0])).toBe(expectedValue);
});
```

## Benefits

1. **Deterministic** - Same seed produces identical data every run
2. **Self-documenting** - The schema describes your test data structure
3. **Type-safe** - Generic parameter ensures fixtures match your interfaces
4. **Maintainable** - Change the schema, fixtures regenerate automatically
5. **Realistic** - Complex relationships, constraints, and computed fields

## Running the Example

```bash
npm run test:run -- examples/vitest-fixtures/invoice.test.ts
```

## Pattern Details

### One-time Generation

Use `beforeAll` to generate fixtures once per test file:

```typescript
let fixtures: TestFixtures;
beforeAll(async () => {
  fixtures = await vague<TestFixtures>({ seed: SEED })`...`;
});
```

### Seed Selection

Pick any integer as your seed. Change it to get different (but still deterministic) test data:

```typescript
const FIXTURE_SEED = 42;  // Change to regenerate all fixtures
```

### Type Alignment

Define an interface matching your dataset collections:

```typescript
interface TestFixtures {
  invoices: Invoice[];    // Matches: invoices: 20 * Invoice
  lineItems: LineItem[];  // Matches: lineItems: 10 * LineItem
}
```

### Filtering Fixtures

With enough generated records, filter for specific scenarios:

```typescript
const sentInvoices = fixtures.invoices.filter(i => i.status === 'sent');
const highValueInvoices = fixtures.invoices.filter(i => i.total > 1000);
```

### Multiple Seeds for Edge Cases

Use different seeds to test different scenarios:

```typescript
const normalFixtures = await vague({ seed: 1 })`...`;
const edgeCaseFixtures = await vague({ seed: 9999 })`...`;
```

## Files

- `invoice.ts` - Example module with business logic to test
- `invoice.test.ts` - Tests demonstrating the fixture pattern
