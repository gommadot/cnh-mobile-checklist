# Checklist Verniciatura & Pre-shipment - Static Mobile App

App mobile statica (HTML/CSS/JS puro) che parla **direttamente con Supabase**
via REST API + Realtime. Deploy su Vercel in 1 click.

## Stack
- Frontend: HTML + CSS + JS vanilla, supabase-js v2 da CDN, PWA-ready
- Backend: nessuno (parla direttamente con Supabase REST + Realtime)
- Hosting: Vercel (gratuito, CDN globale, HTTPS automatico)

## Tabella attesa su Supabase

`public.painting_preshipment_jobs` con colonne:
`id (bigserial pk), pline text, van text, telaio text, note text,
verniciato bool, verniciato_at text, verniciato_by text,
preshipment bool, preshipment_at text, preshipment_by text,
created_at text, updated_at text`

## Setup

1. **Su Supabase**: SQL Editor -> incolla e Run il file `supabase_rls.sql`.
2. **GitHub**: crea un repo nuovo (es. `cnh-mobile-checklist`).
3. **Locale (in questa cartella `mobile-static/`)**:
   ```
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/TUO-USERNAME/cnh-mobile-checklist.git
   git push -u origin main
   ```
4. **Vercel**: New Project -> Import dal repo GitHub -> Deploy.
   - Framework Preset: `Other`
   - Root Directory: `/` (questa cartella e' gia' la root del repo)
   - Build Command: (vuoto)
   - Output Directory: (vuoto, e' tutto statico)

## URL finale

Dopo il deploy: `https://NOME-REPO.vercel.app`. Custom domain gratis dalle settings Vercel.

## Cambiare la URL/key di Supabase

Modifica le costanti `SUPABASE_URL` e `SUPABASE_ANON_KEY` in cima a `index.html`,
poi `git commit && git push`. Vercel ridistribuisce automaticamente.

## Sicurezza

La pagina usa la **anon key** (sicura per il browser). Le policy RLS in
`supabase_rls.sql` permettono solo SELECT e UPDATE al ruolo anon: nessun
INSERT/DELETE dalla pagina mobile. L'app d'ufficio usa la service_role key
lato server per gestire la lista.
