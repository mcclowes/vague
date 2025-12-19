---
sidebar_position: 13
title: Schema Inference
---

# Schema Inference

Vague can reverse-engineer schemas from existing JSON or CSV data, detecting types, ranges, patterns, and relationships.

## Basic Usage

```bash
# Infer from JSON
vague --infer data.json -o schema.vague

# Infer from CSV
vague --infer data.csv --collection-name employees -o schema.vague
```

## What Gets Detected

### Types

| Data Pattern | Inferred Type |
|-------------|---------------|
| `123` | `int` |
| `12.34` | `decimal` |
| `"text"` | `string` |
| `true/false` | `boolean` |
| `"2024-01-15"` | `date` |
| `"2024-01-15T10:30:00Z"` | `datetime()` |

### Formats

| Pattern | Inferred Generator |
|---------|-------------------|
| UUID | `uuid()` |
| Email | `email()` |
| URL | `faker.internet.url()` |
| Phone | `phone()` |

### Ranges

```json
// Input
[
  { "age": 25 },
  { "age": 42 },
  { "age": 31 }
]
```

```vague
// Inferred
schema Record {
  age: int in 25..42
}
```

### Enums

```json
// Input
[
  { "status": "active" },
  { "status": "active" },
  { "status": "pending" }
]
```

```vague
// Inferred with weights
schema Record {
  status: 0.67: "active" | 0.33: "pending"
}
```

### Nullable Fields

```json
// Input
[
  { "name": "John", "nickname": "Johnny" },
  { "name": "Jane", "nickname": null }
]
```

```vague
// Inferred
schema Record {
  name: string,
  nickname: string?
}
```

### Unique Fields

```json
// Input
[
  { "id": 1, "code": "ABC" },
  { "id": 2, "code": "DEF" },
  { "id": 3, "code": "GHI" }
]
```

```vague
// Inferred
schema Record {
  id: unique int in 1..3,
  code: unique "ABC" | "DEF" | "GHI"
}
```

## Advanced Detection

### Derived Fields

Detects computed relationships:

```json
[
  { "qty": 2, "price": 10, "total": 20 },
  { "qty": 3, "price": 15, "total": 45 }
]
```

```vague
schema Record {
  qty: int in 2..3,
  price: int in 10..15,
  total: qty * price  // Detected multiplication
}
```

### Ordering Constraints

Detects field ordering:

```json
[
  { "start": "2024-01-01", "end": "2024-01-15" },
  { "start": "2024-02-01", "end": "2024-03-01" }
]
```

```vague
schema Record {
  start: date,
  end: date,
  assume end >= start
}
```

### Conditional Constraints

Detects conditional patterns:

```json
[
  { "type": "premium", "discount": 20 },
  { "type": "premium", "discount": 25 },
  { "type": "basic", "discount": 0 },
  { "type": "basic", "discount": 0 }
]
```

```vague
schema Record {
  type: "premium" | "basic",
  discount: int in 0..25,
  assume if type == "basic" { discount == 0 }
}
```

## CSV Inference

### Basic CSV

```bash
vague --infer employees.csv --collection-name employees
```

### CSV Options

```bash
# Custom delimiter
vague --infer data.csv --infer-delimiter ";" --collection-name records

# Custom dataset name
vague --infer data.csv --collection-name users --dataset-name TestData
```

## Programmatic API

```typescript
import { inferSchema } from 'vague-lang';

const data = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
];

const schema = inferSchema(data, {
  collectionName: 'users',
  datasetName: 'Inferred'
});

console.log(schema);
```

## Practical Examples

### Migration Workflow

```bash
# 1. Export existing data
pg_dump --table=users -F json > users.json

# 2. Infer schema
vague --infer users.json -o users.vague

# 3. Review and adjust
# Edit users.vague to add constraints, relationships

# 4. Generate new test data
vague users.vague -o test-users.json
```

### API Contract Discovery

```bash
# 1. Capture API responses
curl https://api.example.com/products > products.json

# 2. Infer schema
vague --infer products.json -o products.vague

# 3. Generate mock data
vague products.vague -o mock-products.json -s 42
```

### Database Seeding

```bash
# 1. Export sample data
mongoexport --collection=orders --out=orders.json

# 2. Infer schema
vague --infer orders.json -o orders.vague

# 3. Generate scaled dataset
# Edit orders.vague to increase counts
vague orders.vague -o seed-data.json
```

## TypeScript Generation

Generate TypeScript types alongside schemas:

```bash
# Schema + TypeScript
vague --infer data.json --typescript -o schema.vague

# TypeScript only
vague --infer data.json --ts-only
```

Output:

```typescript
// schema.d.ts
export interface User {
  id: string;
  name: string;
  age: number;
  email: string;
  status: 'active' | 'pending' | 'inactive';
}
```

## Limitations

1. **Sample size matters** — More data = better inference
2. **Edge cases** — Rare values may not be detected
3. **Complex relationships** — Cross-record refs not auto-detected
4. **Nested objects** — Deep nesting may need manual adjustment

## Best Practices

1. **Use representative data** — Include edge cases in samples
2. **Review inferred schemas** — Adjust ranges and constraints
3. **Add relationships** — Manually add `any of` references
4. **Test generation** — Verify output matches expectations

## See Also

- [CLI Reference](/docs/cli#schema-inference) for all inference options
- [TypeScript API](/docs/typescript-api#inferschema) for programmatic use
