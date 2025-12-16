/**
 * Codat Lending API - Test Data Generation
 * Equivalent implementation using Faker.js + Synth-style approach
 *
 * This generates the same test data as lending-test-data.vague
 * for comparison purposes.
 */

import { faker } from "@faker-js/faker";

// --- Type Definitions ---

interface Customer {
  id: string;
  customerName: string;
  contactName: string;
  emailAddress: string;
  phone: string;
  status: "Active" | "Archived";
  defaultCurrency: "GBP" | "USD" | "EUR" | "AUD";
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerRef: string;
  issueDate: number;
  dueDate: number;
  currency: "GBP" | "USD" | "EUR" | "AUD";
  lineItems: InvoiceLineItem[];
  subTotal: number;
  totalTaxAmount: number;
  totalAmount: number;
  status: "Paid" | "Submitted" | "PartiallyPaid" | "Draft" | "Void";
  amountDue: number;
}

interface PaymentLineLink {
  type: "Invoice" | "CreditNote" | "PaymentOnAccount";
  id: string;
  amount: number;
}

interface PaymentLine {
  amount: number;
  links: PaymentLineLink[];
}

interface Payment {
  id: string;
  customerRef: string;
  totalAmount: number;
  currency: "GBP" | "USD" | "EUR" | "AUD";
  paymentDate: number;
  lines: PaymentLine[];
  note?: string;
  reference?: string;
}

interface Account {
  id: string;
  nominalCode: string;
  name: string;
  description?: string;
  currency: "GBP" | "USD" | "EUR";
  currentBalance: number;
  type: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  status: "Active" | "Archived";
  isBankAccount: boolean;
}

interface Supplier {
  id: string;
  supplierName: string;
  contactName?: string;
  emailAddress?: string;
  phone?: string;
  status: "Active" | "Archived";
  defaultCurrency: "GBP" | "USD" | "EUR" | "AUD";
}

interface BillLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  taxAmount: number;
  totalAmount: number;
}

interface Bill {
  id: string;
  billNumber?: string;
  supplierRef: string;
  issueDate: number;
  dueDate: number;
  currency: "GBP" | "USD" | "EUR" | "AUD";
  lineItems: BillLineItem[];
  subTotal: number;
  totalTaxAmount: number;
  totalAmount: number;
  status: "Open" | "Paid" | "PartiallyPaid" | "Void";
  amountDue: number;
}

interface Connection {
  id: string;
  integrationId: string;
  platformName: "Xero" | "QuickBooks" | "Sage" | "FreshBooks" | "Wave";
  status: "Linked" | "Unlinked";
  sourceType: "Accounting" | "Banking" | "Commerce";
}

interface Company {
  id: string;
  name: string;
  description?: string;
  defaultCurrency: "GBP" | "USD" | "EUR" | "AUD";
  dataConnections: Connection[];
}

interface LendingTestData {
  companies: Company[];
  accounts: Account[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  payments: Payment[];
  bills: Bill[];
}

// --- Utility Functions ---

function weightedChoice<T>(options: Array<{ value: T; weight: number }>): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) return option.value;
  }
  return options[options.length - 1].value;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function maybe<T>(generator: () => T, probability = 0.5): T | undefined {
  return Math.random() < probability ? generator() : undefined;
}

function times<T>(count: number, generator: () => T): T[] {
  return Array.from({ length: count }, generator);
}

// --- Generator Functions ---

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

function generateInvoiceLineItem(): InvoiceLineItem {
  const quantity = randomInt(1, 100);
  const unitAmount = randomDecimal(10, 5000);
  const discountAmount = randomDecimal(0, 100);
  const taxAmount = Math.round(unitAmount * 0.2 * 100) / 100;
  const totalAmount = Math.round(unitAmount * quantity * 100) / 100;

  return {
    description: faker.commerce.productName(),
    quantity,
    unitAmount,
    discountAmount,
    taxAmount,
    totalAmount,
  };
}

