# Vague Language - TODO

## Next Up

- [ ] **Negative testing** - `dataset Invalid violating { ... }` to generate constraint-violating data
- [ ] **Probability modifier** - `assume status == "paid" with probability 0.7`
- [ ] **Smart generation order** - Topological sort of field dependencies, generate constraining fields first

## Core Language

- [ ] **Conditional schema variants** - Add/remove fields based on type: `if type == "business" { companyNumber: string }`
- [ ] **Conditional field values** - Different generation logic per branch: `email: if type == "business" then corporateEmail() else personalEmail()`
- [ ] **Dynamic cardinality** - Cardinality based on other fields: `items: if tier == "premium" then 5..10 else 1..2 * Item`
- [ ] **String transformations** - Derived strings: `slug: = kebabCase(title)`, `upper: = uppercase(name)`
- [ ] **Arithmetic in computed fields** - `= sum(items.price) * 1.2`
- [ ] **Date arithmetic** - `due_date <= issued_date + 90.days`, relative dates: `createdAt in now - 30.days .. now`
- [ ] **Conditional probabilities** - `assume status == "paid" with probability 0.9 if due_date < today - 30.days`
- [ ] **Named distributions** - `distribution AgeStructure { 18..24: 15%, 25..34: 25% }` with `~` operator

## Data Quality

- [ ] **Decimal precision** - Round decimals appropriately for currency etc.
- [ ] **Date formatting** - ISO 8601 output, configurable formats
- [ ] **Unique values** - Ensure IDs/references are unique where needed

## Dataset-Level Features

- [ ] **Dataset-wide constraints** - `validate { sum(invoices.total) in 100_000..500_000 }`
- [ ] **Aggregate constraints** - Balance debits/credits across records

## Negative Testing & Edge Cases

- [ ] **Selective violation** - `violating due_date >= issued_date` targets specific constraints
- [ ] **Boundary value generation** - `at boundaries` generates values at constraint edges
- [ ] **Edge case generation** - `Invoice where unusual` biases toward low-probability branches

## Advanced Features

- [ ] **Sequential/stateful generation** - `invoiceNumber: sequence("INV-", 1001)` for auto-incrementing values across dataset
- [ ] **Previous references** - `date > previous.date` for sequential coherence
- [ ] **Scenario targeting** - `generate(50) { Invoice where status == "overdue" }`
- [ ] **Constraint analysis** - Warn on unsatisfiable constraints, estimate rejection probability
- [ ] **SMT solver** - Z3 integration for complex constraints

## Plugin System

- [ ] **Plugin architecture** - Plugin loader, namespace resolution, discovery
- [ ] **Custom generators** - Pattern-based generators, stateful sequences

## Context System

- [ ] **Context definitions** - Parse and store context affects clauses
- [ ] **Context application** - `with Geography("en_GB")` actually influences generation
- [ ] **Context inheritance** - Child records inherit parent context

## Output & Tooling

- [ ] **Multiple output formats** - CSV, SQL inserts, TypeScript fixtures
- [ ] **Seed support** - `--seed 123` for reproducible generation
- [ ] **Watch mode** - Regenerate on file change
- [ ] **Better error messages** - Parse error locations and suggestions
- [ ] **LSP server** - Language server for editor support

## Technical Debt

- [ ] **Type safety in generator** - Reduce `unknown` and `any` usage
- [ ] **Error recovery in parser** - Continue parsing after errors
- [ ] **Modular parser** - Split into statements, expressions, primaries, functions (like Lea)

## Inspired by Lea

- [ ] **Richer builtins** - Expand beyond 5 aggregate functions (Lea has 60+)
- [ ] **REPL** - Interactive mode for experimenting with schemas
- [ ] **API embedding** - Embed in TypeScript with tagged templates: `` vague`schema Person { ... }` ``

---

## Completed

- [x] **Faker plugin** - `import faker from "vague-faker"` for semantic types
- [x] **Syntax highlighting for VSCode** - See `vscode-vague/` directory
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
- [x] **OpenAPI schema import** - `schema Pet from petstore.Pet { }` inherits fields from OpenAPI spec
