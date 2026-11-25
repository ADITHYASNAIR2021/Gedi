# Kerala visual and mobile polish

Verified locally on 12 November 2026.

## What changed

- Rebuilt the menu and overlays around palm green, ivory and kasavu gold, with Malayalam copy, clearer controls, and a compact landscape layout.
- Added curved coconut fronds, bark and elephant skin detail, Kerala temple roof tiers, festival flags, grass, continuous Ghats silhouettes, flowing waterfall textures and animated backwaters.
- Added environment reflections, warm rim lighting, sun glow, contact shadows and a wider, steadier camera.
- Matched release previews to actual launch boosts, gravity, air resistance and the speed limit. Moving anchors constrain relative velocity. Roof and parasol landings require crossing the surface from above.
- Added pointer ownership so another finger cannot release a swing, pointer capture, keyboard tracking, cancellation/blur pauses, rotation pauses and a secure hold on resume.
- Added a large contextual touch control, portrait rotation notice, safe area spacing, optional fullscreen and graceful fullscreen/orientation fallback.
- Limited pixel density by device, added adaptive resolution, batched static scenery, culled rope geometry and combined the particle pool into one draw object. Streamed geometry and elephant contact shadows are disposed when removed.
- Preserved local saves and the optional leaderboard's offline fallback. Blocked cookies no longer prevent startup.

## Automated checks

`npm test`: **24 passed, 0 failed** (latest motion, rewards and anatomy repair).

Coverage includes a two minute constrained swing, coincident and distant catches, moving anchors, matching ballistic previews including speed limiting, release windows, fast roof landings, rejecting below-roof collisions, matching 30/60/120 fps simulations, chapter retry boundaries, the three contact finale and particle pool expiry.

`npm run build`: **passed**. The latest production JS bundle is approximately 721 kB, 199 kB gzip. No new runtime dependency was added. The generated assets omit the local QA controls and QA save namespace.

## Follow-up anatomy and game-feel repair

- Elephants use a black detailed body. Gedi retains the original flat photo head on a more articulated body.
- Fixed a faulty raycast that passed through the open muzzle and hit the rump. The trunk socket is now constrained to the face region; loading rejects stale rigs with the trunk at the rear. Model and rig requests have a new cache revision.
- The corrected baked trunk root is at local X = -2.93 (face) and the tail root at X = 2.31 (rump). Regression checks require those roots to stay on opposite ends in both shipped models. Asset revision `20261112-4` also bypasses previously cached models/rigs.
- Removed the source model's static lower trunk and tail, leaving the animated limbs attached through overlapping skin joins.
- The rescue root overlaps the real belly by 12 cm. The back cloth is sampled from the actual mesh; tests check all 399 cloth vertices against both desktop and phone bodies.
- Baked those attachments into a small shared rig file to avoid hundreds of expensive raycasts during ordinary startup. Both body variants retain the same continuous coat surface.
- Terrain uses a world-space height field, normals and UVs. Depth edges meet the ground; shared tile edges remain continuous. Festival flags now have visible cords and support poles.
- Added photographic terrain, bark, roof and plaster surfaces, outdoor HDR lighting, and separate compressed desktop/mobile photographic forest panoramas. See [asset credits](ASSET_CREDITS.md).
- Catches build assistance gradually; the camera uses damped motion and reduced shake. Bounces include a brief landing compression.
- Elephant personalities expose readable assistance and special-behaviour cues. Collecting chaya and pazhampori in one flight awards +75 and one boosted launch. Successful consecutive beat catches build the melam at 3, 6 and 9 catches.
- Added regression checks for reward order, repeated pickup prevention, flight boundaries, rhythm resets, boosted previews, spring stability, actual model attachment geometry and stale rig rejection.
- Browser inspected face/rump views and phone-layout gameplay. Diagnostic reward buttons exercise simulated events; they do not establish a complete manual playthrough or performance on a physical phone.
- The final phone-preset autoplay reached the first chapter completion card with three lives. Backwater, Munnar and night scenes were smoke checked afterward; no application warnings/errors were observed in that browser session.
- [Final attachment inspection screenshot](screenshots/elephant-attachments-fixed.jpg).

## Browser checks

Chrome was used for development and the built production preview.

- Desktop menu, live attract scene, story, keyboard hold/release, pause, resume and return to menu.
- Landscape sizes **844 × 390**, **667 × 375**, and **568 × 320**. The unlocked Continue menu was checked at the smallest size and its content fits between the header and footer.
- A **390 × 844** portrait viewport shows the rotation notice. Returning to landscape leaves gameplay safely paused.
- All five chapter scenes were launched during development. The local mobile preset disables shadows and antialiasing, uses a 1× render ratio and halves scenery density.
- Touch control UI was exercised through browser pointer input. This is a desktop preview of the phone control, not a physical touchscreen test.
- A Munnar run using the local mobile graphics preset and auto swing reached **311 metres with three lives**. This exercises procedural streaming and repeated catches. It is not a physical mobile performance measurement.
- Local QA controls exercised the normal chapter completion card, all three finale contacts, the victory card, results, chapter retry and the offline leaderboard message. These controls trigger encounters directly; they are not evidence of completing the entire story by hand.
- No application warnings or errors were observed in the final production browser check.

The local Gedi QA page is `http://localhost:5173/gedi/?inspect&mobile`. It is development-only and uses a separate save slot. The release build omits the inspector entirely.

## Remaining external checks

- Test physical iPhone Safari and Android Chrome for sustained frame rate, multi-touch, audio interruptions, notches, browser bars and fullscreen behavior. Responsive browser previews cannot establish those results.
- The global leaderboard is not configured in this local environment. Its offline fallback works; credentialed Redis submission and deployed rankings have not been verified.
- Photographic surfaces and scenery improve realism, while Gedi's requested 2D cutout head and several gameplay props remain stylized. The whole game is not photorealistic.

## Saved previews

- [Desktop menu](screenshots/kerala-desktop.jpg)
- [Landscape menu](screenshots/kerala-landscape.jpg)
- [Landscape gameplay](screenshots/kerala-gameplay.jpg)
