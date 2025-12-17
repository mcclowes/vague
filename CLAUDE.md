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
├── plugins/     # Built-in plugins (faker, issuer, date)
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
node dist/cli.js <file.vague> -o output.json -w  # Watch mode - regenerate on file change
node dist/cli.js <file.vague> -f csv -o data.csv  # CSV output
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
status: 0.85: "Active" | "Archived"         // Mixed: "Archived" gets remaining 15%
category: 0.6: "main" | "side" | "dessert"  // Unweighted options share remaining 40%

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

### Ordered Sequences (Cycling Lists)
```vague
// Cycles through values in order when generating collections
schema ArpeggioNote {
  pitch: [48, 52, 55, 60]   // C-E-G-C arpeggio, plays in order
}

dataset Music {
  notes: 8 of ArpeggioNote   // Produces: 48, 52, 55, 60, 48, 52, 55, 60
}

// Works with any values
schema Color {
  name: ["red", "green", "blue"]
}

// Works with expressions
schema Count {
  value: [1+1, 2+2, 3+3]    // Cycles: 2, 4, 6, 2, 4, 6...
}
```

### Ranges
```vague
age: int in 18..65
price: decimal in 0.01..999.99
founded: date in 2000..2023

// Decimal with explicit precision (number of decimal places)
score: decimal(1) in 0..10       // e.g., 7.3
price: decimal(2) in 10..100     // e.g., 49.95
scientific: decimal(4) in 0..1   // e.g., 0.8742
```

### Cardinality (Collections)
```vague
line_items: 1..5 of LineItem    // 1-5 items
employees: 100 of Employee       // Exactly 100
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

**Generation Order**: Collections are generated in the order they appear in the dataset. References to collections that haven't been generated yet will resolve to `null`. To avoid this, define referenced collections before the schemas that reference them:

```vague
dataset Test {
  companies: 10 of Company,    // Generated first
  invoices: 50 of Invoice      // Can reference companies
}
```

**Circular References**: Mutually recursive references (A references B, B references A) are not supported. The first collection will have `null` references since the second hasn't been generated yet.

### Parent References
```vague
schema LineItem {
  currency: ^base_currency   // Inherit from parent schema
}
```

### Computed Fields
```vague
schema Invoice {
  line_items: 1..10 of LineItem,
  total: sum(line_items.amount),
  item_count: count(line_items),
  avg_price: avg(line_items.unit_price),
  min_price: min(line_items.unit_price),
  max_price: max(line_items.unit_price),
  median_price: median(line_items.unit_price),
  first_item_price: first(line_items.unit_price),
  last_item_price: last(line_items.unit_price),
  price_product: product(line_items.unit_price),
  // Arithmetic expressions
  tax: round(sum(line_items.amount) * 0.2, 2),
  grand_total: round(sum(line_items.amount) * 1.2, 2)
}
```

### Decimal Precision
```vague
schema Order {
  subtotal: decimal in 100..500,
  tax: round(subtotal * 0.2, 2),    // Round to 2 decimal places
  floored: floor(subtotal, 1),      // Floor to 1 decimal place
  ceiled: ceil(subtotal, 0)         // Ceil to whole number
}
```

### Unique Values
```vague
schema Invoice {
  id: unique int in 1000..9999,       // Ensures no duplicate IDs
  code: unique "A" | "B" | "C" | "D"  // Works with superposition too
}
```

### Private Fields
```vague
schema Person {
  // Private fields are generated and usable in logic, but excluded from output
  age: private int in 0..105,
  age_bracket: age < 18 ? "minor" : age < 65 ? "adult" : "senior"
}
// Output: { "age_bracket": "adult" }  -- no "age" field

