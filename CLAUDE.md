# Vague - Project Instructions

Vague is a declarative language for generating realistic test data. It treats ambiguity as a first-class primitive.

## Project Structure

```
src/
├── lexer/             # Tokenizer - converts source to tokens
├── parser/            # Parser - converts tokens to AST
├── ast/               # AST node type definitions
├── interpreter/       # Generator - produces JSON from AST
├── validator/         # Schema validation against OpenAPI/JSON Schema
├── openapi/           # OpenAPI schema import support
├── infer/             # Schema inference from JSON data
├── csv/               # CSV input/output formatting
├── ndjson/            # NDJSON (newline-delimited JSON) formatting
├── compare/           # Golden dataset comparison and schema diff
├── config/            # Configuration file loading (vague.config.js)
├── logging/           # Logging utilities with levels and components
├── plugins/           # Built-in plugins (faker, issuer, date, regex, http, sql, graphql)
├── reporting/         # Enterprise reporting, audit trails, compliance
├── spectral/          # OpenAPI linting with Spectral
├── server/            # HTTP mock server (--serve)
├── utils/             # Shared type guards and helpers
├── cli/               # CLI handlers and argument parsing
├── format-registry.ts # Output format registry (json, csv, ndjson)
├── warnings.ts        # Warning collector for non-fatal generation issues
├── index.ts           # Library exports
└── cli.ts             # CLI entry point
examples/              # Example .vague files
```

## Key Commands

```bash
npm run build    # Compile TypeScript
npm run test:run # Run tests once (vitest run)
npm test         # Run tests in watch mode (vitest)
npm run dev      # Watch mode compilation
npm run lint     # Lint with eslint
npm run format:check  # Check formatting with prettier
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

// Annotations (metadata on schemas/fields, preserved in the AST)
#description: "Customer-facing invoice"
schema Invoice {
  #indexed
  invoice_number: string
}

// Side effects
schema Payment { invoice: any of invoices, amount: int }
then { invoice.amount_paid += amount }

// Refine blocks (conditional field overrides)
schema Player { position: "GK" | "FWD", goals: int in 0..30 }
refine { if position == "GK" { goals: int in 0..3 } }

// Contracts and invariants (never violated, even in violating mode)
contract PositiveAmount {
  invariant amount > 0 "Amount must be positive"
}
schema Invoice implements PositiveAmount { amount: decimal in 1..1000 }
schema Payment { amount: int, invariant amount > 0 "Payment must be positive" }
```

## Built-in Plugins

### Faker Plugin
Common shorthand generators: `uuid()`, `email()`, `phone()`, `firstName()`, `lastName()`, `fullName()`, `companyName()`, `streetAddress()`, `city()`, `country()`, `countryCode()`, `zipCode()`, `url()`, `avatar()`, `iban()`, `currencyCode()`, `pastDate()`, `futureDate()`, `recentDate()`, `sentence()`, `paragraph()`

Full namespace: `faker.person.firstName()`, `faker.internet.email()`, `faker.lorem.paragraph()`, etc.

### Issuer Plugin (Edge Case Testing)
Generates problematic but valid values for testing edge cases:
- Unicode: `issuer.zeroWidth()`, `issuer.homoglyph("admin")`, `issuer.rtl()`, `issuer.emoji()`
- Strings: `issuer.empty()`, `issuer.long(10000)`, `issuer.sqlLike()`, `issuer.htmlSpecial()`
- Numbers: `issuer.maxInt()`, `issuer.minInt()`, `issuer.tinyDecimal()`, `issuer.negativeZero()`
- Dates: `issuer.leapDay()`, `issuer.y2k()`, `issuer.epoch()`, `issuer.farFuture()`
- Formats: `issuer.weirdEmail()`, `issuer.weirdUrl()`, `issuer.specialUuid()`

