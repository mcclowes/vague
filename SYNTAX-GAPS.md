# Vague Syntax Gaps & Proposals

This document captures syntax patterns that are currently difficult or impossible to express in Vague, along with proposed solutions.

---

## 1. Conditional Field Values (Different Generation Per Branch)

### The Problem
You can use ternary expressions for simple cases, but complex branching with different generator logic per branch is awkward:

```vague
// Works, but limited:
discount: is_member ? 0.15 : 0

// Doesn't work - can't call different generators per branch:
email: type == "business" ? corporateEmail() : personalEmail()
```

The ternary only supports simple expressions, not full field definitions with different types/generators.

### Current Workaround
Use `refine` blocks, but they regenerate fields after initial generation (inefficient):

```vague
schema Contact {
  type: "personal" | "business",
  email: email()
} refine {
  if type == "business" { email: faker.internet.email({ provider: "company.com" }) }
}
```

### Proposal
Add `if/then/else` as a field expression:

```vague
schema Contact {
  type: "personal" | "business",
  email: if type == "business" then corporateEmail() else personalEmail()
}
```

Or extend `match` to be more powerful:

```vague
schema Contact {
  type: "personal" | "business",
  email: match type {
    "business" => faker.internet.email({ provider: "company.com" }),
    "personal" => email()
  }
}
```

**Status**: Tracked in TODO.md as "Conditional field values"

---

## 2. String Interpolation / Template Literals

### The Problem
Building strings from multiple parts requires verbose `concat()` chains:

```vague
// Current - awkward:
reference: concat("INV-", id, "-", year)
greeting: concat("Hello, ", firstName, " ", lastName)

// Desired:
reference: `INV-${id}-${year}`
greeting: `Hello, ${firstName} ${lastName}`
```

### Current Workaround
```vague
reference: concat(concat(concat("INV-", id), "-"), year)
// or slightly better with sequence():
reference: sequence("INV-", 1001)  // but this is auto-incrementing, not template-based
```

### Proposal
Add template literal syntax:

```vague
schema Invoice {
  id: int in 1000..9999,
  year: 2024,
  reference: `INV-${id}-${year}`
}
```

Alternative: Improve `concat()` to flatten nested calls automatically (already done), but template literals are more readable.

**Priority**: Medium - `concat()` works but is verbose

---

## 3. Temporal Relationships / Date Offsets

### The Problem
Expressing "event B happens N days after event A" is possible but indirect:

```vague
// Current - works but requires knowledge of date arithmetic:
schema Order {
  ordered_at: date in 2024..2024,
  shipped_at: ordered_at + date.days(int in 1..3)
}
```

The syntax isn't immediately clear for expressing "shipped 1-3 days after ordered".

### Current Capabilities
Date arithmetic exists: `date.days()`, `date.weeks()`, `date.months()`, `date.years()`

```vague
due_date: issued_date + date.days(30)
```

### Proposal
The current syntax is functional. Could add sugar for common patterns:

```vague
// Possible clearer syntax:
shipped_at: 1..3 days after ordered_at
due_date: 30 days after issued_date

// Or a function:
shipped_at: dateAfter(ordered_at, days: 1..3)
```

**Priority**: Low - current date arithmetic works

---

## 4. Composite Uniqueness

### The Problem
Can't express "unique combination of fields":

```vague
// Current - each field unique separately:
schema Person {
  firstName: unique firstName(),
  lastName: unique lastName()
}

// Desired - unique *combination*:
schema Person {
  firstName: firstName(),
  lastName: lastName(),
  unique(firstName, lastName)  // combination must be unique
}
```

### Current Workaround
No clean workaround. You'd need to use `assume` with a complex check, but there's no built-in function to verify uniqueness across the dataset during generation.

### Proposal

**Option A**: Tuple uniqueness constraint

```vague
schema Person {
  firstName: firstName(),
  lastName: lastName(),
  assume unique(firstName, lastName)
}
```

**Option B**: Unique modifier on computed field

```vague
schema Person {
  firstName: firstName(),
  lastName: lastName(),
  fullName: unique concat(firstName, " ", lastName)
}
```

**Option C**: Schema-level modifier

```vague
schema Person unique(firstName, lastName) {
  firstName: firstName(),
  lastName: lastName()
}
```

**Priority**: Medium - common need for realistic test data

---

## 5. Dependent/Correlated Distributions

### The Problem
Weights are static. Can't express "probability of X increases based on Y":

```vague
// Current - static weights:
status: 0.7: "paid" | 0.2: "pending" | 0.1: "overdue"

// Desired - dynamic based on invoice age:
// "older invoices more likely to be paid"
status: weighted by age {
  age > 60 => 0.9: "paid" | 0.1: "pending",
  age > 30 => 0.6: "paid" | 0.3: "pending" | 0.1: "overdue",
  _ => 0.3: "paid" | 0.5: "pending" | 0.2: "overdue"
}
```

### Current Workaround
Use `refine` blocks (inefficient) or ternary chains (verbose):

```vague
schema Invoice {
  age: int in 0..90,
  status: "pending"
} refine {
  if age > 60 { status: 0.9: "paid" | 0.1: "pending" },
  if age > 30 and age <= 60 { status: 0.6: "paid" | 0.3: "pending" | 0.1: "overdue" }
}
```

### Proposal

**Option A**: Conditional probability modifier (from TODO.md)

```vague
assume status == "paid" with probability 0.9 if age > 60
```

**Option B**: Weighted match expression

```vague
status: match age {
  > 60 => 0.9: "paid" | 0.1: "pending",
  > 30 => 0.6: "paid" | 0.3: "pending" | 0.1: "overdue",
  _ => 0.3: "paid" | 0.5: "pending" | 0.2: "overdue"
}
```