schema Product {
  // Can combine with unique
  internal_id: unique private int in 1..10000,
  public_ref: concat("PROD-", internal_id),

  // Multiple private fields for intermediate calculations
  base_cost: private decimal in 10..50,
  markup: private decimal in 1.2..1.8,
  price: round(base_cost * markup, 2)
}
```

### Date Functions
```vague
schema Event {
  // Current date/time
  created_at: now(),              // Full ISO 8601: "2025-01-15T10:30:00.000Z"
  created_date: today(),          // Date only: "2025-01-15"

  // Relative dates
  past_event: daysAgo(30),        // 30 days in the past
  future_event: daysFromNow(90),  // 90 days in the future

  // Random datetime with range (years or ISO strings)
  timestamp: datetime(2020, 2024),
  specific: datetime("2023-01-01", "2023-12-31"),

  // Random date between two dates
  event_date: dateBetween("2023-06-01", "2023-06-30"),

  // Format dates (YYYY, MM, DD, HH, mm, ss)
  formatted: formatDate(now(), "YYYY-MM-DD HH:mm"),

  // Date type generates ISO 8601 strings
  simple_date: date,                // Random date (YYYY-MM-DD)
  ranged_date: date in 2000..2023   // Date within year range
}
```

### Date Arithmetic
```vague
schema Invoice {
  issued_date: date in 2024..2024,

  // Add duration to a date
  due_date: issued_date + date.days(30),
  reminder_date: due_date - date.weeks(1),

  // Duration functions: days, weeks, months, years, hours, minutes
  quarterly_review: issued_date + date.months(3),
  annual_renewal: issued_date + date.years(1),

  // Works in constraints
  assume due_date >= issued_date,
  assume due_date <= issued_date + date.days(90)
}
```

### String Transformations
```vague
schema Product {
  title: "Hello World",

  // Case transformations
  upper: uppercase(title),           // "HELLO WORLD"
  lower: lowercase(title),           // "hello world"
  capitalized: capitalize(title),    // "Hello World"

  // Case style conversions
  slug: kebabCase(title),            // "hello-world"
  snake: snakeCase(title),           // "hello_world"
  camel: camelCase(title),           // "helloWorld"

  // String manipulation
  trimmed: trim("  hello  "),        // "hello"
  combined: concat(title, "!"),      // "Hello World!"
  part: substring(title, 0, 5),      // "Hello"
  replaced: replace(title, "World", "There"),  // "Hello There"
  len: length(title)                 // 11
}
```

### Sequential/Stateful Generation
```vague
schema Invoice {
  // Auto-incrementing string IDs
  id: sequence("INV-", 1001),         // "INV-1001", "INV-1002", ...

  // Auto-incrementing integers
  order_num: sequenceInt("orders", 100),  // 100, 101, 102, ...

  // Reference previous record in collection
  prev_amount: previous("amount"),    // null for first record
  amount: int in 100..500
}

// Use previous() for sequential coherence
schema TimeSeries {
  timestamp: int in 1000..2000,
  prev_ts: previous("timestamp"),     // Chain to previous record
  delta: timestamp - (previous("timestamp") ?? timestamp)
}
```

### Statistical Distributions
```vague
schema Person {
  // Normal/Gaussian distribution - for natural measurements
  age: gaussian(35, 10, 18, 65),      // mean, stddev, min, max

  // Log-normal - for right-skewed data like income, prices
  income: lognormal(10.5, 0.5, 20000, 500000),

  // Exponential - for wait times, decay
  wait_time: exponential(0.5, 0, 60),  // rate, min, max

  // Poisson - for count data (events per time period)
  daily_orders: poisson(5),            // lambda (expected count)

  // Beta - for probabilities and proportions (0-1 range)
  conversion_rate: beta(2, 5),         // alpha, beta shape params

  // Uniform - explicit uniform distribution
  random_value: uniform(0, 100)        // min, max
}
```

### Ternary Expressions
```vague
schema Invoice {
  total: int in 100..500,
  amount_paid: int in 0..0,
  // Conditional value based on expression
  status: amount_paid >= total ? "paid" : "partially-paid"
}

schema Item {
  score: int in 0..100,
  // Nested ternary for multiple conditions
  grade: score >= 90 ? "A" : score >= 70 ? "B" : "C"
}

schema Order {
  total: int in 10..200,
  is_member: boolean,
  has_coupon: boolean,
  // Logical operators: and, or, not
  discount: (total >= 100 and is_member) or has_coupon ? 0.15 : 0
}
```

### Conditional Fields
```vague
schema Account {
  type: "personal" | "business",
  name: string,

  // Field only exists when condition is true
  companyNumber: string when type == "business",
  taxId: string when type == "business"
}
// Output for personal: { "type": "personal", "name": "..." }
// Output for business: { "type": "business", "name": "...", "companyNumber": "...", "taxId": "..." }

schema Order {
  size: "small" | "medium" | "large",

  // Logical operators work in conditions
  discount: decimal in 0.1..0.2 when size == "large",
  premiumHandling: boolean when size == "large" or size == "medium"
}
```

### Dynamic Cardinality
```vague
schema Order {
  size: "small" | "large",
  // Cardinality depends on field value
  items: (size == "large" ? 5..10 : 1..3) of LineItem
}

schema Shipment {
  is_bulk: boolean,
  is_priority: boolean,
  // Logical conditions in cardinality
  packages: (is_bulk and is_priority ? 20..30 : 1..5) of Package
}
```

### Datasets
```vague
dataset TestData {
  companies: 100 of Company,
  invoices: 500 of Invoice
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
  invoices: 100 of Invoice
}

