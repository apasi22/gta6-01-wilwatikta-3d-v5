// HUD: mission box, money/stars/clock, round minimap, speedo, dialogue,
// dispatch, radio widget, weapon slot bar, crew cards, WPD response panel.
import { WEAPONS, CREW, MISSIONS, RANKS, DISTRICTS, districtAt, POIS, blockCenter, PITCH, HALF } from './config.js';
import { clamp, d2 } from './util.js';
import { missionTarget } from './missions.js';

const $ = (id) => document.getElementById(id);
const STREETS_X = ['Jl. Pelabuhan', 'Jl. Batik', 'Jl. Lorong Emas', 'Jl. Alun-Alun', 'Jl. Pasar Senja', 'Jl. Kampung', 'Jl. Segara'];
const STREETS_Z = ['Jl. Pantai Utara', 'Jl. Merdeka', 'Jl. Gamelan', 'Jl. Wilwatikta', 'Jl. Srikandi', 'Jl. Arjuna', 'Jl. Pantai Kidul'];
const ICONS = [
  '<svg viewBox="0 0 24 24"><path d="M7 11V6a2 2 0 0 1 4 0v4V5a2 2 0 0 1 4 0v5V6a2 2 0 0 1 4 0v7a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7v-2z" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M2 8h14v4h-6l-1 6H6l1-6H2zM16 8h4v3h-4z" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M2 9h12v3h-5l-1 5H5l1-5H2zM14 9h6v2h-6zM8 12h3v6H8z" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M1 10h16v2.5H8l-1 4H4l1-4H1zM17 10h6v2h-6zM10 7h4v3h-4z" fill="currentColor"/></svg>',
];
const PORTRAIT_COLORS = ['#b7791f', '#2b6cb0', '#9b2c2c'];
const PORTRAIT_INIT = ['S', 'A', 'W'];

function streetName(x, z) {
  const ix = clamp(Math.round(x / PITCH) + 3, 0, 6), iz = clamp(Math.round(z / PITCH) + 3, 0, 6);
  const dx = Math.abs(x - (ix - 3) * PITCH), dz = Math.abs(z - (iz - 3) * PITCH);
  return dx < dz ? STREETS_X[ix] : STREETS_Z[iz];
}

