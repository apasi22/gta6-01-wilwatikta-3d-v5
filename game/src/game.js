// Game state, physics, camera, combat, wanted system, crew, saves, loop.
import { clamp, damp, dampAngle, d2, mPersp, mLook, mMul, mModel, mModelRX, mScaleModel, projectPt, TAU } from './util.js';
import { DAYPARTS, DISTRICTS, districtAt, CARS, WEAPONS, CREW, MISSIONS, DISPATCH, RADIO, PITCH, HALF, GARAGE_POS, blockCenter } from './config.js';
import { createRenderer } from './gl.js';
import { buildWorld, buildRoute, buildBeacon } from './world.js';
import { createActors, updateTraffic, updatePolice, updatePeds, updateEffects, spawnEffect, drawActors, drawActorFx, buildSportsCar } from './actors.js';
import { startMission, updateMission, missionTarget, clearMissionEntities } from './missions.js';

const STEP = 1 / 60;
const SAVE_KEY = 'wilwatikta-saves-v5';

function collide(x, z, r, colliders) {
  let hit = false;
  for (const c of colliders) {
    const nx = clamp(x, c.x0, c.x1), nz = clamp(z, c.z0, c.z1);
    const dx = x - nx, dz = z - nz, d2v = dx * dx + dz * dz;
    if (d2v < r * r) {
      hit = true;
      if (d2v < 1e-6) { x = c.x1 + r; continue; }
      const d = Math.sqrt(d2v), push = (r - d) / d;
      x += dx * push; z += dz * push;
    }
  }
  x = clamp(x, -HALF - 30, HALF + 6); z = clamp(z, -HALF - 6, HALF + 6);
  return { x, z, hit };
}

