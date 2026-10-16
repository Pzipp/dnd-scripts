import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { ellBody, polyBody, rectBody, tube } from '../pack2/helpers';
import { blobPath, clipped, crack, FLOOR, FX, glow, glowOf, glowParam, glowStroke, holePts, mix, mottle, OUT, polyRing, radial, rgb, rune, runeRing, shift, slab, starPath, stateParam, type G, type RGB } from './common';

/** Tandhjul set oppefra. */
function cog(g: G, x: number, y: number, R: number, teeth: number, rot: number, col: RGB = [150, 118, 62]): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const pts: [number, number][] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const da = (Math.PI * 2) / teeth;
    for (const [k, rr] of [[0.05, 0.8], [0.2, 1], [0.5, 1], [0.65, 0.8]] as const) pts.push([Math.cos(a + k * da) * R * rr, Math.sin(a + k * da) * R * rr]);
  }
  polyBody(g, pts, col, { lw: Math.max(1, R * 0.05), ao: R * 0.08, light: 40 });
  g.beginPath();
  g.arc(0, 0, R * 0.55, 0, 7);
  g.strokeStyle = 'rgba(20,10,4,.4)';
  g.lineWidth = R * 0.05;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, R * 0.2, 0, 7);
  g.fillStyle = 'rgb(20,14,10)';
  g.fill();
  g.restore();
}

/** Flammetunger, der stråler ud fra et punkt set oppefra. */
export function flame(g: G, r: () => number, x: number, y: number, R: number, n: number, hot = 1, cold = false): void {
  const outer: RGB = cold ? [60, 150, 255] : [240, 70, 20];
  const mid: RGB = cold ? [150, 214, 255] : [255, 160, 40];
  const core: RGB = cold ? [236, 252, 255] : [255, 244, 190];
  glow(g, x, y, R * 1.9, outer, 0.3 * hot);
  for (let layer = 0; layer < 3; layer++) {
    const col = [outer, mid, core][layer]!;
    const sc = [1, 0.7, 0.4][layer]!;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.5;
      const L = R * sc * (0.7 + r() * 0.5);
      const wd = L * 0.2;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, -wd);
      g.quadraticCurveTo(L * 0.5, -wd * 1.6, L, (r() - 0.5) * wd);
      g.quadraticCurveTo(L * 0.5, wd * 1.6, 0, wd);
      g.closePath();
      g.fillStyle = rgb(col, 0.55 + layer * 0.15);
      g.fill();
      g.restore();
    }
  }
  glow(g, x, y, R * 0.45, core, 0.95);
}

function nozzle(g: G, x: number, y: number, R: number): void {
  ellBody(g, x, y, R, R, [168, 126, 58], { lw: Math.max(1.2, R * 0.08), light: 50, dark: 56 });
  g.beginPath();
  g.arc(x, y, R * 0.55, 0, 7);
  g.fillStyle = 'rgb(10,6,4)';
  g.fill();
  g.strokeStyle = 'rgba(255,230,160,.4)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, R * 0.7, Math.PI * 1.05, Math.PI * 1.6);
  g.stroke();
}

function fireJet(g: G, o: DrawInput, row: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  const active = param(o, 'state', 'burst') === 'burst';
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [104, 98, 92], { cracks: 2, rad: S * 0.04 });
  const n = row ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const x = row ? (-w * 0.3) + (i * w * 0.6) / (n - 1) : 0;
    // sodplet omkring dysen
    glow(g, x, 0, S * 0.5, [10, 6, 4], 0.7);
    nozzle(g, x, 0, S * 0.1);
    if (active) flame(g, r, x, 0, row ? S * 0.5 : S * 0.46, row ? 8 : 12);
  }
}

