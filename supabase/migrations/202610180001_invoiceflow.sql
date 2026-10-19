create function public.valid_invoice(d jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; sum_cents numeric := 0;
begin
  if jsonb_typeof(d) <> 'object' or not (d ?& array['vendor','number','company','date','currency','subtotal','tax','total','items']) then return false; end if;
  if length(trim(d->>'vendor')) = 0 or length(trim(d->>'number')) = 0 or length(trim(d->>'company')) = 0 then return false; end if;
  if (d->>'date') !~ '^\d{4}-\d{2}-\d{2}$' or (d->>'currency') !~ '^[A-Z]{3}$' then return false; end if;
  perform (d->>'date')::date;
  if jsonb_typeof(d->'items') <> 'array' or jsonb_array_length(d->'items') not between 1 and 500 then return false; end if;
  if jsonb_typeof(d->'subtotal') <> 'number' or jsonb_typeof(d->'tax') <> 'number' or jsonb_typeof(d->'total') <> 'number' then return false; end if;
  if (d->>'subtotal')::numeric < 0 or (d->>'tax')::numeric < 0 or (d->>'total')::numeric < 0 then return false; end if;
  for item in select * from jsonb_array_elements(d->'items') loop
    if not (item ?& array['description','quantity','unitPrice','amount']) or length(trim(item->>'description')) = 0 then return false; end if;
    if jsonb_typeof(item->'quantity') <> 'number' or jsonb_typeof(item->'unitPrice') <> 'number' or jsonb_typeof(item->'amount') <> 'number' then return false; end if;
    if (item->>'quantity')::numeric <= 0 or (item->>'unitPrice')::numeric < 0 or (item->>'amount')::numeric < 0 then return false; end if;
    if round((item->>'quantity')::numeric * (item->>'unitPrice')::numeric * 100) <> round((item->>'amount')::numeric * 100) then return false; end if;
    sum_cents := sum_cents + round((item->>'amount')::numeric * 100);
  end loop;
  return sum_cents = round((d->>'subtotal')::numeric * 100) and round((d->>'subtotal')::numeric * 100) + round((d->>'tax')::numeric * 100) = round((d->>'total')::numeric * 100);
exception when others then return false;
end; $$;

create table public.invoices (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  document jsonb not null check (public.valid_invoice(document)),
  page_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create unique index invoices_vendor_number on public.invoices(owner_id, lower(document->>'vendor'), lower(document->>'number'));
create index invoices_owner_created on public.invoices(owner_id, created_at desc);
alter table public.invoices enable row level security;
create policy invoices_select on public.invoices for select to authenticated using ((select auth.uid()) = owner_id);
create policy invoices_insert on public.invoices for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy invoices_update on public.invoices for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
grant select, insert, update on public.invoices to authenticated;
revoke all on public.invoices from anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('invoice-pages','invoice-pages',false,5242880,array['image/jpeg']);
create policy invoice_pages_read on storage.objects for select to authenticated using (bucket_id = 'invoice-pages' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy invoice_pages_insert on storage.objects for insert to authenticated with check (bucket_id = 'invoice-pages' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy invoice_pages_remove on storage.objects for delete to authenticated using (bucket_id = 'invoice-pages' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table public.extraction_usage (owner_id uuid references auth.users(id) on delete cascade, day date not null default current_date, count integer not null, primary key(owner_id,day));
alter table public.extraction_usage enable row level security;
revoke all on public.extraction_usage from anon, authenticated;
create function public.claim_extraction() returns boolean language plpgsql security definer set search_path = '' as $$
declare current_count integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.extraction_usage as usage(owner_id, day, count) values(auth.uid(), current_date, 1)
  on conflict(owner_id, day) do update set count = usage.count + 1 where usage.count < 30
  returning count into current_count;
  return current_count is not null;
end; $$;
revoke all on function public.claim_extraction() from public;
grant execute on function public.claim_extraction() to authenticated;
