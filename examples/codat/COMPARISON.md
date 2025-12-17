# Vague vs Faker/Synth: A Comparison

This document compares two approaches to generating the same test dataset for the Codat Lending API:

1. **Vague** (`lending-test-data.vague`) - 177 lines
2. **Faker.js/TypeScript** (`lending-test-data-faker.ts`) - 340 lines

## Side-by-Side Examples

### Defining a Simple Schema

**Vague:**
```vague
schema Customer {
  id: uuid(),
  customerName: companyName(),
  contactName: fullName(),
  emailAddress: email(),
  phone: phone(),
  status: 0.85: "Active" | 0.15: "Archived",
  defaultCurrency: 0.6: "GBP" | 0.25: "USD" | 0.1: "EUR" | 0.05: "AUD"
}
```

**Faker.js:**
```typescript
interface Customer {
  id: string;
  customerName: string;
  contactName: string;
  emailAddress: string;
  phone: string;
  status: "Active" | "Archived";
  defaultCurrency: "GBP" | "USD" | "EUR" | "AUD";
}

function generateCustomer(): Customer {
  return {
    id: faker.string.uuid(),
    customerName: faker.company.name(),
    contactName: faker.person.fullName(),
    emailAddress: faker.internet.email(),
    phone: faker.phone.number(),
    status: weightedChoice([
      { value: "Active" as const, weight: 0.85 },
      { value: "Archived" as const, weight: 0.15 },
    ]),
    defaultCurrency: weightedChoice([
      { value: "GBP" as const, weight: 0.6 },
      { value: "USD" as const, weight: 0.25 },
      { value: "EUR" as const, weight: 0.1 },
      { value: "AUD" as const, weight: 0.05 },
    ]),
  };
}
```

### Computed Fields

**Vague:**
```vague
schema InvoiceLineItem {
  quantity: int in 1..100,
  unitAmount: decimal in 10..5000,
  taxAmount: unitAmount * 0.2,
  totalAmount: unitAmount * quantity
}
```

**Faker.js:**
```typescript
function generateInvoiceLineItem(): InvoiceLineItem {
  const quantity = randomInt(1, 100);
  const unitAmount = randomDecimal(10, 5000);
  const taxAmount = Math.round(unitAmount * 0.2 * 100) / 100;
  const totalAmount = Math.round(unitAmount * quantity * 100) / 100;
  return { quantity, unitAmount, taxAmount, totalAmount };
}
```

### Constraints

**Vague:**
```vague
schema Invoice {
  issueDate: int in 1..28,
  dueDate: int in 1..90,
  status: 0.4: "Paid" | 0.3: "Submitted" | ...,
  amountDue: int in 0..10000,

  assume dueDate >= issueDate,
  assume if status == "Paid" { amountDue == 0 },
  assume if status == "Draft" { amountDue == totalAmount }
}
```

**Faker.js:**
```typescript
function generateInvoice(): Invoice {
  const issueDate = randomInt(1, 28);
  const dueDate = randomInt(issueDate, 90); // Manual constraint
  const status = weightedChoice([...]);

  // Manual constraint logic
  let amountDue: number;
  if (status === "Paid") {
    amountDue = 0;
  } else if (status === "Draft") {
    amountDue = Math.round(totalAmount * 100) / 100;
  } else {
    amountDue = randomInt(0, 10000);
  }
  // ...
}
```

### Cross-Record References

**Vague:**
```vague
schema Invoice {
  customerRef: any of customers
}
```

**Faker.js:**
```typescript
// Must generate customers first, extract IDs, pass to invoice generator
const customers = times(100, generateCustomer);
const customerIds = customers.map((c) => c.id);
const invoices = times(500, () => generateInvoice(customerIds));

function generateInvoice(customerIds: string[]): Invoice {
  return {
    customerRef: faker.helpers.arrayElement(customerIds),
    // ...
  };
}
```

---

## Comparison Summary

| Aspect | Vague | Faker.js/TypeScript |
|--------|-------|---------------------|
| **Lines of code** | 177 | 340 |
| **Type definitions** | Implicit | Explicit (required) |
| **Weighted choices** | `0.6: "A" \| 0.4: "B"` | Custom utility function |
| **Ranges** | `int in 1..100` | `randomInt(1, 100)` |
| **Computed fields** | `= sum(items.amount)` | Manual calculation |
| **Constraints** | Declarative `assume` | Imperative if/else |
| **Cross-references** | `any of collection` | Manual ID threading |
| **Aggregations** | Built-in `sum/avg/count` | Manual reduce() |
| **Optional fields** | `field?` | `maybe(() => ...)` |

