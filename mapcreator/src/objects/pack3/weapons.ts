import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, crack, ellBody, mottle, OUT, polyBody, radial, rectBody, rectPath, rgb, rivet, shift, tube, wobble, blobPath, type G, type RGB, type Rnd } from '../pack2/helpers';
import { axe, bow, breastplate, heaterShield, helmet, mace, roundShield, spear, sword, BRONZE, IRON, LEATHER, STEEL, WOOD } from './arms';
import { bead, vary, woodDisc, woodRect } from './common';

/** Våbenudstillinger, rustningsstativer, trænings-dukker og målskiver. */

const SHIELD_COLS: RGB[] = [[150, 36, 40], [40, 70, 140], [190, 150, 40], [50, 110, 70], [30, 30, 36], [210, 200, 180], [120, 50, 130]];

function weaponAt(g: G, r: Rnd, kindIx: number, x: number, y: number, ang: number, len: number): void {
  switch (kindIx % 7) {
    case 0: sword(g, x, y, ang, len, { wide: 1.1 }); break;
    case 1: axe(g, x, y, ang, len, { double: r() < 0.3 }); break;
    case 2: spear(g, x, y, ang, len * 1.2); break;
    case 3: mace(g, x, y, ang, len * 0.8); break;
    case 4: sword(g, x, y, ang, len * 0.6, { blade: [190, 194, 204], guard: IRON, wide: 1.5 }); break;
    case 5: sword(g, x, y, ang, len, { curved: 0.07, guard: BRONZE }); break;
    default: axe(g, x, y, ang, len * 0.9, { big: 1.25, head: [96, 98, 104] }); break;
  }
}

/** Våbenstativ: vandret træskinne med hakker; våben ligger lodret i rækker. */
function weaponRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const mode = param(o, 'weapons', 'mixed');
  // bagplade og to bjælker
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [96, 66, 40], { count: 4, vertical: true, rad: 3 });
  const n = Math.max(4, Math.round(W / 17));
  for (const y of [-H * 0.32, H * 0.22]) {
    woodRect(g, r, -W / 2, y, W, 7, [128, 88, 50], { count: 1, vertical: false, nails: true, rad: 1 });
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + (W * (i + 0.5)) / n;
      g.fillStyle = 'rgba(10,4,0,.55)';
      g.fillRect(x - 1.5, y + 1, 3, 5);
    }
  }
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    const t = mode === 'swords' ? 0 : mode === 'axes' ? 1 : mode === 'spears' ? 2 : mode === 'maces' ? 3 : Math.floor(r() * 7);
    weaponAt(g, r, t, x, -H * 0.44, Math.PI / 2 + (r() - 0.5) * 0.05, H * 0.8);
  }
}

function spearRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // bund af planker + liggende ramme; spyd skråt i en række
  woodRect(g, r, -W / 2 + 1, -H * 0.12, W - 2, H * 0.24, [112, 78, 44], { count: 2, rad: 2 });
  const n = Math.max(3, Math.round(W / 14));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 8 + ((W - 16) * i) / Math.max(1, n - 1);
    spear(g, x, H * 0.46, -Math.PI / 2 + (r() - 0.5) * 0.14, H * 0.96, r() < 0.5 ? STEEL : [200, 200, 210]);
  }
  rectBody(g, -W / 2 + 1, H * 0.1, W - 2, 6, 1, [132, 92, 52], { lw: 1.2 });
  for (let i = 0; i < n; i++) rivet(g, -W / 2 + 8 + ((W - 16) * i) / Math.max(1, n - 1), H * 0.1 + 3, 1.3, [140, 140, 148]);
}

function bowRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [96, 66, 40], { count: 3, vertical: true, rad: 3 });
  const n = Math.max(2, Math.round(W / 26));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    bow(g, x - 6, 0, -Math.PI / 2 * 0 + 0, H * 0.84, vary(r, [140, 94, 52], 24));
  }
  // koger med pile
  const qx = W * 0.36;
  rectBody(g, qx - 7, -H * 0.3, 14, H * 0.6, 5, [112, 70, 38], { lw: 1.4 });
  for (let i = 0; i < 6; i++) {
    const px = qx - 4 + (i % 3) * 4;
    const py = -H * 0.3 + (i < 3 ? 0 : 3);
    g.fillStyle = 'rgb(226,222,200)';
    g.beginPath();
    g.arc(px, py, 1.5, 0, 7);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 0.6;
    g.stroke();
    g.fillStyle = i % 2 ? 'rgb(170,50,40)' : 'rgb(60,90,150)';
    g.fillRect(px - 0.7, py - 4, 1.4, 3);
  }
  void mottle;
}

