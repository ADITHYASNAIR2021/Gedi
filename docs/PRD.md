# PRD — Gedi the Tarzan: Aana Swing Saga

| | |
|---|---|
| Owner | Adithya (friend group project) |
| Status | v1.0 built |
| Platform | Web (desktop + mobile browsers), hosted on Vercel |

## 1. Problem / goal
Make a fun, shareable tribute game for Adarshh "Gedi" S Kumar that friends can open from a link, play in under 5 seconds, laugh at, and compete on high scores.

**Success looks like**
- Friends play more than 3 runs per session (one-more-try loop).
- A run starts in under 5 seconds from opening the link on a phone.
- The leaderboard gets used — people send screenshots of their score to the group.

## 2. Target users
- Gedi's friend circle (primary): mobile-first, WhatsApp-shared link, Malayalam/Manglish humour.
- Casual players (secondary): need zero instructions beyond "hold & release".

## 3. Core gameplay requirements

### 3.1 Controls (one button)
| Input | Desktop | Mobile |
|---|---|---|
| Grab / hold | Hold mouse button or Space | Touch & hold anywhere |
| Release / fly | Release | Lift finger |
| Pause | P / Esc / pause button | Pause button |

- Holding while out of range **auto-grabs** the nearest anchor ahead as soon as one comes into reach.
- Grab radius ≈ 7.5 m; anchors behind Gedi are ignored.

### 3.2 Swing physics
- Gedi is a point mass with gravity (−24 m/s²), light air drag, fixed 120 Hz substeps.
- Attached = rope constraint (trunk/tail is a flexible rope: slack allowed, inextensible when taut).
- On grab the trunk **flings** Gedi forward (minimum swing speed) and reels in (~20%) to build momentum; it snaps in fast if the arc would scrape the ground.
- Auto-pump: while hanging, the swing builds itself up like a kid on a swing.
- Release keeps current velocity → projectile flight.

### 3.3 Anchors
- Every elephant offers **two anchors**: trunk tip (front, high) and tail tip (rear, lower). Travel order: nose → tail → next nose.
- The trunk/tail mesh stretches from the elephant to Gedi's hands while held.
- Elephant variants: normal, **Kuttiyaana** (baby, small, 2× points), **Sleepy** (trunk droops while held), **Sneezy** (launches Gedi after ~0.9 s), **Parasol** (Kudamattam umbrella on top = bounce pad).

### 3.4 Health and recovery
- Start with 100 HP. An unshielded ground or water fall costs 35 HP and respawns Gedi on a nearby elephant with 2 seconds of protection. The run ends at 0 HP.
- **Rescues:** parasol tops, KSRTC roofs and snake boats bounce Gedi upward. An auto canopy gives a faster forward launch. Chaya absorbs one hit or fall.

### 3.5 Scoring
- Distance: 2 pts per metre.
- Pazhampori: 3 pts × combo multiplier.
- **Perfect release** (upward angle 20–70°, good speed): small speed boost; when the next grab is further ahead → "PWOLI!" callout, +5 × combo, combo +1 (no farming one trunk).
- **Thaalam** (release within ±110 ms of a chenda beat): extra boost; +3 × combo on the next forward grab.
- Kuttiyaana grab: +10 × combo. Catching Kuttappan: +150.
- Combo multiplier ×1 … ×5, reset by bonks and falls.

### 3.6 Encounters
| Encounter | Effect |
|---|---|
| Monkey banana throw | 15 HP damage and a light knockback |
| Falling coconut | Visible warning, 25 HP damage and a heavier knockback |
| Parasol (Kudamattam) | Bounce pad |
| KSRTC bus (land chapters) | Rolling bounce pad on the ground |
| Snake boat (backwaters) | Bounce pad on the water |
| Sneezy elephant | Forced launch upward/forward |
| Chaya glass | One-time fall shield |
| Chakka (jackfruit) | Restores up to 30 HP or awards 25 points at full health |
| Kuttappan the monkey (chapter end) | Touch him to advance the story |

### 3.7 Story & progression
- Intro: 3 comic panels with real photos (skippable, shown once per device, replayable from the menu).
- Chapters by distance: 0 / 300 / 650 / 1050 / 1500 m, finale ends at 2000 m; boss at each end.
- Chapter card between chapters (game paused, tap to continue).
- Victory after chapter 5 → Encore (endless). Best "chapter reached" is stored.

### 3.8 Audio (fully procedural, no audio files)
- Music: chenda melam rhythm + elathalam cymbals + kombu horn calls; tempo rises per chapter.
- SFX: elephant trumpet, grab "thwip", release whoosh, collect ting, bonk, splash/thud, sneeze, bounce, fireworks.
- Announcer (Web Speech API) for callouts — toggleable, rate-limited.
- Audio unlocks on first user gesture (mobile autoplay rules).

## 4. Device identification & high scores
- **Device profile:** type (mobile/tablet/desktop), OS, browser, touch support, GPU tier guess → drives quality preset (pixel ratio, shadows, prop density) and control hints. Shown as a chip in the menu ("Playing on iPhone · Safari").
- **Device ID:** random UUID created on first visit, stored in `localStorage` + a first-party cookie (400 days) as backup. No invasive fingerprinting.
- **Local high score:** best score, best distance, best chapter, total runs — stored per device.
- **Global leaderboard (optional):** Vercel serverless function `/api/scores` backed by Upstash Redis (Vercel Marketplace). Top 20, one entry per device (keeps the best), nickname + device icon. On load the server best is merged into local best so a device keeps its record.
- If the leaderboard isn't configured, the game silently runs local-only.

### API contract
`GET /api/scores` → `{ configured, top: [{ name, score, device, chapter }] }`
`GET /api/scores?id=<deviceId>` → also `{ me: { score, rank } }`
`POST /api/scores` body `{ deviceId, name, score, distance, chapter, duration, device }` → `{ ok, best, rank }`

**Validation at the boundary:** deviceId `^[a-zA-Z0-9-]{8,64}$`; name trimmed to 16 chars, letters/digits/space/`._-` only; score integer 0–2,000,000; plausibility `score ≤ 60 × duration + 500`; rate limit 1 submission / 5 s / device; `ZADD GT` keeps only improvements.

## 5. Non-functional requirements
- 60 fps on mid-range desktop; ≥ 40 fps on a 3-year-old phone (low preset).
- Initial JS < 700 KB gzipped (Three.js dominates). No external model/audio downloads.
- Works offline after load except leaderboard.
- Landscape and portrait both playable; UI respects safe areas.
- No secrets in the client or repo; Redis credentials only in Vercel env vars.

## 6. Out of scope (v1)
Accounts/login, multiplayer, skins shop, ads, analytics beyond Vercel defaults, native app.

## 7. Risks
| Risk | Mitigation |
|---|---|
| Score tampering via devtools | Plausibility check + rate limit; it's a friends' game, not a casino |
| Mobile perf | Low preset, no shadows, DPR cap 1.5, simple materials |
| iOS audio lock | Resume AudioContext on first touch |
| Using a real person's photo publicly | Gedi's consent before sharing the public link |
