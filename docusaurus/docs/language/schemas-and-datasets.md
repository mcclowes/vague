---
sidebar_position: 1
title: Schemas and Datasets
---

# Schemas and Datasets

Vague organizes data into **schemas** (the shape of individual records) and **datasets** (collections of records to generate).

## Schemas

A schema defines the structure of a record with typed fields:

```vague
schema Customer {
  id: uuid(),
  name: string,
  email: email(),
  created_at: datetime(2020, 2024)
}
```

Each field has a name and a type expression. Fields are separated by commas.

## Datasets

A dataset specifies which schemas to generate and how many:

```vague
dataset TestData {
  customers: 50 of Customer,
  invoices: 200 of Invoice,
  payments: 100 of Payment
}
```

The `of` keyword specifies the cardinality (count) of records to generate.

### Dynamic Cardinality

Use a range for variable collection sizes:

```vague
dataset TestData {
  customers: 10..20 of Customer,  // 10 to 20 customers
  invoices: 100 of Invoice        // Exactly 100 invoices
}
```

### Conditional Cardinality

Use ternary expressions for dynamic sizing:

```vague
schema Order {
  size: "small" | "large",
  items: (size == "large" ? 5..10 : 1..3) of LineItem
}
```

## Nested Collections

Schemas can contain nested collections:

```vague
schema Invoice {
  id: uuid(),
  line_items: 1..10 of LineItem,
  notes: 0..3 of Note
}

schema LineItem {
  product: string,
  quantity: int in 1..10,
  price: decimal in 9.99..199.99
}

schema Note {
  text: sentence(),
  created_at: now()
}
```

## Field Order

Fields are generated in order:
1. Simple fields (primitives, references)
2. Nested collections
3. Computed fields (that depend on other fields)

This allows computed fields to reference previously generated values:

```vague
schema Invoice {
  subtotal: decimal in 100..1000,
  tax_rate: 0.1 | 0.2,
  tax: subtotal * tax_rate,         // Uses subtotal and tax_rate
  total: subtotal + tax              // Uses subtotal and tax
}
```

## Multiple Schemas

A single `.vague` file can contain multiple schemas:

```vague
schema Customer {
  id: uuid(),
  name: fullName()
}

schema Product {
  id: uuid(),
  name: faker.commerce.productName(),
  price: decimal in 9.99..999.99
}

schema Order {
  customer: any of customers,
  products: 1..5 of OrderItem
}

schema OrderItem {
  product: any of products,
  quantity: int in 1..5
}

dataset ECommerce {
  customers: 100 of Customer,
  products: 50 of Product,
  orders: 200 of Order
}
```

## Comments

Use `//` for single-line comments:

```vague
schema Invoice {
  // Unique identifier
  id: uuid(),

  // Customer reference
  customer: any of customers,

  // Financial fields
  amount: decimal in 100..10000  // Total invoice amount
}
```
