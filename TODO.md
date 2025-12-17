# Vague Language - TODO

## Core Language
- [ ] **Conditional schema variants** - Add/remove fields based on type: `if type == "business" { companyNumber: string }`
- [ ] **Conditional field values** - Different generation logic per branch: `email: if type == "business" then corporateEmail() else personalEmail()`
- [ ] **Date arithmetic** - `due_date <= issued_date + 90.days`, relative dates: `createdAt in now - 30.days .. now`
- [ ] **Conditional probabilities** - `assume status == "paid" with probability 0.9 if due_date < today - 30.days`
- [ ] **Named distributions** - `distribution AgeStructure { 18..24: 15%, 25..34: 25% }` with `~` operator
- [ ] Explore other keywords for fields, like unique
- [ ] 'Match' syntax
- [ ] Logging functionality generally

## Dataset-Level Features

- [ ] **Balance constraints** - Special handling for `sum(debits) == sum(credits)` with adjustment strategy
- [ ] **Aggregate adjustment** - Adjust last record to meet aggregate constraint instead of full regeneration

## Negative Testing & Edge Cases

- [ ] **Selective violation** - `violating due_date >= issued_date` targets specific constraints
- [ ] **Boundary value generation** - `at boundaries` generates values at constraint edges
- [ ] **Edge case generation** - `Invoice where unusual` biases toward low-probability branches

## Advanced Features

- [ ] **Cascading `then` blocks** - (Potential) Allow `then` mutations to trigger other `then` blocks with depth limits
- [ ] **Scenario targeting** - `generate(50) { Invoice where status == "overdue" }`
- [ ] **Constraint analysis** - Warn on unsatisfiable constraints, estimate rejection probability
- [ ] **SMT solver** - Z3 integration for complex constraints
- [ ] **Probability modifier** - `assume status == "paid" with probability 0.7`

## Plugin System

- [ ] **Custom generators** - Pattern-based generators beyond faker
- [ ] **Plugin discovery** - Auto-load plugins from node_modules or directory

## Context System

- [ ] **Context definitions** - Parse and store context affects clauses
- [ ] **Context application** - `with Geography("en_GB")` actually influences generation
- [ ] **Context inheritance** - Child records inherit parent context

## Validation Mode (Dual-Use)

- [ ] **Data ingestion validation** - `vague validate data.json --schema schema.vague` to validate real data against Vague schemas
- [ ] **Reuse constraint engine** - Run `assume` constraints and `validate { }` blocks as assertions on external data
- [ ] **Error reporting** - Report which records fail which constraints with clear messages

## Code quality and organisation

- [ ] Break up the generator

## Output & Tooling

- [ ] **Multiple output formats** - CSV, SQL inserts, TypeScript fixtures
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

- [ ] Additional keywords like then - so, especially, etc.
- [ ] **Annotations (`#`)** - User metadata attached to schemas/fields, stored in AST but ignored by generator
  - `#name` - boolean flag (implicitly true)
  - `#name: "string"` - string value
  - `#name: 123` - integer value
  - `#name: true/false` - explicit boolean
  - Reserve `@decorator` syntax for future system-level features

## OAS parsing

- [ ] Extract Validation from OAS automatically? 
- [ ] Rather than 'from' we could use more specific words - 'extends', 'restricts', 'implements', - explore these
- [ ] Warn if validation in OAS spec - see below

```
"validation": {
  "warnings": [
    {
      "field": "SortCode",
      "details": "Must be 6 characters long if the specified currency is GBP."
    },
    {
      "field": "SortCode",
      "details": "Must be provided if the specified currency is GBP."
    }
  ],
  "information": []
}
```
in an OAS, we can see validation warnings defined. These are too human readable to programmatically leverage, but we could at least warn users if validation exists in the OAS but no validation at all is defined in Vague.

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
- [x] **Unique values** - `id: unique int in 1..1000` ensures no duplicates
- [x] **Built-in distributions** - `gaussian()`, `exponential()`, `lognormal()`, `poisson()`, `beta()`, `uniform()`
- [x] **Date functions** - `now()`, `today()`, `daysAgo()`, `daysFromNow()`, `datetime()`, `dateBetween()`, `formatDate()`
- [x] **Sequential/stateful generation** - `sequence("INV-", 1001)` and `sequenceInt("name", start)` for auto-incrementing values
- [x] **Previous references** - `previous("field")` for referencing the previous record in a collection
- [x] **Prettier and ESLint** - Code formatting and linting with `npm run format` and `npm run lint`
- [x] **Plugin architecture** - `registerPlugin()`, namespace resolution, `VaguePlugin` type
- [x] **OpenAPI example population** - `--oas-output`, `--oas-source`, `--oas-external`, `--oas-example-count`
- [x] **String transformations** - `uppercase()`, `lowercase()`, `capitalize()`, `kebabCase()`, `snakeCase()`, `camelCase()`, `trim()`, `concat()`, `substring()`, `replace()`, `length()`
- [x] **Mixed weighted/unweighted superposition** - `0.85: "Active" | "Archived"` where unweighted options share remaining probability
- [x] **Watch mode** - `-w/--watch` flag to regenerate output on file change
