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
2. Copia le variabili d'ambiente e compilale:
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
3. Avvia in locale:
   ```bash
   npm run dev
   ```
4. Build di produzione:
   ```bash
   npm run build
   ```

## Sincronizzazione dati

> Da completare allo Step 4. La sync gira **server-side** con la service role key e popola
> squadre qualificate, rose giocatori, calendario e risultati tramite `/api/sync`, schedulata
> via Vercel Cron.

## Deploy su Vercel

> Da completare allo Step 11 (variabili d'ambiente, cron job).

## Variabili d'ambiente

Vedi `.env.example`. **Nessun segreto va committato**: `.env*` è in `.gitignore`.
