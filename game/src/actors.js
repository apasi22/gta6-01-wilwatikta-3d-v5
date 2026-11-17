// Actors: detailed vehicle models (sleek hero sports car, big helicopter,
// police sedans, scooter), pedestrians, enemies, roadblocks, and effects.
import { Mesh } from './gl.js';
import { mModel, mModelRX, mMul, mScaleModel, clamp, dampAngle, d2, mulberry32, TAU } from './util.js';
import { CARS, TRAFFIC_COLORS, UNIT_NAMES, PITCH, HALF, SEA_X, SAND_X } from './config.js';

const GLASS = [0.07, 0.09, 0.15], DARK = [0.08, 0.08, 0.09], TIRE = [0.05, 0.05, 0.06];
const light = (c, f) => [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];

function wheels(m, w, r, zf, zr, hub = true) {
  for (const [x, z] of [[-w, zf], [w, zf], [-w, zr], [w, zr]]) {
    m.cylX(x, r, z, r, 0.3, 8, TIRE, 0);
    if (hub) m.cylX(x, r, z, r * 0.45, 0.34, 6, [0.72, 0.72, 0.76], 0.1);
  }
}
function arches(m, w, r, zf, zr, col) {
  for (const [x, z] of [[-w, zf], [w, zf], [-w, zr], [w, zr]])
    m.cylX(x, r, z, r + 0.13, 0.42, 6, col, 0, -Math.PI / 2, Math.PI / 2, false);
}

// Sleek low sports car: sloped nose, glass canopy, flared arches, spoiler.
export function buildSportsCar(gl, color) {
  const m = new Mesh(), top = light(color, 1.35);
  m.ramp(0, 0.22, 0.6, 0.34, 1.4, 1.86, 1.7, color); // nose, sloping down to the front
  m.box(0, 0.44, -0.55, 1.86, 0.42, 2.6, color, 0, top); // main deck
  m.ramp(0, 0.24, 0.62, 0.72, -1.85, 1.86, 0.9, color); // rear deck rising to spoiler
  m.box(0, 0.28, 0, 1.9, 0.14, 4.3, DARK); // side skirts / undertray
  m.quad([-0.7, 0.62, 0.9], [0.7, 0.62, 0.9], [0.55, 0.5, 1.9], [-0.55, 0.5, 1.9], [0, 1, 0], top, 0.2); // hood shine
  m.ellipsoid(0, 0.72, -0.35, 0.72, 0.44, 1.05, 10, GLASS, 0.3); // big glass canopy
  m.quad([-0.45, 1.12, -0.1], [0.1, 1.12, -0.1], [0.3, 1.05, 0.45], [-0.25, 1.05, 0.45], [0, 1, 0], [0.65, 0.8, 1], 0.7); // glass glare
  m.box(0, 0.82, -2.0, 1.7, 0.09, 0.5, color, 0, top); // spoiler
  m.box(-0.6, 0.72, -2.0, 0.1, 0.2, 0.3, DARK); m.box(0.6, 0.72, -2.0, 0.1, 0.2, 0.3, DARK);
  m.box(-1.0, 0.7, 0.35, 0.12, 0.12, 0.3, color); m.box(1.0, 0.7, 0.35, 0.12, 0.12, 0.3, color); // mirrors
  m.box(0, 0.32, 2.24, 1.5, 0.22, 0.1, DARK); // front bumper + grille
  m.quad([-0.75, 0.42, 2.26], [-0.35, 0.42, 2.26], [-0.35, 0.56, 2.26], [-0.75, 0.56, 2.26], [0, 0, 1], [1, 0.95, 0.8], 1);
  m.quad([0.35, 0.42, 2.26], [0.75, 0.42, 2.26], [0.75, 0.56, 2.26], [0.35, 0.56, 2.26], [0, 0, 1], [1, 0.95, 0.8], 1);
  m.quad([-0.8, 0.5, -2.26], [0.8, 0.5, -2.26], [0.8, 0.66, -2.26], [-0.8, 0.66, -2.26], [0, 0, -1], [1, 0.12, 0.12], 1); // rear light bar
  m.cylZ(-0.5, 0.26, -2.25, 0.09, 0.2, 6, [0.3, 0.3, 0.32]); m.cylZ(0.5, 0.26, -2.25, 0.09, 0.2, 6, [0.3, 0.3, 0.32]);
  m.quad([-0.95, 0.45, -1.2], [-0.94, 0.45, -1.2], [-0.94, 0.6, -0.7], [-0.95, 0.6, -0.7], [-1, 0, 0], DARK, 0);
  m.quad([0.95, 0.45, -1.2], [0.94, 0.45, -1.2], [0.94, 0.6, -0.7], [0.95, 0.6, -0.7], [1, 0, 0], DARK, 0);
  arches(m, 0.86, 0.42, 1.45, -1.45, color);
  wheels(m, 0.86, 0.42, 1.45, -1.45);
  return m.build(gl);
}

