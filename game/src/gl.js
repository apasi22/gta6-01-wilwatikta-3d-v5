// Raw WebGL1 forward renderer: one lit scene program plus a sky-gradient
// program, and an append-only mesh builder. No textures, no libraries.
import { mMul } from './util.js';

export function hx(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
const VSH = `attribute vec3 aPos;attribute vec3 aNorm;attribute vec3 aCol;attribute float aGlow;
uniform mat4 uMVP;uniform mat4 uModel;uniform vec3 uCam;uniform vec3 uSun;uniform vec3 uSunCol;
uniform float uAmb;uniform float uFogN;uniform float uFogF;
varying vec3 vCol;varying vec3 vBase;varying float vGlow;varying float vFog;
void main(){vec4 wp=uModel*vec4(aPos,1.0);vec3 n=normalize(mat3(uModel)*aNorm);
float diff=max(dot(n,uSun),0.0);vCol=aCol*(uAmb+diff*uSunCol);vBase=aCol;vGlow=aGlow;
vFog=clamp((distance(wp.xyz,uCam)-uFogN)/(uFogF-uFogN),0.0,1.0);
gl_Position=uMVP*vec4(aPos,1.0);}`;
const FSH = `precision mediump float;
varying vec3 vCol;varying vec3 vBase;varying float vGlow;varying float vFog;
uniform vec3 uFogCol;uniform vec3 uTint;uniform float uAlpha;uniform float uGlow;
void main(){float gm=clamp(vGlow*uGlow,0.0,1.0);
vec3 col=mix(vCol*uTint,vBase*(1.2+0.8*uGlow),gm);
col=mix(col,uFogCol,vFog);gl_FragColor=vec4(col,uAlpha);}`;
const SKYV = `attribute vec2 aXY;varying vec2 vXY;void main(){vXY=aXY;gl_Position=vec4(aXY,0.999,1.0);}`;
const SKYF = `precision mediump float;varying vec2 vXY;
uniform vec3 uTop;uniform vec3 uMid;uniform vec3 uBot;uniform vec2 uSunP;uniform vec3 uSunCol;
uniform float uSunI;uniform float uAsp;
void main(){float h=vXY.y*0.5+0.5;
vec3 col=h>0.55?mix(uMid,uTop,(h-0.55)/0.45):mix(uBot,uMid,h/0.55);
vec2 d=(vXY-uSunP)*vec2(uAsp,1.0);float dist=length(d);
col+=uSunCol*(smoothstep(0.085,0.055,dist)*1.25*uSunI+smoothstep(0.38,0.05,dist)*0.32*uSunI);
gl_FragColor=vec4(col,1.0);}`;

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export class Mesh {
  constructor() { this.p = []; this.n = []; this.c = []; this.g = []; this.i = []; this.buf = null; }
  v(x, y, z, nx, ny, nz, col, glow) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); this.g.push(glow);
    return this.p.length / 3 - 1;
  }
  tri(a, b, c, n, col, glow) {
    const A = this.v(...a, ...n, col, glow), B = this.v(...b, ...n, col, glow), C = this.v(...c, ...n, col, glow);
    this.i.push(A, B, C);
  }
  quad(a, b, c, d, n, col, glow) { this.tri(a, b, c, n, col, glow); this.tri(a, c, d, n, col, glow); }
  box(cx, cy, cz, sx, sy, sz, col, glow = 0, top = null) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    const tc = top || col;
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], tc, glow);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col, glow);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, glow);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, glow);
    this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], col, glow);
    this.quad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], col, glow);
  }
  prism(cx, cy, cz, r, h, sides, col, glow = 0) {
    const pts = [];
    for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides, mx = (pts[i][0] + pts[j][0]) / 2 - cx, mz = (pts[i][1] + pts[j][1]) / 2 - cz;
      const l = Math.hypot(mx, mz) || 1;
      this.quad([pts[i][0], cy, pts[i][1]], [pts[j][0], cy, pts[j][1]], [pts[j][0], cy + h, pts[j][1]], [pts[i][0], cy + h, pts[i][1]], [mx / l, 0, mz / l], col, glow);
    }
    for (let i = 1; i < sides - 1; i++) this.tri([pts[0][0], cy + h, pts[0][1]], [pts[i][0], cy + h, pts[i][1]], [pts[i + 1][0], cy + h, pts[i + 1][1]], [0, 1, 0], col, glow);
  }
  cone(cx, cy, cz, r, h, sides, col, glow = 0) {
    const pts = [];
    for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides, mx = (pts[i][0] + pts[j][0]) / 2 - cx, mz = (pts[i][1] + pts[j][1]) / 2 - cz;
      const l = Math.hypot(mx, mz) || 1;
      this.tri([pts[i][0], cy, pts[i][1]], [pts[j][0], cy, pts[j][1]], [cx, cy + h, cz], [mx / l, 0.4, mz / l], col, glow);
    }
  }
  disc(cx, cy, cz, r, col, glow = 0, sides = 10) {
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2;
      this.tri([cx, cy, cz], [cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r], [0, 1, 0], col, glow);
    }
  }
  // Tapered frond: a bent quad from base toward (dx,dz), rising then drooping.
  frond(x, y, z, ang, len, col, glow = 0) {
    const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz, pz = dx, w = 0.55;
    const mx = x + dx * len * 0.55, mz = z + dz * len * 0.55, my = y + len * 0.22;
    const tx = x + dx * len, tz = z + dz * len, ty = y - len * 0.28;
    this.quad([x - px * w, y, z - pz * w], [x + px * w, y, z + pz * w], [mx + px * w * 0.5, my, mz + pz * w * 0.5], [mx - px * w * 0.5, my, mz - pz * w * 0.5], [0, 1, 0], col, glow);
    this.quad([mx - px * w * 0.5, my, mz - pz * w * 0.5], [mx + px * w * 0.5, my, mz + pz * w * 0.5], [tx, ty, tz], [tx, ty, tz], [0, 1, 0], col, glow);
  }
  // Cylinder along X, angular span a0..a1, optional end caps (arches pass caps=false).
  cylX(cx, cy, cz, r, len, sides, col, glow = 0, a0 = 0, a1 = Math.PI * 2, caps = true) {
    const x0 = cx - len / 2, x1 = cx + len / 2, pts = [];
    for (let i = 0; i <= sides; i++) { const a = a0 + (a1 - a0) * i / sides; pts.push([cy + Math.cos(a) * r, cz + Math.sin(a) * r, a]); }
    for (let i = 0; i < sides; i++) {
      const am = (pts[i][2] + pts[i + 1][2]) / 2, n = [0, Math.cos(am), Math.sin(am)];
      this.quad([x0, pts[i][0], pts[i][1]], [x1, pts[i][0], pts[i][1]], [x1, pts[i + 1][0], pts[i + 1][1]], [x0, pts[i + 1][0], pts[i + 1][1]], n, col, glow);
    }
    if (caps && a1 - a0 > Math.PI * 1.9) for (let i = 1; i < sides - 1; i++) {
      this.tri([x1, pts[0][0], pts[0][1]], [x1, pts[i][0], pts[i][1]], [x1, pts[i + 1][0], pts[i + 1][1]], [1, 0, 0], col, glow);
      this.tri([x0, pts[0][0], pts[0][1]], [x0, pts[i + 1][0], pts[i + 1][1]], [x0, pts[i][0], pts[i][1]], [-1, 0, 0], col, glow);
    }
  }
  // Cylinder along Z (fuselages, booms), same span/cap options.
  cylZ(cx, cy, cz, r, len, sides, col, glow = 0, a0 = 0, a1 = Math.PI * 2, caps = true) {
    const z0 = cz - len / 2, z1 = cz + len / 2, pts = [];
    for (let i = 0; i <= sides; i++) { const a = a0 + (a1 - a0) * i / sides; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, a]); }
    for (let i = 0; i < sides; i++) {
      const am = (pts[i][2] + pts[i + 1][2]) / 2, n = [Math.cos(am), Math.sin(am), 0];
      this.quad([pts[i][0], pts[i][1], z0], [pts[i + 1][0], pts[i + 1][1], z0], [pts[i + 1][0], pts[i + 1][1], z1], [pts[i][0], pts[i][1], z1], n, col, glow);
    }
    if (caps && a1 - a0 > Math.PI * 1.9) for (let i = 1; i < sides - 1; i++) {
      this.tri([pts[0][0], pts[0][1], z1], [pts[i][0], pts[i][1], z1], [pts[i + 1][0], pts[i + 1][1], z1], [0, 0, 1], col, glow);
      this.tri([pts[0][0], pts[0][1], z0], [pts[i + 1][0], pts[i + 1][1], z0], [pts[i][0], pts[i][1], z0], [0, 0, -1], col, glow);
    }
  }
  // Scaled UV sphere: canopies, nose bubbles, helmets, tree crowns.
  ellipsoid(cx, cy, cz, rx, ry, rz, seg, col, glow = 0) {
    const rings = Math.max(3, seg >> 1);
    const P = (i, j) => {
      const th = i / rings * Math.PI, ph = j / seg * Math.PI * 2;
      return [cx + Math.sin(th) * Math.cos(ph) * rx, cy + Math.cos(th) * ry, cz + Math.sin(th) * Math.sin(ph) * rz];
    };
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg, th = (i + 0.5) / rings * Math.PI, ph = (j + 0.5) / seg * Math.PI * 2;
      const nx = Math.sin(th) * Math.cos(ph) / rx, ny = Math.cos(th) / ry, nz = Math.sin(th) * Math.sin(ph) / rz;
      const l = Math.hypot(nx, ny, nz) || 1;
      this.quad(P(i, j), P(i + 1, j), P(i + 1, j1), P(i, j1), [nx / l, ny / l, nz / l], col, glow);
    }
  }
  // Wedge: flat bottom at yBot, top sloping from yA at z0 to yB at z1.
  ramp(cx, yBot, yA, yB, cz, sx, sz, col, glow = 0) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    this.quad([x0, yA, z0], [x1, yA, z0], [x1, yB, z1], [x0, yB, z1], [0, 1, 0], col, glow);
    this.quad([x0, yBot, z1], [x1, yBot, z1], [x1, yBot, z0], [x0, yBot, z0], [0, -1, 0], col, glow);
    this.quad([x0, yBot, z0], [x0, yBot, z1], [x0, yB, z1], [x0, yA, z0], [-1, 0, 0], col, glow);
    this.quad([x1, yBot, z1], [x1, yBot, z0], [x1, yA, z0], [x1, yB, z1], [1, 0, 0], col, glow);
    this.tri([x0, yBot, z0], [x1, yBot, z0], [x1, yA, z0], [0, 0, -1], col, glow);
    this.tri([x0, yBot, z0], [x1, yA, z0], [x0, yA, z0], [0, 0, -1], col, glow);
    this.tri([x1, yBot, z1], [x0, yBot, z1], [x0, yB, z1], [0, 0, 1], col, glow);
    this.tri([x1, yBot, z1], [x0, yB, z1], [x1, yB, z1], [0, 0, 1], col, glow);
  }
  build(gl) {
    const mk = (arr, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return b; };
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.i), gl.STATIC_DRAW);
    this.buf = { p: mk(this.p, 3), n: mk(this.n, 3), c: mk(this.c, 3), g: mk(this.g, 1), i: ib, count: this.i.length };
    return this;
  }
}

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
    || canvas.getContext('experimental-webgl');
  if (!gl) throw new Error('WebGL unavailable');
  const ext = gl.getExtension('OES_element_index_uint');
  if (!ext) throw new Error('uint indices unavailable');
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  const prog = program(gl, VSH, FSH);
  const skyProg = program(gl, SKYV, SKYF);
  const A = (p, n) => gl.getAttribLocation(p, n), U = (p, n) => gl.getUniformLocation(p, n);
  const L = {
    aPos: A(prog, 'aPos'), aNorm: A(prog, 'aNorm'), aCol: A(prog, 'aCol'), aGlow: A(prog, 'aGlow'),
    uMVP: U(prog, 'uMVP'), uModel: U(prog, 'uModel'), uCam: U(prog, 'uCam'), uSun: U(prog, 'uSun'),
    uSunCol: U(prog, 'uSunCol'), uAmb: U(prog, 'uAmb'), uFogN: U(prog, 'uFogN'), uFogF: U(prog, 'uFogF'),
    uFogCol: U(prog, 'uFogCol'), uTint: U(prog, 'uTint'), uAlpha: U(prog, 'uAlpha'), uGlow: U(prog, 'uGlow'),
  };
  const S = { aXY: A(skyProg, 'aXY'), uTop: U(skyProg, 'uTop'), uMid: U(skyProg, 'uMid'), uBot: U(skyProg, 'uBot'),
    uSunP: U(skyProg, 'uSunP'), uSunCol: U(skyProg, 'uSunCol'), uSunI: U(skyProg, 'uSunI'), uAsp: U(skyProg, 'uAsp') };
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  let vp = IDENTITY, cam = [0, 0, 0];

  function bindMesh(mesh) {
    const b = mesh.buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.p); gl.enableVertexAttribArray(L.aPos); gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.n); gl.enableVertexAttribArray(L.aNorm); gl.vertexAttribPointer(L.aNorm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.c); gl.enableVertexAttribArray(L.aCol); gl.vertexAttribPointer(L.aCol, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.g); gl.enableVertexAttribArray(L.aGlow); gl.vertexAttribPointer(L.aGlow, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i);
  }
  return {
    gl,
    resize(w, h) { if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } gl.viewport(0, 0, w, h); },
    setPalette(p) {
      gl.useProgram(prog);
      gl.uniform3fv(L.uSun, p.sun); gl.uniform3fv(L.uSunCol, p.sunCol); gl.uniform1f(L.uAmb, p.amb);
      gl.uniform1f(L.uFogN, p.fogN); gl.uniform1f(L.uFogF, p.fogF); gl.uniform3fv(L.uFogCol, p.fog);
      gl.uniform1f(L.uGlow, p.glow);
      gl.useProgram(skyProg);
      gl.uniform3fv(S.uTop, p.sky[0]); gl.uniform3fv(S.uMid, p.sky[1]); gl.uniform3fv(S.uBot, p.sky[2]);
      gl.uniform3fv(S.uSunCol, p.sunCol); gl.uniform1f(S.uSunI, p.sunI);
      gl.useProgram(prog);
    },
    setCamera(viewProj, camPos) { vp = viewProj; cam = camPos; },
    drawSky(sunNDC, aspect) {
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      gl.useProgram(skyProg);
      gl.uniform2f(S.uSunP, sunNDC[0], sunNDC[1]); gl.uniform1f(S.uAsp, aspect);
      gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
      gl.enableVertexAttribArray(S.aXY); gl.vertexAttribPointer(S.aXY, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
    },
    begin() { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); },
    draw(mesh, model, tint, alpha = 1) {
      gl.useProgram(prog);
      gl.uniformMatrix4fv(L.uMVP, false, mMul(vp, model || IDENTITY));
      gl.uniformMatrix4fv(L.uModel, false, model || IDENTITY);
      gl.uniform3fv(L.uCam, cam);
      gl.uniform3fv(L.uTint, tint || [1, 1, 1]);
      gl.uniform1f(L.uAlpha, alpha);
      bindMesh(mesh);
      gl.drawElements(gl.TRIANGLES, mesh.buf.count, gl.UNSIGNED_INT, 0);
    },
    transparent(on, additive) {
      if (on) { gl.enable(gl.BLEND); gl.depthMask(false); gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA); }
      else { gl.disable(gl.BLEND); gl.depthMask(true); }
    },
  };
}