export function createHUD(G) {
  const el = {};
  ['hud', 'mTitle', 'mObj', 'mTimer', 'mStage', 'mNext', 'cash', 'stars', 'clock', 'minimap',
   'districtLabel', 'streetLabel', 'healthBar', 'armourBar', 'repBar', 'repLabel', 'speedNum',
   'gear', 'carName', 'condBar', 'dialogue', 'dlgWho', 'dlgRole', 'dlgLine', 'dlgPortrait',
   'dispatchLine', 'radioStation', 'radioTrack', 'eqBars', 'weaponBar', 'weaponName',
   'crewCards', 'wpdUnits', 'wpdHint', 'watermark', 'banner', 'bannerText', 'bannerSub',
   'objArrow', 'objDist', 'vignette', 'bustWarn'].forEach(id => { el[id] = $(id); });
  const mm = el.minimap.getContext('2d');

  // Weapon slot bar (built once).
  el.weaponBar.innerHTML = WEAPONS.map((w, i) => `
    <div class="wslot" id="wslot${i}"><span class="wkey">${i + 1}</span><span class="wicon">${ICONS[i]}</span>
    <span class="wammo" id="wammo${i}"></span><span class="wlock" id="wlock${i}">LOCKED</span></div>`).join('');
  // Crew cards (built once).
  el.crewCards.innerHTML = CREW.map((c, i) => `
    <div class="crew" id="crew${i}"><div class="cport" style="background:linear-gradient(135deg,${PORTRAIT_COLORS[i]},#1a202c)">${c.who[0]}</div>
    <div class="cinfo"><b>${c.who}</b><span>${c.ability}</span><span class="ccost">$${c.cost} · ${['Z', 'X', 'C'][i]}</span></div>
    <div class="ccd" id="ccd${i}"></div></div>`).join('');
  // Equalizer bars.
  el.eqBars.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';

  let lastHealth = 100, vignFlash = 0;

  function drawMinimap() {
    const S = 190 / 360, X = (x) => (x + 180) * S, Y = (z) => (z + 180) * S;
    mm.clearRect(0, 0, 190, 190);
    mm.fillStyle = '#0b1526'; mm.fillRect(0, 0, 190, 190);
    mm.fillStyle = '#1d4e89'; mm.fillRect(0, 0, X(-152), 190); // sea
    mm.fillStyle = '#c2a878'; mm.fillRect(X(-152), 0, X(-138) - X(-152), 190); // sand
    for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 6; bz++) {
      const cx = (bx - 2.5) * PITCH, cz = (bz - 2.5) * PITCH;
      const di = districtAt(cx, cz);
      mm.fillStyle = DISTRICTS[di].color;
      mm.globalAlpha = 0.45;
      mm.fillRect(X(cx - 17), Y(cz - 17), 34 * S, 34 * S);
      mm.globalAlpha = 1;
    }
    mm.strokeStyle = 'rgba(255,255,255,0.35)'; mm.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      mm.beginPath(); mm.moveTo(X(i * PITCH), 0); mm.lineTo(X(i * PITCH), 190); mm.stroke();
      mm.beginPath(); mm.moveTo(0, Y(i * PITCH)); mm.lineTo(190, Y(i * PITCH)); mm.stroke();
    }
    // Route dashes.
    const t = missionTarget(G);
    if (t) {
      mm.strokeStyle = '#ffd54a'; mm.lineWidth = 2; mm.setLineDash([5, 4]);
      mm.beginPath(); mm.moveTo(X(G.player.x), Y(G.player.z)); mm.lineTo(X(t[0]), Y(G.player.z)); mm.lineTo(X(t[0]), Y(t[1])); mm.stroke();
      mm.setLineDash([]);
      mm.fillStyle = '#ffd54a';
      mm.beginPath(); mm.arc(X(t[0]), Y(t[1]), 4, 0, 7); mm.fill();
    }
    for (const poi of POIS) { const [wx, wz] = blockCenter(poi[1], poi[2]); mm.fillStyle = '#fff'; mm.fillRect(X(wx) - 1.5, Y(wz) - 1.5, 3, 3); }
    mm.fillStyle = '#4fd1ff';
    for (const c of G.actors.police) { mm.beginPath(); mm.arc(X(c.x), Y(c.z), 2.5, 0, 7); mm.fill(); }
    if (G.wanted > 0) { // search-zone ring
      mm.strokeStyle = 'rgba(255,80,80,0.8)'; mm.setLineDash([4, 4]);
      mm.beginPath(); mm.arc(X(G.player.x), Y(G.player.z), 30 * S, 0, 7); mm.stroke(); mm.setLineDash([]);
    }
    // Player arrow.
    mm.save();
    mm.translate(X(G.player.x), Y(G.player.z));
    mm.rotate(Math.PI - G.player.ry);
    mm.fillStyle = '#ffd54a'; mm.strokeStyle = '#111'; mm.lineWidth = 1.5;
    mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 5); mm.lineTo(-5, 5); mm.closePath(); mm.fill(); mm.stroke();
    mm.restore();
    mm.fillStyle = '#fff'; mm.font = 'bold 10px sans-serif'; mm.fillText('N', 92, 12);
  }

  function update() {
    const visible = G.mode === 'play' || G.mode === 'passed';
    el.hud.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const m = G.mission;
    if (m) {
      el.mTitle.textContent = `MISSION ${m.idx + 1}/12 — ${m.def.name}`;
      el.mObj.textContent = m.def.obj;
      const t = missionTarget(G);
      const dist = t ? Math.round(d2(G.player.x, G.player.z, t[0], t[1])) : 0;
      let timer = '';
      if (m.tLeft > 0) timer = `⏱ ${Math.floor(m.tLeft / 60)}:${String(Math.floor(m.tLeft % 60)).padStart(2, '0')} · `;
      if (m.type === 'clear') timer += `HOSTILES LEFT: ${m.killsLeft} · `;
      if (m.type === 'chase') timer += `RAMS ${m.ramCount}/3 · `;
      el.mTimer.textContent = timer + `${dist}m`;
      el.mStage.style.width = `${(G.missionsDone.filter(Boolean).length / 12) * 100}%`;
      el.mNext.textContent = m.idx < 11 ? `NEXT: ${MISSIONS[m.idx + 1].name}` : 'NEXT: FREE ROAM';
      // Objective arrow.
      if (t) {
        const bearing = Math.atan2(t[0] - G.player.x, t[1] - G.player.z);
        el.objArrow.style.transform = `rotate(${G.player.ry - bearing}rad)`;
        el.objDist.textContent = `${dist}m`;
        el.objArrow.style.display = 'block';
      } else el.objArrow.style.display = 'none';
    }
    el.cash.textContent = '$' + G.cash.toLocaleString('en-US');
    el.stars.innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < G.wanted ? 'on' : ''}">★</span>`).join('');
    const hh = String(Math.floor(G.clockMin / 60)).padStart(2, '0'), mmn = String(Math.floor(G.clockMin % 60)).padStart(2, '0');
    el.clock.textContent = `${hh}:${mmn} · DAY ${G.day}`;
    drawMinimap();
    el.districtLabel.textContent = DISTRICTS[G.district].name.toUpperCase();
    el.streetLabel.textContent = streetName(G.player.x, G.player.z);
    el.healthBar.style.width = `${G.health}%`;
    el.armourBar.style.width = `${G.armour}%`;
    const rank = RANKS[Math.min(RANKS.length - 1, Math.floor(G.rep / 400))];
    el.repBar.style.width = `${clamp((G.rep % 400) / 4, 0, 100)}%`;
    el.repLabel.textContent = `REP ${rank} · ${G.rep}`;
    const kmh = Math.round(Math.abs(G.player.speed) * 3.6);
    el.speedNum.textContent = G.player.driving ? kmh : Math.round(G.player.speed * 3.6);
    const sp = G.player.speed;
    el.gear.textContent = !G.player.driving ? 'ON FOOT' : sp < -0.5 ? 'R' : kmh < 2 ? 'N' : kmh < 30 ? '1' : kmh < 55 ? '2' : kmh < 85 ? '3' : kmh < 120 ? '4' : '5';
    const carName = G.player.driving ? (G.carKind === 'hero' ? 'GARUDA GT' : G.carKind === 'coupe' ? 'KENCANA S' : 'SEDAN') : 'ON FOOT';
    el.carName.textContent = carName;
    el.condBar.style.width = `${G.carCond}%`;
    el.condBar.style.background = G.carCond > 50 ? '#48bb78' : G.carCond > 25 ? '#ecc94b' : '#f56565';
    // Dialogue.
    if (G.dialogue && G.dialogueT > 0) {
      el.dialogue.style.display = 'flex';
      el.dlgWho.textContent = G.dialogue.who; el.dlgRole.textContent = G.dialogue.role; el.dlgLine.textContent = G.dialogue.line;
      const ci = ['SUGENG', 'AGUS', 'KOMISARIS WANTO'].indexOf(G.dialogue.who);
      el.dlgPortrait.textContent = PORTRAIT_INIT[Math.max(0, ci)];
      el.dlgPortrait.style.background = `linear-gradient(135deg,${PORTRAIT_COLORS[Math.max(0, ci)]},#1a202c)`;
    } else el.dialogue.style.display = 'none';
    el.dispatchLine.textContent = G.wanted > 0 ? `WPD DISPATCH: ${G.dispatchLine}` : 'WPD DISPATCH: All units, city quiet. Patrol normal.';
    el.dispatchLine.style.color = G.wanted > 0 ? '#fc8181' : '#a0aec0';
    // Radio widget.
    const st = G.radio ? G.radio.stationName() : 'GAMELAN FM';
    el.radioStation.textContent = (G.muted ? 'MUTED · ' : '') + st;
    el.radioTrack.textContent = G.radio ? G.radio.trackName() : '—';
    const bars = el.eqBars.children;
    for (let i = 0; i < bars.length; i++) {
      const hgt = G.muted ? 3 : 4 + Math.abs(Math.sin(G.time * 3.1 + i * 1.3)) * 14;
      bars[i].style.height = `${hgt.toFixed(1)}px`;
    }
    // Weapon bar.
    for (let i = 0; i < 4; i++) {
      const slot = $('wslot' + i), a = G.ammo[i];
      slot.classList.toggle('active', i === G.slot);
      slot.classList.toggle('locked', !G.unlocked[i]);
      $('wlock' + i).style.display = G.unlocked[i] ? 'none' : 'block';
      $('wammo' + i).textContent = a.mag === Infinity ? '∞' : `${a.mag} / ${a.res}`;
    }
    el.weaponName.textContent = WEAPONS[G.slot].name + (G.reloadT > 0 ? ' — RELOADING…' : '');
    // Crew cards.
    for (let i = 0; i < 3; i++) {
      const cd = G.crewCd[i], card = $('crew' + i);
      card.classList.toggle('ready', cd <= 0 && G.cash >= CREW[i].cost);
      $('ccd' + i).textContent = cd > 0 ? `${Math.ceil(cd)}s` : G.cash < CREW[i].cost ? '$' : '';
      $('ccd' + i).style.display = cd > 0 || G.cash < CREW[i].cost ? 'flex' : 'none';
    }
    // WPD panel.
    const rows = G.actors.police.map(p => {
      const tag = p.dist < 12 ? ['RAMMING', 'red'] : p.dist < 30 ? ['Pursuit', 'amber'] : ['Pursuit', 'blue'];
      return `<div class="unit"><b>${p.name}</b><span>${p.dist}m</span><em class="${tag[1]}">${tag[0]}</em></div>`;
    });
    if (G.actors.heli.active) rows.push(`<div class="unit"><b>HELI-1 · WPD AIR</b><span>${Math.round(d2(G.actors.heli.x, G.actors.heli.z, G.player.x, G.player.z))}m</span><em class="red">SPOTLIGHT</em></div>`);
    if (G.actors.roadblocks.length) rows.push(`<div class="unit"><b>ROADBLOCK</b><span>${Math.round(d2(G.actors.roadblocks[0].x, G.actors.roadblocks[0].z, G.player.x, G.player.z))}m</span><em class="amber">ROADBLOCK</em></div>`);
    el.wpdUnits.innerHTML = rows.length ? rows.join('') : '<div class="unit"><b>NO ACTIVE UNITS</b><span>—</span><em class="green">CLEAR</em></div>';
    el.wpdHint.textContent = G.wanted > 0 ? 'Break line of sight to lose the heat — or call Ratna [C].' : 'Drive clean. WPD watches every corner of Wilwatikta.';
    // Watermark + banner.
    el.watermark.textContent = DISTRICTS[G.district].name.toUpperCase();
    el.watermark.style.opacity = G.districtT > 0 ? '0.9' : '0.28';
    if (G.banner && G.bannerT > 0) {
      el.banner.style.display = 'block'; el.banner.style.opacity = clamp(G.bannerT, 0, 1);
      el.bannerText.textContent = G.banner.text; el.bannerSub.textContent = G.banner.sub;
    } else el.banner.style.display = 'none';
    // Damage vignette.
    if (G.health < lastHealth) vignFlash = 0.7;
    lastHealth = G.health;
    vignFlash = Math.max(0, vignFlash - 0.03);
    el.vignette.style.opacity = (clamp(1 - G.health / 100, 0, 1) * 0.55 + vignFlash).toFixed(2);
    el.bustWarn.style.display = G.bustT > 0.5 ? 'block' : 'none';
  }
  return { update };
}
