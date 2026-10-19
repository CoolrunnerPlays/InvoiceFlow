import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { sampleInvoices, validateInvoice } from "../src/lib/invoice";
import { buildWorkbook } from "../src/lib/workbook";
test("sample invoices balance in cents", () =>
  sampleInvoices.forEach((i) => assert.deepEqual(validateInvoice(i), [])));
test("rejects line, subtotal and total mismatches", () => {
  const i = structuredClone(sampleInvoices[0]);
  i.items[0].amount = 121;
  assert.match(validateInvoice(i).join(" "), /quantity.*subtotal/);
  i.total = 566;
  assert.match(validateInvoice(i).join(" "), /plus tax/);
});
test("rejects missing fields and non-finite numbers", () => {
  const i = structuredClone(sampleInvoices[0]);
  i.company = "";
  i.tax = NaN;
  i.items = [];
  assert.ok(validateInvoice(i).length >= 3);
});
test("Excel round-trip preserves all items, numeric amounts and literal formula-like text", async () => {
  const i = structuredClone(sampleInvoices[0]);
  i.vendor = '=HYPERLINK("unsafe")';
  const bytes = await buildWorkbook([i]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as never);
  assert.equal(wb.worksheets[0].rowCount, 2);
  assert.equal(wb.worksheets[1].rowCount, 4);
  assert.equal(wb.worksheets[0].getCell("H2").value, 565);
  assert.equal(wb.worksheets[0].getCell("A2").value, i.vendor);
  assert.equal(wb.worksheets[1].getCell("F2").value, 3);
});
