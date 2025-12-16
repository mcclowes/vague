![Abstract representation of data and Vague](./banner.png)

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

## Syntax Cheat Sheet

For a quick reference of all syntax, see **[SYNTAX.md](SYNTAX.md)**.

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

### Nullable Fields

```vague
nickname: string?           // Shorthand: sometimes null
notes: string | null        // Explicit
```

### Ternary Expressions

```vague
status: = amount_paid >= total ? "paid" : "pending"
grade: = score >= 90 ? "A" : score >= 70 ? "B" : "C"
```

### Dynamic Cardinality

```vague
schema Order {
  size: "small" | "large",
  items: (size == "large" ? 5..10 : 1..3) * LineItem
}
```

### Side Effects (`then` blocks)

```vague
schema Payment {
  invoice: any of invoices,
  amount: int in 10..500
} then {
  invoice.amount_paid += amount,
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partial"
}
```

### Unique Values

```vague
id: unique int in 1000..9999    // No duplicates in collection
```

### Statistical Distributions

```vague
age: = gaussian(35, 10, 18, 65)     // mean, stddev, min, max
income: = lognormal(10.5, 0.5)      // mu, sigma
wait_time: = exponential(0.5)       // rate
daily_orders: = poisson(5)          // lambda
conversion: = beta(2, 5)            // alpha, beta
```

### Date Functions

```vague
created_at: = now()                 // Full ISO 8601 timestamp
today_date: = today()               // Date only
past: = daysAgo(30)                 // 30 days ago
future: = daysFromNow(90)           // 90 days from now
random: = datetime(2020, 2024)      // Random datetime in range
between: = dateBetween("2023-01-01", "2023-12-31")
```

### Sequential Generation

```vague
id: = sequence("INV-", 1001)        // "INV-1001", "INV-1002", ...
order_num: = sequenceInt("orders")  // 1, 2, 3, ...
prev_value: = previous("amount")    // Reference previous record
```

### Negative Testing

```vague
// Generate data that violates constraints (for testing error handling)
dataset Invalid violating {
  bad_invoices: 100 * Invoice
}
```

## Examples

See the `examples/` directory:

- `basics/` - Core language features (schemas, constraints, computed fields, cross-refs)
- `openapi-importing/` - Import schemas from OpenAPI specs
- `openapi-examples-generation/` - Populate OpenAPI specs with generated examples
- `codat/`, `stripe/`, `github/`, etc. - Real-world API examples

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
| `-s, --seed <number>` | Seed for reproducible generation |
| `-h, --help` | Show help |

## Development

```bash
npm run build     # Compile TypeScript
npm test          # Run tests
npm run dev       # Watch mode
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

See [TODO.md](TODO.md) for planned features:

- Probabilistic constraints (`assume X with probability 0.7`)
- Date arithmetic (`due_date <= issued_date + 90.days`)
- Conditional schema variants
- Constraint solving (SMT integration)

## Working with Claude

This project includes Claude Code skills that help Claude assist you more effectively when working with Vague files and OpenAPI specifications.

### Available Skills

| Skill | Description |
|-------|-------------|
| `vague` | Writing Vague (.vague) files - syntax, constraints, cross-references |
| `openapi` | Working with OpenAPI specs - validation, schemas, best practices |

### Installation via OpenSkills

Install the skills using [OpenSkills](https://github.com/anthropics/openskills):

```bash
npm i -g openskills
openskills install mcclowes/vague
```

This installs the skills to your `.claude/skills/` directory, making them available when you use Claude Code in this project.

### Manual Installation

Alternatively, copy the skills directly:

```bash
git clone https://github.com/mcclowes/vague.git
cp -r vague/.claude/skills/* ~/.claude/skills/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE)
