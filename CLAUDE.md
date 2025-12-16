# Vague - Project Instructions

Vague is a declarative language for generating realistic test data. It treats ambiguity as a first-class primitive.

## Project Structure

```
src/
├── lexer/       # Tokenizer - converts source to tokens
├── parser/      # Parser - converts tokens to AST
├── ast/         # AST node type definitions
├── interpreter/ # Generator - produces JSON from AST
├── validator/   # Schema validation against OpenAPI/JSON Schema
├── openapi/     # OpenAPI schema import support
├── index.ts     # Library exports
└── cli.ts       # CLI entry point
examples/        # Example .vague files
```

## Key Commands

```bash
npm run build    # Compile TypeScript
npm test         # Run tests (vitest)
npm run dev      # Watch mode compilation
node dist/cli.js <file.vague>  # Run CLI
node dist/cli.js <file.vague> -v <openapi.json> -m '{"collection": "Schema"}'  # With validation
```

## Language Syntax

### Basic Types
```vague
schema Person {
  name: string,
  age: int,
  salary: decimal,
  active: boolean,
  joined: date
}
```

### Superposition (Random Choice)
```vague
status: "draft" | "sent" | "paid"           // Equal weight
status: 0.7: "paid" | 0.2: "pending" | 0.1: "draft"  // Weighted

// Mixed types: range OR field reference
amount: int in 10..500 | invoice.total      // Either partial or full
amount: 0.7: int in 10..500 | 0.3: invoice.total  // Weighted mix
```

### Nullable Fields
```vague
nickname: string?           // Shorthand: sometimes null
notes: string | null        // Explicit: equivalent to string?
priority: int | null        // Works with any primitive type
```

### Ranges
```vague
age: int in 18..65
price: decimal in 0.01..999.99
founded: date in 2000..2023
```

### Cardinality (Collections)
```vague
line_items: 1..5 * LineItem    // 1-5 items
employees: 100 * Employee       // Exactly 100
```

### Constraints
```vague
schema Invoice {
  issued_date: int in 1..20,
  due_date: int in 1..30,

  assume due_date >= issued_date,   // Hard constraint

  assume if status == "paid" {      // Conditional constraint
    amount > 0
  }
}
```

Logical operators: `and`, `or`, `not`

### Cross-Record References
```vague
schema Invoice {
  customer: any of companies,                    // Random from collection
  supplier: any of companies where .active == true  // Filtered
}
```

### Parent References
```vague
schema LineItem {
  currency: = ^base_currency   // Inherit from parent schema
}
```

### Computed Fields
```vague
schema Invoice {
  line_items: 1..10 * LineItem,
  total: = sum(line_items.amount),
  item_count: = count(line_items),
  avg_price: = avg(line_items.unit_price),
  min_price: = min(line_items.unit_price),
  max_price: = max(line_items.unit_price),
  // Arithmetic expressions
  tax: = round(sum(line_items.amount) * 0.2, 2),
  grand_total: = round(sum(line_items.amount) * 1.2, 2)
}
```

### Decimal Precision
```vague
schema Order {
  subtotal: decimal in 100..500,
  tax: = round(subtotal * 0.2, 2),    // Round to 2 decimal places
  floored: = floor(subtotal, 1),      // Floor to 1 decimal place
  ceiled: = ceil(subtotal, 0)         // Ceil to whole number
}
```

### Unique Values
```vague
schema Invoice {
  id: int in 1000..9999 unique,       // Ensures no duplicate IDs
  code: "A" | "B" | "C" | "D" unique  // Works with superposition too
}
```

### Statistical Distributions
```vague
schema Person {
  // Normal/Gaussian distribution - for natural measurements
  age: = gaussian(35, 10, 18, 65),      // mean, stddev, min, max

  // Log-normal - for right-skewed data like income, prices
  income: = lognormal(10.5, 0.5, 20000, 500000),

  // Exponential - for wait times, decay
  wait_time: = exponential(0.5, 0, 60),  // rate, min, max

  // Poisson - for count data (events per time period)
  daily_orders: = poisson(5),            // lambda (expected count)

  // Beta - for probabilities and proportions (0-1 range)
  conversion_rate: = beta(2, 5),         // alpha, beta shape params

  // Uniform - explicit uniform distribution
  random_value: = uniform(0, 100)        // min, max
}
```

### Ternary Expressions
```vague
schema Invoice {
  total: int in 100..500,
  amount_paid: int in 0..0,
  // Conditional value based on expression
  status: = amount_paid >= total ? "paid" : "partially-paid"
}

schema Item {
  score: int in 0..100,
  // Nested ternary for multiple conditions
  grade: = score >= 90 ? "A" : score >= 70 ? "B" : "C"
}

schema Order {
  total: int in 10..200,
  is_member: boolean,
  has_coupon: boolean,
  // Logical operators: and, or, not
  discount: = (total >= 100 and is_member) or has_coupon ? 0.15 : 0
}
```

### Dynamic Cardinality
```vague
schema Order {
  size: "small" | "large",
  // Cardinality depends on field value
  items: (size == "large" ? 5..10 : 1..3) * LineItem
}

schema Shipment {
  is_bulk: boolean,
  is_priority: boolean,
  // Logical conditions in cardinality
  packages: (is_bulk and is_priority ? 20..30 : 1..5) * Package
}
```

