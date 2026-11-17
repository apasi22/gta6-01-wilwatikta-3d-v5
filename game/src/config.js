// Wilwatikta data: city layout, districts, time-of-day palettes, cars,
// weapons, crew, missions, and dialogue. All names and story are original.
export const PITCH = 46, ROADW = 12, HALF = 144;
export const SEA_X = -196, SAND_X = -152;
export const BLOCKS = 6;

// District table: rows bz 0..5 (north to south), cols bx 0..5 (west to east).
// 0 Pantai Kidul, 1 Lorong Emas, 2 Alun-Alun, 3 Pelabuhan Segara,
// 4 Pasar Senja, 5 Kampung Batik.
export const DMAP = [
  [0, 1, 1, 5, 5, 5],
  [0, 1, 2, 2, 5, 5],
  [0, 2, 2, 2, 2, 4],
  [0, 3, 2, 2, 4, 4],
  [3, 3, 4, 4, 4, 4],
  [3, 3, 4, 4, 4, 4],
];
export const DISTRICTS = [
  { name: 'PANTAI KIDUL', color: '#38b2ac', tag: 'Beachfront avenue, palms and gold light', hMin: 6, hMax: 14, palms: 9, neon: 0.3,
    faces: ['#e8c9a0', '#dfb28a', '#f0dcc0', '#d9a583', '#e6cf9e'] },
  { name: 'LORONG EMAS', color: '#d69e2e', tag: 'Casinos, gold teeth, bright lights', hMin: 14, hMax: 34, palms: 3, neon: 0.9,
    faces: ['#c98a4b', '#b97a3e', '#d9a05a', '#a86a35', '#e0b264'] },
  { name: 'ALUN-ALUN', color: '#667eea', tag: 'Old square, new towers, gold teeth', hMin: 16, hMax: 44, palms: 4, neon: 0.5,
    faces: ['#c9b8a3', '#b5a48c', '#d6c6ae', '#9a8d7a', '#c2b096'] },
  { name: 'PELABUHAN SEGARA', color: '#2b6cb0', tag: 'Docks, warehouses, salt air', hMin: 7, hMax: 16, palms: 2, neon: 0.2,
    faces: ['#8a7a68', '#7d6f5e', '#96887a', '#6e6257', '#a08e7c'] },
  { name: 'PASAR SENJA', color: '#dd6b20', tag: 'Night market, smoke and spices', hMin: 5, hMax: 12, palms: 3, neon: 0.8,
    faces: ['#d98a5a', '#c9743f', '#e09a68', '#b85f33', '#d47a4e'] },
  { name: 'KAMPUNG BATIK', color: '#9f7aea', tag: 'Painted lanes, indigo and rose', hMin: 6, hMax: 18, palms: 5, neon: 0.4,
    faces: ['#7a8fb0', '#b07a8e', '#8fa08a', '#a08ab0', '#c09a7a'] },
];
export function districtAt(x, z) {
  const bx = Math.max(0, Math.min(5, Math.floor((x + HALF) / PITCH)));
  const bz = Math.max(0, Math.min(5, Math.floor((z + HALF) / PITCH)));
  return DMAP[bz][bx];
}
export const blockCenter = (bx, bz) => [(bx - 2.5) * PITCH, (bz - 2.5) * PITCH];

// Points of interest: [name, bx, bz, kind]
export const POIS = [
  ['CASINO', 1, 0, 'casino'], ['MANSION', 4, 0, 'mansion'], ['MARKET', 4, 3, 'market'],
  ['GARAGE', 3, 3, 'garage'], ['WAREHOUSE', 1, 4, 'warehouse'], ['SAFEHOUSE', 1, 5, 'safehouse'],
  ['DOCKS', 0, 5, 'docks'],
];
export const GARAGE_POS = blockCenter(3, 3);

export const DAYPARTS = {
  day: { sun: [-0.55, 0.62, 0.25], sunCol: [1.0, 0.95, 0.85], amb: 0.55, fog: [0.75, 0.82, 0.9], fogN: 180, fogF: 520,
    sky: [[0.35, 0.55, 0.85], [0.65, 0.8, 0.95], [0.9, 0.93, 0.95]], glow: 0.25, lamp: 0.1, sunI: 0.7 },
  dusk: { sun: [-0.82, 0.22, 0.18], sunCol: [1.0, 0.55, 0.3], amb: 0.34, fog: [0.98, 0.55, 0.42], fogN: 150, fogF: 470,
    sky: [[0.32, 0.16, 0.5], [0.9, 0.35, 0.45], [1.0, 0.62, 0.32]], glow: 0.85, lamp: 0.7, sunI: 1.0 },
  night: { sun: [-0.4, 0.75, 0.3], sunCol: [0.55, 0.6, 0.85], amb: 0.22, fog: [0.08, 0.09, 0.2], fogN: 120, fogF: 400,
    sky: [[0.03, 0.04, 0.14], [0.1, 0.09, 0.26], [0.25, 0.16, 0.3]], glow: 1.0, lamp: 1.0, sunI: 0.15 },
};

