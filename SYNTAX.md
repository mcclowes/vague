# Vague Syntax Cheat Sheet

Quick reference for all Vague language syntax.

## Primitives

```vague
name: string          # Random string
age: int              # Random integer
price: decimal        # Random decimal
active: boolean       # true or false
joined: date          # ISO date (YYYY-MM-DD)
```

## Ranges

```vague
age: int in 18..65              # Integer range
price: decimal in 0.01..999.99  # Decimal range
founded: date in 2000..2023     # Date range (years)
```

## Superposition (Random Choice)

```vague
# Equal probability
status: "draft" | "sent" | "paid"

# Weighted probability
status: 0.6: "paid" | 0.3: "pending" | 0.1: "draft"

# Mixed: unweighted options share remaining probability
status: 0.85: "Active" | "Archived"         # "Archived" gets 15%
category: 0.6: "main" | "side" | "dessert"  # "side" and "dessert" get 20% each

# Mixed types (range OR reference)
amount: int in 10..500 | invoice.total
amount: 0.7: int in 10..500 | 0.3: invoice.total
```

## Nullable Fields

```vague
nickname: string?        # Preferred: shorthand syntax
notes: string | null     # Alternative: explicit null
```

## Private Fields

```vague
schema Person {
  # Generated but excluded from output
  age: private int in 0..105,
  age_bracket: age < 18 ? "minor" : age < 65 ? "adult" : "senior"
}
# Output: { "age_bracket": "adult" } -- no "age" field

# Can combine with unique
internal_id: unique private int in 1..10000
```

## Ordered Sequences (Cycling Lists)

```vague
# Cycles through values in order
pitch: [48, 52, 55, 60]           # C-E-G-C arpeggio
color: ["red", "green", "blue"]   # Cycles: red, green, blue, red...
value: [1+1, 2+2, 3+3]            # Cycles: 2, 4, 6, 2, 4, 6...
```

## Collections (Cardinality)

```vague
items: 5 of LineItem           # Exactly 5
items: 1..5 of LineItem        # 1 to 5 (random)

# Dynamic cardinality
items: (size == "large" ? 5..10 : 1..3) of LineItem
```

## Unique Values

```vague
id: unique int in 1000..9999        # No duplicate IDs
code: unique "A" | "B" | "C" | "D"  # No duplicate codes
```

---

## Constraints

```vague
# Simple constraint
assume due_date >= issued_date

# Conditional constraint
assume if status == "paid" {
  amount > 0
}

# Logical operators: and, or, not
assume price > 50 or category == "budget"
assume not discount > 40
assume status == "active" and verified == true
```

## Cross-Record References

```vague
# Random item from collection
customer: any of customers

# Filtered reference (. = current item being tested)
customer: any of customers where .status == "active"

# Multiple conditions
charge: any of charges where .status == "succeeded" and .amount > 0
```

> **Note:** In `where` clauses, `.field` refers to the current item's field.

## Parent References

```vague
schema LineItem {
  currency: ^base_currency    # ^ = parent schema's field
}

schema Invoice {
  base_currency: "USD" | "EUR",
  items: 1..5 of LineItem        # LineItem inherits currency
}
```

> **Note:** `^field` accesses a field from the parent schema.

## Computed Fields

```vague
# Aggregates
total: sum(items.amount)
count: count(items)
average: avg(items.price)
lowest: min(items.price)
highest: max(items.price)
mid: median(items.price)
first_item: first(items.price)
last_item: last(items.price)
multiplied: product(items.quantity)

# Arithmetic
tax: total * 0.2
grand_total: sum(items.amount) * 1.2

# Rounding
tax: round(subtotal * 0.2, 2)    # 2 decimal places
floored: floor(value, 1)
ceiled: ceil(value, 0)
```

## Ternary Expressions

