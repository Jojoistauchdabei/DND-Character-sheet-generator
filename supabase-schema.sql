-- ============================================================
-- D&D Charakterbogen – Supabase Schema
-- Einfuehren im Supabase-Dashboard: SQL Editor -> New query
-- diesen kompletten Inhalt einfuegen -> Run
-- ============================================================

-- updated_at automatisch pflegen (moddatetime-Erweiterung)
create extension if not exists moddatetime with schema extensions;

-- ------------------------------------------------------------
-- Charakter-Slots (ein Charakterbogen pro Zeile, Inhalt als JSONB)
-- ------------------------------------------------------------
create table if not exists public.sheets (
  id         uuid not null default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  slot_id    text not null,
  name       text not null default '',
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, slot_id)
);

-- ------------------------------------------------------------
-- DM-Zustand (HP-Tracker der Kreaturen etc.)
-- ------------------------------------------------------------
create table if not exists public.dm_state (
  user_id uuid primary key default auth.uid(),
  data   jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Row Level Security: Jeder User sieht NUR seine eigenen Daten
-- ------------------------------------------------------------
alter table public.sheets   enable row level security;
alter table public.dm_state enable row level security;

drop policy if exists "own sheets"   on public.sheets;
drop policy if exists "own dm state" on public.dm_state;

create policy "own sheets" on public.sheets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own dm state" on public.dm_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at bei UPDATE automatisch setzen
drop trigger if exists sheets_moddatetime   on public.sheets;
drop trigger if exists dm_state_moddatetime on public.dm_state;

create trigger sheets_moddatetime
  before update on public.sheets
  for each row execute procedure extensions.moddatetime(updated_at);

create trigger dm_state_moddatetime
  before update on public.dm_state
  for each row execute procedure extensions.moddatetime(updated_at);
