# Kerala game upgrade

This log tracks the approved audio, elephant and scenery work. The references below are the working source shortlist.

| Work | Status | Check before completion |
|---|---|---|
| Chendamelam loop and voice priority | Implemented | Recorded 22.548-second loop with 36 mapped beat accents. Web Audio ducks the bed and ambience during the foreground voice and resumes Onam from the interrupted position. |
| Elephant presentation and Aana Album | Implemented | Added real coat and trunk textures, refined head silhouette and fitted ornaments on the existing rig. Twelve named encounters unlock the Album on first grab and persist in the existing local save. |
| Pooram and Thirunakkara | Implemented | Rebuilt the large Pooram entrance and night lamps. Kottayam appears as a photographed story interlude before Alappuzha. |
| Athirappilly | Implemented | Wide real-photo waterfall set piece with animated flow highlights, rocks and spray. |
| Alappuzha | Implemented | Punnamada photo backdrop, low banks, moving chundan vallams with 20 animated paddlers, and a one-time 45-point race rescue. |
| Munnar | Implemented | Curved tea rows, shade trees and valley mist layered behind the swing route. |
| Paappans, riders and crowds | Implemented | Seated paappans, animated fans and whisks, instanced cheering spectators and chenda players. |
| Build and local playtest | Complete | All 34 tests and the production build passed. Smoke-tested the five chapters and the compact Album in Chrome. |
| Physical phone playtest | Pending | Check sustained frame rate, touchscreen handling, loop seam and speaker balance on iPhone Safari and Android Chrome. |
| Public audio reuse | Awaiting source details | Confirm source or permission for the supplied tracks before public distribution. |

## Audio preparation

The prepared melam uses the 0.400–22.948-second region of the supplied recording. An 18 ms blend at the loop seam softens the cut. The game uses the measured accented transients for Thaalam timing and can fall back to its procedural score if the recording cannot load.

## Playtest notes

- A live swing to Guruvayur Kesavan triggered the unlock toast. The Album kept the entry after a reload.
- Chrome entered all five chapter scenes in a 568 × 320 touch preview. The Kottayam interlude displayed the real temple photo before the Alappuzha card.
- The moving race deck awarded 45 points in Chrome. The rescue check gives the deck priority above the elephant sling in water.
- Onam resumed after recorded Myre and Aiyooo reactions in Chrome. It also paused and resumed with the game and handed back to the melam. Automated checks cover clip priority and the first beat after the loop wraps.
- At 568 × 320 the Album scrolls internally and the replay control fits in the viewport. The standard menu opens the Album outside the inspector.

## References and resources

- Audio is supplied in `Audio/`, including a 25.89-second chendamelam recording. Release source or reuse permission for the supplied recordings remains to be confirmed before public distribution.
- Elephant anatomy and ornaments. [Elephant with paappan](https://commons.wikimedia.org/wiki/File:Elephant_in_Kerala_with_Pappan.JPG) · [Pooram caparison](https://commons.wikimedia.org/wiki/File:The_Caparisoned_Giant_-_Thrissur_Pooram_-_May_6,_2025.jpg)
- Temple profiles. [Vadakkunnathan entrance](https://commons.wikimedia.org/wiki/File:Vadakkumnathan_Temple_Main_Entrance.jpg) · [Thirunakkara Temple](https://commons.wikimedia.org/wiki/File:Thirunakkara_Mahadeva_temple_20230915.jpg)
- Regional landmarks. [Athirappilly falls](https://commons.wikimedia.org/wiki/File:Athirappilly_Waterfall.jpg) · [Nehru Trophy chundan vallams](https://commons.wikimedia.org/wiki/File:NehruTrophyBoatRace2024.jpg) · [Munnar plantations](https://commons.wikimedia.org/wiki/File:Mist_covered_Tea_Gardens_in_Munnar.jpg)
- Festival people and staging. [Thrissur Pooram night](https://commons.wikimedia.org/wiki/File:%E2%80%9CDazzling_Thrissur_Pooram_night_with_caparisoned_elephants_and_illuminated_temple,_Kerala%E2%80%9D.jpg)
- Reused files, photographers and licenses. [In-game photo credits](../public/assets/kerala/credits.html)

Public visual sources cover the initial work. Clear front and side photographs of a specific elephant, a licensed Asian elephant model, or a clean chendamelam master would support a closer likeness or a longer loop if supplied.
