// Procedural Wilwatikta: road grid, six districts, beach and sea, palms,
// props, skyline ring, and mountains. All geometry is generated from a seed.
import { Mesh, hx } from './gl.js';
import { mulberry32, clamp } from './util.js';
import { PITCH, ROADW, HALF, SEA_X, SAND_X, DMAP, DISTRICTS, POIS, blockCenter } from './config.js';

const ASPH = [0.16, 0.15, 0.17], SIDE = [0.52, 0.48, 0.44], SAND = [0.88, 0.74, 0.52];
const SEA = [0.25, 0.4, 0.62], LIT = [1.0, 0.78, 0.42], DARK = [0.22, 0.26, 0.36];
const NEON = [[1, 0.3, 0.55], [0.3, 0.9, 1], [1, 0.75, 0.25], [0.5, 1, 0.45], [0.85, 0.45, 1]];

function palm(m, sh, x, z, h, lean, rng, fronds = 7) {
  const trunk = [0.45, 0.32, 0.22], top = [x + lean, h, z + lean * 0.5];
  m.prism(x, 0, z, 0.3, h, 5, trunk);
  m.prism(top[0], h - 0.4, top[2], 0.22, 0.5, 5, trunk);
  const leaf = rng() > 0.5 ? [0.12, 0.52, 0.22] : [0.2, 0.62, 0.28];
  for (let i = 0; i < fronds; i++) {
    const a = i / fronds * Math.PI * 2 + rng() * 0.4;
    m.frond(top[0], h + 0.15, top[2], a, 2.4 + rng() * 0.9, leaf);
  }
  m.cone(top[0], h + 0.1, top[2], 0.55, 0.5, 6, leaf);
  m.box(top[0] + 0.3, h - 0.15, top[2], 0.3, 0.3, 0.3, [0.4, 0.28, 0.15]);
  m.box(top[0] - 0.3, h - 0.2, top[2] + 0.2, 0.28, 0.28, 0.28, [0.4, 0.28, 0.15]);
  sh.quad([x, 0.06, z - 0.8], [x + h * 1.9, 0.06, z - 0.8], [x + h * 1.9, 0.06, z + 0.8], [x, 0.06, z + 0.8], [0, 1, 0], [0.05, 0.02, 0.1], 0);
}

function windows(m, x0, x1, y0, y1, z, face, rng, litRatio) {
  const w = Math.abs(x1 - x0), cols = Math.max(1, Math.floor(w / 2.0)), rows = Math.max(1, Math.floor((y1 - y0) / 2.6));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const lit = rng() < litRatio, col = lit ? LIT : DARK, gl = lit ? 1 : 0.12;
    const u0 = x0 + (c + 0.22) * w / cols, u1 = x0 + (c + 0.78) * w / cols;
    const v0 = y0 + 1.0 + r * 2.6, v1 = v0 + 1.2;
    if (face === 0) m.quad([u0, v0, z], [u1, v0, z], [u1, v1, z], [u0, v1, z], [0, 0, 1], col, gl);
    else if (face === 1) m.quad([u1, v0, z], [u0, v0, z], [u0, v1, z], [u1, v1, z], [0, 0, -1], col, gl);
    else if (face === 2) m.quad([z, v0, u1], [z, v0, u0], [z, v1, u0], [z, v1, u1], [1, 0, 0], col, gl);
    else m.quad([z, v0, u0], [z, v0, u1], [z, v1, u1], [z, v1, u0], [-1, 0, 0], col, gl);
  }
}

