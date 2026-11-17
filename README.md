# WILWATIKTA 3D

A 3D open-world crime game in a Javanese sunset city, written from scratch in
raw WebGL with no libraries, no build step, and no network requests. You are
Sugeng Wibowo, a getaway driver back in Wilwatikta for one last job: twelve
story missions across six districts, WPD police chases, a police helicopter,
car theft, combat, a crew with paid abilities, a garage, saves, and two
procedural radio stations.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome (keyboard required), or run `node serve.ts` and open
http://localhost:8080/.

## Controls

- **W A S D** — drive / walk (Shift to run on foot)
- **E** — enter or exit a car
- **Space** — shoot (drive-by) / handbrake while driving
- **F** — punch, **R** — reload, **Q / 1–4** — weapon
- **Z / X / C** — crew abilities (Agus, Bambang, Ratna)
- **T** — radio station, **M** — mute, **H** — horn
- **Tab** — city map, **G** — garage, **P** — pause

## Structure

- `game/index.html` — canvas, HUD, screens, styles
- `game/src/util.js` — seeded RNG and matrix math
- `game/src/gl.js` — WebGL renderer, shaders, mesh builder
- `game/src/world.js` — procedural city, districts, props, sky
- `game/src/actors.js` — cars, traffic, police, helicopter, pedestrians
- `game/src/game.js` — state, physics, camera, main loop
- `game/src/missions.js` — 12-mission story chain and dialogue
- `game/src/hud.js` — HUD panels, minimap, speedometer
- `game/src/screens.js` — title, pause, map, garage, saves
- `game/src/radio.js` — procedural WebAudio radio and effects
- `game/src/shots.js` — deterministic staged screenshots
- `game/src/main.js` — bootstrap

All art, names, characters, story, and music are original, generated in code.