```vague
# Simple conditional
status: amount_paid >= total ? "paid" : "pending"

# Nested ternary
grade: score >= 90 ? "A" : score >= 70 ? "B" : "C"

# With logical operators
discount: (total >= 100 and is_member) or has_coupon ? 0.15 : 0
```

## Match Expressions

Pattern matching for cleaner multi-way branching:

```vague
# Map values to display text
display_status: match status {
  "pending" => "Awaiting shipment",
  "shipped" => "On the way",
  "delivered" => "Complete"
}

# Match on numeric values
label: match stars {
  1 => "terrible",
  2 => "poor",
  3 => "average",
  4 => "good",
  5 => "excellent"
}

# Match with computed results
final_price: match tier {
  "basic" => base_price,
  "standard" => base_price * 1.5,
  "premium" => base_price * 2
}
```

> **Note:** If no arm matches, the result is `null`.

## String Transformations

```vague
# Case transformations
upper: uppercase(name)         # "HELLO WORLD"
lower: lowercase(name)         # "hello world"
cap: capitalize(name)          # "Hello World"

# Case style conversions
slug: kebabCase(title)         # "hello-world"
snake: snakeCase(title)        # "hello_world"
camel: camelCase(title)        # "helloWorld"

# String manipulation
trimmed: trim("  hello  ")     # "hello"
combined: concat(a, " ", b)    # "John Doe"
part: substring(name, 0, 5)    # First 5 chars
replaced: replace(s, "a", "b")
len: length(name)
```

## Generators (Semantic Data)

### Built-in Generators
```vague
id: uuid()
email: email()
phone: phone()
name: firstName() | lastName() | fullName()
company: companyName()
address: streetAddress()
location: city() | state() | zipCode()
text: sentence()
```

### Faker Integration
```vague
product: faker.commerce.productName()
bio: faker.lorem.paragraph()
avatar: faker.image.avatar()
version: faker.system.semver()
commit: faker.git.commitSha()
url: faker.internet.url()
```

### Dates Plugin
```vague
# Weekday dates only (Monday-Friday)
meeting_date: date.weekday(2024, 2025)

# Weekend dates only
party_date: date.weekend(2024, 2025)

# Specific day of week (0=Sun, 1=Mon, ..., 6=Sat)
monday: date.dayOfWeek(1, 2024, 2025)

# ISO string ranges also work
q1: date.weekday("2024-01-01", "2024-03-31")

# Shorthand (no namespace)
meeting: weekday(2024, 2025)
party: weekend(2024, 2025)
```

### Regex Plugin
Generate strings from regex patterns and validate with pattern matching.

```vague
# Generate strings matching a pattern
sku: regex("[A-Z]{3}-[0-9]{4}")
code: pattern("[A-Z]{2}[0-9]{6}")        # alias for regex()

# Pattern testing in constraints
assume matches("^[A-Z]{3}-[0-9]+$", custom_id)

# Common pattern shortcuts
alphanumeric_code: alphanumeric(8)        # 8 alphanumeric chars
numeric_code: digits(6)                   # 6 digits
alpha_code: alpha(4)                      # 4 letters
hex_code: hexString(8)                    # 8 hex chars
url_slug: slug(2, 4)                      # slug with 2-4 words
version: semver()                         # semantic version "1.2.3"
color: colorHex()                         # "#a1b2c3"
tag: hashtag(1, 3)                        # "#camelCaseTag"
handle: mention(3, 15)                    # "@username123"
plate: licensePlate("us")                 # "ABC-1234"
zip: postalCode("us")                     # "12345" or "12345-6789"
ipv4: regex.ip("v4")                      # "192.168.1.1"
macAddr: regex.mac()                      # "AB:CD:EF:12:34:56"
```

### Issuer Plugin (Edge Case Testing)
Generate problematic but valid values for testing edge cases and system limits.