export function createGame(canvas, opts = {}) {
  const seed = opts.seed || 1;
  const R = createRenderer(canvas);
  const world = buildWorld(R.gl, seed);
  const A = createActors(R.gl, seed);
  const beacon = buildBeacon(R.gl);
  const heroPaints = [buildSportsCar(R.gl, CARS[0].color), buildSportsCar(R.gl, [0.95, 0.45, 0.1]), buildSportsCar(R.gl, [0.15, 0.6, 0.6])];

  const G = {
    mode: 'title', time: 0, clockMin: 18 * 60 + 36, day: 1, daypart: 'dusk', daypartLock: 'dusk',
    wanted: 0, wantedT: 0, bustT: 0, noiseT: 0, cash: 500, health: 100, armour: 0,
    rep: 0, kills: 0, stolen: 0, missionIdx: 0, missionsDone: MISSIONS.map(() => false),
    mission: null, missionCar: null, routeMesh: null, routeT: 0,
    player: { x: GARAGE_POS[0] + 14, z: GARAGE_POS[1] + 10, ry: Math.PI * 0.75, speed: 0, driving: true },
    carKind: 'hero', colorIdx: 0, paintIdx: 0, carCond: 100, parked: null,
    upgrades: { engine: 0, armor: 0, tires: 0 },
    slot: 1, unlocked: [true, true, false, false],
    ammo: WEAPONS.map(w => ({ mag: w.mag, res: w.reserve })),
    fireT: 0, reloadT: 0, punchT: 0, gunshotT: 0, walkPhase: 0,
    crewCd: [0, 0, 0], crewSlow: 0,
    cam: { x: 0, y: 8, z: 0, tx: 0, ty: 1, tz: 0, fov: 62 },
    camOverride: null, keys: {}, shotMode: !!opts.shotMode, frozen: false,
    station: 0, muted: false, dispatchT: 0, dispatchLine: DISPATCH[0], dialogue: null, dialogueT: 0,
    banner: null, bannerT: 0, district: 2, districtT: 0, overlayT: 0, smokeT: 0,
    world, actors: A, beacon, heroPaints, renderer: R, ui: null, radio: null, seed,
  };

  function say(who, role, line, dur = 5) { G.dialogue = { who, role, line }; G.dialogueT = dur; }
  function showBanner(text, sub, dur = 2.6) { G.banner = { text, sub }; G.bannerT = dur; }
  G.say = say; G.showBanner = showBanner;

  G.addWanted = (n) => {
    if (G.wanted === 0 && n > 0) { G.dispatchLine = DISPATCH[Math.floor(G.time) % DISPATCH.length]; }
    G.wanted = clamp(G.wanted + n, 0, 5); G.wantedT = 0;
  };
  function rebuildRoute() {
    const t = missionTarget(G);
    if (!t) { G.routeMesh = null; return; }
    G.routeMesh = buildRoute(R.gl, [G.player.x, G.player.z], t);
    G.routeT = 0;
  }
  G.rebuildRoute = rebuildRoute;

  function enterCar(kind, colorIdx, x, z, ry) {
    G.player.driving = true; G.player.x = x; G.player.z = z; G.player.ry = ry; G.player.speed = 0;
    G.carKind = kind; G.colorIdx = colorIdx; G.parked = null;
  }
  function tryEnterExit() {
    const p = G.player;
    if (p.driving) {
      G.parked = { x: p.x, z: p.z, ry: p.ry, kind: G.carKind, colorIdx: G.colorIdx };
      p.driving = false; p.speed = 0;
      p.x += Math.cos(p.ry) * 2.2; p.z -= Math.sin(p.ry) * 2.2;
      return;
    }
    if (G.parked && d2(p.x, p.z, G.parked.x, G.parked.z) < 4.5) {
      enterCar(G.parked.kind, G.parked.colorIdx, G.parked.x, G.parked.z, G.parked.ry);
      return;
    }
    if (G.missionCar && d2(p.x, p.z, G.missionCar.x, G.missionCar.z) < 4.5) {
      const mc = G.missionCar; G.missionCar = null;
      enterCar('coupe', 0, mc.x, mc.z, mc.ry);
      if (G.mission) G.mission.stolen = true;
      say('RATNA', 'LOOKOUT', 'That is the one. Now drive it home — quietly.');
      return;
    }
    for (let i = 0; i < A.traffic.length; i++) {
      const c = A.traffic[i];
      if (d2(p.x, p.z, c.x, c.z) < 4.5) {
        A.traffic.splice(i, 1);
        enterCar('sedan', c.mesh, c.x, c.z, c.ry);
        G.stolen++; G.addWanted(1);
        say('SUGENG', 'GETAWAY DRIVER', 'Borrowed. The owner can file a report.');
        return;
      }
    }
  }

  function fireWeapon() {
    const w = WEAPONS[G.slot], a = G.ammo[G.slot];
    if (G.reloadT > 0 || G.fireT > 0) return;
    if (a.mag <= 0) { startReload(); return; }
    if (a.mag !== Infinity) a.mag--;
    G.fireT = w.rate; G.gunshotT = 0.6;
    const p = G.player, fx = Math.sin(p.ry), fz = Math.cos(p.ry);
    const mx = p.x + fx * (p.driving ? 2.2 : 0.9), mz = p.z + fz * (p.driving ? 2.2 : 0.9), my = p.driving ? 1.1 : 1.35;
    spawnEffect(A, 'flash', mx, my, mz);
    let best = null, bestD = w.range;
    const consider = (x, z, obj, r) => {
      const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.5 || d > bestD) return;
      const dot = (dx * fx + dz * fz) / d;
      if (dot > 0.86 && d < bestD) { bestD = d; best = { x, z, obj, r }; }
    };
    for (const e of A.enemies) if (!e.dead) consider(e.x, e.z, e, 1);
    for (const pd of A.peds) if (!pd.dead) consider(pd.x, pd.z, pd, 1);
    const hx = p.x + fx * bestD, hz = p.z + fz * bestD;
    spawnEffect(A, 'tracer', mx, my, mz, hx, my, hz);
    if (best) {
      spawnEffect(A, 'spark', best.x, 1.2, best.z);
      if (best.obj.hp !== undefined) {
        best.obj.hp -= w.dmg;
        if (best.obj.hp <= 0 && !best.obj.dead) { best.obj.dead = true; G.kills++; G.rep += 15; }
      } else { best.obj.dead = true; G.addWanted(1); }
    }
    if (G.radio) G.radio.shoot();
    if (G.noiseT <= 0 && A.police.some(c => d2(c.x, c.z, p.x, p.z) < 45)) { G.addWanted(1); G.noiseT = 6; }
  }
  function startReload() {
    const w = WEAPONS[G.slot], a = G.ammo[G.slot];
    if (a.mag === Infinity || a.res <= 0 || a.mag === w.mag || G.reloadT > 0) return;
    G.reloadT = 1.1;
  }
  function punch() {
    if (G.punchT > 0) return;
    G.punchT = 0.45; G.gunshotT = 0.3;
    const p = G.player, fx = Math.sin(p.ry), fz = Math.cos(p.ry);
    for (const e of A.enemies) {
      if (!e.dead && d2(p.x, p.z, e.x, e.z) < 3) {
        e.hp -= 20; spawnEffect(A, 'spark', e.x, 1.2, e.z);
        if (e.hp <= 0) { e.dead = true; G.kills++; }
      }
    }
    if (G.radio) G.radio.punch();
  }
  function useCrew(i) {
    const c = CREW[i];
    if (G.crewCd[i] > 0 || G.cash < c.cost) return;
    G.cash -= c.cost; G.crewCd[i] = c.cd;
    if (i === 0) { A.roadblocks.length = 0; A.heli.ban = 12; G.crewSlow = 6; }
    if (i === 1) G.carCond = 100;
    if (i === 2) G.wanted = Math.max(0, G.wanted - 1);
    say(c.who, 'CREW', c.line);
    if (G.radio) G.radio.pickup();
  }
  G.useCrew = useCrew;

  function stepPlay(dt) {
    const p = G.player, car = CARS[G.carKind === 'hero' ? 0 : G.carKind === 'coupe' ? 1 : 2 + (G.colorIdx % 4)];
    const topKmh = car.top * (1 + G.upgrades.engine * 0.09);
    const top = topKmh / 3.6 * (G.carCond <= 0 ? 0.25 : 1);
    if (p.driving) {
      const fwd = (G.keys['KeyW'] ? 1 : 0) - (G.keys['KeyS'] ? 1 : 0);
      const steer = (G.keys['KeyA'] ? 1 : 0) - (G.keys['KeyD'] ? 1 : 0);
      const handbrake = !!G.keys['ShiftLeft'];
      if (fwd > 0) p.speed += car.acc * (1 - p.speed / top) * dt;
      else if (fwd < 0) p.speed -= (p.speed > 0 ? 30 : 12) * dt;
      else p.speed -= Math.sign(p.speed) * Math.min(Math.abs(p.speed), (handbrake ? 26 : 4) * dt);
      p.speed = clamp(p.speed, -12, top);
      const sf = clamp(Math.abs(p.speed) / 12, 0, 1) * (p.speed >= 0 ? 1 : -1);
      p.ry += steer * car.grip * (1 + G.upgrades.tires * 0.1) * sf * dt * (handbrake ? 1.5 : 1);
      const nx = p.x + Math.sin(p.ry) * p.speed * dt, nz = p.z + Math.cos(p.ry) * p.speed * dt;
      const col = collide(nx, nz, 1.7, world.colliders);
      if (col.hit && Math.abs(p.speed) > 6) {
        G.carCond = Math.max(0, G.carCond - Math.abs(p.speed) * 0.55);
        p.speed *= 0.35; spawnEffect(A, 'spark', col.x, 0.8, col.z);
        if (G.radio) G.radio.crash();
      } else if (col.hit) p.speed *= 0.6;
      p.x = col.x; p.z = col.z;
      // Car-car bumps.
      for (const c of A.traffic) {
        if (d2(p.x, p.z, c.x, c.z) < 3.6 && Math.abs(p.speed) > 4) {
          p.speed *= 0.7; G.carCond = Math.max(0, G.carCond - 3);
          spawnEffect(A, 'spark', (p.x + c.x) / 2, 0.9, (p.z + c.z) / 2);
        }
      }
      if (G.carCond < 50) { G.smokeT -= dt; if (G.smokeT <= 0) { G.smokeT = 0.22; spawnEffect(A, 'smoke', p.x, 0.9, p.z); } }
      if (G.keys['Space']) fireWeapon();
    } else {
      const mx = (G.keys['KeyD'] ? 1 : 0) - (G.keys['KeyA'] ? 1 : 0);
      const mz = (G.keys['KeyS'] ? 1 : 0) - (G.keys['KeyW'] ? 1 : 0);
      const run = G.keys['ShiftLeft'] ? 10 : 6;
      if (mx || mz) {
        const camRy = Math.atan2(G.cam.x - p.x, G.cam.z - p.z);
        const moveRy = camRy + Math.PI - Math.atan2(mx, -mz);
        p.ry = dampAngle(p.ry, moveRy, 10, dt);
        p.speed = damp(p.speed, run, 8, dt);
        G.walkPhase += dt * p.speed * 1.6;
      } else p.speed = damp(p.speed, 0, 10, dt);
      const nx = p.x + Math.sin(p.ry) * p.speed * dt, nz = p.z + Math.cos(p.ry) * p.speed * dt;
      const col = collide(nx, nz, 0.55, world.colliders);
      p.x = col.x; p.z = col.z;
      if (G.keys['Space']) fireWeapon();
    }
    // (Edge-triggered actions live in the keydown handler so fast taps
    // are never lost between simulation steps.)
    G.fireT = Math.max(0, G.fireT - dt); G.punchT = Math.max(0, G.punchT - dt);
    G.gunshotT = Math.max(0, G.gunshotT - dt); G.noiseT = Math.max(0, G.noiseT - dt);
    G.crewSlow = Math.max(0, G.crewSlow - dt);
    for (let i = 0; i < 3; i++) G.crewCd[i] = Math.max(0, G.crewCd[i] - dt);
    if (G.reloadT > 0) {
      G.reloadT -= dt;
      if (G.reloadT <= 0) {
        const w = WEAPONS[G.slot], a = G.ammo[G.slot];
        const need = w.mag - a.mag, take = Math.min(need, a.res);
        a.mag += take; a.res -= take;
      }
    }
    // Wanted decay + busted.
    if (G.wanted > 0) {
      const near = A.police.some(c => d2(c.x, c.z, p.x, p.z) < 38) || (A.heli.active && d2(A.heli.x, A.heli.z, p.x, p.z) < 45);
      if (near) { G.wantedT = 0; }
      else { G.wantedT += dt; if (G.wantedT > 7) { G.wanted--; G.wantedT = 0; } }
      const copClose = A.police.some(c => d2(c.x, c.z, p.x, p.z) < 6.5);
      if (copClose && Math.abs(p.speed) < 1.5) { G.bustT += dt; if (G.bustT > 3) return failRun('busted'); }
      else G.bustT = 0;
    }
    if (G.health <= 0) return failRun('wasted');
    updateMission(G, dt);
    G.routeT += dt;
    if (G.routeT > 3) rebuildRoute();
  }

  function failRun(kind) {
    G.mode = kind; G.overlayT = 0;
    G.cash = Math.max(0, G.cash - (kind === 'busted' ? 300 : 150));
    if (G.ui) G.ui.sync();
  }
  G.respawn = () => {
    G.player.x = GARAGE_POS[0] + 14; G.player.z = GARAGE_POS[1] + 10; G.player.ry = Math.PI * 0.75;
    G.player.speed = 0; G.player.driving = true; G.carKind = 'hero'; G.carCond = 100;
    G.health = 100; G.armour = 0; G.wanted = 0; G.parked = null; G.bustT = 0;
    A.police.length = 0; A.roadblocks.length = 0; A.heli.active = false;
    clearMissionEntities(G);
    startMission(G, G.missionIdx);
    G.mode = 'play'; if (G.ui) G.ui.sync();
  };

  function updateCamera(dt) {
    if (G.camOverride) {
      G.cam.x = G.camOverride.x; G.cam.y = G.camOverride.y; G.cam.z = G.camOverride.z;
      G.cam.tx = G.camOverride.tx; G.cam.ty = G.camOverride.ty; G.cam.tz = G.camOverride.tz;
      G.cam.fov = G.camOverride.fov || 60;
      return;
    }
    const p = G.player;
    if (G.mode === 'title') {
      const a = G.time * 0.05;
      G.cam.x = damp(G.cam.x, -HALF - 6 + Math.sin(a) * 14, 2, dt);
      G.cam.y = damp(G.cam.y, 4.5, 2, dt);
      G.cam.z = damp(G.cam.z, -30 + Math.cos(a) * 14, 2, dt);
      G.cam.tx = damp(G.cam.tx, -HALF + 30, 2, dt); G.cam.ty = damp(G.cam.ty, 3, 2, dt); G.cam.tz = damp(G.cam.tz, -20, 2, dt);
      G.cam.fov = 58;
      return;
    }
    const fx = Math.sin(p.ry), fz = Math.cos(p.ry);
    const back = p.driving ? 8.6 : 5.6, up = p.driving ? 3.7 : 2.7;
    G.cam.x = damp(G.cam.x, p.x - fx * back, 4.5, dt);
    G.cam.y = damp(G.cam.y, up, 4.5, dt);
    G.cam.z = damp(G.cam.z, p.z - fz * back, 4.5, dt);
    G.cam.tx = damp(G.cam.tx, p.x + fx * 6, 6, dt);
    G.cam.ty = damp(G.cam.ty, 1.3, 6, dt);
    G.cam.tz = damp(G.cam.tz, p.z + fz * 6, 6, dt);
    G.cam.fov = damp(G.cam.fov, p.driving ? 60 + clamp(Math.abs(p.speed) * 0.55, 0, 16) : 58, 3, dt);
  }

  function step(dt) {
    G.time += dt;
    G.clockMin += dt;
    if (G.clockMin >= 1440) { G.clockMin -= 1440; G.day++; }
    if (!G.daypartLock) {
      const h = G.clockMin / 60;
      G.daypart = h >= 6 && h < 17 ? 'day' : h >= 17 && h < 19.5 ? 'dusk' : 'night';
    } else G.daypart = G.daypartLock;
    if (G.mode === 'play') stepPlay(dt);
    else if (G.mode === 'title') { updateTraffic(A, dt, G.player, G.time); updatePeds(A, dt, G, G.time); }
    else if (G.mode === 'passed' || G.mode === 'busted' || G.mode === 'wasted') {
      G.overlayT += dt;
      if (G.mode === 'passed' && G.overlayT > 3.2) {
        if (G.missionIdx < MISSIONS.length - 1) { G.missionIdx++; startMission(G, G.missionIdx); G.mode = 'play'; }
        else { G.mode = 'complete'; }
        if (G.ui) G.ui.sync();
      }
    }
    if (G.mode === 'play' || G.mode === 'map' || G.mode === 'pause') {
      updateTraffic(A, dt, G.player, G.time);
      updatePolice(A, dt, G, G.time);
      updatePeds(A, dt, G, G.time);
      updateEffects(A, dt);
    }
    updateCamera(dt);
    const d = districtAt(G.player.x, G.player.z);
    if (d !== G.district) { G.district = d; G.districtT = 3; }
    G.districtT = Math.max(0, G.districtT - dt);
    G.dialogueT = Math.max(0, G.dialogueT - dt);
    G.bannerT = Math.max(0, G.bannerT - dt);
    if (G.wanted > 0) { G.dispatchT -= dt; if (G.dispatchT <= 0) { G.dispatchT = 9; G.dispatchLine = DISPATCH[Math.floor(G.time / 9) % DISPATCH.length]; } }
    if (G.radio) G.radio.engine(G.player.driving ? clamp(Math.abs(G.player.speed) / 40, 0, 1) : 0);
  }

  function render() {
    const w = canvas.clientWidth || 1280, h = canvas.clientHeight || 720;
    R.resize(w, h);
    const pal = DAYPARTS[G.daypart];
    R.setPalette(pal);
    const aspect = w / h;
    const proj = mPersp(G.cam.fov * Math.PI / 180, aspect, 0.1, 900);
    const view = mLook(G.cam.x, G.cam.y, G.cam.z, G.cam.tx, G.cam.ty, G.cam.tz);
    const vp = mMul(proj, view);
    R.setCamera(vp, [G.cam.x, G.cam.y, G.cam.z]);
    R.begin();
    const sunW = [G.cam.x + pal.sun[0] * 700, G.cam.y + pal.sun[1] * 700, G.cam.z + pal.sun[2] * 700];
    const sp = projectPt(vp, sunW[0], sunW[1], sunW[2]);
    R.drawSky(sp && Math.abs(sp[0]) < 1.3 && Math.abs(sp[1]) < 1.3 ? sp : [3, 3], aspect);
    R.draw(world.opaque);
    if (G.routeMesh) R.draw(G.routeMesh);
    const t = missionTarget(G);
    if (t && G.mode !== 'title') {
      const bob = Math.sin(G.time * 2) * 0.4;
      R.draw(beacon.diamond, mModel(t[0], 7.5 + bob, t[1], G.time * 0.8));
      R.draw(beacon.diamondLow, mModel(t[0], 7.5 + bob, t[1], G.time * 0.8));
    }
    // Player vehicle / character.
    const p = G.player;
    const carTint = G.daypart === 'night' ? [1.6, 1.6, 1.6] : [1, 1, 1];
    if (p.driving) {
      const mesh = G.carKind === 'hero' ? heroPaints[G.paintIdx] : G.carKind === 'coupe' ? A.meshes.coupe : A.meshes.sedan[G.colorIdx % A.meshes.sedan.length];
      R.draw(mesh, mModel(p.x, 0, p.z, p.ry), carTint);
    } else {
      const base = mModel(p.x, 0, p.z, p.ry);
      R.draw(A.meshes.charBody, base);
      const sw = Math.sin(G.walkPhase) * clamp(p.speed / 6, 0, 1) * 0.55;
      R.draw(A.meshes.charLeg, mMul(base, mModelRX(-0.14, 0.82, 0, sw)));
      R.draw(A.meshes.charLeg, mMul(base, mModelRX(0.14, 0.82, 0, -sw)));
    }
    if (G.parked) {
      const mesh = G.parked.kind === 'hero' ? heroPaints[G.paintIdx] : G.parked.kind === 'coupe' ? A.meshes.coupe : A.meshes.sedan[G.parked.colorIdx % A.meshes.sedan.length];
      R.draw(mesh, mModel(G.parked.x, 0, G.parked.z, G.parked.ry), carTint);
    }
    if (G.missionCar) R.draw(A.meshes.coupe, mModel(G.missionCar.x, 0, G.missionCar.z, G.missionCar.ry), carTint);
    if (G.mission && G.mission.chaseCar) {
      const cc = G.mission.chaseCar;
      R.draw(A.meshes.sedan[cc.mesh], mModel(cc.x, 0, cc.z, cc.ry));
    }
    drawActors(R, A, G, G.time);
    // Transparent pass: shadows, glow fx, beacon pillar, actor fx.
    R.transparent(true, false);
    R.draw(world.shadow, null, [1, 1, 1], G.daypart === 'night' ? 0.14 : G.daypart === 'day' ? 0.22 : 0.32);
    R.draw(world.fx, null, [1, 1, 1], 0.85);
    if (t && G.mode !== 'title') R.draw(beacon.pillar, mModel(t[0], 0, t[1], 0), [1, 1, 1], 0.3);
    R.transparent(true, true);
    drawActorFx(R, A, G, G.time);
    if (G.daypart !== 'day' && p.driving) { // headlight pool
      const fx = Math.sin(p.ry), fz = Math.cos(p.ry);
      R.draw(A.meshes.heli.pool, mScaleModel(p.x + fx * 5, 0.12, p.z + fz * 5, 0, 0.55, 1, 0.55), [1, 1, 1], 0.35 * pal.lamp);
    }
    R.transparent(false);
  }

  // Input.
  window.addEventListener('keydown', (e) => {
    if (['Tab', 'Space'].includes(e.code)) e.preventDefault();
    G.keys[e.code] = true;
    if (G.radio) G.radio.unlock();
    if (!e.repeat && (e.code === 'KeyP' || e.code === 'Escape')) {
      if (G.mode === 'play') { G.mode = 'pause'; if (G.ui) G.ui.sync(); }
      else if (G.mode === 'pause' || G.mode === 'map' || G.mode === 'garage') { G.mode = 'play'; if (G.ui) G.ui.sync(); }
    }
    if (!e.repeat && e.code === 'Tab') {
      if (G.mode === 'play') { G.mode = 'map'; if (G.ui) G.ui.sync(); }
      else if (G.mode === 'map') { G.mode = 'play'; if (G.ui) G.ui.sync(); }
    }
    if (!e.repeat && e.code === 'KeyG' && (G.mode === 'play' || G.mode === 'garage')) {
      G.mode = G.mode === 'play' ? 'garage' : 'play'; if (G.ui) G.ui.sync();
    }
    if (e.code === 'Enter' && (G.mode === 'busted' || G.mode === 'wasted')) G.respawn();
    if (e.code === 'Enter' && G.mode === 'title' && G.ui) G.ui.startNewGame();
    if (!e.repeat && G.mode === 'play') {
      if (e.code === 'KeyE') tryEnterExit();
      else if (e.code === 'KeyF' && !G.player.driving) punch();
      else if (e.code === 'KeyR') startReload();
      else if (e.code === 'KeyQ') { for (let i = 1; i <= 4; i++) { const n = (G.slot + i) % 4; if (G.unlocked[n]) { G.slot = n; break; } } }
      else if (e.code.startsWith('Digit')) { const n = +e.code.slice(5) - 1; if (n >= 0 && n < 4 && G.unlocked[n]) G.slot = n; }
      else if (e.code === 'KeyZ') useCrew(0);
      else if (e.code === 'KeyX') useCrew(1);
      else if (e.code === 'KeyC') useCrew(2);
      else if (e.code === 'KeyT') { G.station = (G.station + 1) % RADIO.length; if (G.radio) G.radio.setStation(G.station); }
      else if (e.code === 'KeyM') { G.muted = !G.muted; if (G.radio) G.radio.setMuted(G.muted); }
      else if (e.code === 'KeyH' && G.radio) G.radio.horn();
    }
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
  canvas.addEventListener('mousedown', () => {
    if (G.radio) G.radio.unlock();
    if (G.mode === 'play' && !G.player.driving) fireWeapon();
  });

  G.startNewGame = () => {
    G.cash = 500; G.health = 100; G.armour = 0; G.rep = 0; G.kills = 0; G.stolen = 0;
    G.missionIdx = 0; G.missionsDone = MISSIONS.map(() => false);
    G.wanted = 0; G.carCond = 100; G.carKind = 'hero'; G.paintIdx = 0; G.colorIdx = 0;
    G.upgrades = { engine: 0, armor: 0, tires: 0 };
    G.unlocked = [true, true, false, false];
    G.ammo = WEAPONS.map(w => ({ mag: w.mag, res: w.reserve }));
    G.slot = 1; G.clockMin = 18 * 60 + 36; G.day = 1; G.daypartLock = null;
    G.player.x = GARAGE_POS[0] + 14; G.player.z = GARAGE_POS[1] + 10; G.player.ry = Math.PI * 0.75;
    G.player.speed = 0; G.player.driving = true; G.parked = null;
    A.police.length = 0; A.roadblocks.length = 0; A.heli.active = false; A.enemies.length = 0;
    G.missionCar = null;
    startMission(G, 0);
    G.mode = 'play'; if (G.ui) G.ui.sync();
  };
  G.saveTo = (slot) => {
    const saves = JSON.parse(localStorage.getItem(SAVE_KEY) || '[null,null,null]');
    saves[slot] = {
      cash: G.cash, missionIdx: G.missionIdx, missionsDone: G.missionsDone, rep: G.rep,
      kills: G.kills, stolen: G.stolen, carCond: G.carCond, clockMin: G.clockMin, day: G.day,
      carKind: G.carKind, colorIdx: G.colorIdx, paintIdx: G.paintIdx, upgrades: G.upgrades,
      x: G.player.x, z: G.player.z, ry: G.player.ry, unlocked: G.unlocked,
      armour: G.armour, health: G.health, slot,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    return saves[slot];
  };
  G.loadFrom = (slot) => {
    const saves = JSON.parse(localStorage.getItem(SAVE_KEY) || '[null,null,null]');
    const s = saves[slot];
    if (!s) return false;
    Object.assign(G, {
      cash: s.cash, missionIdx: s.missionIdx, missionsDone: s.missionsDone, rep: s.rep,
      kills: s.kills, stolen: s.stolen, carCond: s.carCond, clockMin: s.clockMin, day: s.day,
      carKind: s.carKind, colorIdx: s.colorIdx, paintIdx: s.paintIdx, upgrades: s.upgrades,
      unlocked: s.unlocked, armour: s.armour, health: s.health,
    });
    G.player.x = s.x; G.player.z = s.z; G.player.ry = s.ry; G.player.driving = true; G.player.speed = 0;
    G.wanted = 0; G.parked = null; G.daypartLock = null;
    A.police.length = 0; A.roadblocks.length = 0; A.enemies.length = 0; G.missionCar = null;
    startMission(G, s.missionIdx);
    G.mode = 'play'; if (G.ui) G.ui.sync();
    return true;
  };
  G.readSaves = () => JSON.parse(localStorage.getItem(SAVE_KEY) || '[null,null,null]');
  G.applyUpgrade = (kind) => {
    const costs = { engine: 800, armor: 600, tires: 400, paint: 200 };
    if (G.cash < costs[kind]) return false;
    if (kind === 'paint') { G.paintIdx = (G.paintIdx + 1) % 3; }
    else { if (G.upgrades[kind] >= 3) return false; G.upgrades[kind]++; if (kind === 'armor') G.armour = 100; }
    G.cash -= costs[kind];
    return true;
  };

  // Fixed-step loop driver (main.js calls pump each RAF).
  let acc = 0, last = 0;
  G.pump = (now) => {
    if (!last) last = now;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!G.frozen) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; }
      if (n === 5) acc = 0;
    }
    render();
  };
  G.stepFixed = (n) => { for (let i = 0; i < n; i++) step(STEP); };
  return G;
}
export { STEP };
