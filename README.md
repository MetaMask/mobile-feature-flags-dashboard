# MetaMask Mobile Feature Flags Dashboard

A Next.js dashboard for viewing MetaMask mobile production feature flags from the client-config API.

## Features

- Fetches flags from `https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=prod`
- Groups flags into **Threshold** (array values) and **Config** (everything else)
- Detects **fully rolled out** threshold flags where every array entry has `scope.value === 1`
- Persists first-seen rollout timestamps in browser `localStorage` under the `fullyRolledOut` key
- Highlights how long each flag has been fully rolled out
- Flags threshold rollouts older than **180 days** for cleanup review

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — run the production server
- `npm run lint` — run ESLint

## Local storage

When a threshold flag becomes fully rolled out, the dashboard records the first observed timestamp:

```json
{
  "homeTMCU926AbtestDiscoveryPills": "2026-06-29T16:00:00.000Z"
}
```

Timestamps are preserved across refreshes so rollout duration can be tracked over time.