// Violating dataset - generates invoices where due_date < issued_date
dataset Invalid violating {
  bad_invoices: 100 of Invoice
}
```

### Dataset-Level Constraints
```vague
dataset TestData {
  invoices: 100 of Invoice,
  payments: 50 of Payment,

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
  pets: 50 of Pet
}
```

**Format-aware generation**: When the OpenAPI schema includes `format` hints, Vague generates appropriate values automatically:

| Format | Generated Output |
|--------|------------------|
| `uuid` | `550e8400-e29b-41d4-a716-446655440000` |
| `email` | `user@example.com` |
| `phone` / `phone-number` | `+12025551234` |
| `uri` / `url` | `https://example.com/123` |
| `date` | `2023-07-15` |
| `date-time` | `2023-07-15T14:30:00.000Z` |
| `time` | `14:30:45` |
| `hostname` | `host123.example.com` |
| `ipv4` | `192.168.1.100` |
| `ipv6` | `2001:0db8:85a3:...` |
| `byte` | Base64 encoded |
| `binary` | Hex string |
| `password` | `Pass1234!` |
| `iban` | `GB99MOCK12345678` |

Fields without format hints use type-based generation:
- `string` → Markov chain text (context-aware based on field name)
- `integer` → Random 0-999
- `number` → Random 0.0-999.x
- `boolean` → 50% true/false
- `enum` → Random choice from values
- `array` → Empty `[]` (override for populated arrays)
- `object` → `null` (override for nested objects)

### Schema Validation (CLI)
```bash
# Validate against OpenAPI spec
node dist/cli.js data.vague -v openapi.json -m '{"invoices": "Invoice"}'

# Validate only (exit code 1 on failure)
node dist/cli.js data.vague -v openapi.json -m '{"invoices": "Invoice"}' --validate-only
```

### OpenAPI Example Population (CLI)
Generate realistic examples and embed them in an OpenAPI spec:
```bash
# Populate OpenAPI spec with inline examples (bundled)
node dist/cli.js data.vague --oas-output api-with-examples.json --oas-source api.json

# With explicit mapping (collection -> schema)
node dist/cli.js data.vague --oas-output api.json --oas-source api.json -m '{"invoices": "Invoice"}'

# Multiple examples per schema
node dist/cli.js data.vague --oas-output api.json --oas-source api.json --oas-example-count 3

# External file references instead of inline examples
node dist/cli.js data.vague --oas-output api.json --oas-source api.json --oas-external
```

Options:
- `--oas-output <file>`: Output path for the populated OpenAPI spec
- `--oas-source <spec>`: Source OpenAPI spec to populate with examples
- `--oas-example-count <n>`: Number of examples per schema (default: 1)
- `--oas-external`: Use external file references (`externalValue`) instead of inline examples
- `-m, --mapping <json>`: Manual collection-to-schema mapping (auto-detects if not provided)

Auto-detection matches collection names to schema names:
- Case-insensitive: `pets` → `Pet`
- Plural to singular: `invoices` → `Invoice`
- snake_case to PascalCase: `line_items` → `LineItem`

## TypeScript Embedding

### File-based (Recommended)

Load `.vague` files directly with `fromFile`:

```typescript
import { fromFile } from 'vague';

// Load and compile a .vague file
const data = await fromFile('./fixtures.vague');

// With seed for deterministic output
const fixtures = await fromFile('./fixtures.vague', { seed: 42 });

// With TypeScript generics for type safety
interface TestData { invoices: Invoice[] }
const typed = await fromFile<TestData>('./fixtures.vague', { seed: 42 });
```

### Tagged Template (Inline Schemas)

Use `vague` tagged template for inline schemas:

```typescript
import { vague } from 'vague';

// Basic usage
const data = await vague`
  schema Person { name: string, age: int in 18..65 }
  dataset Test { people: 10 of Person }
`;

// With seed for deterministic output
const fixtures = await vague({ seed: 42 })`
  schema Invoice {
    id: unique int in 1000..9999,
    status: "draft" | "sent" | "paid",
    total: decimal in 100..5000
  }
  dataset Test { invoices: 20 of Invoice }
`;

// Interpolation support
const count = 100;
const data = await vague`
  dataset Test { items: ${count} of Item }
`;
```

### Vitest Fixture Pattern

See `examples/vitest-fixtures/` for a complete example of using Vague as a seeded fixture generator:

```typescript
// fixtures.vague
schema Invoice { id: unique int in 1000..9999, status: "draft" | "sent" | "paid" }
dataset TestFixtures { invoices: 20 of Invoice }

// invoice.test.ts
import { fromFile } from 'vague';

interface TestFixtures { invoices: Invoice[] }
const SEED = 42;

let fixtures: TestFixtures;
beforeAll(async () => {
  fixtures = await fromFile<TestFixtures>('./fixtures.vague', { seed: SEED });
});

it('test with deterministic fixtures', () => {
  // fixtures.invoices is the same every run
  expect(calculateTotal(fixtures.invoices[0])).toBe(expected);
});
```

Benefits:
- Fixtures are deterministic (same seed = same data)
- Schema changes automatically regenerate appropriate fixtures
- No static JSON files to maintain
- Complex relationships handled automatically
- TypeScript types keep fixtures aligned with code

### CSV Output

Convert generated data to CSV format:

```typescript
import { compile, toCSV, datasetToCSV, datasetToSingleCSV } from 'vague';

const data = await compile(source);

// Convert a single collection to CSV
const users = toCSV(data.users);

// Convert all collections to separate CSV strings
const csvMap = datasetToCSV(data);  // Map<string, string>

// Convert all collections to a single CSV with section markers
const combined = datasetToSingleCSV(data);
```

**CLI Usage:**
```bash
# Output as CSV
vague schema.vague -f csv -o output.csv

# CSV options
vague schema.vague -f csv --csv-delimiter ";" -o data.csv  # Semicolon delimiter
vague schema.vague -f csv --csv-no-header -o data.csv      # No header row
vague schema.vague -f csv --csv-arrays count -o data.csv   # Show array lengths
vague schema.vague -f csv --csv-nested json -o data.csv    # JSON for nested objects
```

**Options:**
| Option | Values | Description |
|--------|--------|-------------|
| `--csv-delimiter` | Any character | Field delimiter (default: `,`) |
| `--csv-no-header` | Flag | Omit header row |
| `--csv-arrays` | `json`, `first`, `count` | Array handling (default: `json`) |
| `--csv-nested` | `flatten`, `json` | Nested object handling (default: `flatten`) |

**Array handling modes:**
- `json`: Serialize arrays as JSON strings (default)
- `first`: Use only the first element
- `count`: Output the array length

**Nested handling modes:**
- `flatten`: Use dot notation (`address.city`, `address.zip`)
- `json`: Serialize nested objects as JSON strings

### Schema Inference from Data

Reverse-engineer Vague schemas from existing JSON or CSV data:

```typescript
import { inferSchema } from 'vague';

const data = {
  invoices: [
    { id: 1001, status: 'paid', total: 250.50, customer: 'Acme Corp' },
    { id: 1002, status: 'draft', total: 89.99, customer: 'Beta Inc' },
    { id: 1003, status: 'paid', total: 1250.00, customer: 'Acme Corp' },
  ]
};

const vagueCode = inferSchema(data);
// Generates:
// schema Invoice {
//   id: unique int in 1001..1003,
//   status: 0.67: "paid" | 0.33: "draft",
//   total: decimal in 89.99..1250,
//   customer: "Acme Corp" | "Beta Inc"
// }
//
// dataset Generated {
//   invoices: 3 of Invoice
// }
```

**CLI Usage:**
```bash
# Infer schema from JSON file
node dist/cli.js --infer data.json -o schema.vague

# Infer schema from CSV file
node dist/cli.js --infer data.csv -o schema.vague

# CSV with custom collection name (default: derived from filename)
node dist/cli.js --infer users.csv --collection-name employees

# CSV with custom delimiter
node dist/cli.js --infer data.csv --infer-delimiter ";"

# With custom dataset name
node dist/cli.js --infer data.json --dataset-name TestFixtures

# Disable format detection (uuid, email, etc.)
node dist/cli.js --infer data.json --no-formats

# Disable weighted superpositions (use equal weights)
node dist/cli.js --infer data.json --no-weights
```

**Options:**
```typescript
inferSchema(data, {
  datasetName: 'Generated',      // Name for the dataset
  detectFormats: true,           // Detect uuid, email, phone patterns
  weightedSuperpositions: true,  // Include weights in superpositions
  maxEnumValues: 10,             // Max unique values for enum detection
  detectUnique: true,            // Detect unique fields
});
```

