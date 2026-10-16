import { kind, param, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { body, clipped, mottle, rectPath, ellipsePath, wobble, woodGrain, rivet, polyBody, rectBody, ellBody, tube, crack } from '../pack2/helpers';
import { blobPath, dome, limb, pebble, rgb, shift, lin, radial, polyPath, type G, type RGB, type Rnd } from './common';

/** Miner (pakke 8): indgange, skinner, minevogne, malmårer, støtter, skakter, værktøj og bunker. Alt set oppefra. */

const FAM = 'minex';
const WOOD: RGB = [120, 86, 52];
const ROCKC: RGB = [118, 110, 100];

const sel = (key: string, label: string, opts: [string, string][], def: string): ParamDef => ({ key, label, type: 'select', default: def, options: opts.map(([value, l]) => ({ value, label: l })) });

const ORES: { label: string; col: RGB; glint: RGB }[] = [
  { label: 'Jern', col: [150, 84, 56], glint: [220, 140, 100] },
  { label: 'Kobber', col: [76, 150, 120], glint: [210, 130, 70] },
  { label: 'Guld', col: [226, 184, 60], glint: [255, 240, 150] },
  { label: 'Sølv', col: [190, 196, 208], glint: [255, 255, 255] },
  { label: 'Kul', col: [38, 36, 40], glint: [120, 120, 134] },
  { label: 'Krystal', col: [110, 150, 230], glint: [220, 240, 255] },
];
const oreParam = (def: string): ParamDef => sel('ore', 'Malm', ORES.map((o, i) => [String(i), o.label]), def);
const oreOf = (o: { params: Record<string, unknown> }, def: number): typeof ORES[number] => ORES[Math.min(ORES.length - 1, Math.max(0, parseInt(String((o.params as Record<string, string>).ore ?? def), 10) || 0))]!;

function timberBeam(g: G, r: Rnd, x: number, y: number, w: number, h: number, col: RGB = WOOD): void {
  const p = rectPath(g, x, y, w, h, Math.min(w, h) * 0.15);
  body(g, p, shift(col, (r() - 0.5) * 20), [x, y, x + w, y + h], { lw: 1.4, ao: Math.min(w, h) * 0.12 });
  clipped(g, p, () => woodGrain(g, r, [x, y, x + w, y + h], col, { lines: Math.max(3, Math.round(Math.min(w, h) / 3)), rot: w < h ? Math.PI / 2 : 0, contrast: 0.9 }));
}

/** Sten-klump med malm-glimt. */
function oreChunk(g: G, r: Rnd, x: number, y: number, s: number, ore: typeof ORES[number]): void {
  if (ore.label === 'Krystal') {
    // krystaller: spidse sekskanter
    for (let i = 0; i < 3; i++) {
      const a = r() * 6.283;
      const px = x + Math.cos(a) * s * 0.3;
      const py = y + Math.sin(a) * s * 0.3;
      const rad = s * (0.5 + r() * 0.3);
      const rot = r() * 6.283;
      const pts: [number, number][] = [];
      for (let k = 0; k < 6; k++) pts.push([px + Math.cos(rot + (k / 6) * 6.283) * rad, py + Math.sin(rot + (k / 6) * 6.283) * rad * (k % 2 ? 0.6 : 1)]);
      polyBody(g, pts, shift(ore.col, (r() - 0.5) * 30), { lw: 1, ao: 1, light: 50 });
    }
    return;
  }
  pebble(g, r, x, y, s, shift(ore.col, (r() - 0.5) * 22));
  for (let i = 0; i < 3; i++) {
    g.fillStyle = rgb(ore.glint, 0.7);
    g.fillRect(x + (r() - 0.5) * s, y + (r() - 0.5) * s * 0.8, 1.6, 1.2);
  }
}

// ------------------------------------------------------------------ skinner

function sleeper(g: G, r: Rnd, x: number, y: number, len: number, th: number, ang: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  rectBody(g, -th / 2, -len / 2, th, len, 1, shift(WOOD, (r() - 0.5) * 24), { lw: 1, ao: 1 });
  g.restore();
}

function railLine(g: G, pts: [number, number][], lw: number): void {
  const trace = (): void => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  };
  g.lineJoin = 'round';
  g.lineCap = 'butt';
  trace();
  g.strokeStyle = 'rgba(10,6,2,.7)';
  g.lineWidth = lw + 1.8;
  g.stroke();
  trace();
  g.strokeStyle = 'rgb(104,106,116)';
  g.lineWidth = lw;
  g.stroke();
  g.save();
  g.translate(-0.5, -0.5);
  trace();
  g.strokeStyle = 'rgba(230,232,240,.7)';
  g.lineWidth = Math.max(0.6, lw * 0.35);
  g.stroke();
  g.restore();
}

function arcPts(cx: number, cy: number, rad: number, a0: number, a1: number, n = 14): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return out;
}

