import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Invoice } from "./invoice";
import { buildWorkbook } from "./workbook";
export async function exportInvoices(invoices: Invoice[]) {
  const bytes = await buildWorkbook(invoices);
  const name = `InvoiceFlow-${new Date().toISOString().slice(0, 10)}.xlsx`;
  if (process.env.EXPO_OS === "web") {
    const blob = new Blob([bytes as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    // Phones (including the home-screen app) get the share sheet: Save to Files, Mail, Excel.
    const file = new globalThis.File([blob], name, { type: blob.type });
    if (
      matchMedia("(pointer: coarse)").matches &&
      navigator.canShare?.({ files: [file] })
    ) {
      try {
        return await navigator.share({ files: [file] });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        // Otherwise (e.g. sharing not allowed here) fall back to a download.
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Sharing is unavailable on this device.");
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(bytes);
  await Sharing.shareAsync(file.uri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