```vague
# Unicode edge cases
invisible: issuer.zeroWidth()             # Strings with zero-width chars
reversed: issuer.rtl()                    # Right-to-left override text
lookalike: issuer.homoglyph("admin")      # Lookalike chars (аdmin vs admin)
complex_emoji: issuer.emoji()             # Multi-codepoint emoji 👨‍👩‍👧‍👦
stacked: issuer.combining()               # Characters with stacked diacritics
wide: issuer.fullWidth()                  # Full-width ASCII "Ｈｅｌｌｏ"
confusable: issuer.mixedScript()          # Mixed Cyrillic/Latin "pаypal"

# String edge cases
blank: issuer.empty()                     # Empty string ""
spaces: issuer.whitespace()               # Whitespace-only strings
huge: issuer.long(10000)                  # Very long strings
sql_attempt: issuer.sqlLike()             # SQL injection-like text
html_attempt: issuer.htmlSpecial()        # HTML/XSS-like text
json_special: issuer.jsonSpecial()        # JSON special characters
multiline: issuer.newlines()              # Embedded newlines/tabs
null_byte: issuer.nullChar()              # Embedded null character
path_attack: issuer.pathTraversal()       # Path traversal patterns
cmd_attack: issuer.commandInjection()     # Command injection patterns

# Numeric edge cases
big: issuer.maxInt()                      # 9007199254740991
small: issuer.minInt()                    # -9007199254740991
tiny: issuer.tinyDecimal()                # Very small decimals
precision_issue: issuer.floatPrecision()  # 0.1 + 0.2 = 0.30000000000000004
neg_zero: issuer.negativeZero()           # -0
boundary: issuer.boundaryInt()            # 127, 255, 32767, etc.

# Date edge cases
feb29: issuer.leapDay()                   # "2024-02-29"
millennium: issuer.y2k()                  # Y2K boundary dates
unix_epoch: issuer.epoch()                # Unix epoch boundaries
year9999: issuer.farFuture()              # "9999-12-31"
year0001: issuer.farPast()                # "0001-01-01"

# Format edge cases
odd_email: issuer.weirdEmail()            # Valid but unusual emails
odd_url: issuer.weirdUrl()                # Valid but unusual URLs
special_uuid: issuer.specialUuid()        # Edge case UUIDs (nil, max)
```

### HTTP Plugin
Generate HTTP-related test data for API testing and webhook payloads.

```vague
# HTTP methods (weighted distribution)
method: http.method()                     # GET, POST, PUT, PATCH, DELETE...

# Status codes
status: http.statusCode()                 # Weighted realistic status codes
text: http.statusText(404)                # "Not Found"
success: http.successCode()               # 200, 201, 202, 204
client_err: http.clientErrorCode()        # 400, 401, 403, 404, 422, 429
server_err: http.serverErrorCode()        # 500, 501, 502, 503, 504

# Headers
content: http.contentType()               # "application/json", "text/html"...
agent: http.userAgent()                   # Browser/bot user agent strings
accept: http.accept()                     # Accept header values
cache: http.cacheControl()                # "no-cache", "max-age=3600"...

# CORS
origin: http.corsOrigin()                 # CORS origin values
cors_methods: http.corsMethods()          # "GET, POST, OPTIONS"
cors_headers: http.corsHeaders()          # "Content-Type, Authorization"

# Authorization
bearer: http.bearerToken()                # "Bearer abc123..."
basic: http.basicAuth()                   # "Basic dXNlcjpwYXNz"
key: http.apiKey()                        # "sk_live_abc123..."

# Webhooks
event: http.webhookEvent()                # "payment.succeeded", "order.created"

# Environment variables
api_url: env("API_URL")                   # Read from environment
api_key: env("API_KEY", "default-key")    # With default value
```

### SQL Plugin
Generate SQL-related test data for database testing.

