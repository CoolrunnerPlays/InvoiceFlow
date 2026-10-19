import { createClient } from "npm:@supabase/supabase-js@2.118.0";
// Daily cleanup, called by a Supabase Cron job with the x-purge-secret header.
// Files are removed before their rows, so a failed removal is retried on the next run.
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
Deno.serve(async (req) => {
  const secret = Deno.env.get("PURGE_SECRET");
  if (!secret || req.headers.get("x-purge-secret") !== secret)
    return reply({ error: "Forbidden" }, 403);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.rpc("purge_candidates");
  if (error) return reply({ error: error.message }, 500);
  const rows = data as { invoice_id: string | null; path: string | null }[];
  const paths = rows.flatMap((r) => (r.path ? [r.path] : []));
  for (let n = 0; n < paths.length; n += 100) {
    const { error } = await admin.storage
      .from("invoice-pages")
      .remove(paths.slice(n, n + 100));
    if (error) return reply({ error: error.message }, 500);
  }
  const ids = [
    ...new Set(rows.flatMap((r) => (r.invoice_id ? [r.invoice_id] : []))),
  ];
  if (ids.length) {
    const { error } = await admin.rpc("purge_invoices", { ids });
    if (error) return reply({ error: error.message }, 500);
  }
  return reply({ removedFiles: paths.length, purgedInvoices: ids.length });
});
