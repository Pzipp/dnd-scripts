import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { blade, ellBody, mottle, OUT, radial, leaf } from '../pack2/helpers';
import { canopy, dome, limb, rgb, rr, shift, type G, type RGB, type Rnd } from './common';

/** Nye arter af træer og planter (pakke 8), set lige oppefra. */

const FAM = 'flora';
const sel = (key: string, label: string, opts: [string, string][], def: string): ParamDef => ({
  key, label, type: 'select', default: def, options: opts.map(([value, l]) => ({ value, label: l })),
});
const idx = (o: DrawInput, key: string, n: number): number => Math.min(n - 1, Math.max(0, parseInt(param(o, key, '0'), 10) || 0));

/** Et palmeblad: svunget midterrib med småblade til begge sider. */
function frond(g: G, r: Rnd, ang: number, len: number, wid: number, col: RGB, droop: number): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const pt = (t: number): [number, number] => [dx * len * t + nx * droop * t * t * len, dy * len * t + ny * droop * t * t * len];
  g.lineCap = 'round';
  const n = Math.max(8, Math.round(len / 5));
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const [px, py] = pt(t);
    const sz = wid * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.12)) * (0.9 + r() * 0.2);
    for (const s of [-1, 1]) {
      const a = ang + s * (1.0 - t * 0.3) + droop * t * 0.8;
      const ex = px + Math.cos(a) * sz;
      const ey = py + Math.sin(a) * sz;
      g.strokeStyle = rgb(shift(col, (s < 0 ? 14 : -16) + (r() - 0.5) * 16));
      g.lineWidth = Math.max(1.2, len * 0.028);
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo((px + ex) / 2 + nx * sz * 0.12, (py + ey) / 2 + ny * sz * 0.12, ex, ey);
      g.stroke();
    }
  }
  g.beginPath();
  for (let i = 0; i <= 8; i++) {
    const [px, py] = pt(i / 8);
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.strokeStyle = rgb(shift(col, -44));
  g.lineWidth = Math.max(1.4, len * 0.04);
  g.stroke();
  g.strokeStyle = rgb(shift(col, 40), 0.6);
  g.lineWidth = Math.max(0.6, len * 0.014);
  g.stroke();
}

