---
sidebar_position: 1
title: Introduction
slug: /
---

# Vague

A declarative language for describing and generating realistic data. Vague treats ambiguity as a first-class primitive — declare the shape of valid data and let the runtime figure out how to populate it.

## Why Vague?

**Vague is a data description model for APIs, not just a fake data tool.**

Think of it as OpenAPI meets property-based testing: you describe *what valid data looks like* — its structure, constraints, distributions, and edge cases — and Vague handles generation. The same schema that generates test data can validate production data.

| What You Need | Traditional Tools | Vague |
|---------------|-------------------|-------|
| **Intent** — "80% of users are active" | Random selection | `status: 0.8: "active" \| 0.2: "inactive"` |
| **Constraints** — "due date ≥ issued date" | Manual validation | `assume due_date >= issued_date` |
| **Relationships** — "payment references an invoice" | Manual wiring | `invoice: any of invoices where .status == "open"` |
| **Edge cases** — "test with Unicode exploits" | Manual creation | `name: issuer.homoglyph("admin")` |
| **Validation** — "does this data match the schema?" | Separate tool | Same `.vague` file with `--validate-data` |

The question isn't "which fake data library?" — it's "how do we formally describe what valid data looks like for our APIs?"

## Quick Example

```vague
schema Customer {
  name: string,
  status: 0.8: "active" | 0.2: "inactive"
}

schema Invoice {
  customer: any of customers,
  amount: decimal in 100..10000,
  status: "draft" | "sent" | "paid",

  assume amount > 0
}

dataset TestData {
  customers: 50 of Customer,
  invoices: 200 of Invoice
}
```

## Key Features

- **Superposition** — Weighted random choices with intuitive syntax
- **Constraints** — Hard and conditional constraints with rejection sampling
- **Cross-references** — Reference other records with filtered queries
- **Computed fields** — Aggregates, arithmetic, and derived values
- **Side effects** — Mutate referenced records after generation
- **Plugins** — Faker, edge-case generators, dates, regex patterns
- **OpenAPI integration** — Import schemas, validate data, populate examples
- **Schema inference** — Reverse-engineer schemas from JSON/CSV data
