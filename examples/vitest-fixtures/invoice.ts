// Example: A simple invoice module that we want to test

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: number;
  status: 'draft' | 'sent' | 'paid';
  customerId: number;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
}

export function calculateInvoiceTotals(
  lineItems: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number
): { subtotal: number; tax: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export function canMarkAsPaid(invoice: Invoice): boolean {
  return invoice.status === 'sent' && invoice.total > 0;
}

export function getOverdueInvoices(invoices: Invoice[], paidIds: Set<number>): Invoice[] {
  return invoices.filter((inv) => inv.status === 'sent' && !paidIds.has(inv.id));
}
