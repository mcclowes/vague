# Vague vs. Other Tools

Vague isn't competing with fake data libraries. It's solving a different problem: **how do you formally describe what valid data looks like?**

This document compares Vague to tools you might consider for test data generation and schema definition.

---

## The Core Difference

| Tool Category | Primary Purpose | Vague Equivalent |
|---------------|-----------------|------------------|
| **Faker.js / Chance.js** | Generate realistic-looking values | Built-in via `faker.*` plugin |
| **JSON Schema** | Describe structure and types | Schema definitions |
| **Property-based testing** (QuickCheck, Hypothesis) | Generate from constraints | `assume` blocks + constraint solving |
| **OpenAPI** | API contract specification | Import/export + validation |

Vague combines all four into a single declarative language.

---

## Detailed Comparisons

### vs. Faker.js / Mockaroo / Synthetic Data Tools

**Faker.js** generates realistic individual values. **Vague** describes entire data models with relationships and constraints.

| Capability | Faker.js | Vague |
|------------|----------|-------|
| Realistic names, emails, etc. | `faker.person.fullName()` | `fullName()` or `faker.person.fullName()` |
| Weighted distributions | Manual logic | `0.8: "active" \| 0.2: "inactive"` |
| Inter-field constraints | Manual logic | `assume due_date >= issued_date` |
| Cross-record relationships | Manual wiring | `customer: any of customers` |
| Conditional constraints | Manual logic | `assume if status == "paid" { amount > 0 }` |
| Edge case bias | Manual creation | `issuer.homoglyph()`, `issuer.sqlLike()` |
| Reproducible output | Manual seeding | `--seed 123` |
| Schema validation | Separate tool | Same file with `--validate-data` |

**When to use Faker.js alone:** Simple scripts that need a few fake values.

**When to use Vague:** Test suites, API mocking, or anywhere data has relationships and rules.

```javascript
// Faker.js: Manual relationship wiring
const customers = Array(50).fill().map(() => ({
  id: faker.string.uuid(),
  status: Math.random() < 0.8 ? 'active' : 'inactive'
}));

const activeCustomers = customers.filter(c => c.status === 'active');
const invoices = Array(200).fill().map(() => ({
  customer_id: activeCustomers[Math.floor(Math.random() * activeCustomers.length)].id,
  issued_date: faker.date.past(),
  due_date: // ... must be after issued_date, manual logic needed
}));
```

```vague
// Vague: Declarative relationships and constraints
schema Customer {
  id: uuid(),
  status: 0.8: "active" | 0.2: "inactive"
}

schema Invoice {
  customer: any of customers where .status == "active",
  issued_date: date in 2024..2024,
  due_date: date in 2024..2024,

  assume due_date >= issued_date
}

dataset Test {
  customers: 50 of Customer,
  invoices: 200 of Invoice
}
```

---

### vs. JSON Schema

**JSON Schema** describes what data *looks like*. **Vague** describes what data looks like *and generates it*.

| Capability | JSON Schema | Vague |
|------------|-------------|-------|
| Type definitions | `"type": "string"` | `name: string` |
| Enums | `"enum": ["a", "b"]` | `status: "a" \| "b"` |
| Ranges | `"minimum": 0, "maximum": 100` | `age: int in 0..100` |
| Required fields | `"required": ["id"]` | All fields required by default |
| Nullable | `"type": ["string", "null"]` | `name: string?` |
| Patterns | `"pattern": "^[A-Z]{3}$"` | `code: regex("[A-Z]{3}")` |
| **Generation** | Requires separate tool | Built-in |
| **Weighted distributions** | Not supported | `0.7: "a" \| 0.3: "b"` |
| **Cross-field constraints** | Limited (`if/then`) | `assume a >= b` |
| **Cross-record relationships** | Not supported | `any of collection` |
| **Realistic values** | Not supported | `faker.*`, semantic generators |

**When to use JSON Schema alone:** API documentation, request/response validation.

**When to use Vague:** When you need to generate data that conforms to constraints JSON Schema can't express.

```json
// JSON Schema: Can't express "due_date >= issued_date"
{
  "type": "object",
  "properties": {
    "issued_date": { "type": "string", "format": "date" },
    "due_date": { "type": "string", "format": "date" }
  }
}
```

```vague
// Vague: Constraint is part of the schema
schema Invoice {
  issued_date: date in 2024..2024,
  due_date: date in 2024..2024,
  assume due_date >= issued_date
}
```

---

### vs. Property-Based Testing (QuickCheck, fast-check, Hypothesis)

**Property-based testing** generates inputs to find edge cases that break invariants. **Vague** generates realistic data that satisfies domain constraints.

| Capability | Property Testing | Vague |
|------------|------------------|-------|
| Random generation | Yes (uniform) | Yes (weighted) |
| Shrinking | Yes | No |
| Constraint satisfaction | Via filters (rejection) | Via constraint solving |
| Realistic distributions | No | Yes (`0.8: "active"`) |
| Domain modeling | Generators are code | Declarative schemas |
| Cross-record refs | Manual | `any of collection` |
| Negative testing | Manual | `dataset X violating { }` |
| Reusable schemas | Code | `.vague` files |

**When to use property-based testing:** Finding edge cases in pure functions.

**When to use Vague:** Generating realistic test fixtures with domain constraints.