/** Rustningsstativ set oppefra: hjelm, skuldre, brystplade og arme. */
function armorStand(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const mat = param(o, 'armor', 'plate');
  const col: RGB = mat === 'leather' ? [120, 76, 42] : mat === 'chain' ? [140, 142, 150] : [170, 176, 188];
  // fod af træ
  woodRect(g, r, -S * 0.42, S * 0.38, S * 0.84, S * 0.1, [112, 76, 44], { count: 1, rad: 2 });
  // arme
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.3, -S * 0.22);
      g.lineTo(s * S * 0.48, S * 0.18);
    }, S * 0.13, col, { outline: 2 });
    ellBody(g, s * S * 0.32, -S * 0.24, S * 0.14, S * 0.1, shift(col, 10), { lw: 1.4 });
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.ellipse(s * S * 0.32, -S * 0.24, S * (0.13 - i * 0.03), S * (0.09 - i * 0.02), 0, 0.2, 2.9);
      g.strokeStyle = 'rgba(20,20,30,.3)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  }
  if (mat === 'plate') breastplate(g, r, 0, S * 0.1, S * 0.62, col);
  else {
    const path = rectPath(g, -S * 0.2, -S * 0.22, S * 0.4, S * 0.62, S * 0.08);
    body(g, path, col, [-S * 0.2, -S * 0.22, S * 0.2, S * 0.4], { lw: 1.5 });
    g.save();
    path();
    g.clip();
    if (mat === 'chain') {
      g.fillStyle = 'rgba(30,34,44,.35)';
      for (let y = -S * 0.22; y < S * 0.4; y += 3.2) for (let x = -S * 0.2 + ((Math.round(y) % 2) * 1.6); x < S * 0.2; x += 3.2) {
        g.beginPath();
        g.arc(x, y, 1, 0, 7);
        g.fill();
      }
    } else {
      for (let i = 0; i < 5; i++) {
        g.strokeStyle = 'rgba(40,20,6,.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-S * 0.2, -S * 0.1 + i * S * 0.1);
        g.lineTo(S * 0.2, -S * 0.1 + i * S * 0.1);
        g.stroke();
      }
      for (let i = 0; i < 4; i++) rivet(g, -S * 0.12 + i * S * 0.08, -S * 0.02, 1.2, [170, 150, 90]);
    }
    g.restore();
  }
  helmet(g, 0, -S * 0.32, S * 0.15, mat === 'leather' ? [110, 72, 40] : STEEL, { crest: mat === 'plate' ? [170, 40, 40] : undefined });
  void mottle;
}

function shieldRow(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // vægskinne
  woodRect(g, r, -W / 2 + 1, -H * 0.12, W - 2, H * 0.24, [100, 68, 40], { count: 1, rad: 2 });
  const n = param(o, 'count', 4);
  const rad = Math.min(H * 0.46, (W / n) * 0.47);
  for (let i = 0; i < n; i++) {
    const cx = -W / 2 + (W * (i + 0.5)) / n;
    if (r() < 0.6) roundShield(g, r, cx, 0, rad, SHIELD_COLS[Math.floor(r() * SHIELD_COLS.length)]!, { pattern: Math.floor(r() * 4) });
    else heaterShield(g, r, cx, 0, rad * 0.78, rad * 1.8, SHIELD_COLS[Math.floor(r() * SHIELD_COLS.length)]!, { charge: Math.floor(r() * 3) });
  }
}

function displayTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [96, 62, 36], { count: 4, vertical: false, rad: 3 });
  // blå fløjlsdug
  const cloth = rectPath(g, -W / 2 + 6, -H / 2 + 6, W - 12, H - 12, 3);
  body(g, cloth, [38, 50, 110], [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.2, ao: 2 });
  g.save();
  cloth();
  g.clip();
  mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], [38, 50, 110], 40, 5, 18, 0.5);
  g.strokeStyle = 'rgba(220,190,90,.85)';
  g.lineWidth = 1.2;
  g.strokeRect(-W / 2 + 9, -H / 2 + 9, W - 18, H - 18);
  g.restore();
  // pragtsværd på midten, hjelm, dolk
  sword(g, -W * 0.38, 0, 0, W * 0.5, { blade: [210, 214, 224], guard: [216, 176, 60], grip: [90, 30, 40], wide: 1.3 });
  helmet(g, W * 0.22, -H * 0.02, H * 0.2, [200, 204, 214], { crest: [170, 40, 40] });
  sword(g, W * 0.34, H * 0.28, -0.2, W * 0.14, { guard: [216, 176, 60], blade: [200, 204, 214] });
  bead(g, W * 0.4, -H * 0.2, 3.2, [60, 190, 110]);
}

