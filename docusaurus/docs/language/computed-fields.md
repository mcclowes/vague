---
sidebar_position: 6
title: Computed Fields
---

# Computed Fields

Computed fields derive values from other fields using expressions, aggregates, and arithmetic.

## Arithmetic Expressions

Use standard arithmetic operators:

```vague
schema Invoice {
  quantity: int in 1..10,
  unit_price: decimal in 9.99..99.99,

  subtotal: quantity * unit_price,
  tax: subtotal * 0.2,
  total: subtotal + tax
}
```

Operators: `+`, `-`, `*`, `/`, `%` (modulo)

## Aggregate Functions

Aggregate over nested collections:

```vague
schema Invoice {
  line_items: 1..10 of LineItem,

  total: sum(line_items.amount),
  item_count: count(line_items),
  avg_price: avg(line_items.unit_price),
  min_price: min(line_items.unit_price),
  max_price: max(line_items.unit_price)
}
```

Available aggregates:

| Function | Description |
|----------|-------------|
| `sum(collection.field)` | Sum of field values |
| `count(collection)` | Number of items |
| `avg(collection.field)` | Average of field values |
| `min(collection.field)` | Minimum value |
| `max(collection.field)` | Maximum value |
| `median(collection.field)` | Median value |
| `first(collection.field)` | First item's value |
| `last(collection.field)` | Last item's value |
| `product(collection.field)` | Product of all values |

## Ternary Expressions

Conditional values with `? :` syntax:

```vague
schema Invoice {
  amount_paid: int in 0..1000,
  total: int in 500..1000,

  status: amount_paid >= total ? "paid" : "pending"
}
```

### Nested Ternaries

Chain for multiple conditions:

```vague
schema Student {
  score: int in 0..100,

  grade: score >= 90 ? "A" :
         score >= 80 ? "B" :
         score >= 70 ? "C" :
         score >= 60 ? "D" : "F"
}
```

### With Logical Operators

```vague
schema Order {
  total: decimal in 10..1000,
  is_member: boolean,
  has_coupon: boolean,

  discount: (total >= 100 and is_member) or has_coupon ? 0.15 : 0
}
```

## Rounding Functions

Control decimal precision:

```vague
schema Invoice {
  subtotal: decimal in 100..1000,

  tax: round(subtotal * 0.2, 2),      // Round to 2 decimal places
  floored: floor(subtotal / 3, 1),    // Floor to 1 decimal place
  ceiled: ceil(subtotal / 7, 0)       // Ceil to integer
}
```

## Math Functions

```vague
schema Stats {
  value: decimal in -100..100,

  absolute: abs(value),
  positive: max(0, value),
  clamped: min(100, max(0, value))
}
```

## String Computations

See [String Functions](/docs/advanced/string-functions) for string transformations:

```vague
schema User {
  first_name: firstName(),
  last_name: lastName(),

  full_name: concat(first_name, " ", last_name),
  username: lowercase(concat(first_name, ".", last_name)),
  initials: concat(substring(first_name, 0, 1), substring(last_name, 0, 1))
}
```

## Field Dependencies

Computed fields can reference other computed fields:

```vague
schema Invoice {
  line_items: 1..10 of LineItem,

  subtotal: sum(line_items.amount),    // First
  tax: round(subtotal * 0.2, 2),       // Uses subtotal
  total: subtotal + tax,                // Uses subtotal and tax

  status: total > 1000 ? "large" : "standard"  // Uses total
}
```

Vague automatically determines the correct evaluation order.

## Practical Example

```vague
schema LineItem {
  product: faker.commerce.productName(),
  quantity: int in 1..10,
  unit_price: decimal(2) in 9.99..199.99,
  amount: round(quantity * unit_price, 2)
}

schema Invoice {
  id: sequence("INV-", 1001),
  customer: any of customers,
  line_items: 1..5 of LineItem,

  // Aggregates
  subtotal: sum(line_items.amount),
  item_count: count(line_items),

  // Calculations
  tax_rate: 0.2,
  tax: round(subtotal * tax_rate, 2),
  total: round(subtotal + tax, 2),

  // Derived status
  amount_paid: int in 0..0,
  status: amount_paid >= total ? "paid" : "pending",

  // Metadata
  is_large_order: total > 500
}
```