// Sedan: traffic cars and the police cruiser (white + navy band + star).
export function buildSedan(gl, color, police = false) {
  const m = new Mesh(), top = light(color, 1.25);
  m.box(0, 0.55, 0, 1.85, 0.55, 4.3, color, 0, top);
  m.ramp(0, 0.3, 0.72, 0.5, 1.75, 1.8, 0.85, color);
  m.ramp(0, 0.3, 0.5, 0.74, -1.75, 1.8, 0.85, color);
  m.box(0, 1.05, -0.3, 1.6, 0.5, 2.0, GLASS, 0.25);
  m.box(0, 1.32, -0.3, 1.5, 0.08, 1.7, color, 0, top); // roof panel
  m.box(0, 0.32, 2.2, 1.7, 0.24, 0.12, DARK);
  m.box(0, 0.32, -2.2, 1.7, 0.24, 0.12, DARK);
  m.quad([-0.7, 0.62, 2.16], [-0.3, 0.62, 2.16], [-0.3, 0.76, 2.16], [-0.7, 0.76, 2.16], [0, 0, 1], [1, 0.95, 0.8], 1);
  m.quad([0.3, 0.62, 2.16], [0.7, 0.62, 2.16], [0.7, 0.76, 2.16], [0.3, 0.76, 2.16], [0, 0, 1], [1, 0.95, 0.8], 1);
  m.quad([-0.75, 0.6, -2.16], [-0.35, 0.6, -2.16], [-0.35, 0.74, -2.16], [-0.75, 0.74, -2.16], [0, 0, -1], [1, 0.12, 0.12], 1);
  m.quad([0.35, 0.6, -2.16], [0.75, 0.6, -2.16], [0.75, 0.74, -2.16], [0.35, 0.74, -2.16], [0, 0, -1], [1, 0.12, 0.12], 1);
  if (police) {
    const navy = [0.08, 0.14, 0.35];
    m.quad([-0.94, 0.5, -1.4], [-0.94, 0.5, 1.4], [-0.94, 0.85, 1.4], [-0.94, 0.85, -1.4], [-1, 0, 0], navy, 0);
    m.quad([0.94, 0.5, 1.4], [0.94, 0.5, -1.4], [0.94, 0.85, -1.4], [0.94, 0.85, 1.4], [1, 0, 0], navy, 0);
    m.box(0, 1.42, -0.3, 1.1, 0.16, 0.42, DARK); // light-bar base
    m.box(-0.3, 1.55, -0.3, 0.45, 0.18, 0.4, [1, 0.15, 0.15], 1);
    m.box(0.3, 1.55, -0.3, 0.45, 0.18, 0.4, [0.2, 0.4, 1], 1);
    for (const s of [-1, 1]) { // gold door star
      m.quad([s * 0.95, 0.62, -0.12], [s * 0.95, 0.62, 0.12], [s * 0.95, 0.78, 0.12], [s * 0.95, 0.78, -0.12], [s, 0, 0], [1, 0.8, 0.3], 0.4);
      m.quad([s * 0.95, 0.56, -0.02], [s * 0.95, 0.56, 0.02], [s * 0.95, 0.84, 0.02], [s * 0.95, 0.84, -0.02], [s, 0, 0], [1, 0.8, 0.3], 0.4);
    }
    m.box(0, 0.9, 2.16, 0.9, 0.18, 0.06, DARK); // push bar
  }
  arches(m, 0.85, 0.4, 1.45, -1.45, police ? [0.9, 0.9, 0.9] : color);
  wheels(m, 0.85, 0.4, 1.45, -1.45);
  return m.build(gl);
}

