# Graphics assets

Title and menu font: **Alagard**, by **Hewett Tsoi / Pix3M**, from [DaFont](https://www.dafont.com/alagard.font). The author's usage instruction is “Give credit if used. That's it.” The preview launcher caches the original TTF when available; CSS falls back to the [OnlineWebFonts Alagard webfont](https://www.onlinewebfonts.com/download/6faad1789bcbd321a458c14d0735d976) and then Georgia if downloads fail.

The v2 renderer loads animated, textured Pokémon GLBs from [06wj/pokemon](https://github.com/06wj/pokemon). Its [model manifest](https://github.com/06wj/pokemon/blob/master/src/content/animatedModels.json) identifies each self-contained GLB and named animation clips. These are community-distributed Pokémon assets; the source repository's MIT software license does not transfer ownership of Pokémon character assets. Pokémon characters and associated assets belong to their respective owners. This prototype is an unofficial fan project. [Pokémon Support’s published IP policy](https://support.pokemon.com/hc/en-us/articles/360000634094-Can-I-use-Pok%C3%A9mon-images-or-materials), reviewed October 14, 2026, asks projects not to use Pokémon characters, names or designs. Attribution and community availability do not establish permission for these character assets.

Starter portraits come from the [PokeAPI sprite collection](https://github.com/PokeAPI/sprites).

[Three.js](https://github.com/mrdoob/three.js), version 0.180.0, supplies rendering, glTF loading, skeletal cloning, and the generated room-lighting environment. Three.js is MIT licensed. The browser's import map pins this version. The optional local-cache script retains its license alongside the copied modules.

Terrain, vegetation, landmarks, camera behavior, interface, combat effects, and synthesized music are authored for this prototype. They are not extracted Megabonk assets.

The browser loads Three.js from jsDelivr and GLBs/portraits from GitHub by default. `../cache-graphics.py` installs them locally, validates GLB envelopes and embedded resources, records SHA-256 digests, and switches the import map to local files. The initial graphics download requires internet access. After local installation, normal gameplay does not fetch remote models or rendering dependencies.

Six move icons (Electric, Fire, Grass, Water, Rock, Ghost) were generated with the built-in OpenAI Imagegen tool for this project. Their prompts and saved asset paths are recorded in `ICON-PROMPTS.md`. Region buildings, Capture Ranger geometry, river wave physics, fire shaders, lightning paths and bird wing accents are independently authored.
