# Codat Lending API

Test data generation for SMB lending scenarios using Codat's accounting data models.

## What It Models

- **Companies** with data connections to accounting platforms
- **Customers & Suppliers** (debtors and creditors)
- **Invoices** with line items and computed totals (accounts receivable)
- **Bills** with line items (accounts payable)
- **Payments** that update invoice/bill status via `then` blocks
- **Accounts** (chart of accounts)
- **Aged Receivables** summaries with health indicators

## Key Features Demonstrated

### OpenAPI Schema Import
Import types from Codat's OpenAPI spec:
```vague
import codat from "Codat-Lending.json"

schema Invoice from codat.AccountingInvoice {
  id: unique uuid(),
  invoiceNumber: sequence("INV-", 1001),
  // Override and extend fields
}
```

### Date Arithmetic
Calculate due dates relative to issue dates:
```vague
schema Invoice {
  issueDate: date in 2023..2024,
  dueDate: issueDate + date.days(30),  // 30 days after issue

  assume dueDate >= issueDate
}
```

### Decimal Precision
Use `decimal(N)` for precise financial amounts:
```vague
unitAmount: decimal(2) in 10..5000,     // e.g., 1234.56
taxAmount: round(unitAmount * 0.2, 2)
```

### Conditional Fields
Fields that only appear based on conditions:
```vague
schema Account {
  isBankAccount: 0.2: true | 0.8: false,

  // Only bank accounts have these fields
  bankName: string when isBankAccount == true,
  accountNumber: string when isBankAccount == true,
  sortCode: string when isBankAccount == true
}

schema Payment {
  paymentMethod: 0.6: "BankTransfer" | 0.3: "Card" | 0.1: "Cash",

  // Payment method-specific fields
  cardLast4: string when paymentMethod == "Card",
  bankReference: string when paymentMethod == "BankTransfer"
}
```

### Private Fields
Internal calculations excluded from output:
```vague
schema Company {
  // Private field for internal scoring (not in output)
  _connectionScore: private int in 0..100,
  riskRating: _connectionScore >= 80 ? "Low" : _connectionScore >= 50 ? "Medium" : "High"
}
```

### Payment Side Effects
Payments mutate the referenced invoice using `then` blocks:
```vague
schema Payment {
  invoice: any of invoices where not (.status == "Paid" or .status == "Void"),
  amount: decimal(2) in 100..5000,
  assume amount <= invoice.amountDue
} then {
  invoice.amountDue = invoice.amountDue - amount,
  invoice.status = invoice.amountDue <= 0 ? "Paid" : "PartiallyPaid"
}
```

### Filtered Cross-References
Only reference active customers/suppliers:
```vague
customerRef: any of customers where .status == "Active"
```

### Computed Fields with Rounding
```vague
taxAmount: round(unitAmount * 0.2, 2),
totalAmount: round(sum(lineItems.totalAmount), 2)
```

### Dataset-Level Validation for Lending
Ensure the generated data represents a healthy business:
```vague
validate {
  sum(invoices.totalAmount) >= 100000,
  sum(bills.totalAmount) <= sum(invoices.totalAmount) * 1.5,
  some(invoices, .status == "Paid"),
  all(invoices, .amountDue >= 0),
  some(companies, .riskRating == "Low")
}
```

### Realistic Multi-Currency Support
```vague
currency: 0.6: "GBP" | 0.25: "USD" | 0.1: "EUR" | 0.05: "AUD"
```

## Running

```bash
cd examples/codat
node ../../dist/cli.js lending-test-data.vague -p

# With deterministic output
node ../../dist/cli.js lending-test-data.vague --seed 42
```

## Files

- `Codat-Lending.json` - Codat's OpenAPI specification
- `lending-test-data.vague` - Vague schema definitions
