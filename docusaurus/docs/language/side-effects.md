---
sidebar_position: 8
title: Side Effects
---

# Side Effects (then blocks)

Side effects allow a schema to modify other records after generation. This is useful for maintaining consistency across related records.

## Basic Syntax

Use `then { }` after a schema to define mutations:

```vague
schema Payment {
  invoice: any of invoices,
  amount: int in 50..500
} then {
  invoice.amount_paid += amount
}
```

When a `Payment` is generated:
1. An invoice is selected
2. A payment amount is generated
3. The invoice's `amount_paid` is increased by the payment amount

## Assignment Operators

| Operator | Description |
|----------|-------------|
| `=` | Direct assignment |
| `+=` | Add to existing value |

```vague
schema Payment {
  invoice: any of invoices,
  amount: int in 50..500
} then {
  invoice.amount_paid += amount,
  invoice.last_payment_at = now(),
  invoice.payment_count += 1
}
```

## Conditional Updates

Use ternary expressions for conditional values:

```vague
schema Payment {
  invoice: any of invoices,
  amount: int in 50..500
} then {
  invoice.amount_paid += amount,
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partial"
}
```

## Multiple Mutations

Separate mutations with commas:

```vague
schema StockMovement {
  product: any of products,
  quantity: int in 1..100,
  type: "in" | "out"
} then {
  product.stock += type == "in" ? quantity : -quantity,
  product.last_movement_at = now(),
  product.movement_count += 1
}
```

## Order of Operations

Side effects are applied after each record is generated:

```vague
dataset Data {
  invoices: 100 of Invoice,   // All invoices generated first
  payments: 50 of Payment     // Each payment updates an invoice
}
```

This means:
1. 100 invoices are generated with initial `amount_paid = 0`
2. 50 payments are generated, each updating an invoice

## Practical Examples

### Invoice Payments

```vague
schema Invoice {
  id: uuid(),
  total: decimal in 100..1000,
  amount_paid: decimal in 0..0,  // Starts at 0
  status: "pending"
}

schema Payment {
  invoice: any of invoices where .status != "paid",
  amount: decimal in 10..200
} then {
  invoice.amount_paid += amount,
  invoice.status = invoice.amount_paid >= invoice.total ? "paid" : "partial"
}

dataset Payments {
  invoices: 50 of Invoice,
  payments: 100 of Payment
}
```

### Inventory Management

```vague
schema Product {
  id: uuid(),
  name: faker.commerce.productName(),
  stock: int in 50..200,
  reserved: int in 0..0
}

schema Order {
  product: any of products where .stock - .reserved > 0,
  quantity: int in 1..5
} then {
  product.reserved += quantity
}

schema Shipment {
  order: any of orders,
  shipped_quantity: order.quantity
} then {
  order.product.stock -= shipped_quantity,
  order.product.reserved -= shipped_quantity
}

dataset Inventory {
  products: 20 of Product,
  orders: 50 of Order,
  shipments: 30 of Shipment
}
```

### User Engagement

```vague
schema User {
  id: uuid(),
  name: fullName(),
  post_count: int in 0..0,
  last_active_at: datetime(2024, 2024)
}

schema Post {
  author: any of users,
  content: sentence(),
  created_at: now()
} then {
  author.post_count += 1,
  author.last_active_at = created_at
}

dataset Social {
  users: 100 of User,
  posts: 500 of Post
}
```

## Limitations

1. **No cascading** — Side effects don't trigger other side effects
2. **Same dataset only** — Can only modify records in the same dataset
3. **Simple expressions** — Complex logic should use computed fields instead
4. **Order matters** — Collections are processed in dataset order
