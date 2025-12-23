# Vague Language - TODO

## Next Up

### Performance
| Issue | Location | Note |
|-------|----------|------|
| No constraint caching | generator.ts:440-467 | Re-evaluates all constraints per instance |

### Known Limitations
| Issue | Location | Note |
|-------|----------|------|
| `any` types in validator | validator.ts:30-47 | ESM/CJS interop with Ajv library requires `any` |

---

## Core Language

- [ ] **Conditional field values** - Different generation logic per branch: `email: if type == "business" then corporateEmail() else personalEmail()`
- [ ] **Conditional probabilities** - `assume status == "paid" with probability 0.9 if due_date < today - 30.days`
- [ ] **Named distributions** - `distribution AgeStructure { 18..24: 15%, 25..34: 25% }` with `~` operator
- [ ] Explore other keywords for fields, like unique
- [ ] Logging functionality generally

## Dataset-Level Features

- [ ] **Balance constraints** - Special handling for `sum(debits) == sum(credits)` with adjustment strategy
- [ ] **Aggregate adjustment** - Adjust last record to meet aggregate constraint instead of full regeneration

## Negative Testing & Edge Cases

- [ ] **Selective violation** - `violating due_date >= issued_date` targets specific constraints
- [ ] **Boundary value generation** - `at boundaries` generates values at constraint edges
- [ ] **Edge case generation** - `Invoice where unusual` biases toward low-probability branches

## Advanced Features

- [ ] **Cascading `then` blocks** - Allow `then` mutations to trigger other `then` blocks with depth limits
- [ ] **Scenario targeting** - `generate(50) { Invoice where status == "overdue" }`
- [ ] **Constraint analysis** - Warn on unsatisfiable constraints, estimate rejection probability
- [ ] **SMT solver** - Z3 integration for complex constraints
- [ ] **Probability modifier** - `assume status == "paid" with probability 0.7`

## Plugin System

- [ ] **Custom generators** - Pattern-based generators beyond faker

## Context System

- [ ] **Context definitions** - Parse and store context affects clauses
- [ ] **Context application** - `with Geography("en_GB")` actually influences generation
- [ ] **Context inheritance** - Child records inherit parent context

## Output & Tooling

- [x] **Mock server mode** - `vague schema.vague --serve [port]` serves collections as REST endpoints
- [ ] **Multiple output formats** - SQL inserts, TypeScript fixtures
- [ ] **LSP server** - Language server for editor support

## Technical Debt

- [x] **Error recovery in parser** - `parseWithRecovery()` collects multiple errors and returns partial AST

## Inspired by Lea

- [ ] **Richer builtins** - Expand beyond 9 aggregate functions (Lea has 60+)
- [ ] **REPL** - Interactive mode for experimenting with schemas

## Ideas to Explore

- [ ] Additional keywords like then - so, especially, etc.
- [ ] **Annotations (`#`)** - User metadata attached to schemas/fields, stored in AST but ignored by generator
  - `#name` - boolean flag (implicitly true)
  - `#name: "string"` - string value
  - `#name: 123` - integer value
  - `#name: true/false` - explicit boolean
  - Reserve `@decorator` syntax for future system-level features

## OAS Parsing

- [ ] Extract validation from OAS automatically
- [ ] Rather than 'from' we could use more specific words - 'extends', 'restricts', 'implements'
- [ ] Warn if validation exists in OAS spec but no validation defined in Vague

```json
"validation": {
  "warnings": [
    { "field": "SortCode", "details": "Must be 6 characters long if the specified currency is GBP." },
    { "field": "SortCode", "details": "Must be provided if the specified currency is GBP." }
  ]
}
```

---

## Completed

### Language Features
- [x] **Conditional fields** - `companyNumber: string when type == "business"`
- [x] **Date arithmetic** - `due_date <= issued_date + date.days(90)` with duration functions
- [x] **Match expressions** - `match status { "pending" => "Awaiting", "shipped" => "On way" }`
- [x] **Cardinality syntax** - `1599 of Schema` instead of `1599 * Schema`
- [x] **Parent references** - `^currency` syntax for inheriting from parent scope
- [x] **`any of` expressions** - `customer: any of companies` for referencing collection items
- [x] **Filtered references** - `any of companies where .active == true`
- [x] **Computed field evaluation** - `total: sum(line_items.amount)` with aggregates
- [x] **Hard constraints** - `assume due_date >= issued_date` with rejection sampling
- [x] **Conditional constraints** - `assume if status == "paid" { ... }`
- [x] **Logical operators** - `and`, `or`, `not` everywhere (constraints, comparisons, ternaries, where clauses)
- [x] **Aggregate functions** - `sum()`, `count()`, `min()`, `max()`, `avg()`
- [x] **Path expressions** - `line_items.amount` traverses into collections
- [x] **Ternary expressions** - `condition ? value : other`
- [x] **Dynamic cardinality** - `(condition ? 5..10 : 1..3) of Item`
- [x] **Nullable fields** - `string?` and `int | null` syntax
- [x] **Mixed superposition** - `int in 10..500 | field.ref` with optional weights
- [x] **Mixed weighted/unweighted superposition** - `0.85: "Active" | "Archived"` sharing remaining probability
- [x] **Negative testing** - `dataset Invalid violating { ... }`
- [x] **Arithmetic in computed fields** - `= sum(items.price) * 1.2`
- [x] **Decimal precision** - `round()`, `floor()`, `ceil()` with decimal places
- [x] **Unique values** - `id: unique int in 1..1000`
- [x] **Ordered sequences** - `[a, b, c, d]` cycles through values
- [x] **Private fields** - `age: private int` excluded from output