// Big detailed police helicopter: rounded fuselage, glass cockpit, belly
// stripe, skids, tail boom + fin, 4-blade rotor + blur disc (separate).
export function buildHeli(gl) {
  const m = new Mesh(), body = [0.09, 0.11, 0.2];
  m.ellipsoid(0, 0, 0, 1.05, 0.95, 2.1, 12, body, 0.08);
  m.box(0, -0.55, 0, 1.7, 0.35, 3.4, [0.92, 0.92, 0.9]); // white belly stripe
  m.box(0, -0.28, 0, 1.78, 0.12, 3.5, [1, 0.8, 0.3], 0.3); // gold cheatline
  m.ellipsoid(0, 0.12, 1.55, 0.82, 0.72, 0.95, 10, [0.1, 0.18, 0.3], 0.4); // glass cockpit
  m.quad([-0.4, 0.72, 1.9], [0.25, 0.72, 1.9], [0.45, 0.55, 2.25], [-0.2, 0.55, 2.25], [0, 1, 0], [0.7, 0.85, 1], 0.8); // canopy glare
  m.box(0, 0.95, -0.2, 1.15, 0.35, 1.7, [0.06, 0.07, 0.12]); // engine deck
  m.cylZ(-0.4, 0.9, -1.2, 0.14, 0.7, 6, DARK); m.cylZ(0.4, 0.9, -1.2, 0.14, 0.7, 6, DARK);
  m.cylZ(0, 0.25, -2.9, 0.34, 2.2, 8, body, 0.08); // tail boom
  m.cylZ(0, 0.3, -4.2, 0.2, 1.0, 6, body, 0.08);
  m.box(0, 0.9, -4.4, 0.12, 1.2, 0.9, body); // tail fin
  m.box(0, 0.35, -4.3, 1.7, 0.08, 0.5, body); // stabilizer
  m.box(0, -1.28, 0.4, 0.14, 0.14, 3.1, DARK); m.box(0.85, -1.28, 0.4, 0.14, 0.14, 3.1, DARK); m.box(-0.85, -1.28, 0.4, 0.14, 0.14, 3.1, DARK);
  for (const [sx, sz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -0.6], [0.85, -0.6]])
    m.box(sx, -0.95, sz, 0.1, 0.7, 0.1, DARK);
  m.box(0, -1.0, 1.7, 0.34, 0.3, 0.34, [1, 0.95, 0.8], 1); // searchlight housing
  for (const s of [-1, 1]) { // fuselage star badges
    m.quad([s * 1.0, 0.05, -0.1], [s * 1.0, 0.05, 0.35], [s * 1.0, 0.5, 0.35], [s * 1.0, 0.5, -0.1], [s, 0, 0], [1, 0.8, 0.3], 0.4);
  }
  const bodyMesh = m.build(gl);
  const r = new Mesh(); // 4-blade main rotor (spins about Y)
  r.box(0, 0, 0, 0.5, 0.18, 0.5, DARK);
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const dx = Math.cos(a), dz = Math.sin(a);
    r.box(dx * 1.95, 0, dz * 1.95, Math.abs(dx) > 0.5 ? 3.5 : 0.3, 0.07, Math.abs(dz) > 0.5 ? 3.5 : 0.3, [0.06, 0.06, 0.08]);
    r.box(dx * 3.55, 0, dz * 3.55, Math.abs(dx) > 0.5 ? 0.35 : 0.3, 0.08, Math.abs(dz) > 0.5 ? 0.35 : 0.3, [1, 0.8, 0.25], 0.4);
  }
  const rotor = r.build(gl);
  const d = new Mesh(); // translucent motion-blur disc
  d.disc(0, 0, 0, 3.8, [0.75, 0.75, 0.8], 0, 20);
  const blur = d.build(gl);
  const t = new Mesh(); // tail rotor blur puck
  t.cylX(0.32, 0, 0, 0.55, 0.08, 10, [0.6, 0.6, 0.65], 0);
  const tailBlur = t.build(gl);
  const c = new Mesh(); // searchlight cone (apex up at heli, base on ground)
  c.cone(0, 0, 0, 3.4, 1, 10, [1, 0.95, 0.75], 0.9);
  const cone = c.build(gl);
  const p = new Mesh();
  p.disc(0, 0, 0, 3.4, [1, 0.92, 0.7], 0.8, 14);
  const pool = p.build(gl);
  return { body: bodyMesh, rotor, blur, tailBlur, cone, pool };
}

