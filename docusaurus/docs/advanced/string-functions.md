---
sidebar_position: 3
title: String Functions
---

# String Functions

Vague provides built-in functions for string manipulation and transformation.

## Case Transformations

### uppercase / lowercase

```vague
schema Text {
  name: "Hello World",

  upper: uppercase(name),   // "HELLO WORLD"
  lower: lowercase(name)    // "hello world"
}
```

### capitalize

Title case transformation:

```vague
schema Text {
  raw: "hello world",
  title: capitalize(raw)    // "Hello World"
}
```

## Case Style Conversions

### kebabCase

```vague
schema Slug {
  title: "Hello World",
  slug: kebabCase(title)    // "hello-world"
}
```

### snakeCase

```vague
schema Python {
  name: "Hello World",
  var: snakeCase(name)      // "hello_world"
}
```

### camelCase

```vague
schema JavaScript {
  name: "hello world",
  prop: camelCase(name)     // "helloWorld"
}
```

## String Manipulation

### trim

Remove leading/trailing whitespace:

```vague
schema Clean {
  raw: "  hello  ",
  trimmed: trim(raw)        // "hello"
}
```

### concat

Join strings together:

```vague
schema User {
  first: firstName(),
  last: lastName(),

  full: concat(first, " ", last),     // "John Smith"
  email: concat(lowercase(first), ".", lowercase(last), "@example.com")
}
```

### substring

Extract part of a string:

```vague
schema Excerpt {
  text: sentence(),

  // substring(string, start, length)
  first5: substring(text, 0, 5),
  middle: substring(text, 5, 10)
}
```

### replace

Replace occurrences:

```vague
schema Sanitize {
  raw: "hello-world",

  // replace(string, find, replacement)
  clean: replace(raw, "-", "_")   // "hello_world"
}
```

### length

Get string length:

```vague
schema Stats {
  text: sentence(),
  chars: length(text)
}
```

## Practical Examples

### User Profile

```vague
schema User {
  first_name: firstName(),
  last_name: lastName(),

  // Display name
  display_name: concat(first_name, " ", last_name),

  // Username (lowercase, dot-separated)
  username: lowercase(concat(first_name, ".", last_name)),

  // Initials
  initials: concat(
    substring(first_name, 0, 1),
    substring(last_name, 0, 1)
  ),

  // URL slug
  profile_slug: kebabCase(concat(first_name, " ", last_name))
}
```

### Product Catalog

```vague
schema Product {
  name: faker.commerce.productName(),

  // URL-friendly slug
  slug: kebabCase(name),

  // Search-friendly
  search_name: lowercase(name),

  // SKU from name
  sku: concat(
    uppercase(substring(name, 0, 3)),
    "-",
    regex("[0-9]{4}")
  )
}
```

### Content Processing

```vague
schema Article {
  title: faker.lorem.sentence(),
  body: faker.lorem.paragraphs(),

  // URL slug
  slug: kebabCase(title),

  // Meta description (first 160 chars)
  meta_description: substring(body, 0, 160),

  // Word count approximation
  char_count: length(body)
}
```

### Code Generation

```vague
schema APIEndpoint {
  resource: "User" | "Product" | "Order",

  // REST endpoint
  path: concat("/api/", kebabCase(resource), "s"),

  // Database table
  table_name: snakeCase(resource),

  // TypeScript interface
  interface_name: concat("I", resource),

  // Service class
  service_name: concat(resource, "Service")
}
```

### Data Normalization

```vague
schema Contact {
  raw_name: "  JOHN   SMITH  ",
  raw_email: "John.Smith@EXAMPLE.com",

  // Normalized name
  name: capitalize(trim(lowercase(raw_name))),

  // Normalized email
  email: lowercase(trim(raw_email))
}
```

## Chaining Functions

String functions can be chained:

```vague
schema Complex {
  input: "  Hello World  ",

  processed: kebabCase(trim(lowercase(input)))
  // Result: "hello-world"
}
```

## Function Reference

| Function | Description | Example |
|----------|-------------|---------|
| `uppercase(s)` | Convert to uppercase | `"HELLO"` |
| `lowercase(s)` | Convert to lowercase | `"hello"` |
| `capitalize(s)` | Title case | `"Hello World"` |
| `kebabCase(s)` | Kebab case | `"hello-world"` |
| `snakeCase(s)` | Snake case | `"hello_world"` |
| `camelCase(s)` | Camel case | `"helloWorld"` |
| `trim(s)` | Remove whitespace | `"hello"` |
| `concat(a, b, ...)` | Join strings | `"ab"` |
| `substring(s, start, len)` | Extract substring | `"hel"` |
| `replace(s, find, repl)` | Replace text | `"hi"` |
| `length(s)` | String length | `5` |
