import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  cents,
  checkTotals,
  currentWarnings,
  Invoice,
  parseAmount,
  sampleInvoices,
  validateInvoice,
} from "../src/lib/invoice";
import { buildWorkbook } from "../src/lib/workbook";
const acknowledge = (i: Invoice) => ({
  ...i,
  acknowledgedWarnings: currentWarnings(i),
  warningsReviewedAt: "2026-10-19T12:00:00.000Z",
});
test("sample invoices balance in cents", () =>
  sampleInvoices.forEach((i) => {
    assert.deepEqual(checkTotals(i), []);
    assert.deepEqual(validateInvoice(i), []);
  }));
test("mismatches are warnings that state the difference", () => {
  const i = structuredClone(sampleInvoices[0]);
  i.total = 665;
  const [warning] = checkTotals(i);
  assert.match(warning, /total is \$665\.00 \(difference \$100\.00\)/);
  assert.match(validateInvoice(i).join(" "), /acknowledge/);
  assert.deepEqual(validateInvoice(acknowledge(i)), []);
});
test("a new mismatch after acknowledgement needs a new acknowledgement", () => {
  const i = acknowledge({ ...structuredClone(sampleInvoices[0]), total: 665 });
  i.tax = 70;
  assert.match(validateInvoice(i).join(" "), /acknowledge/);
});
test("discounts, returns and credit notes are valid when classified", () => {
  const i = structuredClone(sampleInvoices[0]);
  i.items.push(
    {
      description: "Loyalty discount",
      quantity: 1,
      unitPrice: -20,
      amount: -20,
      kind: "discount",
    },
    {
      description: "Returned ink",
      quantity: -1,
      unitPrice: 90,
      amount: -90,
      kind: "return",
    },
  );
  i.subtotal = 390;
  i.tax = 50.7;
  i.total = 440.7;
  assert.deepEqual(validateInvoice(i), []);
  const credit = structuredClone(i);
  credit.documentType = "credit_note";
  credit.items = [credit.items[4]];
  credit.subtotal = -90;
  credit.tax = -11.7;
  credit.total = -101.7;
  assert.deepEqual(validateInvoice(credit), []);
});
test("unclassified negative values are rejected", () => {
  const i = structuredClone(sampleInvoices[0]);
  i.items[0].amount = -120;
  i.items[0].unitPrice = -40;
  assert.match(
    validateInvoice(acknowledge(i)).join(" "),
    /Mark it as a discount or return/,
  );
  const j = structuredClone(sampleInvoices[0]);
  j.total = -565;
  assert.match(validateInvoice(acknowledge(j)).join(" "), /credit note/);
});
test("rejects missing fields and non-finite numbers", () => {
  const i = structuredClone(sampleInvoices[0]);
  i.company = "";
  i.tax = NaN;
  i.items = [];
  assert.ok(validateInvoice(i).length >= 3);
});
test("Excel round-trip preserves items, types, review notes and literal formula-like text", async () => {
  const i = structuredClone(sampleInvoices[0]);
  i.vendor = '=HYPERLINK("unsafe")';
  i.reviewWarnings = [
    "Subtotal plus tax is $565.00 but total is $665.00 (difference $100.00).",
  ];
  i.items[0].kind = "discount";
  const bytes = await buildWorkbook([i]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as never);
  const [summary, items] = wb.worksheets;
  assert.equal(summary.rowCount, 2);
  assert.equal(items.rowCount, 4);
  assert.equal(summary.getCell("E2").value, "Invoice");
  assert.equal(summary.getCell("I2").value, 565);
  assert.equal(summary.getCell("J2").value, i.reviewWarnings[0]);
  assert.equal(summary.getCell("A2").value, i.vendor);
  assert.equal(items.getCell("E2").value, "discount");
  assert.equal(items.getCell("G2").value, 3);
});
test("amounts parse thousands and decimal commas, and round to the cent", () => {
  assert.equal(parseAmount("1,234"), 1234);
  assert.equal(parseAmount("1,234.50"), 1234.5);
  assert.equal(parseAmount("12,50"), 12.5);
  assert.equal(parseAmount("-5"), -5);
  assert.ok(Number.isNaN(parseAmount(" ")));
  assert.equal(cents(10.005), 1001);
  assert.equal(cents(3 * 3.335), 1001);
  assert.equal(cents(-2.5), -250);
  assert.equal(cents(-0.125), -13);
});
