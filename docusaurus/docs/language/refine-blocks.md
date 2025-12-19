---
sidebar_position: 9
title: Refine Blocks
---

# Refine Blocks

Refine blocks allow conditional field overrides based on other field values. They're useful for creating variant-specific constraints without duplicating schemas.

## Basic Syntax

Use `refine { }` after a schema to define conditional overrides:

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

After initial generation:
- If `position == "GK"`, `goals` is regenerated with range 0..2
- If `position == "FWD"`, `clean_sheets` is regenerated with range 0..3

## How It Works

1. All fields are generated normally
2. Each `if` condition is evaluated
3. If true, the specified fields are regenerated with new constraints
4. Multiple conditions can match and apply sequentially

## Multiple Conditions

```vague
schema Employee {
  department: "engineering" | "sales" | "marketing",
  level: "junior" | "senior" | "lead",
  salary: int in 30000..200000
} refine {
  if department == "engineering" {
    salary: int in 50000..200000
  },
  if department == "sales" {
    salary: int in 40000..150000
  },
  if level == "junior" {
    salary: int in 30000..60000
  },
  if level == "lead" {
    salary: int in 100000..200000
  }
}
```

Note: If both conditions match (e.g., junior engineer), both refinements apply in order.

## Refine vs Constraints

| Feature | `assume` Constraints | `refine` Blocks |
|---------|---------------------|-----------------|
| When applied | During generation | After generation |
| Failure mode | Retry (rejection sampling) | Override value |
| Use case | Hard constraints | Variant-specific ranges |

```vague
// Using assume: might need many retries
schema Player {
  position: "GK" | "FWD",
  goals: int in 0..30,
  assume if position == "GK" { goals <= 2 }
}

// Using refine: guaranteed to satisfy
schema Player {
  position: "GK" | "FWD",
  goals: int in 0..30
} refine {
  if position == "GK" { goals: int in 0..2 }
}
```

## Practical Examples

### Product Pricing Tiers

```vague
schema Product {
  category: "electronics" | "clothing" | "food",
  tier: "budget" | "standard" | "premium",
  price: decimal in 1..1000
} refine {
  if category == "electronics" {
    price: decimal in 50..2000
  },
  if category == "food" {
    price: decimal in 1..50
  },
  if tier == "budget" {
    price: decimal in 1..30
  },
  if tier == "premium" {
    price: decimal in 200..2000
  }
}
```

### Vehicle Specifications

```vague
schema Vehicle {
  type: "sedan" | "suv" | "truck" | "motorcycle",
  doors: int in 2..5,
  seats: int in 1..8,
  cargo_capacity: int in 100..2000
} refine {
  if type == "motorcycle" {
    doors: int in 0..0,
    seats: int in 1..2,
    cargo_capacity: int in 0..50
  },
  if type == "truck" {
    doors: int in 2..4,
    cargo_capacity: int in 500..2000
  },
  if type == "sedan" {
    doors: int in 4..4,
    seats: int in 4..5
  }
}
```

### User Permissions

```vague
schema User {
  role: "guest" | "member" | "admin",
  can_read: boolean,
  can_write: boolean,
  can_delete: boolean,
  can_admin: boolean
} refine {
  if role == "guest" {
    can_read: true,
    can_write: false,
    can_delete: false,
    can_admin: false
  },
  if role == "member" {
    can_read: true,
    can_write: true,
    can_delete: false,
    can_admin: false
  },
  if role == "admin" {
    can_read: true,
    can_write: true,
    can_delete: true,
    can_admin: true
  }
}
```

## Combining with Other Features

### With Computed Fields

```vague
schema Order {
  type: "retail" | "wholesale",
  quantity: int in 1..100,
  unit_price: decimal in 10..100
} refine {
  if type == "wholesale" {
    quantity: int in 50..500,
    unit_price: decimal in 5..50
  }
}

// Computed fields use refined values
schema OrderWithTotal {
  type: "retail" | "wholesale",
  quantity: int in 1..100,
  unit_price: decimal in 10..100,
  total: quantity * unit_price
} refine {
  if type == "wholesale" {
    quantity: int in 50..500,
    unit_price: decimal in 5..50
  }
}
```

Note: Computed fields are recalculated after refinement.
