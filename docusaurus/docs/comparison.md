---
sidebar_position: 14
title: Comparison
---

# Vague vs. Other Tools

Vague isn't competing with fake data libraries. It's solving a different problem: **how do you formally describe what valid data looks like?**

## The Core Difference

| Tool Category | Primary Purpose | Vague Equivalent |
|---------------|-----------------|------------------|
| **Faker.js / Chance.js** | Generate realistic-looking values | Built-in via `faker.*` plugin |
| **JSON Schema** | Describe structure and types | Schema definitions |
| **Property-based testing** | Generate from constraints | `assume` blocks |
| **OpenAPI** | API contract specification | Import/export + validation |

Vague combines all four into a single declarative language.

## vs. Faker.js

**Faker.js** generates realistic individual values. **Vague** describes entire data models with relationships and constraints.

| Capability | Faker.js | Vague |
|------------|----------|-------|
| Realistic names, emails | `faker.person.fullName()` | `fullName()` |
| Weighted distributions | Manual logic | `0.8: "active" \| 0.2: "inactive"` |
| Inter-field constraints | Manual logic | `assume due_date >= issued_date` |
| Cross-record relationships | Manual wiring | `customer: any of customers` |
| Edge case bias | Manual creation | `issuer.homoglyph()` |
| Reproducible output | Manual seeding | `--seed 123` |

**When to use Faker alone:** Simple scripts that need a few fake values.

**When to use Vague:** Test suites, API mocking, or anywhere data has relationships.

```javascript
// Faker: Manual relationship wiring
const customers = Array(50).fill().map(() => ({
  id: faker.string.uuid(),
  status: Math.random() < 0.8 ? 'active' : 'inactive'
}));

const activeCustomers = customers.filter(c => c.status === 'active');
const invoices = Array(200).fill().map(() => ({
  customer_id: activeCustomers[Math.floor(Math.random() * activeCustomers.length)].id,
  // due_date must be after issued_date... manual logic
}));
```

```vague
// Vague: Declarative
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

## vs. JSON Schema

**JSON Schema** describes what data *looks like*. **Vague** describes what data looks like *and generates it*.

| Capability | JSON Schema | Vague |
|------------|-------------|-------|
| Type definitions | `"type": "string"` | `name: string` |
| Enums | `"enum": ["a", "b"]` | `"a" \| "b"` |
| Ranges | `"minimum": 0` | `int in 0..100` |
| **Generation** | Requires separate tool | Built-in |
| **Weighted distributions** | Not supported | `0.7: "a" \| 0.3: "b"` |
| **Cross-field constraints** | Limited (`if/then`) | `assume a >= b` |
| **Cross-record relationships** | Not supported | `any of collection` |

**When to use JSON Schema:** API documentation, request/response validation.

**When to use Vague:** When you need to generate data that conforms to constraints JSON Schema can't express.

## vs. Property-Based Testing

**Property-based testing** (QuickCheck, fast-check) generates inputs to find edge cases. **Vague** generates realistic data that satisfies domain constraints.

| Capability | Property Testing | Vague |
|------------|------------------|-------|
| Random generation | Yes (uniform) | Yes (weighted) |
| Shrinking | Yes | No |
| Realistic distributions | No | `0.8: "active"` |
| Domain modeling | Code | Declarative |
| Cross-record refs | Manual | `any of` |
| Negative testing | Manual | `violating` |

**When to use property-based testing:** Finding edge cases in pure functions.

**When to use Vague:** Generating realistic test fixtures.

**Complementary use:** Use Vague to generate fixtures, property-based testing to verify invariants.

## vs. OpenAPI

**OpenAPI** specifies API contracts. **Vague** can import OpenAPI schemas, generate conformant data, and populate specs with examples.

| Capability | OpenAPI | Vague |
|------------|---------|-------|
| Schema definition | Yes | Yes |
| Format hints | `format: "email"` | `email()` |
| Examples | Manual | Auto-generated |
| **Generation** | Requires tools | Built-in |
| **Cross-schema refs** | `$ref` (structure) | `any of` (values) |
| **Business constraints** | `x-` extensions | `assume` blocks |

**Workflow integration:**

```bash
# Import OpenAPI → generate → validate → populate examples
vague data.vague -v api.json --oas-output api-with-examples.json
```

## Feature Matrix

| Feature | Faker | JSON Schema | fast-check | OpenAPI | **Vague** |
|---------|-------|-------------|------------|---------|-----------|
| Realistic values | Yes | No | No | No | Yes |
| Type constraints | No | Yes | Yes | Yes | Yes |
| Weighted distributions | Manual | No | Manual | No | Native |
| Cross-field constraints | Manual | Limited | Filter | No | Native |
| Cross-record refs | Manual | No | Manual | `$ref` | Native |
| Edge case generation | Manual | No | Shrinking | No | `issuer.*` |
| Negative testing | Manual | No | Manual | No | `violating` |
| Schema validation | No | Yes | No | Yes | Yes |
| Reproducible (seeded) | Manual | No | Yes | No | Yes |

## When to Choose Vague

**Choose Vague when:**

1. **Data has relationships** — Invoices reference customers
2. **Data has constraints** — Due dates must follow issued dates
3. **You need realistic distributions** — 80% of orders are fulfilled
4. **You want edge case coverage** — Unicode exploits, boundary values
5. **You need reproducibility** — Same seed = same data
6. **You validate the same schemas** — Generate AND validate

**Stick with simpler tools when:**

1. You just need a few random values
2. Your data has no relationships or constraints
3. You're testing pure functions

## Summary

Vague is not a replacement for Faker — it includes Faker. It's not a replacement for JSON Schema — it can import and validate against OpenAPI. It's not a replacement for property-based testing — they're complementary.

Vague answers: **"How do we formally describe what valid data looks like for our APIs?"**

The same `.vague` file that generates your test fixtures can validate your production data. That's a schema contract, not a data faker.
