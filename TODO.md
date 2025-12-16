# Vague Language - TODO

## Next Up

- [x] **Faker plugin** - `import faker from "vague-faker"` for semantic types
- [ ] **Syntax highlighting for VScode** - Look at ../Lea for how to implement this
- [ ] **Negative testing** - `dataset Invalid violating { ... }` to generate constraint-violating data
- [ ] **Probability modifier** - `assume status == "paid" with probability 0.7`

## Data Quality

- [ ] **Decimal precision** - Round decimals appropriately for currency etc.
- [ ] **Date formatting** - ISO 8601 output, configurable formats
- [ ] **Unique values** - Ensure IDs/references are unique where needed
- [ ] **Date arithmetic** - `due_date <= issued_date + 90.days`

## Context System

- [ ] **Context definitions** - Parse and store context affects clauses
- [ ] **Context application** - `with Geography("en_GB")` actually influences generation
- [ ] **Context inheritance** - Child records inherit parent context

## Distributions

- [ ] **Distribution application** - `age: int ~ AgeStructure` uses defined distribution
- [ ] **Soft constraints** - Probabilistic constraint weighting

## Dataset-Level Validation

- [ ] **Dataset-wide constraints** - `validate { sum(invoices.total) in 100_000..500_000 }`
- [ ] **Aggregate constraints** - Balance debits/credits across records

## Constraint Solving

- [ ] **Smart generation order** - Topological sort of field dependencies
- [ ] **Constraint analysis** - Warn on unsatisfiable constraints
- [ ] **SMT solver** - Z3 integration for complex constraints

## Output & Tooling

- [ ] **Multiple output formats** - CSV, SQL inserts, TypeScript fixtures
- [ ] **Seed support** - `--seed 123` for reproducible generation
- [ ] **Watch mode** - Regenerate on file change
- [ ] **Better error messages** - Parse error locations and suggestions

## Technical Debt

- [ ] **Type safety in generator** - Reduce `unknown` and `any` usage
- [ ] **Error recovery in parser** - Continue parsing after errors
- [ ] **LSP server** - Language server for editor support

See ROADMAP.md for detailed implementation plans.

## Completed

- [x] **Parent references** - `^currency` syntax for inheriting from parent scope
- [x] **`any of` expressions** - `customer: any of companies` for referencing collection items
- [x] **Filtered references** - `any of companies where .active == true`
- [x] **Computed field evaluation** - `total: = sum(line_items.amount)` with aggregates
- [x] **Hard constraints** - `assume due_date >= issued_date` with rejection sampling
- [x] **Conditional constraints** - `assume if status == "paid" { ... }`
- [x] **Logical operators** - `and`, `or`, `not` in constraints
- [x] **Aggregate functions** - `sum()`, `count()`, `min()`, `max()`, `avg()`
- [x] **Path expressions** - `line_items.amount` traverses into collections
- [x] **Markov chain strings** - Context-aware realistic text generation
- [x] **Schema validation** - Validate generated data against OpenAPI specs (3.0.x/3.1.x)
- [x] **CLI validation flags** - `-v`, `-m`, `--validate-only` for CI integration