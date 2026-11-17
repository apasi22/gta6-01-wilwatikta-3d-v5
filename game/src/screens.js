// Screens: title, how-to, pause, garage, saves, busted/wasted/passed,
// complete — and the rich symbol-covered full-city map.
import { DISTRICTS, DMAP, POIS, MISSIONS, RANKS, GARAGE_POS, PITCH, HALF, SEA_X, SAND_X, blockCenter } from './config.js';
import { clamp, d2 } from './util.js';
import { missionTarget } from './missions.js';

const $ = (id) => document.getElementById(id);
const OVERLAYS = ['title', 'howto', 'pause', 'garage', 'mapScreen', 'saves', 'busted', 'wasted', 'passed', 'complete'];

function star(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function diamond(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y);
  ctx.closePath(); ctx.fill();
}
// District emblems — colored logos drawn on the map blocks.
function emblem(ctx, kind, x, y, s, color) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, s * 0.12);
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  if (kind === 'anchor') {
    ctx.beginPath(); ctx.arc(0, -s * 0.32, s * 0.18, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.14); ctx.lineTo(0, s * 0.42); ctx.moveTo(-s * 0.28, -s * 0.02); ctx.lineTo(s * 0.28, -s * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.36, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.34, s * 0.18); ctx.lineTo(-s * 0.44, s * 0.3); ctx.lineTo(-s * 0.26, s * 0.36);
    ctx.moveTo(s * 0.34, s * 0.18); ctx.lineTo(s * 0.44, s * 0.3); ctx.lineTo(s * 0.26, s * 0.36); ctx.stroke();
  } else if (kind === 'dome') {
    ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.4); ctx.lineTo(-s * 0.4, 0); ctx.arc(0, 0, s * 0.4, Math.PI, 0); ctx.lineTo(s * 0.4, s * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillRect(-s * 0.52, -s * 0.1, s * 0.08, s * 0.5); ctx.fillRect(s * 0.44, -s * 0.1, s * 0.08, s * 0.5);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(0, -s * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.07, 0, 7); ctx.fill();
  } else if (kind === 'sun') {
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.26, 0, 7); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.36, -s * 0.1 + Math.sin(a) * s * 0.36);
      ctx.lineTo(Math.cos(a) * s * 0.5, -s * 0.1 + Math.sin(a) * s * 0.5); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, s * 0.42, s * 0.34, Math.PI, 0); ctx.fill();
    ctx.fillRect(-s * 0.03, s * 0.42, s * 0.06, s * 0.2);
  } else if (kind === 'stall') {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#fff' : color;
      ctx.beginPath(); ctx.moveTo(-s * 0.5 + i * s * 0.25, -s * 0.35); ctx.lineTo(-s * 0.25 + i * s * 0.25, -s * 0.35);
      ctx.lineTo(-s * 0.25 + i * s * 0.25, -s * 0.1); ctx.arc(-s * 0.375 + i * s * 0.25, -s * 0.1, s * 0.125, 0, Math.PI); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = color; ctx.fillRect(-s * 0.45, s * 0.05, s * 0.9, s * 0.35);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-s * 0.45, s * 0.05, s * 0.9, s * 0.08);
  } else if (kind === 'flower') {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, -s * 0.28, s * 0.14, s * 0.26, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, 7); ctx.fill();
  } else if (kind === 'lantern') {
    ctx.fillRect(-s * 0.06, -s * 0.55, s * 0.12, s * 0.15);
    ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.32, s * 0.38, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-s * 0.2, -s * 0.18, s * 0.4, s * 0.1);
    ctx.fillStyle = color; ctx.fillRect(-s * 0.18, s * 0.32, s * 0.36, s * 0.08);
    ctx.beginPath(); ctx.moveTo(0, s * 0.4); ctx.lineTo(0, s * 0.58); ctx.stroke();
  }
  ctx.restore();
}
const EMBLEM_KIND = ['sun', 'lantern', 'dome', 'anchor', 'stall', 'flower'];

