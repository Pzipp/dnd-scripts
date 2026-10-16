import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng, softDot } from '../util';
import { base, box, crack, flame, lerp, mixc, mossPatch, mottle, OUT, polyBody, polyPath, radial, rf, rgb, rubble, shift, stoneOf, stoneOptions, tufts, type G, type P, type RGB, type Rnd } from './common';

/** Stenkredse, dysser, rune- og gravsten og grave: alt set straks oppefra (toppen dominerer; højde ses som lys og kantskygge). */

const stoneP = (d: string): ParamDef => ({ key: 'stone', label: 'Sten', type: 'select', default: d, options: stoneOptions });
const litP: ParamDef = { key: 'lit', label: 'Lysende runer', type: 'toggle', default: true };
const mossP = (d: number): ParamDef => ({ key: 'moss', label: 'Bevoksning', type: 'range', min: 0, max: 1, step: 0.05, default: d });
const RUNE: RGB = [110, 210, 255];

/** Menhir/sten set oppefra: kantet top med lys NV, skyggekant SØ og eventuelt en rune. */
function menhir(g: G, r: Rnd, x: number, y: number, rx: number, ry: number, col: RGB, o: { rune?: boolean; lit?: boolean; moss?: number; rot?: number } = {}): void {
  const n = 9;
  const rot = o.rot ?? r() * 6.28;
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * 6.283;
    const k = 0.78 + r() * 0.34;
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  g.save();
  g.translate(rx * 0.22, ry * 0.3);
  polyPath(g, pts)();
  g.fillStyle = 'rgba(8,4,0,.4)';
  g.fill();
  g.restore();
  polyBody(g, pts, shift(col, (r() - 0.5) * 24), { lw: 1.5, light: 36, dark: 40, ao: Math.max(1.5, Math.min(rx, ry) * 0.16) });
  g.save();
  polyPath(g, pts)();
  g.clip();
  mottle(g, r, [x - rx, y - ry, x + rx, y + ry], col, 8, Math.min(rx, ry) * 0.3, 18, 0.3);
  crack(g, r, x - rx * 0.3, y - ry * 0.2, Math.min(rx, ry) * 1.1, r() * 6, 0.9, false);
  g.restore();
  if (o.rune) {
    g.beginPath();
    g.moveTo(x, y - ry * 0.4);
    g.lineTo(x + rx * 0.2, y);
    g.lineTo(x - rx * 0.15, y + ry * 0.2);
    g.moveTo(x, y - ry * 0.4);
    g.lineTo(x, y + ry * 0.45);
    if (o.lit) {
      g.strokeStyle = rgb(RUNE, 0.35);
      g.lineWidth = 4;
      g.stroke();
      g.strokeStyle = 'rgba(210,245,255,.95)';
      g.lineWidth = 1.3;
    } else {
      g.strokeStyle = 'rgba(20,16,24,.7)';
      g.lineWidth = 1.5;
    }
    g.stroke();
  }
  if (o.moss && r() < o.moss) mossPatch(g, r, x - rx * 0.3, y - ry * 0.3, Math.min(rx, ry) * 0.5, 5);
}

function stoneCircle(g: G, o: DrawInput, mode: 'circle' | 'horseshoe' | 'ring_fire'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const lit = param(o, 'lit', true);
  const moss = param(o, 'moss', 0.5);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.38;
  g.beginPath();
  g.ellipse(0, 0, R * 1.15, R * 1.15, 0, 0, 7);
  g.fillStyle = 'rgba(70,100,50,.25)';
  g.fill();
  tufts(g, r, 0, 0, R * 1.1, R * 1.1, Math.round(10 + moss * 26));
  const n = mode === 'horseshoe' ? 7 : 11;
  const span = mode === 'horseshoe' ? 5.2 : 6.283;
  const start = mode === 'horseshoe' ? -Math.PI / 2 - span / 2 + Math.PI : 0;
  const s = Math.min(w, h) * 0.075;
  if (lit) softDot(g, 0, 0, R * 1.2, RUNE, 0.1);
  for (let i = 0; i < n; i++) {
    const a = start + (i / (mode === 'horseshoe' ? n - 1 : n)) * span;
    menhir(g, r, Math.cos(a) * R, Math.sin(a) * R, s * rf(r, 0.8, 1.2), s * rf(r, 0.9, 1.3), col, { rune: true, lit, moss, rot: a });
  }
  if (mode === 'ring_fire') {
    box(g, r, -R * 0.2, -R * 0.2, R * 0.4, R * 0.4, 6, shift(col, -10), { wear: 0.5 });
    flame(g, 0, 0, 6);
  } else {
    // alter-sten i midten
    menhir(g, r, 0, 0, s * 1.5, s * 1.1, shift(col, -6), { moss: 0.3 });
  }
}

