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
  max_price: = max(line_items.unit_price)
}
```

### Datasets
```vague
dataset TestData {
  companies: 100 * Company,
  invoices: 500 * Invoice
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
    count(payments) <= count(invoices)
  }
}
```

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

Currently 98 tests covering lexer, parser, generator, and validator.

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

See TODO.md for planned features.

## Post-Implementation Cleanup

After completing any feature, always verify:

1. **Examples** - Update `examples/` with new syntax if applicable
2. **Documentation** - Update this file's syntax examples and README.md
3. **Syntax highlighting** - Add new keywords/operators to `vscode-vague/syntaxes/vague.tmLanguage.json`
4. **TODO.md** - Move completed items to "Completed" section
