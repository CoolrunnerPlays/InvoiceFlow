export type LineKind = "item" | "discount" | "return";
export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  kind?: LineKind;
};
export type Invoice = {
  id: string;
  vendor: string;
  number: string;
  date: string;
  company: string;
  currency: string;
  documentType?: "invoice" | "credit_note";
  subtotal: number;
  tax: number;
  total: number;
  items: LineItem[];
  pages: string[];
  pagePaths?: string[];
  extractionWarnings?: string[];
  warningsReviewed?: boolean;
  // Audit trail: every warning at save time, which ones the user acknowledged, and when.
  reviewWarnings?: string[];
  acknowledgedWarnings?: string[];
  warningsReviewedAt?: string;
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
// toPrecision drops float noise (10.005 * 100 = 1000.4999…); rounds halves away from zero.
export const cents = (value: number) =>
  Math.sign(value) *
  Math.round(Number((Math.abs(value) * 100).toPrecision(12)));
// Accepts "1,234.50", "1,234" (thousands) and "12,50" (decimal comma); empty stays NaN.
export function parseAmount(value: string) {
  const v = value.trim().replace(/\s/g, "");
  if (v === "") return NaN;
  if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))
    return Number(v.replace(/,/g, ""));
  return Number(v.includes(".") ? v : v.replace(",", "."));
}
// Arithmetic mismatches are warnings, not errors: printed invoices can legitimately disagree.
export function checkTotals(invoice: Invoice): string[] {
  const m = (n: number) => money(n, invoice.currency);
  const warnings: string[] = [];
  invoice.items.forEach((i, n) => {
    const expected = cents(i.quantity * i.unitPrice);
    if (expected !== cents(i.amount))
      warnings.push(
        `Item ${n + 1}: ${i.quantity} × ${m(i.unitPrice)} = ${m(expected / 100)} but amount is ${m(i.amount)} (difference ${m((cents(i.amount) - expected) / 100)}).`,
      );
  });
  const lines = invoice.items.reduce((sum, i) => sum + cents(i.amount), 0);
  if (lines !== cents(invoice.subtotal))
    warnings.push(
      `Line items total ${m(lines / 100)} but subtotal is ${m(invoice.subtotal)} (difference ${m((cents(invoice.subtotal) - lines) / 100)}).`,
    );
  const sum = cents(invoice.subtotal) + cents(invoice.tax);
  if (sum !== cents(invoice.total))
    warnings.push(
      `Subtotal plus tax is ${m(sum / 100)} but total is ${m(invoice.total)} (difference ${m((cents(invoice.total) - sum) / 100)}).`,
    );
  return warnings;
}
export const currentWarnings = (invoice: Invoice) => [
  ...(invoice.extractionWarnings ?? []),
  ...checkTotals(invoice),
];
export function validateInvoice(invoice: Invoice): string[] {
  const errors: string[] = [];
  if (
    currentWarnings(invoice).some(
      (w) => !invoice.acknowledgedWarnings?.includes(w),
    )
  )
    errors.push(
      "Compare the review notes with the original and acknowledge them.",
    );
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
  if (amounts.some((n) => !Number.isFinite(n)))
    errors.push("Amounts must be valid numbers.");
  else if (amounts.some((n) => Math.abs(n) > 1e12))
    errors.push("Amounts must be under 1,000,000,000,000.");
  invoice.items.forEach((i, n) => {
    if (!i.description.trim())
      errors.push(`Item ${n + 1} needs a description.`);
    const kind = i.kind ?? "item";
    if (kind === "item" && (i.quantity <= 0 || i.unitPrice < 0 || i.amount < 0))
      errors.push(
        `Item ${n + 1} has a negative or zero value but is marked as a regular item. Mark it as a discount or return, or fix the sign.`,
      );
    if (kind === "discount" && !(i.amount < 0))
      errors.push(
        `Item ${n + 1} is marked as a discount, so its amount must be negative.`,
      );
    if (kind === "return" && !(i.quantity < 0 && i.amount <= 0))
      errors.push(
        `Item ${n + 1} is marked as a return, so its quantity must be negative.`,
      );
  });
  if ((invoice.documentType ?? "invoice") === "invoice" && invoice.total < 0)
    errors.push(
      "The total is negative. Mark this document as a credit note, or fix the sign.",
    );
  if (invoice.documentType === "credit_note" && invoice.total > 0)
    errors.push("A credit note's total must be zero or negative.");
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