### Datasets
```vague
dataset TestData {
  companies: 100 * Company,
  invoices: 500 * Invoice
}
```

### Negative Testing (Violating Datasets)
Generate data that intentionally violates constraints - useful for testing error handling:
```vague
schema Invoice {
  issued_date: int in 1..20,
  due_date: int in 1..30,
  assume due_date >= issued_date
}

// Normal dataset - all invoices satisfy constraints
dataset Valid {
  invoices: 100 * Invoice
}

// Violating dataset - generates invoices where due_date < issued_date
dataset Invalid violating {
  bad_invoices: 100 * Invoice
}
```

### Dataset-Level Constraints
```vague
dataset TestData {
  invoices: 100 * Invoice,
  payments: 50 * Payment,

  validate {
    sum(invoices.total) >= 100000,
    sum(invoices.total) <= 500000,
    sum(payments.amount) <= sum(invoices.total),
    count(payments) <= count(invoices),

    // Predicate functions for collection-wide checks
    all(invoices, .amount_paid <= .total),  // All items must satisfy
    some(invoices, .status == "paid"),      // At least one must satisfy
    none(invoices, .total < 0)              // No items should satisfy
  }
}
```

### Side Effects (`then` blocks)

Mutate referenced objects after a record is generated:

```vague
schema Payment {
  invoice: any of invoices,
  amount: int in 50..500
}
then {
  invoice.amount_paid += amount,
  // Use ternary for conditional status update
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partially-paid"
}
```

- `then` blocks run once per generated record (no cascades)
- Can only mutate upstream references (objects the record references)
- Supports `=` (assignment) and `+=` (compound assignment)
- Can use ternary expressions for conditional values

### OpenAPI Schema Import
```vague
import petstore from "petstore.json"

// Inherit fields from OpenAPI schema
schema Pet from petstore.Pet {
  // Override or add fields
  age: int in 1..15
}

dataset TestData {
  pets: 50 * Pet
}
```

### Schema Validation (CLI)
```bash
# Validate against OpenAPI spec
node dist/cli.js data.vague -v openapi.json -m '{"invoices": "Invoice"}'

# Validate only (exit code 1 on failure)
node dist/cli.js data.vague -v openapi.json -m '{"invoices": "Invoice"}' --validate-only
```

## Testing

Tests are colocated with source files (`*.test.ts`). Run with `npm test`.

Currently 136 tests covering lexer, parser, generator, and validator.

## Architecture Notes

1. **Lexer** (`src/lexer/`) - Tokenizes source with line/column tracking
2. **Parser** (`src/parser/`) - Recursive descent, handles operator precedence
3. **AST** (`src/ast/`) - Type definitions for all node types
4. **Generator** (`src/interpreter/`) - Walks AST, produces JSON
   - Rejection sampling for constraints (100 max retries)
   - Field generation order: simple → collections → computed
5. **Markov chains** (`src/interpreter/markov.ts`) - Context-aware string generation
6. **Validator** (`src/validator/`) - JSON Schema validation using Ajv
   - Loads schemas from OpenAPI 3.0.x and 3.1.x specs
   - Validates generated data against schemas


## What's Implemented

- [x] Lexer, parser, AST, generator
- [x] Superposition with weights
- [x] Ranges and cardinality
- [x] Hard constraints (`assume`)
- [x] Conditional constraints (`assume if`)
- [x] Cross-record references (`any of`, `where`)
- [x] Parent references (`^field`)
- [x] Computed fields with aggregates
- [x] Markov chain strings
- [x] OpenAPI import (basic)
- [x] Schema validation (OpenAPI 3.0.x/3.1.x)
- [x] Faker plugin for semantic types
- [x] VSCode syntax highlighting (`vscode-vague/`)
- [x] Dataset-level constraints (`validate { }` block)
- [x] Collection predicates (`all()`, `some()`, `none()` for validation)
- [x] Side effects (`then { }` blocks for mutating referenced objects)
- [x] Ternary expressions (`condition ? value : other`)
- [x] Logical operators in expressions (`and`, `or`, `not`)
- [x] Dynamic cardinality (`(condition ? 5..10 : 1..3) * Item`)
- [x] Nullable fields (`string?`, `int | null`)
- [x] Mixed superposition (`int in 10..500 | field.ref`, weighted: `0.7: int in 10..100 | 0.3: field`)
- [x] Seeded generation (`--seed 123` for reproducible output)
- [x] Negative testing (`dataset X violating { }` for constraint-violating data)
- [x] Logical operators in where clauses (`any of X where .a == 1 or .b == 2`)
- [x] Arithmetic in computed fields (`= sum(items.price) * 1.2`)
- [x] Decimal precision functions (`round()`, `floor()`, `ceil()`)
- [x] Unique values (`id: int in 1..1000 unique`)
- [x] Statistical distributions (`gaussian`, `exponential`, `lognormal`, `poisson`, `beta`, `uniform`)

See TODO.md for planned features.

## Post-Implementation Cleanup

After completing any feature, always verify:

1. **Examples** - Update `examples/` with new syntax if applicable
2. **Documentation** - Update this file's syntax examples and README.md
3. **Syntax highlighting** - Add new keywords/operators to `vscode-vague/syntaxes/vague.tmLanguage.json`
4. **TODO.md** - Move completed items to "Completed" section
