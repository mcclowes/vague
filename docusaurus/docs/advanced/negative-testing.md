---
sidebar_position: 5
title: Negative Testing
---

# Negative Testing

Vague can generate data that intentionally violates constraints, useful for testing error handling and validation logic.

## Violating Datasets

Use the `violating` keyword to generate constraint-violating data:

```vague
schema Invoice {
  amount: decimal in 100..1000,
  status: "draft" | "paid",

  assume if status == "paid" { amount > 0 }
}

// Normal dataset - satisfies constraints
dataset Valid {
  invoices: 100 of Invoice
}

// Violating dataset - intentionally breaks constraints
dataset Invalid violating {
  bad_invoices: 100 of Invoice
}
```

The `Invalid` dataset will contain invoices where `status == "paid"` but `amount <= 0`.

## How It Works

When `violating` is specified:
1. Vague generates candidate values normally
2. Instead of retrying when constraints fail, it keeps the violating values
3. Each record attempts to violate at least one constraint

## Use Cases

### Testing Validation

```vague
schema User {
  email: email(),
  age: int in 0..150,

  assume matches("^[^@]+@[^@]+\\.[^@]+$", email),
  assume age >= 18
}

dataset ValidUsers {
  users: 100 of User
}

dataset InvalidUsers violating {
  users: 50 of User
}
```

Use `InvalidUsers` to test that your validation correctly rejects underage users or malformed emails.

### API Error Responses

```vague
schema Order {
  quantity: int in 1..100,
  price: decimal in 0.01..1000,
  status: "pending" | "confirmed" | "shipped",

  assume quantity > 0,
  assume price > 0,
  assume if status == "shipped" { quantity <= 50 }
}

dataset ErrorCases violating {
  orders: 50 of Order
}
```

Test how your API handles orders with zero quantity, negative prices, or oversized shipments.

### Database Constraints

```vague
schema Record {
  id: unique int in 1..1000,
  parent_id: any of records,
  created_at: datetime(2024, 2024),
  updated_at: datetime(2024, 2024),

  assume updated_at >= created_at
}

dataset ConstraintViolations violating {
  records: 100 of Record
}
```

Test database constraint enforcement with records that have `updated_at < created_at`.

## Combining with Normal Data

Generate both valid and invalid data in the same file:

```vague
schema Payment {
  amount: decimal in 0..10000,
  method: "card" | "bank" | "cash",
  status: "pending" | "completed" | "failed",

  assume amount > 0,
  assume if method == "card" { amount <= 5000 }
}

dataset Production {
  payments: 1000 of Payment
}

dataset EdgeCases violating {
  payments: 100 of Payment
}

dataset Mixed {
  valid_payments: 900 of Payment,
  // Note: violating is per-dataset, not per-collection
}
```

## Testing Strategy

1. **Generate valid data** for happy-path testing
2. **Generate violating data** for error-path testing
3. **Mix with edge cases** using the [Issuer plugin](/docs/plugins/issuer)

```vague
schema Input {
  name: fullName(),
  email: email(),

  assume length(name) >= 2,
  assume matches("^[^@]+@[^@]+$", email)
}

// Happy path
dataset Valid {
  inputs: 100 of Input
}

// Constraint violations
dataset Invalid violating {
  inputs: 50 of Input
}

// Edge cases (valid but unusual)
schema EdgeInput {
  name: 0.5: issuer.homoglyph("admin") | 0.5: issuer.long(1000),
  email: issuer.weirdEmail()
}

dataset EdgeCases {
  inputs: 50 of EdgeInput
}
```

## Limitations

1. **All-or-nothing.** Violating applies to entire dataset, not individual fields.
2. **Best effort.** Not guaranteed to violate every constraint.
3. **Retry limits.** Generation still respects max retries.

## Best Practices

1. **Test specific violations.** Create focused violating datasets for each constraint.
2. **Document expected violations.** Comment what should fail.
3. **Separate concerns.** Keep valid and invalid data in separate datasets.
4. **Combine approaches.** Use with Issuer plugin for comprehensive testing.

## See Also

- [Issuer Plugin](/docs/plugins/issuer) for edge case values
- [Constraints](/docs/language/constraints) for defining what to violate
- [Dataset Validation](/docs/advanced/dataset-validation) for aggregate constraints
