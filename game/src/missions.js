// The 12-mission story chain: objectives, timers, chases, clear-outs.
import { MISSIONS, GARAGE_POS, blockCenter } from './config.js';
import { d2, clamp } from './util.js';
import { spawnEffect } from './actors.js';

export function missionTarget(G) {
  const m = G.mission;
  if (!m) return null;
  if (m.type === 'steal' && m.stolen) return GARAGE_POS;
  if (m.type === 'chase' && m.chaseCar) return [m.chaseCar.x, m.chaseCar.z];
  return m.target;
}

export function clearMissionEntities(G) {
  G.actors.enemies.length = 0;
  if (G.mission) G.mission.chaseCar = null;
}

export function startMission(G, idx) {
  const def = MISSIONS[idx];
  const [tx, tz] = blockCenter(def.target[0], def.target[1]);
  clearMissionEntities(G);
  G.mission = {
    idx, def, type: def.type, target: [tx, tz], tLeft: def.time || 0,
    stolen: false, killsLeft: 0, ramCount: 0, ramT: 0, chaseCar: null, done: false,
  };
  if (def.type === 'clear') {
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      G.actors.enemies.push({ x: tx + Math.sin(a) * 7, z: tz + Math.cos(a) * 7, ry: a, hp: 50, dead: false, fireT: 1 + i * 0.4 });
    }
    G.mission.killsLeft = 4;
  }
  if (def.type === 'steal') {
    G.missionCar = { x: tx + 6, z: tz + 4, ry: Math.PI * 0.5 };
  }
  if (def.type === 'chase') {
    G.mission.chaseCar = { x: tx, z: tz, ry: Math.PI, speed: 12, mesh: 1, turnT: 0 };
  }
  if (def.type === 'escape') G.addWanted(3);
  G.say(def.giver, def.role, def.brief, 6);
  G.showBanner(`MISSION ${idx + 1}/12 — ${def.name}`, def.obj);
  G.rebuildRoute();
}

function completeMission(G) {
  const m = G.mission;
  if (!m || m.done) return;
  m.done = true;
  const def = m.def;
  G.cash += def.reward; G.rep += 120;
  G.missionsDone[m.idx] = true;
  G.wanted = Math.max(0, G.wanted - 2);
  if (m.idx === 2) { G.unlocked[2] = true; G.say('BAMBANG', 'MECHANIC', 'SMG unlocked — the market job earned you hardware.'); }
  if (m.idx === 5) { G.unlocked[3] = true; G.say('AGUS', 'FIXER', 'AR-9 unlocked. Wanto will not know what hit him.'); }
  else G.say(def.giver, def.role, def.done, 6);
  G.health = Math.min(100, G.health + 30);
  clearMissionEntities(G);
  G.missionCar = null;
  G.mode = 'passed'; G.overlayT = 0;
  if (G.radio) G.radio.pass();
  if (G.ui) G.ui.sync();
  G.rebuildRoute();
}

function failMission(G, why) {
  const m = G.mission;
  if (!m || m.done) return;
  m.done = true;
  G.say('AGUS', 'FIXER', why + ' — we go again. The city waits for no one.');
  clearMissionEntities(G);
  G.missionCar = null;
  startMission(G, m.idx);
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || m.done || G.mode !== 'play') return;
  const p = G.player;
  if (m.tLeft > 0) {
    m.tLeft -= dt;
    if (m.tLeft <= 0) { failMission(G, 'Too slow. The window closed.'); return; }
  }
  const t = missionTarget(G);
  if (m.type === 'goto' || m.type === 'deliver' || m.type === 'escape') {
    if (t && d2(p.x, p.z, t[0], t[1]) < 9) { completeMission(G); return; }
  }
  if (m.type === 'steal') {
    if (m.stolen && t && d2(p.x, p.z, t[0], t[1]) < 10 && p.driving) { completeMission(G); return; }
  }
  if (m.type === 'clear') {
    const left = G.actors.enemies.filter(e => !e.dead).length;
    m.killsLeft = left;
    for (const e of G.actors.enemies) {
      if (e.dead) continue;
      e.ry = Math.atan2(p.x - e.x, p.z - e.z);
      e.fireT -= dt;
      const dist = d2(p.x, p.z, e.x, e.z);
      if (e.fireT <= 0 && dist < 32) {
        e.fireT = 1.3;
        spawnEffect(G.actors, 'tracer', e.x, 1.3, e.z, p.x, 1.2, p.z);
        spawnEffect(G.actors, 'flash', e.x, 1.3, e.z);
        const dmg = clamp(11 - dist * 0.18, 3, 10);
        const absorbed = Math.min(G.armour, dmg * 0.6);
        G.armour -= absorbed; G.health -= (dmg - absorbed);
      }
    }
    if (left === 0) { completeMission(G); return; }
  }
  if (m.type === 'chase' && m.chaseCar) {
    const c = m.chaseCar;
    m.ramT = Math.max(0, m.ramT - dt);
    // Flee: drive along roads, turning away from the player at intersections.
    c.turnT -= dt;
    const speed = 13;
    c.x += Math.sin(c.ry) * speed * dt; c.z += Math.cos(c.ry) * speed * dt;
    c.x = clamp(c.x, -140, 140); c.z = clamp(c.z, -140, 140);
    if (c.turnT <= 0) {
      c.turnT = 2.2;
      const away = Math.atan2(c.x - p.x, c.z - p.z);
      const snap = Math.round(away / (Math.PI / 2)) * (Math.PI / 2);
      c.ry = snap;
    }
    const dist = d2(p.x, p.z, c.x, c.z);
    if (dist < 4.2 && Math.abs(p.speed) > 12 && m.ramT <= 0) {
      m.ramCount++; m.ramT = 1.6;
      p.speed *= 0.6;
      spawnEffect(G.actors, 'spark', (p.x + c.x) / 2, 0.9, (p.z + c.z) / 2);
      G.say('AGUS', 'FIXER', `Hit ${m.ramCount} of 3 — again, harder!`);
      if (m.ramCount >= 3) { completeMission(G); return; }
    }
    if (dist > 70) { failMission(G, 'He got away.'); return; }
  }
}
