-- ============================================================================
-- Registro dispositivi operatori (nome + id telefono) per la gestione admin.
-- Da incollare in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Accesso: SOLO service_role (le funzioni serverless).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operator_devices (
  device_id   text PRIMARY KEY,
  op_key      text NOT NULL,
  op_name     text NOT NULL,
  op_role     text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operator_devices_key_idx ON public.operator_devices (op_key);

ALTER TABLE public.operator_devices ENABLE ROW LEVEL SECURITY;
