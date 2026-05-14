-- ─────────────────────────────────────────────────────────────────────────────
-- seed.sql — minimal seed for local dev and first deploy.
--
-- Only the two founders are seeded. All other contributors land in
-- public.contributors as 'community' when the ingest function first sees
-- them, and you can promote anyone to 'core' from /admin (or via this file)
-- later. Founders are a marker, never a filter — see ARCHITECTURE.md §6.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.contributors (github_login, display_name, role)
values
  ('erikzhang', 'Erik Zhang',  'founder'),
  ('dahongfei', 'Da Hongfei',  'founder')
on conflict (github_login) do update
  set display_name = excluded.display_name,
      role         = excluded.role;
