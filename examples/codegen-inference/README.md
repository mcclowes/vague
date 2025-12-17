# Code Generation via Schema Inference

This example demonstrates how to use Vague's schema inference feature to automatically generate Vague code from existing JSON data.

## The Problem

You have existing JSON data (from production exports, API responses, or legacy fixtures) and want to:

- Create dynamic test fixtures that match your real data patterns
- Understand the statistical distribution of your data
- Bootstrap a Vague schema without writing it from scratch

## The Solution

Use `inferSchema()` to reverse-engineer a Vague schema from your data:

```typescript
import { inferSchema } from 'vague';

const data = {
  customers: [
    { id: 'cust_123', email: 'alice@example.com', tier: 'enterprise' },
    { id: 'cust_456', email: 'bob@example.com', tier: 'starter' },
  ],
  orders: [
    { order_id: 'ord_001', status: 'completed', total: 249.99 },
    { order_id: 'ord_002', status: 'pending', total: 89.50 },
  ],
};

const vagueCode = inferSchema(data);
```

## What Gets Detected

| Feature | Detection Method | Vague Output |
|---------|------------------|--------------|
| **Types** | Value analysis | `int`, `decimal`, `string`, `date`, `boolean` |
| **Ranges** | Min/max values | `int in 18..65`, `decimal in 0.5..999.99` |
| **Enums** | Low cardinality strings | `"draft" \| "sent" \| "paid"` |
| **Weights** | Value frequency | `0.7: "completed" \| 0.2: "pending" \| 0.1: "refunded"` |
| **Nullable** | Null presence | `string?` |
| **Unique** | All values distinct | `unique int in 1000..9999` |
| **Formats** | Pattern matching | `uuid()`, `email()`, `datetime()` |
| **Arrays** | Array lengths | `1..5 of LineItem` |
| **Nested** | Object structure | Separate schema definitions |

## Running the Example

### TypeScript API

```bash
# Build the project first
npm run build

# Run the inference example
npx tsx examples/codegen-inference/infer-schema.ts
```

### CLI

```bash
# Infer schema from JSON file
node dist/cli.js --infer examples/codegen-inference/sample-data.json

# Save to a .vague file
node dist/cli.js --infer examples/codegen-inference/sample-data.json -o schema.vague

# Customize options
node dist/cli.js --infer sample-data.json --dataset-name TestFixtures --no-weights
```

## Sample Data

The `sample-data.json` file contains realistic SaaS analytics data:

- **customers** - User accounts with tiers, addresses, lifetime value
- **orders** - Subscription purchases with line items
- **events** - Analytics events (page views, feature usage, etc.)

## Generated Output

Running inference on the sample data produces (see `generated-schema.vague`):

```vague
schema Address {
  city: faker.location.city(),
  country: "US",
  postal_code: faker.location.zipCode()
}

schema Customer {
  id: unique string,
  email: email(),
  name: fullName(),
  tier: 0.4: "enterprise" | 0.4: "starter" | 0.2: "growth",
  created_at: date in 2022..2024,
  lifetime_value: unique decimal in 150..28750,
  is_active: boolean,
  address: Address
}

schema Item {
  sku: 0.25: "PLAN-ENT-ANNUAL" | 0.25: "PLAN-START-MONTH" | ...,
  name: 0.25: "Enterprise Plan (Annual)" | ...,
  quantity: 1,
  unit_price: 0.25: 2499 | 0.13: 799 | ...
}

schema Order {
  order_id: unique string,
  customer_id: 0.29: "cust_a1b2c3d4e5f6" | ...,
  status: 0.71: "completed" | 0.14: "refunded" | 0.14: "pending",
  payment_method: 0.71: "card" | 0.29: "invoice",
  subtotal: unique int in 49..4999,
  tax: unique decimal in 4.9..499.9,
  total: unique decimal in 53.9..5498.9,
  currency: "USD",
  placed_at: date in 2024..2024,
  items: 1..2 of Item
}

// ... events schema ...

dataset Generated {
  addresss: 5 of Address,
  items: 8 of Item,
  propertiess: 8 of Properties,
  customers: 5 of Customer,
  orders: 7 of Order,
  events: 8 of Event
}
```

Notice how the inference:
- Detects `email()` and `fullName()` generators from field names
- Uses `faker.location.city()` and `faker.location.zipCode()` for address fields
- Creates weighted superpositions matching the frequency in the source data
- Identifies unique fields and numeric ranges

## Customizing the Generated Schema

The inferred schema is a starting point. You'll typically want to:

### 1. Add Constraints

```vague
schema Order {
  subtotal: decimal in 49..4999,
  tax: decimal in 4.9..499.9,
  total: decimal in 53.9..5498.9,

  // Add business rule
  assume total == subtotal + tax
}
```

### 2. Add Cross-References

```vague
schema Order {
  // Replace string ID with actual reference
  customer: any of customers,
  // ...
}
```

### 3. Adjust Cardinalities

```vague
dataset TestFixtures {
  // Scale up for load testing
  customers: 1000 of Customer,
  orders: 5000 of Order,
  events: 50000 of Event
}
```

### 4. Add Computed Fields

```vague
schema Order {
  items: 1..5 of Item,
  // Replace inferred field with computation
  subtotal: sum(items.unit_price),
  tax: round(subtotal * 0.1, 2),
  total: subtotal + tax
}
```

## API Options

```typescript
inferSchema(data, {
  datasetName: 'Generated',      // Name for the dataset
  detectFormats: true,           // Detect uuid, email, phone patterns
  weightedSuperpositions: true,  // Include weights in superpositions
  maxEnumValues: 10,             // Max unique values for enum detection
  detectUnique: true,            // Detect unique fields
});
```

## Files

- `sample-data.json` - Realistic SaaS analytics data
- `infer-schema.ts` - TypeScript example demonstrating the API
- `generated-schema.vague` - Output from running the example
