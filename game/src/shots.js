// Deterministic staged captures: exact scene setups per shot, then freeze.
import { PITCH, GARAGE_POS } from './config.js';
import { startMission } from './missions.js';

function richState(G, cash, rep, armour, slot) {
  G.cash = cash; G.rep = rep; G.health = 100; G.armour = armour;
  G.kills = 14; G.stolen = 6;
  G.unlocked = [true, true, true, true];
  G.ammo = [{ mag: Infinity, res: Infinity }, { mag: 12, res: 48 }, { mag: 30, res: 90 }, { mag: 24, res: 60 }];
  G.slot = slot; G.crewCd = [0, 12, 0];
  G.banner = null; G.bannerT = 0;
}

function stagePolice(G, list) {
  const A = G.actors;
  A.police.length = 0;
  const names = ['UNIT 7 · WPD', 'UNIT 12 · WPD', 'UNIT 3 · WPD', 'UNIT 21 · WPD'];
  list.forEach(([x, z, ry], i) => A.police.push({ x, z, ry, speed: 0, name: names[i % names.length], state: 'Pursuit', ram: 0, dist: 0 }));
  for (const p of A.police) p.dist = Math.round(Math.hypot(p.x - G.player.x, p.z - G.player.z));
}

export function stageShot(G, name) {
  const A = G.actors;
  G.shotMode = true;
  G.day = 1;
  if (name === 'cover') {
    G.clockMin = 18 * 60 + 36; G.daypartLock = 'dusk';
    G.missionsDone = G.missionsDone.map((_, i) => i < 8);
    G.missionIdx = 8; startMission(G, 8);
    richState(G, 12480, 890, 60, 2);
    G.addWanted(1); // escape gave 3, cover shows 4 stars
    const p = G.player;
    p.x = -122; p.z = -2 * PITCH; p.ry = -Math.PI / 2; p.speed = 18; p.driving = true;
    G.carKind = 'hero'; G.paintIdx = 0; G.carCond = 82;
    G.camOverride = { x: -116, y: 3.6, z: -2 * PITCH, tx: -160, ty: 2, tz: -88, fov: 60 };
    // Heli: open sky, upper center-right, clear of all HUD panels.
    A.heli.active = true; A.heli.x = -165; A.heli.z = -105; A.heli.h = 17; A.heli.ang = -0.32;
    // Roadblock ahead on the road + cruiser beside it, cruiser chasing behind.
    A.roadblocks.length = 0;
    A.roadblocks.push({ x: -136, z: -2 * PITCH, ry: Math.PI / 2 });
    stagePolice(G, [[-138, -86.5, 0], [-138, -70, 0]]);
    // Traffic depth: avenue + road behind.
    const T = A.traffic;
    const spots = [[-138, -60, 0], [-144, -120, Math.PI], [-138, -100, 0], [-138, -30, Math.PI], [-70, -92, -Math.PI / 2]];
    spots.forEach(([x, z, ry], i) => { if (T[i]) { T[i].x = x; T[i].z = z; T[i].ry = ry; T[i].horiz = (ry === -Math.PI / 2); } });
    A.scooters[0].x = -141; A.scooters[0].z = -78; A.scooters[0].ry = 0;
    // Beach life near the road.
    for (let i = 20; i < 26; i++) {
      const pd = A.peds[i];
      if (pd) { pd.x = -162 - (i - 20) * 4; pd.z = -80 - (i - 20) * 5; pd.ry = 0.6; }
    }
    G.say('AGUS', 'FIXER', 'Roadblock on Pantai road! Ram it or cut through the sand — your call, Sugeng.');
    G.dispatchLine = 'All units, suspect heading west on Jl. Pantai Utara. Air support on scene.';
    G.dispatchT = 9;
    G.mode = 'play';
  } else if (name === 'map') {
    G.clockMin = 18 * 60 + 50; G.daypartLock = 'dusk';
    G.missionsDone = G.missionsDone.map((_, i) => i < 11);
    G.missionIdx = 11; startMission(G, 11);
    richState(G, 15230, 1320, 80, 2);
    G.wanted = 2;
    G.player.x = -60; G.player.z = 20; G.player.ry = Math.PI * 0.25; G.player.driving = true;
    A.heli.active = true; A.heli.x = -40; A.heli.z = -10; A.heli.h = 20; A.heli.ang = 0.4;
    stagePolice(G, [[-46, 30, 0], [-80, 8, Math.PI / 2]]);
    G.mode = 'map';
  } else if (name === 'title') {
    G.clockMin = 18 * 60 + 30; G.daypartLock = 'dusk';
    G.missionsDone = G.missionsDone.map((_, i) => i < 8);
    G.missionIdx = 8; startMission(G, 8);
    richState(G, 12480, 890, 60, 2);
    G.player.x = -122; G.player.z = -2 * PITCH; G.player.ry = -Math.PI / 2; G.player.driving = true;
    G.carKind = 'hero'; G.paintIdx = 0;
    G.camOverride = { x: -106, y: 4.6, z: -2 * PITCH, tx: -165, ty: 3, tz: -86, fov: 58 };
    A.heli.active = false;
    try { G.saveTo(0); } catch { /* storage unavailable */ }
    G.mode = 'title';
  } else if (name === 'night') {
    G.clockMin = 21 * 60 + 20; G.daypartLock = 'night';
    G.missionsDone = G.missionsDone.map((_, i) => i < 11);
    G.missionIdx = 11; startMission(G, 11);
    richState(G, 15230, 1320, 80, 3);
    G.wanted = 5;
    const p = G.player;
    p.x = 0; p.z = 3; p.ry = Math.PI; p.speed = 18; p.driving = true;
    G.carKind = 'hero'; G.paintIdx = 0; G.carCond = 64;
    G.camOverride = { x: 2, y: 5, z: 22, tx: -6, ty: 1.5, tz: -46, fov: 60 };
    A.heli.active = true; A.heli.x = -4; A.heli.z = -55; A.heli.h = 24; A.heli.ang = -1.57;
    A.roadblocks.length = 0;
    A.roadblocks.push({ x: 0, z: -38, ry: 0 });
    stagePolice(G, [[-4, 9, Math.PI], [5, -42, 0], [-46, 0, Math.PI / 2]]);
    const T = A.traffic;
    const spots = [[0, -66, Math.PI], [0, -100, 0], [-46, -26, Math.PI / 2], [46, 0, -Math.PI / 2], [-6, -80, 0]];
    spots.forEach(([x, z, ry], i) => { if (T[i]) { T[i].x = x; T[i].z = z; T[i].ry = ry; T[i].horiz = (Math.abs(ry) === Math.PI / 2); } });
    G.say('KOMISARIS WANTO', 'WPD', 'Sugeng Wibowo, pull over! The whole city is watching tonight.');
    G.dispatchLine = 'All units, five stars — suspect in Alun-Alun. Helicopter has the spotlight.';
    G.dispatchT = 9;
    G.mode = 'play';
  }
  G.rebuildRoute();
}