### Date Plugin
Day-of-week filtering: `date.weekday(2024, 2025)`, `date.weekend(2024, 2025)`, `date.dayOfWeek(1, 2024, 2025)`
Durations for date arithmetic: `date.days(n)`, `date.weeks(n)`, `date.months(n)`, `date.years(n)`, `date.hours(n)`, `date.minutes(n)` — e.g. `due_date: issued_date + date.days(30)`

### Regex Plugin
Pattern generation: `regex("[A-Z]{3}-[0-9]{4}")`, `alphanumeric(32)`, `digits(6)`, `semver()`
Pattern validation: `assume matches("^[A-Z]{3}", code)`

### HTTP Plugin
Generators for HTTP testing and webhook payloads:
- Methods: `http.method()` - weighted HTTP methods (GET, POST, PUT, etc.)
- Status: `http.statusCode()`, `http.statusText()`, `http.status()`, `http.successCode()`, `http.clientErrorCode()`, `http.serverErrorCode()`
- Headers: `http.contentType()`, `http.userAgent()`, `http.accept()`, `http.cacheControl()`, `http.requestHeader()`, `http.responseHeader()`
- CORS: `http.corsOrigin()`, `http.corsMethods()`, `http.corsHeaders()`
- Auth: `http.bearerToken()`, `http.basicAuth()`, `http.apiKey()`
- Webhooks: `http.webhookEvent()` - common webhook event types
- Environment: `env("VAR_NAME")`, `env("VAR_NAME", "default")` - read environment variables

### SQL Plugin
Generators for SQL-related test data:
- Identifiers: `sql.tableName()`, `sql.columnName()`, `sql.schemaName()`, `sql.identifier()`, `sql.alias()`, `sql.quoted(name, dialect?)`
- Values: `sql.string()`, `sql.dateValue()`, `sql.timestamp()`, `sql.nullValue()`, `sql.boolean()`, `sql.integer(min, max)`, `sql.decimalValue(precision)`
- Data types: `sql.dataType()`, `sql.columnDefinition()`
- Connection strings: `sql.connectionString(dialect)` (e.g., `"postgres"`, `"mysql"`)
- Query fragments: `sql.select()`, `sql.whereClause()`, `sql.orderBy()`, `sql.limit(n?)`, `sql.groupBy()`, `sql.join(type?)`
- Full statements: `sql.insert()`, `sql.update()`, `sql.delete()`, `sql.createTable()`
- Placeholders: `sql.placeholder(dialect, position?)`
- Comments: `sql.comment(style?)`

### GraphQL Plugin
Generators for GraphQL-related test data:
- Identifiers: `graphql.fieldName()`, `graphql.typeName()`, `graphql.operationName()`, `graphql.enumValue()`, `graphql.directiveName()`, `graphql.argumentName()`, `graphql.variableName()`
- Scalars: `graphql.id()`, `graphql.string()`, `graphql.integer()`, `graphql.float()`, `graphql.boolean()`
- Operations: `graphql.query()`, `graphql.mutation()`, `graphql.subscription()`, `graphql.fragment()`
- Errors: `graphql.error()`, `graphql.errorMessage()`, `graphql.errorCode()`
- Variables: `graphql.variables()`
- Introspection: `graphql.introspectionType()`, `graphql.builtinScalar()`, `graphql.builtinDirective()`, `graphql.typeKind()`
- Schema: `graphql.schemaDefinition()`, `graphql.connectionType()`
- Shorthand (prefixed to avoid conflicts): `gqlQuery()`, `gqlMutation()`, `gqlTypeName()`, `gqlFieldName()`, `gqlId()`, `gqlError()`, etc.

## TypeScript API

