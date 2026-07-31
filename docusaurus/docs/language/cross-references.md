---
sidebar_position: 5
title: Cross-References
---

# Cross-References

Vague allows records to reference other records in the dataset, creating realistic relational data.

## Basic References

Use `any of` to reference a random item from a collection:

```vague
schema Customer {
  id: uuid(),
  name: fullName()
}

schema Invoice {
  customer: any of customers  // References a customer
}

dataset Data {
  customers: 50 of Customer,
  invoices: 200 of Invoice
}
```

Each invoice gets a random customer from the `customers` collection.

## Filtered References

Add `where` to filter which records can be referenced:

```vague
schema Invoice {
  // Only reference active customers
  customer: any of customers where .status == "active"
}
```

The `.` prefix refers to fields on the candidate record being tested.

### Multiple Conditions

Combine conditions with `and` and `or`:

```vague
schema Payment {
  // Only unpaid invoices with positive balance
  invoice: any of invoices where .status != "paid" and .balance > 0
}

schema Assignment {
  // Active OR premium users
  user: any of users where .active == true or .tier == "premium"
}
```

## Parent References

Use `^` to reference fields from the parent schema (for nested collections):

```vague
schema LineItem {
  currency: ^base_currency,  // Inherits from parent Invoice
  amount: decimal in 10..500
}

schema Invoice {
  base_currency: "USD" | "EUR" | "GBP",
  line_items: 1..5 of LineItem
}
```

All line items in an invoice share the invoice's `base_currency`.

### Deep Parent References

Parent references work at any nesting level:

```vague
schema Product {
  sku: ^product_sku  // From grandparent Order
}

schema LineItem {
  products: 1..3 of Product
}

schema Order {
  product_sku: string,
  items: 1..5 of LineItem
}
```

## Reference Values

References resolve to the full record object. Access fields with dot notation:

```vague
schema Payment {
  invoice: any of invoices,

  // Access invoice fields
  invoice_id: invoice.id,
  original_amount: invoice.total
}
```

## Circular References

Be careful with circular dependencies. Vague processes schemas in dataset order:

```vague
// Works: customers exist before invoices
dataset Data {
  customers: 50 of Customer,
  invoices: 200 of Invoice  // Can reference customers
}

// Fails: invoices referenced before they exist
dataset Bad {
  payments: 100 of Payment,  // Tries to reference invoices
  invoices: 200 of Invoice   // But invoices don't exist yet!
}
```

## Empty Collection Handling

If a `where` clause matches no records, generation fails. Ensure your filters can always find matches:

```vague
schema Payment {
  // Risky: what if no invoices are pending?
  invoice: any of invoices where .status == "pending"
}
```

Solutions:
1. Ensure the dataset has enough matching records
2. Use broader filters
3. Generate dependent records in the right order

## Practical Example

```vague
schema Department {
  id: uuid(),
  name: "Engineering" | "Sales" | "Marketing" | "HR"
}

schema Employee {
  id: uuid(),
  name: fullName(),
  department: any of departments,
  manager: any of employees where .department.name == department.name
}

schema Project {
  id: uuid(),
  name: faker.company.buzzPhrase(),
  lead: any of employees where .department.name == "Engineering",
  members: 2..5 of ProjectMember
}

schema ProjectMember {
  employee: any of employees,
  role: "developer" | "designer" | "analyst"
}

dataset Company {
  departments: 4 of Department,
  employees: 50 of Employee,
  projects: 10 of Project
}
```
