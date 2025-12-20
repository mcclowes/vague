# Cheat Sheet

Quick reference for Vague syntax. For detailed explanations, see the [Language Guide](/docs/language/schemas-and-datasets).

## Types & Ranges

```vague
name: string                    // Random string
age: int                        // Random integer
price: decimal(2)               // 2 decimal places
active: boolean                 // true or false
joined: date                    // ISO date

age: int in 18..65              // Integer range
price: decimal in 0.01..99.99   // Decimal range
year: date in 2020..2024        // Date range
```

## Superposition (Random Choice)

```vague
status: "draft" | "sent" | "paid"                 // Equal probability
status: 0.7: "paid" | 0.2: "pending" | 0.1: "draft"  // Weighted
nickname: string?                                 // Nullable (50% null)
```

## Collections

```vague
items: 5 of LineItem            // Exactly 5
items: 1..5 of LineItem         // 1-5 random
id: unique int in 1..1000       // No duplicates
```

## Constraints

```vague
assume due_date >= issued_date
assume if status == "paid" { amount > 0 }
assume price > 50 or category == "budget"
```

## References

```vague
customer: any of customers                          // Random from collection
customer: any of customers where .status == "active"  // Filtered
currency: ^base_currency                            // Parent field (^)
```

## Computed Fields

```vague
total: sum(items.amount)        // Aggregates: sum, count, avg, min, max
tax: round(subtotal * 0.2, 2)   // Arithmetic + rounding
status: paid >= total ? "paid" : "pending"  // Ternary
```

## Match Expressions

```vague
label: match status {
  "pending" => "Awaiting",
  "shipped" => "On the way",
  "delivered" => "Complete"
}
```

## Generators

```vague
id: uuid()
email: email()
name: fullName()
product: faker.commerce.productName()
code: regex("[A-Z]{3}-[0-9]{4}")
```

## Side Effects

```vague
schema Payment {
  invoice: any of invoices,
  amount: int
} then {
  invoice.amount_paid += amount
}
```

## Refine Blocks

```vague
schema Player {
  position: "GK" | "FWD",
  goals: int in 0..30
} refine {
  if position == "GK" { goals: int in 0..2 }
}
```

## Dataset & Validation

```vague
dataset TestData {
  customers: 100 of Customer,
  invoices: 500 of Invoice,

  validate {
    all(invoices, .total > 0),
    some(invoices, .status == "paid")
  }
}
```

## CLI

```bash
vague file.vague                    # Generate JSON
vague file.vague -p                 # Pretty print
vague file.vague -o out.json -w     # Watch mode
vague file.vague --seed 42          # Reproducible
vague file.vague -v spec.json       # Validate against OpenAPI
```

## TypeScript API

```typescript
import { fromFile, vague } from 'vague-lang';

// File-based
const data = await fromFile('./schema.vague', { seed: 42 });

// Template literal
const data = await vague`
  schema Person { name: string, age: int in 18..65 }
  dataset Test { people: 10 of Person }
`;
```

---

**More:** [Full Syntax Reference](/docs/syntax-reference) | [CLI Options](/docs/cli) | [TypeScript API](/docs/typescript-api)