```typescript
import { fromFile, vague, compile } from 'vague-lang';

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

Run `node dist/cli.js --help` for full usage. Key options:

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Write output to file |
| `-f, --format <fmt>` | Output format: `json` (default), `csv`, `ndjson` |
| `-p, --pretty` | Pretty-print JSON |
| `-s, --seed <number>` | Seed for reproducible generation |
| `-w, --watch` | Watch input file and regenerate (requires `-o`) |
| `-v, --validate <spec>` | Validate against OpenAPI spec |
| `-m, --mapping <json>` | Schema mapping |
| `--validate-only` | Only validate, don't output data |
| `--csv-delimiter <char>` | CSV field delimiter (default: `,`) |
| `--csv-no-header` | Omit CSV header row |
| `--csv-arrays <mode>` | Array handling: `json` (default), `first`, `count` |
| `--csv-nested <mode>` | Nested objects: `flatten` (default), `json` |
| `--infer <file>` | Infer schema from JSON/CSV |
| `--dataset-name <name>` | Dataset name for inference (default: `Generated`) |
| `--collection-name <name>` | Collection name for CSV inference |
| `--infer-delimiter <char>` | CSV delimiter for inference (default: `,`) |
| `--no-formats` | Disable format detection (uuid, email, etc.) |
| `--no-weights` | Disable weighted superpositions |
| `--max-enum <n>` | Max unique values for enum detection (default: 10) |
| `--typescript` | Generate TypeScript definitions (inference mode only) |
| `--ts-only` | Generate only TypeScript, no .vague (inference mode only) |
| `--oas-source <spec>` | Source OpenAPI spec to populate with examples |
| `--oas-output <file>` | Write OpenAPI spec with examples to file |
| `--oas-external` | Use external file references instead of inline |
| `--oas-example-count <n>` | Examples per schema (default: 1) |
| `--validate-data <file>` | Validate JSON against Vague schema (requires `--schema`) |
| `--schema <file>` | Schema file for data validation |
| `--dataset <name>` | Dataset name for `validate {}` block constraints |
| `--lint-spec <file>` | Lint OpenAPI spec with Spectral |
| `--lint-verbose` | Show detailed lint results |
| `--serve [port]` | Start HTTP mock server (default: 3000) |
| `--report <file>` | Generate enterprise report (`.html`/`.md` by extension, otherwise JSON) |
| `--report-format <fmt>` | Report format override: `json`, `html`, `markdown` |
| `--audit-log <file>` | Append audit log entry to JSONL file |
| `--baseline <file>` | Compare against baseline report for distribution drift (requires `--report`) |
| `-c, --config <file>` | Use specific config file |
| `--no-config` | Skip loading config file |
| `-d, --debug` | Enable debug logging |
| `--log-level <level>` | Set log level: `none`, `error`, `warn`, `info`, `debug` |
| `--plugins <dir>` | Load plugins from directory (repeatable) |
| `--no-auto-plugins` | Disable automatic plugin discovery |
| `--verbose` | Show verbose output (e.g., discovered plugins) |
| `-h, --help` | Show help |

## OpenAPI Integration

```vague
// Import schemas from OpenAPI spec
import petstore from "petstore.json"
schema Pet from petstore.Pet { age: int in 1..15 }
```

Import behavior:
- Input documents are validated on import; malformed specs fail with a clear error.
- `oneOf`/`anyOf`/`allOf` compositions (including at the top level of a schema) become variants; one variant is picked at random per generated instance.
- Unsupported keywords produce an `OpenAPIImport` warning (the import is approximate); validation described only in prose produces an `OpenAPIValidationGap` warning.

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
import { lintOpenAPISpec, SpectralLinter } from 'vague-lang';

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

Tests colocated with source (`*.test.ts`). Run once with `npm run test:run`; `npm test` starts vitest in watch mode.

## Architecture

1. **Lexer** - Tokenizes source with line/column tracking
2. **Parser** - Recursive descent, handles operator precedence
3. **Generator** - Walks AST, produces JSON (rejection sampling for constraints, 100 max retries)
4. **Validator** - JSON Schema validation using Ajv (OpenAPI 3.0.x/3.1.x)

## Plugin System

### Generator Plugins
```typescript
import { VaguePlugin, registerPlugin, unregisterPlugin } from 'vague-lang';

