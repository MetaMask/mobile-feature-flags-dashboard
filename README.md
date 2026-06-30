# MetaMask Feature Flags Dashboard

A Next.js dashboard for viewing MetaMask feature flags from the client-config API across clients and environments.

## Features

- Fetches flags from `https://client-config.api.cx.metamask.io/v1/flags`
- Compares **mobile** and **extension** across **dev**, **prod**, and **test** (distribution: `main`)
- Groups flags by name with types: **boolean**, **threshold** (array), **config** (object), **other**
- Detects **fully rolled out** threshold flags where every array entry has `scope.value === 1`
- Persists first-seen rollout timestamps in **Postgres** (Vercel Postgres)
- Highlights how long each flag has been fully rolled out
- Flags threshold rollouts older than **180 days** for cleanup review

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

Fully rolled out flag timestamps are stored in Postgres, not the browser.

1. Create a Postgres database (e.g. [Vercel Postgres / Neon](https://vercel.com/marketplace/category/storage))
2. Set `POSTGRES_URL` in `.env.local` for local dev and in Vercel project environment variables for production
3. The schema is created automatically on first request, or run manually:

```bash
psql "$POSTGRES_URL" -f db/schema.sql
```

Table: `fully_rolled_out_flags`

| Column | Description |
|--------|-------------|
| `context_key` | e.g. `mobile/prod` |
| `flag_name` | Feature flag name |
| `recorded_at` | First time the flag was observed fully rolled out |

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — run the production server
- `npm run lint` — run ESLint

## Deploy on Vercel

```bash
npx vercel login
npx vercel link --yes --project mobile-feature-flags-dashboard
npx vercel deploy --prod --yes
```

Add a Postgres storage integration (Neon via Vercel Marketplace) to the project and set `POSTGRES_URL` before expecting rollout tracking to work in production.
