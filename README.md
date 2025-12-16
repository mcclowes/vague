# Vague

A declarative language for generating realistic test data. Vague treats ambiguity as a first-class primitive — declare the shape of valid data and let the runtime figure out how to populate it.

## Installation

```bash
npm install
npm run build
```

## Quick Start

Create a `.vague` file:

```vague
schema Customer {
  name: string,
  status: 0.8: "active" | 0.2: "inactive"
}

schema Invoice {
  customer: any of customers,
  amount: decimal in 100..10000,
  status: "draft" | "sent" | "paid",

  assume amount > 0
}

dataset TestData {
  customers: 50 * Customer,
  invoices: 200 * Invoice
}
```

Generate JSON:

```bash
node dist/cli.js your-file.vague
```

## Language Features

### Superposition (Random Choice)

```vague
// Equal probability
status: "draft" | "sent" | "paid"

// Weighted probability
status: 0.6: "paid" | 0.3: "pending" | 0.1: "draft"
```

### Ranges

```vague
age: int in 18..65
price: decimal in 0.01..999.99
founded: date in 2000..2023
```

### Collections

```vague
line_items: 1..5 * LineItem    // 1-5 items
employees: 100 * Employee       // Exactly 100
```

### Constraints

```vague
schema Invoice {
  issued_date: int in 1..28,
  due_date: int in 1..90,
  status: "draft" | "paid",
  amount: int in 0..10000,

  // Hard constraint
  assume due_date >= issued_date,

  // Conditional constraint
  assume if status == "paid" {
    amount == 0
  }
}
```

Logical operators: `and`, `or`, `not`

### Cross-Record References

```vague
schema Invoice {
  // Reference any customer from the collection
  customer: any of customers,

  // Filtered reference
  active_customer: any of customers where .status == "active"
}
```

### Parent References

```vague
schema LineItem {
  // Inherit currency from parent invoice
  currency: = ^base_currency
}

schema Invoice {
  base_currency: "USD" | "GBP" | "EUR",
  line_items: 1..5 * LineItem
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

## Examples

See the `examples/` directory:

- `basic.vague` - Simple schemas and datasets
- `constraints.vague` - Hard and conditional constraints
- `computed-fields.vague` - Aggregate functions
- `cross-ref.vague` - Cross-record references
- `codat/lending-test-data.vague` - Real-world API test data

## CLI Usage

```bash
# Generate JSON to stdout
node dist/cli.js file.vague

# Save to file
node dist/cli.js file.vague -o output.json

# Pretty print
node dist/cli.js file.vague -p

# Validate against OpenAPI spec
node dist/cli.js file.vague -v openapi.json -m '{"invoices": "Invoice"}'

# Validate only (exit code 1 on failure, useful for CI)
node dist/cli.js file.vague -v openapi.json -m '{"invoices": "Invoice"}' --validate-only
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Write output to file |
| `-p, --pretty` | Pretty-print JSON |
| `-v, --validate <spec>` | Validate against OpenAPI spec |
| `-m, --mapping <json>` | Schema mapping `{"collection": "SchemaName"}` |
| `--validate-only` | Only validate, don't output data |
| `-h, --help` | Show help |

## Development

```bash
npm run build    # Compile TypeScript
npm test         # Run tests (75 tests)
npm run dev      # Watch mode
```

## Project Structure

```
src/
├── lexer/       # Tokenizer
├── parser/      # Recursive descent parser
├── ast/         # AST node definitions
├── interpreter/ # JSON generator
├── validator/   # Schema validation (Ajv)
├── openapi/     # OpenAPI import support
├── index.ts     # Library exports
└── cli.ts       # CLI entry point
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features:

- Plugin system for semantic types (faker integration)
- Negative testing (generate constraint-violating data)
- Probabilistic constraints
- Dataset-wide validation
- Constraint solving (SMT integration)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE)
