export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};
export type Invoice = {
  id: string;
  vendor: string;
  number: string;
  date: string;
  company: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  items: LineItem[];
  pages: string[];
  pagePaths?: string[];
  extractionWarnings?: string[];
  warningsReviewed?: boolean;
  status: "review" | "saved";
};
export const money = (amount: number, currency = "CAD") => {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
};
export const cents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100);
export function validateInvoice(invoice: Invoice): string[] {
  const errors: string[] = [];
  if (invoice.extractionWarnings?.length && !invoice.warningsReviewed)
    errors.push("Review and acknowledge the extraction warnings.");
  if (
    !invoice.vendor.trim() ||
    !invoice.number.trim() ||
    !invoice.company.trim()
  )
    errors.push("Vendor, invoice number and company are required.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(invoice.date) ||
    Number.isNaN(Date.parse(invoice.date)) ||
    new Date(invoice.date).toISOString().slice(0, 10) !== invoice.date
  )
    errors.push("Enter a valid date (YYYY-MM-DD).");
  if (!/^[A-Z]{3}$/.test(invoice.currency))
    errors.push("Enter a three-letter currency code.");
  if (!invoice.items.length) errors.push("Add at least one line item.");
  const amounts = [
    invoice.subtotal,
    invoice.tax,
    invoice.total,
    ...invoice.items.flatMap((i) => [i.quantity, i.unitPrice, i.amount]),
  ];
  if (amounts.some((n) => !Number.isFinite(n) || n < 0))
    errors.push("Amounts must be valid, non-negative numbers.");
  invoice.items.forEach((i, n) => {
    if (!i.description.trim() || i.quantity <= 0)
      errors.push(`Item ${n + 1} needs a description and positive quantity.`);
    if (cents(i.quantity * i.unitPrice) !== cents(i.amount))
      errors.push(
        `Item ${n + 1}: quantity × unit price does not match amount.`,
      );
  });
  if (
    invoice.items.reduce((sum, i) => sum + cents(i.amount), 0) !==
    cents(invoice.subtotal)
  )
    errors.push("Line items do not match subtotal.");
  if (cents(invoice.subtotal) + cents(invoice.tax) !== cents(invoice.total))
    errors.push("Subtotal plus tax does not match total.");
  return errors;
}
export const sampleInvoices: Invoice[] = [
  {
    id: "demo-1042",
    vendor: "ABC SUPPLIES",
    number: "INV-1042",
    date: "2026-10-18",
    company: "Company A",
    currency: "CAD",
    subtotal: 500,
    tax: 65,
    total: 565,
    status: "saved",
    pages: [],
    items: [
      { description: "Paper boxes", quantity: 3, unitPrice: 40, amount: 120 },
      { description: "Printer ink", quantity: 2, unitPrice: 90, amount: 180 },
      {
        description: "Office supplies",
        quantity: 4,
        unitPrice: 50,
        amount: 200,
      },
    ],
  },
  {
    id: "demo-1041",
    vendor: "Northline Studio",
    number: "INV-1041",
    date: "2026-10-16",
    company: "Company B",
    currency: "CAD",
    subtotal: 207.52,
    tax: 26.98,
    total: 234.5,
    status: "saved",
    pages: [],
    items: [
      {
        description: "Print production",
        quantity: 1,
        unitPrice: 207.52,
        amount: 207.52,
      },
    ],
  },
  {
    id: "demo-1040",
    vendor: "Harbour Office Co.",
    number: "INV-1040",
    date: "2026-10-14",
    company: "Company A",
    currency: "CAD",
    subtotal: 1046.19,
    tax: 136.01,
    total: 1182.2,
    status: "saved",
    pages: [],
    items: [
      {
        description: "Ergonomic office chair",
        quantity: 3,
        unitPrice: 348.73,
        amount: 1046.19,
      },
    ],
  },
];
