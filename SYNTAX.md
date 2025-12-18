# Vague Syntax Cheat Sheet

Quick reference for all Vague language syntax.

---

## Primitives

```vague
name: string          # Random string
age: int              # Random integer
price: decimal        # Random decimal
active: boolean       # true or false
joined: date          # ISO date (YYYY-MM-DD)
```

---

## Ranges

```vague
age: int in 18..65              # Integer range
price: decimal in 0.01..999.99  # Decimal range
founded: date in 2000..2023     # Date range (years)
```

---

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

---

## Nullable Fields

```vague
nickname: string?        # Preferred: shorthand syntax
notes: string | null     # Alternative: explicit null
```

---

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

---

## Ordered Sequences (Cycling Lists)

```vague
# Cycles through values in order
pitch: [48, 52, 55, 60]           # C-E-G-C arpeggio
color: ["red", "green", "blue"]   # Cycles: red, green, blue, red...
value: [1+1, 2+2, 3+3]            # Cycles: 2, 4, 6, 2, 4, 6...
```

---

## Collections (Cardinality)

```vague
items: 5 of LineItem           # Exactly 5
items: 1..5 of LineItem        # 1 to 5 (random)

# Dynamic cardinality
items: (size == "large" ? 5..10 : 1..3) of LineItem
```

---

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

---

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

---

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

---

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

---

## Ternary Expressions

```vague
# Simple conditional
status: amount_paid >= total ? "paid" : "pending"

# Nested ternary
grade: score >= 90 ? "A" : score >= 70 ? "B" : "C"

# With logical operators
discount: (total >= 100 and is_member) or has_coupon ? 0.15 : 0
```

---

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

---

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

---

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

---

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

---

## Sequential Generation

```vague
# String sequence: "INV-1001", "INV-1002", ...
id: sequence("INV-", 1001)

# Integer sequence: 100, 101, 102, ...
order_num: sequenceInt("orders", 100)

# Previous record's value (null for first)
prev_amount: previous("amount")
```

---

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

---

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

---

## Dataset Definition

```vague
dataset TestData {
  customers: 100 of Customer,
  invoices: 500 of Invoice
}
```

---

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

---

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

---

## OpenAPI Import

```vague
import petstore from "petstore.json"

schema Pet from petstore.Pet {
  # Override or add fields
  age: int in 1..15
}
```

---

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

---

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

---

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

# Validate against OpenAPI
node dist/cli.js file.vague -v spec.json -m '{"invoices": "Invoice"}'
```