**Priority**: High - critical for realistic correlated data

---

## 6. Recursive / Self-Referential Structures

### The Problem
Can't express trees, graphs, or nested structures with controlled depth:

```vague
// Desired - comment threads:
schema Comment {
  text: sentence(),
  replies: 0..3 of Comment  // Recursive - doesn't work
}

// Desired - org chart:
schema Employee {
  name: fullName(),
  reports: 0..5 of Employee  // Tree structure
}
```

### Current Workaround
None clean. You'd need to manually define separate schemas for each depth level:

```vague
schema CommentL3 { text: sentence() }
schema CommentL2 { text: sentence(), replies: 0..2 of CommentL3 }
schema CommentL1 { text: sentence(), replies: 0..2 of CommentL2 }
schema Comment { text: sentence(), replies: 0..3 of CommentL1 }
```

### Proposal

**Option A**: Depth-limited recursion

```vague
schema Comment {
  text: sentence(),
  replies: 0..3 of Comment max depth 4
}
```

**Option B**: Probability-based termination

```vague
schema Comment {
  text: sentence(),
  replies: 0..3 of Comment with probability 0.3  // 30% chance of having replies
}
```

**Option C**: Explicit self-reference keyword

```vague
schema Comment recursive(depth: 4) {
  text: sentence(),
  replies: 0..3 of self
}
```

**Priority**: Medium - useful for hierarchical data

---

## 7. Negative Constraints (Exclusions)

### The Problem
`assume` expresses what *must* be true, but expressing what *must not* be true is indirect:

```vague
// Current - double negative:
assume not (status == "paid" and amount == 0)

// Desired - more readable:
exclude status == "paid" and amount == 0
forbid { status: "paid", amount: 0 }
```

### Current Workaround
Use `assume not (...)` or equivalent positive constraint:

```vague
assume not (status == "paid" and amount == 0)
// equivalent to:
assume status != "paid" or amount != 0
```

### Proposal
Add `exclude` or `forbid` keyword for readability:

```vague
schema Invoice {
  status: "draft" | "sent" | "paid",
  amount: int in 0..1000,
  exclude status == "paid" and amount == 0
}
```

**Priority**: Low - `assume not` works, this is sugar

---

## 8. Cross-Dataset Aggregations

### The Problem
Aggregations work within a schema's scope, but not across unrelated collections:

```vague
// Current - works:
total: sum(line_items.amount)  // line_items is a child collection

// Doesn't work - referencing sibling collection:
schema Customer {
  id: unique int,
  total_spent: sum(invoices where .customer_id == id, .amount)  // Can't do this
}
```

### Current Workaround
Use `then` blocks to update parent records when generating child records:

```vague
schema Invoice {
  customer: any of customers,
  amount: int in 100..1000
} then {
  customer.total_spent += amount
}
```

This works but requires the inverse relationship pattern.

### Proposal

**Option A**: Cross-reference aggregation

```vague
schema Customer {
  id: unique int,
  total_spent: sum of invoices where .customer_id == id
}
```

**Option B**: Lazy/computed aggregates

```vague
schema Customer {
  id: unique int,
  total_spent: aggregate sum(invoices.amount) where invoices.customer_id == id
}
```

**Priority**: Low - `then` blocks handle most cases

---

## 9. Named Distributions

### The Problem
Complex distributions must be repeated or use `let` bindings:

```vague
// Current:
let ageDistribution = 0.15: int in 18..24 | 0.25: int in 25..34 | 0.35: int in 35..44 | 0.25: int in 45..65

schema Person {
  age: ageDistribution
}
```

This works, but lacks semantic meaning and can't express continuous distributions naturally.

### Proposal (from TODO.md)

```vague
distribution AgeStructure {
  18..24: 15%,
  25..34: 25%,
  35..44: 35%,
  45..65: 25%
}

schema Person {
  age: ~AgeStructure  // Sample from distribution
}
```

**Priority**: Medium - improves readability for complex distributions

---

## 10. Else-If Chains in Field Definitions

### The Problem
Nested ternaries are hard to read:

```vague
// Current - hard to read:
grade: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F"
```

### Current Workaround
Use `match` expression (already supported):

```vague
grade: match true {
  score >= 90 => "A",
  score >= 80 => "B",
  score >= 70 => "C",
  score >= 60 => "D",
  _ => "F"
}
```

But `match true` is awkward - it's matching against a boolean, not the actual value.

### Proposal
Extend `match` to support guard clauses:

```vague
grade: match score {
  >= 90 => "A",
  >= 80 => "B",
  >= 70 => "C",
  >= 60 => "D",
  _ => "F"
}
```

Or add `cond` expression (Lisp-style):

```vague
grade: cond {
  score >= 90 => "A",
  score >= 80 => "B",
  score >= 70 => "C",
  score >= 60 => "D",
  else => "F"
}
```

**Priority**: Medium - `match true` works but is clunky

---

## Summary

| Gap | Priority | Workaround Exists? | Proposal |
|-----|----------|-------------------|----------|
| Conditional field values | High | Partial (refine) | `if/then/else` expression |
| String interpolation | Medium | Yes (concat) | Template literals |
| Temporal relationships | Low | Yes (date arithmetic) | Sugar syntax |
| Composite uniqueness | Medium | No | `unique(field1, field2)` |
| Dependent distributions | High | Partial (refine) | Conditional probability |
| Recursive structures | Medium | No (manual) | `max depth N` modifier |
| Negative constraints | Low | Yes (assume not) | `exclude` keyword |
| Cross-dataset aggregations | Low | Yes (then blocks) | Cross-reference syntax |
| Named distributions | Medium | Partial (let) | `distribution` keyword |
| Else-if chains | Medium | Yes (match true) | Guard clause match |
