import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { ellBody, polyBody, rectBody, woodGrain } from '../pack2/helpers';
import { clipped, FX, glow, holePts, mix, radial, rgb, shift, blobPath, mottle, type G, type ParamDef, type RGB } from './common';
import { flame } from './traps3';

/** Belysning og atmosfære: lys fra oven, bløde effekter uden hård afskæring ved boksens kant. */

const TONES: Record<string, { core: RGB; edge: RGB; label: string }> = {
  warm: { core: [255, 238, 180], edge: [255, 160, 60], label: 'Varmt' },
  cold: { core: [225, 240, 255], edge: [130, 180, 255], label: 'Koldt' },
  green: { core: [230, 255, 200], edge: [110, 220, 100], label: 'Grønt' },
  red: { core: [255, 210, 180], edge: [240, 70, 40], label: 'Rødt' },
};
const toneParam = (def = 'warm'): ParamDef => ({ key: 'tone', label: 'Lysfarve', type: 'select', default: def, options: Object.entries(TONES).map(([value, v]) => ({ value, label: v.label })) });
const toneOf = (o: DrawInput, def = 'warm') => TONES[param(o, 'tone', def)] ?? TONES.warm!;

/** Lyspøl med blød aftagende kant (flere lag, lidt uregelmæssig, så den ikke ligner en perfekt cirkel). */
function pool(g: G, r: () => number, R: number, col: RGB, a: number, ry = R, jitter = 0.04): void {
  glow(g, 0, 0, R, col, a, ry);
  for (let i = 0; i < 5; i++) glow(g, (r() - 0.5) * R * jitter * 6, (r() - 0.5) * ry * jitter * 6, R * (0.5 + r() * 0.3), col, a * 0.18, ry * (0.5 + r() * 0.3));
}

function wallGlow(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const t = toneOf(o);
  const { w, h } = o;
  // kilden sidder i midten af boksens top (ved væggen); lyset falder nedad
  g.save();
  g.translate(0, -h * 0.42);
  glow(g, 0, h * 0.35, w * 0.5, t.edge, 0.38, h * 0.62);
  glow(g, 0, h * 0.2, w * 0.3, mix(t.edge, t.core, 0.5), 0.34, h * 0.4);
  for (let i = 0; i < 4; i++) glow(g, (r() - 0.5) * w * 0.3, h * (0.2 + r() * 0.3), w * 0.18, t.edge, 0.12, h * 0.25);
  glow(g, 0, 0, h * 0.1, t.core, 0.95);
  g.restore();
}

function lanternFloor(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const t = toneOf(o);
  const S = Math.min(o.w, o.h);
  pool(g, r, S * 2.4, t.edge, 0.34);
  pool(g, r, S * 1.0, mix(t.edge, t.core, 0.5), 0.45);
  const R = S * 0.2;
  // sekskantet lanterne set oppefra
  const pts: [number, number][] = Array.from({ length: 6 }, (_, k) => [Math.cos(k * 1.047 + 0.5) * R, Math.sin(k * 1.047 + 0.5) * R]);
  polyBody(g, pts, [70, 62, 56], { lw: 1.4, light: 30, ao: R * 0.15 });
  g.beginPath();
  g.arc(0, 0, R * 0.64, 0, 7);
  g.fillStyle = radial(g, 0, 0, R * 0.64, [[0, rgb([255, 252, 220])], [0.6, rgb(t.core)], [1, rgb(t.edge)]]);
  g.fill();
  g.strokeStyle = 'rgba(20,10,4,.75)';
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, R * 0.12, 0, 7);
  g.fillStyle = 'rgb(255,255,240)';
  g.fill();
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(k * 2.09 + 0.3) * R * 0.64, Math.sin(k * 2.09 + 0.3) * R * 0.64);
    g.strokeStyle = 'rgba(30,20,10,.5)';
    g.stroke();
  }
  // hank
  g.beginPath();
  g.arc(0, 0, R * 0.95, Math.PI * 1.1, Math.PI * 1.9);
  g.strokeStyle = 'rgb(90,86,84)';
  g.lineWidth = 1.4;
  g.stroke();
}

