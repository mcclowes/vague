---
sidebar_position: 4
title: Regex Plugin
---

# Regex Plugin

The Regex plugin generates strings that match regular expression patterns, useful for codes, identifiers, and structured strings.

## Pattern Generation

Use `regex()` to generate strings matching a pattern:

```vague
schema Product {
  // 3 uppercase letters, dash, 4 digits
  sku: regex("[A-Z]{3}-[0-9]{4}")
}
// Output: "ABC-1234"
```

## Common Patterns

### Alphanumeric Codes

```vague
schema Code {
  // 32-character alphanumeric
  api_key: alphanumeric(32),

  // 6 digits
  otp: digits(6),

  // Semantic version
  version: semver()
}
```

### Identifiers

```vague
schema Identifiers {
  // Order number
  order_id: regex("ORD-[0-9]{8}"),

  // License key
  license: regex("[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}"),

  // Reference code
  ref: regex("[A-Z]{2}[0-9]{6}")
}
```

## Pattern Syntax

Standard regex syntax is supported:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `[A-Z]` | Uppercase letter | `A`, `B`, `Z` |
| `[a-z]` | Lowercase letter | `a`, `b`, `z` |
| `[0-9]` | Digit | `0`, `5`, `9` |
| `[A-Za-z]` | Any letter | `A`, `a`, `Z` |
| `[A-Za-z0-9]` | Alphanumeric | `A`, `a`, `5` |
| `{n}` | Exactly n times | `[A-Z]{3}` → `ABC` |
| `{n,m}` | n to m times | `[0-9]{2,4}` → `12`, `1234` |
| `?` | 0 or 1 time | `[A-Z]?` → `""`, `A` |
| `*` | 0 or more | `[A-Z]*` → `""`, `ABC` |
| `+` | 1 or more | `[A-Z]+` → `A`, `ABC` |
| `\|` | Alternation | `cat\|dog` → `cat`, `dog` |
| `()` | Grouping | `(ab)+` → `ab`, `abab` |

## Shorthand Functions

| Function | Description | Equivalent Pattern |
|----------|-------------|-------------------|
| `alphanumeric(n)` | n alphanumeric chars | `[A-Za-z0-9]{n}` |
| `digits(n)` | n digits | `[0-9]{n}` |
| `semver()` | Semantic version | `[0-9]+\.[0-9]+\.[0-9]+` |

## Practical Examples

### Product Codes

```vague
schema Product {
  // SKU: Category (2 letters) + ID (6 digits)
  sku: regex("[A-Z]{2}[0-9]{6}"),

  // Barcode: EAN-13
  barcode: regex("[0-9]{13}"),

  // Model number
  model: regex("[A-Z]{3}-[0-9]{3}[A-Z]")
}
```

### Financial Identifiers

```vague
schema Banking {
  // IBAN (simplified)
  iban: regex("[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}[A-Z0-9]{0,16}"),

  // SWIFT/BIC code
  swift: regex("[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?"),

  // Credit card (test pattern)
  card: regex("4[0-9]{15}")  // Visa-like
}
```

### Reference Numbers

```vague
schema Order {
  // Order reference: ORD-YYYYMMDD-NNNN
  reference: regex("ORD-202[0-9][0-1][0-9][0-3][0-9]-[0-9]{4}"),

  // Tracking number
  tracking: regex("[A-Z]{2}[0-9]{9}[A-Z]{2}")
}
```

### API Keys

```vague
schema APICredentials {
  // API key with prefix
  api_key: regex("sk_live_[A-Za-z0-9]{32}"),

  // Webhook secret
  webhook_secret: regex("whsec_[A-Za-z0-9]{32}"),

  // Access token
  access_token: alphanumeric(64)
}
```

## Pattern Validation

Use `matches()` in constraints to validate patterns:

```vague
schema Account {
  code: string,

  // Ensure code matches expected format
  assume matches("^[A-Z]{3}[0-9]{4}$", code)
}
```

However, it's usually better to use `regex()` directly — it generates valid values without needing retry logic.

## Combining with Other Features

```vague
schema Product {
  category: "electronics" | "clothing" | "food",

  // Category-specific SKU prefix
  sku: category == "electronics" ? regex("EL-[0-9]{6}") :
       category == "clothing" ? regex("CL-[0-9]{6}") :
       regex("FD-[0-9]{6}")
}
```

## See Also

- [Constraints](/docs/language/constraints) for using `matches()` validation
- [Custom Plugins](/docs/plugins/custom-plugins) for custom pattern generators