// Scooter + seated rider, one baked mesh.
export function buildScooter(gl, color) {
  const m = new Mesh();
  m.cylX(0, 0.28, 0.62, 0.28, 0.16, 8, TIRE); m.cylX(0, 0.28, -0.55, 0.28, 0.16, 8, TIRE);
  m.box(0, 0.42, 0, 0.42, 0.16, 1.25, color);
  m.box(0, 0.62, 0.55, 0.4, 0.5, 0.18, color);
  m.box(0, 0.95, 0.55, 0.55, 0.08, 0.08, DARK);
  m.box(0, 0.62, -0.4, 0.44, 0.14, 0.6, DARK);
  m.box(0, 0.98, -0.35, 0.42, 0.5, 0.3, [0.85, 0.65, 0.45]); // rider torso
  m.ellipsoid(0, 1.42, -0.32, 0.22, 0.24, 0.22, 8, [0.95, 0.95, 0.95]); // helmet
  m.box(-0.22, 1.0, -0.05, 0.12, 0.12, 0.5, [0.85, 0.65, 0.45]);
  m.box(0.22, 1.0, -0.05, 0.12, 0.12, 0.5, [0.85, 0.65, 0.45]);
  m.box(-0.2, 0.55, -0.15, 0.14, 0.35, 0.14, [0.2, 0.2, 0.3]);
  m.box(0.2, 0.55, -0.15, 0.14, 0.35, 0.14, [0.2, 0.2, 0.3]);
  return m.build(gl);
}

export function buildCharBody(gl, jacket, pants) {
  const m = new Mesh();
  m.box(0, 1.22, 0, 0.56, 0.72, 0.34, jacket); // torso
  m.box(0, 1.68, 0, 0.34, 0.36, 0.32, [0.85, 0.62, 0.45]); // head
  m.box(0, 1.86, 0, 0.36, 0.12, 0.34, [0.12, 0.1, 0.1]); // hair/cap
  m.box(-0.36, 1.22, 0, 0.14, 0.6, 0.16, jacket);
  m.box(0.36, 1.22, 0, 0.14, 0.6, 0.16, jacket);
  m.box(0, 0.78, 0, 0.5, 0.2, 0.3, pants); // hips
  return m.build(gl);
}
export function buildLeg(gl, pants) {
  const m = new Mesh();
  m.box(0, -0.36, 0, 0.19, 0.72, 0.21, pants);
  m.box(0, -0.72, 0.04, 0.2, 0.1, 0.3, DARK);
  return m.build(gl);
}
export function buildPed(gl, shirt, pants, skin) {
  const m = new Mesh();
  m.box(0, 1.2, 0, 0.52, 0.7, 0.32, shirt);
  m.box(0, 1.66, 0, 0.32, 0.34, 0.3, skin);
  m.box(0, 1.82, 0, 0.34, 0.12, 0.32, [0.1, 0.09, 0.09]);
  m.box(-0.33, 1.2, 0, 0.13, 0.55, 0.15, shirt);
  m.box(0.33, 1.2, 0, 0.13, 0.55, 0.15, shirt);
  m.box(-0.14, 0.4, 0, 0.2, 0.8, 0.22, pants);
  m.box(0.14, 0.4, 0, 0.2, 0.8, 0.22, pants);
  return m.build(gl);
}
export function buildRoadblock(gl) {
  const m = new Mesh();
  m.box(0, 0.7, 0, 5.2, 0.7, 0.35, [0.95, 0.5, 0.1]);
  for (let i = 0; i < 5; i++)
    m.quad([-2.3 + i * 1.05, 0.4, 0.19], [-1.85 + i * 1.05, 0.4, 0.19], [-1.55 + i * 1.05, 1.0, 0.19], [-2.0 + i * 1.05, 1.0, 0.19], [0, 0, 1], [0.95, 0.95, 0.92], 0.3);
  m.box(-2.2, 0.3, 0, 0.3, 0.6, 0.5, DARK); m.box(2.2, 0.3, 0, 0.3, 0.6, 0.5, DARK);
  for (const cx of [-3.4, 3.4]) {
    m.cone(cx, 0, 0.6, 0.32, 0.7, 6, [1, 0.45, 0.1]);
    m.cone(cx, 0, -0.6, 0.32, 0.7, 6, [1, 0.45, 0.1]);
  }
  m.box(0, 1.35, 0, 0.9, 0.5, 0.15, [1, 0.85, 0.3], 0.8);
  return m.build(gl);
}
function buildFlashMeshes(gl) {
  const f = new Mesh();
  f.quad([-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], [0, 0, 1], [1, 0.9, 0.5], 1);
  f.quad([0, -0.5, -0.5], [0, -0.5, 0.5], [0, 0.5, 0.5], [0, 0.5, -0.5], [1, 0, 0], [1, 0.9, 0.5], 1);
  const s = new Mesh();
  s.quad([-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], [0, 0, 1], [0.6, 0.6, 0.62], 0);
  return { flash: f.build(gl), puff: s.build(gl) };
}

