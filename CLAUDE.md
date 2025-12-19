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
├── infer/       # Schema inference from JSON data
├── csv/         # CSV input/output formatting
├── config/      # Configuration file loading (vague.config.js)
├── logging/     # Logging utilities with levels and components
├── plugins/     # Built-in plugins (faker, issuer, date, regex)
├── spectral/    # OpenAPI linting with Spectral
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
node dist/cli.js <file.vague> -o output.json -w  # Watch mode
node dist/cli.js <file.vague> --debug  # Enable debug logging
```

## Language Syntax Reference

**See [SYNTAX.md](SYNTAX.md) for complete syntax reference.**

Quick overview of core features:

```vague
// Types and ranges
name: string
age: int in 18..65
price: decimal(2) in 0.01..999.99

// Superposition (random choice with optional weights)
status: "draft" | "sent" | "paid"
status: 0.7: "paid" | 0.2: "pending" | 0.1: "draft"

// Collections
items: 1..5 of LineItem

// Constraints
assume due_date >= issued_date
assume if status == "paid" { amount > 0 }

// Cross-record references
customer: any of customers where .status == "active"

// Parent references
currency: ^base_currency

// Computed fields
total: sum(line_items.amount)
tax: round(subtotal * 0.2, 2)

// Ternary expressions
status: amount_paid >= total ? "paid" : "pending"

// Match expressions (pattern matching)
display: match status {
  "pending" => "Awaiting",
  "shipped" => "On the way",
  "delivered" => "Complete"
}

// Conditional fields
companyNumber: string when type == "business"

// Side effects
schema Payment { invoice: any of invoices, amount: int }
then { invoice.amount_paid += amount }

// Refine blocks (conditional field overrides)
schema Player { position: "GK" | "FWD", goals: int in 0..30 }
refine { if position == "GK" { goals: int in 0..3 } }
```

## Built-in Plugins

### Faker Plugin
Common shorthand generators: `uuid()`, `email()`, `phone()`, `firstName()`, `lastName()`, `fullName()`, `companyName()`, `city()`, `country()`, `sentence()`, `paragraph()`

Full namespace: `faker.person.firstName()`, `faker.internet.email()`, `faker.lorem.paragraph()`, etc.

### Issuer Plugin (Edge Case Testing)
Generates problematic but valid values for testing edge cases:
- Unicode: `issuer.zeroWidth()`, `issuer.homoglyph("admin")`, `issuer.rtl()`, `issuer.emoji()`
- Strings: `issuer.empty()`, `issuer.long(10000)`, `issuer.sqlLike()`, `issuer.htmlSpecial()`
- Numbers: `issuer.maxInt()`, `issuer.minInt()`, `issuer.tinyDecimal()`, `issuer.negativeZero()`
- Dates: `issuer.leapDay()`, `issuer.y2k()`, `issuer.epoch()`, `issuer.farFuture()`
- Formats: `issuer.weirdEmail()`, `issuer.weirdUrl()`, `issuer.specialUuid()`

### Dates Plugin
Day-of-week filtering: `date.weekday(2024, 2025)`, `date.weekend(2024, 2025)`, `date.dayOfWeek(1, 2024, 2025)`

### Regex Plugin
Pattern generation: `regex("[A-Z]{3}-[0-9]{4}")`, `alphanumeric(32)`, `digits(6)`, `semver()`
Pattern validation: `assume matches("^[A-Z]{3}", code)`

## TypeScript API

```typescript
import { fromFile, vague, compile } from 'vague';

// File-based (recommended)
const data = await fromFile('./fixtures.vague', { seed: 42 });

// Tagged template
const data = await vague`
  schema Person { name: string, age: int in 18..65 }
  dataset Test { people: 10 of Person }
`;

