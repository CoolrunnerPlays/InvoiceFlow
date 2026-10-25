import ExcelJS from "exceljs";
import { currentWarnings, Invoice } from "./invoice";
export async function buildWorkbook(invoices: Invoice[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "InvoiceFlow";
  const summary = workbook.addWorksheet("Invoices");
  summary.addRow([
    "Vendor",
    "Invoice number",
    "Date",
    "Company",
    "Type",
    "Currency",
    "Subtotal",
    "Tax",
    "Total",
    "Review notes",
  ]);
  const items = workbook.addWorksheet("Line items");
  items.addRow([
    "Invoice number",
    "Vendor",
    "Company",
    "Currency",
    "Kind",
    "Description",
    "Quantity",
    "Unit price",
    "Amount",
  ]);
  invoices.forEach((i) => {
    summary.addRow([
      i.vendor,
      i.number,
      i.date,
      i.company,
      i.documentType === "credit_note" ? "Credit note" : "Invoice",
      i.currency,
      i.subtotal,
      i.tax,
      i.total,
      (i.reviewWarnings ?? currentWarnings(i)).join("\n"),
    ]);
    i.items.forEach((item) =>
      items.addRow([
        i.number,
        i.vendor,
        i.company,
        i.currency,
        item.kind ?? "item",
        item.description,
        item.quantity,
        item.unitPrice,
        item.amount,
      ]),
    );
  });
  [summary, items].forEach((sheet) => {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF253246" },
    };
    sheet.columns.forEach((c) => {
      c.width = 23;
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columnCount },
    };
  });
  [7, 8, 9].forEach((c) => (summary.getColumn(c).numFmt = "#,##0.00"));
  [8, 9].forEach((c) => (items.getColumn(c).numFmt = "#,##0.00"));
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
