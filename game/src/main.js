// Bootstrap: wire game + HUD + screens + radio; stage + freeze for captures.
import { createGame } from './game.js';
import { createHUD } from './hud.js';
import { createScreens } from './screens.js';
import { createRadio } from './radio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const canvas = document.getElementById('gl');
const G = createGame(canvas, { seed, shotMode: !!shot });
G.radio = createRadio();
const hud = createHUD(G);
const ui = createScreens(G);
G.ui = ui;
ui.sync();
window.__game = G;

function frame(now) {
  G.pump(now);
  hud.update();
  if (G.mode === 'map') ui.drawMap();
  requestAnimationFrame(frame);
}

if (shot) {
  stageShot(G, shot);
  G.stepFixed(10);
  G.frozen = true;
  ui.sync();
  hud.update();
  if (G.mode === 'map') ui.drawMap();
  G.pump(performance.now());
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