const baobab = kind({
  key: 'flora_baobab', family: FAM, name: 'Baobab', w: 6, h: 6, randomRotation: true, sizeJitter: 0.15, shadow: 34, bleed: 0.06,
  tags: ['desert', 'grassland'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const bark: RGB = [138, 112, 92];
    const n = 11;
    const tips: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + r() * 0.4;
      const len = R * (0.62 + r() * 0.28);
      const mid: [number, number] = [Math.cos(a + 0.2) * len * 0.5, Math.sin(a + 0.2) * len * 0.5];
      const end: [number, number] = [Math.cos(a) * len, Math.sin(a) * len];
      limb(g, [[0, 0], mid, end], R * (0.1 - i * 0.002), bark);
      tips.push([end[0], end[1], a]);
    }
    for (const [x, y, a] of tips) {
      canopy(g, r, x, y, R * (0.2 + r() * 0.07), [88, 128, 56], { lobes: 5, dots: 14 });
      void a;
    }
    // den enorme stamme set ovenfra: årringe og revner
    dome(g, 0, 0, R * 0.34, R * 0.34, bark, { lw: 1.8 });
    for (let i = 1; i < 5; i++) {
      g.strokeStyle = `rgba(40,24,14,${0.32 - i * 0.04})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse((r() - 0.5) * 2, (r() - 0.5) * 2, R * (0.06 + i * 0.058), R * (0.06 + i * 0.058), 0, 0, 7);
      g.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const a = r() * 6.283;
      g.strokeStyle = 'rgba(40,24,14,.5)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12);
      g.lineTo(Math.cos(a + 0.1) * R * 0.32, Math.sin(a + 0.1) * R * 0.32);
      g.stroke();
    }
  },
});

const bamboo = kind({
  key: 'flora_bamboo', family: FAM, name: 'Bambusklump', w: 3, h: 3, randomRotation: true, sizeJitter: 0.2, shadow: 24, bleed: 0.08,
  tags: ['forest', 'swamp'],
  params: [sel('tone', 'Farve', [['0', 'Grøn'], ['1', 'Gylden']], '0')],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const gold = param(o, 'tone', '0') === '1';
    const leafCol: RGB = gold ? [150, 160, 60] : [78, 140, 66];
    const culm: RGB = gold ? [206, 176, 80] : [112, 162, 78];
    const stems: [number, number][] = [];
    for (let i = 0; i < 11; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * R * 0.42;
      stems.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
    // blade i stjerner rundt om hvert strå
    for (const [x, y] of stems) {
      const m = 6 + Math.floor(r() * 3);
      for (let j = 0; j < m; j++) {
        leaf(g, x, y, (j / m) * 6.283 + r(), R * (0.38 + r() * 0.22), R * 0.07, shift(leafCol, (r() - 0.5) * 30), false);
      }
    }
    stems.sort((p, q) => q[0] + q[1] - (p[0] + p[1]));
    for (const [x, y] of stems) {
      const s = R * (0.07 + r() * 0.03);
      dome(g, x, y, s, s, culm, { lw: 1.2, hi: 46 });
      g.strokeStyle = 'rgba(40,40,10,.55)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.arc(x, y, s * 0.55, 0, 7);
      g.stroke();
    }
  },
});

function palmCrown(g: G, o: DrawInput, fronds: number, lenK: number, wid: number, col: RGB, droop: number, nuts: boolean): void {
  const r = rng(o.seed);
  const R = o.w / 2;
  const off = r() * 6.283;
  for (let i = 0; i < fronds; i++) {
    frond(g, r, off + (i / fronds) * 6.283 + (r() - 0.5) * 0.25, R * lenK * (0.9 + r() * 0.2), R * wid, shift(col, (r() - 0.5) * 20), droop * (i % 2 ? 1 : -1) * (0.6 + r() * 0.5));
  }
  dome(g, 0, 0, R * 0.14, R * 0.14, [120, 92, 60], { lw: 1.4 });
  if (nuts) {
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1 + r();
      dome(g, Math.cos(a) * R * 0.09, Math.sin(a) * R * 0.09, R * 0.055, R * 0.055, [110, 128, 58], { lw: 0.9, hi: 40 });
    }
  }
}

const palmCoconut = kind({
  key: 'flora_palm_coconut', family: FAM, name: 'Kokospalme', w: 4.4, h: 4.4, randomRotation: true, sizeJitter: 0.15, shadow: 30, bleed: 0.05,
  tags: ['desert', 'water', 'harbor'],
  draw: (g, o) => palmCrown(g, o, 12, 0.96, 0.3, [88, 148, 62], 0.25, true),
});

const palmFan = kind({
  key: 'flora_palm_fan', family: FAM, name: 'Vifte-palme', w: 3.4, h: 3.4, randomRotation: true, sizeJitter: 0.15, shadow: 26, bleed: 0.05,
  tags: ['desert', 'swamp'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const n = 13;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + (r() - 0.5) * 0.2;
      const len = R * (0.84 + r() * 0.14);
      g.save();
      g.rotate(a);
      // vifteblad: bred kile med dybe folder
      const col: RGB = shift([96, 138, 58], (r() - 0.5) * 26);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(len * 0.5, -len * 0.2);
      g.quadraticCurveTo(len, -len * 0.16, len, 0);
      g.quadraticCurveTo(len, len * 0.16, len * 0.5, len * 0.2);
      g.closePath();
      g.fillStyle = rgb(col);
      g.fill();
      g.strokeStyle = 'rgba(20,30,8,.7)';
      g.lineWidth = 1.2;
      g.stroke();
      g.strokeStyle = 'rgba(210,230,150,.45)';
      g.lineWidth = 1;
      for (const t of [-0.5, 0, 0.5]) {
        g.beginPath();
        g.moveTo(len * 0.1, t * len * 0.04);
        g.lineTo(len * 0.97, t * len * 0.1);
        g.stroke();
      }
      g.restore();
    }
    dome(g, 0, 0, R * 0.13, R * 0.13, [124, 96, 62], { lw: 1.4 });
  },
});

const mangrove = kind({
  key: 'flora_mangrove', family: FAM, name: 'Mangrove', w: 5, h: 5, randomRotation: true, sizeJitter: 0.2, shadow: 24, bleed: 0.06,
  tags: ['swamp', 'water', 'forest'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const root: RGB = [112, 82, 56];
    // stylterødder i en vifte rundt om stammen
    for (let i = 0; i < 18; i++) {
      const a = r() * 6.283;
      const L = R * (0.7 + r() * 0.28);
      const pts: [number, number][] = [[Math.cos(a) * R * 0.15, Math.sin(a) * R * 0.15]];
      let ca = a;
      for (let k = 1; k <= 4; k++) {
        ca += (r() - 0.5) * 0.7;
        pts.push([Math.cos(ca) * L * (k / 4), Math.sin(ca) * L * (k / 4)]);
      }
      limb(g, pts, R * (0.045 + r() * 0.025), root);
    }
    canopy(g, r, 0, 0, R * 0.72, [64, 112, 58], { lobes: 8, dots: 40, dotCol: [90, 140, 70] });
    dome(g, -R * 0.1, -R * 0.1, R * 0.12, R * 0.12, [96, 72, 48], { lw: 1 });
  },
});

const mushTree = kind({
  key: 'flora_mushroom_tree', family: FAM, name: 'Kæmpesvamp', w: 4, h: 4, randomRotation: true, sizeJitter: 0.2, shadow: 26, bleed: 0.05,
  tags: ['cave', 'magic', 'swamp'],
  params: [sel('tone', 'Hat', [['0', 'Rød med pletter'], ['1', 'Lilla, glødende'], ['2', 'Brun'], ['3', 'Blågrøn']], '0')],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const k = idx(o, 'tone', 4);
    const cols: RGB[] = [[184, 50, 44], [128, 70, 160], [150, 106, 66], [60, 144, 150]];
    const col = cols[k]!;
    const pts: [number, number][] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * 6.283;
      const q = 1 + (r() - 0.5) * 0.14;
      pts.push([Math.cos(a) * R * q * 0.96, Math.sin(a) * R * q * 0.9]);
    }
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.fillStyle = radial(g, 0, 0, R, [[0, rgb(shift(col, 40))], [0.55, rgb(col)], [1, rgb(shift(col, -56))]], -R * 0.34, -R * 0.36, R * 0.04);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.8;
    g.lineJoin = 'round';
    g.stroke();
    // lameller (antydet som svage radiale linjer ved randen)
    g.strokeStyle = 'rgba(30,10,10,.2)';
    g.lineWidth = 1;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * 6.283;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74);
      g.lineTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.9);
      g.stroke();
    }
    const spot = k === 0 ? 'rgba(250,240,220,.92)' : k === 1 ? 'rgba(220,170,255,.8)' : k === 3 ? 'rgba(190,255,230,.8)' : 'rgba(210,180,130,.7)';
    for (let i = 0; i < 12; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * R * 0.72;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const s = R * (0.04 + r() * 0.08);
      g.fillStyle = spot;
      g.beginPath();
      g.ellipse(x, y, s, s * 0.85, r() * 3, 0, 7);
      g.fill();
      g.strokeStyle = 'rgba(20,10,10,.3)';
      g.lineWidth = 0.8;
      g.stroke();
    }
    dome(g, -R * 0.06, -R * 0.06, R * 0.15, R * 0.13, shift(col, 20), { lw: 0.8, hi: 50 });
  },
});

const charred = kind({
  key: 'flora_charred_tree', family: FAM, name: 'Forkullet træ', w: 4, h: 4, randomRotation: true, sizeJitter: 0.2, shadow: 18, bleed: 0.05,
  tags: ['battlefield', 'ruin', 'forest'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    // aske og sod på jorden
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * R * 0.85;
      g.fillStyle = `rgba(${r() < 0.5 ? '40,36,34' : '110,104,98'},${0.14 + r() * 0.16})`;
      g.beginPath();
      g.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * (0.1 + r() * 0.14), R * (0.06 + r() * 0.1), r() * 3, 0, 7);
      g.fill();
    }
    const coal: RGB = [44, 38, 36];
    const branch = (x: number, y: number, a: number, len: number, wd: number, depth: number): void => {
      const ex = x + Math.cos(a) * len;
      const ey = y + Math.sin(a) * len;
      limb(g, [[x, y], [(x + ex) / 2 + (r() - 0.5) * 4, (y + ey) / 2 + (r() - 0.5) * 4], [ex, ey]], wd, coal);
      if (depth > 0) {
        const n = 2 + (r() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) branch(ex, ey, a + (r() - 0.5) * 1.5, len * (0.6 + r() * 0.2), wd * 0.66, depth - 1);
      }
    };
    const n = 5 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) branch(0, 0, (i / n) * 6.283 + r() * 0.6, R * 0.34, R * 0.09, 2);
    dome(g, 0, 0, R * 0.15, R * 0.15, coal, { lw: 1.4, hi: 20 });
    // glødende rester i sprækkerne
    for (let i = 0; i < 7; i++) {
      const a = r() * 6.283;
      const d = r() * R * 0.8;
      g.fillStyle = `rgba(255,${110 + r() * 80},30,${0.5 + r() * 0.4})`;
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.9 + r() * 1.2, 0, 7);
      g.fill();
    }
  },
});

const snowPine = kind({
  key: 'flora_snow_pine', family: FAM, name: 'Fyr i sne', w: 3.6, h: 3.6, randomRotation: true, sizeJitter: 0.2, shadow: 30, bleed: 0.05,
  tags: ['arctic', 'mountain'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const col: RGB = [44, 88, 66];
    // lag af grene som spidse stjerner, mindre og lysere mod toppen
    const layers = 4;
    for (let l = 0; l < layers; l++) {
      const rad = R * (0.96 - l * 0.2);
      const m = 11 + l;
      const off = r() * 6.283;
      const c = shift(col, l * 9);
      g.beginPath();
      for (let i = 0; i < m * 2; i++) {
        const a = off + (i / (m * 2)) * 6.283;
        const q = i % 2 ? 0.52 : 1 - r() * 0.12;
        const x = Math.cos(a) * rad * q;
        const y = Math.sin(a) * rad * q;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      g.fillStyle = radial(g, 0, 0, rad, [[0, rgb(shift(c, 26))], [1, rgb(shift(c, -34))]], -rad * 0.3, -rad * 0.3, 2);
      g.fill();
      g.strokeStyle = 'rgba(10,24,16,.75)';
      g.lineWidth = 1.2;
      g.lineJoin = 'round';
      g.stroke();
      // sne på grenene (oven på, lysest mod venstre)
      g.save();
      g.clip();
      for (let i = 0; i < 9 + l * 2; i++) {
        const a = r() * 6.283;
        const d = rad * (0.2 + r() * 0.7);
        g.fillStyle = `rgba(244,248,255,${0.62 + r() * 0.3})`;
        g.beginPath();
        g.ellipse(Math.cos(a) * d - 1, Math.sin(a) * d - 1, rad * (0.08 + r() * 0.1), rad * (0.05 + r() * 0.06), a, 0, 7);
        g.fill();
      }
      g.restore();
    }
    dome(g, -R * 0.03, -R * 0.03, R * 0.12, R * 0.12, [240, 245, 252], { lw: 0.8, hi: 10, lo: 30 });
  },
});

const AUTUMN: { label: string; base: RGB; dot: RGB }[] = [
  { label: 'Gylden', base: [214, 170, 56], dot: [236, 200, 90] },
  { label: 'Orange', base: [204, 112, 40], dot: [236, 150, 60] },
  { label: 'Rød', base: [170, 52, 36], dot: [210, 84, 50] },
  { label: 'Blandet', base: [196, 128, 44], dot: [150, 160, 56] },
];

const birchAutumn = kind({
  key: 'flora_birch_autumn', family: FAM, name: 'Birk i efterårsfarver', w: 3.4, h: 3.4, randomRotation: true, sizeJitter: 0.2, shadow: 28, bleed: 0.06,
  tags: ['forest', 'grassland'],
  params: [sel('tone', 'Løv', AUTUMN.map((a, i) => [String(i), a.label]), '0')],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const a = AUTUMN[idx(o, 'tone', AUTUMN.length)]!;
    // hvide grene stikker frem mellem løvet
    for (let i = 0; i < 6; i++) {
      const ang = r() * 6.283;
      limb(g, [[0, 0], [Math.cos(ang) * R * 0.5, Math.sin(ang) * R * 0.5], [Math.cos(ang + 0.15) * R * 0.88, Math.sin(ang + 0.15) * R * 0.88]], R * 0.035, [220, 214, 200]);
    }
    canopy(g, r, 0, 0, R * 0.9, a.base, { lobes: 10, dots: 90, dotCol: a.dot });
    // faldne blade rundt (få)
    for (let i = 0; i < 12; i++) {
      const ang = r() * 6.283;
      const d = R * (0.88 + r() * 0.12);
      g.fillStyle = rgb(shift(a.dot, (r() - 0.5) * 40), 0.8);
      g.beginPath();
      g.ellipse(Math.cos(ang) * d, Math.sin(ang) * d, 2.2, 1.4, r() * 3, 0, 7);
      g.fill();
    }
    dome(g, 0, 0, R * 0.07, R * 0.07, [226, 220, 206], { lw: 0.9 });
  },
});

const cherry = kind({
  key: 'flora_cherry_blossom', family: FAM, name: 'Kirsebærtræ i blomst', w: 3.4, h: 3.4, randomRotation: true, sizeJitter: 0.2, shadow: 28, bleed: 0.06,
  tags: ['forest', 'grassland', 'village'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    for (let i = 0; i < 6; i++) {
      const ang = r() * 6.283;
      limb(g, [[0, 0], [Math.cos(ang) * R * 0.5, Math.sin(ang) * R * 0.5], [Math.cos(ang + 0.2) * R * 0.85, Math.sin(ang + 0.2) * R * 0.85]], R * 0.045, [98, 64, 56]);
    }
    canopy(g, r, 0, 0, R * 0.9, [232, 150, 176], { lobes: 10, dots: 100, dotCol: [250, 214, 224] });
    for (let i = 0; i < 18; i++) {
      const ang = r() * 6.283;
      const d = R * (0.95 + r() * 0.2);
      g.fillStyle = 'rgba(250,206,220,.85)';
      g.beginPath();
      g.ellipse(Math.cos(ang) * d, Math.sin(ang) * d, 2.4, 1.6, r() * 3, 0, 7);
      g.fill();
    }
  },
});

const FRUITS: { label: string; leaf: RGB; fruit: RGB }[] = [
  { label: 'Appelsin', leaf: [62, 118, 54], fruit: [240, 150, 30] },
  { label: 'Citron', leaf: [72, 124, 56], fruit: [244, 224, 70] },
  { label: 'Blomme', leaf: [64, 108, 62], fruit: [110, 50, 120] },
  { label: 'Pære', leaf: [86, 130, 56], fruit: [186, 200, 80] },
];
const fruitTree = kind({
  key: 'flora_fruit_tree', family: FAM, name: 'Frugttræ med frugt', w: 3, h: 3, randomRotation: true, sizeJitter: 0.18, shadow: 26, bleed: 0.06,
  tags: ['farm', 'village', 'grassland'],
  params: [sel('fruit', 'Frugt', FRUITS.map((f, i) => [String(i), f.label]), '0'), { key: 'ripe', label: 'Frugtmængde', type: 'range', min: 0, max: 1, step: 0.1, default: 0.7 } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const f = FRUITS[idx(o, 'fruit', FRUITS.length)]!;
    canopy(g, r, 0, 0, R * 0.92, f.leaf, { lobes: 8, dots: 50 });
    const n = Math.round(param(o, 'ripe', 0.7) * 26);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * R * 0.78;
      dome(g, Math.cos(a) * d, Math.sin(a) * d, R * 0.05, R * 0.05, shift(f.fruit, (r() - 0.5) * 24), { lw: 0.8, hi: 50 });
    }
    // lille gren-nav i midten
    dome(g, 0, 0, R * 0.06, R * 0.06, [100, 70, 46], { lw: 0.8 });
  },
});

const FLOWERS: { label: string; petal: RGB; mid: RGB }[] = [
  { label: 'Rød', petal: [200, 44, 60], mid: [250, 200, 60] },
  { label: 'Gul', petal: [244, 200, 50], mid: [140, 80, 30] },
  { label: 'Lilla', petal: [150, 70, 190], mid: [250, 230, 110] },
  { label: 'Hvid', petal: [244, 238, 226], mid: [240, 190, 60] },
];
const giantFlower = kind({
  key: 'flora_giant_flower', family: FAM, name: 'Kæmpeblomst', w: 2.4, h: 2.4, randomRotation: true, sizeJitter: 0.2, shadow: 20, bleed: 0.05,
  tags: ['forest', 'magic', 'grassland'],
  params: [sel('tone', 'Blomst', FLOWERS.map((f, i) => [String(i), f.label]), '0')],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const f = FLOWERS[idx(o, 'tone', FLOWERS.length)]!;
    for (let i = 0; i < 6; i++) leaf(g, 0, 0, (i / 6) * 6.283 + 0.5, R * 1.0, R * 0.2, [66, 118, 54]);
    for (let ring = 0; ring < 2; ring++) {
      const n = 8 - ring * 0;
      const L = R * (0.98 - ring * 0.28);
      const off = ring * 0.4 + r() * 0.3;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * 6.283;
        g.save();
        g.rotate(a);
        g.beginPath();
        g.moveTo(R * 0.1, 0);
        g.bezierCurveTo(L * 0.4, -L * 0.34, L * 0.9, -L * 0.22, L, 0);
        g.bezierCurveTo(L * 0.9, L * 0.22, L * 0.4, L * 0.34, R * 0.1, 0);
        g.fillStyle = radial(g, L * 0.5, 0, L * 0.6, [[0, rgb(shift(f.petal, -30 + ring * 20))], [1, rgb(shift(f.petal, 18 + ring * 16))]], L * 0.1, 0, 1);
        g.fill();
        g.strokeStyle = 'rgba(30,10,10,.55)';
        g.lineWidth = 1;
        g.stroke();
        g.strokeStyle = 'rgba(30,10,10,.2)';
        g.beginPath();
        g.moveTo(R * 0.15, 0);
        g.lineTo(L * 0.85, 0);
        g.stroke();
        g.restore();
      }
    }
    dome(g, -1, -1, R * 0.26, R * 0.26, f.mid, { lw: 1.2 });
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.283;
      const d = r() * R * 0.2;
      g.fillStyle = rgb(shift(f.mid, -50 + r() * 30), 0.8);
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.9, 0, 7);
      g.fill();
    }
  },
});

const vines = kind({
  key: 'flora_vines', family: FAM, name: 'Ranker', w: 3, h: 3, randomRotation: true, sizeJitter: 0.25, shadow: 0, bleed: 0.05,
  tags: ['forest', 'swamp', 'ruin'],
  params: [{ key: 'flowers', label: 'Blomster', type: 'toggle', default: false } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const flowers = param(o, 'flowers', false);
    const strands: [number, number][][] = [];
    for (let s = 0; s < 6; s++) {
      let a = r() * 6.283;
      let x = (r() - 0.5) * R * 0.2;
      let y = (r() - 0.5) * R * 0.2;
      const pts: [number, number][] = [[x, y]];
      for (let k = 0; k < 9; k++) {
        a += (r() - 0.5) * 1.1;
        x += Math.cos(a) * R * 0.16;
        y += Math.sin(a) * R * 0.16;
        pts.push([x, y]);
      }
      strands.push(pts);
    }
    for (const pts of strands) {
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const [col, lw, dx] of [['rgba(20,14,6,.7)', 3, 0.6], ['rgb(84,100,46)', 1.7, 0]] as const) {
        g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p[0] + dx, p[1] + dx) : g.moveTo(p[0] + dx, p[1] + dx)));
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.stroke();
      }
      pts.forEach((p, i) => {
        if (i % 1 === 0) {
          const a = r() * 6.283;
          leaf(g, p[0], p[1], a, R * 0.15, R * 0.055, shift([74, 132, 56], (r() - 0.5) * 30), false);
          if (r() < 0.6) leaf(g, p[0], p[1], a + 2.6, R * 0.12, R * 0.045, shift([88, 144, 62], (r() - 0.5) * 30), false);
        }
        if (flowers && r() < 0.28) dome(g, p[0], p[1], 2.2, 2.2, [244, 200, 230], { lw: 0.7 });
      });
    }
  },
});

const saguaro = kind({
  key: 'flora_saguaro', family: FAM, name: 'Saguaro-kaktus', w: 2, h: 2, randomRotation: true, sizeJitter: 0.2, shadow: 20, bleed: 0.06,
  tags: ['desert'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const col: RGB = [82, 132, 78];
    // to arme: vandrette stykker, der ender i runde toppe, set oppefra som korte tykke rør
    const arms = 2 + Math.floor(r() * 2);
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * 6.283 + r() * 1.4;
      const len = R * (0.55 + r() * 0.3);
      const ex = Math.cos(a) * len;
      const ey = Math.sin(a) * len;
      limb(g, [[0, 0], [ex, ey]], R * 0.3, col);
      dome(g, ex, ey, R * 0.19, R * 0.19, shift(col, 8), { lw: 1.2 });
    }
    // stammen: ribbet rundt top
    dome(g, 0, 0, R * 0.42, R * 0.42, col, { lw: 1.6 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      g.strokeStyle = 'rgba(20,50,20,.5)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.08, Math.sin(a) * R * 0.08);
      g.lineTo(Math.cos(a) * R * 0.41, Math.sin(a) * R * 0.41);
      g.stroke();
      g.fillStyle = 'rgba(240,230,190,.8)';
      g.fillRect(Math.cos(a + 0.13) * R * 0.3 - 0.6, Math.sin(a + 0.13) * R * 0.3 - 0.6, 1.2, 1.2);
    }
    if (r() < 0.7) dome(g, 0, 0, R * 0.08, R * 0.08, [250, 240, 230], { lw: 0.7 });
  },
});

const barrel = kind({
  key: 'flora_barrel_cactus', family: FAM, name: 'Tøndekaktusser', w: 1.4, h: 1.4, randomRotation: true, sizeJitter: 0.25, shadow: 16, bleed: 0.06,
  tags: ['desert'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const items: [number, number, number][] = [[0.0, 0.0, 0.62], [0.55, 0.4, 0.34], [-0.5, 0.55, 0.3]];
    items.sort((a, b) => b[0] + b[1] - (a[0] + a[1]));
    for (const [x, y, s] of items) {
      const cx = x * R;
      const cy = y * R;
      const rad = s * R;
      dome(g, cx, cy, rad, rad, [90, 140, 82], { lw: 1.4 });
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283;
        g.strokeStyle = 'rgba(24,56,24,.55)';
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * rad * 0.2, cy + Math.sin(a) * rad * 0.2);
        g.lineTo(cx + Math.cos(a) * rad * 0.97, cy + Math.sin(a) * rad * 0.97);
        g.stroke();
        for (const t of [0.5, 0.8]) {
          g.fillStyle = 'rgba(250,236,190,.85)';
          g.fillRect(cx + Math.cos(a) * rad * t - 0.6, cy + Math.sin(a) * rad * t - 0.6, 1.3, 1.3);
        }
      }
      if (r() < 0.8) dome(g, cx, cy, rad * 0.2, rad * 0.2, [250, 200, 60], { lw: 0.6 });
    }
  },
});

const agave = kind({
  key: 'flora_agave', family: FAM, name: 'Agave', w: 2, h: 2, randomRotation: true, sizeJitter: 0.2, shadow: 18, bleed: 0.05,
  tags: ['desert'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    const rings: [number, number, RGB][] = [[14, 0.98, [84, 130, 108]], [11, 0.72, [96, 144, 118]], [8, 0.46, [112, 158, 128]]];
    for (const [n, L, col] of rings) {
      const off = r() * 6.283;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * 6.283;
        g.save();
        g.rotate(a);
        const len = R * L;
        g.beginPath();
        g.moveTo(R * 0.04, 0);
        g.quadraticCurveTo(len * 0.5, -R * 0.2, len, 0);
        g.quadraticCurveTo(len * 0.5, R * 0.2, R * 0.04, 0);
        g.fillStyle = rgb(shift(col, (r() - 0.5) * 18));
        g.fill();
        g.strokeStyle = 'rgba(16,36,28,.7)';
        g.lineWidth = 1.1;
        g.stroke();
        g.strokeStyle = 'rgba(220,240,220,.35)';
        g.beginPath();
        g.moveTo(len * 0.1, 0);
        g.lineTo(len * 0.9, 0);
        g.stroke();
        g.fillStyle = 'rgba(70,40,30,.9)';
        g.beginPath();
        g.arc(len, 0, 1.3, 0, 7);
        g.fill();
        g.restore();
      }
    }
    dome(g, 0, 0, R * 0.08, R * 0.08, [150, 190, 150], { lw: 0.6 });
  },
});

const kelp = kind({
  key: 'flora_kelp', family: FAM, name: 'Tangskov', w: 3, h: 3, randomRotation: true, sizeJitter: 0.25, shadow: 0, bleed: 0.08,
  tags: ['water', 'harbor'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = o.w / 2;
    for (let s = 0; s < 14; s++) {
      const a0 = r() * 6.283;
      const d0 = Math.sqrt(r()) * R * 0.5;
      let x = Math.cos(a0) * d0;
      let y = Math.sin(a0) * d0;
      let a = r() * 6.283;
      const pts: [number, number][] = [[x, y]];
      for (let k = 0; k < 6; k++) {
        a += (r() - 0.5) * 0.9;
        x += Math.cos(a) * R * 0.15;
        y += Math.sin(a) * R * 0.15;
        pts.push([x, y]);
      }
      const col: RGB = shift([70, 96, 40], (r() - 0.5) * 36);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const [c, lw, dx] of [['rgba(14,24,10,.45)', R * 0.1, 1], [rgb(col, 0.92), R * 0.075, 0], [rgb(shift(col, 36), 0.5), R * 0.028, -0.6]] as const) {
        g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p[0] + dx, p[1] + dx) : g.moveTo(p[0] + dx, p[1] + dx)));
        g.strokeStyle = c;
        g.lineWidth = c.startsWith('rgba(14') ? lwAt(lw) : lw;
        g.stroke();
      }
      // luftblærer
      for (let k = 1; k < pts.length; k += 2) dome(g, pts[k]![0] + 1.5, pts[k]![1] + 1.5, 1.6, 1.6, shift(col, 28), { lw: 0.5 });
    }
  },
});
const lwAt = (v: number): number => v + 1;

void blade; void ellBody; void mottle; void rr;
export const treeKinds: ObjectKind[] = [baobab, bamboo, palmCoconut, palmFan, mangrove, mushTree, charred, snowPine, birchAutumn, cherry, fruitTree, giantFlower, vines, saguaro, barrel, agave, kelp];