export function createScreens(G) {
  const mapCv = $('mapCanvas'), mctx = mapCv.getContext('2d');
  const gaugeCv = $('mapGauge'), gctx = gaugeCv.getContext('2d');
  let savesFrom = 'title';

  // Static legend + mission list (built once, statuses refreshed on sync).
  $('legend').innerHTML = DISTRICTS.map(d => `<div><i style="background:${d.color}"></i>${d.name}</div>`).join('') +
    '<div><i style="background:#ffd54a;border-radius:50%"></i>Mission target</div>' +
    '<div><i style="background:#4fd1ff;border-radius:50%"></i>WPD unit</div>' +
    '<div><i style="background:#f56565;border-radius:50%"></i>Gang turf</div>' +
    '<div><i style="background:#48bb78;border-radius:50%"></i>Shop / garage</div>';
  $('missionList').innerHTML = MISSIONS.map((m, i) => `<div class="mrow" id="mrow${i}"><b>${i + 1}</b><span>${m.name}</span><em id="mstat${i}"></em></div>`).join('');

  function fmtClock() {
    const hh = String(Math.floor(G.clockMin / 60)).padStart(2, '0'), mm = String(Math.floor(G.clockMin % 60)).padStart(2, '0');
    return `${hh}:${mm} · DAY ${G.day}`;
  }
  function refreshMissionList() {
    for (let i = 0; i < 12; i++) {
      const st = $('mstat' + i);
      if (G.missionsDone[i]) { st.textContent = 'DONE'; st.className = 'done'; }
      else if (G.mission && G.mission.idx === i) { st.textContent = 'ACTIVE'; st.className = 'active'; }
      else { st.textContent = '—'; st.className = ''; }
      $('mrow' + i).classList.toggle('active', !!(G.mission && G.mission.idx === i));
    }
  }
  function refreshStats() {
    const done = G.missionsDone.filter(Boolean).length;
    $('mapStats').innerHTML = `
      <div><span>STORY</span><b>${Math.round(done / 12 * 100)}%</b></div>
      <div><span>REP</span><b>${RANKS[Math.min(RANKS.length - 1, Math.floor(G.rep / 400))]} · ${G.rep}</b></div>
      <div><span>CASH</span><b>$${G.cash.toLocaleString('en-US')}</b></div>
      <div><span>KILLS</span><b>${G.kills}</b></div>
      <div><span>CARS STOLEN</span><b>${G.stolen}</b></div>
      <div><span>CLOCK</span><b>${fmtClock()}</b></div>
      <div><span>WANTED</span><b>${'★'.repeat(G.wanted) || '—'}</b></div>`;
  }

  function drawMap() {
    const W = mapCv.width, H = mapCv.height, t = G.time;
    const X = (x) => (x - SEA_X + 8) / (HALF + 16 - SEA_X + 8) * W;
    const Y = (z) => (z + HALF + 8) / (2 * HALF + 16) * H;
    // Sea gradient + wave lines.
    const sea = mctx.createLinearGradient(0, 0, X(SAND_X), 0);
    sea.addColorStop(0, '#0a2a52'); sea.addColorStop(1, '#1d6fb8');
    mctx.fillStyle = '#101c2c'; mctx.fillRect(0, 0, W, H);
    mctx.fillStyle = sea; mctx.fillRect(0, 0, X(SAND_X), H);
    mctx.strokeStyle = 'rgba(255,255,255,0.25)'; mctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const wy = (i + 0.5) / 9 * H + Math.sin(t * 0.8 + i) * 2;
      mctx.beginPath();
      for (let x = 0; x <= X(SAND_X); x += 14) mctx[x ? 'lineTo' : 'moveTo'](x, wy + Math.sin(x * 0.08 + i * 2) * 3);
      mctx.stroke();
    }
    mctx.fillStyle = '#d9b77c'; mctx.fillRect(X(SAND_X), 0, X(-HALF + 6) - X(SAND_X), H); // sand strip
    // District zones: saturated blocks + glow + boundary arcs.
    const zoneBounds = DISTRICTS.map(() => ({ x0: 1e9, z0: 1e9, x1: -1e9, z1: -1e9, n: 0 }));
    for (let bz = 0; bz < 6; bz++) for (let bx = 0; bx < 6; bx++) {
      const di = DMAP[bz][bx], [cx, cz] = blockCenter(bx, bz);
      const b = zoneBounds[di];
      b.x0 = Math.min(b.x0, cx); b.z0 = Math.min(b.z0, cz); b.x1 = Math.max(b.x1, cx); b.z1 = Math.max(b.z1, cz); b.n++;
      mctx.save();
      mctx.shadowColor = DISTRICTS[di].color; mctx.shadowBlur = 14;
      mctx.fillStyle = DISTRICTS[di].color; mctx.globalAlpha = 0.5;
      mctx.fillRect(X(cx - 19), Y(cz - 19), X(cx + 19) - X(cx - 19), Y(cz + 19) - Y(cz - 19));
      mctx.restore();
      mctx.fillStyle = 'rgba(255,255,255,0.08)';
      mctx.fillRect(X(cx - 19), Y(cz - 19), X(cx + 19) - X(cx - 19), Y(cz + 19) - Y(cz - 19));
      mctx.strokeStyle = 'rgba(255,255,255,0.35)'; mctx.lineWidth = 1;
      mctx.strokeRect(X(cx - 19), Y(cz - 19), X(cx + 19) - X(cx - 19), Y(cz + 19) - Y(cz - 19));
    }
    // Parks.
    mctx.fillStyle = '#2f7a4d';
    for (const [bx, bz] of [[1, 1], [4, 4]]) {
      const [cx, cz] = blockCenter(bx, bz);
      mctx.beginPath(); mctx.arc(X(cx), Y(cz), 14, 0, 7); mctx.fill();
      mctx.fillStyle = '#3a9a5f'; mctx.beginPath(); mctx.arc(X(cx) - 6, Y(cz) + 4, 8, 0, 7); mctx.fill();
      mctx.fillStyle = '#2f7a4d';
    }
    // Roads + glowing avenue.
    mctx.strokeStyle = 'rgba(255,255,255,0.55)'; mctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      mctx.beginPath(); mctx.moveTo(X(i * PITCH), 0); mctx.lineTo(X(i * PITCH), H); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(X(-HALF), Y(i * PITCH)); mctx.lineTo(W, Y(i * PITCH)); mctx.stroke();
    }
    mctx.save(); mctx.shadowColor = '#ffd54a'; mctx.shadowBlur = 10;
    mctx.strokeStyle = '#ffd54a'; mctx.lineWidth = 3;
    mctx.beginPath(); mctx.moveTo(X(-3 * PITCH), 0); mctx.lineTo(X(-3 * PITCH), H); mctx.stroke();
    mctx.restore();
    // District boundary arcs + label chips + emblems.
    for (let di = 0; di < 6; di++) {
      const b = zoneBounds[di];
      const ccx = (b.x0 + b.x1) / 2, ccz = (b.z0 + b.z1) / 2;
      const r = Math.max(X(b.x1) - X(b.x0), Y(b.z1) - Y(b.z0)) / 2 + 16;
      mctx.strokeStyle = DISTRICTS[di].color; mctx.globalAlpha = 0.7; mctx.setLineDash([8, 6]); mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(X(ccx), Y(ccz), r, 0, 7); mctx.stroke(); mctx.setLineDash([]); mctx.globalAlpha = 1;
      mctx.fillStyle = 'rgba(0,0,0,0.5)';
      mctx.beginPath(); mctx.arc(X(ccx), Y(ccz), 26, 0, 7); mctx.fill();
      mctx.strokeStyle = DISTRICTS[di].color; mctx.lineWidth = 2; mctx.stroke();
      emblem(mctx, EMBLEM_KIND[di], X(ccx), Y(ccz), 34, DISTRICTS[di].color);
      const label = DISTRICTS[di].name.toUpperCase();
      mctx.font = 'bold 13px sans-serif';
      const tw = mctx.measureText(label).width + 16;
      mctx.fillStyle = 'rgba(0,0,0,0.72)';
      mctx.beginPath(); mctx.roundRect(X(ccx) - tw / 2, Y(ccz) + 30, tw, 20, 10); mctx.fill();
      mctx.strokeStyle = DISTRICTS[di].color; mctx.lineWidth = 2; mctx.stroke();
      mctx.fillStyle = '#fff'; mctx.textAlign = 'center'; mctx.fillText(label, X(ccx), Y(ccz) + 44);
    }
    // POI markers with pulsing rings.
    for (let i = 0; i < POIS.length; i++) {
      const [label, bx, bz, kind] = POIS[i], [wx, wz] = blockCenter(bx, bz), px = X(wx), py = Y(wz);
      const pulse = 12 + Math.sin(t * 2.2 + i * 1.1) * 3;
      mctx.strokeStyle = 'rgba(255,255,255,0.75)'; mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(px, py, pulse, 0, 7); mctx.stroke();
      mctx.save(); mctx.shadowColor = '#fff'; mctx.shadowBlur = 10;
      if (kind === 'casino' || kind === 'mansion') star(mctx, px, py, 9, '#ffd54a');
      else if (kind === 'warehouse') { mctx.fillStyle = '#f56565'; mctx.beginPath(); mctx.arc(px, py, 8, 0, 7); mctx.fill(); mctx.fillStyle = '#111'; mctx.fillRect(px - 4, py - 2, 3, 3); mctx.fillRect(px + 1, py - 2, 3, 3); }
      else if (kind === 'market' || kind === 'garage') { mctx.fillStyle = '#48bb78'; mctx.beginPath(); mctx.arc(px, py, 8, 0, 7); mctx.fill(); mctx.fillStyle = '#fff'; mctx.font = 'bold 11px sans-serif'; mctx.textAlign = 'center'; mctx.fillText('$', px, py + 4); }
      else diamond(mctx, px, py, 9, '#4fd1ff');
      mctx.restore();
      mctx.font = 'bold 10px sans-serif'; mctx.fillStyle = '#fff'; mctx.textAlign = 'center';
      mctx.fillText(label, px, py + 26);
    }
    // Route dashes (gold, glowing).
    const tgt = missionTarget(G);
    if (tgt) {
      mctx.save(); mctx.shadowColor = '#ffd54a'; mctx.shadowBlur = 8;
      mctx.strokeStyle = '#ffd54a'; mctx.lineWidth = 3.5; mctx.setLineDash([10, 7]);
      mctx.lineDashOffset = -t * 22;
      mctx.beginPath(); mctx.moveTo(X(G.player.x), Y(G.player.z)); mctx.lineTo(X(tgt[0]), Y(G.player.z)); mctx.lineTo(X(tgt[0]), Y(tgt[1])); mctx.stroke();
      mctx.restore(); mctx.setLineDash([]);
      star(mctx, X(tgt[0]), Y(tgt[1]), 13, '#ffd54a');
    }
    // Police dots + heli glyph.
    mctx.fillStyle = '#4fd1ff';
    for (const c of G.actors.police) { mctx.beginPath(); mctx.arc(X(c.x), Y(c.z), 5, 0, 7); mctx.fill(); mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.stroke(); }
    if (G.actors.heli.active) {
      const hx = X(G.actors.heli.x), hy = Y(G.actors.heli.z);
      mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(hx, hy, 5, 0, 7); mctx.fill();
      mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(hx - 10, hy); mctx.lineTo(hx + 10, hy); mctx.stroke();
    }
    // Search-zone circle.
    if (G.wanted > 0) {
      mctx.strokeStyle = 'rgba(245,101,101,0.9)'; mctx.setLineDash([6, 5]); mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(X(G.player.x), Y(G.player.z), 30 * (W / (HALF + 16 - SEA_X + 8)), 0, 7); mctx.stroke(); mctx.setLineDash([]);
    }
    // Radar ring + sweep around the player arrow.
    const px = X(G.player.x), py = Y(G.player.z);
    mctx.strokeStyle = 'rgba(255,213,74,0.85)'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(px, py, 26, 0, 7); mctx.stroke();
    mctx.beginPath(); mctx.arc(px, py, 18, 0, 7); mctx.stroke();
    const sa = t * 1.4;
    mctx.beginPath(); mctx.moveTo(px, py); mctx.lineTo(px + Math.cos(sa) * 26, py + Math.sin(sa) * 26); mctx.stroke();
    mctx.save(); mctx.translate(px, py); mctx.rotate(Math.PI - G.player.ry);
    mctx.fillStyle = '#ffd54a'; mctx.strokeStyle = '#111'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.moveTo(0, -11); mctx.lineTo(7, 8); mctx.lineTo(-7, 8); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.restore();
    mctx.font = 'bold 12px sans-serif'; mctx.fillStyle = '#fff'; mctx.textAlign = 'left';
    mctx.fillText('N ↑', 12, 20);
    mctx.fillText('LAUT JAWA', 12, H - 14);
    // Circular completion gauge.
    const done = G.missionsDone.filter(Boolean).length, pct = done / 12;
    const gw = gaugeCv.width, gc = gw / 2, gr = gw / 2 - 9;
    gctx.clearRect(0, 0, gw, gw);
    gctx.strokeStyle = 'rgba(255,255,255,0.15)'; gctx.lineWidth = 10;
    gctx.beginPath(); gctx.arc(gc, gc, gr, 0, 7); gctx.stroke();
    gctx.strokeStyle = '#ffd54a'; gctx.lineCap = 'round';
    gctx.beginPath(); gctx.arc(gc, gc, gr, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2); gctx.stroke();
    gctx.fillStyle = '#fff'; gctx.font = 'bold 19px sans-serif'; gctx.textAlign = 'center';
    gctx.fillText(`${Math.round(pct * 100)}%`, gc, gc + 5);
    gctx.font = 'bold 9px sans-serif'; gctx.fillStyle = '#a0aec0';
    gctx.fillText('STORY', gc, gc + 20);
    refreshMissionList(); refreshStats();
  }

  function refreshGarage() {
    $('garageCash').textContent = '$' + G.cash.toLocaleString('en-US');
    $('garageCond').style.width = `${G.carCond}%`;
    const rows = [
      ['engine', 'ENGINE', G.upgrades.engine, 800, '+9% top speed / lvl'],
      ['armor', 'ARMOR', G.upgrades.armor, 600, 'Full armour + plating'],
      ['tires', 'TIRES', G.upgrades.tires, 400, '+10% grip / lvl'],
      ['paint', 'PAINT', G.paintIdx, 200, 'Cycle Garuda GT paint'],
    ];
    $('garageRows').innerHTML = rows.map(([k, name, lvl, cost, desc]) => `
      <div class="grow"><div><b>${name}</b><span>${desc}</span></div>
      <div class="pips">${'●'.repeat(lvl)}${'○'.repeat(3 - Math.min(3, lvl))}</div>
      <button data-up="${k}" ${G.cash < cost || (k !== 'paint' && lvl >= 3) ? 'disabled' : ''}>$${cost}</button></div>`).join('');
    $('garageRows').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      if (G.applyUpgrade(b.dataset.up)) { refreshGarage(); }
    }));
  }
  function refreshSaves() {
    const saves = G.readSaves();
    $('saveSlots').innerHTML = saves.map((s, i) => `
      <div class="slot"><b>SLOT ${i + 1}</b>
      ${s ? `<span>Mission ${s.missionIdx + 1}/12 · $${s.cash.toLocaleString('en-US')} · Day ${s.day}</span>` : '<span>EMPTY SLOT</span>'}
      <div><button data-load="${i}" ${s ? '' : 'disabled'}>LOAD</button>
      <button data-save="${i}" ${savesFrom === 'pause' ? '' : 'disabled'}>SAVE</button></div></div>`).join('');
    $('saveSlots').querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => G.loadFrom(+b.dataset.load)));
    $('saveSlots').querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () => { G.saveTo(+b.dataset.save); refreshSaves(); }));
  }

  const UI = {
    startNewGame() { G.startNewGame(); },
    sync() {
      for (const id of OVERLAYS) $(id).style.display = 'none';
      const mode = G.mode;
      const show = (id) => { $(id).style.display = 'flex'; };
      if (mode === 'title') {
        show('title');
        const has = G.readSaves().some(Boolean);
        $('btnContinue').disabled = !has;
        $('titleSaveInfo').textContent = has ? 'Save found — continue your story.' : 'No save yet — start a new story.';
      } else if (mode === 'howto') show('howto');
      else if (mode === 'pause') show('pause');
      else if (mode === 'garage') { show('garage'); refreshGarage(); }
      else if (mode === 'map') { show('mapScreen'); drawMap(); }
      else if (mode === 'saves') { show('saves'); refreshSaves(); }
      else if (mode === 'busted' || mode === 'wasted') {
        show(mode);
        $(mode === 'busted' ? 'bustedStats' : 'wastedStats').textContent =
          `Fine $${mode === 'busted' ? 300 : 150} · Cash $${G.cash.toLocaleString('en-US')} · Mission ${G.missionIdx + 1}/12`;
      } else if (mode === 'passed') {
        show('passed');
        const idx = G.missionIdx;
        $('passedName').textContent = MISSIONS[idx].name;
        $('passedReward').textContent = `+$${MISSIONS[idx].reward} · +120 REP`;
      } else if (mode === 'complete') {
        show('complete');
        $('completeStats').textContent = `$${G.cash.toLocaleString('en-US')} · ${G.kills} takedowns · ${G.stolen} cars stolen · Day ${G.day}`;
      }
    },
    drawMap,
    openSaves(from) { savesFrom = from; G.mode = 'saves'; UI.sync(); },
  };

  $('btnNewGame').addEventListener('click', () => G.startNewGame());
  $('btnContinue').addEventListener('click', () => {
    const saves = G.readSaves();
    for (let i = 0; i < 3; i++) if (saves[i]) { G.loadFrom(i); return; }
  });
  $('btnHowto').addEventListener('click', () => { G.mode = 'howto'; UI.sync(); });
  $('btnHowtoBack').addEventListener('click', () => { G.mode = 'title'; UI.sync(); });
  $('btnTitleSaves').addEventListener('click', () => UI.openSaves('title'));
  $('btnResume').addEventListener('click', () => { G.mode = 'play'; UI.sync(); });
  $('btnPauseMap').addEventListener('click', () => { G.mode = 'map'; UI.sync(); });
  $('btnPauseGarage').addEventListener('click', () => { G.mode = 'garage'; UI.sync(); });
  $('btnPauseSaves').addEventListener('click', () => UI.openSaves('pause'));
  $('btnQuitTitle').addEventListener('click', () => { G.mode = 'title'; G.daypartLock = 'dusk'; UI.sync(); });
  $('btnGarageClose').addEventListener('click', () => { G.mode = 'play'; UI.sync(); });
  $('btnMapClose').addEventListener('click', () => { G.mode = 'play'; UI.sync(); });
  $('btnSavesBack').addEventListener('click', () => { G.mode = savesFrom === 'pause' ? 'pause' : 'title'; UI.sync(); });
  $('btnBustedRespawn').addEventListener('click', () => G.respawn());
  $('btnWastedRespawn').addEventListener('click', () => G.respawn());
  $('btnFreeRoam').addEventListener('click', () => { G.mission = null; G.routeMesh = null; G.mode = 'play'; UI.sync(); });
  return UI;
}