**Detection Capabilities:**
| Feature | Detection Method | Vague Output |
|---------|-----------------|--------------|
| Types | Value analysis | `int`, `decimal`, `string`, `date`, `boolean` |
| Ranges | Min/max values | `int in 18..65` |
| Precision | Bounds analysis | `decimal(2) in 0.99..9.99` |
| Enums | Distinct value count | `"a" \| "b" \| "c"` |
| Weights | Value frequency | `0.7: "paid" \| 0.3: "draft"` |
| Nullable | Null presence | `string?` |
| Unique | All values distinct | `unique int in 1..100` |
| Formats | Pattern matching | `uuid()`, `email()`, etc. |
| Arrays | Array lengths | `1..5 of Item` |
| Nested | Object structure | Separate schema definitions |
| Derived fields | Correlation analysis | `total: round(qty * price, 2)` |
| Ordering | Date/value patterns | `assume end >= start` |
| Conditionals | Value co-occurrence | `assume if status == "paid" { amount > 0 }` |

### Data Validation (Dual-Use)

Validate real-world data against Vague schema constraints:

```bash
# Validate JSON data against a Vague schema
node dist/cli.js --validate-data data.json --schema schema.vague

# With explicit collection-to-schema mapping
node dist/cli.js --validate-data data.json --schema schema.vague -m '{"invoices": "Invoice"}'
```

The validator runs all `assume` constraints defined in the schema against each record in the data:

```vague
schema Invoice {
  amount: decimal,
  status: string,

  assume amount > 0,
  assume if status == "paid" {
    amount >= 100
  }
}
```

**Output:**
```
Loaded schemas: Invoice
Auto-detected mapping: {"invoices":"Invoice"}
✓ invoices (100 records) - all constraints satisfied

Validation summary: 100/100 records valid
```

**TypeScript API:**
```typescript
import { DataValidator } from 'vague';

const validator = new DataValidator();
validator.loadSchema(vagueSource);

// Validate single record
const errors = validator.validateRecord('Invoice', { amount: 150, status: 'paid' }, 0);

// Validate collection
const result = validator.validateCollection('Invoice', invoices);
// result.valid, result.errors, result.recordsValidated, result.recordsFailed

// Validate entire dataset
const datasetResult = validator.validateDataset(data, { invoices: 'Invoice' });
```

## Testing

Tests are colocated with source files (`*.test.ts`). Run with `npm test`.

Currently 663 tests covering lexer, parser, generator, validator, data validator, OpenAPI populator, schema inference, correlation detection, config loader, CLI, and examples.

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


## Plugin System

Vague supports custom generator plugins for extending the language with new data generators.

### Plugin API

```typescript
import { VaguePlugin, GeneratorFunction, GeneratorContext } from 'vague';

// A generator function receives args and context, returns a value
type GeneratorFunction = (args: unknown[], context: GeneratorContext) => unknown;

// A plugin has a name and a map of generator functions
interface VaguePlugin {
  name: string;
  generators: Record<string, GeneratorFunction>;
}
```

### Creating a Plugin

```typescript
import { VaguePlugin, registerPlugin } from 'vague';

const myPlugin: VaguePlugin = {
  name: 'custom',
  generators: {
    // Simple generator (no args)
    'greeting': () => 'Hello, World!',

    // Generator with args
    'repeat': (args) => {
      const [text, count] = args;
      return String(text).repeat(Number(count) || 1);
    },

    // Namespaced generator (accessed as custom.user.id)
    'user.id': () => `user_${Math.random().toString(36).slice(2, 10)}`,
  },
};

registerPlugin(myPlugin);
```

### Configuration File (vague.config.js)

Instead of registering plugins programmatically, you can use a config file to load plugins automatically when using the CLI:

```javascript
// vague.config.js
export default {
  // Plugins to load
  plugins: [
    './my-plugin.js',           // Local file (relative to config)
    'vague-plugin-stripe',      // npm package
    {                           // Inline plugin object
      name: 'inline',
      generators: {
        'hello': () => 'Hello!'
      }
    }
  ],

  // Default options (can be overridden by CLI flags)
  seed: 42,                     // Default seed for reproducible output
  format: 'json',               // Default output format: 'json' or 'csv'
  pretty: true                  // Pretty-print JSON by default
};
```

**Config File Discovery:**
The CLI automatically looks for config files in this order:
1. `vague.config.js`
2. `vague.config.mjs`
3. `vague.config.cjs`

It searches from the current directory upward until it finds one.

**CLI Options:**
```bash
# Use specific config file
vague schema.vague -c ./custom-config.js

# Skip config file entirely
vague schema.vague --no-config
```

**Plugin File Format:**
Plugins can export their content in several ways:

```javascript
// Default export (recommended)
export default {
  name: 'my-plugin',
  generators: { 'foo': () => 'bar' }
};

// Named export
export const plugin = {
  name: 'my-plugin',
  generators: { 'foo': () => 'bar' }
};

// Multiple plugins
export const pluginA = { name: 'a', generators: {} };
export const pluginB = { name: 'b', generators: {} };

// Array of plugins
export default [
  { name: 'a', generators: {} },
  { name: 'b', generators: {} }
];
```

