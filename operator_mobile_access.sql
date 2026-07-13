-- Permessi centralizzati dell'app operatore.
-- Eseguire una volta nel SQL Editor del progetto Supabase.
CREATE TABLE IF NOT EXISTS public.operator_mobile_access (
  operator_key text PRIMARY KEY,
  operator_name text NOT NULL,
  can_view_all boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operator_mobile_access_view_all_idx
  ON public.operator_mobile_access (can_view_all)
  WHERE can_view_all = true;

ALTER TABLE public.operator_mobile_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.operator_mobile_access FROM anon, authenticated;

COMMENT ON TABLE public.operator_mobile_access IS
  'Permessi app mobile gestiti dal portale admin tramite service role.';