```typescript
// fast-check: Generating constrained data requires custom arbitraries
const invoiceArb = fc.record({
  issued_date: fc.date(),
  due_date: fc.date(),
  status: fc.constantFrom('draft', 'sent', 'paid'),
  amount: fc.integer({ min: 100, max: 10000 })
}).filter(inv => inv.due_date >= inv.issued_date)  // Rejection sampling
  .filter(inv => inv.status !== 'paid' || inv.amount > 0);
```

```vague
// Vague: Constraints are declarative
schema Invoice {
  issued_date: date in 2024..2024,
  due_date: date in 2024..2024,
  status: "draft" | "sent" | "paid",
  amount: int in 100..10000,

  assume due_date >= issued_date,
  assume if status == "paid" { amount > 0 }
}
```

**Complementary use:** Use Vague to generate fixtures, property-based testing to verify invariants.

---

### vs. OpenAPI / Swagger

**OpenAPI** specifies API contracts. **Vague** can import OpenAPI schemas, generate conformant data, and populate OpenAPI specs with realistic examples.

| Capability | OpenAPI | Vague |
|------------|---------|-------|
| Schema definition | Yes | Yes (different syntax) |
| Type constraints | Yes | Yes |
| Format hints | `format: "email"` | Auto-detected, `email()` |
| Examples | Manual or tooling | Auto-generated |
| **Generation** | Requires tools | Built-in |
| **Cross-schema refs** | `$ref` (structure only) | `any of collection` (values) |
| **Business constraints** | `x-` extensions | `assume` blocks |
| **Weighted distributions** | Not supported | Native |

**Workflow integration:**

```bash
# Import OpenAPI schemas into Vague
import api from "openapi.json"
schema Pet from api.Pet { age: int in 1..15 }

# Validate generated data against OpenAPI
vague data.vague -v openapi.json -m '{"pets": "Pet"}'

# Populate OpenAPI spec with generated examples
vague data.vague --oas-source api.json --oas-output api-with-examples.json
```

---

## Feature Matrix

| Feature | Faker | JSON Schema | fast-check | OpenAPI | **Vague** |
|---------|-------|-------------|------------|---------|-----------|
| Realistic values | Yes | No | No | No | Yes |
| Type constraints | No | Yes | Yes | Yes | Yes |
| Weighted distributions | Manual | No | Manual | No | Native |
| Cross-field constraints | Manual | Limited | Filter | No | Native |
| Cross-record relationships | Manual | No | Manual | `$ref` | Native |
| Conditional constraints | Manual | `if/then` | Filter | No | Native |
| Edge case generation | Manual | No | Shrinking | No | `issuer.*` |
| Negative testing | Manual | No | Manual | No | `violating` |
| Schema validation | No | Yes | No | Yes | Yes |
| Data validation | No | Yes | No | Yes | Yes |
| Reproducible (seeded) | Manual | No | Yes | No | Yes |
| Declarative syntax | No | Yes | No | Yes | Yes |

---

## When to Choose Vague

**Choose Vague when:**

1. **Data has relationships** — Invoices reference customers, payments reference invoices
2. **Data has constraints** — Due dates must follow issued dates, amounts must be positive
3. **You need realistic distributions** — 80% of orders are fulfilled, 5% are disputed
4. **You want edge case coverage** — Unicode exploits, SQL injection patterns, boundary values
5. **You need reproducibility** — Same seed = same data across test runs
6. **You validate the same schemas** — Generate test data AND validate production data

**Stick with simpler tools when:**

1. You just need a few random values for a quick script
2. Your data has no relationships or constraints
3. You're already using property-based testing for pure function testing

---

## Migration Patterns

### From Faker.js

```javascript
// Before: Faker.js with manual logic
const users = Array(100).fill().map(() => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  status: Math.random() < 0.8 ? 'active' : 'inactive',
  created: faker.date.past()
}));
```

```vague
// After: Vague schema
schema User {
  id: uuid(),
  email: email(),
  status: 0.8: "active" | 0.2: "inactive",
  created: datetime(2020, 2024)
}

dataset Test { users: 100 of User }
```

### From JSON Schema

```json
// Before: JSON Schema (can't express constraints)
{
  "type": "object",
  "properties": {
    "status": { "enum": ["draft", "paid"] },
    "amount": { "type": "integer", "minimum": 0 }
  }
}
```

```vague
// After: Vague with constraint
schema Invoice {
  status: "draft" | "paid",
  amount: int in 0..10000,
  assume if status == "paid" { amount > 0 }
}
```

### From Custom Test Fixtures

```typescript
// Before: Hand-maintained JSON fixtures
const fixtures = {
  validInvoice: { status: 'paid', amount: 500 },
  invalidInvoice: { status: 'paid', amount: 0 }  // Edge case
};
```

```vague
// After: Vague generates valid + invalid
schema Invoice {
  status: "draft" | "paid",
  amount: int in 0..1000,
  assume if status == "paid" { amount > 0 }
}

dataset Valid { invoices: 100 of Invoice }
dataset Invalid violating { bad_invoices: 100 of Invoice }
```

---

## Summary

Vague is not a replacement for Faker — it includes Faker. It's not a replacement for JSON Schema — it can import and validate against OpenAPI. It's not a replacement for property-based testing — they're complementary.

Vague is the answer to: **"How do we formally describe what valid data looks like for our APIs?"**

The same `.vague` file that generates your test fixtures can validate your production data. That's a schema contract, not a data faker.