function generateInvoice(customerIds: string[]): Invoice {
  const lineItems = times(randomInt(1, 8), generateInvoiceLineItem);
  const subTotal = lineItems.reduce((sum, item) => sum + item.unitAmount, 0);
  const totalTaxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.totalAmount, 0);

  const status = weightedChoice([
    { value: "Paid" as const, weight: 0.4 },
    { value: "Submitted" as const, weight: 0.3 },
    { value: "PartiallyPaid" as const, weight: 0.15 },
    { value: "Draft" as const, weight: 0.1 },
    { value: "Void" as const, weight: 0.05 },
  ]);

  const issueDate = randomInt(1, 28);

  // Constraint: dueDate >= issueDate
  const dueDate = randomInt(issueDate, 90);

  // Constraint: amountDue based on status
  let amountDue: number;
  if (status === "Paid") {
    amountDue = 0;
  } else if (status === "Draft") {
    amountDue = Math.round(totalAmount * 100) / 100;
  } else {
    amountDue = randomInt(0, 10000);
  }

  return {
    id: faker.string.uuid(),
    invoiceNumber: faker.string.alphanumeric(8),
    customerRef: faker.helpers.arrayElement(customerIds),
    issueDate,
    dueDate,
    currency: weightedChoice([
      { value: "GBP" as const, weight: 0.6 },
      { value: "USD" as const, weight: 0.25 },
      { value: "EUR" as const, weight: 0.1 },
      { value: "AUD" as const, weight: 0.05 },
    ]),
    lineItems,
    subTotal: Math.round(subTotal * 100) / 100,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    status,
    amountDue,
  };
}

function generatePaymentLineLink(): PaymentLineLink {
  return {
    type: faker.helpers.arrayElement(["Invoice", "CreditNote", "PaymentOnAccount"]),
    id: faker.string.uuid(),
    amount: randomInt(0, 10000),
  };
}

function generatePaymentLine(): PaymentLine {
  return {
    amount: randomInt(0, 10000),
    links: times(randomInt(1, 3), generatePaymentLineLink),
  };
}

function generatePayment(customerIds: string[]): Payment {
  return {
    id: faker.string.uuid(),
    customerRef: faker.helpers.arrayElement(customerIds),
    totalAmount: randomInt(100, 50000),
    currency: weightedChoice([
      { value: "GBP" as const, weight: 0.6 },
      { value: "USD" as const, weight: 0.25 },
      { value: "EUR" as const, weight: 0.1 },
      { value: "AUD" as const, weight: 0.05 },
    ]),
    paymentDate: randomInt(1, 28),
    lines: times(randomInt(1, 5), generatePaymentLine),
    note: maybe(() => faker.lorem.sentence()),
    reference: maybe(() => faker.string.alphanumeric(10)),
  };
}

function generateAccount(): Account {
  return {
    id: faker.string.uuid(),
    nominalCode: faker.string.alphanumeric(6),
    name: faker.finance.accountNumber(),
    description: maybe(() => faker.lorem.sentence()),
    currency: faker.helpers.arrayElement(["GBP", "USD", "EUR"]),
    currentBalance: randomDecimal(0, 500000),
    type: weightedChoice([
      { value: "Asset" as const, weight: 0.3 },
      { value: "Liability" as const, weight: 0.2 },
      { value: "Equity" as const, weight: 0.15 },
      { value: "Income" as const, weight: 0.2 },
      { value: "Expense" as const, weight: 0.15 },
    ]),
    status: weightedChoice([
      { value: "Active" as const, weight: 0.9 },
      { value: "Archived" as const, weight: 0.1 },
    ]),
    isBankAccount: weightedChoice([
      { value: true, weight: 0.2 },
      { value: false, weight: 0.8 },
    ]),
  };
}

function generateSupplier(): Supplier {
  return {
    id: faker.string.uuid(),
    supplierName: faker.company.name(),
    contactName: maybe(() => faker.person.fullName()),
    emailAddress: maybe(() => faker.internet.email()),
    phone: maybe(() => faker.phone.number()),
    status: weightedChoice([
      { value: "Active" as const, weight: 0.9 },
      { value: "Archived" as const, weight: 0.1 },
    ]),
    defaultCurrency: weightedChoice([
      { value: "GBP" as const, weight: 0.6 },
      { value: "USD" as const, weight: 0.25 },
      { value: "EUR" as const, weight: 0.1 },
      { value: "AUD" as const, weight: 0.05 },
    ]),
  };
}

