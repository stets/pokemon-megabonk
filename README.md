# Pokebonk — Wild Run

A browser arena survivor with eight playable Pokémon, type-based combat, and a three-area campaign: Verdant Ridges, Copper Badlands, and Moonlit Ruins. Each area lasts at least three minutes and requires defeating its region boss. Your moves, items, levels and coins carry into the next area. Mewtwo guards the final region.

Live site: https://stets.github.io/pokemon-megabonk/

## Play

Run `python3 ../serve-game.py` from WSL and open `http://localhost:8090`. Static hosting also works: the game has no server-side runtime. Graphics, portraits, library files, font, and generated icons are included in `dist/assets`.

- WASD or arrows: move relative to the camera.
- Mouse: look around. Click the arena to capture the pointer; Escape releases it and pauses.
- Space: jump. Shift: dash. C: slide downhill.
- E: open a nearby chest or activate a crystal charge shrine. Hold the shrine’s ring for six seconds to choose a blessing.
- 1/2/3: choose an upgrade. 1–8: select a starter on the title screen.
- Drag non-interactive title-screen space to orbit the selected Pokémon.

Camera settings in the main menu and pause screen save automatically. Vertical look defaults to the reverse of the initial prototype’s direction. Both axes can be inverted, and look sensitivity applies to mouse, touch orbit and controllers.

## Controllers

Connect a standard Bluetooth/USB gamepad, then press a button so the browser exposes it. Left stick moves; right stick looks; A/Cross jumps; B/Circle dashes; X/Square interacts; LT/L2 or left-stick click slides; Menu/Options pauses. In menus, D-pad or left stick navigates and A/Cross confirms. Shoulder buttons change starters. In pause settings, up/down changes focus and left/right adjusts the slider. B/Circle resumes.

The game uses the browser Gamepad API. Keyboard, mouse and touch remain supported. Apple Vision Pro compatibility requires a controller supported by visionOS and exposed to Safari; actual headset hardware verification is separate from the automated virtual-controller tests.

## Combat and exploration

The modern 18-type chart supplies weaknesses, resistances and immunities, including dual-type multipliers. Electric cannot hurt Rock/Ground Geodude; Water and Grass deal 4× damage to it. Auto-targeting gives the region boss priority when a move can damage it, then prefers vulnerable enemies; upgrade choices favor counters that improve coverage, with extra priority for overcoming immunities. Abilities such as Levitate and same-type attack bonuses are not modeled.

Eevee starts with Swift and a weaker close-range Bite so Ghost immunity does not strand its opening build. Crits start at 12% chance and 1.7× damage. Scope Lens increases chance to a 50% cap; Razor Claw increases the multiplier to a 3× cap. Crit, resistance and immunity feedback are distinct. Pause statistics track actual projectile misses separately from immune hits; there is no random accuracy penalty.

The playable arena has a 108-unit radius, rolling hills, authored hamlets, solid tree/rock/building collisions, and spacing checks for scenery. Pokéball supplies break into blue XP diamonds. Trees sway subtly. The river has flowing pixel texture, a lightweight propagating wave simulation, movement wakes, swimming drag, current drift and buoyancy.

Later waves add Graveler and Golem while retaining Geodude. Capture Ranger minibosses appear at 45 and 105 seconds in each area, telegraph capture zones and throw capture balls. Being caught briefly slows movement. Boss arrivals use a dedicated banner and sound cue so other notices cannot overwrite Mewtwo’s entrance.

## Technical structure

- `dist/engine.js`: deterministic movement, combat, upgrades, stages, enemies and drops.
- `dist/type-chart.js`, `levels.js`, `regions.js`, `obstacles.js`, `terrain.js`: shared rules, maps and collision data.
- `dist/renderer.js`: Three.js, textured animated GLBs, toon shading, outlines, pixel terrain, procedural buildings, fire sprites, bird wings, and scenery animation.
- `dist/camera-motion.js`, `settings.js`, `controller.js`: camera collision/easing, saved preferences and normalized controller input.
- `dist/water.js`, `lightning.js`, `overlay.js`: wave physics, branched lightning and readable combat feedback.
- `dist/audio.js`: original synthesized music, progressively increasing from 118 to 178 BPM across the campaign.
- `dist/actor-lifecycle.js`: owned animation and GPU-resource cleanup.

The game catches runtime errors and exposes `window.pokebonkCrash`. `window.pokebonk` offers a small developer hook for inspecting the simulation and camera.

## Verification and balance

Run `node --test tests/*.test.mjs` with Node 24. Tests cover combat, type multipliers, immunity, crit caps, supplies, movement/collision, camera settings, hill clearance, controller input, river physics, stage progression, miniboss capture and boss alerts. Browser rendering and interaction checks are separate.

Run `node scripts/balance.mjs` to compare starters across six identical first-area seeds. It writes `balance-results.json` with survival, kills and levels. Use `node scripts/balance.mjs --campaign` to run all three areas with a 15-minute limit per seed. It records area clears, final builds, deaths, victories and explicit timeouts in `campaign-balance-results.json`; `campaign-balance-baseline.json` preserves the published v12 targeting comparison. These are comparisons using a directional avoidance bot, not proof that every human strategy or late-game build is balanced. Across the same 48 starter/seed combinations, intermediate area clears increased from 29 to 31 with boss priority, while complete victories decreased from four to two. Focusing a boss trades some horde damage for progression; the results still show starter/build differences that need human playtesting.

## Publish

From a regular WSL terminal:

```bash
gh auth login --hostname github.com --git-protocol https --web --scopes workflow
gh auth setup-git
bash ../publish-github-pages.sh
```

The script publishes the browser game, tests, attribution, prompts and balance tooling to a public `pokemon-megabonk` repository in your signed-in account. An optional argument chooses another repo name. It refuses to overwrite unrelated projects and excludes parent-folder analysis artifacts and Sites metadata. Subsequent pushes to main run the checked-in Pages workflow.

## Credits

See `ASSET-CREDITS.md` for model, portrait, library and font sources. Six generated move icons and their prompts are documented in `ICON-PROMPTS.md`. This is an unofficial Pokémon fan project. It independently implements its simulation and contains no extracted Megabonk binaries, art or source code.
