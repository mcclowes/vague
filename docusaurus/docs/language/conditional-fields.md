---
sidebar_position: 7
title: Conditional Fields
---

# Conditional Fields

Conditional fields only appear in the output when their condition is met.

## Basic Syntax

Use `when` to make a field conditional:

```vague
schema Account {
  type: "personal" | "business",

  // Only exists for business accounts
  company_number: string when type == "business",
  tax_id: string when type == "business"
}
```

Output for `type == "personal"`:
```json
{ "type": "personal" }
```

Output for `type == "business"`:
```json
{
  "type": "business",
  "company_number": "12345678",
  "tax_id": "GB123456789"
}
```

## Complex Conditions

Use logical operators in conditions:

```vague
schema Order {
  status: "pending" | "shipped" | "delivered",
  is_expedited: boolean,

  // Only for shipped/delivered orders
  tracking_number: string when status == "shipped" or status == "delivered",

  // Only for expedited shipped orders
  priority_label: string when is_expedited and status == "shipped"
}
```

## With References

Conditions can reference other records:

```vague
schema Invoice {
  customer: any of customers,

  // Only if customer is a business
  purchase_order: string when customer.type == "business"
}
```

## Conditional Collections

Apply conditions to nested collections:

```vague
schema Order {
  type: "standard" | "subscription",

  // Only subscription orders have renewal info
  renewals: 1..3 of Renewal when type == "subscription"
}
```

## Practical Examples

### User Profiles

```vague
schema User {
  type: "individual" | "organization",
  name: fullName(),

  // Individual-only fields
  date_of_birth: date in 1950..2005 when type == "individual",

  // Organization-only fields
  org_name: companyName() when type == "organization",
  org_size: int in 1..10000 when type == "organization",
  tax_exempt: boolean when type == "organization"
}
```

### Payment Methods

```vague
schema PaymentMethod {
  type: "card" | "bank" | "wallet",

  // Card-specific
  card_last4: regex("[0-9]{4}") when type == "card",
  card_brand: "visa" | "mastercard" | "amex" when type == "card",

  // Bank-specific
  bank_name: faker.company.name() when type == "bank",
  account_type: "checking" | "savings" when type == "bank",

  // Wallet-specific
  wallet_provider: "paypal" | "venmo" | "apple_pay" when type == "wallet"
}
```

### Shipping Information

```vague
schema Order {
  requires_shipping: boolean,
  status: "pending" | "processing" | "shipped" | "delivered",

  // Only for orders requiring shipping
  shipping_address: any of addresses when requires_shipping,
  shipping_method: "standard" | "express" | "overnight" when requires_shipping,

  // Only when shipped
  shipped_at: datetime(2024, 2024) when status == "shipped" or status == "delivered",
  tracking_url: faker.internet.url() when status == "shipped" or status == "delivered",

  // Only when delivered
  delivered_at: datetime(2024, 2024) when status == "delivered",
  signature: fullName() when status == "delivered"
}
```

## Combining with Other Features

### With Computed Fields

```vague
schema Invoice {
  type: "standard" | "credit",
  amount: decimal in 100..1000,

  // Credit notes have negative amounts
  adjusted_amount: amount * -1 when type == "credit"
}
```

### With Constraints

```vague
schema Account {
  type: "free" | "premium",
  storage_gb: int in 1..100 when type == "premium",

  // Constraint only applies when field exists
  assume if type == "premium" { storage_gb >= 10 }
}
```