/** Træningsdukke: pæl med tværbjælke og halmsæk, set oppefra. */
function trainingDummy(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // fod
  woodDisc(g, r, 0, 0, S * 0.46, [98, 66, 40], 2);
  // arme (tværbjælke)
  tube(g, () => {
    g.beginPath();
    g.moveTo(-S * 0.42, S * 0.02);
    g.lineTo(S * 0.42, S * 0.02);
  }, S * 0.1, [124, 84, 48], { outline: 2 });
  // halmkrop
  const pts = wobble(r, 0, 0, S * 0.24, S * 0.2, 12, 0.1);
  body(g, blobPath(g, pts), [196, 162, 92], [-S * 0.26, -S * 0.22, S * 0.26, S * 0.22], { lw: 1.4 });
  g.save();
  blobPath(g, pts)();
  g.clip();
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${r() < 0.5 ? '110,80,30' : '240,220,150'},.5)`;
    g.lineWidth = 0.8;
    const x = (r() - 0.5) * S * 0.5;
    const y = (r() - 0.5) * S * 0.4;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 10, y + (r() - 0.5) * 6);
    g.stroke();
  }
  g.restore();
  // hoved (sæk)
  ellBody(g, 0, -S * 0.05, S * 0.12, S * 0.12, [188, 160, 110], { lw: 1.3 });
  g.strokeStyle = 'rgba(60,34,10,.7)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-S * 0.12, -S * 0.05);
  g.lineTo(S * 0.12, -S * 0.05);
  g.stroke();
  // rebbånd og hug
  g.strokeStyle = 'rgb(120,84,44)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, S * 0.23, 0.4, 2.7);
  g.stroke();
  for (let i = 0; i < 4; i++) crack(g, r, (r() - 0.5) * S * 0.3, (r() - 0.5) * S * 0.25, 6, r() * 6, 0.9, false);
  // en øksestrid i dukken
  if (param(o, 'weapon', true)) sword(g, S * 0.04, S * 0.05, 0.7, S * 0.36, { wide: 1 });
}

/** Skydeskive set oppefra: ringe af halm med pile. */
function archeryTarget(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 - 2;
  // stativ
  woodRect(g, r, -R * 0.1, -R, R * 0.2, R * 2, [100, 68, 40], { vertical: true, count: 1, rad: 1 });
  const rings: RGB[] = [[236, 226, 196], [30, 30, 34], [50, 100, 170], [190, 40, 40], [236, 200, 70]];
  ellBody(g, 0, 0, R, R, [196, 160, 90], { lw: 1.8 });
  rings.forEach((c, i) => {
    const rad = R * (0.94 - i * 0.18);
    g.beginPath();
    g.arc(0, 0, rad, 0, 7);
    g.fillStyle = rgb(c);
    g.fill();
    g.strokeStyle = 'rgba(20,10,4,.45)';
    g.lineWidth = 1;
    g.stroke();
  });
  g.fillStyle = radial(g, 0, 0, R, [[0, 'rgba(255,255,255,.16)'], [1, 'rgba(0,0,0,.18)']], -R * 0.3, -R * 0.3, 0);
  g.beginPath();
  g.arc(0, 0, R * 0.94, 0, 7);
  g.fill();
  // flettet halm på kanten
  g.beginPath();
  g.arc(0, 0, R * 0.97, 0, 7);
  g.strokeStyle = 'rgba(120,84,30,.6)';
  g.lineWidth = 2;
  g.setLineDash([2, 2]);
  g.stroke();
  g.setLineDash([]);
  // pile
  const n = param(o, 'arrows', 5);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * R * 0.75;
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d;
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath();
    g.arc(px + 0.7, py + 0.7, 1.6, 0, 7);
    g.fill();
    g.fillStyle = 'rgb(210,200,170)';
    g.beginPath();
    g.arc(px, py, 1.5, 0, 7);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 0.6;
    g.stroke();
    // fjer
    for (let k = 0; k < 3; k++) {
      const fa = (k / 3) * 6.283 + i;
      g.strokeStyle = i % 2 ? 'rgb(190,50,40)' : 'rgb(240,240,230)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(fa) * 4, py + Math.sin(fa) * 4);
      g.stroke();
    }
  }
}

/** Våbenvæg: stor opstilling i vifte med skjolde, sværd og økser (vægger mod toppen). */
function weaponWall(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [84, 56, 34], { count: 6, vertical: true, rad: 3 });
  // central skjold med krydsede våben
  const n = 3;
  for (let i = 0; i < n; i++) {
    const cx = -W / 2 + (W * (i + 0.5)) / n;
    const cy = -H * 0.02;
    const rad = Math.min(W / n, H) * 0.19;
    const t1 = Math.floor(r() * 7);
    weaponAt(g, r, t1, cx - rad * 2.6, cy + rad * 2.4, -0.9, rad * 5);
    weaponAt(g, r, t1 + 1, cx + rad * 2.6, cy + rad * 2.4, -Math.PI + 0.9, rad * 5);
    roundShield(g, r, cx, cy, rad * 1.1, SHIELD_COLS[Math.floor(r() * SHIELD_COLS.length)]!, { pattern: Math.floor(r() * 4) });
    // dyrehoved-trofæ: hjelm over
    helmet(g, cx, cy - rad * 1.75, rad * 0.5, STEEL, { horns: r() < 0.4 });
  }
  rectBody(g, -W / 2 + 1, H * 0.38, W - 2, 6, 1, [112, 76, 44], { lw: 1.2 });
  void LEATHER;
  void WOOD;
  void BRONZE;
}

function helmetShelf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [108, 74, 44], { count: 2, vertical: false, rad: 2 });
  const n = Math.max(3, Math.round(W / 34));
  for (let i = 0; i < n; i++) {
    const cx = -W / 2 + (W * (i + 0.5)) / n;
    const rad = Math.min(W / n, H) * 0.36;
    const t = i % 3;
    helmet(g, cx, 0, rad, vary(r, t === 2 ? [150, 110, 56] : STEEL, 24), { crest: t === 1 ? [40, 70, 150] : undefined, horns: t === 2 && r() < 0.5 });
  }
}

export const weaponKinds: ObjectKind[] = [
  kind({
    key: 'arms_weapon_rack', family: 'armory', name: 'Våbenstativ', w: 3, h: 1.4, keepAspect: false, shadow: 6, bleed: 0.06,
    params: [{ key: 'weapons', label: 'Våben', type: 'select', default: 'mixed', options: [{ value: 'mixed', label: 'Blandet' }, { value: 'swords', label: 'Sværd' }, { value: 'axes', label: 'Økser' }, { value: 'spears', label: 'Spyd' }, { value: 'maces', label: 'Køller' }] }],
    tags: ['military', 'city', 'house'], draw: weaponRack,
  }),
  kind({ key: 'arms_spear_rack', family: 'armory', name: 'Spydstativ', w: 3, h: 1.6, keepAspect: false, shadow: 6, bleed: 0.06, tags: ['military', 'city'], draw: spearRack }),
  kind({ key: 'arms_bow_rack', family: 'armory', name: 'Buestativ', w: 2.4, h: 1.6, keepAspect: false, shadow: 5, bleed: 0.06, tags: ['military', 'city', 'forest'], draw: bowRack }),
  kind({
    key: 'arms_armor_stand', family: 'armory', name: 'Rustningsstativ', w: 1.5, h: 1.5, shadow: 6, bleed: 0.06,
    params: [{ key: 'armor', label: 'Rustning', type: 'select', default: 'plate', options: [{ value: 'plate', label: 'Pladerustning' }, { value: 'chain', label: 'Ringbrynje' }, { value: 'leather', label: 'Læder' }] }],
    tags: ['military', 'city', 'rich'], draw: armorStand,
  }),
  kind({ key: 'arms_shield_row', family: 'armory', name: 'Skjolde på rad', w: 3, h: 0.9, keepAspect: false, shadow: 4, bleed: 0.06, params: [{ key: 'count', label: 'Antal', type: 'range', min: 2, max: 6, step: 1, default: 4 }], tags: ['military', 'city', 'tavern'], draw: shieldRow }),
  kind({ key: 'arms_display_table', family: 'armory', name: 'Udstillingsbord', w: 2.6, h: 1.4, keepAspect: false, shadow: 5, bleed: 0.04, tags: ['rich', 'city', 'house'], draw: displayTable }),
  kind({ key: 'arms_dummy', family: 'armory', name: 'Træningsdukke', w: 1.4, h: 1.4, shadow: 5, bleed: 0.05, randomRotation: true, params: [{ key: 'weapon', label: 'Sværd i dukken', type: 'toggle', default: true }], tags: ['military', 'village', 'city', 'outdoor'], draw: trainingDummy }),
  kind({ key: 'arms_target', family: 'armory', name: 'Skydeskive', w: 1.6, h: 1.6, shadow: 5, bleed: 0.03, randomRotation: true, params: [{ key: 'arrows', label: 'Pile', type: 'range', min: 0, max: 9, step: 1, default: 5 }], tags: ['military', 'village', 'city', 'outdoor'], draw: archeryTarget }),
  kind({ key: 'arms_weapon_wall', family: 'armory', name: 'Våbenvæg', w: 4, h: 1.8, keepAspect: false, shadow: 4, bleed: 0.04, tags: ['military', 'rich', 'city'], draw: weaponWall }),
  kind({ key: 'arms_helmet_shelf', family: 'armory', name: 'Hjelmhylde', w: 3, h: 1, keepAspect: false, shadow: 4, bleed: 0.04, tags: ['military', 'city', 'house'], draw: helmetShelf }),
];

void rectPath;
void polyBody;
void body;