function gravel(g: G, r: Rnd, x: number, y: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '90,84,76' : '150,142,128'},${0.25 + r() * 0.3})`;
    g.fillRect(x + r() * w, y + r() * h, 1.4 + r() * 1.6, 1 + r());
  }
}

type RailForm = 'straight' | 'curve' | 'cross' | 'switch' | 'end' | 'broken';
function rails(g: G, w: number, h: number, seed: number, form: RailForm): void {
  const r = rng(seed);
  const gauge = Math.min(w, h) * (form === 'straight' || form === 'end' || form === 'broken' ? 0.3 : 0.2);
  const sl = gauge * 2.3;
  const lw = 2.2;
  const x0 = -w / 2;
  if (form === 'straight' || form === 'end' || form === 'broken') {
    gravel(g, r, x0, -sl / 2, w, sl, Math.round(w / 2));
    const n = Math.round(w / 11);
    for (let i = 0; i < n; i++) {
      if (form === 'broken' && i > n * 0.4 && i < n * 0.55) continue;
      sleeper(g, r, x0 + ((i + 0.5) / n) * w, (r() - 0.5) * 1.2, sl, 4.4, (r() - 0.5) * 0.06);
    }
    for (const s of [-1, 1]) {
      const pts: [number, number][] = form === 'broken' && s > 0
        ? [[x0, s * gauge / 2], [x0 + w * 0.42, s * gauge / 2]]
        : [[x0, s * gauge / 2], [x0 + w * (form === 'end' ? 0.9 : 1), s * gauge / 2]];
      railLine(g, pts, lw);
      if (form === 'broken' && s > 0) railLine(g, [[x0 + w * 0.6, s * gauge / 2 + 3], [x0 + w * 0.8, s * gauge / 2 - 1], [x0 + w, s * gauge / 2]], lw);
    }
    if (form === 'end') timberBeam(g, r, x0 + w * 0.9, -sl * 0.55, w * 0.07, sl * 1.1, [100, 70, 44]);
    return;
  }
  if (form === 'curve') {
    const R0 = Math.min(w, h) * 0.72;
    const cx = x0 + 0;
    const cy = -h / 2 + R0 * 0 + h; // centrum nederst til venstre
    const base = -h / 2;
    void base;
    const ccx = x0;
    const ccy = h / 2;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / n) * (Math.PI / 2);
      const rad = R0 * 1.3;
      sleeper(g, r, ccx + Math.cos(a) * rad, ccy + Math.sin(a) * rad, sl, 4.4, a);
    }
    for (const s of [-1, 1]) railLine(g, arcPts(ccx, ccy, R0 * 1.3 + (s * gauge) / 2, -Math.PI / 2, 0), lw);
    void cx; void cy;
    return;
  }
  // kryds og sporskifte
  const arms = form === 'cross' ? [0, Math.PI / 2] : [0];
  for (const a of arms) {
    g.save();
    g.rotate(a);
    const L = a ? h : w;
    const n = Math.round(L / 11);
    for (let i = 0; i < n; i++) sleeper(g, r, -L / 2 + ((i + 0.5) / n) * L, 0, sl, 4.4, 0);
    for (const s of [-1, 1]) railLine(g, [[-L / 2, s * gauge / 2], [L / 2, s * gauge / 2]], lw);
    g.restore();
  }
  if (form === 'switch') {
    const R1 = h * 0.9;
    // afgreningen drejer ud mod nederst til højre
    const pts = (off: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        out.push([-w * 0.1 + t * w * 0.6, off + t * t * h * 0.42]);
      }
      return out;
    };
    for (const s of [-1, 1]) railLine(g, pts((s * gauge) / 2), lw);
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5;
      sleeper(g, r, -w * 0.1 + t * w * 0.6, t * t * h * 0.42, sl, 4, Math.atan2(h * 0.84 * t, w * 0.6) * 0.25);
    }
  }
  // sporkryds: skær hjørnerne med bolt
  if (form === 'cross') rivet(g, 0, 0, 2.4, [150, 150, 160]);
}

const railKind = (key: string, name: string, w: number, h: number, form: RailForm): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: 2, bleed: 0.03, tags: ['dungeon', 'cave', 'mountain'], draw: (g, o) => rails(g, o.w, o.h, o.seed, form) });

// ------------------------------------------------------------------ minevogne

function cart(g: G, w: number, h: number, seed: number, fill: 'empty' | 'ore' | 'tipped' | 'wreck', ore: typeof ORES[number]): void {
  const r = rng(seed);
  const iron: RGB = [86, 88, 98];
  const cw = w * 0.86;
  const ch = h * 0.7;
  const x0 = -cw / 2;
  const y0 = -ch / 2;
  // hjul stikker ud under kassen
  for (const sx of [-0.3, 0.3]) for (const sy of [-1, 1]) {
    rectBody(g, sx * cw - 4.5, sy * (ch / 2 + 1.5) - 2.2, 9, 4.4, 1.4, [56, 56, 64], { lw: 1, ao: 0.6 });
  }
  if (fill === 'tipped') {
    g.save();
    g.rotate(-0.5);
  }
  if (fill === 'wreck') g.rotate(0.25);
  const p = rectPath(g, x0, y0, cw, ch, 4);
  body(g, p, iron, [x0, y0, x0 + cw, y0 + ch], { lw: 1.8, ao: 3 });
  // indersiden er mørk og dyb, lys fra venstre falder på bagvæggen
  const inset = ch * 0.14;
  const ip = rectPath(g, x0 + inset, y0 + inset, cw - inset * 2, ch - inset * 2, 3);
  ip();
  g.fillStyle = lin(g, x0, y0, x0 + cw, y0 + ch, [[0, 'rgb(50,40,32)'], [1, 'rgb(22,16,12)']]);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.7)';
  g.lineWidth = 1.2;
  g.stroke();
  clipped(g, ip, () => {
    if (fill === 'ore' || fill === 'tipped') {
      for (let i = 0; i < 24; i++) oreChunk(g, r, x0 + inset + r() * (cw - inset * 2), y0 + inset + r() * (ch - inset * 2), 4 + r() * 5, ore);
    } else if (fill === 'wreck') {
      mottle(g, r, [x0, y0, x0 + cw, y0 + ch], [70, 50, 34], 14, 6, 12, 0.5);
    }
  });
  // nitter og kantliste
  for (let i = 0; i < 8; i++) rivet(g, x0 + 4 + (i / 7) * (cw - 8), y0 + 2.5, 1.1, [150, 152, 160]);
  for (let i = 0; i < 8; i++) rivet(g, x0 + 4 + (i / 7) * (cw - 8), y0 + ch - 2.5, 1.1, [150, 152, 160]);
  // kobling i enderne
  for (const s of [-1, 1]) {
    g.strokeStyle = 'rgba(20,20,24,.9)';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(s * cw / 2, 0);
    g.lineTo(s * (cw / 2 + 5), 0);
    g.stroke();
    dome(g, s * (cw / 2 + 6), 0, 2.4, 2.4, [110, 112, 122], { lw: 0.8 });
  }
  if (fill === 'tipped') g.restore();
  if (fill === 'tipped') {
    // spildt malm foran vognen
    for (let i = 0; i < 16; i++) oreChunk(g, r, cw * 0.1 + r() * cw * 0.5, ch * 0.45 + r() * ch * 0.6, 3 + r() * 4, ore);
  }
}
const cartKind = (key: string, name: string, w: number, h: number, fill: 'empty' | 'ore' | 'tipped' | 'wreck', hasOre: boolean, tags: string[]): ObjectKind =>
  kind({
    key, family: FAM, name, w, h, shadow: 10, bleed: 0.06, tags,
    params: hasOre ? [oreParam('0')] : [],
    draw: (g, o) => cart(g, o.w, o.h, o.seed, fill, oreOf(o, 0)),
  });

// ------------------------------------------------------------------ malmårer i klippe

function vein(g: G, w: number, h: number, seed: number, ore: typeof ORES[number]): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  const slab = blobPath(g, wobble(r, 0, 0, w * 0.48, h * 0.46, 13, 0.1));
  body(g, slab, ROCKC, [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.8, ao: 4 });
  clipped(g, slab, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], ROCKC, 80, R * 0.12, 26, 0.45);
    // sprækker i klippen
    for (let i = 0; i < 5; i++) crack(g, r, (r() - 0.5) * w * 0.8, (r() - 0.5) * h * 0.8, R * 0.5, r() * 6.283, 1);
    // årer: bugtede bånd af malm med glimt
    const veins = 2 + Math.floor(r() * 2);
    for (let v = 0; v < veins; v++) {
      const pts: [number, number][] = [];
      let a = r() * 6.283;
      let x = -Math.cos(a) * R * 0.9;
      let y = -Math.sin(a) * R * 0.9;
      for (let k = 0; k < 9; k++) {
        a += (r() - 0.5) * 0.9;
        x += Math.cos(a) * R * 0.22;
        y += Math.sin(a) * R * 0.22;
        pts.push([x, y]);
      }
      for (const [c, lw, d] of [['rgba(10,6,2,.55)', R * 0.12, 1], [rgb(ore.col), R * 0.09, 0], [rgb(ore.glint, 0.7), R * 0.03, -0.6]] as const) {
        g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p[0] + d, p[1] + d) : g.moveTo(p[0] + d, p[1] + d)));
        g.strokeStyle = c;
        g.lineWidth = lw;
        g.lineJoin = 'round';
        g.stroke();
      }
    }
    for (let i = 0; i < 12; i++) {
      const x = (r() - 0.5) * w * 0.8;
      const y = (r() - 0.5) * h * 0.8;
      if (ore.label === 'Krystal') {
        const rad = 3 + r() * 5;
        const rot = r() * 6.283;
        const pts: [number, number][] = [];
        for (let k = 0; k < 4; k++) pts.push([x + Math.cos(rot + (k / 4) * 6.283) * rad * (k % 2 ? 0.5 : 1), y + Math.sin(rot + (k / 4) * 6.283) * rad * (k % 2 ? 0.5 : 1)]);
        polyBody(g, pts, shift(ore.col, (r() - 0.5) * 30), { lw: 0.8, ao: 0.6, light: 50 });
      } else {
        g.fillStyle = rgb(ore.col, 0.9);
        g.beginPath();
        g.ellipse(x, y, 2 + r() * 3, 1.5 + r() * 2.5, r() * 3, 0, 7);
        g.fill();
        g.fillStyle = rgb(ore.glint, 0.8);
        g.fillRect(x - 1.4, y - 1.4, 1.5, 1.2);
      }
    }
  });
}
const veinKind = (key: string, name: string, oreIdx: number): ObjectKind =>
  kind({ key, family: FAM, name, w: 2, h: 1.8, shadow: 12, bleed: 0.04, randomRotation: true, sizeJitter: 0.15, tags: ['cave', 'mountain', 'dungeon'], draw: (g, o) => vein(g, o.w, o.h, o.seed, ORES[oreIdx]!) });

// ------------------------------------------------------------------ indgange

type Entry = 'timber' | 'stone' | 'collapsed' | 'cave';
function entrance(g: G, w: number, h: number, seed: number, form: Entry): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  // bjerget set oppefra: en klippemasse, der fylder hele feltet, åbningen mod syd (nederst)
  const rock = blobPath(g, [[x0 + 8, y0 + 26], [x0 + w * 0.2, y0 + 4], [x0 + w * 0.5, y0 - 2], [x0 + w * 0.8, y0 + 5], [x0 + w - 6, y0 + 28], [x0 + w - 2, y0 + h * 0.7], [x0 + w - 14, y0 + h - 6], [x0 + w * 0.5, y0 + h - 2], [x0 + 14, y0 + h - 6], [x0 + 2, y0 + h * 0.6]]);
  body(g, rock, ROCKC, [x0, y0, x0 + w, y0 + h], { lw: 2, ao: 6 });
  clipped(g, rock, () => {
    mottle(g, r, [x0, y0, x0 + w, y0 + h], ROCKC, 120, w * 0.04, 30, 0.45);
    for (let i = 0; i < 7; i++) crack(g, r, x0 + r() * w, y0 + r() * h * 0.6, w * 0.15, r() * 6.283, 1.2);
    for (let i = 0; i < 12; i++) pebble(g, r, x0 + r() * w, y0 + r() * h * 0.55, w * (0.025 + r() * 0.03), shift(ROCKC, (r() - 0.5) * 30));
    g.fillStyle = 'rgba(96,126,64,.25)';
    g.fillRect(x0, y0, w, h * 0.2);
  });
  // vejen/rampen ind: sti i stenet fra bunden og op til åbningen
  const ow = w * (form === 'cave' ? 0.34 : 0.3);
  const ox = -ow / 2;
  const oy = y0 + h * 0.34;
  const oh = h * 0.66;
  const path = (): void => {
    g.beginPath();
    if (form === 'cave') {
      g.moveTo(ox - 6, y0 + h);
      g.lineTo(ox, oy + oh * 0.6);
      g.quadraticCurveTo(ox - 2, oy + 6, ox + ow * 0.5, oy);
      g.quadraticCurveTo(ox + ow + 2, oy + 6, ox + ow, oy + oh * 0.6);
      g.lineTo(ox + ow + 6, y0 + h);
    } else {
      g.rect(ox, oy, ow, oh + 4);
    }
    g.closePath();
  };
  path();
  g.fillStyle = 'rgb(14,10,8)';
  g.fill();
  clipped(g, path, () => {
    // gulvet er lyst nederst og forsvinder ind i mørket opad
    g.fillStyle = lin(g, 0, y0 + h, 0, oy, [[0, 'rgb(122,108,88)'], [0.4, 'rgb(86,72,56)'], [0.8, 'rgb(14,10,8)'], [1, 'rgb(6,4,3)']]);
    g.fillRect(ox - 8, oy, ow + 16, oh + 8);
    mottle(g, r, [ox, oy + oh * 0.4, ox + ow, oy + oh], [110, 96, 78], 20, 3, 20, 0.4);
    // skygge fra væggen til venstre
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(ox, oy, ow * 0.18, oh);
    // skinner ind
    for (const s of [-1, 1]) {
      g.strokeStyle = 'rgba(120,122,134,.85)';
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(s * ow * 0.2, oy + oh);
      g.lineTo(s * ow * 0.2, oy + oh * 0.3);
      g.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const yy = oy + oh * 0.3 + (i / 8) * oh * 0.7;
      g.fillStyle = `rgba(110,80,50,${0.2 + (i / 8) * 0.6})`;
      g.fillRect(-ow * 0.3, yy, ow * 0.6, 3);
    }
  });
  g.strokeStyle = 'rgba(8,4,0,.9)';
  g.lineWidth = 1.8;
  path();
  g.stroke();
  const jam = ow * 0.12;
  if (form === 'timber') {
    // to rammestolper og overliggeren set ovenfra (tykke bjælker) og tagbjælker, der stikker ind i klippen
    for (const sx of [ox - jam, ox + ow]) timberBeam(g, r, sx, oy - 4, jam, oh * 0.5, [112, 80, 48]);
    timberBeam(g, r, ox - jam - 6, oy - 10, ow + jam * 2 + 12, jam * 1.1, [128, 92, 56]);
    for (let i = 0; i < 4; i++) timberBeam(g, r, ox - jam - 4 + i * (ow / 3 + 2), oy - 26, jam * 0.9, 20, [104, 74, 44]);
  } else if (form === 'stone') {
    const lint = rectPath(g, ox - jam * 2, oy - 14, ow + jam * 4, 16, 2);
    body(g, lint, [150, 144, 130], [ox - jam * 2, oy - 14, ox + ow + jam * 2, oy + 2], { lw: 1.6, ao: 2 });
    for (const sx of [ox - jam * 2, ox + ow]) {
      const p = rectPath(g, sx, oy, jam * 2, oh * 0.5, 2);
      body(g, p, [138, 132, 120], [sx, oy, sx + jam * 2, oy + oh * 0.5], { lw: 1.4, ao: 2 });
    }
  } else if (form === 'collapsed') {
    for (let i = 0; i < 18; i++) pebble(g, r, ox + r() * ow, oy + r() * oh * 0.7 + 4, w * (0.035 + r() * 0.035), shift(ROCKC, (r() - 0.5) * 40));
    timberBeam(g, r, ox - jam - 2, oy + oh * 0.1, jam, oh * 0.4, [112, 80, 48]);
    g.save();
    g.translate(ox + ow * 0.4, oy + oh * 0.3);
    g.rotate(0.9);
    timberBeam(g, r, -ow * 0.3, -4, ow * 0.7, 8, [128, 92, 56]);
    g.restore();
  } else {
    for (const sx of [ox - 5, ox + ow]) timberBeam(g, r, sx, oy + oh * 0.2, 5, oh * 0.25, [112, 80, 48]);
  }
  // lanterne og malm foran
  for (let i = 0; i < 5; i++) oreChunk(g, r, x0 + w * 0.15 + r() * w * 0.12, y0 + h * (0.6 + r() * 0.3), 5 + r() * 3, ORES[r() < 0.5 ? 0 : 4]!);
}
const entranceKind = (key: string, name: string, form: Entry): ObjectKind =>
  kind({ key, family: FAM, name, w: 5, h: 4, shadow: 16, bleed: 0.03, tags: ['mountain', 'cave', 'dungeon'], draw: (g, o) => entrance(g, o.w, o.h, o.seed, form) });

// ------------------------------------------------------------------ skakter

type Shaft = 'open' | 'boarded' | 'winch' | 'headframe';
function shaft(g: G, w: number, h: number, seed: number, form: Shaft): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  const half = R * 0.55;
  // omkringliggende jord og sten
  const apron = blobPath(g, wobble(r, 0, 0, R * 0.97, R * 0.97, 12, 0.07));
  body(g, apron, [112, 98, 78], [-R, -R, R, R], { lw: 1.4, ao: 3 });
  clipped(g, apron, () => {
    mottle(g, r, [-R, -R, R, R], [112, 98, 78], 50, R * 0.06, 24, 0.4);
    for (let i = 0; i < 8; i++) pebble(g, r, (r() - 0.5) * R * 1.7, (r() - 0.5) * R * 1.7, R * (0.04 + r() * 0.04), ROCKC);
  });
  // hullet
  const hole = rectPath(g, -half, -half, half * 2, half * 2, 3);
  hole();
  g.fillStyle = 'rgb(8,6,4)';
  g.fill();
  clipped(g, hole, () => {
    g.fillStyle = radial(g, 0, 0, half * 1.4, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(60,46,34,.9)']]);
    g.fillRect(-half, -half, half * 2, half * 2);
    // bjælkevægge, der forsvinder nedad
    for (let i = 1; i < 6; i++) {
      g.strokeStyle = `rgba(100,70,40,${0.55 - i * 0.09})`;
      g.lineWidth = 2;
      g.strokeRect(-half + i * 3, -half + i * 3, (half - i * 3) * 2, (half - i * 3) * 2);
    }
    g.fillStyle = 'rgba(0,0,0,.5)';
    g.fillRect(-half, -half, half * 2, half * 0.3);
  });
  // karm af tømmer
  const fw = R * 0.12;
  timberBeam(g, r, -half - fw, -half - fw, half * 2 + fw * 2, fw, [120, 86, 52]);
  timberBeam(g, r, -half - fw, half, half * 2 + fw * 2, fw, [112, 80, 48]);
  timberBeam(g, r, -half - fw, -half, fw, half * 2, [124, 90, 54]);
  timberBeam(g, r, half, -half, fw, half * 2, [108, 76, 46]);
  if (form === 'open') {
    // stige ned i skakten fra den ene side
    for (const sx of [-half * 0.7, -half * 0.3]) {
      g.strokeStyle = 'rgb(112,80,48)';
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(sx, -half * 0.2);
      g.lineTo(sx, half);
      g.stroke();
    }
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = 'rgb(128,94,56)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-half * 0.7, half * (-0.1 + i * 0.28));
      g.lineTo(-half * 0.3, half * (-0.1 + i * 0.28));
      g.stroke();
    }
  } else if (form === 'boarded') {
    const n = 5;
    for (let i = 0; i < n; i++) {
      g.save();
      g.translate(0, -half + (i + 0.5) * (half * 2 / n));
      g.rotate((r() - 0.5) * 0.12);
      timberBeam(g, r, -half * 1.35, -half / n * 0.45, half * 2.7, half / n * 0.9, shift([128, 92, 58], (r() - 0.5) * 20));
      g.restore();
    }
    for (const sx of [-half * 0.7, half * 0.7]) rivet(g, sx, 0, 2.2, [110, 106, 100]);
  } else if (form === 'winch') {
    // vinde: bjælke på to bukke, krumtap og spand og reb ned i hullet
    for (const sx of [-half * 1.25, half * 1.25]) timberBeam(g, r, sx - 4, -half * 0.5, 8, half, [108, 76, 46]);
    tube(g, () => { g.beginPath(); g.moveTo(-half * 1.4, 0); g.lineTo(half * 1.4, 0); }, 8, [132, 96, 58]);
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(30,20,10,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-half * 0.5 + i * 4, -4); g.lineTo(-half * 0.5 + i * 4 + 3, 4); g.stroke(); }
    tube(g, () => { g.beginPath(); g.moveTo(half * 1.4, 0); g.lineTo(half * 1.7, -half * 0.5); }, 3, [100, 100, 108]);
    dome(g, half * 1.7, -half * 0.5, 4, 4, [140, 140, 150], { lw: 1 });
    g.strokeStyle = 'rgb(176,144,88)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(half * 0.2, half * 0.5);
    g.stroke();
    dome(g, half * 0.2, half * 0.55, 6, 6, [96, 70, 44], { lw: 1.2 });
    dome(g, half * 0.2, half * 0.55, 3.6, 3.6, [24, 16, 12], { lw: 0 });
  } else {
    // tårn: to A-stativer set oppefra som krydsende bjælker, hjul i toppen
    for (const s of [-1, 1]) {
      g.save();
      g.rotate(s * 0.0);
      timberBeam(g, r, -half * 1.6, s * half * 1.05 - 4, half * 3.2, 8, [116, 84, 50]);
      g.restore();
    }
    timberBeam(g, r, -4, -half * 1.2, 8, half * 2.4, [124, 90, 54]);
    for (const s of [-1, 1]) {
      limb(g, [[-half * 1.4, s * half * 1.05], [-half * 0.5, 0]], 5, [108, 76, 46]);
      limb(g, [[half * 1.4, s * half * 1.05], [half * 0.5, 0]], 5, [108, 76, 46]);
    }
    // hjulet
    dome(g, 0, 0, half * 0.55, half * 0.55, [86, 88, 98], { lw: 1.6, hi: 20 });
    dome(g, 0, 0, half * 0.38, half * 0.38, [60, 62, 72], { lw: 1 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283;
      g.strokeStyle = 'rgba(150,152,162,.85)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(Math.cos(a) * half * 0.1, Math.sin(a) * half * 0.1);
      g.lineTo(Math.cos(a) * half * 0.52, Math.sin(a) * half * 0.52);
      g.stroke();
    }
    dome(g, 0, 0, half * 0.1, half * 0.1, [190, 190, 200], { lw: 0.8 });
  }
}
const shaftKind = (key: string, name: string, form: Shaft, size: number): ObjectKind =>
  kind({ key, family: FAM, name, w: size, h: size, shadow: 10, bleed: 0.05, randomRotation: true, tags: ['mountain', 'cave', 'dungeon', 'ruin'], draw: (g, o) => shaft(g, o.w, o.h, o.seed, form) });

// ------------------------------------------------------------------ støtter, værktøj, bunker

function supports(g: G, w: number, h: number, seed: number, form: 'pair' | 'row' | 'crib' | 'pile'): void {
  const r = rng(seed);
  if (form === 'crib') {
    // krydsstablet tømmer ("brandstabel") set oppefra
    const n = 4;
    const s = Math.min(w, h) * 0.86;
    for (let i = 0; i < n; i++) {
      const o = (i / (n - 1) - 0.5) * s * 0.7;
      timberBeam(g, r, -s / 2, o - 5, s, 10, shift([120, 86, 52], (r() - 0.5) * 20));
    }
    for (let i = 0; i < n; i++) {
      const o = (i / (n - 1) - 0.5) * s * 0.7;
      timberBeam(g, r, o - 5, -s / 2 + 3, 10, s - 6, shift([112, 80, 48], (r() - 0.5) * 20));
    }
    return;
  }
  if (form === 'pile') {
    for (let i = 0; i < 9; i++) {
      g.save();
      g.translate((r() - 0.5) * w * 0.4, (r() - 0.5) * h * 0.6);
      g.rotate((r() - 0.5) * 0.5);
      timberBeam(g, r, -w * 0.4, -4, w * 0.8, 8, shift([124, 90, 56], (r() - 0.5) * 24));
      g.restore();
    }
    return;
  }
  const n = form === 'pair' ? 2 : 4;
  // overliggere på tværs af skinnerne og stolper som firkantede hoveder
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (w * (form === 'pair' ? 0.5 : 0.24));
    timberBeam(g, r, x - 5, -h * 0.46, 10, h * 0.92, shift([120, 86, 52], (r() - 0.5) * 20));
    for (const s of [-1, 1]) {
      rectBody(g, x - 6, s * h * 0.34 - 6, 12, 12, 1.5, [100, 72, 44], { lw: 1.4, ao: 1.4 });
      g.strokeStyle = 'rgba(30,18,8,.6)';
      g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x - 4, s * h * 0.34 - 4); g.lineTo(x + 4, s * h * 0.34 + 4); g.moveTo(x + 4, s * h * 0.34 - 4); g.lineTo(x - 4, s * h * 0.34 + 4); g.stroke();
    }
  }
  if (form === 'row') {
    for (const s of [-1, 1]) timberBeam(g, r, -w * 0.46, s * h * 0.34 - 2.5, w * 0.92, 5, [132, 98, 60]);
  }
}
const supportKind = (key: string, name: string, w: number, h: number, form: 'pair' | 'row' | 'crib' | 'pile'): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: 8, bleed: 0.04, tags: ['dungeon', 'cave', 'mountain'], draw: (g, o) => supports(g, o.w, o.h, o.seed, form) });

function tools(g: G, w: number, h: number, seed: number, form: 'picks' | 'lantern' | 'barrow' | 'sack'): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  const handle = (x0: number, y0: number, x1: number, y1: number): void => limb(g, [[x0, y0], [x1, y1]], R * 0.09, [140, 104, 64]);
  if (form === 'picks') {
    // hakke
    g.save();
    g.rotate(-0.5);
    handle(-R * 0.8, 0, R * 0.8, 0);
    const head = polyPath(g, [[R * 0.55, -R * 0.4], [R * 0.7, -R * 0.12], [R * 0.7, R * 0.12], [R * 0.55, R * 0.4], [R * 0.5, R * 0.1], [R * 0.5, -R * 0.1]]);
    body(g, head, [100, 102, 114], [R * 0.5, -R * 0.4, R * 0.7, R * 0.4], { lw: 1.2, ao: 1 });
    g.restore();
    // skovl
    g.save();
    g.translate(R * 0.1, R * 0.5);
    g.rotate(0.15);
    handle(-R * 0.9, 0, R * 0.4, 0);
    const bl = polyPath(g, [[R * 0.35, -R * 0.28], [R * 0.95, -R * 0.2], [R * 1.0, 0], [R * 0.95, R * 0.2], [R * 0.35, R * 0.28]]);
    body(g, bl, [112, 114, 124], [R * 0.35, -R * 0.28, R * 1.0, R * 0.28], { lw: 1.2, ao: 1.4 });
    g.restore();
    return;
  }
  if (form === 'lantern') {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
    gr.addColorStop(0, 'rgba(255,214,120,.55)');
    gr.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
    rectBody(g, -R * 0.2, -R * 0.2, R * 0.4, R * 0.4, 2, [70, 58, 46], { lw: 1.2, ao: 1 });
    dome(g, 0, 0, R * 0.12, R * 0.12, [255, 230, 140], { lw: 0, hi: 20 });
    g.strokeStyle = 'rgba(30,20,10,.9)';
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(0, -R * 0.2, R * 0.12, Math.PI, 0); g.stroke();
    return;
  }
  if (form === 'barrow') {
    // trillebør: kasse, to håndtag og hjul foran
    const bx = -R * 0.3;
    handle(bx - R * 0.8, -R * 0.2, bx, -R * 0.2);
    handle(bx - R * 0.8, R * 0.2, bx, R * 0.2);
    const tub = polyPath(g, [[bx - R * 0.1, -R * 0.45], [R * 0.7, -R * 0.35], [R * 0.7, R * 0.35], [bx - R * 0.1, R * 0.45]]);
    body(g, tub, [92, 94, 104], [bx - R * 0.1, -R * 0.45, R * 0.7, R * 0.45], { lw: 1.5, ao: 2.4 });
    clipped(g, tub, () => { for (let i = 0; i < 10; i++) oreChunk(g, r, bx + R * (0.1 + r() * 0.6), (r() - 0.5) * R * 0.6, 3 + r() * 3, ORES[0]!); });
    rectBody(g, R * 0.72, -4, 9, 8, 2, [40, 40, 46], { lw: 1, ao: 0.6 });
    return;
  }
  // sæk med malm
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * R * 0.5;
    const y = (r() - 0.5) * R * 0.5;
    const p = blobPath(g, wobble(r, x, y, R * 0.3, R * 0.4, 8, 0.12));
    body(g, p, [176, 150, 108], [x - R * 0.3, y - R * 0.4, x + R * 0.3, y + R * 0.4], { lw: 1.3, ao: 1.8 });
    g.strokeStyle = 'rgba(70,50,30,.7)';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x - R * 0.12, y - R * 0.38); g.lineTo(x + R * 0.12, y - R * 0.3); g.stroke();
  }
}
const toolKind = (key: string, name: string, w: number, h: number, form: 'picks' | 'lantern' | 'barrow' | 'sack', tags: string[] = ['dungeon', 'cave', 'mountain']): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: form === 'lantern' ? 0 : 8, bleed: 0.06, randomRotation: true, tags, draw: (g, o) => tools(g, o.w, o.h, o.seed, form) });

function pile(g: G, w: number, h: number, seed: number, ore: typeof ORES[number], slag: boolean): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  const base = blobPath(g, wobble(r, 0, 0, R * 0.92, R * 0.84, 11, 0.12));
  body(g, base, slag ? [58, 54, 52] : shift(ore.col, -34), [-R, -R, R, R], { lw: 1.4, ao: 4, dark: 40 });
  const list: [number, number, number][] = [];
  for (let i = 0; i < 36; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * R * 0.78;
    list.push([Math.cos(a) * d, Math.sin(a) * d * 0.9, R * (0.1 + r() * 0.12)]);
  }
  list.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  for (const [x, y, s] of list) {
    if (slag) {
      pebble(g, r, x, y, s, shift([64, 58, 56], (r() - 0.5) * 36));
      if (r() < 0.14) {
        g.fillStyle = 'rgba(255,120,40,.55)';
        g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill();
      }
    } else oreChunk(g, r, x, y, s, ore);
  }
}

export const mineKinds: ObjectKind[] = [
  entranceKind('minex_entrance_timber', 'Mineindgang med tømmerramme', 'timber'),
  entranceKind('minex_entrance_stone', 'Mineindgang med stenportal', 'stone'),
  entranceKind('minex_entrance_collapsed', 'Sammenstyrtet mineindgang', 'collapsed'),
  entranceKind('minex_entrance_cave', 'Grotteindgang med støtter', 'cave'),
  shaftKind('minex_shaft_open', 'Mineskakt med stige', 'open', 2.4),
  shaftKind('minex_shaft_boarded', 'Tilplanket mineskakt', 'boarded', 2.4),
  shaftKind('minex_shaft_winch', 'Mineskakt med vinde', 'winch', 3),
  shaftKind('minex_shaft_headframe', 'Skakt med hejseværk', 'headframe', 3.4),
  railKind('minex_rail_straight', 'Skinner, lige', 3, 0.9, 'straight'),
  railKind('minex_rail_curve', 'Skinner, kurve', 2.4, 2.4, 'curve'),
  railKind('minex_rail_cross', 'Skinner, kryds', 2.4, 2.4, 'cross'),
  railKind('minex_rail_switch', 'Skinner, sporskifte', 3, 2, 'switch'),
  railKind('minex_rail_end', 'Skinner, endestop', 3, 0.9, 'end'),
  railKind('minex_rail_broken', 'Skinner, brudt', 3, 0.9, 'broken'),
  cartKind('minex_cart_empty', 'Minevogn, tom', 1.6, 1.1, 'empty', false, ['dungeon', 'cave', 'mountain']),
  cartKind('minex_cart_ore', 'Minevogn, fyldt med malm', 1.6, 1.1, 'ore', true, ['dungeon', 'cave', 'mountain']),
  cartKind('minex_cart_tipped', 'Væltet minevogn', 1.8, 1.4, 'tipped', true, ['dungeon', 'cave', 'ruin']),
  cartKind('minex_cart_wreck', 'Smadret minevogn', 1.6, 1.1, 'wreck', false, ['dungeon', 'cave', 'ruin']),
  veinKind('minex_vein_iron', 'Jernåre i klippen', 0),
  veinKind('minex_vein_copper', 'Kobberåre i klippen', 1),
  veinKind('minex_vein_gold', 'Guldåre i klippen', 2),
  veinKind('minex_vein_silver', 'Sølvåre i klippen', 3),
  veinKind('minex_vein_coal', 'Kulflø i klippen', 4),
  veinKind('minex_vein_crystal', 'Krystalåre i klippen', 5),
  supportKind('minex_support_pair', 'Minestøtter, ramme', 2, 1.6, 'pair'),
  supportKind('minex_support_row', 'Minestøtter, række', 3, 1.6, 'row'),
  supportKind('minex_support_crib', 'Tømmerstabel, støtte', 1.2, 1.2, 'crib'),
  supportKind('minex_timber_pile', 'Bunke tømmer', 1.8, 1.2, 'pile'),
  toolKind('minex_tools_picks', 'Hakke og skovl', 1.6, 1.6, 'picks'),
  toolKind('minex_lantern', 'Minelanterne', 1, 1, 'lantern'),
  toolKind('minex_barrow', 'Trillebør med malm', 1.8, 1, 'barrow'),
  toolKind('minex_sacks', 'Sække med malm', 1.4, 1, 'sack'),
  ...[0, 1, 2, 4, 5].map((i) =>
    kind({ key: `minex_pile_${['iron', 'copper', 'gold', 'x', 'coal', 'crystal'][i]}`, family: FAM, name: `Bunke ${['jernmalm', 'kobbermalm', 'guldmalm', '', 'kul', 'krystaller'][i]}`, w: 1.8, h: 1.6, shadow: 12, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['dungeon', 'cave', 'mountain'], draw: (g, o) => pile(g, o.w, o.h, o.seed, ORES[i]!, false) })),
  kind({ key: 'minex_slag_heap', family: FAM, name: 'Slaggebunke', w: 2, h: 1.8, shadow: 12, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['dungeon', 'cave', 'mountain', 'city'], draw: (g, o) => pile(g, o.w, o.h, o.seed, ORES[4]!, true) }),
];
void param; void ellBody; void ellipsePath; void polyBody; void rivet; void crack; void tube; void mottle;
