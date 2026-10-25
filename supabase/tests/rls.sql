begin;
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000001','invoiceflow-test-a@example.invalid'),('10000000-0000-4000-8000-000000000002','invoiceflow-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.invoices(id,owner_id,document) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','{"vendor":"Test","number":"1","company":"Test","date":"2026-10-18","currency":"CAD","subtotal":1,"tax":0,"total":1,"items":[{"description":"Test","quantity":1,"unitPrice":1,"amount":1}]}');
do $$ begin if (select count(*) from public.invoices) <> 1 then raise exception 'Owner read failed'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin if (select count(*) from public.invoices) <> 0 then raise exception 'Cross-user isolation failed'; end if; end $$;
update public.invoices set deleted_at = now();
do $$ begin
  perform public.release_extraction('10000000-0000-4000-8000-000000000002');
  raise exception 'Users can refund their own quota';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.purge_candidates();
  raise exception 'Users can list purge candidates';
exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin if (select count(*) from public.invoices where deleted_at is not null) <> 0 then raise exception 'Cross-user soft delete succeeded'; end if; end $$;
update public.invoices set deleted_at = now() where id = '20000000-0000-4000-8000-000000000001';
do $$ begin if (select count(*) from public.invoices where deleted_at is not null) <> 1 then raise exception 'Owner soft delete failed'; end if; end $$;
update public.invoices set page_paths = '{10000000-0000-4000-8000-000000000001/a/0.jpg}' where id = '20000000-0000-4000-8000-000000000001';
do $$ begin if exists (select 1 from public.invoices where id = '20000000-0000-4000-8000-000000000001' and cardinality(page_paths) > 0) then raise exception 'Deleted invoice was updated'; end if; end $$;
do $$ begin
  insert into public.invoices(id,owner_id,document,page_paths) values('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','{"vendor":"X","number":"9","company":"Test","date":"2026-10-18","currency":"CAD","subtotal":1,"tax":0,"total":1,"items":[{"description":"Test","quantity":1,"unitPrice":1,"amount":1}]}','{10000000-0000-4000-8000-000000000002/a/0.jpg}');
  raise exception 'Foreign page path accepted';
exception when check_violation then null; end $$;
insert into public.invoices(id,owner_id,document) values('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','{"vendor":"Test","number":"1","company":"Test","date":"2026-10-18","currency":"CAD","subtotal":1,"tax":0,"total":1,"items":[{"description":"Test","quantity":1,"unitPrice":1,"amount":1}]}');
reset role;
do $$ begin if public.valid_invoice('{"vendor":null,"number":"1","company":"A","date":"2026-10-18","currency":"CAD","subtotal":1,"tax":0,"total":1,"items":[{"description":"a","quantity":1,"unitPrice":1,"amount":1}]}') then raise exception 'Null validation failed'; end if; end $$;
do $$ begin if public.valid_invoice('{"vendor":"V","number":"1","company":"A","date":"2026-10-18","currency":"CAD","subtotal":-5,"tax":0,"total":-5,"items":[{"description":"a","quantity":1,"unitPrice":-5,"amount":-5}]}') then raise exception 'Unclassified negative line accepted'; end if; end $$;
do $$ begin if not public.valid_invoice('{"vendor":"V","number":"1","company":"A","date":"2026-10-18","currency":"CAD","subtotal":5,"tax":0,"total":5,"items":[{"description":"a","quantity":1,"unitPrice":10,"amount":10},{"description":"d","kind":"discount","quantity":1,"unitPrice":-5,"amount":-5}]}') then raise exception 'Discount line rejected'; end if; end $$;
do $$ begin if not public.valid_invoice('{"vendor":"V","number":"1","company":"A","date":"2026-10-18","currency":"CAD","documentType":"credit_note","subtotal":-10,"tax":0,"total":-10,"items":[{"description":"r","kind":"return","quantity":-1,"unitPrice":10,"amount":-10}]}') then raise exception 'Credit note rejected'; end if; end $$;
do $$ begin if public.valid_invoice('{"vendor":"V","number":"1","company":"A","date":"2026-10-18","currency":"CAD","subtotal":1,"tax":0,"total":-1,"items":[{"description":"a","quantity":1,"unitPrice":1,"amount":1}]}') then raise exception 'Negative invoice total accepted'; end if; end $$;
do $$ begin if public.valid_invoice('{"vendor":"V","number":"1","company":"A","date":"2026-10-18","currency":"CAD","subtotal":1,"tax":0,"total":2,"reviewWarnings":["Mismatch"],"items":[{"description":"a","quantity":1,"unitPrice":1,"amount":1}]}') then raise exception 'Unacknowledged review notes accepted'; end if; end $$;
do $$ begin if not public.valid_invoice('{"vendor":"V","number":"1","company":"A","date":"2026-10-18","currency":"CAD","subtotal":1,"tax":0,"total":2,"reviewWarnings":["Mismatch"],"acknowledgedWarnings":["Mismatch"],"warningsReviewedAt":"2026-10-19T12:00:00Z","items":[{"description":"a","quantity":1,"unitPrice":1,"amount":1}]}') then raise exception 'Acknowledged review notes rejected'; end if; end $$;
rollback;
select 'Isolation, soft delete, owner-only page paths, private quota/purge functions, sign rules and review audit checks passed. Fixtures rolled back.' as result;
