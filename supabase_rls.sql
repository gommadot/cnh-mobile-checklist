-- ============================================================================
-- RLS per painting_preshipment_jobs (verniciatura / pre-shipment)
-- Da incollare in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

-- 1) Attiva RLS sulla tabella
ALTER TABLE public.painting_preshipment_jobs ENABLE ROW LEVEL SECURITY;

-- 2) Pulizia eventuali policy precedenti con stessi nomi
DROP POLICY IF EXISTS "anon read"   ON public.painting_preshipment_jobs;
DROP POLICY IF EXISTS "anon update" ON public.painting_preshipment_jobs;

-- 3) Permette al ruolo anon di LEGGERE tutte le righe
CREATE POLICY "anon read"
  ON public.painting_preshipment_jobs
  FOR SELECT
  TO anon
  USING (true);

-- 4) Permette al ruolo anon di AGGIORNARE le righe (per spuntare verniciato/preshipment).
--    NB: INSERT e DELETE restano riservati al service_role (l'app office).
CREATE POLICY "anon update"
  ON public.painting_preshipment_jobs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5) Abilita la pubblicazione Realtime (necessaria per gli aggiornamenti live nel browser).
--    Blocco idempotente: non fallisce se la tabella e' gia' stata aggiunta.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.painting_preshipment_jobs;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 6) Verifica
SELECT polname, polcmd, polroles::regrole[]
FROM pg_policy
WHERE polrelid = 'public.painting_preshipment_jobs'::regclass;