function trilithon(g: G, o: DrawInput, pairs: number): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const moss = param(o, 'moss', 0.5);
  const { w, h } = o;
  const gw = (w * 0.92) / pairs;
  for (let i = 0; i < pairs; i++) {
    const cx = -w * 0.46 + gw * (i + 0.5);
    const lw = gw * 0.86;
    const lh = h * 0.42;
    g.save();
    g.translate(cx, 0);
    g.rotate(rf(r, -0.04, 0.04));
    // overliggeren dækker de to stolper
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fillRect(-lw / 2 + 4, -lh / 2 + 6, lw, lh);
    polyBody(g, [[-lw / 2, -lh / 2], [lw / 2, -lh / 2 + rf(r, 0, 3)], [lw / 2, lh / 2], [-lw / 2, lh / 2 - rf(r, 0, 3)]], shift(col, 10), { lw: 1.6, light: 34, dark: 34, ao: 3 });
    g.save();
    g.beginPath();
    g.rect(-lw / 2, -lh / 2, lw, lh);
    g.clip();
    mottle(g, r, [-lw / 2, -lh / 2, lw / 2, lh / 2], col, 10, 7, 20, 0.28);
    crack(g, r, rf(r, -lw * 0.3, lw * 0.3), -lh / 2, lh * 0.9, Math.PI / 2, 1, false);
    g.restore();
    // stolpernes ender titter frem
    for (const sx of [-1, 1]) menhir(g, r, sx * lw * 0.42, lh * 0.6, lh * 0.3, lh * 0.2, shift(col, -14));
    if (r() < moss) mossPatch(g, r, rf(r, -lw * 0.3, lw * 0.3), 0, lh * 0.4, 8);
    g.restore();
  }
  tufts(g, r, 0, h * 0.35, w * 0.4, h * 0.1, Math.round(moss * 14));
}

function dolmen(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const moss = param(o, 'moss', 0.5);
  const { w, h } = o;
  // støttesten rundt, så dæksten
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.283 + 0.4;
    menhir(g, r, Math.cos(a) * w * 0.33, Math.sin(a) * h * 0.3, w * 0.12, h * 0.12, shift(col, -12), { moss });
  }
  const pts: P[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.283;
    const k = 0.88 + r() * 0.14;
    pts.push([Math.cos(a) * w * 0.4 * k, Math.sin(a) * h * 0.36 * k]);
  }
  g.save();
  g.translate(w * 0.04, h * 0.06);
  polyPath(g, pts)();
  g.fillStyle = 'rgba(8,4,0,.45)';
  g.fill();
  g.restore();
  polyBody(g, pts, shift(col, 14), { lw: 1.8, light: 38, dark: 40, ao: 5 });
  g.save();
  polyPath(g, pts)();
  g.clip();
  mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], col, 24, w * 0.05, 22, 0.3);
  for (let i = 0; i < 5; i++) crack(g, r, rf(r, -w * 0.3, w * 0.3), rf(r, -h * 0.25, h * 0.25), w * 0.12, r() * 6.28, 1, true);
  g.restore();
  mossPatch(g, r, -w * 0.15, -h * 0.1, w * 0.15, Math.round(6 + moss * 10));
}

function cairn(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const R = Math.min(w, h) * 0.46;
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fillStyle = 'rgba(8,4,0,.35)';
  g.fill();
  const items: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < 46; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * R * 0.9;
    items.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.1 + (1 - d / R) * 0.16) * rf(r, 0.8, 1.2) });
  }
  items.sort((a, b) => b.x * b.x + b.y * b.y - (a.x * a.x + a.y * a.y));
  for (const it of items) {
    const m: P[] = [];
    for (let k = 0; k < 6; k++) m.push([it.x + Math.cos(k * 1.047 + it.x) * it.s * rf(r, 0.8, 1.2), it.y + Math.sin(k * 1.047 + it.x) * it.s * 0.8 * rf(r, 0.8, 1.2)]);
    const hgt = 1 - Math.hypot(it.x, it.y) / R;
    polyBody(g, m, shift(col, (r() - 0.5) * 30 + hgt * 22), { lw: 1, light: 34, dark: 34, ao: 1 });
  }
  if (r() < 0.6) mossPatch(g, r, -R * 0.3, R * 0.2, R * 0.3, 6);
}

function standingRow(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const moss = param(o, 'moss', 0.5);
  const { w, h } = o;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s = Math.min(w / n, h) * 0.42 * rf(r, 0.8, 1.15);
    menhir(g, r, lerp(-w * 0.44, w * 0.44, t), Math.sin(t * 3) * h * 0.12 + rf(r, -3, 3), s, s * 1.15, col, { rune: i % 2 === 0, lit: param(o, 'lit', true), moss });
  }
  tufts(g, r, 0, 0, w * 0.45, h * 0.3, 14);
}

