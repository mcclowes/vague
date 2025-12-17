# Basic Examples

Core Vague language features demonstrated through simple, focused examples.

## Examples

### `basic.vague`
**Demonstrates:** Basic schema definition, weighted superposition, date ranges, nested collections

A minimal example showing companies and invoices with line items. Shows the fundamental building blocks of Vague schemas.

**Key concepts:**
- Schema definitions with primitives (`string`, `int`, `decimal`, `date`)
- Weighted superposition (`0.6: "paid" | 0.3: "pending" | 0.1: "draft"`)
- Ranges (`int in 1..10`, `date in 2020..2024`)
- Cardinality for collections (`1..5 of LineItem`)

---

### `constraints.vague`
**Demonstrates:** Hard constraints (`assume`), conditional constraints (`assume if`)

Shows how to enforce business rules during generation using rejection sampling.

**Key concepts:**
- Hard constraints: `assume due_date >= issued_date`
- Conditional constraints: `assume if status == "paid" { amount > 0 }`
- Logical operators: `assume price > 50 or category == "budget"`
- Negation: `assume not discount > 40`

---

### `computed-fields.vague`
**Demonstrates:** Aggregate functions, nullable fields

Computed fields are evaluated after their dependencies are generated.

**Key concepts:**
- Aggregate functions: `count()`, `sum()`, `min()`, `max()`, `avg()`
- Nullable shorthand: `discount_code: string?`
- Explicit nullable: `notes: string | null`

---

### `cross-ref.vague`
**Demonstrates:** Cross-record references, parent references

Shows how to reference previously generated records and inherit values from parent schemas.

**Key concepts:**
- Cross-record reference: `customer: any of companies`
- Parent reference: `currency: = ^base_currency` (inherits from parent)
- Relationships between schemas in a dataset

---

### `dynamic-cardinality.vague`
**Demonstrates:** Conditional collection sizes, ternary expressions

Collection sizes can depend on field values evaluated at generation time.

**Key concepts:**
- Dynamic cardinality: `(size == "large" ? 5..10 : 1..3) of LineItem`
- Nested ternary: `size == "large" ? 5..10 : size == "medium" ? 3..5 : 1..2`
- Logical operators in ternary: `is_priority or size == "large" ? "express" : "standard"`
- Dataset-level validation: `validate { sum(orders.subtotal) >= 5000 }`

---

### `conditional-fields.vague`
**Demonstrates:** Fields that only exist when a condition is true (`when` clause)

Shows how to create variant schemas where certain fields only appear based on other field values.

**Key concepts:**
- Basic conditional: `companyNumber: string when type == "business"`
- Multiple conditions: `premiumHandling: boolean when size == "large" or size == "medium"`
- Numeric comparison: `bulkDiscount: decimal when basePrice >= 50`
- Combined conditions: `prioritySupport: boolean when verified == true and accountType == "premium"`

---

### `dataset-constraints.vague`
**Demonstrates:** `then` blocks for side effects, dataset validation, predicate functions

The most advanced basic example, showing how to model stateful scenarios like payments.

**Key concepts:**
- Side effects via `then` blocks: `invoice.amount_paid += amount`
- Ternary in side effects: `invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partially-paid"`
- Filtered references: `any of invoices where .amount_paid < .total`
- Mixed superposition: `0.3: int in 10..500 | 0.7: (invoice.total - invoice.amount_paid)`
- Dataset validation: `validate { all(invoices, .amount_paid <= .total) }`
- Predicate functions: `all()`, `some()`, `none()`

## Running Examples

```bash
# Run any example
node dist/cli.js examples/basics/basic.vague

# Pretty-print output
node dist/cli.js examples/basics/basic.vague -p

# Reproducible output with seed
node dist/cli.js examples/basics/basic.vague -s 12345
```
