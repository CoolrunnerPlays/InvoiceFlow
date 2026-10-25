-- Arithmetic mismatches become acknowledged review notes (checked in the app), so the database
-- validates shape, signs by line kind/document type, and the review audit trail.
create or replace function public.valid_invoice(d jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; k text; q numeric; p numeric; a numeric;
begin
  if jsonb_typeof(d) is distinct from 'object' or not (d ?& array['vendor','number','company','date','currency','subtotal','tax','total','items']) then return false; end if;
  foreach k in array array['vendor','number','company','date','currency'] loop
    if jsonb_typeof(d->k) is distinct from 'string' or length(trim(d->>k)) = 0 then return false; end if;
  end loop;
  if (d->>'date') !~ '^\d{4}-\d{2}-\d{2}$' or (d->>'currency') !~ '^[A-Z]{3}$' then return false; end if;
  perform (d->>'date')::date;
  if jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items') not between 1 and 500 then return false; end if;
  foreach k in array array['subtotal','tax','total'] loop
    if jsonb_typeof(d->k) is distinct from 'number' or abs((d->>k)::numeric) > 1e12 then return false; end if;
  end loop;
  case coalesce(d->>'documentType', 'invoice')
    when 'invoice' then if (d->>'total')::numeric < 0 then return false; end if;
    when 'credit_note' then if (d->>'total')::numeric > 0 then return false; end if;
    else return false;
  end case;
  if d ? 'extractionWarnings' then
    if jsonb_typeof(d->'extractionWarnings') is distinct from 'array' then return false; end if;
    if jsonb_array_length(d->'extractionWarnings') > 0 and (d->>'warningsReviewed') is distinct from 'true' then return false; end if;
  end if;
  if d ? 'reviewWarnings' then
    if jsonb_typeof(d->'reviewWarnings') is distinct from 'array' then return false; end if;
    if exists (select 1 from jsonb_array_elements(d->'reviewWarnings') w where jsonb_typeof(w) <> 'string') then return false; end if;
    if jsonb_array_length(d->'reviewWarnings') > 0 and (
      jsonb_typeof(d->'acknowledgedWarnings') is distinct from 'array'
      or not ((d->'acknowledgedWarnings') @> (d->'reviewWarnings'))
      or jsonb_typeof(d->'warningsReviewedAt') is distinct from 'string'
    ) then return false; end if;
  end if;
  for item in select * from jsonb_array_elements(d->'items') loop
    if jsonb_typeof(item->'description') is distinct from 'string' or length(trim(item->>'description')) = 0 then return false; end if;
    foreach k in array array['quantity','unitPrice','amount'] loop
      if jsonb_typeof(item->k) is distinct from 'number' or abs((item->>k)::numeric) > 1e12 then return false; end if;
    end loop;
    q := (item->>'quantity')::numeric; p := (item->>'unitPrice')::numeric; a := (item->>'amount')::numeric;
    if not (case coalesce(item->>'kind', 'item')
      when 'item' then q > 0 and p >= 0 and a >= 0
      when 'discount' then a < 0
      when 'return' then q < 0 and a <= 0
      else false end) then return false; end if;
  end loop;
  return true;
exception when others then return false;
end; $$;

-- Soft delete: rows keep their page paths until purge-pages erases the scans.
alter table public.invoices add column deleted_at timestamptz;
drop index public.invoices_vendor_number;
create unique index invoices_vendor_number on public.invoices(owner_id, lower(document->>'vendor'), lower(document->>'number')) where deleted_at is null;

-- Storage paths to erase: scans of invoices deleted over 30 days ago, and uploads older than
-- 24 hours that no invoice references (abandoned reviews, failed saves).
create function public.purge_candidates() returns table(invoice_id uuid, path text)
language sql stable security definer set search_path = '' as $$
  (select i.id, p from public.invoices i left join lateral unnest(i.page_paths) p on true
    where i.deleted_at < now() - interval '30 days')
  union all
  (select null, o.name from storage.objects o
    where o.bucket_id = 'invoice-pages' and o.created_at < now() - interval '24 hours'
      and not exists (select 1 from public.invoices i where o.name = any(i.page_paths)))
  limit 1000;
$$;
create function public.purge_invoices(ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  delete from public.invoices where id = any(ids) and deleted_at < now() - interval '30 days';
$$;

-- Returns a quota reservation when the provider never processed the request.
-- ponytail: decrements the current day, so a release just after midnight UTC refunds the new day; store an attempt id if that ever matters.
create function public.release_extraction(p_owner uuid) returns void
language sql security definer set search_path = '' as $$
  update public.extraction_usage set count = greatest(count - 1, 0) where owner_id = p_owner and day = current_date;
$$;

revoke all on function public.purge_candidates() from public, anon, authenticated;
revoke all on function public.purge_invoices(uuid[]) from public, anon, authenticated;
revoke all on function public.release_extraction(uuid) from public, anon, authenticated;
grant execute on function public.purge_candidates() to service_role;
grant execute on function public.purge_invoices(uuid[]) to service_role;
grant execute on function public.release_extraction(uuid) to service_role;
