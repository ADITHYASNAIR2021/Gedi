# Gedi the Tarzan

A browser-based Kerala elephant swing adventure built with Three.js and Vite.
Hold to grab a trunk or tail, release to fly, and chase Kuttappan through five chapters.
Supports desktop controls and landscape phone layouts.

## Run locally

Install Node.js, then run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).
For a phone on the same Wi-Fi, use `npm run dev -- --host 0.0.0.0` and open the printed network URL.

## Check and build

```sh
npm test
npm run build
npm run preview
```

The production output is written to `dist/`. Vercel configuration is included.
The optional global leaderboard requires Upstash Redis environment variables; local scores work without it.

See [game overview](docs/OVERVIEW.md), [verification notes](docs/VERIFICATION.md), and [asset credits](docs/ASSET_CREDITS.md).
The [Kerala upgrade log](docs/KERALA_UPGRADE.md) tracks implementation, checks and source material.
Prepared runtime assets are included. Large preparation sources, private original photographs, local environment files, dependencies and build output are excluded.
