# Master Plan — Gedi the Tarzan

## Tech stack
| Layer | Choice | Why |
|---|---|---|
| Rendering | Three.js (r170) | Real 3D in the browser, no engine download |
| Build | Vite 6 | Fast dev server, static output Vercel understands |
| Physics | Custom Verlet-style point + rope constraint | Tiny, deterministic, exactly the swing feel we want |
| Audio | Web Audio API synthesis + Web Speech API | Zero audio assets, instant load |
| UI | DOM overlay + CSS | Crisp text, accessible buttons |
| Backend | Vercel Function `api/scores.js` + Upstash Redis REST | Free tier, no server to manage |

All art is procedural low-poly geometry. The only images are Gedi's face texture and three story photos in `public/assets/`.

## Code map
```
index.html              app shell + UI overlay markup
src/main.js             boot, state machine (menu → story → play → card → over)
src/style.css           UI styling
src/core/device.js      device profile + device ID
src/core/storage.js     local best scores & settings
src/core/leaderboard.js /api/scores client
src/core/audio.js       procedural music + SFX + announcer
src/world/scene.js      renderer, camera, lights, sky/fog per biome
src/world/environment.js streamed props (palms, temple, hills, water, tea)
src/world/fx.js         pooled particles (dust, splash, confetti, fireworks)
src/entities/elephant.js elephant model, animation, stretchy trunk/tail
src/entities/gedi.js    Gedi model with face texture + poses
src/entities/props.js   monkeys, coconuts, bus, boats, collectibles meshes
src/game/swing.js       swing physics
src/game/level.js       procedural elephant/encounter generator per chapter
src/game/game.js        gameplay loop, scoring, collisions
src/game/story.js       chapters, dialogue, callouts
src/ui/hud.js           HUD, popups, dialogs, leaderboard view
api/scores.js           leaderboard serverless function
```

## Milestones
| # | Milestone | Deliverable | Status |
|---|---|---|---|
| M0 | Design | Overview, PRD, master plan | ✅ |
| M1 | Core swing | Scene, Gedi, elephants, rope physics, camera, fail/respawn | ✅ |
| M2 | Game feel | Combo, perfect release, beat bonus, callouts, particles, SFX | ✅ |
| M3 | World & story | 5 biomes, encounters, intro panels, chapter cards, boss, victory | ✅ |
| M4 | Device & scores | Device profile, quality presets, local best, leaderboard API | ✅ |
| M5 | Ship | Vercel deploy, Upstash hookup, share link to the group | ⏭ next |
| M6 | Polish (post-launch) | Tune difficulty from friend feedback, more quirks (see backlog) | backlog |

## Run locally
```bash
npm install
npm run dev          # game at http://localhost:5173 (leaderboard offline)
npx vercel dev       # game + /api/scores locally (needs env vars)
npm run build        # production build to dist/
```

## Deploy to Vercel
1. Push this folder to a GitHub repo (the `Adarshh Images/` originals are git-ignored; only the processed images in `public/assets/` ship).
2. vercel.com → **Add New Project** → import the repo. Framework preset: **Vite** (auto). Build `npm run build`, output `dist`.
3. **Leaderboard (optional):** Project → Storage → **Upstash for Redis** (Marketplace) → create & connect. This injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `_TOKEN`) — `api/scores.js` reads either pair.
4. Redeploy. Open the URL on a phone, play a run, check the leaderboard tab.
5. Share the link in the group. 🐘

## Tuning knobs (`src/game/level.js`, `src/game/swing.js`)
- `TUNING` in `src/game/swing.js` (gravity, pump, fling, reel…) — swing feel. Live-tweak in the console via `__gedi.tuning`.
- `GRAB_RADIUS` — how far Gedi can reach.
- `CHAPTERS` in `src/game/story.js` — chapter lengths, elephant gap range, pedestals, encounter rates, music tempo.

Autoplay bot benchmark (perfect-ish releases): ~4 m/s, full story (2000 m) in ~8 min, ~30 pts/s.

## Backlog ideas
- Ghost replay of your best run.
- Unlockable skins (Gedi in mundu, Gedi in Pooram umbrella hat).
- Daily seed challenge shared to WhatsApp.
- Real recorded voice lines from the friends ("Ente Gedi!").
- Elephant name cards ("You swung on 47 elephants. Favourite: Kannan").