```vague
# Identifiers
table: sql.tableName()                    # "users", "order_items"
column: sql.columnName()                  # "created_at", "user_id"
schema_name: sql.schemaName()             # "public", "analytics"
alias: sql.alias()                        # "t1", "src", "tmp"

# Quoted identifiers (for reserved words)
quoted_col: sql.quoted("user")            # "\"user\"" (ANSI)
mysql_col: sql.quoted("user", "mysql")    # "`user`"

# SQL values (properly escaped)
str_val: sql.string("O'Brien")            # "'O''Brien'"
date_val: sql.dateValue("2024-01-15")     # "DATE '2024-01-15'"
ts_val: sql.timestamp()                   # "TIMESTAMP '2024-01-15 10:30:00'"
null_val: sql.nullValue()                 # "NULL"
bool_val: sql.boolean(true)               # "TRUE"
int_val: sql.integer(0, 100)              # "42"
dec_val: sql.decimalValue(2)              # "123.45"

# Data types
type: sql.dataType()                      # "VARCHAR(255)", "INTEGER"
col_def: sql.columnDefinition()           # "name VARCHAR(255) NOT NULL"

# Connection strings
pg_conn: sql.connectionString("postgres") # "postgresql://user:pass@host:5432/db"
mysql_conn: sql.connectionString("mysql") # "mysql://user:pass@host:3306/db"

# Query fragments
select_stmt: sql.select()                 # "SELECT id, name FROM users"
where_stmt: sql.whereClause()             # "WHERE status = 'active'"
order_stmt: sql.orderBy()                 # "ORDER BY created_at DESC"
limit_stmt: sql.limit(100)                # "LIMIT 50 OFFSET 10"
group_stmt: sql.groupBy()                 # "GROUP BY category"
join_stmt: sql.join("left")               # "LEFT JOIN orders o ON..."

# Full statements
insert_stmt: sql.insert()                 # "INSERT INTO users (...)"
update_stmt: sql.update()                 # "UPDATE users SET ... WHERE ..."
delete_stmt: sql.delete()                 # "DELETE FROM users WHERE ..."
create_stmt: sql.createTable()            # "CREATE TABLE users (...)"

# Placeholders
pg_param: sql.placeholder("postgres", 1)  # "$1"
mysql_param: sql.placeholder("mysql")     # "?"
```

### GraphQL Plugin
Generate GraphQL-related test data for API testing.

```vague
# Identifiers
field: graphql.fieldName()                # "id", "createdAt", "fetchUsers"
type: graphql.typeName()                  # "User", "OrderPayload"
op_name: graphql.operationName()          # "GetUser", "CreateOrder"
enum_val: graphql.enumValue()             # "ACTIVE", "PENDING"
directive: graphql.directiveName()        # "@deprecated", "@auth"

# Scalar values
gql_id: graphql.id()                      # UUID or prefixed ID
gql_str: graphql.string()                 # GraphQL string with escaping
gql_int: graphql.integer()                # 32-bit signed integer
gql_float: graphql.float()                # GraphQL Float
gql_bool: graphql.boolean()               # true or false

# Operations
query: graphql.query()                    # "query { user(id: \"1\") {...} }"
mutation: graphql.mutation()              # "mutation { createUser(...) {...} }"
subscription: graphql.subscription()      # "subscription { messageAdded {...} }"
fragment: graphql.fragment()              # "fragment UserFields on User {...}"

# Errors
error: graphql.error()                    # Full GraphQL error object
error_msg: graphql.errorMessage()         # Error message string
error_code: graphql.errorCode()           # "UNAUTHENTICATED", "NOT_FOUND"

# Variables
var_name: graphql.variableName()          # "$id", "$input"
vars: graphql.variables()                 # Variables object

# Schema
schema_def: graphql.schemaDefinition()    # Type definition snippet

# Shorthand (prefixed with 'gql')
field2: gqlFieldName()
type2: gqlTypeName()
query2: gqlQuery()
mutation2: gqlMutation()
```

## Statistical Distributions