export function createActors(gl, seed) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const meshes = {
    hero: buildSportsCar(gl, CARS[0].color),
    coupe: buildSportsCar(gl, CARS[1].color),
    sedan: TRAFFIC_COLORS.map(c => buildSedan(gl, c)),
    cruiser: buildSedan(gl, [0.92, 0.92, 0.9], true),
    heli: buildHeli(gl),
    scooter: buildScooter(gl, [0.95, 0.4, 0.55]),
    scooter2: buildScooter(gl, [0.3, 0.7, 0.85]),
    charBody: buildCharBody(gl, [0.85, 0.25, 0.15], [0.15, 0.16, 0.25]),
    charLeg: buildLeg(gl, [0.15, 0.16, 0.25]),
    peds: [
      buildPed(gl, [0.8, 0.6, 0.3], [0.3, 0.3, 0.4], [0.85, 0.62, 0.45]),
      buildPed(gl, [0.3, 0.55, 0.75], [0.2, 0.2, 0.25], [0.7, 0.5, 0.38]),
      buildPed(gl, [0.75, 0.35, 0.45], [0.35, 0.3, 0.3], [0.9, 0.7, 0.55]),
      buildPed(gl, [0.4, 0.65, 0.4], [0.25, 0.25, 0.3], [0.6, 0.45, 0.35]),
    ],
    enemy: buildPed(gl, [0.25, 0.22, 0.28], [0.15, 0.15, 0.18], [0.75, 0.55, 0.4]),
    roadblock: buildRoadblock(gl),
    ...buildFlashMeshes(gl),
  };
  // Traffic: axis-aligned road followers.
  const traffic = [];
  for (let i = 0; i < 14; i++) {
    const horiz = rng() > 0.5, road = (Math.floor(rng() * 7) - 3) * PITCH;
    const dir = rng() > 0.5 ? 1 : -1, t = (rng() * 2 - 1) * (HALF - 8);
    traffic.push({
      x: horiz ? t : road, z: horiz ? road : t, ry: horiz ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      speed: 7 + rng() * 5, mesh: i % TRAFFIC_COLORS.length, horiz, dir, wait: 0,
    });
  }
  // Scooters cruise the beachfront avenue.
  const scooters = [
    { x: -HALF + 3, z: -60, ry: 0, speed: 6, mesh: 'scooter' },
    { x: -HALF - 3, z: 80, ry: Math.PI, speed: 5, mesh: 'scooter2' },
  ];
  // Pedestrians: block-perimeter walkers + beach strollers.
  const peds = [];
  for (let i = 0; i < 26; i++) {
    const beach = i >= 20;
    const bx = Math.floor(rng() * 6), bz = Math.floor(rng() * 6);
    const cx = beach ? SAND_X - 10 - rng() * 20 : (bx - 2.5) * PITCH, cz = beach ? (rng() * 2 - 1) * 120 : (bz - 2.5) * PITCH;
    peds.push({
      x: cx + (rng() - 0.5) * 20, z: cz + (rng() - 0.5) * 20, ry: rng() * TAU, speed: 1.1 + rng() * 0.8,
      mesh: i % 4, phase: rng() * TAU, flee: 0, beach, cx, cz,
    });
  }
  return {
    meshes, traffic, scooters, peds,
    police: [], roadblocks: [], enemies: [],
    heli: { active: false, ang: 0.6, r: 26, h: 20, x: 0, z: 0, ban: 0 },
    effects: [], smokeT: 0,
  };
}

const spawnRng = mulberry32(12345);

