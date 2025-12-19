---
sidebar_position: 2
title: Types and Ranges
---

# Types and Ranges

Vague supports several primitive types with optional range constraints.

## Primitive Types

### String

```vague
name: string          // Random string
```

For meaningful strings, use generators like `fullName()`, `email()`, or `faker.*`.

### Integer

```vague
age: int              // Random integer
count: int in 1..100  // Integer between 1 and 100 (inclusive)
```

### Decimal

```vague
price: decimal                    // Random decimal
amount: decimal in 0.01..999.99   // Decimal in range
score: decimal(2) in 0..100       // 2 decimal places
```

The `decimal(n)` syntax specifies precision (decimal places).

### Boolean

```vague
active: boolean       // true or false
verified: true | false // Explicit alternatives
```

### Date

```vague
joined: date                  // ISO date (YYYY-MM-DD)
founded: date in 2000..2023   // Date in year range
```

## Range Syntax

Ranges use the `in` keyword with `..` for bounds:

```vague
// Integer range
age: int in 18..65

// Decimal range
price: decimal in 0.01..999.99

// Date range (by year)
year: date in 2020..2024
```

Both bounds are inclusive.

## Nullable Fields

Make fields nullable with `?` or explicit `| null`:

```vague
// Shorthand (preferred)
nickname: string?

// Explicit
notes: string | null
middle_name: string | null
```

Nullable fields will randomly be `null` or contain a value.

## Unique Values

Ensure no duplicates within a collection:

```vague
id: unique int in 1000..9999    // No duplicate IDs
code: unique "A" | "B" | "C"    // No duplicate codes
```

Vague will retry generation if a duplicate is produced (up to the retry limit).

## Private Fields

Generate values for internal use but exclude them from output:

```vague
schema Person {
  // Generated but not in output
  age: private int in 0..105,

  // Computed from private field
  age_bracket: age < 18 ? "minor" : age < 65 ? "adult" : "senior"
}
// Output: { "age_bracket": "adult" } — no "age" field
```

Private fields are useful for intermediate calculations.

### Combining Modifiers

You can combine `unique` and `private`:

```vague
internal_id: unique private int in 1..10000
```

## Type Coercion

Vague automatically coerces types in some contexts:

- Arithmetic operations produce numbers
- Comparisons work across compatible types
- String concatenation converts to strings

```vague
schema Example {
  quantity: int in 1..10,
  price: decimal in 9.99..99.99,
  total: quantity * price,      // Decimal result
  label: concat("Total: $", total)  // String result
}
```