```vague
# Normal/Gaussian (mean, stddev, min, max)
age: gaussian(35, 10, 18, 65)

# Log-normal (mu, sigma, min, max)
income: lognormal(10.5, 0.5, 20000, 500000)

# Exponential (rate, min, max)
wait_time: exponential(0.5, 0, 60)

# Poisson (lambda)
daily_orders: poisson(5)

# Beta (alpha, beta) - returns 0-1
conversion_rate: beta(2, 5)

# Uniform (min, max)
random_value: uniform(0, 100)
```

## Date Functions

```vague
created_at: now()                    # Current ISO timestamp
created_date: today()                # Current date (YYYY-MM-DD)
past_event: daysAgo(30)              # 30 days ago
future_event: daysFromNow(90)        # 90 days from now
timestamp: datetime(2020, 2024)      # Random in year range
event_date: dateBetween("2023-01-01", "2023-12-31")
formatted: formatDate(now(), "YYYY-MM-DD HH:mm")
```

## Sequential Generation

```vague
# String sequence: "INV-1001", "INV-1002", ...
id: sequence("INV-", 1001)

# Integer sequence: 100, 101, 102, ...
order_num: sequenceInt("orders", 100)

# Previous record's value (null for first)
prev_amount: previous("amount")
```

## Side Effects (then blocks)

```vague
schema Payment {
  invoice: any of invoices,
  amount: int in 50..500
} then {
  invoice.amount_paid += amount,
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partial"
}
```

Supported operations: `=` (assign), `+=` (add)

## Refine Blocks (Conditional Field Overrides)

```vague
schema Player {
  position: "GK" | "DEF" | "MID" | "FWD",
  goals: int in 0..30,
  clean_sheets: int in 0..20
} refine {
  if position == "GK" {
    goals: int in 0..2
  },
  if position == "FWD" {
    clean_sheets: int in 0..3
  }
}
```

Refine blocks regenerate specific fields when conditions match, allowing different constraints per variant.

## Dataset Definition

```vague
dataset TestData {
  customers: 100 of Customer,
  invoices: 500 of Invoice
}
```

## Dataset Validation

```vague
dataset TestData {
  invoices: 100 of Invoice,
  payments: 50 of Payment,

  validate {
    sum(invoices.total) >= 100000,
    sum(invoices.total) <= 500000,
    count(payments) <= count(invoices),

    # Collection predicates
    all(invoices, .amount_paid <= .total),   # All must satisfy
    some(invoices, .status == "paid"),       # At least one
    none(invoices, .total < 0)               # None should satisfy
  }
}
```

## Negative Testing (Violating Data)

```vague
# Normal dataset - satisfies constraints
dataset Valid {
  invoices: 100 of Invoice
}

# Violating dataset - intentionally breaks constraints
dataset Invalid violating {
  bad_invoices: 100 of Invoice
}
```

## OpenAPI Import

```vague
import petstore from "petstore.json"

schema Pet from petstore.Pet {
  # Override or add fields
  age: int in 1..15
}
```

## Schema Definition

```vague
schema Invoice {
  # Fields
  id: uuid(),
  amount: decimal in 100..10000,
  status: "draft" | "sent" | "paid",

  # Constraints
  assume amount > 0
}
```

## Complete Example

```vague
schema Customer {
  id: uuid(),
  name: fullName(),
  email: email(),
  status: 0.8: "active" | 0.2: "inactive"
}

schema LineItem {
  product: faker.commerce.productName(),
  quantity: int in 1..10,
  unit_price: decimal in 9.99..199.99,
  amount: quantity * unit_price,
  currency: ^base_currency
}

schema Invoice {
  id: sequence("INV-", 1001),
  customer: any of customers where .status == "active",
  base_currency: "USD" | "EUR" | "GBP",
  line_items: 1..5 of LineItem,
  subtotal: sum(line_items.amount),
  tax: round(subtotal * 0.2, 2),
  total: subtotal + tax,
  amount_paid: int in 0..0,
  status: amount_paid >= total ? "paid" : "pending",

  assume total > 0
}

schema Payment {
  invoice: any of invoices where .status == "pending",
  amount: int in 50..500
} then {
  invoice.amount_paid += amount,
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partial"
}

dataset TestData {
  customers: 50 of Customer,
  invoices: 200 of Invoice,
  payments: 100 of Payment,

  validate {
    all(invoices, .amount_paid <= .total),
    some(invoices, .status == "paid")
  }
}
```