export const CARS = [
  { name: 'GARUDA GT', color: [0.85, 0.12, 0.1], top: 168, acc: 26, grip: 2.6, len: 4.4 },
  { name: 'KENCANA S', color: [0.95, 0.75, 0.25], top: 178, acc: 30, grip: 2.8, len: 4.2 },
  { name: 'ARJUNA', color: [0.2, 0.35, 0.75], top: 148, acc: 22, grip: 2.4, len: 4.5 },
  { name: 'SRIKANDI', color: [0.15, 0.6, 0.55], top: 142, acc: 21, grip: 2.4, len: 4.3 },
  { name: 'GATOTKACA', color: [0.12, 0.12, 0.14], top: 152, acc: 23, grip: 2.3, len: 4.7 },
  { name: 'BIMA', color: [0.85, 0.85, 0.82], top: 132, acc: 19, grip: 2.2, len: 4.8 },
];
export const TRAFFIC_COLORS = [[0.7, 0.7, 0.72], [0.3, 0.45, 0.7], [0.75, 0.6, 0.3], [0.45, 0.55, 0.4], [0.6, 0.25, 0.25], [0.85, 0.8, 0.7], [0.35, 0.35, 0.4]];

export const WEAPONS = [
  { name: 'FISTS', mag: Infinity, reserve: Infinity, dmg: 20, rate: 0.45, range: 3, auto: false, icon: 'fists' },
  { name: 'PISTOL', mag: 12, reserve: 60, dmg: 25, rate: 0.28, range: 55, auto: false, icon: 'pistol' },
  { name: 'SMG', mag: 30, reserve: 90, dmg: 14, rate: 0.09, range: 48, auto: true, icon: 'smg' },
  { name: 'AR-9', mag: 24, reserve: 66, dmg: 34, rate: 0.14, range: 80, auto: true, icon: 'ar9', locked: true },
];
export const CREW = [
  { key: 'Z', who: 'AGUS', ability: 'INFO DALAM', cost: 100, cd: 22, color: '#e8a33d',
    desc: 'Clears roadblocks, grounds the helicopter for 12s', line: 'My cousin in dispatch owes me. Road is clear, Sugeng.' },
  { key: 'X', who: 'BAMBANG', ability: 'SERVIS CEPAT', cost: 150, cd: 30, color: '#7ab648',
    desc: 'Full repair, on the spot, no questions', line: 'Good as new. Try not to fold it again, ya?' },
  { key: 'C', who: 'RATNA', ability: 'JALUR TIKUS', cost: 200, cd: 35, color: '#e05a7a',
    desc: 'Rat runs and safehouses: lose one wanted star', line: 'Follow the alleys I marked. WPD will lose the scent.' },
];
export const UNIT_NAMES = ['GARUDA-11', 'ELANG-7', 'CENDRAWASIH-3', 'JALAK-5', 'MERPATI-9', 'RAJAWALI-2'];
export const RANKS = ['NOBODY', 'ERRAND BOY', 'WHEELMAN', 'HUSTLER', 'LEGENDA'];