function building(m, sh, fx, cx, cz, w, d, h, dist, rng) {
  const face = hx(dist.faces[Math.floor(rng() * dist.faces.length)]);
  const roof = [face[0] * 0.55, face[1] * 0.55, face[2] * 0.55];
  m.box(cx, h / 2, cz, w, h, d, face, 0, roof);
  m.box(cx, h + 0.25, cz, w + 0.7, 0.5, d + 0.7, roof);
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  windows(m, x0, x1, 0, h, z1 + 0.07, 0, rng, 0.68);
  windows(m, x0, x1, 0, h, z0 - 0.07, 1, rng, 0.68);
  windows(m, z0, z1, 0, h, x1 + 0.07, 2, rng, 0.68);
  windows(m, z0, z1, 0, h, x0 - 0.07, 3, rng, 0.68);
  // Rooftop clutter.
  if (rng() < 0.7) m.box(cx + (rng() - 0.5) * w * 0.5, h + 0.8, cz + (rng() - 0.5) * d * 0.5, 1.6, 1.1, 1.4, [0.5, 0.5, 0.5]);
  if (rng() < 0.4) { m.box(cx + w * 0.3, h + 2.2, cz, 0.18, 4.4, 0.18, [0.3, 0.3, 0.3]); m.box(cx + w * 0.3, h + 4.5, cz, 0.5, 0.5, 0.5, [1, 0.3, 0.3], 1); }
  if (h > 20 && rng() < 0.4) {
    const tx = cx - w * 0.28, tz = cz - d * 0.28;
    for (const [ox, oz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) m.box(tx + ox, h + 1.2, tz + oz, 0.25, 2.4, 0.25, [0.35, 0.3, 0.25]);
    m.prism(tx, h + 2.4, tz, 1.5, 1.8, 6, [0.55, 0.45, 0.35]);
    m.cone(tx, h + 4.2, tz, 1.7, 1.0, 6, [0.45, 0.3, 0.25]);
  }
  // Balconies on tall buildings, storefront + neon on low ones.
  if (h > 18) for (let f = 0; f < 3; f++) {
    const by = 6 + f * 7;
    m.box(cx, by, z1 + 0.5, w * 0.7, 0.3, 1.1, roof);
    m.box(cx, by, z0 - 0.5, w * 0.7, 0.3, 1.1, roof);
  }
  if (h < 15 && rng() < dist.neon) {
    const nc = NEON[Math.floor(rng() * NEON.length)];
    m.box(cx, 3.4, z1 + 0.35, Math.min(w * 0.7, 7), 1.1, 0.3, nc, 1);
    m.box(cx, 2.5, z1 + 0.6, w * 0.8, 0.25, 1.2, nc, 0.4);
    fx.box(cx, 1.2, z1 + 0.9, w * 0.8, 0.06, 1.6, nc, 0.5);
  }
  if (h < 12 && rng() < 0.5) m.box(cx, 2.2, z1 + 0.5, w * 0.75, 0.22, 1.4, [0.8, 0.25, 0.2]);
  // Long dusk shadow stretching east, away from the sea sun.
  const sl = h * 2.1;
  sh.quad([x0, 0.07, z0], [x0 + sl, 0.07, z0], [x0 + sl, 0.07, z1], [x0, 0.07, z1], [0, 1, 0], [0.05, 0.02, 0.1], 0);
  return { x0, x1, z0, z1 };
}

function lampPost(m, fx, x, z) {
  m.box(x, 2.6, z, 0.22, 5.2, 0.22, [0.2, 0.2, 0.22]);
  m.box(x + 0.5, 5.1, z, 1.1, 0.18, 0.18, [0.2, 0.2, 0.22]);
  m.box(x + 0.95, 4.95, z, 0.5, 0.3, 0.3, [1, 0.85, 0.55], 1);
  fx.disc(x + 0.95, 0.09, z, 2.6, [1, 0.8, 0.45], 0.55, 10);
}
function billboard(m, x, z, ry, rng) {
  const c = NEON[Math.floor(rng() * NEON.length)];
  const dx = Math.sin(ry), dz = Math.cos(ry);
  m.box(x - dx * 3, 3, z - dz * 3, 0.5, 6, 0.5, [0.3, 0.3, 0.3]);
  m.box(x + dx * 3, 3, z + dz * 3, 0.5, 6, 0.5, [0.3, 0.3, 0.3]);
  const px = -dz, pz = dx;
  m.quad([x - px * 4.5, 4.2, z - pz * 4.5], [x + px * 4.5, 4.2, z + pz * 4.5], [x + px * 4.5, 8.2, z + pz * 4.5], [x - px * 4.5, 8.2, z - pz * 4.5], [dx, 0, dz], c, 0.85);
  m.quad([x - px * 3, 5.2, z - pz * 3], [x + px * 3, 5.2, z + pz * 3], [x + px * 3, 6.4, z + pz * 3], [x - px * 3, 6.4, z - pz * 3], [dx, 0, dz], [1, 1, 1], 0.9);
  m.box(x, 8.5, z, 9.4, 0.5, 0.6, [0.25, 0.25, 0.28]);
}
function umbrella(m, x, z, rng) {
  const cols = [[1, 0.4, 0.3], [0.3, 0.7, 1], [1, 0.8, 0.3], [0.4, 0.85, 0.5], [0.9, 0.5, 0.85]];
  const c = cols[Math.floor(rng() * cols.length)];
  m.box(x, 1.1, z, 0.14, 2.2, 0.14, [0.8, 0.75, 0.65]);
  m.cone(x, 2.1, z, 1.9, 0.8, 8, c);
  m.box(x + 0.9, 0.12, z + 0.5, 1.7, 0.08, 0.8, c, 0.1);
}
function boat(m, x, z, rng) {
  m.ramp(x, 0.1, 0.9, 0.5, z, 3.2, 8, [0.75, 0.7, 0.6]);
  m.box(x, 1.5, z - 1.5, 2.2, 1.4, 2.4, [0.9, 0.85, 0.7]);
  m.box(x, 3.4, z - 1.5, 0.2, 2.4, 0.2, [0.4, 0.35, 0.3]);
  m.box(x, 1.0, z + 3.2, 1.4, 0.8, 1.2, [0.5, 0.4, 0.3]);
}

export function buildWorld(gl, seed) {
  const rng = mulberry32(seed);
  const m = new Mesh(), sh = new Mesh(), fx = new Mesh();
  const colliders = [];
  const L = HALF + ROADW;

  // Ground, sand, sea.
  m.quad([-L, 0, -L], [L, 0, -L], [L, 0, L], [-L, 0, L], [0, 1, 0], [0.3, 0.27, 0.25], 0);
  m.quad([SEA_X - 520, -0.15, -420], [SEA_X, -0.15, -420], [SEA_X, -0.15, 420], [SEA_X - 520, -0.15, 420], [0, 1, 0], SEA, 0.22);
  m.quad([SEA_X, 0.01, -420], [SAND_X, 0.01, -420], [SAND_X, 0.01, 420], [SEA_X, 0.01, 420], [0, 1, 0], SAND, 0);
  fx.quad([SEA_X - 1, 0.05, -420], [SEA_X + 2, 0.05, -420], [SEA_X + 2, 0.05, 420], [SEA_X - 1, 0.05, 420], [0, 1, 0], [1, 0.95, 0.85], 0.4);
  for (let i = 0; i < 5; i++) {
    const z = -160 + i * 80 + rng() * 30;
    fx.quad([SEA_X - 90 - rng() * 40, 0.02, z], [SEA_X - 20, 0.02, z], [SEA_X - 20, 0.02, z + 3], [SEA_X - 90 - rng() * 40, 0.02, z + 3], [0, 1, 0], [1, 0.75, 0.5], 0.7);
  }

  // Roads + markings.
  for (let i = 0; i < 7; i++) {
    const c = (i - 3) * PITCH;
    m.quad([c - ROADW / 2, 0.03, -L], [c + ROADW / 2, 0.03, -L], [c + ROADW / 2, 0.03, L], [c - ROADW / 2, 0.03, L], [0, 1, 0], ASPH, 0);
    m.quad([-L, 0.03, c - ROADW / 2], [L, 0.03, c - ROADW / 2], [L, 0.03, c + ROADW / 2], [-L, 0.03, c + ROADW / 2], [0, 1, 0], ASPH, 0);
    for (let d = -L + 8; d < L - 4; d += 9) {
      m.quad([c - 0.25, 0.06, d], [c + 0.25, 0.06, d], [c + 0.25, 0.06, d + 3.4], [c - 0.25, 0.06, d + 3.4], [0, 1, 0], [0.85, 0.75, 0.4], 0.15);
      m.quad([d, 0.06, c - 0.25], [d + 3.4, 0.06, c - 0.25], [d + 3.4, 0.06, c + 0.25], [d, 0.06, c + 0.25], [0, 1, 0], [0.85, 0.75, 0.4], 0.15);
    }
    // Puddles: warm sky reflections on the asphalt.
    for (let k = 0; k < 5; k++) {
      const d = (rng() * 2 - 1) * (L - 20), w = 2 + rng() * 3;
      fx.quad([c - w / 2 + (rng() - 0.5) * 5, 0.08, d], [c + w / 2 + (rng() - 0.5) * 5, 0.08, d], [c + w / 2, 0.08, d + 4 + rng() * 4], [c - w / 2, 0.08, d + 4 + rng() * 4], [0, 1, 0], [1, 0.6, 0.4], 0.5);
    }
  }
  // Crosswalks at every intersection.
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    const x = (i - 3) * PITCH, z = (j - 3) * PITCH;
    for (let b = 0; b < 4; b++) {
      m.quad([x - 4.5 + b * 3, 0.06, z - ROADW / 2 - 1.2], [x - 2.5 + b * 3, 0.06, z - ROADW / 2 - 1.2], [x - 2.5 + b * 3, 0.06, z - ROADW / 2 + 1.2], [x - 4.5 + b * 3, 0.06, z - ROADW / 2 + 1.2], [0, 1, 0], [0.8, 0.8, 0.78], 0.1);
    }
  }

  // Blocks: sidewalks + buildings + palms + shrubs.
  const parks = [[2, 1], [4, 1]];
  for (let bz = 0; bz < 6; bz++) for (let bx = 0; bx < 6; bx++) {
    const [cx, cz] = blockCenter(bx, bz), dist = DISTRICTS[DMAP[bz][bx]];
    const inner = PITCH - ROADW;
    m.box(cx, 0.15, cz, inner + 4, 0.3, inner + 4, SIDE);
    if (parks.some(([px, pz]) => px === bx && pz === bz)) {
      m.box(cx, 0.4, cz, inner - 4, 0.25, inner - 4, [0.25, 0.45, 0.25]);
      for (let t = 0; t < 6; t++) {
        const tx = cx + (rng() - 0.5) * (inner - 10), tz = cz + (rng() - 0.5) * (inner - 10);
        m.prism(tx, 0.5, tz, 0.35, 2.5, 5, [0.4, 0.3, 0.2]);
        m.ellipsoid(tx, 4.2, tz, 2.2, 1.8, 2.2, 8, [0.15, 0.45, 0.2]);
      }
      continue;
    }
    const n = 1 + Math.floor(rng() * 2.4);
    for (let b = 0; b < n; b++) {
      const w = 10 + rng() * 12, d = 10 + rng() * 12;
      const ox = n === 1 ? 0 : (b === 0 ? -8 : 8) + (rng() - 0.5) * 4;
      const oz = n === 1 ? 0 : (rng() - 0.5) * 8;
      const h = dist.hMin + rng() * (dist.hMax - dist.hMin);
      colliders.push(building(m, sh, fx, cx + ox, cz + oz, w, d, h, dist, rng));
    }
    for (let p = 0; p < dist.palms; p++) {
      const a = rng() * Math.PI * 2, r = inner / 2 - 1;
      palm(m, sh, cx + Math.cos(a) * r, cz + Math.sin(a) * r, 5 + rng() * 3, (rng() - 0.5) * 0.8, rng);
    }
    for (let s = 0; s < 4; s++)
      m.box(cx + (rng() - 0.5) * inner, 0.6, cz + (rng() - 0.5) * inner, 1.2, 0.9, 1.2, [0.2, 0.4, 0.2]);
  }

  // Palm avenue: tall star-frond palms lining the beachfront road, both sides.
  for (let z = -HALF + 6; z < HALF; z += 15) {
    palm(m, sh, -HALF - 2, z + (rng() - 0.5) * 3, 7.5 + rng() * 2.5, (rng() - 0.5) * 1.2, rng, 8);
    if (rng() < 0.8) palm(m, sh, -HALF + 14, z + 7 + (rng() - 0.5) * 3, 6.5 + rng() * 2, (rng() - 0.5) * 1, rng, 8);
    if (rng() < 0.55) palm(m, sh, SAND_X - 8 - rng() * 14, z + (rng() - 0.5) * 6, 6 + rng() * 2.5, (rng() - 0.5) * 1.4, rng, 7);
  }
  // Beach life: umbrellas, towels, beach crowd spots.
  for (let i = 0; i < 12; i++) umbrella(m, SAND_X - 6 - rng() * 26, (rng() * 2 - 1) * (HALF - 10), rng);
  // Lamps along every other road.
  for (let i = 0; i < 7; i += 2) for (let d = -HALF + 12; d < HALF; d += 34) {
    lampPost(m, fx, (i - 3) * PITCH + ROADW / 2 + 1, d);
    lampPost(m, fx, d, (i - 3) * PITCH - ROADW / 2 - 1);
  }
  // Traffic lights at four central intersections.
  for (const [ix, iz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = ix * PITCH + 7, z = iz * PITCH + 7;
    m.box(x, 2.8, z, 0.25, 5.6, 0.25, [0.15, 0.15, 0.16]);
    m.box(x, 5.4, z, 0.7, 1.8, 0.5, [0.1, 0.1, 0.1]);
    m.box(x, 5.9, z + 0.28, 0.4, 0.4, 0.1, [1, 0.2, 0.2], 1);
    m.box(x, 5.4, z + 0.28, 0.4, 0.4, 0.1, [1, 0.8, 0.2], 0.7);
    m.box(x, 4.9, z + 0.28, 0.4, 0.4, 0.1, [0.3, 1, 0.4], 0.7);
  }
  // Billboards.
  billboard(m, -HALF + 16, -92, 0.3, rng);
  billboard(m, -46, -HALF + 16, 1.2, rng);
  billboard(m, 92, 40, -0.4, rng);
  billboard(m, -100, 100, 0.9, rng);
  // Boats near the docks.
  boat(m, SEA_X - 24, 96, rng); boat(m, SEA_X - 34, 122, rng); boat(m, SEA_X - 18, 60, rng);
  // Garage: Bengkel Bambang — big orange block, open front, sign band.
  {
    const [gx, gz] = blockCenter(3, 3);
    m.box(gx, 4, gz, 20, 8, 14, [0.85, 0.5, 0.2], 0, [0.5, 0.3, 0.15]);
    m.box(gx, 2.2, gz + 7.1, 12, 4.4, 0.4, [0.08, 0.07, 0.08]);
    m.box(gx, 6.8, gz + 7.2, 14, 1.4, 0.4, [1, 0.8, 0.25], 0.9);
    for (let i = 0; i < 6; i++) m.box(gx - 5 + i * 2, 0.5, gz + 7.2, 1, 1, 0.3, i % 2 ? [0.9, 0.9, 0.9] : [0.15, 0.15, 0.15]);
    colliders.push({ x0: gx - 10, x1: gx + 10, z0: gz - 7, z1: gz + 7 });
  }
  // Mountains + skyline ring.
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 + rng() * 0.4, r = 430 + rng() * 90;
    m.cone(Math.cos(a) * r, -4, Math.sin(a) * r, 70 + rng() * 50, 70 + rng() * 60, 7, [0.32, 0.22, 0.38]);
  }
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2 + rng() * 0.2, r = 290 + rng() * 70;
    const h = 26 + rng() * 46;
    m.box(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r, 16 + rng() * 14, h, 16 + rng() * 14, [0.38, 0.3, 0.42]);
  }

  const pois = POIS.map(([name, bx, bz, kind]) => {
    const [x, z] = blockCenter(bx, bz);
    return { name, x, z, kind };
  });
  return {
    opaque: m.build(gl), shadow: sh.build(gl), fx: fx.build(gl),
    colliders, pois,
    tris: (m.i.length + sh.i.length + fx.i.length) / 3,
  };
}

