# Vague Language - TODO

## MVP Completion

- [ ] **Parent references** - `^company.currency` syntax for inheriting from parent scope
- [ ] **`any of` expressions** - `customer: any of companies` for referencing collection items
- [ ] **Per-parent cardinality** - `invoices: 50..500 per company * Invoice`
- [ ] **OpenAPI import resolution** - Actually load and use imported schemas
- [ ] **Computed field evaluation** - `total: = sum(line_items.amount)` should calculate
- [ ] **Hard constraints** - `constraints { issue_date < due_date }` with rejection sampling
- [ ] **Conditional fields** - `paid_date: date when status == "paid"`

## Data Quality

- [x] **Markov chain strings** - Generate realistic text using Markov chains
- [ ] **Faker integration** - `name: faker.company` for realistic strings
- [ ] **Decimal precision** - Round decimals appropriately for currency etc.
- [ ] **Date formatting** - ISO 8601 output, configurable formats
- [ ] **Unique values** - Ensure IDs/references are unique where needed

## Context System

- [ ] **Context definitions** - Parse and store context affects clauses
- [ ] **Context application** - `with Geography("en_GB")` actually influences generation
- [ ] **Context inheritance** - Child records inherit parent context
- [ ] **Context composition** - Multiple contexts combine correctly

## Distributions

- [ ] **Distribution application** - `age: int ~ AgeStructure` uses defined distribution
- [ ] **Soft constraints** - `total ~ 1000` biases toward value without hard requirement
- [ ] **Correlation** - `industry ~ occupation` for correlated field generation

## Validation

- [ ] **Dataset-wide validation** - `validate { sum(invoices.total) in 100_000..500_000 }`
- [ ] **Constraint checking** - Validate generated data meets hard constraints
- [ ] **Regeneration on failure** - Retry generation when constraints fail

## Output & Tooling

- [ ] **Multiple output formats** - CSV, SQL inserts, TypeScript fixtures
- [ ] **Seed support** - `--seed 123` for reproducible generation
- [ ] **Watch mode** - Regenerate on file change
- [ ] **Schema validation** - Validate output against JSON Schema
- [ ] **Error messages** - Better parse error locations and suggestions

## Language Features (V2+)

- [ ] **Match expressions** - `match locale { "en_GB" => "GBP", ... }`
- [ ] **Structured generation** - Household structures with relationships
- [ ] **Previous reference** - `date: > previous.date` for sequential coherence
- [ ] **SMT solver integration** - For tightly coupled constraints
- [ ] **Iterative refinement** - For dataset-wide balancing

## Technical Debt

- [ ] **Type safety in generator** - Reduce `unknown` and `any` usage
- [ ] **Error recovery in parser** - Continue parsing after errors
- [ ] **Source maps** - Map generated output back to .vague source
- [ ] **LSP server** - Language server for editor support