export function updateTraffic(A, dt, player, time) {
  for (const c of A.traffic) {
    const px = player.x, pz = player.z;
    const ahead = c.horiz ? (c.dir * (px - c.x) > 0 && Math.abs(pz - c.z) < 4 && Math.abs(px - c.x) < 9)
      : (c.dir * (pz - c.z) > 0 && Math.abs(px - c.x) < 4 && Math.abs(pz - c.z) < 9);
    const sp = ahead ? 0 : c.speed;
    if (c.horiz) c.x += c.dir * sp * dt; else c.z += c.dir * sp * dt;
    if (Math.abs(c.x) > HALF + 4 || Math.abs(c.z) > HALF + 4) {
      if (c.horiz) c.x = -c.dir * (HALF - 4); else c.z = -c.dir * (HALF - 4);
    }
  }
  for (const s of A.scooters) {
    s.z += Math.cos(s.ry) * s.speed * dt; s.x += Math.sin(s.ry) * s.speed * dt;
    if (s.z > HALF) s.z = -HALF; if (s.z < -HALF) s.z = HALF;
  }
}

export function updatePolice(A, dt, G, time) {
  const want = G.wanted, player = G.player;
  if (G.shotMode) { // staged: hold formation, constant speed straight, no spawn changes
    for (const p of A.police) {
      p.x += Math.sin(p.ry) * p.speed * dt; p.z += Math.cos(p.ry) * p.speed * dt;
    }
    return;
  }
  const target = want === 0 ? 0 : Math.min(4, 1 + want);
  while (A.police.length < target) {
    const a = spawnRng() * TAU, r = 55 + spawnRng() * 30;
    A.police.push({
      x: player.x + Math.sin(a) * r, z: player.z + Math.cos(a) * r, ry: 0, speed: 0,
      name: UNIT_NAMES[A.police.length % UNIT_NAMES.length], state: 'pursue', ram: 0,
    });
  }
  while (A.police.length > target) A.police.pop();
  for (const p of A.police) {
    const dx = player.x - p.x, dz = player.z - p.z, dist = Math.hypot(dx, dz) || 1;
    const wantRy = Math.atan2(dx, dz);
    p.ry = dampAngle(p.ry, wantRy, 2.2, dt);
    const cruise = clamp(player.speed + 5, 14, 34);
    p.speed += clamp(cruise - p.speed, -20 * dt, 14 * dt);
    p.x += Math.sin(p.ry) * p.speed * dt; p.z += Math.cos(p.ry) * p.speed * dt;
    if (dist < 5) { // ram: shove the player car
      player.speed = Math.max(0, player.speed - 3 * dt);
      G.carCond = Math.max(0, G.carCond - 4 * dt);
      p.ram = 0.4;
    }
    p.ram = Math.max(0, p.ram - dt);
    p.state = dist < 12 ? 'RAMMING' : dist < 30 ? 'Pursuit' : 'Pursuit';
    p.dist = Math.round(dist);
  }
  // Roadblocks at wanted >= 3: one ahead of the player on their road.
  if (want >= 3 && A.roadblocks.length === 0 && player.driving) {
    const fx = Math.sin(player.ry), fz = Math.cos(player.ry);
    A.roadblocks.push({ x: player.x + fx * 42, z: player.z + fz * 42, ry: player.ry + Math.PI / 2 });
  }
  if (want < 3) A.roadblocks.length = 0;
  // Helicopter.
  const H = A.heli;
  H.ban = Math.max(0, H.ban - dt);
  H.active = want >= 3 && H.ban <= 0;
  if (H.active) {
    H.ang += 0.22 * dt;
    H.x = player.x + Math.sin(H.ang) * H.r; H.z = player.z + Math.cos(H.ang) * H.r;
  }
}

export function updatePeds(A, dt, G, time) {
  for (const p of A.peds) {
    const pd = d2(p.x, p.z, G.player.x, G.player.z);
    if (pd < 7 && G.player.speed > 8) p.flee = 2.5;
    if (G.gunshotT > 0 && pd < 24) p.flee = 2.5;
    if (p.flee > 0) {
      p.flee -= dt;
      const a = Math.atan2(p.x - G.player.x, p.z - G.player.z);
      p.ry = dampAngle(p.ry, a, 6, dt);
      p.x += Math.sin(p.ry) * 4.4 * dt; p.z += Math.cos(p.ry) * 4.4 * dt;
    } else if (p.beach) {
      p.ry += Math.sin(time * 0.4 + p.phase) * 0.4 * dt;
      p.x += Math.sin(p.ry) * p.speed * 0.5 * dt; p.z += Math.cos(p.ry) * p.speed * 0.5 * dt;
      p.x = clamp(p.x, SEA_X - 40, SAND_X); p.z = clamp(p.z, -HALF, HALF);
    } else {
      p.ry += Math.sin(time * 0.3 + p.phase) * 0.5 * dt;
      p.x += Math.sin(p.ry) * p.speed * dt; p.z += Math.cos(p.ry) * p.speed * dt;
      const dx = p.x - p.cx, dz = p.z - p.cz;
      if (Math.hypot(dx, dz) > 16) p.ry = Math.atan2(-dx, -dz);
    }
    p.phase += dt * (p.flee > 0 ? 9 : 5);
  }
}