const myPlugin: VaguePlugin = {
  name: 'custom',
  generators: {
    'greeting': () => 'Hello!',
    'repeat': (args) => String(args[0]).repeat(Number(args[1]) || 1),
  },
};
registerPlugin(myPlugin);
// Later: unregisterPlugin('custom');
```

### Language Extension Plugins (Advanced)
Plugins can extend the Vague language itself with custom keywords and statements:

```typescript
import { VaguePlugin, registerPlugin, type ParserContext } from 'vague-lang';

const aliasPlugin: VaguePlugin = {
  name: 'alias',
  keywords: [{ keyword: 'alias', tokenType: 'ALIAS' }],
  statements: {
    ALIAS: (ctx: ParserContext) => {
      ctx.advance(); // consume 'alias'
      const name = ctx.consume('IDENTIFIER', 'Expected name');
      ctx.consume('EQUALS', "Expected '='");
      const value = ctx.parseExpression();
      return { type: 'LetStatement', name: name.value, value };
    },
  },
};
registerPlugin(aliasPlugin);
// Now: alias x = 42  → equivalent to: let x = 42
```

`ParserContext` provides: `peek()`, `check()`, `consume()`, `match()`, `advance()`, `isAtEnd()`, `error()`, `parseExpression()`

Config file (`vague.config.js`):
```javascript
export default {
  plugins: ['./my-plugin.js', 'vague-plugin-stripe'],
  seed: 42,
  pretty: true
};
```

Auto-discovery: `./vague-plugins/`, `./plugins/`, `node_modules/vague-plugin-*`

## Enterprise Reporting

Audit trails, compliance documentation, and distribution drift detection:

```bash
node dist/cli.js schema.vague -o data.json --report report.html   # HTML report (also .md, .json)
node dist/cli.js schema.vague --audit-log audit.jsonl             # Append JSONL audit entry
node dist/cli.js schema.vague --report new.json --baseline old.json  # Drift detection
```

Reports include synthetic data attestation, per-field statistics (types, null %, cardinality, numeric stats), value distributions, warnings, and performance metrics. Drift on fields with value distributions is measured with Jensen-Shannon divergence (flagged significant above 15%); fields with only numeric stats use a mean-difference-over-stddev ratio (flagged above 20%).

Programmatic API:

```typescript
import {
  generateReport,
  formatReportAsHTML,
  formatReportAsMarkdown,
  formatReportAsJSON,
  compareReports,
  createAuditLogEntry,
  type GenerationReport,
} from 'vague-lang';
```

## Contracts, Golden Datasets, and Schema Diff

Contracts define invariants that are always enforced — unlike `assume`, they hold even in `violating` mode. Define with `contract`, apply with `implements`, or declare `invariant` clauses inline in a schema. Invariants take an optional error message string.

Golden dataset comparison and schema diff (programmatic API):

```typescript
import {
  compareDatasets,
  formatComparisonResult,
  datasetsEqual,
  diffSchemas,
  formatDiffResult,
} from 'vague-lang';

// Compare generated data against a golden snapshot
const result = compareDatasets(golden, actual, {
  numericTolerance: 0.01,      // Allow small float differences
  ignoreFields: ['timestamp'], // Skip certain fields
  maxDiffsPerCollection: 10,   // Limit reported differences
});
// Note: records are always compared in order (the declared orderSensitive
// option is not implemented yet)
if (!result.identical) console.log(formatComparisonResult(result));

// Detect breaking changes between schema versions
const diff = diffSchemas(oldSource, newSource);
if (diff.hasBreakingChanges) console.log(formatDiffResult(diff));
```

Schema diff classifies changes as breaking (field/schema removed, constraint tightened), compatible (field added, constraint loosened), or cosmetic.

## Post-Implementation Cleanup

After completing any feature:
1. Update `examples/` with new syntax
2. Update SYNTAX.md and README.md
3. Add keywords to `vscode-vague/syntaxes/vague.tmLanguage.json`
4. Close the corresponding GitHub issue (or check off the relevant sub-task in a grouped issue)

Planned features and technical debt live in [GitHub issues](https://github.com/mcclowes/vague/issues).
