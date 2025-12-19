---
sidebar_position: 3
title: Superposition
---

# Superposition (Random Choice)

Superposition is Vague's way of expressing random choice with optional weights. Use `|` to separate alternatives.

## Equal Probability

Without weights, all options have equal probability:

```vague
status: "draft" | "sent" | "paid"    // 33.3% each
color: "red" | "green" | "blue"      // 33.3% each
```

## Weighted Probability

Prefix options with weights (must sum to ≤ 1.0):

```vague
status: 0.6: "paid" | 0.3: "pending" | 0.1: "draft"
```

This produces:
- 60% "paid"
- 30% "pending"
- 10% "draft"

## Mixed Weights

Unweighted options share the remaining probability:

```vague
status: 0.85: "active" | "archived"
// "active" = 85%, "archived" = 15%

category: 0.6: "main" | "side" | "dessert"
// "main" = 60%, "side" = 20%, "dessert" = 20%
```

This is useful when you want one option to dominate.

## Mixed Types

Superposition can combine different value types:

```vague
// Range OR reference
amount: int in 10..500 | invoice.total

// With weights
amount: 0.7: int in 10..500 | 0.3: invoice.total
```

## Superposition with Ranges

Combine multiple ranges:

```vague
// Small, medium, or large order
quantity: int in 1..5 | int in 10..20 | int in 50..100
```

## Boolean Distribution

For weighted booleans:

```vague
// 90% true, 10% false
is_active: 0.9: true | 0.1: false

// Or use boolean (50/50)
is_verified: boolean
```

## Null Distribution

Control null frequency:

```vague
// 20% chance of null
notes: 0.8: string | 0.2: null

// Or use shorthand (random null chance)
notes: string?
```

## Practical Examples

### Status Distribution

```vague
schema Invoice {
  // Most invoices are paid, few are overdue
  status: 0.7: "paid" | 0.2: "pending" | 0.05: "draft" | 0.05: "overdue"
}
```

### Tiered Pricing

```vague
schema Product {
  // Budget, standard, or premium pricing
  tier: 0.5: "standard" | 0.35: "budget" | 0.15: "premium",

  price: tier == "budget" ? decimal in 9.99..29.99 :
         tier == "standard" ? decimal in 29.99..99.99 :
         decimal in 99.99..499.99
}
```

### Geographic Distribution

```vague
schema Customer {
  // 60% US, 25% EU, 15% other
  region: 0.6: "US" | 0.25: "EU" | "APAC" | "LATAM"
}
```
