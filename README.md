# Pokébonk — Wild Run

A playable, original browser prototype of a Pokémon-themed arena survivor inspired by Megabonk. Choose Pikachu, Charmander, Bulbasaur, or Squirtle. Move freely through a 3D clearing while moves attack automatically. Collect XP candy, select held items and moves, open chests, evolve at level eight, and survive the alpha encounters. Defeat Mewtwo and survive three minutes to win.

## Play locally

From your regular WSL terminal:

```bash
python3 /home/stets/projects/pokemon-megabonk/serve-game.py
```

Open `http://localhost:8090`. The launcher tries to open your Windows browser. Keep the terminal running. Refresh to load edits.

WASD or arrows move relative to the camera. Space jumps; Shift dashes. Move the mouse to look around without holding a button; the camera eases smoothly into turns. Starting a desktop run captures the pointer when supported, and Escape releases it. Touch camera control uses dragging. Hold C to slide downhill with momentum. E opens nearby chests for 15 coins or activates a crystal shrine. Stay within a shrine’s ring for six seconds to earn a one-time upgrade; leaving the ring pauses its charge. Escape pauses. The upgrade screen accepts 1/2/3. Touch devices have a movement stick and action buttons. Each run begins with a skippable 2.8-second portal entrance; Escape skips it, and enemies and the run timer wait until it ends. The top diamond badge shows your level. The sound button toggles original synthesized music and effects. Audio starts after a user gesture.

## How it works

- `dist/engine.js` owns the simulation: position, collision, enemy waves, attacks, drops, leveling, upgrades, and victory. It has no browser dependencies. Seeded random numbers allow repeatable tests.
- `dist/renderer.js` uses Three.js r180 with glTF Pokémon models, skeletal animation blending, three-band toon shading, inverted-hull character outlines, directional-light shadow maps, 64-pixel character texture atlases, nearest-filtered pixel terrain, and wind-driven grass. Candy, projectiles, grass, and flowers use instancing: many copies are submitted together to keep draw calls low. Camera rotation uses horizontal yaw and vertical pitch; pitch is clamped above the ground.
- `dist/actor-lifecycle.js` lazily binds clips, stops completed crossfades, and frees each removed actor's skeleton textures and materials without disposing shared species geometry or image textures. The animation loop catches JavaScript failures and exposes `window.pokebonkCrash` with the error and scene counts.
- `dist/terrain.js` supplies shared rolling hills and gradients for terrain placement and downhill sliding. `dist/camera-motion.js` uses frame-rate independent easing. `dist/world-props.js` builds hinged treasure chests, charge shrines, and the pixelated shader portal.
- `dist/models.js` identifies all starter, evolution, enemy, and boss assets. `dist/overlay.js` draws damage labels and attack accents above the 3D scene. The game pauses while an encounter's assets load, so unseen enemies cannot attack.
- `dist/app.js` connects input and interface elements to the simulation and renderer. It pauses on loss of focus, displays upgrade choices, and saves the best run locally.
- `dist/audio.js` uses the Web Audio API to schedule an original melody, bass, drums, and short effects. Notes are synthesized, so no audio downloads are needed.
- `dist/style.css` handles the responsive menu, status display, dialogs, and touch controls.

The animation loop advances the simulation with a bounded elapsed time. Projectile collision checks each traveled segment, preventing fast shots from skipping enemies between frames. Upgrade dialogs freeze simulation time.

## Verify

With Node 24:

```bash
node --test tests/*.test.mjs
```

Twelve tests cover every starter's attack, movement speed and bounds, pursuit and attack range, damage immunity, XP/upgrade pauses, evolution, chest costs, bosses, death/reset, invalid upgrades, and a seeded three-minute combat simulation. Browser visual/audio QA is separate from these simulation checks.

Two lifecycle tests verify owned-resource cleanup and repeated idle/run transitions without allocating unused clips or leaving faded clips active. These tests validate the lifecycle code; they do not reproduce a browser tab or GPU crash.

## Relationship to Megabonk

The parent directory contains static metadata analysis and the native method address mapping. Those files describe shipped artifacts, not observed execution. Prototype mechanics and balance are independently implemented; the current prototype does not claim exact Megabonk behavior. No Megabonk binaries or extracted assets are included in this browser build.

Native decompilation remains pending. Run `../analyze-megabonk.sh` from a regular WSL terminal after installing the Ghidra provider. Its first import may take minutes. It saves REA Evidence for `EnemyWave.EnemiesPerSecond` plus a reusable analysis snapshot.

## Graphics downloads

The v2 renderer replaces the primitive character models with textured, animated GLBs. Three.js and models load from the browser's internet connection on first use; downloads are cached per species, and cloned enemies share their meshes and textures. See `ASSET-CREDITS.md` for sources.

If CDN access is blocked, or for offline/local assets, run in the regular WSL terminal:

```bash
python3 /home/stets/projects/pokemon-megabonk/cache-graphics.py
```

The script caches the pinned rendering library and all required models, checks each GLB's geometry/skeleton/animation data, records hashes, and switches rendering dependencies and portraits to local files. Hard-refresh after it finishes. This is optional when browser CDN downloads work.

The title, menu, and upgrade cards use Alagard, a bitmap gothic font by Hewett Tsoi / Pix3M (see asset credits). The preview launcher downloads the original font locally when possible. A webfont CDN and Georgia provide fallbacks. Camera, slide, terrain, shrine, and ring/burst rendering regressions are covered by additional automated tests. Browser appearance, pointer lock, audio, and GPU shader compilation still need interactive verification.

## Type matchups

Attacks use the modern 18-type chart, including dual-type multipliers and immunities. Water and Grass deal 4× damage to Rock/Ground Geodude; Electric cannot hurt it. Auto-targeting prioritizes vulnerable enemies, and level-up choices guarantee an available move that improves coverage when possible. Rock Throw and Shadow Ball provide additional Rock and Ghost coverage. Floating labels distinguish super-effective, resisted, and immune hits. Boss projectiles also check the starter’s defensive types; contact damage stays neutral. Abilities such as Levitate and same-type attack bonuses are not modeled.

## GitHub Pages

Run `../publish-github-pages.sh` from a regular WSL terminal after `gh auth login --web --scopes workflow`. The script publishes the browser game and tests to a public `pokemon-megabonk` repo in your signed-in account, enables GitHub Pages, and waits for deployment. An optional argument chooses another repo name. It excludes parent-folder analysis artifacts and Sites metadata, and refuses to overwrite unrelated existing projects. Later pushes to main run the checked-in Pages workflow.