**Library API:**
```typescript
import { loadConfig, loadConfigFrom, registerPlugin } from 'vague';

// Auto-discover and load config
const config = await loadConfig();
if (config) {
  for (const plugin of config.plugins) {
    registerPlugin(plugin);
  }
}

// Load specific config file
const config = await loadConfigFrom('./my-config.js');
```

### Using Plugins in .vague Files

```vague
schema Example {
  // Call registered plugin generators
  message: custom.greeting(),
  repeated: custom.repeat("ab", 3),
  userId: custom.user.id()
}
```

### Built-in Plugins

**Faker Plugin** (`src/plugins/faker.ts`):

Provides realistic data generation via [@faker-js/faker](https://fakerjs.dev/). Use either the full namespace (`faker.person.firstName()`) or shorthand (`firstName()`).

**Shorthand Generators** (most common):
```vague
schema User {
  id: uuid(),
  email: email(),
  phone: phone(),
  firstName: firstName(),
  lastName: lastName(),
  fullName: fullName(),
  company: companyName(),
  street: streetAddress(),
  city: city(),
  country: country(),
  countryCode: countryCode(),
  zipCode: zipCode(),
  website: url(),
  avatar: avatar(),
  bankAccount: iban(),
  currency: currencyCode(),
  created: pastDate(),
  expires: futureDate(),
  updated: recentDate(),
  bio: sentence(),
  description: paragraph()
}
```

**Full Faker Namespace Reference**:

| Category | Generators |
|----------|------------|
| **String** | `faker.string.uuid()`, `faker.string.alphanumeric(length?)`, `faker.string.nanoid(length?)` |
| **Person** | `faker.person.firstName(sex?)`, `faker.person.lastName(sex?)`, `faker.person.fullName()`, `faker.person.jobTitle()`, `faker.person.jobType()`, `faker.person.gender()`, `faker.person.prefix()`, `faker.person.suffix()` |
| **Internet** | `faker.internet.email()`, `faker.internet.userName()`, `faker.internet.url()`, `faker.internet.domainName()`, `faker.internet.ip()`, `faker.internet.ipv6()`, `faker.internet.mac()`, `faker.internet.password(length?)` |
| **Phone** | `faker.phone.number(style?)` (style: "human", "national", "international"), `faker.phone.imei()` |
| **Company** | `faker.company.name()`, `faker.company.catchPhrase()`, `faker.company.buzzPhrase()` |
| **Location** | `faker.location.streetAddress(useFullAddress?)`, `faker.location.city()`, `faker.location.state()`, `faker.location.zipCode(format?)`, `faker.location.country()`, `faker.location.countryCode()`, `faker.location.latitude()`, `faker.location.longitude()` |
| **Date** | `faker.date.past()`, `faker.date.future()`, `faker.date.recent()`, `faker.date.birthdate()` |
| **Finance** | `faker.finance.accountNumber(length?)`, `faker.finance.iban()`, `faker.finance.bic()`, `faker.finance.creditCardNumber(issuer?)`, `faker.finance.creditCardCVV()`, `faker.finance.currency()`, `faker.finance.currencyCode()`, `faker.finance.amount(min?, max?, dec?)`, `faker.finance.transactionType()` |
| **Commerce** | `faker.commerce.department()`, `faker.commerce.productName()`, `faker.commerce.price()`, `faker.commerce.productDescription()` |
| **Lorem** | `faker.lorem.word()`, `faker.lorem.words(count?)`, `faker.lorem.sentence(wordCount?)`, `faker.lorem.sentences(count?)`, `faker.lorem.paragraph(sentenceCount?)`, `faker.lorem.paragraphs(count?)` |
| **Image** | `faker.image.avatar()`, `faker.image.url()` |
| **Database** | `faker.database.column()`, `faker.database.type()`, `faker.database.collation()`, `faker.database.engine()`, `faker.database.mongodbObjectId()` |
| **Git** | `faker.git.branch()`, `faker.git.commitSha()`, `faker.git.commitMessage()` |
| **Hacker** | `faker.hacker.abbreviation()`, `faker.hacker.adjective()`, `faker.hacker.noun()`, `faker.hacker.verb()`, `faker.hacker.phrase()` |
| **Color** | `faker.color.rgb()`, `faker.color.human()` |
| **Number** | `faker.number.int()`, `faker.number.float()` |
| **Datatype** | `faker.datatype.boolean()` |
| **Airline** | `faker.airline.airline()`, `faker.airline.airport()`, `faker.airline.flightNumber()` |
| **Vehicle** | `faker.vehicle.vehicle()`, `faker.vehicle.manufacturer()`, `faker.vehicle.model()`, `faker.vehicle.vin()`, `faker.vehicle.vrm()` |

```vague
// Example: Full namespace usage
schema Employee {
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  title: faker.person.jobTitle(),
  email: faker.internet.email(),
  phone: faker.phone.number("international"),
  department: faker.commerce.department(),
  office: faker.location.city(),
  lat: faker.location.latitude(),
  lng: faker.location.longitude(),
  bio: faker.lorem.paragraph(),
  github: faker.git.branch(),
  vehicle: faker.vehicle.vehicle(),
  vin: faker.vehicle.vin()
}
```

**Issuer Plugin** (`src/plugins/issuer.ts`):
Generates problematic but technically valid values for edge case and security testing.

```vague
schema EdgeCaseTest {
  // Unicode edge cases
  zeroWidth: issuer.zeroWidth(),           // Strings with zero-width characters
  rtlText: issuer.rtl(),                   // Right-to-left override characters
  homoglyph: issuer.homoglyph("admin"),    // Lookalike characters (Cyrillic/Greek)
  emoji: issuer.emoji(),                   // Multi-codepoint emoji (ZWJ sequences)
  combining: issuer.combining(),           // Characters with combining marks (Zalgo-like)
  fullWidth: issuer.fullWidth(),           // CJK full-width characters
  mixedScript: issuer.mixedScript(),       // Brand names with Cyrillic substitutions

  // String edge cases
  empty: issuer.empty(),                   // Empty string
  whitespace: issuer.whitespace(),         // Whitespace-only strings
  long: issuer.long(10000),                // Very long strings
  sqlLike: issuer.sqlLike(),               // SQL injection-like (but valid) text
  htmlSpecial: issuer.htmlSpecial(),       // HTML/XSS special characters
  jsonSpecial: issuer.jsonSpecial(),       // JSON special characters
  newlines: issuer.newlines(),             // Embedded newlines/tabs
  nullChar: issuer.nullChar(),             // Embedded null character
  pathTraversal: issuer.pathTraversal(),   // Path traversal patterns
  commandInjection: issuer.commandInjection(), // Command injection patterns

  // Numeric edge cases
  maxInt: issuer.maxInt(),                 // Number.MAX_SAFE_INTEGER
  minInt: issuer.minInt(),                 // Number.MIN_SAFE_INTEGER
  tinyDecimal: issuer.tinyDecimal(),       // Very small decimals (near zero)
  floatPrecision: issuer.floatPrecision(), // Floating point precision issues (0.1+0.2)
  negativeZero: issuer.negativeZero(),     // -0
  boundaryInt: issuer.boundaryInt(),       // Boundary values (127, 255, 32767, etc.)

  // Date edge cases
  leapDay: issuer.leapDay(),               // Feb 29 dates
  y2k: issuer.y2k(),                       // Year 2000 edge cases
  epoch: issuer.epoch(),                   // Unix epoch boundaries (1970, 2038)
  farFuture: issuer.farFuture(),           // Very far future dates (9999)
  farPast: issuer.farPast(),               // Very far past dates (0001)

  // Format edge cases
  weirdEmail: issuer.weirdEmail(),         // Valid but unusual emails
  weirdUrl: issuer.weirdUrl(),             // Valid but unusual URLs
  specialUuid: issuer.specialUuid()        // Edge case UUIDs (nil, max)
}
```

Shorthand generators (most commonly used):
- `zeroWidth()`, `rtl()`, `homoglyph(text)`, `emoji()`
- `sqlLike()`, `htmlSpecial()`, `weirdEmail()`, `weirdUrl()`
- `maxInt()`, `leapDay()`

**Dates Plugin** (`src/plugins/date.ts`):
Generates dates filtered by day of week - useful for business scenarios.

```vague
schema Meeting {
  // Weekday dates only (Monday-Friday)
  meeting_date: date.weekday(2024, 2025)

  // Weekend dates only (Saturday-Sunday)
  party_date: date.weekend(2024, 2025)

  // Specific day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  monday_standup: date.dayOfWeek(1, 2024, 2025)

  // ISO string ranges also supported
  q1_meeting: date.weekday("2024-01-01", "2024-03-31")
}

// Weighted weekday/weekend distribution using superposition
schema Event {
  // 80% weekdays, 20% weekends
  event_date: 0.8: date.weekday(2024, 2025) | 0.2: date.weekend(2024, 2025)
}
```

Shorthand generators:
- `weekday(startYear, endYear)` or `weekday("start-date", "end-date")`
- `weekend(startYear, endYear)` or `weekend("start-date", "end-date")`

See `src/plugins/faker.ts`, `src/plugins/issuer.ts`, and `src/plugins/date.ts` for complete examples of plugin implementation.

## What's Implemented

- [x] Lexer, parser, AST, generator
- [x] Superposition with weights
- [x] Ranges and cardinality
- [x] Hard constraints (`assume`)
- [x] Conditional constraints (`assume if`)
- [x] Cross-record references (`any of`, `where`)
- [x] Parent references (`^field`)
- [x] Computed fields with aggregates (`sum`, `count`, `min`, `max`, `avg`, `first`, `last`, `median`, `product`)
- [x] Markov chain strings
- [x] OpenAPI import with format-aware generation (`uuid`, `email`, `date-time`, etc.)
- [x] Schema validation (OpenAPI 3.0.x/3.1.x)
- [x] Faker plugin for semantic types
- [x] Issuer plugin for edge case testing (Unicode, encoding, boundary values)
- [x] Dates plugin for weekday/weekend date generation (`date.weekday()`, `date.weekend()`)
- [x] VSCode syntax highlighting (`vscode-vague/`)
- [x] Dataset-level constraints (`validate { }` block)
- [x] Collection predicates (`all()`, `some()`, `none()` for validation)
- [x] Side effects (`then { }` blocks for mutating referenced objects)
- [x] Ternary expressions (`condition ? value : other`)
- [x] Logical operators in expressions (`and`, `or`, `not`)
- [x] Dynamic cardinality (`(condition ? 5..10 : 1..3) of Item`)
- [x] Nullable fields (`string?`, `int | null`)
- [x] Mixed superposition (`int in 10..500 | field.ref`, weighted: `0.7: int in 10..100 | 0.3: field`)
- [x] Seeded generation (`--seed 123` for reproducible output)
- [x] Negative testing (`dataset X violating { }` for constraint-violating data)
- [x] Logical operators in where clauses (`any of X where .a == 1 or .b == 2`)
- [x] Arithmetic in computed fields (`= sum(items.price) * 1.2`)
- [x] Decimal precision functions (`round()`, `floor()`, `ceil()`)
- [x] Decimal precision syntax (`decimal(2)` for 2 decimal places)
- [x] Unique values (`id: unique int in 1..1000`)
- [x] Statistical distributions (`gaussian`, `exponential`, `lognormal`, `poisson`, `beta`, `uniform`)
- [x] Date functions (`now`, `today`, `daysAgo`, `daysFromNow`, `datetime`, `dateBetween`, `formatDate`)
- [x] Sequential generation (`sequence()`, `sequenceInt()` for auto-incrementing values)
- [x] Previous references (`previous("field")` for sequential coherence)
- [x] Expression superposition (`0.7: (invoice.total - invoice.amount_paid) | 0.3: int in 10..500`)
- [x] OpenAPI example population (`--oas-output`, `--oas-source`, `--oas-external`, `--oas-example-count`)
- [x] Tagged template API (`vague\`...\``, `vague({ seed: 42 })\`...\``)
- [x] String transformations (`uppercase`, `lowercase`, `capitalize`, `kebabCase`, `snakeCase`, `camelCase`, `trim`, `concat`, `substring`, `replace`, `length`)
- [x] Schema inference from JSON data (`inferSchema()`, `--infer` CLI option)
- [x] Ordered sequences (`[a, b, c, d]` cycles through values in order)
- [x] Watch mode (`-w/--watch` for regenerating output on file change)
- [x] Private fields (`age: private int` - generated but excluded from output)
- [x] Date arithmetic (`date.days()`, `date.weeks()`, `date.months()`, `date.years()` with `+`/`-` operators)
- [x] CSV output format (`-f csv`, `--csv-delimiter`, `--csv-arrays`, `--csv-nested`)
- [x] CSV input for schema inference (`--infer data.csv`, `--collection-name`, `--infer-delimiter`)
- [x] Correlation detection in inference (derived fields, ordering constraints, conditional constraints)
- [x] Data validation mode (`--validate-data` CLI option to validate external data against Vague schemas)
- [x] Conditional fields (`field: type when condition` - field only exists when condition is true)
- [x] Config file support (`vague.config.js` for loading plugins and setting defaults)

See TODO.md for planned features.

## Post-Implementation Cleanup

After completing any feature, always verify:

1. **Examples** - Update `examples/` with new syntax if applicable
2. **Documentation** - Update this file's syntax examples and README.md
3. **Syntax highlighting** - Add new keywords/operators to `vscode-vague/syntaxes/vague.tmLanguage.json`
4. **TODO.md** - Move completed items to "Completed" section
