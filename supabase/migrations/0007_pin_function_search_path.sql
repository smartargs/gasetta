-- ─────────────────────────────────────────────────────────────────────────────
-- 0007_pin_function_search_path.sql — pin search_path on public functions.
--
-- Supabase security advisor flags any function whose search_path is mutable.
-- The concern: an attacker who can influence the caller's search_path could
-- in theory shadow an unqualified name (table/type/operator) referenced
-- inside the function with their own object in a controlled schema, causing
-- the function to operate on the wrong target.
--
-- `public.set_updated_at` doesn't reference any unqualified names beyond
-- `now()` (pg_catalog) — it's not actually exploitable — but the advisor
-- doesn't analyze function bodies, only their definition. Pinning the
-- path satisfies the lint and removes the warning class for good.
-- ─────────────────────────────────────────────────────────────────────────────

alter function public.set_updated_at() set search_path = pg_catalog;
