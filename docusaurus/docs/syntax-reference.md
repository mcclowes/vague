---
sidebar_position: 10
title: Syntax Reference
---

# Syntax Reference

Complete reference for all Vague language syntax.

## Primitives

```vague
name: string          // Random string
age: int              // Random integer
price: decimal        // Random decimal
active: boolean       // true or false
joined: date          // ISO date (YYYY-MM-DD)
```

## Ranges

```vague
age: int in 18..65              // Integer range
price: decimal in 0.01..999.99  // Decimal range
score: decimal(2) in 0..100     // 2 decimal places
founded: date in 2000..2023     // Date range (years)
```

## Superposition (Random Choice)

```vague
// Equal probability
status: "draft" | "sent" | "paid"

// Weighted probability
status: 0.6: "paid" | 0.3: "pending" | 0.1: "draft"

// Mixed: unweighted share remaining probability
status: 0.85: "active" | "archived"

// Mixed types
amount: int in 10..500 | invoice.total
```

## Nullable Fields

```vague
nickname: string?        // Shorthand
notes: string | null     // Explicit
```

## Private Fields

```vague
age: private int in 0..105   // Generated but not in output
```

## Unique Values

```vague
id: unique int in 1000..9999
code: unique "A" | "B" | "C"
```

## Ordered Sequences

```vague
pitch: [48, 52, 55, 60]   // Cycles through values
color: ["red", "green", "blue"]
```

## Collections

```vague
items: 5 of LineItem           // Exactly 5
items: 1..5 of LineItem        // 1 to 5 (random)

// Dynamic cardinality
items: (size == "large" ? 5..10 : 1..3) of LineItem
```

## Constraints

```vague
// Simple constraint
assume due_date >= issued_date

// Conditional constraint
assume if status == "paid" {
  amount > 0
}

// Logical operators
assume price > 50 or category == "budget"
assume not discount > 40
assume status == "active" and verified == true
```

## Cross-Record References

```vague
// Random from collection
customer: any of customers

// Filtered reference
customer: any of customers where .status == "active"

// Multiple conditions
charge: any of charges where .status == "ok" and .amount > 0
```

## Parent References

```vague
currency: ^base_currency    // From parent schema
```

## Computed Fields

```vague
// Aggregates
total: sum(items.amount)
count: count(items)
average: avg(items.price)
lowest: min(items.price)
highest: max(items.price)
mid: median(items.price)
first_item: first(items.price)
last_item: last(items.price)
multiplied: product(items.quantity)

// Arithmetic
tax: total * 0.2
grand_total: sum(items.amount) * 1.2

// Rounding
tax: round(subtotal * 0.2, 2)
floored: floor(value, 1)
ceiled: ceil(value, 0)
```

## Ternary Expressions

```vague
status: amount >= total ? "paid" : "pending"
grade: score >= 90 ? "A" : score >= 70 ? "B" : "C"
```

## Conditional Fields

```vague
companyNumber: string when type == "business"
```

## String Functions

```vague
upper: uppercase(name)         // "HELLO WORLD"
lower: lowercase(name)         // "hello world"
cap: capitalize(name)          // "Hello World"
slug: kebabCase(title)         // "hello-world"
snake: snakeCase(title)        // "hello_world"
camel: camelCase(title)        // "helloWorld"
trimmed: trim("  hello  ")     // "hello"
combined: concat(a, " ", b)    // "John Doe"
part: substring(name, 0, 5)    // First 5 chars
replaced: replace(s, "a", "b")
len: length(name)
```

## Built-in Generators

```vague
id: uuid()
email: email()
phone: phone()
name: firstName() | lastName() | fullName()
company: companyName()
address: streetAddress()
location: city() | state() | zipCode() | country()
text: sentence() | paragraph()
```

## Faker Integration

```vague
product: faker.commerce.productName()
bio: faker.lorem.paragraph()
avatar: faker.image.avatar()
version: faker.system.semver()
commit: faker.git.commitSha()
url: faker.internet.url()
```

## Statistical Distributions

```vague
age: gaussian(35, 10, 18, 65)     // mean, stddev, min, max
income: lognormal(10.5, 0.5, min, max)
wait: exponential(0.5, min, max)
orders: poisson(5)
rate: beta(2, 5)
value: uniform(0, 100)
```

## Date Functions

```vague
created_at: now()                    // Current timestamp
today_date: today()                  // Current date
past: daysAgo(30)                    // 30 days ago
future: daysFromNow(90)              // 90 days ahead
random: datetime(2020, 2024)         // Random in range
between: dateBetween("2023-01-01", "2023-12-31")
formatted: formatDate(now(), "YYYY-MM-DD")
```

## Date Arithmetic

```vague
due_date: issued_date + date.days(30)
reminder: due_date - date.weeks(1)
renewal: start + date.months(12)
```

## Day-of-Week Filtering

```vague
weekday_date: date.weekday(2024, 2025)
weekend_date: date.weekend(2024, 2025)
monday: date.dayOfWeek(1, 2024, 2025)
```

## Sequential Generation

```vague
id: sequence("INV-", 1001)        // "INV-1001", "INV-1002"
num: sequenceInt("counter", 100)  // 100, 101, 102
prev: previous("amount")          // Previous record's value
```

## Regex Patterns

```vague
code: regex("[A-Z]{3}-[0-9]{4}")
key: alphanumeric(32)
otp: digits(6)
ver: semver()
```

## Side Effects

```vague
schema Payment {
  invoice: any of invoices,
  amount: int in 50..500
} then {
  invoice.amount_paid += amount,
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partial"
}
```

## Refine Blocks

```vague
schema Player {
  position: "GK" | "FWD",
  goals: int in 0..30
} refine {
  if position == "GK" {
    goals: int in 0..2
  }
}
```

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

  validate {
    sum(invoices.total) >= 100000,
    all(invoices, .amount_paid <= .total),
    some(invoices, .status == "paid"),
    none(invoices, .total < 0)
  }
}
```

## Negative Testing

```vague
dataset Invalid violating {
  bad_invoices: 100 of Invoice
}
```

## OpenAPI Import

```vague
import petstore from "petstore.json"

schema Pet from petstore.Pet {
  age: int in 1..15  // Override field
}
```

## Schema Definition

```vague
schema Invoice {
  id: uuid(),
  amount: decimal in 100..10000,
  status: "draft" | "sent" | "paid",

  assume amount > 0
}
```

## Comments

```vague
// Single-line comment
name: string  // Inline comment
```