### Generation Features
- [x] **Built-in distributions** - `gaussian()`, `exponential()`, `lognormal()`, `poisson()`, `beta()`, `uniform()`
- [x] **Date functions** - `now()`, `today()`, `daysAgo()`, `daysFromNow()`, `datetime()`, `dateBetween()`, `formatDate()`
- [x] **Date plugin** - `date.weekday()`, `date.weekend()`, `date.dayOfWeek()`
- [x] **Sequential generation** - `sequence("INV-", 1001)` and `sequenceInt("name", start)`
- [x] **Previous references** - `previous("field")` for referencing previous record
- [x] **String transformations** - `uppercase()`, `lowercase()`, `capitalize()`, `kebabCase()`, `snakeCase()`, `camelCase()`, `trim()`, `concat()`, `substring()`, `replace()`, `length()`
- [x] **Markov chain strings** - Context-aware realistic text generation
- [x] **Faker plugin** - Semantic types via faker.js

### Dataset Features
- [x] **Dataset-wide constraints** - `validate { sum(invoices.total) >= 100000 }`
- [x] **Aggregate constraints** - Cross-collection constraints like `sum(payments.amount) <= sum(invoices.total)`
- [x] **`then` blocks** - Side effects to mutate referenced records

### Validation
- [x] **Data ingestion validation** - `--validate-data data.json --schema schema.vague`
- [x] **Constraint engine reuse** - Run `assume` constraints as assertions on external data
- [x] **Error reporting** - Clear messages for which records fail which constraints
- [x] **Dataset-level validation** - Run `validate { }` blocks on external data
- [x] **Schema validation** - Validate against OpenAPI specs (3.0.x/3.1.x)
- [x] **CLI validation flags** - `-v`, `-m`, `--validate-only`

### OpenAPI Integration
- [x] **Schema import** - `schema Pet from petstore.Pet { }` inherits fields
- [x] **Example population** - `--oas-output`, `--oas-source`, `--oas-external`, `--oas-example-count`

### Schema Inference
- [x] **JSON inference** - `inferSchema()` and `--infer` CLI option
- [x] **CSV inference** - `--infer data.csv` with delimiter and collection name options
- [x] **Correlation detection** - Infer derived fields, ordering constraints, conditional constraints

### CLI & Tooling
- [x] **Seed support** - `--seed 123` for reproducible generation
- [x] **Watch mode** - `-w/--watch` flag
- [x] **Better error messages** - ParseError class with source snippets and location info
- [x] **Prettier and ESLint** - `npm run format` and `npm run lint`
- [x] **VSCode syntax highlighting** - See `vscode-vague/` directory

### API & Architecture
- [x] **API embedding** - Tagged templates: `` vague`schema Person { ... }` ``
- [x] **Plugin architecture** - `registerPlugin()`, namespace resolution, `VaguePlugin` type
- [x] **Plugin discovery** - Auto-load from `./plugins/`, `./vague-plugins/`, `node_modules/vague-plugin-*`
- [x] **Strict mode** - `compile(source, { strict: true })` throws on invalid data
- [x] **Context-based seeding** - Each `compile()` call gets its own RNG instance
- [x] **Optional field probability** - `compile(source, { optionalFieldProbability: 0.5 })`
- [x] **Exhaustiveness checking** - TypeScript `never` checks catch unhandled cases

### Code Quality (Resolved)
- [x] **Type safety** - Safe coercion helpers in type-guards.ts
- [x] **Modular parser** - Split into base.ts, primaries.ts, expressions.ts, types.ts, statements.ts
- [x] **Modular generator** - Extracted builtins: aggregate, date, distribution, math, predicate, sequence, string
- [x] **Context lifecycle** - `resetContext()` and `resetContextFull()` methods
- [x] **Collection iteration** - Extracted `mapWithContext`, `filterWithContext`, etc.
- [x] **Format detection** - Unified into format-registry.ts
- [x] **Magic numbers** - Extracted to named constants
- [x] **Configurable retry limits** - Via `retryLimits` option
- [x] **Generator cache** - Plugin lookup caching with invalidation
- [x] **Warning collection** - All warnings use warningCollector (no silent console.warn)
