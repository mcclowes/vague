---
sidebar_position: 6
title: Dataset Validation
---

# Dataset Validation

Dataset validation allows you to define constraints that apply across entire collections, ensuring aggregate properties are met.

## Validate Block

Add a `validate` block to a dataset:

```vague
schema Invoice {
  amount: decimal in 100..10000,
  status: "pending" | "paid"
}

dataset TestData {
  invoices: 100 of Invoice,

  validate {
    sum(invoices.amount) >= 100000,
    sum(invoices.amount) <= 500000
  }
}
```

Vague will regenerate the dataset until all validation rules pass.

## Aggregate Constraints

### Sum Constraints

```vague
dataset Financial {
  transactions: 100 of Transaction,

  validate {
    sum(transactions.amount) >= 50000,
    sum(transactions.credits) == sum(transactions.debits)
  }
}
```

### Count Constraints

```vague
dataset Orders {
  orders: 100 of Order,
  payments: 50 of Payment,

  validate {
    count(payments) <= count(orders)
  }
}
```

## Collection Predicates

### all()

Every item must satisfy the condition:

```vague
dataset Inventory {
  products: 100 of Product,

  validate {
    all(products, .stock >= 0),
    all(products, .price > 0)
  }
}
```

### some()

At least one item must satisfy the condition:

```vague
dataset Sales {
  invoices: 100 of Invoice,

  validate {
    some(invoices, .status == "paid"),
    some(invoices, .amount > 1000)
  }
}
```

### none()

No items should satisfy the condition:

```vague
dataset Clean {
  records: 100 of Record,

  validate {
    none(records, .deleted == true),
    none(records, .amount < 0)
  }
}
```

## Practical Examples

### Financial Reconciliation

```vague
schema Transaction {
  type: "credit" | "debit",
  amount: decimal in 10..1000
}

dataset Ledger {
  transactions: 200 of Transaction,

  validate {
    // Credits should roughly balance debits
    sum(transactions where .type == "credit", .amount) >=
      sum(transactions where .type == "debit", .amount) * 0.9,

    // At least some of each type
    some(transactions, .type == "credit"),
    some(transactions, .type == "debit")
  }
}
```

### E-commerce Orders

```vague
schema Order {
  id: uuid(),
  total: decimal in 10..500,
  status: "pending" | "shipped" | "delivered"
}

schema Shipment {
  order: any of orders where .status == "shipped" or .status == "delivered",
  shipped_at: datetime(2024, 2024)
}

dataset Store {
  orders: 100 of Order,
  shipments: 50 of Shipment,

  validate {
    // Can't ship more than ordered
    count(shipments) <= count(orders),

    // At least 30% fulfilled
    count(shipments) >= count(orders) * 0.3,

    // All shipped orders have positive total
    all(orders where .status == "shipped", .total > 0)
  }
}
```

### User Activity

```vague
schema User {
  id: uuid(),
  created_at: datetime(2023, 2024),
  post_count: int in 0..100,
  is_active: boolean
}

dataset Community {
  users: 1000 of User,

  validate {
    // Majority are active
    count(users where .is_active == true) > count(users) * 0.6,

    // Active users have posted
    all(users where .is_active == true and .post_count == 0, false),

    // Some power users
    some(users, .post_count > 50)
  }
}
```

### Inventory Management

```vague
schema Product {
  sku: unique regex("[A-Z]{3}-[0-9]{4}"),
  stock: int in 0..1000,
  reorder_point: int in 10..100,
  price: decimal in 9.99..999.99
}

dataset Warehouse {
  products: 200 of Product,

  validate {
    // Total inventory value
    sum(products, .stock * .price) >= 100000,
    sum(products, .stock * .price) <= 1000000,

    // Some products need reordering
    some(products, .stock < .reorder_point),

    // But not all
    none(products, .stock == 0) or some(products, .stock > 0)
  }
}
```

## Validation Failure

If validation can't be satisfied after max retries, generation fails with an error. To avoid this:

1. **Use achievable constraints** — Ensure validation rules are statistically likely
2. **Widen ranges** — Give enough room for aggregate targets
3. **Reduce interdependencies** — Avoid circular validation logic

## How It Works

1. Vague generates all collections in the dataset
2. Validation rules are evaluated
3. If any rule fails, the entire dataset is regenerated
4. Process repeats until success or max retries

This is "dataset-level rejection sampling" — more expensive than field-level constraints but powerful for aggregate properties.

## Best Practices

1. **Keep rules achievable** — Statistically likely to pass
2. **Use percentages** — More flexible than exact counts
3. **Test incrementally** — Add one validation rule at a time
4. **Monitor retries** — High retry counts indicate tight constraints

## See Also

- [Constraints](/docs/language/constraints) for record-level validation
- [Negative Testing](/docs/advanced/negative-testing) for constraint violation
