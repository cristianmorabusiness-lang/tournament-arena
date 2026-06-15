# Tournament Arena ⚽🏆

Piattaforma di **pronostici per i Mondiali di calcio**: crea o unisciti a una lega, indovina
i risultati esatti delle partite, e scala sia la classifica della tua lega sia la **classifica
globale** di tutti i giocatori registrati.

Stack: **Next.js (App Router, TypeScript)** + **Supabase** (Postgres, Auth, Realtime, RLS) +
**Tailwind CSS v4**. Sorgente dati partite/squadre/giocatori: **API-Football** (astratta in
`lib/footballApi.ts`, sostituibile).

> ⚠️ Progetto in costruzione incrementale. Questo README viene aggiornato a ogni step.

## Funzionalità

- Registrazione/login con email + password (Supabase Auth).
- Onboarding: scelta della **squadra del cuore** tra le sole nazionali qualificate (popolate dall'API).
- **Leghe**: crea una lega (diventi admin) oppure richiedi di unirti tramite codice.
- **Approvazione membri**: l'admin approva/rifiuta le richieste pending.
- **Pronostici** sul risultato esatto, con **lock temporale**: si bloccano all'orario di inizio
  della prima partita del giorno e diventano sola lettura.
- **Classifica per lega** (aggiornata ogni giorno) + **classifica globale** di tutti i giocatori.

## Motore di punteggio

Per ogni partita conclusa, il pronostico vale:

- **5 punti** → risultato esatto (es. `2-1` vs `2-1`).
- **2 punti** → esito corretto (1 / X / 2).
- **+1 punto** → differenza reti pronosticata uguale a quella reale.

Le regole 2 e +1 si sommano; il risultato esatto vale 5 (cap, non si somma oltre).

| Pronostico | Reale | Punti |
|-----------|-------|-------|
| 2-1 | 2-1 | 5 |
| 3-1 | 2-0 | 3 |
| 1-1 | 2-2 | 3 |
| 2-0 | 2-1 | 2 |
| 1-1 | 2-1 | 0 |

**Bonus giornata (per lega):** a fine giornata chi ha totalizzato **meno** punti riceve **+2**;
in caso di parità all'ultimo posto, ciascun pari-ultimo riceve **+1**. Calcolo idempotente.

## Setup locale

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Crea un progetto su [Supabase](https://supabase.com) e applica lo schema:
   apri la **SQL Editor** del progetto e incolla il contenuto di
   `supabase/migrations/0001_init.sql` (crea tabelle, RLS, funzioni, RPC e trigger).
   In alternativa, con la Supabase CLI: `supabase db push`.
3. In **Authentication → Providers** abilita **Email**. Per provare il flusso in locale
   senza email di conferma, disattiva *"Confirm email"* (Authentication → Sign In / Providers).
4. Copia le variabili d'ambiente e compilale:
   ```bash
   cp .env.example .env.local
   ```
   | Variabile | Descrizione |
   |-----------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pubblica Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server: sync e scoring) |
   | `FOOTBALL_API_KEY` | Chiave API-Football (solo server) |
   | `CRON_SECRET` | Segreto per proteggere gli endpoint cron |

   Variabili opzionali per la sorgente dati (vedi *Sincronizzazione*):
   `FOOTBALL_LEAGUE_ID`, `FOOTBALL_SEASON`, `FOOTBALL_API_BASE`.
5. Avvia in locale: `npm run dev` → http://localhost:3000
6. Build di produzione: `npm run build`
7. Test del motore di punteggio: `npm test`

## Sincronizzazione dati

La sync gira **server-side** con la service role key e popola squadre qualificate,
rose giocatori, calendario e risultati tramite il route handler `/api/sync`.

- **Sorgente:** API-Football v3, astratta in `lib/footballApi.ts` (sostituibile).
  La competizione/stagione si configura con `FOOTBALL_LEAGUE_ID` e `FOOTBALL_SEASON`.
  > ⚠️ [da verificare] L'id della competizione "Mondiali" e la stagione 2026 vanno
  > confermati sul tuo piano API-Football.
- **Trigger manuale in locale** (senza `CRON_SECRET` impostato, solo in dev):
  ```bash
  curl http://localhost:3000/api/sync
  ```
  Con `CRON_SECRET` impostato:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sync
  ```
- **Calcolo punteggi e bonus** (idempotente): `/api/score` (stesso schema di auth).

## Job schedulati (Vercel Cron)

Definiti in `vercel.json`:

| Endpoint | Schedule | Cosa fa |
|----------|----------|---------|
| `/api/sync` | ogni 6 ore | Aggiorna squadre, rose, calendario e risultati |
| `/api/score` | ogni giorno 03:00 UTC | Punteggi, classifica per lega, bonus giornata, classifica globale |

## Deploy su Vercel

1. Push del repo su GitHub e import del progetto su [Vercel](https://vercel.com/new).
2. In **Settings → Environment Variables** aggiungi tutte le variabili di `.env.example`
   (inclusa `SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_API_KEY`, `CRON_SECRET`).
3. In Supabase → **Authentication → URL Configuration** aggiungi il dominio Vercel
   come Site URL / Redirect URL.
4. Deploy. I **Cron Jobs** di `vercel.json` vengono registrati automaticamente e
   inviano l'header `Authorization: Bearer <CRON_SECRET>`.

## Variabili d'ambiente

Vedi `.env.example`. **Nessun segreto va committato**: `.env*` è in `.gitignore`
(eccetto `.env.example`).

## Struttura del progetto

```
app/                 # App Router: landing, auth, area autenticata (app), /api
components/           # UI primitives + componenti di feature
lib/                  # supabase clients, footballApi, scoring, sync, scoreJob
supabase/migrations/  # schema + RLS (0001_init.sql)
```
