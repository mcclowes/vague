# Vague Roadmap

## Current State

Basic language infrastructure complete:
- Lexer, parser, AST, generator
- Simple schemas and datasets
- Superposition (`|`) with weights
- Ranges and cardinality
- Markov chain string generation
- JSON output via CLI

## Phase 1: Core Constraints

Make individual records internally coherent.

### 1.1 Computed Fields ✅
```vague
schema Invoice {
    line_items: 1..10 * LineItem,
    total: = sum(line_items.amount)  // Actually evaluate this
}
```
- [x] Implement `sum()`, `count()`, `min()`, `max()`, `avg()`
- [x] Path expressions: `line_items.amount`
- [x] Field generation order (collections before computed fields)
- [ ] Arithmetic in computed fields (e.g., `= sum(items.price) * 1.2`)

### 1.2 Hard Constraints (Assume) ✅
```vague
schema Invoice {
    issued_date: date,
    due_date: date,

    assume due_date >= issued_date,
    assume due_date <= issued_date + 90.days
}
```
- [x] Parse `assume` keyword
- [x] Constraint AST nodes
- [x] Rejection sampling: generate, validate, retry
- [ ] Date arithmetic (`+ 90.days`)

### 1.3 Conditional Constraints ✅
```vague
schema Company {
    industry: "saas" | "manufacturing" | "retail",
    founded: date in 1990..2023,
    employee_count: int in 1..10000,

    assume if industry == "saas" {
        founded > 2005,
        employee_count < 500
    }
}
```
- [x] Parse `assume if` blocks
- [x] Conditional constraint evaluation
- [x] Multiple constraint blocks per schema
- [x] Logical operators: `and`, `or`, `not`

## Phase 2: Cross-Record References ✅

Make records reference each other coherently.

### 2.1 Collection References ✅
```vague
dataset TestData {
    companies: 100 * Company,
    invoices: 5000 * Invoice {
        customer: any of companies
    }
}
```
- [x] `any of <collection>` expression
- [x] Resolve references during generation
- [x] Foreign key coherence

### 2.2 Parent References ✅
```vague
schema Invoice {
    currency: = ^currency  // Inherit from parent
}
```
- [x] `^` parent scope operator
- [x] Track parent context during generation
- [x] Nested schema inheritance

### 2.3 Filtered References ✅
```vague
schema Payment {
    settles: any of invoices where .status == "unpaid"
}
```
- [x] `where` clause on `any of`
- [x] Filter collections during reference resolution

## Phase 3: Probabilistic Constraints

Control statistical distribution, not just valid/invalid.

### 3.1 Probability Modifier
```vague
assume status == "paid" with probability 0.7
assume employee_count < 500 with probability 0.8
```
- [ ] Parse `with probability` modifier
- [ ] Soft constraint weighting
- [ ] Influence generation without hard rejection

### 3.2 Conditional Probabilities
```vague
assume status == "paid" with probability 0.9 if due_date < today - 30.days
assume status == "overdue" with probability 0.8 if due_date < today
```
- [ ] Conditional probability expressions
- [ ] Dynamic probability based on field values

### 3.3 Distribution Application
```vague
distribution AgeStructure {
    18..24: 15%,
    25..34: 25%,
    35..44: 25%,
    45..54: 20%,
    55..64: 15%
}

schema Person {
    age: int ~ AgeStructure
}
```
- [ ] Named distributions
- [ ] `~` distribution operator
- [ ] Sample from defined distributions

## Phase 4: Dataset-Wide Constraints

The killer feature: global coherence across all records.

### 4.1 Aggregate Constraints
```vague
dataset Books {
    transactions: 1000 * Transaction,

    validate sum(transactions where .type == "debit" .amount)
          == sum(transactions where .type == "credit" .amount)
}
```
- [ ] Parse `validate` blocks
- [ ] Post-generation validation
- [ ] Regeneration on validation failure

