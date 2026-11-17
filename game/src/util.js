// Seeded RNG, math helpers, and column-major 4x4 matrix math.
export const TAU = Math.PI * 2;
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export function dampAngle(a, b, k, dt) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-k * dt));
}
export const d2 = (ax, az, bx, bz) => { const x = ax - bx, z = az - bz; return Math.sqrt(x * x + z * z); };
export const hyp = (x, z) => Math.sqrt(x * x + z * z);

export function mPersp(fov, asp, near, far) {
  const f = 1 / Math.tan(fov / 2), d = 1 / (near - far);
  return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * d, -1, 0, 0, 2 * far * near * d, 0]);
}
export function mLook(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez;
  const fl = hyp(hyp(fx, fy), fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  let rx = -fz, ry = 0, rz = fx; const rl = hyp(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  return new Float32Array([
    rx, ux, -fx, 0, ry, uy, -fy, 0, rz, uz, -fz, 0,
    -(rx * ex + ry * ey + rz * ez), -(ux * ex + uy * ey + uz * ez), fx * ex + fy * ey + fz * ez, 1,
  ]);
}
export function mMul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
export function mModel(x, y, z, ry, s = 1) {
  const c = Math.cos(ry) * s, sn = Math.sin(ry) * s;
  return new Float32Array([c, 0, -sn, 0, 0, s, 0, 0, sn, 0, c, 0, x, y, z, 1]);
}
export function mModelRX(x, y, z, rx, s = 1) {
  const c = Math.cos(rx) * s, sn = Math.sin(rx) * s;
  return new Float32Array([s, 0, 0, 0, 0, c, sn, 0, 0, -sn, c, 0, x, y, z, 1]);
}
export function mScaleModel(x, y, z, ry, sx, sy, sz) {
  const c = Math.cos(ry), sn = Math.sin(ry);
  return new Float32Array([c * sx, 0, -sn * sx, 0, 0, sy, 0, 0, sn * sz, 0, c * sz, 0, x, y, z, 1]);
}
export function projectPt(mvp, x, y, z) {
  const w = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
  if (w <= 0.01) return null;
  return [(mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12]) / w,
          (mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13]) / w];
}