## CLI Quick Reference

```bash
# Generate JSON
node dist/cli.js file.vague

# Pretty print
node dist/cli.js file.vague -p

# Save to file
node dist/cli.js file.vague -o output.json

# Reproducible output (seeded)
node dist/cli.js file.vague --seed 123

# Watch mode (regenerate on file change)
node dist/cli.js file.vague -o output.json -w

# CSV output
node dist/cli.js file.vague -f csv -o output.csv

# NDJSON output (newline-delimited JSON)
node dist/cli.js file.vague -f ndjson -o output.ndjson

# Validate against OpenAPI
node dist/cli.js file.vague -v spec.json -m '{"invoices": "Invoice"}'

# Validate only (no output, useful for CI)
node dist/cli.js file.vague -v spec.json -m '{"invoices": "Invoice"}' --validate-only

# Validate external data against Vague schema
node dist/cli.js --validate-data data.json --schema schema.vague

# Infer schema from data
node dist/cli.js --infer data.json -o schema.vague
node dist/cli.js --infer data.csv --collection-name users

# Generate TypeScript definitions
node dist/cli.js file.vague --typescript -o types.ts
node dist/cli.js file.vague --ts-only -o types.ts  # Only generate types

# Lint OpenAPI specs
node dist/cli.js --lint-spec openapi.json
node dist/cli.js --lint-spec openapi.yaml --lint-verbose

# Populate OpenAPI with examples
node dist/cli.js data.vague --oas-output api.json --oas-source api.json
node dist/cli.js data.vague --oas-output api.json --oas-source api.json --oas-example-count 3

# Debug logging
node dist/cli.js file.vague --debug
node dist/cli.js file.vague --log-level info
VAGUE_DEBUG=generator,constraint node dist/cli.js file.vague

# Load custom plugins
node dist/cli.js file.vague --plugins ./my-plugins
```

---

## Configuration File

Create a `vague.config.js` (or `.mjs`, `.cjs`) in your project root for persistent configuration.

```javascript
// vague.config.js
export default {
  // Reproducible output with fixed seed
  seed: 42,

  // Output format: 'json' or 'csv'
  format: 'json',

  // Pretty-print JSON output
  pretty: true,

  // Load custom plugins
  plugins: [
    './my-plugin.js',              // Local file
    'vague-plugin-stripe',         // npm package
    {                              // Inline plugin
      name: 'custom',
      generators: {
        greeting: () => 'Hello!',
      },
    },
  ],

  // Logging configuration
  logging: {
    level: 'info',                 // 'none', 'error', 'warn', 'info', 'debug'
    components: ['generator', 'constraint'],  // Filter by component
    timestamps: true,              // Show timestamps
    colors: true,                  // Colorized output
  },
};
```

Config files are auto-discovered by searching up from the current directory. CLI flags override config file settings.

### Valid Logging Components

- `lexer` - Tokenization
- `parser` - AST parsing
- `generator` - Data generation
- `constraint` - Constraint evaluation
- `validator` - Schema validation
- `plugin` - Plugin loading
- `cli` - CLI operations
- `openapi` - OpenAPI processing
- `infer` - Schema inference
- `config` - Configuration loading

---

## Debug Logging

Enable debug output to troubleshoot generation issues:

```bash
# Enable all debug output
node dist/cli.js file.vague --debug

# Specific log level
node dist/cli.js file.vague --log-level debug

# Filter by component (via environment variable)
VAGUE_DEBUG=generator node dist/cli.js file.vague
VAGUE_DEBUG=generator,constraint node dist/cli.js file.vague
```