// Dashed gold route line along a Manhattan path, rebuilt per mission target.
export function buildRoute(gl, from, to) {
  const m = new Mesh();
  const gold = [1, 0.8, 0.25];
  const segs = [];
  const mid = [to[0], from[1]];
  segs.push([from, mid], [mid, to]);
  for (const [[ax, az], [bx, bz]] of segs) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 4);
    for (let i = 0; i < n; i += 2) {
      const t0 = i / n, t1 = Math.min(1, (i + 1) / n);
      const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, px = -dz / l * 0.5, pz = dx / l * 0.5;
      m.quad([x0 - px, 0.12, z0 - pz], [x0 + px, 0.12, z0 + pz], [x1 + px, 0.12, z1 + pz], [x1 - px, 0.12, z1 - pz], [0, 1, 0], gold, 0.8);
    }
  }
  return m.build(gl);
}

// Mission beacon: translucent pillar + floating gold diamond.
export function buildBeacon(gl) {
  const pillar = new Mesh();
  pillar.prism(0, 0, 0, 1.1, 26, 8, [1, 0.8, 0.3], 0.9);
  const diamond = new Mesh();
  diamond.cone(0, 0, 0, 1.0, 1.6, 4, [1, 0.85, 0.3], 1);
  const dm = new Mesh();
  dm.cone(0, -1.6, 0, 1.0, 1.6, 4, [1, 0.85, 0.3], 1);
  return { pillar: pillar.build(gl), diamond: diamond.build(gl), diamondLow: dm.build(gl) };
}
export { clamp };
