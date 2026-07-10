-- ============================================================================
-- Tabella subscription Web Push (notifiche solleciti per reparto)
-- Da incollare in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Accesso: SOLO service_role (le funzioni serverless). Nessun accesso anon.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint    text PRIMARY KEY,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  role        text NOT NULL DEFAULT 'all',   -- 'paint' | 'pre' | 'all'
  op_name     text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_role_idx
  ON public.push_subscriptions (role);

-- RLS attiva senza policy => anon/authenticated NON accedono.
-- Il service_role (usato dalle funzioni /api/push-*) bypassa la RLS.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
