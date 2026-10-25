-- Page paths must sit in the owner's folder, so purge-pages (service role) only ever erases
-- the owner's own scans and nobody can pin another user's uploads.
create function public.own_paths(owner uuid, paths text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(starts_with(p, owner::text || '/') and position('..' in p) = 0), true)
  from unnest(paths) p;
$$;
alter table public.invoices add constraint invoices_own_paths check (public.own_paths(owner_id, page_paths));

-- Deleted invoices are read-only: a stale device saving over one gets an error instead of a silent no-op.
alter policy invoices_update on public.invoices
  using ((select auth.uid()) = owner_id and deleted_at is null);

-- Unreferenced uploads now survive 7 days, so a review left open overnight keeps its scans.
create or replace function public.purge_candidates() returns table(invoice_id uuid, path text)
language sql stable security definer set search_path = '' as $$
  (select i.id, p from public.invoices i left join lateral unnest(i.page_paths) p on true
    where i.deleted_at < now() - interval '30 days')
  union all
  (select null, o.name from storage.objects o
    where o.bucket_id = 'invoice-pages' and o.created_at < now() - interval '7 days'
      and not exists (select 1 from public.invoices i where o.name = any(i.page_paths)))
  limit 1000;
$$;