function iceTrap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const active = param(o, 'state', 'frozen') === 'frozen';
  slab(g, r, -R * 0.98, -R * 0.98, R * 1.96, R * 1.96, [98, 108, 118], { cracks: 2, rad: R * 0.04 });
  const body = blobPath(g, holePts(r, R * 0.78, R * 0.78, 0.18, 14));
  if (active) {
    body();
    g.fillStyle = radial(g, -R * 0.1, -R * 0.1, R * 0.85, [[0, 'rgba(240,252,255,.95)'], [0.6, 'rgba(176,222,244,.92)'], [1, 'rgba(120,180,222,.85)']]);
    g.fill();
    clipped(g, body, () => {
      for (let i = 0; i < 9; i++) crack(g, r, (r() - 0.5) * R, (r() - 0.5) * R, R * 0.6, r() * 6.3, 1.1);
    });
    body();
    g.strokeStyle = 'rgba(30,60,90,.7)';
    g.lineWidth = R * 0.03;
    g.stroke();
  }
  // iskrystaller
  for (let i = 0; i < (active ? 9 : 3); i++) {
    const a = (i / 9) * 6.28 + r();
    const d = R * (0.2 + r() * 0.62);
    const L = R * (0.18 + r() * 0.18);
    g.save();
    g.translate(Math.cos(a) * d, Math.sin(a) * d);
    g.rotate(a);
    polyBody(g, [[0, -L * 0.22], [L, 0], [0, L * 0.22], [-L * 0.2, 0]], [186, 226, 246], { lw: 1, ao: 1.5, light: 40, dark: 30 });
    g.restore();
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`;
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * R * 0.98;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 1.6, 0, 7);
    g.fill();
  }
  if (active) glow(g, 0, 0, R * 1.2, [150, 210, 255], 0.2);
}

function lightningTrap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  const active = param(o, 'state', 'arcing') === 'arcing';
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [100, 98, 104], { cracks: 2, rad: S * 0.04 });
  const xs = [-w * 0.34, w * 0.34];
  const col: RGB = [120, 170, 255];
  if (active) {
    for (let k = 0; k < 3; k++) {
      const trace = () => {
        g.beginPath();
        g.moveTo(xs[0]!, 0);
        const n = 9;
        for (let i = 1; i < n; i++) g.lineTo(xs[0]! + ((xs[1]! - xs[0]!) * i) / n, (r() - 0.5) * S * 0.32);
        g.lineTo(xs[1]!, 0);
      };
      glowStroke(g, trace, k ? 1 : 1.8, col, [255, 255, 245], 0.9 - k * 0.2);
    }
    glow(g, 0, 0, w * 0.5, col, 0.22, h * 0.5);
  }
  for (const x of xs) {
    ellBody(g, x, 0, S * 0.19, S * 0.19, [96, 98, 108], { lw: 1.6 });
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(x, 0, S * (0.15 - i * 0.03), 0, 7);
      g.strokeStyle = i % 2 ? 'rgb(120,70,34)' : 'rgb(206,128,66)';
      g.lineWidth = S * 0.028;
      g.stroke();
    }
    g.beginPath();
    g.arc(x, 0, S * 0.04, 0, 7);
    g.fillStyle = active ? 'rgb(230,240,255)' : 'rgb(60,60,70)';
    g.fill();
    if (active) glow(g, x, 0, S * 0.3, col, 0.5);
  }
}

// ---------------------------------------------------------------- gas

function gasWisps(g: G, r: () => number, R: number, col: RGB, a: number, n = 14): void {
  for (let i = 0; i < n; i++) {
    const an = r() * 6.3;
    const d = Math.sqrt(r()) * R * 0.7;
    glow(g, Math.cos(an) * d, Math.sin(an) * d, R * (0.28 + r() * 0.3), mix(col, [255, 255, 255], r() * 0.3), a * (0.5 + r() * 0.6));
  }
}

function gasVent(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const col = glowOf(o, 'poison').edge;
  const active = param(o, 'state', 'venting') === 'venting';
  slab(g, r, -R * 0.96, -R * 0.96, R * 1.92, R * 1.92, [108, 102, 96], { cracks: 2, rad: R * 0.05 });
  ellBody(g, 0, 0, R * 0.62, R * 0.62, [116, 94, 62], { lw: R * 0.04, light: 40 });
  g.beginPath();
  g.arc(0, 0, R * 0.5, 0, 7);
  g.fillStyle = 'rgb(8,6,5)';
  g.fill();
  clipped(g, () => { g.beginPath(); g.arc(0, 0, R * 0.5, 0, 7); }, () => {
    if (active) glow(g, 0, 0, R * 0.6, col, 0.55);
    // gitterstænger
    for (let i = -4; i <= 4; i++) {
      g.fillStyle = 'rgba(8,4,2,.6)';
      g.fillRect(i * R * 0.115 + 1, -R * 0.55, R * 0.06, R * 1.1);
      g.fillStyle = 'rgb(138,112,70)';
      g.fillRect(i * R * 0.115, -R * 0.55, R * 0.06, R * 1.1);
      g.fillStyle = 'rgba(255,240,190,.35)';
      g.fillRect(i * R * 0.115, -R * 0.55, R * 0.018, R * 1.1);
    }
  });
  g.beginPath();
  g.arc(0, 0, R * 0.5, 0, 7);
  g.strokeStyle = OUT;
  g.lineWidth = R * 0.04;
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28;
    g.fillStyle = 'rgb(180,176,170)';
    g.beginPath();
    g.arc(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56, R * 0.035, 0, 7);
    g.fill();
  }
  if (active) gasWisps(g, r, R * 1.35, col, 0.7);
}

function gasNozzles(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col = glowOf(o, 'poison').edge;
  const active = param(o, 'state', 'venting') === 'venting';
  const n = 3;
  slab(g, r, -w * 0.49, -h * 0.1, w * 0.98, h * 0.58, [106, 100, 94], { cracks: 2, rad: h * 0.04 });
  if (active) {
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / n;
      g.save();
      g.translate(x, h * 0.02);
      const L = h * 0.9;
      const cone = g.createLinearGradient(0, 0, 0, L);
      cone.addColorStop(0, rgb(col, 0.55));
      cone.addColorStop(1, rgb(col, 0));
      g.fillStyle = cone;
      g.beginPath();
      g.moveTo(-h * 0.06, 0);
      g.lineTo(-h * 0.36, L);
      g.lineTo(h * 0.36, L);
      g.lineTo(h * 0.06, 0);
      g.fill();
      g.restore();
      gasWisps(g, r, h * 0.55, col, 0.6, 5);
    }
  }
  // vægkrone med messingdyser, der stikker ud mod sydsiden
  rectBody(g, -w / 2, -h / 2, w, h * 0.42, h * 0.04, [118, 112, 104], { lw: Math.max(1.5, h * 0.035), ao: h * 0.07 });
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / n;
    rectBody(g, x - h * 0.05, -h * 0.1, h * 0.1, h * 0.14, h * 0.02, [160, 124, 62], { lw: 1.2, light: 44 });
    polyBody(g, [[x - h * 0.1, h * 0.04], [x + h * 0.1, h * 0.04], [x + h * 0.075, h * 0.12], [x - h * 0.075, h * 0.12]], [176, 138, 70], { lw: 1.2, light: 44 });
    g.fillStyle = 'rgb(8,4,2)';
    g.fillRect(x - h * 0.05, h * 0.1, h * 0.1, h * 0.03);
  }
}

function pipeValve(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col = glowOf(o, 'poison').edge;
  const leak = param(o, 'state', 'leaking') === 'leaking';
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [100, 96, 92], { cracks: 2, rad: h * 0.04 });
  const path = () => { g.beginPath(); g.moveTo(-w * 0.46, h * 0.15); g.lineTo(-w * 0.05, h * 0.15); g.lineTo(-w * 0.05, -h * 0.28); g.lineTo(w * 0.46, -h * 0.28); };
  tube(g, path, h * 0.16, [128, 108, 78]);
  for (const [x, y] of [[-w * 0.3, h * 0.15], [w * 0.2, -h * 0.28]] as const) {
    rectBody(g, x - h * 0.04, y - h * 0.12, h * 0.08, h * 0.24, 2, [96, 84, 64], { lw: 1.2 });
  }
  // ventilhjul
  g.save();
  g.translate(-w * 0.05, h * 0.15);
  ellBody(g, 0, 0, h * 0.2, h * 0.2, [160, 40, 34], { lw: 1.5, light: 36 });
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 4);
    g.fillStyle = 'rgb(120,28,24)';
    g.fillRect(-h * 0.18, -h * 0.02, h * 0.36, h * 0.04);
  }
  ellBody(g, 0, 0, h * 0.05, h * 0.05, [186, 186, 190], { lw: 1 });
  g.restore();
  if (leak) {
    glow(g, w * 0.4, -h * 0.28, h * 0.5, col, 0.35);
    gasWisps(g, r, h * 0.9, col, 0.3, 6);
  }
}

// ---------------------------------------------------------------- stenfald

function chunk(g: G, r: () => number, x: number, y: number, s: number, col: RGB): void {
  const n = 6 + Math.floor(r() * 3);
  const rot = r() * 6.3;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * 6.28;
    const k = 0.7 + r() * 0.5;
    pts.push([x + Math.cos(a) * s * k, y + Math.sin(a) * s * k * 0.85]);
  }
  polyBody(g, pts, shift(col, (r() - 0.5) * 26), { lw: Math.max(1, s * 0.08), ao: s * 0.2, light: 36 });
}

function rockfallTrap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const fallen = param(o, 'state', 'intact') === 'fallen';
  const stone: RGB = [112, 106, 98];
  slab(g, r, -R * 0.99, -R * 0.99, R * 1.98, R * 1.98, stone, { cracks: 1, rad: R * 0.05 });
  if (!fallen) {
    // løs loftsblok: mørke radiale revner og antydning af blokke i gulvet
    glow(g, 0, 0, R * 0.9, [10, 8, 6], 0.3);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * 6.28 + r() * 0.3;
      crack(g, r, Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12, R * (0.5 + r() * 0.4), a, Math.max(1, R * 0.03));
    }
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(0, 0, R * (0.32 + i * 0.22), r() * 6, r() * 6 + 3.6);
      g.strokeStyle = 'rgba(12,6,2,.5)';
      g.lineWidth = Math.max(0.8, R * 0.02);
      g.stroke();
    }
  } else {
    // støv og nedfaldne blokke
    glow(g, 0, 0, R * 1.0, [150, 140, 126], 0.35);
    glow(g, 0, 0, R * 0.55, [10, 8, 6], 0.5);
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.78;
      chunk(g, r, Math.cos(a) * d, Math.sin(a) * d, R * (0.07 + r() * 0.2), [128, 120, 110]);
    }
    mottle(g, r, [-R * 0.7, -R * 0.7, R * 0.7, R * 0.7], [150, 142, 128], 14, R * 0.06, 18, 0.35);
  }
}

// ---------------------------------------------------------------- runeglyffer

function glyph(g: G, o: DrawInput, shape: 'triangle' | 'hex' | 'eye' | 'sun'): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const gl = glowOf(o, 'arcane');
  const active = param(o, 'state', 'active') === 'active';
  const a = active ? 1 : 0.35;
  // flisen under glyffen
  slab(g, r, -R * 0.99, -R * 0.99, R * 1.98, R * 1.98, [104, 100, 108], { cracks: 2, rad: R * 0.04 });
  glow(g, 0, 0, R * 1.1, gl.edge, 0.34 * a);
  const line = (path: () => void, w = 1) => glowStroke(g, path, Math.max(1, R * 0.03 * w), gl.edge, gl.core, a);
  const outer = () => { g.beginPath(); g.arc(0, 0, R * 0.86, 0, 7); };
  const inner = () => { g.beginPath(); g.arc(0, 0, R * 0.7, 0, 7); };
  line(outer);
  line(inner, 0.6);
  runeRing(g, R * 0.78, 14, R * 0.1, r, gl.edge, a);
  if (shape === 'triangle') {
    line(polyRing(g, R * 0.66, 3));
    line(polyRing(g, R * 0.33, 3, Math.PI / 2), 0.7);
  } else if (shape === 'hex') {
    line(starPath(g, R * 0.66, 6, 2));
    line(starPath(g, R * 0.66, 6, 2, Math.PI / 6));
    line(polyRing(g, R * 0.3, 6, 0), 0.7);
  } else if (shape === 'sun') {
    line(starPath(g, R * 0.66, 8, 3));
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * 6.28;
      line(() => { g.beginPath(); g.moveTo(Math.cos(an) * R * 0.25, Math.sin(an) * R * 0.25); g.lineTo(Math.cos(an) * R * 0.42, Math.sin(an) * R * 0.42); }, 0.7);
    }
  } else {
    // øje
    line(() => { g.beginPath(); g.moveTo(-R * 0.62, 0); g.quadraticCurveTo(0, -R * 0.62, R * 0.62, 0); g.quadraticCurveTo(0, R * 0.62, -R * 0.62, 0); });
    line(() => { g.beginPath(); g.arc(0, 0, R * 0.2, 0, 7); });
  }
  g.beginPath();
  g.arc(0, 0, R * 0.07, 0, 7);
  g.fillStyle = rgb(gl.core, a);
  g.fill();
  rune(g, 0, 0, R * 0.01, r, gl.edge, 0);
}

// ---------------------------------------------------------------- ødelagte fælder

function brokenPlate(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [112, 106, 98], { cracks: 3, rad: S * 0.04 });
  // åbnet hulrum med tandhjul
  const hole = blobPath(g, holePts(r, S * 0.32, S * 0.3, 0.12, 12));
  hole();
  g.fillStyle = 'rgb(12,8,6)';
  g.fill();
  clipped(g, hole, () => {
    cog(g, -S * 0.1, -S * 0.04, S * 0.17, 10, r() * 3);
    cog(g, S * 0.12, S * 0.1, S * 0.12, 8, r() * 3, [128, 100, 56]);
    g.fillStyle = radial(g, 0, 0, S * 0.34, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.65)']]);
    g.fillRect(-S, -S, S * 2, S * 2);
  });
  hole();
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.4, S * 0.03);
  g.stroke();
  // pladens brudstykker
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.3;
    const d = S * (0.3 + r() * 0.12);
    chunk(g, r, Math.cos(a) * d, Math.sin(a) * d, S * (0.07 + r() * 0.08), [134, 126, 114]);
  }
  for (let i = 0; i < 3; i++) crack(g, r, 0, 0, S * 0.45, r() * 6.3, 1.1);
}

function brokenSpikes(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [108, 102, 94], { cracks: 3, rad: S * 0.04 });
  for (let i = 0; i < 12; i++) {
    const x = (r() - 0.5) * w * 0.8;
    const y = (r() - 0.5) * h * 0.8;
    g.fillStyle = 'rgb(8,6,5)';
    g.beginPath();
    g.arc(x, y, S * 0.04, 0, 7);
    g.fill();
    if (r() < 0.55) {
      // knækket pig liggende på gulvet
      g.save();
      g.translate(x + (r() - 0.5) * S * 0.1, y + S * 0.1);
      g.rotate(r() * 6.3);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(-S * 0.1 + 1, -S * 0.02 + 1.5, S * 0.2, S * 0.04);
      polyBody(g, [[-S * 0.1, -S * 0.02], [S * 0.06, -S * 0.02], [S * 0.12, 0], [S * 0.06, S * 0.02], [-S * 0.1, S * 0.02]], [150, 154, 166], { lw: 1, ao: 1, light: 40 });
      g.restore();
    }
  }
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(110,50,18,.4)';
    g.beginPath();
    g.ellipse((r() - 0.5) * w * 0.7, (r() - 0.5) * h * 0.7, S * 0.08, S * 0.05, r() * 3, 0, 7);
    g.fill();
  }
}

const glyphState = stateParam('active', [['active', 'Aktiv'], ['dim', 'Slukket']]);
const gasState = stateParam('venting', [['venting', 'Udleder gas'], ['idle', 'Hviler']]);

export const trap3Kinds: ObjectKind[] = [
  kind({ key: 'trapx_gas_vent', family: 'trapx', name: 'Gasrist i gulv', w: 1.4, h: 1.4, shadow: 0, bleed: 0.9, layers: FX, params: [gasState, glowParam('poison')], tags: ['dungeon', 'crypt', 'cave'], draw: gasVent }),
  kind({ key: 'trapx_gas_nozzles', family: 'trapx', name: 'Gasdyser i væg', w: 3, h: 1.6, keepAspect: false, shadow: 0, bleed: 0.4, layers: FX, params: [gasState, glowParam('poison')], tags: ['dungeon', 'crypt', 'ruin'], draw: gasNozzles }),
  kind({ key: 'trapx_gas_pipes', family: 'trapx', name: 'Rør med ventil', w: 3, h: 1.4, keepAspect: false, shadow: 0, bleed: 0.4, layers: FX, params: [stateParam('leaking', [['leaking', 'Utæt'], ['sealed', 'Tæt']]), glowParam('poison')], tags: ['dungeon', 'city', 'military'], draw: pipeValve }),
  kind({ key: 'trapx_rockfall_intact', family: 'trapx', name: 'Løst loft (faldende sten)', w: 2.5, h: 2.5, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, tags: ['dungeon', 'cave', 'ruin'], draw: (g, o) => rockfallTrap(g, { ...o, params: { ...o.params, state: 'intact' } }) }),
  kind({ key: 'trapx_rockfall_fallen', family: 'trapx', name: 'Nedfaldne sten', w: 2.5, h: 2.5, randomRotation: true, shadow: 2, bleed: 0.1, layers: FLOOR, tags: ['dungeon', 'cave', 'ruin'], draw: (g, o) => rockfallTrap(g, { ...o, params: { ...o.params, state: 'fallen' } }) }),
  kind({ key: 'trapx_fire_jet', family: 'trapx', name: 'Ilddyse', w: 1.6, h: 1.6, shadow: 0, bleed: 0.9, layers: FX, params: [stateParam('burst', [['burst', 'Flammer'], ['idle', 'Slukket']])], tags: ['dungeon', 'temple', 'military'], draw: (g, o) => fireJet(g, o, false) }),
  kind({ key: 'trapx_fire_jets_row', family: 'trapx', name: 'Ildfælde, række af dyser', w: 4, h: 1.4, keepAspect: false, shadow: 0, bleed: 0.5, layers: FX, params: [stateParam('burst', [['burst', 'Flammer'], ['idle', 'Slukket']])], tags: ['dungeon', 'temple', 'military'], draw: (g, o) => fireJet(g, o, true) }),
  kind({ key: 'trapx_ice', family: 'trapx', name: 'Isfælde', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.2, layers: FX, params: [stateParam('frozen', [['frozen', 'Frosset'], ['idle', 'Klar']])], tags: ['arctic', 'dungeon', 'cave'], draw: iceTrap }),
  kind({ key: 'trapx_lightning', family: 'trapx', name: 'Lynfælde med spoler', w: 3, h: 1.4, keepAspect: false, shadow: 0, bleed: 0.3, layers: FX, params: [stateParam('arcing', [['arcing', 'Gnister'], ['idle', 'Slukket']])], tags: ['dungeon', 'magic', 'temple'], draw: lightningTrap }),
  kind({ key: 'trapx_glyph_triangle', family: 'trapx', name: 'Vogterglyf, trekant', w: 1.8, h: 1.8, randomRotation: true, shadow: 0, bleed: 0.3, layers: FX, params: [glyphState, glowParam('arcane')], tags: ['dungeon', 'magic', 'temple'], draw: (g, o) => glyph(g, o, 'triangle') }),
  kind({ key: 'trapx_glyph_hex', family: 'trapx', name: 'Vogterglyf, hexagram', w: 1.8, h: 1.8, randomRotation: true, shadow: 0, bleed: 0.3, layers: FX, params: [glyphState, glowParam('fire')], tags: ['dungeon', 'magic', 'temple'], draw: (g, o) => glyph(g, o, 'hex') }),
  kind({ key: 'trapx_glyph_eye', family: 'trapx', name: 'Vogterglyf, øje', w: 1.8, h: 1.8, randomRotation: true, shadow: 0, bleed: 0.3, layers: FX, params: [glyphState, glowParam('shadow')], tags: ['dungeon', 'magic', 'crypt'], draw: (g, o) => glyph(g, o, 'eye') }),
  kind({ key: 'trapx_glyph_sun', family: 'trapx', name: 'Vogterglyf, sol', w: 1.8, h: 1.8, randomRotation: true, shadow: 0, bleed: 0.3, layers: FX, params: [glyphState, glowParam('holy')], tags: ['dungeon', 'magic', 'temple'], draw: (g, o) => glyph(g, o, 'sun') }),
  kind({ key: 'trapx_plate_broken', family: 'trapx', name: 'Ødelagt trykplade', w: 1.4, h: 1.4, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, tags: ['dungeon', 'ruin'], draw: brokenPlate }),
  kind({ key: 'trapx_spikes_broken', family: 'trapx', name: 'Ødelagte pigge', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, tags: ['dungeon', 'ruin', 'crypt'], draw: brokenSpikes }),
];