export function spawnEffect(A, kind, x, y, z, x2, y2, z2) {
  A.effects.push({ kind, x, y, z, x2, y2, z2, ttl: kind === 'smoke' ? 1.4 : kind === 'tracer' ? 0.07 : 0.09 });
}
export function updateEffects(A, dt) {
  for (let i = A.effects.length - 1; i >= 0; i--) {
    const e = A.effects[i];
    e.ttl -= dt;
    if (e.kind === 'smoke') { e.y += 1.6 * dt; e.x += 0.4 * dt; }
    if (e.ttl <= 0) A.effects.splice(i, 1);
  }
}

export function drawActors(r, A, G, time) {
  const M = A.meshes;
  for (const c of A.traffic) r.draw(M.sedan[c.mesh], mModel(c.x, 0, c.z, c.ry));
  for (const s of A.scooters) r.draw(M[s.mesh], mModel(s.x, 0, s.z, s.ry));
  for (const p of A.peds) {
    const bob = Math.abs(Math.sin(p.phase)) * 0.05;
    r.draw(M.peds[p.mesh], mModel(p.x, bob, p.z, p.ry));
  }
  for (const e of A.enemies) {
    if (e.dead) r.draw(M.enemy, mScaleModel(e.x, 0.15, e.z, e.ry, 1, 0.28, 1), [0.5, 0.5, 0.5]);
    else r.draw(M.enemy, mModel(e.x, 0, e.z, e.ry));
  }
  for (const b of A.roadblocks) r.draw(M.roadblock, mModel(b.x, 0, b.z, b.ry));
  for (const p of A.police) r.draw(M.cruiser, mModel(p.x, 0, p.z, p.ry));
  const H = A.heli;
  if (H.active || G.shotMode) {
    const hy = H.active || G.shotMode ? H.h : 0;
    const HS = 1.3, hm = mModel(H.x, hy, H.z, H.ang + Math.PI / 2, HS);
    r.draw(M.heli.body, hm);
    r.draw(M.heli.rotor, mModel(H.x, hy + 1.25 * HS, H.z, time * 9, HS));
    r.draw(M.heli.tailBlur, mMul(hm, mModel(0, 0.3, -4.4, 0)));
  }
}

export function drawActorFx(r, A, G, time) {
  const M = A.meshes, H = A.heli;
  // Police flash halos + heli blur disc, cone, pool (transparent pass).
  const phase = Math.floor(time * 3.2) % 2 === 0;
  for (const p of A.police) {
    r.draw(M.flash, mScaleModel(p.x, 1.9, p.z, 0, 1.6, 1.0, 1.6), phase ? [1, 0.2, 0.2] : [0.25, 0.45, 1], 0.4);
  }
  if (H.active || G.shotMode) {
    const hy = H.h;
    r.draw(M.heli.blur, mModel(H.x, hy + 1.25 * 1.3, H.z, 0, 1.3), [1, 1, 1], 0.14);
    const coneH = hy - 0.9;
    r.draw(M.heli.cone, mScaleModel(H.x, 0.1, H.z, 0, 1, coneH, 1), [1, 1, 1], 0.3);
    r.draw(M.heli.pool, mModel(H.x, 0.14, H.z, 0), [1, 1, 1], 0.5);
  }
  for (const e of A.effects) {
    if (e.kind === 'flash') r.draw(M.flash, mModel(e.x, e.y, e.z, 0), [1, 1, 1], 0.9);
    else if (e.kind === 'smoke') r.draw(M.puff, mScaleModel(e.x, e.y, e.z, 0, 1.4, 1.4, 1.4), [0.55, 0.55, 0.58], 0.4);
    else if (e.kind === 'spark') r.draw(M.flash, mScaleModel(e.x, e.y, e.z, 0, 0.4, 0.4, 0.4), [1, 0.8, 0.4], 0.9);
  }
}
