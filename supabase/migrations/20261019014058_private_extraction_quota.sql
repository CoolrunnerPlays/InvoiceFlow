create schema if not exists private;
alter function public.claim_extraction() set schema private;
revoke all on function private.claim_extraction() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.claim_extraction() to authenticated;
create function public.claim_extraction() returns boolean language sql security invoker set search_path = '' as $$ select private.claim_extraction(); $$;
revoke all on function public.claim_extraction() from public, anon;
grant execute on function public.claim_extraction() to authenticated;