function runeMenhir(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'dark'));
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const m = Math.min(w, h);
  if (lit) softDot(g, 0, 0, m * 0.8, RUNE, 0.2);
  menhir(g, r, 0, 0, m * 0.34, m * 0.4, col, { rune: true, lit, moss: 0.3 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.283;
    const x = Math.cos(a) * m * 0.44;
    const y = Math.sin(a) * m * 0.44;
    g.beginPath();
    g.moveTo(x, y - 3);
    g.lineTo(x + 2.5, y + 3);
    g.lineTo(x - 2.5, y + 3);
    g.closePath();
    g.strokeStyle = lit ? 'rgba(160,230,255,.9)' : 'rgba(30,26,34,.6)';
    g.lineWidth = 1;
    g.stroke();
  }
}

/** Grav set oppefra: jordhøj med græs, med kors, gravsten eller åben grav. */
function grave(g: G, o: DrawInput, mode: 'mound' | 'stone' | 'cross' | 'open'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const gw = mode === 'open' ? w * 0.27 : w * 0.38;
  const gh = mode === 'open' ? h * 0.36 : h * 0.44;
  if (mode === 'open') {
    g.save();
    g.translate(-w * 0.14, 0);
    // åben grav: mørkt hul, jordbunke og skovl
    polyBody(g, [[-gw, -gh], [gw, -gh], [gw, gh], [-gw, gh]], [96, 70, 44], { lw: 1.4, light: 10, dark: 16, ao: 3 });
    g.fillStyle = lin2(g, -gw, -gh, gw, gh);
    g.fillRect(-gw + 4, -gh + 4, gw * 2 - 8, gh * 2 - 8);
    g.beginPath();
    g.ellipse(gw * 1.55, gh * 0.2, w * 0.18, h * 0.28, 0, 0, 7);
    g.fillStyle = radial(g, gw * 1.55, gh * 0.2, w * 0.2, [[0, 'rgb(150,112,72)'], [1, 'rgb(90,64,40)']], gw * 1.4, gh * 0.05, 2);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.stroke();
    // skovl
    g.beginPath();
    g.moveTo(gw * 1.2, gh * 0.9);
    g.lineTo(gw * 2.1, gh * 0.3);
    g.strokeStyle = 'rgb(140,100,60)';
    g.lineWidth = 3;
    g.stroke();
    polyBody(g, [[gw * 1.0, gh * 0.95], [gw * 1.25, gh * 0.78], [gw * 1.3, gh * 1.05]], [140, 142, 150], { lw: 1.2, light: 20, dark: 20, ao: 0.4 });
    g.restore();
    return;
  }
  // jordhøj
  g.save();
  g.translate(3, 4);
  g.beginPath();
  g.ellipse(0, 0, gw, gh, 0, 0, 7);
  g.fillStyle = 'rgba(8,4,0,.35)';
  g.fill();
  g.restore();
  g.beginPath();
  g.ellipse(0, 0, gw, gh, 0, 0, 7);
  g.fillStyle = radial(g, 0, 0, gw, [[0, 'rgb(142,106,66)'], [0.7, 'rgb(112,80,50)'], [1, 'rgb(72,52,32)']], -gw * 0.3, -gh * 0.3, 2);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  g.save();
  g.beginPath();
  g.ellipse(0, 0, gw, gh, 0, 0, 7);
  g.clip();
  mottle(g, r, [-gw, -gh, gw, gh], [112, 80, 50], 22, 5, 22, 0.35);
  g.restore();
  tufts(g, r, 0, 0, gw * 0.9, gh * 0.9, 12);
  if (mode === 'stone') {
    box(g, r, -gw * 0.7, -gh * 1.02, gw * 1.4, gh * 0.3, 10, shift(col, 4), { wear: 0.5 });
    g.fillStyle = 'rgba(14,8,4,.4)';
    g.fillRect(-gw * 0.4, -gh * 0.95, gw * 0.8, 1.4);
    g.fillRect(-gw * 0.3, -gh * 0.86, gw * 0.6, 1.2);
  } else if (mode === 'cross') {
    g.save();
    g.translate(0, -gh * 0.62);
    g.rotate(rf(r, -0.12, 0.12));
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fillRect(-1.4 + 2, -gh * 0.3 + 3, 3.4, gh * 0.9);
    g.fillRect(-gh * 0.25 + 2, -gh * 0.08 + 3, gh * 0.5, 3.4);
    g.fillStyle = 'rgb(150,108,62)';
    g.fillRect(-1.7, -gh * 0.3, 3.4, gh * 0.9);
    g.fillRect(-gh * 0.25, -gh * 0.08, gh * 0.5, 3.4);
    g.strokeStyle = OUT;
    g.lineWidth = 0.9;
    g.strokeRect(-1.7, -gh * 0.3, 3.4, gh * 0.9);
    g.restore();
  } else {
    // blomster
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(rf(r, -gw * 0.5, gw * 0.5), rf(r, -gh * 0.3, gh * 0.7), 2, 0, 7);
      g.fillStyle = ['rgb(250,226,120)', 'rgb(240,150,190)', 'rgb(250,250,240)'][i % 3]!;
      g.fill();
    }
  }
}
function lin2(g: G, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, 'rgb(14,8,6)');
  gr.addColorStop(1, 'rgb(46,32,22)');
  return gr;
}

