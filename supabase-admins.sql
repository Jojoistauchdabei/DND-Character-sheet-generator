-- ============================================================
-- Admin-Zugriff: E-Mail-Adressen mit Admin-Recht
-- ============================================================

create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Keine Policies: nur der Service-Role (Supabase Edge Functions) darf lesen.
-- Anonyme und normale User haben keinen Zugriff auf diese Tabelle.