### 4.2 Balance Computation
```vague
// Generate N-1 freely, compute last to balance
validate sum(debits) == sum(credits)
```
- [ ] Detect balancing constraints
- [ ] Compute-last strategy
- [ ] Iterative refinement for complex constraints

### 4.3 Monotonic/Trend Constraints
```vague
validate transactions.group_by(.month).map(sum(.amount)).is_increasing
```
- [ ] Grouping expressions
- [ ] Trend constraints (increasing, decreasing)
- [ ] Time-series coherence

## Phase 5: Advanced Features

### 5.1 Edge Case Generation
```vague
let edge_cases = generate(100) {
    Invoice where unusual  // Bias toward low-probability branches
}
```
- [ ] `unusual` keyword
- [ ] Inverse probability sampling
- [ ] Boundary value generation

### 5.2 Scenario Targeting
```vague
let late_payments = generate(50) {
    Invoice where status == "overdue" and total > 10000
}
```
- [ ] Pre-constrained generation
- [ ] Targeted scenario sampling

### 5.3 Previous References
```vague
schema Transaction {
    date: date > previous.date,  // Sequential coherence

    assume if type == "refund" {
        references: any previous where .type == "invoice"
    }
}
```
- [ ] `previous` keyword
- [ ] Sequential generation with history
- [ ] Back-references within collection

## Phase 6: Plugin System & Semantic Types

Keep core focused on structure/constraints, delegate semantic generation to plugins.

### 6.1 Plugin Architecture
```vague
import faker from "vague-faker"      // Official semantic types plugin
import custom from "./my-generators" // User-defined generators

schema Person {
    email: faker.email,
    phone: faker.phone("en_GB"),
    company: custom.company_name
}
```
- [ ] Plugin loader interface
- [ ] Namespace resolution for imported generators
- [ ] Plugin discovery (npm packages, local files)
- [ ] Type signature validation for generators

### 6.2 Built-in Faker Plugin
```vague
import faker from "vague-faker"

schema Contact {
    // Identity
    name: faker.name,
    email: faker.email,
    phone: faker.phone,

    // Location
    address: faker.address,
    city: faker.city,
    country: faker.country,
    postcode: faker.postcode("en_GB"),

    // Finance
    credit_card: faker.credit_card,
    iban: faker.iban("DE"),

    // Internet
    username: faker.username,
    url: faker.url,
    ip: faker.ipv4
}
```
- [ ] Wrap Faker.js as vague plugin
- [ ] Locale support via parameters
- [ ] 50+ common semantic types
- [ ] Consistent with existing Markov generators (names, companies)

### 6.3 Custom Generator Definition
```vague
// In ./my-generators.vague or .js
generator order_id {
    pattern: "ORD-{year}-{seq:6}"
}

generator sku {
    pattern: "{category:3}-{random:5}"
    categories: ["ELE", "CLO", "FOO", "HOM"]
}
```
- [ ] Pattern-based generators
- [ ] Stateful generators (sequences, unique values)
- [ ] Composable generator functions
- [ ] JS escape hatch for complex logic

## Phase 7: Negative Testing

Generate data that *violates* constraints for testing error handling.

### 7.1 Violating Datasets
```vague
schema Invoice {
    issued_date: date,
    due_date: date,
    amount: int in 1..10000,
    assume due_date >= issued_date,
    assume amount > 0
}

// Generate valid data
dataset Valid {
    invoices: 100 * Invoice
}

// Generate invalid data - violates ALL constraints
dataset Invalid violating {
    bad_invoices: 50 * Invoice
}
```
- [ ] `violating` keyword on dataset
- [ ] Invert constraint evaluation (reject if valid)
- [ ] Ensure at least one constraint violated per record

### 7.2 Selective Violation
```vague
// Violate specific constraints only
dataset EdgeCases {
    // due_date before issued_date
    backdated: 20 * Invoice violating due_date >= issued_date,

    // Zero or negative amounts
    zero_amount: 20 * Invoice violating amount > 0,

    // Multiple violations
    chaos: 10 * Invoice violating all
}
```
- [ ] Per-collection violation specifier
- [ ] Reference constraints by expression
- [ ] `violating all` for maximum chaos
- [ ] Violation reporting in output metadata

