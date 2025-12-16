# Stripe Payments API

Comprehensive test data generation for Stripe's payment platform.

## What It Models

- **Customers** with payment methods and addresses
- **Products & Prices** with subscription pricing models
- **Subscriptions** with items and billing cycles
- **Invoices** with line items and computed totals
- **Payment Intents & Charges** with status workflows
- **Refunds & Disputes** with side effects

## Key Lessons

### Realistic Payment Flows
Uses weighted superposition to model real-world status distributions:
```vague
status: 0.85: "succeeded" | 0.1: "pending" | 0.05: "failed"
```

### Side Effects for Mutations
Refunds update the parent charge:
```vague
schema Refund {
  charge: any of charges where .status == "succeeded",
  amount: int in 100..50000
} then {
  charge.amount_refunded += amount,
  charge.refunded = charge.amount_refunded >= charge.amount_captured ? true : false
}
```

### Filtered References
Only valid targets can be selected:
```vague
invoice: any of invoices where .status == "open"
```

### Computed Fields with Arithmetic
```vague
tax: = subtotal * 0.1,
total: = subtotal + tax
```

## Running

```bash
node dist/cli.js examples/stripe/payments.vague -p
```

**Note:** This example uses faker shorthand functions that require the faker plugin.
