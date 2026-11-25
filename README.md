# Gedi Games

A browser arcade built with Vite. Both games launch from the picker at `/`.

- **Gedi the Tarzan** at `/gedi/` is a Three.js elephant swing adventure through five Kerala chapters. Hold to grab a trunk or tail and release to fly. On a phone, play in landscape.
- **Namboothiri vs. the Mosquitoes** at `/namboothiri/` is a portrait Canvas 2D game. Hold and drag to aim, then release to fire. A gold charge widens the shot and refunds one round on a double zap. Gold-winged mosquitoes replenish two rounds. On a keyboard, aim with the arrows and hold and release Space. Survive three nights to unlock Endless Buzz, where later waves bring faster, denser swarms.

Each game saves its own progress on the device. Sound, Voice and Theri preferences are shared. Namboothiri uses the supplied portrait, synthesized effects and captioned reactions.

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