// Missions: type goto | steal | escape | chase | deliver | clear. target = [bx, bz].
export const MISSIONS = [
  { name: 'Selamat Datang', giver: 'AGUS', role: 'FIXER', type: 'goto', target: [2, 2], reward: 400, time: 0,
    brief: 'Sugeng is back. Drive to Alun-Alun and meet Agus at the old square.',
    obj: 'Drive to the marker in Alun-Alun', done: 'Welcome home, Sugeng. Wilwatikta missed its best driver.' },
  { name: 'Hot Wheels', giver: 'AGUS', role: 'FIXER', type: 'steal', target: [1, 0], reward: 600, time: 150,
    brief: 'A Kencana S sits outside the casino. Take it. Try not to scratch the gold paint.',
    obj: 'Steal the gold coupe, deliver it to the garage', done: 'Clean work. The buyer never asks where it came from.' },
  { name: 'Antar Paket', giver: 'RATNA', role: 'LOOKOUT', type: 'deliver', target: [1, 5], reward: 550, time: 120,
    brief: 'A package for the safehouse. No questions, no stops, no police.',
    obj: 'Deliver the package to the safehouse in time', done: 'Delivered. Ratna owes you a coffee and a favor.' },
  { name: 'Tagihan Pasar', giver: 'BAMBANG', role: 'MECHANIC', type: 'clear', target: [4, 3], reward: 700, time: 0,
    brief: 'Debt collectors are shaking down the market stalls. Run them off.',
    obj: 'Clear the collectors out of Pasar Senja', done: 'The market breathes again. Bambang fixes your car free tonight.' },
  { name: 'Mata-Mata', giver: 'AGUS', role: 'FIXER', type: 'chase', target: [4, 0], reward: 800, time: 180,
    brief: 'A WPD informant is running for the mansion. Follow him. Do not let him arrive.',
    obj: 'Tail the informant, stop him before the mansion', done: 'He will not talk. Agus smiles for the first time all week.' },
  { name: 'Balapan Senja', giver: 'RATNA', role: 'LOOKOUT', type: 'deliver', target: [0, 2], reward: 900, time: 100,
    brief: 'Sunset race down the beachfront. Beat the clock, beat the pack.',
    obj: 'Race the beachfront avenue before sunset fades', done: 'Fastest wheels on Pantai Kidul. The crowd remembers.' },
  { name: 'Gudang Segara', giver: 'BAMBANG', role: 'MECHANIC', type: 'clear', target: [1, 4], reward: 1000, time: 0,
    brief: 'Wanto’s men hold the warehouse. Take it back, crate by crate.',
    obj: 'Clear the warehouse crew in Pelabuhan Segara', done: 'The warehouse is ours. The docks belong to Wilwatikta again.' },
  { name: 'Kabur dari WPD', giver: 'AGUS', role: 'FIXER', type: 'escape', target: [3, 3], reward: 1100, time: 150,
    brief: 'The whole department is coming. Lose them, then reach the garage.',
    obj: 'Lose the cops, then reach Bengkel Bambang', done: 'Four stars and a helicopter, and you still came home.' },
  { name: 'Heat Wave', giver: 'SUGENG', role: 'GETAWAY DRIVER', type: 'escape', target: [0, 5], reward: 1400, time: 150,
    brief: 'Outrun the helicopter. Reach the docks before the net closes.',
    obj: 'Outrun the helicopter — reach the docks!', done: 'The helicopter went home empty. Legends are built like this.' },
  { name: 'Kencana Hilang', giver: 'RATNA', role: 'LOOKOUT', type: 'steal', target: [4, 0], reward: 1500, time: 180,
    brief: 'The gold coupe was stolen back. Take it from the mansion garage.',
    obj: 'Steal the Kencana S back from the mansion', done: 'Twice stolen, twice yours. The coupe stays with family now.' },
  { name: 'Double Cross', giver: 'AGUS', role: 'FIXER', type: 'escape', target: [1, 5], reward: 1800, time: 180,
    brief: 'Double cross at the marina. Wanto set the whole thing up. Run.',
    obj: 'Reach the safehouse. Lose the heat if you can.', done: 'Wanto played his hand and lost. One job left, Sugeng.' },
  { name: 'The Last Ride', giver: 'SUGENG', role: 'GETAWAY DRIVER', type: 'deliver', target: [0, 2], reward: 2500, time: 200,
    brief: 'One last ride down the beachfront. Everything you own is in the trunk.',
    obj: 'Cross the city and vanish into the sunset', done: 'Wilwatikta fades in the mirror. Sugeng Wibowo is free.' },
];
export const DISPATCH = [
  'air support on scene, suspect heading north on the beachfront',
  'all units: gold coupe reported near the casino strip',
  'roadblock going up at the Alun-Alun junction',
  'units respond in Alun-Alun — suspect armed',
  'search zone active — break line of sight, swap cars',
  'Komisaris Wanto wants this driver alive. Repeat: alive.',
  'patrols report a red Garuda GT speeding past Pasar Senja',
  'helicopter refueling; ground units hold the cordon',
];
export const RADIO = [
  { station: 'GAMELAN FM 101.1', tracks: ['Saron Senja', 'Bonang Malam', 'Gending Pantai', 'Kendang Kota'] },
  { station: 'RADIO WILWATIKTA 88.4', tracks: ['Lorong Emas Blues', 'Batik dan Baja', 'Pelabuhan Pagi', 'Ratna’s Theme'] },
];