### 7.3 Boundary Value Generation
```vague
dataset Boundaries {
    // Generate at constraint boundaries
    edge_cases: 50 * Invoice at boundaries {
        amount: [0, 1, 9999, 10000, 10001],  // around the range
        due_date: [issued_date - 1, issued_date, issued_date + 1]
    }
}
```
- [ ] `at boundaries` clause
- [ ] Auto-detect boundaries from range constraints
- [ ] Off-by-one generation (min-1, min, max, max+1)
- [ ] Combine with violation for comprehensive edge cases

## Phase 8: Constraint Solving

Move beyond rejection sampling for complex constraints.

### 8.1 Constraint Analysis
```vague
schema Order {
    quantity: int in 1..100,
    unit_price: decimal in 0.01..1000,
    discount: decimal in 0..0.5,
    total: = quantity * unit_price * (1 - discount),

    assume total >= 10,
    assume total <= 50000,
    assume if quantity > 50 { discount >= 0.1 }
}
```
Current approach: generate randomly, reject if constraints fail (up to 100 retries).

Problem: With tight constraints, rejection rate can be very high.

- [ ] Analyze constraint graph at parse time
- [ ] Detect unsatisfiable constraint combinations
- [ ] Estimate rejection probability
- [ ] Warn when constraints are likely to timeout

### 8.2 Smart Generation Order
```vague
schema Invoice {
    status: "draft" | "sent" | "paid",
    sent_date: date?,
    paid_date: date?,

    assume if status == "sent" or status == "paid" { sent_date != null },
    assume if status == "paid" { paid_date != null },
    assume if paid_date != null { paid_date >= sent_date }
}
```
- [ ] Topological sort of field dependencies
- [ ] Generate constraining fields first
- [ ] Narrow ranges based on already-generated values
- [ ] Propagate constraints forward during generation

### 8.3 SMT Solver Integration (Advanced)
```vague
// For very complex constraints, delegate to Z3 or similar
schema BalancedLedger {
    entries: 10..100 * Entry,

    assume sum(entries where .type == "debit" .amount)
        == sum(entries where .type == "credit" .amount)
}
```
- [ ] Identify constraints suitable for SMT solving
- [ ] Z3 WASM integration for browser/Node
- [ ] Hybrid approach: SMT for structure, random for values
- [ ] Fallback to rejection sampling when SMT times out

### 8.4 Incremental Refinement
```vague
// Generate approximate, then refine to satisfy constraints
dataset Ledger {
    transactions: 1000 * Transaction,

    validate sum(transactions.amount) == 0  // Must balance
}
```
- [ ] Generate N-1 items freely
- [ ] Compute final item(s) to satisfy aggregate constraints
- [ ] Iterative adjustment for multi-constraint scenarios
- [ ] Report when exact satisfaction impossible

## Implementation Priority

1. ~~**Phase 1.2** - Hard constraints (enables date ordering)~~ ✅
2. ~~**Phase 1.3** - Conditional constraints~~ ✅
3. ~~**Phase 2** - Cross-record references~~ ✅
4. ~~**Phase 1.1** - Computed fields (enables invoice totals)~~ ✅
5. **Phase 6.2** - Faker plugin (quick win for semantic types)
6. **Phase 7.1** - Basic negative testing (invert existing constraint logic)
7. **Phase 3.1** - Probability modifier (enables realistic distributions)
8. **Phase 8.2** - Smart generation order (improves constraint satisfaction)
9. **Phase 4.1** - Dataset validation (enables coherence checking)
10. **Phase 6.1** - Full plugin architecture
11. **Phase 8.3** - SMT solver (for complex constraint scenarios)

This order maximizes value at each step while building toward the full vision.
