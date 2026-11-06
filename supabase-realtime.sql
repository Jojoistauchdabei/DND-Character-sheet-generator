-- ============================================================
-- Live-Sync (Realtime) aktivieren: Tabellen in die
-- supabase_realtime-Publication aufnehmen (idempotent)
-- ============================================================

do $$
begin
  alter publication supabase_realtime add table public.sheets;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_state;
exception
  when duplicate_object then null;
end $$;

-- Sicherstellen, dass bestatigte Rows genug Felder fuer DELETE-Events haben
alter table public.sheets replica identity full;
alter table public.dm_state replica identity full;
