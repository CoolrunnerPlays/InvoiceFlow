import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { supabase } from "./supabase";
import { Invoice, validateInvoice } from "./invoice";
export async function listInvoices(): Promise<Invoice[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all(
    data.map(async (row) => {
      const { data: urls, error: urlError } = row.page_paths.length
        ? await supabase!.storage
            .from("invoice-pages")
            .createSignedUrls(row.page_paths, 3600)
        : { data: [], error: null };
      if (urlError) throw urlError;
      return {
        ...row.document,
        id: row.id,
        status: "saved",
        pagePaths: row.page_paths,
        pages: (urls ?? []).map((x) => x.signedUrl).filter(Boolean),
      } as Invoice;
    }),
  );
}
export async function saveInvoice(invoice: Invoice) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const errors = validateInvoice(invoice);
  if (errors.length) throw new Error(errors.join("\n"));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in before saving.");
  const { pages: _pages, pagePaths, ...document } = invoice;
  const { error } = await supabase
    .from("invoices")
    .upsert(
      {
        id: invoice.id,
        owner_id: user.id,
        document,
        page_paths: pagePaths ?? [],
      },
      { onConflict: "id" },
    );
  if (error)
    throw new Error(
      error.code === "23505"
        ? "This vendor and invoice number already exist in your workspace."
        : error.message,
    );
}
export async function extractPages(pages: string[]): Promise<Invoice> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    throw new Error("Sign in under Settings to extract real invoices.");
  if (!pages.length || pages.length > 10)
    throw new Error("Select between 1 and 10 pages.");
  const id = randomUUID();
  const paths: string[] = [];
  try {
    for (let n = 0; n < pages.length; n++) {
      const file = new File(pages[n]);
      if (file.size > 5 * 1024 * 1024)
        throw new Error(
          `Page ${n + 1} exceeds 5 MB. Retake it at a lower resolution.`,
        );
      const path = `${user.id}/${id}/${n}.jpg`;
      const { error } = await supabase.storage
        .from("invoice-pages")
        .upload(path, await file.arrayBuffer(), {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (error) throw error;
      paths.push(path);
    }
    const { data, error } = await supabase.functions.invoke("extract-invoice", {
      body: { paths },
    });
    if (error) {
      const body = await error.context?.json?.().catch(() => null);
      throw new Error(
        body?.error ??
          "Extraction failed. Check your connection and try again.",
      );
    }
    if (data.error) throw new Error(data.error);
    return {
      ...data.invoice,
      id,
      company: "",
      pages,
      pagePaths: paths,
      status: "review",
    };
  } catch (error) {
    if (paths.length)
      await supabase.storage.from("invoice-pages").remove(paths);
    throw error;
  }
}