// With seed
const data = await vague({ seed: 42 })`...`;
```

## CLI Reference

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Write output to file |
| `-f, --format <fmt>` | Output format: `json`, `csv` |
| `-p, --pretty` | Pretty-print JSON |
| `-s, --seed <number>` | Seed for reproducible generation |
| `-w, --watch` | Watch input file and regenerate |
| `-v, --validate <spec>` | Validate against OpenAPI spec |
| `-m, --mapping <json>` | Schema mapping |
| `--validate-only` | Only validate, don't output data |
| `--infer <file>` | Infer schema from JSON/CSV |
| `--collection-name <name>` | Collection name for CSV inference |
| `--typescript` | Generate TypeScript definitions |
| `--ts-only` | Generate only TypeScript (no .vague) |
| `--oas-source/--oas-output` | OpenAPI example population |
| `--validate-data <file>` | Validate JSON against Vague schema |
| `--schema <file>` | Schema file for data validation |
| `--lint-spec <file>` | Lint OpenAPI spec with Spectral |
| `--lint-verbose` | Show detailed lint results |
| `--debug` | Enable debug logging |
| `--plugins <dir>` | Load plugins from directory |

## OpenAPI Integration

```vague
// Import schemas from OpenAPI spec
import petstore from "petstore.json"
schema Pet from petstore.Pet { age: int in 1..15 }
```

```bash
# Validate generated data
node dist/cli.js data.vague -v openapi.json -m '{"invoices": "Invoice"}'

# Populate OpenAPI with examples
node dist/cli.js data.vague --oas-output api.json --oas-source api.json
```

## OpenAPI Linting (Spectral)

Lint OpenAPI specs before using them with Vague:

```bash
# Lint an OpenAPI spec
node dist/cli.js --lint-spec openapi.json

# Lint with verbose output (includes hints)
node dist/cli.js --lint-spec openapi.yaml --lint-verbose

# Using npm script
npm run lint:spec openapi.json
```

Programmatic API:

```typescript
import { lintOpenAPISpec, SpectralLinter } from 'vague';

// Simple function
const result = await lintOpenAPISpec('openapi.json');

// Class-based for multiple files
const linter = new SpectralLinter();
const result = await linter.lint('openapi.json');
const result2 = await linter.lintContent(jsonString, 'json');
```

## Schema Inference

```bash
# Infer from JSON
node dist/cli.js --infer data.json -o schema.vague

# Infer from CSV
node dist/cli.js --infer data.csv --collection-name employees
```

Detects: types, ranges, enums, weights, nullable, unique, formats (uuid, email), derived fields, ordering constraints.

## Data Validation

```bash
# Validate external data against Vague schema constraints
node dist/cli.js --validate-data data.json --schema schema.vague
```

## Debug Logging

```bash
node dist/cli.js schema.vague --debug
node dist/cli.js schema.vague --log-level info
VAGUE_DEBUG=generator,constraint node dist/cli.js schema.vague
```

Components: `lexer`, `parser`, `generator`, `constraint`, `validator`, `plugin`, `cli`, `openapi`, `infer`, `config`

## Testing

Tests colocated with source (`*.test.ts`). Run with `npm test`.

## Architecture

1. **Lexer** - Tokenizes source with line/column tracking
2. **Parser** - Recursive descent, handles operator precedence
3. **Generator** - Walks AST, produces JSON (rejection sampling for constraints, 100 max retries)
4. **Validator** - JSON Schema validation using Ajv (OpenAPI 3.0.x/3.1.x)

## Plugin System

```typescript
import { VaguePlugin, registerPlugin } from 'vague';

const myPlugin: VaguePlugin = {
  name: 'custom',
  generators: {
    'greeting': () => 'Hello!',
    'repeat': (args) => String(args[0]).repeat(Number(args[1]) || 1),
  },
};
registerPlugin(myPlugin);
```

Config file (`vague.config.js`):
```javascript
export default {
  plugins: ['./my-plugin.js', 'vague-plugin-stripe'],
  seed: 42,
  pretty: true
};
```

Auto-discovery: `./vague-plugins/`, `./plugins/`, `node_modules/vague-plugin-*`

## Post-Implementation Cleanup

After completing any feature:
1. Update `examples/` with new syntax
2. Update SYNTAX.md and README.md
3. Add keywords to `vscode-vague/syntaxes/vague.tmLanguage.json`
4. Move completed items in TODO.md

See [TODO.md](TODO.md) for planned features and technical debt.
