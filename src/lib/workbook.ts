import ExcelJS from "exceljs";
import { Invoice } from "./invoice";
export async function buildWorkbook(invoices: Invoice[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "InvoiceFlow";
  const summary = workbook.addWorksheet("Invoices");
  summary.addRow([
    "Vendor",
    "Invoice number",
    "Date",
    "Company",
    "Currency",
    "Subtotal",
    "Tax",
    "Total",
  ]);
  const items = workbook.addWorksheet("Line items");
  items.addRow([
    "Invoice number",
    "Vendor",
    "Company",
    "Currency",
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
      i.currency,
      i.subtotal,
      i.tax,
      i.total,
    ]);
    i.items.forEach((item) =>
      items.addRow([
        i.number,
        i.vendor,
        i.company,
        i.currency,
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
    sheet.autoFilter = { from: "A1", to: "H1" };
  });
  [6, 7, 8].forEach((c) => (summary.getColumn(c).numFmt = "#,##0.00"));
  [7, 8].forEach((c) => (items.getColumn(c).numFmt = "#,##0.00"));
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
