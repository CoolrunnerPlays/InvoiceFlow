create or replace function public.valid_invoice(d jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; sum_cents numeric := 0; k text;
begin
  if jsonb_typeof(d) is distinct from 'object' or not (d ?& array['vendor','number','company','date','currency','subtotal','tax','total','items']) then return false; end if;
  foreach k in array array['vendor','number','company','date','currency'] loop
    if jsonb_typeof(d->k) is distinct from 'string' or length(trim(d->>k)) = 0 then return false; end if;
  end loop;
  if (d->>'date') !~ '^\d{4}-\d{2}-\d{2}$' or (d->>'currency') !~ '^[A-Z]{3}$' then return false; end if;
  perform (d->>'date')::date;
  if jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items') not between 1 and 500 then return false; end if;
  foreach k in array array['subtotal','tax','total'] loop
    if jsonb_typeof(d->k) is distinct from 'number' or (d->>k)::numeric < 0 or (d->>k)::numeric > 1e12 then return false; end if;
  end loop;
  if d ? 'extractionWarnings' then
    if jsonb_typeof(d->'extractionWarnings') is distinct from 'array' then return false; end if;
    if jsonb_array_length(d->'extractionWarnings') > 0 and (d->>'warningsReviewed') is distinct from 'true' then return false; end if;
  end if;
  for item in select * from jsonb_array_elements(d->'items') loop
    if jsonb_typeof(item->'description') is distinct from 'string' or length(trim(item->>'description')) = 0 then return false; end if;
    foreach k in array array['quantity','unitPrice','amount'] loop
      if jsonb_typeof(item->k) is distinct from 'number' or (item->>k)::numeric < 0 or (item->>k)::numeric > 1e12 then return false; end if;
    end loop;
    if (item->>'quantity')::numeric <= 0 then return false; end if;
    if round((item->>'quantity')::numeric * (item->>'unitPrice')::numeric * 100) <> round((item->>'amount')::numeric * 100) then return false; end if;
    sum_cents := sum_cents + round((item->>'amount')::numeric * 100);
  end loop;
  return sum_cents = round((d->>'subtotal')::numeric * 100) and round((d->>'subtotal')::numeric * 100) + round((d->>'tax')::numeric * 100) = round((d->>'total')::numeric * 100);
exception when others then return false;
end; $$;
