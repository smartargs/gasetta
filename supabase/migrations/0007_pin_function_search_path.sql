-- Pin search_path on public functions so the supabase security advisor stops
-- flagging mutable-search-path warnings.

alter function public.set_updated_at() set search_path = pg_catalog;
