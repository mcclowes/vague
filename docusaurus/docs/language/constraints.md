---
sidebar_position: 4
title: Constraints
---

# Constraints

Constraints define rules that generated data must satisfy. Vague uses rejection sampling: it generates candidate values and discards those that violate constraints (up to a retry limit).

## Simple Constraints

Use `assume` to declare constraints:

```vague
schema Invoice {
  issued_date: date in 2024..2024,
  due_date: date in 2024..2024,

  assume due_date >= issued_date
}
```

The constraint `due_date >= issued_date` ensures due dates never precede issued dates.

## Multiple Constraints

Add multiple constraints, separated by commas:

```vague
schema Order {
  quantity: int in 1..100,
  discount: decimal in 0..50,

  assume quantity > 0,
  assume discount <= 40,
  assume if quantity >= 50 { discount >= 10 }
}
```

## Conditional Constraints

Apply constraints only when conditions are met:

```vague
schema Invoice {
  status: "draft" | "sent" | "paid",
  amount: int in 0..10000,
  paid_at: date?,

  // Paid invoices must have positive amount
  assume if status == "paid" {
    amount > 0
  },

  // Paid invoices must have payment date
  assume if status == "paid" {
    paid_at != null
  }
}
```

## Logical Operators

Combine conditions with `and`, `or`, and `not`:

```vague
schema Product {
  price: decimal in 0..1000,
  category: "premium" | "standard" | "budget",
  in_stock: boolean,

  // Premium products must cost more than $50
  assume price > 50 or category != "premium",

  // Can't be premium AND out of stock
  assume not (category == "premium" and in_stock == false)
}
```

## Comparison Operators

Available operators:
- `==` equal
- `!=` not equal
- `>` greater than
- `>=` greater than or equal
- `<` less than
- `<=` less than or equal

```vague
schema Range {
  start: int in 0..100,
  end: int in 0..100,

  assume end > start,
  assume end - start >= 10  // At least 10 apart
}
```

## Arithmetic in Constraints

Use arithmetic expressions:

```vague
schema Invoice {
  subtotal: decimal in 100..1000,
  tax: decimal in 0..100,
  total: decimal in 100..1100,

  // Total should roughly equal subtotal + tax
  assume total >= subtotal + tax - 1,
  assume total <= subtotal + tax + 1
}
```

## String Matching

Match patterns with `matches()`:

```vague
schema Account {
  code: string,

  // Code must be 3 uppercase letters followed by 4 digits
  assume matches("^[A-Z]{3}[0-9]{4}$", code)
}
```

Or use the `regex()` generator instead:

```vague
schema Account {
  code: regex("[A-Z]{3}[0-9]{4}")  // Generates valid codes directly
}
```

## Constraint Failures

If constraints can't be satisfied after max retries (default: 100), generation fails with an error. To avoid this:

1. Ensure constraints are satisfiable
2. Use wider ranges
3. Use conditional constraints to handle edge cases

```vague
// Bad: might be unsatisfiable
schema Bad {
  a: int in 1..10,
  b: int in 1..10,
  assume a > b + 20  // Impossible!
}

// Good: always satisfiable
schema Good {
  a: int in 21..100,
  b: int in 1..10,
  assume a > b + 10
}
```

## Best Practices

1. **Keep constraints simple** — Complex constraints increase retry rates
2. **Use generators when possible** — `regex()` is better than `assume matches()`
3. **Consider constraint order** — Earlier fields are generated first
4. **Test with small datasets** — Catch constraint issues early