function candelabra(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const t = toneOf(o);
  const S = Math.min(o.w, o.h);
  const n = Math.round(param(o, 'candles', 5));
  pool(g, r, S * 2.6, t.edge, 0.3);
  const brass: RGB = [176, 134, 56];
  ellBody(g, 0, 0, S * 0.22, S * 0.22, brass, { lw: 1.4, light: 46 });
  const arms: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    arms.push([Math.cos(a) * S * 0.36, Math.sin(a) * S * 0.36]);
  }
  for (const [x, y] of arms) {
    g.strokeStyle = 'rgba(20,10,4,.8)';
    g.lineWidth = S * 0.07;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(x, y);
    g.stroke();
    g.strokeStyle = rgb(shift(brass, 10));
    g.lineWidth = S * 0.045;
    g.stroke();
  }
  for (const [x, y] of arms) {
    glow(g, x, y, S * 0.3, t.edge, 0.55);
    ellBody(g, x, y, S * 0.085, S * 0.085, [236, 226, 196], { lw: 1, light: 24 });
    glow(g, x - S * 0.005, y - S * 0.005, S * 0.075, [255, 246, 200], 1);
  }
  ellBody(g, 0, 0, S * 0.07, S * 0.07, [236, 226, 196], { lw: 1 });
  glow(g, 0, 0, S * 0.1, [255, 246, 200], 1);
}

function candles(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const t = toneOf(o);
  const S = Math.min(o.w, o.h);
  pool(g, r, S * 1.2, t.edge, 0.32);
  const n = 4 + Math.floor(r() * 4);
  const items: [number, number, number][] = [];
  for (let i = 0; i < n; i++) items.push([(r() - 0.5) * S * 0.7, (r() - 0.5) * S * 0.7, S * (0.045 + r() * 0.04)]);
  for (const [x, y, s] of items) {
    // vokspøl
    g.fillStyle = 'rgba(236,226,196,.7)';
    g.beginPath();
    g.ellipse(x, y, s * 1.9, s * 1.5, r() * 3, 0, 7);
    g.fill();
  }
  for (const [x, y, s] of items) {
    if (r() < 0.8) glow(g, x, y, S * 0.25, t.edge, 0.4);
    ellBody(g, x, y, s, s, [240, 230, 200], { lw: 1, light: 24 });
    glow(g, x, y, s * 0.9, [255, 246, 200], 1);
  }
}

function brazier(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const lit = param(o, 'lit', true);
  if (lit) pool(g, r, S * 2.6, [255, 130, 40], 0.4);
  ellBody(g, 0, 0, S * 0.46, S * 0.46, [66, 62, 60], { lw: S * 0.03, light: 34, ao: S * 0.04 });
  g.beginPath();
  g.arc(0, 0, S * 0.37, 0, 7);
  g.fillStyle = 'rgb(18,12,10)';
  g.fill();
  clipped(g, () => { g.beginPath(); g.arc(0, 0, S * 0.37, 0, 7); }, () => {
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * S * 0.34;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const s = S * (0.03 + r() * 0.04);
      if (lit) glow(g, x, y, s * 2.2, [255, 120, 30], 0.5);
      g.fillStyle = lit ? rgb([255, 140 + r() * 80, 40], 0.9) : rgb([50, 46, 44]);
      g.beginPath();
      g.ellipse(x, y, s, s * 0.8, r() * 3, 0, 7);
      g.fill();
    }
  });
  if (lit) flame(g, r, 0, 0, S * 0.5, 10, 1);
  // ben på kanten
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.28 + 0.5;
    rectBody(g, Math.cos(a) * S * 0.46 - S * 0.04, Math.sin(a) * S * 0.46 - S * 0.04, S * 0.08, S * 0.08, 2, [52, 48, 46], { lw: 1 });
  }
}

