# Vague Language - TODO

## Next Up

- [ ] **Probability modifier** - `assume status == "paid" with probability 0.7`

## Core Language
- [ ] **Conditional schema variants** - Add/remove fields based on type: `if type == "business" { companyNumber: string }`
- [ ] **Conditional field values** - Different generation logic per branch: `email: if type == "business" then corporateEmail() else personalEmail()`
- [ ] **String transformations** - Derived strings: `slug: = kebabCase(title)`, `upper: = uppercase(name)`
- [ ] **Date arithmetic** - `due_date <= issued_date + 90.days`, relative dates: `createdAt in now - 30.days .. now`
- [ ] **Conditional probabilities** - `assume status == "paid" with probability 0.9 if due_date < today - 30.days`
- [ ] **Named distributions** - `distribution AgeStructure { 18..24: 15%, 25..34: 25% }` with `~` operator
- [ ] **Built-in distributions** - e.g. gaussian, uniform (default), exponential, log-normal - with a syntax for applying the distribution rather than hard coding stochastic values

## Data Quality

- [ ] **Date formatting** - ISO 8601 output, configurable formats

## Dataset-Level Features

- [ ] **Balance constraints** - Special handling for `sum(debits) == sum(credits)` with adjustment strategy
- [ ] **Aggregate adjustment** - Adjust last record to meet aggregate constraint instead of full regeneration

## Negative Testing & Edge Cases

- [ ] **Selective violation** - `violating due_date >= issued_date` targets specific constraints
- [ ] **Boundary value generation** - `at boundaries` generates values at constraint edges
- [ ] **Edge case generation** - `Invoice where unusual` biases toward low-probability branches

## Advanced Features

- [ ] **Cascading `then` blocks** - (Potential) Allow `then` mutations to trigger other `then` blocks with depth limits
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

## Validation Mode (Dual-Use)

- [ ] **Data ingestion validation** - `vague validate data.json --schema schema.vague` to validate real data against Vague schemas
- [ ] **Reuse constraint engine** - Run `assume` constraints and `validate { }` blocks as assertions on external data
- [ ] **Error reporting** - Report which records fail which constraints with clear messages

## Output & Tooling

- [ ] **Multiple output formats** - CSV, SQL inserts, TypeScript fixtures
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

## Ideas to explore

- [ ] Addfitional keywords like then - so, especially, etc.

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
- [x] **Dataset-wide constraints** - `validate { sum(invoices.total) >= 100000 }` with rejection sampling
- [x] **Aggregate constraints** - Cross-collection constraints like `sum(payments.amount) <= sum(invoices.total)`
- [x] **`then` blocks** - Side effects to mutate referenced records: `schema Payment { ... } then { invoice.status = "paid" }`
- [x] **Ternary expressions** - `condition ? value : other` for conditional values
- [x] **Logical operators in expressions** - `and`, `or`, `not` work everywhere (comparisons, ternaries, etc.)
- [x] **Dynamic cardinality** - `(condition ? 5..10 : 1..3) * Item` for conditional collection sizes
- [x] **Nullable fields** - `string?` and `int | null` syntax for fields that can be null
- [x] **Mixed superposition** - `int in 10..500 | field.ref` with optional weights: `0.7: int in 10..100 | 0.3: field`
- [x] **Seed support** - `--seed 123` for reproducible generation
- [x] **Negative testing** - `dataset Invalid violating { ... }` to generate constraint-violating data
- [x] **Logical operators in where clauses** - `any of invoices where .status == "paid" or .status == "partial"`
- [x] **Arithmetic in computed fields** - `= sum(items.price) * 1.2`
- [x] **Decimal precision** - `round()`, `floor()`, `ceil()` functions with decimal places
- [x] **Unique values** - `id: int in 1..1000 unique` ensures no duplicates