const common = { ...base, keepAspect: true as const, shadow: 14 };
const S = ['outdoor', 'magic', 'ruin'];

export const sacredKinds: ObjectKind[] = [
  kind({ key: 'sacred_circle', family: 'sacred', name: 'Stenkreds', w: 5.4, h: 5.4, ...common, shadow: 8, params: [stoneP('grey'), litP, mossP(0.5)], tags: [...S, 'grassland'], draw: (g, o) => stoneCircle(g, o, 'circle') }),
  kind({ key: 'sacred_circle_fire', family: 'sacred', name: 'Stenkreds med bålplads', w: 5.4, h: 5.4, ...common, shadow: 8, params: [stoneP('dark'), litP, mossP(0.3)], tags: [...S, 'camp'], draw: (g, o) => stoneCircle(g, o, 'ring_fire') }),
  kind({ key: 'sacred_horseshoe', family: 'sacred', name: 'Hesteskoformet stenkreds', w: 5, h: 5, ...common, shadow: 8, params: [stoneP('mossy'), litP, mossP(0.6)], tags: [...S, 'forest'], draw: (g, o) => stoneCircle(g, o, 'horseshoe') }),
  kind({ key: 'sacred_trilithon', family: 'sacred', name: 'Trilit (stendør)', w: 3, h: 1.6, ...common, params: [stoneP('grey'), mossP(0.5)], tags: S, draw: (g, o) => trilithon(g, o, 1) }),
  kind({ key: 'sacred_trilithons', family: 'sacred', name: 'Række af trilitter', w: 7, h: 1.6, ...common, params: [stoneP('grey'), mossP(0.5)], tags: S, draw: (g, o) => trilithon(g, o, 3) }),
  kind({ key: 'sacred_dolmen', family: 'sacred', name: 'Dysse', w: 4, h: 3.2, ...common, randomRotation: true, params: [stoneP('grey'), mossP(0.5)], tags: [...S, 'grassland'], draw: (g, o) => dolmen(g, o) }),
  kind({ key: 'sacred_cairn', family: 'sacred', name: 'Stenrøse', w: 2.4, h: 2.4, ...common, randomRotation: true, sizeJitter: 0.15, params: [stoneP('grey')], tags: ['outdoor', 'mountain', 'grassland'], draw: (g, o) => cairn(g, o) }),
  kind({ key: 'sacred_row', family: 'sacred', name: 'Række af bautastene', w: 7, h: 1.6, ...common, params: [stoneP('grey'), litP, mossP(0.5)], tags: S, draw: (g, o) => standingRow(g, o) }),
  kind({ key: 'sacred_rune_menhir', family: 'sacred', name: 'Runesten (lysende)', w: 1.6, h: 1.6, ...common, params: [stoneP('dark'), litP], tags: S, draw: (g, o) => runeMenhir(g, o) }),
  kind({ key: 'gravesite_mound', family: 'sacred', name: 'Gravhøj, lille', w: 1.2, h: 2, ...common, shadow: 6, params: [], tags: ['graveyard', 'outdoor', 'crypt'], draw: (g, o) => grave(g, o, 'mound') }),
  kind({ key: 'gravesite_headstone', family: 'sacred', name: 'Grav med gravsten', w: 1.2, h: 2, ...common, shadow: 8, params: [stoneP('grey')], tags: ['graveyard', 'outdoor', 'crypt'], draw: (g, o) => grave(g, o, 'stone') }),
  kind({ key: 'gravesite_cross', family: 'sacred', name: 'Grav med trækors', w: 1.2, h: 2, ...common, shadow: 8, params: [], tags: ['graveyard', 'outdoor', 'poor', 'battlefield'], draw: (g, o) => grave(g, o, 'cross') }),
  kind({ key: 'gravesite_open', family: 'sacred', name: 'Åben grav', w: 2.2, h: 2, ...common, shadow: 4, params: [], tags: ['graveyard', 'outdoor', 'crypt'], draw: (g, o) => grave(g, o, 'open') }),
];
void box;
void mixc;