function generateBillLineItem(): BillLineItem {
  const quantity = randomInt(1, 50);
  const unitAmount = randomDecimal(10, 2000);
  const taxAmount = Math.round(unitAmount * 0.2 * 100) / 100;
  const totalAmount = Math.round(unitAmount * quantity * 100) / 100;

  return {
    description: faker.commerce.productName(),
    quantity,
    unitAmount,
    taxAmount,
    totalAmount,
  };
}

function generateBill(supplierIds: string[]): Bill {
  const lineItems = times(randomInt(1, 5), generateBillLineItem);
  const subTotal = lineItems.reduce((sum, item) => sum + item.unitAmount, 0);
  const totalTaxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.totalAmount, 0);

  const status = weightedChoice([
    { value: "Open" as const, weight: 0.5 },
    { value: "Paid" as const, weight: 0.35 },
    { value: "PartiallyPaid" as const, weight: 0.1 },
    { value: "Void" as const, weight: 0.05 },
  ]);

  const issueDate = randomInt(1, 28);
  const dueDate = randomInt(issueDate, 60); // Constraint: dueDate >= issueDate

  // Constraint: amountDue based on status
  const amountDue = status === "Paid" ? 0 : randomInt(0, 5000);

  return {
    id: faker.string.uuid(),
    billNumber: maybe(() => faker.string.alphanumeric(8)),
    supplierRef: faker.helpers.arrayElement(supplierIds),
    issueDate,
    dueDate,
    currency: weightedChoice([
      { value: "GBP" as const, weight: 0.6 },
      { value: "USD" as const, weight: 0.25 },
      { value: "EUR" as const, weight: 0.1 },
      { value: "AUD" as const, weight: 0.05 },
    ]),
    lineItems,
    subTotal: Math.round(subTotal * 100) / 100,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    status,
    amountDue,
  };
}

function generateConnection(): Connection {
  return {
    id: faker.string.uuid(),
    integrationId: faker.string.uuid(),
    platformName: faker.helpers.arrayElement([
      "Xero",
      "QuickBooks",
      "Sage",
      "FreshBooks",
      "Wave",
    ]),
    status: weightedChoice([
      { value: "Linked" as const, weight: 0.85 },
      { value: "Unlinked" as const, weight: 0.15 },
    ]),
    sourceType: weightedChoice([
      { value: "Accounting" as const, weight: 0.7 },
      { value: "Banking" as const, weight: 0.2 },
      { value: "Commerce" as const, weight: 0.1 },
    ]),
  };
}

function generateCompany(): Company {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: maybe(() => faker.company.catchPhrase()),
    defaultCurrency: weightedChoice([
      { value: "GBP" as const, weight: 0.6 },
      { value: "USD" as const, weight: 0.25 },
      { value: "EUR" as const, weight: 0.1 },
      { value: "AUD" as const, weight: 0.05 },
    ]),
    dataConnections: times(randomInt(1, 3), generateConnection),
  };
}

// --- Main Dataset Generator ---

export function generateLendingTestData(): LendingTestData {
  // Generate base collections first (for cross-references)
  const customers = times(100, generateCustomer);
  const suppliers = times(50, generateSupplier);

  // Extract IDs for cross-references
  const customerIds = customers.map((c) => c.id);
  const supplierIds = suppliers.map((s) => s.id);

  return {
    companies: times(20, generateCompany),
    accounts: times(50, generateAccount),
    customers,
    suppliers,
    invoices: times(500, () => generateInvoice(customerIds)),
    payments: times(300, () => generatePayment(customerIds)),
    bills: times(200, () => generateBill(supplierIds)),
  };
}

// CLI execution
if (require.main === module) {
  const data = generateLendingTestData();
  console.log(JSON.stringify(data, null, 2));
}
