---
sidebar_position: 2
title: Issuer Plugin
---

# Issuer Plugin

The Issuer plugin generates problematic but technically valid values for edge case testing. Use it to stress-test your applications with unusual inputs.

## Why Issuer?

Real-world data contains edge cases that break assumptions:
- Unicode characters that look like ASCII
- Extremely long strings
- SQL-like patterns in user input
- Dates at system boundaries

The Issuer plugin helps you test these scenarios proactively.

## Unicode Generators

### Zero-Width Characters

```vague
schema Test {
  // String with invisible characters
  name: issuer.zeroWidth()
}
// Output: "hel​lo" (contains zero-width space)
```

### Homoglyphs

Characters that look like other characters:

```vague
schema Security {
  // Looks like "admin" but uses Cyrillic 'а'
  username: issuer.homoglyph("admin")
}
// Output: "аdmin" (first 'a' is Cyrillic)
```

### Right-to-Left Text

```vague
schema International {
  // Contains RTL override characters
  text: issuer.rtl()
}
```

### Emoji

```vague
schema Social {
  // Emoji that might break string handling
  reaction: issuer.emoji()
}
```

## String Generators

### Empty String

```vague
schema Edge {
  // Empty string (not null)
  name: issuer.empty()
}
// Output: ""
```

### Long Strings

```vague
schema Stress {
  // Very long string
  description: issuer.long(10000)
}
// Output: "aaaa..." (10000 characters)
```

### SQL-Like Patterns

```vague
schema Injection {
  // Strings that look like SQL injection
  input: issuer.sqlLike()
}
// Output: "'; DROP TABLE users; --"
```

### HTML Special Characters

```vague
schema XSS {
  // HTML/XSS-like strings
  content: issuer.htmlSpecial()
}
// Output: "<script>alert('xss')</script>"
```

## Number Generators

### Boundary Values

```vague
schema Numbers {
  maxInt: issuer.maxInt(),         // 2^53 - 1 (JS max safe integer)
  minInt: issuer.minInt(),         // -(2^53 - 1)
  tinyDecimal: issuer.tinyDecimal(), // Very small decimal
  negativeZero: issuer.negativeZero() // -0
}
```

## Date Generators

### Edge Case Dates

```vague
schema Dates {
  leapDay: issuer.leapDay(),    // Feb 29 on a leap year
  y2k: issuer.y2k(),            // 2000-01-01
  epoch: issuer.epoch(),        // 1970-01-01
  farFuture: issuer.farFuture() // Year 2100+
}
```

## Format Generators

### Unusual Valid Formats

```vague
schema Formats {
  // Valid but unusual email
  email: issuer.weirdEmail(),
  // Output: "user+tag@sub.domain.co.uk"

  // Valid but unusual URL
  url: issuer.weirdUrl(),
  // Output: "https://user:pass@sub.example.com:8080/path?q=1#hash"

  // UUID with edge patterns
  id: issuer.specialUuid()
  // Output: "00000000-0000-0000-0000-000000000000"
}
```

## Complete Reference

| Generator | Description | Example |
|-----------|-------------|---------|
| `issuer.zeroWidth()` | Zero-width characters | `"hel​lo"` |
| `issuer.homoglyph(s)` | Lookalike characters | `"аdmin"` |
| `issuer.rtl()` | Right-to-left text | `"‮hello"` |
| `issuer.emoji()` | Emoji characters | `"👨‍👩‍👧‍👦"` |
| `issuer.empty()` | Empty string | `""` |
| `issuer.long(n)` | Long string | `"aaa..."` |
| `issuer.sqlLike()` | SQL injection pattern | `"'; DROP TABLE--"` |
| `issuer.htmlSpecial()` | HTML/XSS pattern | `"<script>..."` |
| `issuer.maxInt()` | Max safe integer | `9007199254740991` |
| `issuer.minInt()` | Min safe integer | `-9007199254740991` |
| `issuer.tinyDecimal()` | Tiny decimal | `0.0000001` |
| `issuer.negativeZero()` | Negative zero | `-0` |
| `issuer.leapDay()` | Leap day date | `"2024-02-29"` |
| `issuer.y2k()` | Y2K date | `"2000-01-01"` |
| `issuer.epoch()` | Unix epoch | `"1970-01-01"` |
| `issuer.farFuture()` | Far future date | `"2100-01-01"` |
| `issuer.weirdEmail()` | Unusual email | `"a+b@c.d.e.f"` |
| `issuer.weirdUrl()` | Unusual URL | `"https://a:b@c:8080"` |
| `issuer.specialUuid()` | Edge case UUID | `"000...000"` |

## Testing Strategy

Use Issuer alongside normal data:

```vague
schema User {
  // 90% normal names, 10% edge cases
  name: 0.9: fullName() | 0.1: issuer.homoglyph("admin"),

  // 95% normal emails, 5% unusual
  email: 0.95: email() | 0.05: issuer.weirdEmail(),

  // Occasionally very long bios
  bio: 0.9: paragraph() | 0.1: issuer.long(5000)
}
```

Or use separate datasets:

```vague
dataset Normal {
  users: 100 of NormalUser
}

dataset EdgeCases {
  users: 20 of EdgeCaseUser
}
```

## See Also

- [Negative Testing](/docs/advanced/negative-testing) for constraint-violating data
- [Faker Plugin](/docs/plugins/faker) for normal realistic data