---

## Pros and Cons

### Vague

**Pros:**
- **Concise** - ~50% less code for equivalent functionality
- **Declarative** - Describes *what* data looks like, not *how* to generate it
- **Constraints as first-class** - `assume` statements are readable and co-located with fields
- **No type boilerplate** - Schema IS the type definition
- **Built-in aggregations** - `sum()`, `avg()`, `count()`, `min()`, `max()` work naturally
- **Cross-references are trivial** - `any of collection` handles all the wiring
- **Weighted choices readable** - `0.7: "A" | 0.3: "B"` is immediately clear
- **Domain-focused** - Closer to how you'd describe data in a spec document
- **Schema validation** - Can validate output against OpenAPI specs

**Cons:**
- **New language to learn** - Team members need to learn vague syntax
- **Limited ecosystem** - Fewer integrations than mature JS tooling
- **Less flexible** - Complex custom logic harder to express:
  - Conditional schema variants (e.g., "if type is 'business', add companyNumber field")
  - Dynamic cardinality based on other fields (e.g., "premium users get 5-10 items, free users get 1-2")
  - Complex date arithmetic (e.g., "createdAt is 1-30 days before updatedAt, which is 0-7 days before now")
  - Transformations (e.g., "slug is kebab-case of title")
  - Stateful generation (e.g., "invoice numbers must be sequential across the dataset")
- **Debugging** - Errors may be harder to trace than in familiar JS
- **IDE support** - Less mature tooling (though VSCode extension exists)
- **No conditional generation** - Can't easily do "if X, generate differently"

### Faker.js/TypeScript

**Pros:**
- **Familiar** - Most developers know JavaScript/TypeScript
- **Full language power** - Any logic expressible in JS works
- **Type safety** - TypeScript catches errors at compile time
- **Rich ecosystem** - Integrates with test frameworks, CI, etc.
- **Debugging** - Standard JS debugging tools work
- **IDE support** - Full autocomplete, refactoring, etc.
- **Extensible** - Easy to add custom generators, transformations
- **Portable** - Output can feed into any system

**Cons:**
- **Verbose** - Type definitions + generator functions = 2x code
- **Imperative constraints** - Business rules scattered in if/else blocks
- **Manual wiring** - Cross-references require explicit ID management
- **Repetitive patterns** - Weighted choice, ranges, etc. need utility functions
- **Easy to forget constraints** - Nothing enforces that "Paid" means amountDue=0
- **Computed fields manual** - Must remember to calculate aggregates correctly
- **Type/generator drift** - Interface and generator can get out of sync

---

## When to Use Each

### Use Vague when:
- Generating test data that matches a specification
- Data has complex inter-record relationships
- Constraints are important (business rules, referential integrity)
- Team is comfortable learning a DSL
- You want schema validation against OpenAPI
- Rapid iteration on data shape is needed

### Use Faker.js when:
- Complex conditional generation logic is needed
- Integrating with existing TypeScript codebases
- Team prefers staying in familiar JS ecosystem
- Custom transformations or post-processing required
- Need fine-grained control over generation order
- Building generators that will be heavily unit-tested

---

## Hybrid Approach

These tools aren't mutually exclusive. Consider:

1. **Vague for schema definition** - Define the shape and constraints
2. **Export to JSON** - Use vague's CLI to generate data
3. **Post-process in JS** - Apply complex transformations if needed

```bash
# Generate base data with vague
node dist/cli.js lending-test-data.vague > data.json

# Post-process if needed (e.g., add timestamps, transform for specific test)
node post-process.js data.json > final-data.json
```

---

## Conclusion

Vague excels at **declarative data modeling** where relationships and constraints matter. The lending example shows this clearly: constraints like "due date must be after issue date" and "paid invoices have zero amount due" are expressed directly in the schema, not buried in generator logic.

Faker.js excels at **flexible, programmable generation** where you need full control. If your test data needs complex conditional logic, integration with test frameworks, or custom transformations, the full power of TypeScript is valuable.

For domain-specific test data generation (like financial/accounting data with business rules), vague's declarative approach reduces errors and makes the data specification self-documenting.