function campfire(g: G, o: DrawInput, big: boolean): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const lit = param(o, 'lit', true);
  if (lit) pool(g, r, S * (big ? 2.4 : 2.8), [255, 140, 50], 0.42);
  g.fillStyle = 'rgba(30,24,20,.7)';
  blobPath(g, holePts(r, S * 0.46, S * 0.46, 0.08, 12))();
  g.fill();
  // sten i ring
  const ns = 11;
  for (let i = 0; i < ns; i++) {
    const a = (i / ns) * 6.28 + r() * 0.2;
    polyBody(g, Array.from({ length: 7 }, (_, k): [number, number] => [Math.cos(a) * S * 0.42 + Math.cos(k * 0.9 + r() * 0.5) * S * 0.075, Math.sin(a) * S * 0.42 + Math.sin(k * 0.9 + r() * 0.5) * S * 0.065]), shift([126, 122, 116], (r() - 0.5) * 36), { lw: 1.2, ao: 1.5 });
  }
  glow(g, 0, 0, S * 0.35, [30, 20, 16], 0.8);
  // brænde
  const nl = big ? 7 : 5;
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * 6.28 + r() * 0.3;
    g.save();
    g.rotate(a);
    const L = S * (0.34 + r() * 0.06);
    rectBody(g, S * 0.02, -S * 0.045, L, S * 0.09, S * 0.04, [92, 62, 36], { lw: 1.2, light: 24 });
    g.save();
    g.beginPath();
    g.rect(S * 0.02, -S * 0.045, L, S * 0.09);
    g.clip();
    woodGrain(g, r, [S * 0.02, -S * 0.045, S * 0.02 + L, S * 0.045], [92, 62, 36], { lines: 3 });
    g.restore();
    if (lit) {
      const gr = g.createLinearGradient(S * 0.02, 0, S * 0.02 + L, 0);
      gr.addColorStop(0, 'rgba(255,120,30,.8)');
      gr.addColorStop(0.6, 'rgba(255,120,30,0)');
      g.fillStyle = gr;
      g.fillRect(S * 0.02, -S * 0.03, L, S * 0.06);
    }
    g.restore();
  }
  if (lit) {
    flame(g, r, 0, 0, S * (big ? 0.45 : 0.4), big ? 14 : 11);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = 'rgba(255,220,120,.9)';
      const a = r() * 6.3;
      const d = S * (0.2 + r() * 0.5);
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 1.4, 0, 7);
      g.fill();
    }
  } else {
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(${60 + r() * 30},${56 + r() * 20},52,.6)`;
      g.beginPath();
      g.ellipse((r() - 0.5) * S * 0.4, (r() - 0.5) * S * 0.4, S * 0.05, S * 0.03, r() * 3, 0, 7);
      g.fill();
    }
  }
}

function coals(g: G, o: DrawInput, molten: boolean): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const S = Math.min(rx, ry);
  const path = blobPath(g, holePts(r, rx * 0.82, ry * 0.82, 0.12, 14));
  glow(g, 0, 0, Math.max(rx, ry), [255, molten ? 150 : 100, 30], 0.4, Math.min(rx, ry));
  path();
  g.fillStyle = molten ? radial(g, 0, 0, Math.max(rx, ry), [[0, 'rgb(255,250,210)'], [0.4, 'rgb(255,200,70)'], [1, 'rgb(220,90,20)']]) : 'rgb(24,16,14)';
  g.fill();
  if (!molten) {
    clipped(g, path, () => {
      for (let i = 0; i < 44; i++) {
        const a = r() * 6.3;
        const d = Math.sqrt(r()) * 0.9;
        const x = Math.cos(a) * d * rx;
        const y = Math.sin(a) * d * ry;
        const s = S * (0.05 + r() * 0.08);
        glow(g, x, y, s * 2, [255, 110, 30], 0.4);
        polyBody(g, Array.from({ length: 6 }, (_, k): [number, number] => [x + Math.cos(k * 1.05 + r()) * s, y + Math.sin(k * 1.05 + r()) * s * 0.85]), r() < 0.5 ? [200, 60, 20] : [70, 40, 30], { lw: 0.8, ao: 0, rim: 0 });
        g.fillStyle = `rgba(255,${180 + r() * 60},80,.8)`;
        g.beginPath();
        g.arc(x - s * 0.15, y - s * 0.15, s * 0.3, 0, 7);
        g.fill();
      }
    });
  } else {
    clipped(g, path, () => {
      // skorpeplader flyder rundt
      for (let i = 0; i < 6; i++) {
        const a = r() * 6.3;
        const d = Math.sqrt(r()) * 0.6;
        const x = Math.cos(a) * d * rx;
        const y = Math.sin(a) * d * ry;
        const s = S * (0.12 + r() * 0.12);
        polyBody(g, Array.from({ length: 6 }, (_, k): [number, number] => [x + Math.cos(k * 1.05 + r() * 0.5) * s, y + Math.sin(k * 1.05 + r() * 0.5) * s * 0.8]), [150, 70, 30], { lw: 0.9, ao: 0, rim: 0, alpha: 0.9 });
      }
      g.strokeStyle = 'rgba(255,255,230,.75)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse((r() - 0.5) * rx * 0.8, (r() - 0.5) * ry * 0.8, S * (0.1 + r() * 0.2), S * 0.08, r() * 3, 0.2, 2.4);
        g.stroke();
      }
    });
  }
  path();
  g.strokeStyle = 'rgba(30,10,4,.85)';
  g.lineWidth = Math.max(1.4, S * 0.045);
  g.stroke();
}

function windowLight(g: G, o: DrawInput, kind2: 'window' | 'arched' | 'moon'): void {
  const t = kind2 === 'moon' ? { core: [236, 244, 255] as RGB, edge: [150, 190, 240] as RGB } : toneOf(o, 'warm');
  const { w, h } = o;
  const k = param(o, 'strength', 0.55);
  const skew = w * 0.22;
  // lysfeltet: forskudt parallelogram med korsformet sprosse-skygge, bløde kanter via flere lag
  const panes: [number, number, number, number][] = [];
  const cols = 2;
  const rows = kind2 === 'arched' ? 3 : 2;
  const gx = w * 0.04;
  const pw = (w * 0.8 - gx * (cols - 1)) / cols;
  const ph = (h * 0.8 - gx * (rows - 1)) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) panes.push([-w * 0.4 + i * (pw + gx), -h * 0.4 + j * (ph + gx), pw, ph]);
  for (const [grow, a] of [[0.1, 0.07], [0.06, 0.1], [0.03, 0.14], [0, 0.34]] as const) {
    for (const [x, y, pwid, phei] of panes) {
      const e = Math.min(w, h) * grow;
      g.beginPath();
      g.moveTo(x - e + skew * 0.2, y - e);
      g.lineTo(x + pwid + e + skew * 0.2, y - e);
      g.lineTo(x + pwid + e + skew, y + phei + e);
      g.lineTo(x - e + skew, y + phei + e);
      g.closePath();
      g.fillStyle = rgb(mix(t.core, t.edge, 0.3), a * k * 2);
      g.fill();
    }
  }
  glow(g, skew * 0.6, 0, Math.max(w, h) * 0.55, t.edge, 0.2 * k, Math.max(w, h) * 0.5);
}

function sunbeams(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const t = toneOf(o);
  const { w, h } = o;
  const n = 6;
  g.save();
  g.rotate(0.35);
  for (let i = 0; i < n; i++) {
    const x = -w * 0.4 + ((i + r() * 0.6) * w * 0.8) / n;
    const bw = w * (0.04 + r() * 0.06);
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, rgb(t.core, 0));
    gr.addColorStop(0.25, rgb(t.core, 0.3 + r() * 0.15));
    gr.addColorStop(0.7, rgb(t.core, 0.28));
    gr.addColorStop(1, rgb(t.core, 0));
    const gx = g.createLinearGradient(x - bw, 0, x + bw, 0);
    gx.addColorStop(0, rgb(t.core, 0));
    gx.addColorStop(0.5, rgb(t.core, 1));
    gx.addColorStop(1, rgb(t.core, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.rect(x - bw, -h / 2, bw * 2, h);
    // blød kant sidelæns: tegn smallere lag med mere alfa
    g.fill();
    g.fillStyle = gx;
    g.globalAlpha = 0.28;
    g.fillRect(x - bw, -h * 0.45, bw * 2, h * 0.9);
    g.globalAlpha = 1;
  }
  g.restore();
}

function dust(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const t = toneOf(o);
  const rx = o.w / 2;
  const ry = o.h / 2;
  glow(g, 0, 0, Math.max(rx, ry), t.core, 0.18, Math.min(rx, ry));
  const n = Math.round(Math.min(160, rx * ry * 0.02));
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * 0.9;
    const x = Math.cos(a) * d * rx;
    const y = Math.sin(a) * d * ry;
    const s = 0.6 + r() * 1.8;
    if (s > 1.8) glow(g, x, y, s * 3, t.core, 0.5);
    g.fillStyle = rgb(mix(t.core, [255, 255, 255], 0.5), 0.4 + r() * 0.5);
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.fill();
  }
}

/** Aflange, bløde røg- og dampbånd: kæde af bløde pletter, der vokser og bleger langs en bugtet kurve. */
function plume(g: G, o: DrawInput, steam: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col: RGB = steam ? [236, 240, 244] : [78, 74, 72];
  const n = 14;
  const ph = r() * 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = -w * 0.42 + t * w * 0.84;
    const y = Math.sin(t * 5 + ph) * h * 0.22 * (0.4 + t);
    const rad = h * (0.22 + t * 0.4) * (0.8 + r() * 0.4);
    glow(g, x, y, rad, col, (steam ? 0.42 : 0.4) * (1 - t * 0.85), rad * 0.85);
  }
  for (let k = 0; k < 6; k++) {
    const t = r();
    glow(g, -w * 0.42 + t * w * 0.84, (r() - 0.5) * h * 0.6, h * (0.2 + r() * 0.2), mix(col, steam ? [255, 255, 255] : [30, 28, 26], 0.5), 0.2 * (1 - t * 0.6));
  }
}

function sparks(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const t = toneOf(o);
  for (let i = 0; i < 34; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * 0.9;
    const x = Math.cos(a) * d * rx;
    const y = Math.sin(a) * d * ry;
    const an = r() * 6.3;
    const L = 2 + r() * Math.min(rx, ry) * 0.12;
    glow(g, x, y, L * 2.2, t.edge, 0.4);
    g.strokeStyle = rgb(t.core, 0.95);
    g.lineWidth = 1 + r();
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L);
    g.stroke();
  }
}

function crystalLamp(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const t = toneOf(o, 'cold');
  const S = Math.min(o.w, o.h);
  pool(g, r, S * 2.6, t.edge, 0.4);
  ellBody(g, 0, 0, S * 0.36, S * 0.36, [92, 88, 92], { lw: 1.5, light: 30 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28 + 0.3;
    const L = S * (0.28 + (i % 2) * 0.08);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    polyBody(g, [[dx * S * 0.04 - dy * S * 0.07, dy * S * 0.04 + dx * S * 0.07], [dx * L - dy * S * 0.03, dy * L + dx * S * 0.03], [dx * (L + S * 0.1), dy * (L + S * 0.1)], [dx * L + dy * S * 0.03, dy * L - dx * S * 0.03], [dx * S * 0.04 + dy * S * 0.07, dy * S * 0.04 - dx * S * 0.07]], mix(t.edge, t.core, 0.5), { lw: 1, ao: 0, light: 20 });
  }
  ellBody(g, 0, 0, S * 0.13, S * 0.13, mix(t.edge, t.core, 0.6), { lw: 1.1, light: 40 });
  glow(g, 0, 0, S * 0.2, t.core, 0.95);
}

const stren: ParamDef = { key: 'strength', label: 'Styrke', type: 'range', min: 0.2, max: 1, step: 0.05, default: 0.55 };
const lit: ParamDef = { key: 'lit', label: 'Tændt', type: 'toggle', default: true };
const lightC = { shadow: 0, layers: FX, tags: ['indoor', 'outdoor'] } as const;

export const lightKinds: ObjectKind[] = [
  kind({ key: 'lightx_wall_glow', family: 'lightx', name: 'Fakkelskær fra væg', w: 4, h: 3, keepAspect: false, bleed: 0.3, ...lightC, params: [toneParam()], tags: ['dungeon', 'indoor', 'crypt'], draw: wallGlow }),
  kind({ key: 'lightx_lantern', family: 'lightx', name: 'Lanterne på gulvet', w: 1, h: 1, bleed: 2.6, randomRotation: true, ...lightC, params: [toneParam()], tags: ['dungeon', 'camp', 'tavern', 'harbor'], draw: lanternFloor }),
  kind({ key: 'lightx_candelabra', family: 'lightx', name: 'Lysestage', w: 1.2, h: 1.2, bleed: 1.8, randomRotation: true, ...lightC, params: [toneParam(), { key: 'candles', label: 'Lys', type: 'range', min: 3, max: 7, step: 1, default: 5 }], tags: ['rich', 'temple', 'house', 'crypt'], draw: candelabra }),
  kind({ key: 'lightx_candles', family: 'lightx', name: 'Stearinlys', w: 1.2, h: 1.2, bleed: 1.2, randomRotation: true, ...lightC, params: [toneParam()], tags: ['house', 'temple', 'crypt', 'dungeon'], draw: candles }),
  kind({ key: 'lightx_brazier', family: 'lightx', name: 'Ildfad', w: 1.4, h: 1.4, bleed: 2, randomRotation: true, ...lightC, params: [lit], tags: ['dungeon', 'temple', 'military', 'city'], draw: brazier }),
  kind({ key: 'lightx_campfire', family: 'lightx', name: 'Bål med flammer', w: 1.8, h: 1.8, bleed: 1.4, randomRotation: true, ...lightC, params: [lit], tags: ['camp', 'forest', 'outdoor'], draw: (g, o) => campfire(g, o, false) }),
  kind({ key: 'lightx_bonfire', family: 'lightx', name: 'Stort bål', w: 3, h: 3, bleed: 1.1, randomRotation: true, ...lightC, params: [lit], tags: ['camp', 'village', 'outdoor', 'battlefield'], draw: (g, o) => campfire(g, o, true) }),
  kind({ key: 'lightx_coals', family: 'lightx', name: 'Glødende kul', w: 2, h: 1.6, bleed: 0.5, randomRotation: true, sizeJitter: 0.2, ...lightC, tags: ['camp', 'house', 'tavern', 'ruin'], draw: (g, o) => coals(g, o, false) }),
  kind({ key: 'lightx_molten', family: 'lightx', name: 'Smeltet metal', w: 1.8, h: 1.4, bleed: 0.5, randomRotation: true, ...lightC, tags: ['dungeon', 'city', 'cave'], draw: (g, o) => coals(g, o, true) }),
  kind({ key: 'lightx_window', family: 'lightx', name: 'Lys fra vindue', w: 3, h: 3.5, keepAspect: false, bleed: 0.25, randomRotation: true, ...lightC, params: [toneParam('warm'), stren], tags: ['house', 'tavern', 'temple', 'indoor'], draw: (g, o) => windowLight(g, o, 'window') }),
  kind({ key: 'lightx_window_arched', family: 'lightx', name: 'Lys fra højt vindue', w: 3, h: 4.5, keepAspect: false, bleed: 0.25, randomRotation: true, ...lightC, params: [toneParam('warm'), stren], tags: ['temple', 'ruin', 'rich', 'indoor'], draw: (g, o) => windowLight(g, o, 'arched') }),
  kind({ key: 'lightx_moonlight', family: 'lightx', name: 'Måneskin gennem vindue', w: 3, h: 3.5, keepAspect: false, bleed: 0.25, randomRotation: true, ...lightC, params: [stren], tags: ['house', 'crypt', 'ruin', 'indoor'], draw: (g, o) => windowLight(g, o, 'moon') }),
  kind({ key: 'lightx_sunbeams', family: 'lightx', name: 'Solstråler', w: 5, h: 5, keepAspect: false, bleed: 0.15, randomRotation: true, ...lightC, params: [toneParam('warm')], tags: ['forest', 'ruin', 'temple', 'cave'], draw: sunbeams }),
  kind({ key: 'lightx_dust', family: 'lightx', name: 'Støv i luften', w: 3, h: 3, bleed: 0.2, randomRotation: true, ...lightC, params: [toneParam('warm')], tags: ['ruin', 'dungeon', 'house', 'crypt'], draw: dust }),
  kind({ key: 'lightx_smoke', family: 'lightx', name: 'Røg', w: 5, h: 1.8, keepAspect: false, bleed: 0.4, randomRotation: true, ...lightC, tags: ['battlefield', 'camp', 'village', 'ruin'], draw: (g, o) => plume(g, o, false) }),
  kind({ key: 'lightx_steam', family: 'lightx', name: 'Damp', w: 4, h: 1.8, keepAspect: false, bleed: 0.4, randomRotation: true, ...lightC, tags: ['dungeon', 'cave', 'house', 'swamp'], draw: (g, o) => plume(g, o, true) }),
  kind({ key: 'lightx_sparks', family: 'lightx', name: 'Gnister', w: 2, h: 2, bleed: 0.3, randomRotation: true, ...lightC, params: [toneParam('warm')], tags: ['camp', 'city', 'battlefield', 'dungeon'], draw: sparks }),
  kind({ key: 'lightx_crystal_lamp', family: 'lightx', name: 'Krystallampe', w: 1.2, h: 1.2, bleed: 2.2, randomRotation: true, ...lightC, params: [toneParam('cold')], tags: ['magic', 'cave', 'dungeon', 'rich'], draw: crystalLamp }),
];

export { mottle };
