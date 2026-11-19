# Asset sources and preparation

All game assets are served locally. No asset service is contacted during play.

## Elephant

- Source: [African elephant, original Innerscene model](https://www.innerscene.com/tools/library/3d-parts/african-elephant-30c02485), offered as CC0 on the source page.
- Adapted for this game: smaller ear profile, black coat, live trunk and tail, Kerala finery, shared material batches, compressed images and a phone texture tier. This is an artistic adaptation, not an anatomically exact Asian elephant scan.
- Original retained under `scripts/source/elephant.glb`. Run `python scripts/prepare-elephant.py` and `python scripts/prepare-elephant.py --low` to rebuild the models; run `node scripts/prepare-rig.mjs` afterward to bake the shared attachment points and fitted cloth.
- The coat is preserved as a continuous mesh in both variants. Simplifying it with vertex clustering introduced holes at UV seams, so the phone variant reduces small details and image sizes instead.

## Photographic materials and panoramas

From [Poly Haven](https://polyhaven.com/license), whose asset library is CC0:

- [Rocky Trail](https://polyhaven.com/a/rocky_trail): ground and rock colour/normal maps.
- [Brown Mud Leaves 01](https://polyhaven.com/a/brown_mud_leaves_01): forest ground colour/normal maps.
- [Bark Brown 01](https://polyhaven.com/a/bark_brown_01): palm bark colour/normal maps.
- [Roof Tiles 14](https://polyhaven.com/a/roof_tiles_14): temple roof photograph.
- [Plastered Wall 02](https://polyhaven.com/a/plastered_wall_02): temple wall photograph.
- [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock): hill surface photograph.
- [Kloofendal 48d Partly Cloudy Pure Sky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky): outdoor HDR lighting and sky.
- [Rainforest Trail](https://polyhaven.com/a/rainforest_trail): photographed forest panorama, converted from a 4K HDR source into desktop and mobile WebP images. This is a nature backdrop, not a photograph of the named Kerala locations.

Texture maps are compressed to 1K WebP. The HDR sky stays at 1K for lighting. The visible forest panorama uses a separate higher-resolution image; the 1K HDR was visibly blocky when used directly as scenery.

Gedi's supplied face photograph remains a flat alpha cutout. His body, other characters, architecture, foliage, effects and props use game geometry; the complete scene is not photorealistic.

## Vehicle photography and audio

- [Vehicle photo credits](../public/assets/vehicles/credits.html) list the Wikimedia Commons photographers, adaptations and CC BY-SA 3.0 license for the KSRTC and auto textures.
- [Kerala photo credits](../public/assets/kerala/credits.html) identify the elephant textures, temple roof and landmark photographs. The game exposes both credits pages from the pause menu.
- The Aiyooo and Myre reactions, the Onam radio clip and the source recording for the chendamelam loop come from the supplied files in `Audio/`.
