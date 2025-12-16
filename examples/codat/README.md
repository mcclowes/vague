# Codat Lending API

Test data generation for SMB lending scenarios using Codat's accounting data models.

## What It Models

- **Companies** with data connections to accounting platforms
- **Customers & Suppliers** (debtors and creditors)
- **Invoices** with line items and computed totals (accounts receivable)
- **Bills** with line items (accounts payable)
- **Payments** that update invoice/bill status
- **Accounts** (chart of accounts)

## Key Lessons

### OpenAPI Schema Import
Import types from Codat's OpenAPI spec:
```vague
import codat from "Codat-Lending.json"

schema Invoice from codat.AccountingInvoice {
  // Override and extend fields
}
```

### Payment Side Effects
Payments mutate the referenced invoice:
```vague
schema Payment {
  invoice: any of invoices where .status != "Paid",
  amount: int in 100..5000,
  assume amount <= invoice.amountDue
} then {
  invoice.amountDue -= amount,
  invoice.status = invoice.amountDue <= 0 ? "Paid" : "PartiallyPaid"
}
```

### Dataset-Level Validation for Lending
Ensure the generated data represents a healthy business:
```vague
validate {
  sum(invoices.totalAmount) >= 100000,
  sum(bills.totalAmount) <= sum(invoices.totalAmount) * 1.5,
  some(invoices, .status == "Paid"),
  all(invoices, .amountDue >= 0)
}
```

### Realistic Multi-Currency Support
```vague
currency: 0.6: "GBP" | 0.25: "USD" | 0.1: "EUR" | 0.05: "AUD"
```

## Running

```bash
node dist/cli.js examples/codat/lending-test-data.vague -p
```

## Files

- `Codat-Lending.json` - Codat's OpenAPI specification
- `lending-test-data.vague` - Vague schema definitions
