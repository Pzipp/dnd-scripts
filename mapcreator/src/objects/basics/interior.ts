import { param, type DrawInput } from '../registry';
import { blob, rgb, rng, roundRect, shift, smooth, type RGB } from '../util';
import { OUTLINE } from './helpers';

type G = CanvasRenderingContext2D;

/** Fælles træ- og metalhjælp til indretningen: planker med årer, knaster og søm, affasning og kanter. */
export const OAK: RGB = [150, 108, 66];
const IRON: RGB = [74, 72, 70];

/** Affasning langs en sti: lys kant øverst til venstre og skygge nederst til højre (inde i formen). */
export function bevel(g: G, path: () => void, s: number, light = 0.3, dark = 0.34): void {
  g.save();
  path();
  g.clip();
  g.translate(-s, -s);
  path();
  g.strokeStyle = `rgba(14,6,0,${dark})`;
  g.lineWidth = s * 2;
  g.stroke();
  g.translate(s * 2, s * 2);
  path();
  g.strokeStyle = `rgba(255,236,196,${light})`;
  g.stroke();
  g.restore();
}

/** Plankeflade: planker langs x (eller y), hver med egen tone, årer, samlinger, knaster og søm. */
export function woodSurface(g: G, x: number, y: number, w: number, h: number, base: RGB, r: () => number, O: { count?: number; vertical?: boolean; nails?: boolean; worn?: number; joints?: boolean } = {}): void {
  g.save();
  if (O.vertical) {
    g.translate(x + w / 2, y + h / 2);
    g.rotate(Math.PI / 2);
    [x, y, w, h] = [-h / 2, -w / 2, h, w];
  }
  const n = O.count ?? Math.max(2, Math.round(h / 14));
  const ph = h / n;
  const grainD: number[] = [];
  const grainL: number[] = [];
  for (let i = 0; i < n; i++) {
    const y0 = y + i * ph;
    const tone = shift(base, (r() - 0.5) * 22);
    const gr = g.createLinearGradient(0, y0, 0, y0 + ph);
    gr.addColorStop(0, rgb(shift(tone, 10)));
    gr.addColorStop(0.5, rgb(tone));
    gr.addColorStop(1, rgb(shift(tone, -12)));
    g.fillStyle = gr;
    g.fillRect(x, y0, w, ph + 0.5);
    // årer
    for (let k = 0; k < 3; k++) {
      const yy = y0 + ph * (0.2 + k * 0.28 + r() * 0.1);
      const a = r() * 3;
      const target = r() < 0.5 ? grainD : grainL;
      target.push(x, yy, a, ph);
    }
    // samling
    if (O.joints !== false && w > ph * 4 && r() < 0.6) {
      const jx = x + w * (0.25 + r() * 0.5);
      g.fillStyle = 'rgba(20,10,2,.5)';
      g.fillRect(jx, y0, Math.max(0.8, ph * 0.05), ph);
      if (O.nails !== false) {
        g.fillStyle = 'rgba(40,34,30,.8)';
        for (const dy of [0.28, 0.72]) {
          g.beginPath();
          g.arc(jx + ph * 0.18, y0 + ph * dy, Math.max(0.6, ph * 0.045), 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // knast
    if (r() < 0.35) {
      const kx = x + w * (0.1 + r() * 0.8);
      const ky = y0 + ph * (0.35 + r() * 0.3);
      g.fillStyle = 'rgba(40,20,6,.45)';
      g.beginPath();
      g.ellipse(kx, ky, ph * 0.18, ph * 0.12, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(40,20,6,.3)';
      g.lineWidth = Math.max(0.5, ph * 0.03);
      g.beginPath();
      g.ellipse(kx, ky, ph * 0.28, ph * 0.18, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // årer samlet i to stier
  for (const [arr, col] of [[grainD, 'rgba(40,20,6,.2)'], [grainL, 'rgba(255,236,196,.12)']] as const) {
    g.beginPath();
    for (let i = 0; i < arr.length; i += 4) {
      const gx = arr[i]!;
      const gy = arr[i + 1]!;
      const ga = arr[i + 2]!;
      const gp = arr[i + 3]!;
      g.moveTo(gx, gy);
      for (let s = 1; s <= 8; s++) g.lineTo(gx + (w * s) / 8, gy + Math.sin(ga + s * 0.8) * gp * 0.1);
    }
    g.strokeStyle = col;
    g.lineWidth = Math.max(0.5, ph * 0.05);
    g.stroke();
  }
  // fuger mellem planker
  for (let i = 1; i < n; i++) {
    const yy = y + i * ph;
    g.fillStyle = 'rgba(16,8,0,.5)';
    g.fillRect(x, yy - ph * 0.03, w, Math.max(0.8, ph * 0.06));
    g.fillStyle = 'rgba(255,236,196,.14)';
    g.fillRect(x, yy + ph * 0.03, w, Math.max(0.5, ph * 0.03));
  }
  if (O.worn) {
    g.strokeStyle = 'rgba(255,240,210,.12)';
    g.lineWidth = Math.max(0.6, ph * 0.05);
    for (let i = 0; i < O.worn * 6; i++) {
      const sx = x + r() * w;
      const sy = y + r() * h;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + (r() - 0.5) * ph * 1.2, sy + (r() - 0.5) * ph * 0.6);
      g.stroke();
    }
  }
  g.restore();
}

function rrPath(g: G, x: number, y: number, w: number, h: number, rad: number): () => void {
  return () => roundRect(g, x, y, w, h, rad);
}

/** Plankeplade med kant, affasning og kontur. */
function plankedBoard(g: G, x: number, y: number, w: number, h: number, rad: number, base: RGB, r: () => number, O: { count?: number; vertical?: boolean; lw?: number } = {}): void {
  const p = rrPath(g, x, y, w, h, rad);
  p();
  g.fillStyle = rgb(shift(base, -30));
  g.fill();
  g.save();
  p();
  g.clip();
  woodSurface(g, x, y, w, h, base, r, O);
  g.restore();
  bevel(g, p, Math.max(1, Math.min(w, h) * 0.04));
  p();
  g.strokeStyle = OUTLINE;
  g.lineWidth = O.lw ?? Math.max(1, Math.min(w, h) * 0.05);
  g.lineJoin = 'round';
  g.stroke();
}

// ------------------------------------------------------------------ borde

export function drawTable(g: G, o: DrawInput, round: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  if (round) {
    const R = S / 2;
    const p = () => {
      g.beginPath();
      g.ellipse(0, 0, R, R, 0, 0, Math.PI * 2);
    };
    p();
    g.fillStyle = rgb(shift(OAK, -34));
    g.fill();
    g.save();
    p();
    g.clip();
    woodSurface(g, -R, -R, R * 2, R * 2, OAK, r, { count: 8, joints: false });
    // ring af kantliste
    g.beginPath();
    g.arc(0, 0, R * 0.9, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(30,16,6,.35)';
    g.lineWidth = Math.max(1, R * 0.05);
    g.stroke();
    g.restore();
    bevel(g, p, Math.max(1, R * 0.06));
    p();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(1, R * 0.06);
    g.stroke();
    return;
  }
  const rad = S * 0.05;
  plankedBoard(g, -w / 2, -h / 2, w, h, rad, OAK, r, { count: Math.max(3, Math.round(h / 13)) });
  // lister langs kanten og afskallede ringe fra krus
  g.save();
  roundRect(g, -w / 2, -h / 2, w, h, rad);
  g.clip();
  g.strokeStyle = 'rgba(30,16,6,.3)';
  g.lineWidth = Math.max(0.8, S * 0.025);
  roundRect(g, -w / 2 + S * 0.07, -h / 2 + S * 0.07, w - S * 0.14, h - S * 0.14, rad);
  g.stroke();
  for (let i = 0; i < Math.max(1, Math.round(w / S)); i++) {
    g.strokeStyle = 'rgba(60,34,14,.22)';
    g.lineWidth = Math.max(0.6, S * 0.02);
    g.beginPath();
    g.arc((r() - 0.5) * w * 0.7, (r() - 0.5) * h * 0.5, S * 0.07, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ siddepladser

export function drawChair(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const s = Math.min(o.w, o.h);
  // ben (hjørnerne)
  g.fillStyle = rgb(shift(OAK, -52));
  for (const [x, y] of [[-0.4, -0.36], [0.3, -0.36], [-0.4, 0.3], [0.3, 0.3]] as const) {
    roundRect(g, s * x, s * y, s * 0.1, s * 0.1, s * 0.02);
    g.fill();
  }
  plankedBoard(g, -s * 0.38, -s * 0.32, s * 0.76, s * 0.7, s * 0.07, shift(OAK, -4), r, { count: 4, vertical: true, lw: s * 0.045 });
  // ryglæn: tyk top-skinne med rygpinde
  const back = rrPath(g, -s * 0.42, -s * 0.46, s * 0.84, s * 0.16, s * 0.05);
  back();
  const gr = g.createLinearGradient(0, -s * 0.46, 0, -s * 0.3);
  gr.addColorStop(0, rgb(shift(OAK, -4)));
  gr.addColorStop(1, rgb(shift(OAK, -50)));
  g.fillStyle = gr;
  g.fill();
  bevel(g, back, s * 0.03);
  back();
  g.strokeStyle = OUTLINE;
  g.lineWidth = s * 0.045;
  g.stroke();
  g.strokeStyle = 'rgba(255,236,196,.2)';
  g.lineWidth = s * 0.02;
  g.beginPath();
  g.moveTo(-s * 0.36, -s * 0.42);
  g.lineTo(s * 0.36, -s * 0.42);
  g.stroke();
}

export function drawStool(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  g.fillStyle = rgb(shift(OAK, -54));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.28 + 0.4;
    g.beginPath();
    g.arc(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78, R * 0.2, 0, Math.PI * 2);
    g.fill();
  }
  const p = () => {
    g.beginPath();
    g.arc(0, 0, R * 0.88, 0, Math.PI * 2);
  };
  p();
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.05, 0, 0, R);
  gr.addColorStop(0, rgb(shift(OAK, 22)));
  gr.addColorStop(1, rgb(shift(OAK, -34)));
  g.fillStyle = gr;
  g.fill();
  g.save();
  p();
  g.clip();
  g.strokeStyle = 'rgba(50,28,10,.3)';
  g.lineWidth = Math.max(0.6, R * 0.04);
  for (let i = 1; i <= 4; i++) {
    g.beginPath();
    g.ellipse((r() - 0.5) * R * 0.06, (r() - 0.5) * R * 0.06, R * i * 0.19, R * i * 0.18, r(), 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
  bevel(g, p, Math.max(1, R * 0.07));
  p();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.09);
  g.stroke();
}

export function drawBench(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  g.fillStyle = rgb(shift(OAK, -54));
  for (const x of [-0.38, 0.3]) {
    roundRect(g, w * x, -h * 0.5, w * 0.08, h, h * 0.05);
    g.fill();
  }
  plankedBoard(g, -w / 2, -h * 0.42, w, h * 0.84, h * 0.1, shift(OAK, -6), r, { count: 2 });
}

// ------------------------------------------------------------------ tønder

function ironRing(g: G, rr: number, lw: number): void {
  g.beginPath();
  g.arc(0, 0, rr, 0, Math.PI * 2);
  g.strokeStyle = OUTLINE;
  g.lineWidth = lw + 2;
  g.stroke();
  const gr = g.createLinearGradient(-rr, -rr, rr, rr);
  gr.addColorStop(0, rgb(shift(IRON, 56)));
  gr.addColorStop(0.5, rgb(IRON));
  gr.addColorStop(1, rgb(shift(IRON, -26)));
  g.beginPath();
  g.arc(0, 0, rr, 0, Math.PI * 2);
  g.strokeStyle = gr;
  g.lineWidth = lw;
  g.stroke();
}

export function drawBarrelUpright(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  // yderste stavekrans: smalle stave rundt om
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(OAK, -42));
  g.fill();
  const staves = 22;
  for (let i = 0; i < staves; i++) {
    const a0 = (i / staves) * 6.28;
    const a1 = ((i + 1) / staves) * 6.28;
    g.beginPath();
    g.arc(0, 0, R, a0, a1);
    g.arc(0, 0, R * 0.86, a1, a0, true);
    g.closePath();
    const lit = 0.5 + 0.5 * Math.cos((a0 + a1) / 2 + Math.PI * 0.75);
    g.fillStyle = rgb(shift(OAK, -36 + lit * 40 + (r() - 0.5) * 14));
    g.fill();
    g.strokeStyle = 'rgba(16,8,0,.55)';
    g.lineWidth = Math.max(0.6, R * 0.02);
    g.stroke();
  }
  // jernbånd
  ironRing(g, R * 0.945, Math.max(1.5, R * 0.07));
  // låg
  const lid = () => {
    g.beginPath();
    g.arc(0, 0, R * 0.84, 0, Math.PI * 2);
  };
  lid();
  g.fillStyle = rgb(shift(OAK, -22));
  g.fill();
  g.save();
  lid();
  g.clip();
  woodSurface(g, -R, -R, R * 2, R * 2, shift(OAK, 2), r, { count: 6, vertical: r() < 0.5, joints: false });
  g.restore();
  bevel(g, lid, Math.max(1, R * 0.05));
  lid();
  g.strokeStyle = 'rgba(16,8,0,.8)';
  g.lineWidth = Math.max(1, R * 0.05);
  g.stroke();
  // spunshul
  g.fillStyle = 'rgba(20,10,2,.8)';
  g.beginPath();
  g.arc(R * 0.2, -R * 0.12, R * 0.08, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,236,196,.3)';
  g.beginPath();
  g.arc(R * 0.18, -R * 0.14, R * 0.035, 0, Math.PI * 2);
  g.fill();
  // glans fra øverst til venstre
  const hl = g.createRadialGradient(-R * 0.4, -R * 0.4, 0, -R * 0.2, -R * 0.2, R * 0.9);
  hl.addColorStop(0, 'rgba(255,240,210,.22)');
  hl.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = hl;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
}

export function drawBarrelFallen(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const e = w * 0.07;
  const bulge = h * 0.06;
  const hh = (x: number): number => h / 2 - h * 0.05 + bulge * (1 - (2 * x / w) ** 2);
  const top: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -w / 2 + e + ((w - 2 * e) * i) / 12;
    top.push([x, -hh(x)]);
  }
  const body = () => {
    g.beginPath();
    top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.ellipse(w / 2 - e, 0, e, hh(w / 2), 0, -Math.PI / 2, Math.PI / 2);
    for (let i = 12; i >= 0; i--) g.lineTo(top[i]![0], -top[i]![1]);
    g.ellipse(-w / 2 + e, 0, e, hh(-w / 2), 0, Math.PI / 2, (Math.PI * 3) / 2);
    g.closePath();
  };
  body();
  const cg = g.createLinearGradient(0, -h / 2, 0, h / 2);
  cg.addColorStop(0, rgb(shift(OAK, 30)));
  cg.addColorStop(0.35, rgb(shift(OAK, 8)));
  cg.addColorStop(1, rgb(shift(OAK, -52)));
  g.fillStyle = cg;
  g.fill();
  g.save();
  body();
  g.clip();
  // stave: buede linjer langs tønden
  const nst = 7;
  for (let k = 1; k < nst; k++) {
    const f = -1 + (k / nst) * 2;
    g.beginPath();
    for (let i = 0; i <= 14; i++) {
      const x = -w / 2 + (w * i) / 14;
      const y = f * hh(x);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = 'rgba(16,8,0,.5)';
    g.lineWidth = Math.max(0.6, h * 0.025);
    g.stroke();
    // lysere stave
    if (r() < 0.5) {
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const x = -w / 2 + (w * i) / 14;
        const y = (f + 1 / nst / 2) * hh(x);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = `rgba(255,230,180,${0.1 + r() * 0.1})`;
      g.lineWidth = Math.max(0.8, h * 0.06);
      g.stroke();
    }
  }
  // jernbånd, buede med tønden
  for (const fx of [-0.3, 0.3]) {
    const x = w * fx;
    const bg = g.createLinearGradient(0, -hh(x), 0, hh(x));
    bg.addColorStop(0, rgb(shift(IRON, 62)));
    bg.addColorStop(0.5, rgb(IRON));
    bg.addColorStop(1, rgb(shift(IRON, -26)));
    g.fillStyle = bg;
    g.fillRect(x - w * 0.02, -hh(x), w * 0.04, hh(x) * 2);
  }
  // skygge og lys
  const sg = g.createLinearGradient(0, -h / 2, 0, h / 2);
  sg.addColorStop(0, 'rgba(255,240,200,.14)');
  sg.addColorStop(0.5, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(8,2,0,.34)');
  g.fillStyle = sg;
  g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();
  body();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, h * 0.06);
  g.lineJoin = 'round';
  g.stroke();
  // lågets ende
  const lg = g.createRadialGradient(w / 2 - e * 1.2, -h * 0.1, 0, w / 2 - e, 0, h * 0.5);
  lg.addColorStop(0, rgb(shift(OAK, 18)));
  lg.addColorStop(1, rgb(shift(OAK, -36)));
  g.beginPath();
  g.ellipse(w / 2 - e, 0, e * 0.95, hh(w / 2) * 0.88, 0, 0, Math.PI * 2);
  g.fillStyle = lg;
  g.fill();
  g.strokeStyle = 'rgba(16,8,0,.7)';
  g.lineWidth = Math.max(0.8, h * 0.04);
  g.stroke();
  g.beginPath();
  g.moveTo(w / 2 - e, -hh(w / 2) * 0.8);
  g.lineTo(w / 2 - e, hh(w / 2) * 0.8);
  g.strokeStyle = 'rgba(16,8,0,.4)';
  g.stroke();
}

/** En løs, splintret planke/stav med gradient og kontur. */
function shard(g: G, r: () => number, len: number, wid: number, base: RGB): void {
  const p = () => {
    g.beginPath();
    g.moveTo(-len / 2, -wid / 2 + (r() - 0.5) * wid * 0.2);
    g.lineTo(len / 2 - len * 0.12, -wid / 2);
    g.lineTo(len / 2 + (r() - 0.3) * len * 0.05, (r() - 0.5) * wid * 0.6);
    g.lineTo(len / 2 - len * 0.1, wid / 2);
    g.lineTo(-len / 2 + len * 0.06, wid / 2 + (r() - 0.5) * wid * 0.2);
    g.lineTo(-len / 2 - (r() * len) * 0.04, (r() - 0.5) * wid * 0.4);
    g.closePath();
  };
  p();
  const gr = g.createLinearGradient(0, -wid / 2, 0, wid / 2);
  const t = shift(base, (r() - 0.5) * 30);
  gr.addColorStop(0, rgb(shift(t, 22)));
  gr.addColorStop(1, rgb(shift(t, -26)));
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(40,20,6,.3)';
  g.lineWidth = Math.max(0.5, wid * 0.05);
  g.beginPath();
  g.moveTo(-len * 0.4, wid * 0.1);
  g.lineTo(len * 0.4, -wid * 0.05);
  g.stroke();
  p();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(0.8, wid * 0.14);
  g.lineJoin = 'round';
  g.stroke();
}

export function drawBarrelBroken(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  // spild
  smooth(g, blob(R * 0.72, R * 0.62, 0.3, 11, r, R * 0.1, R * 0.15));
  g.fillStyle = 'rgba(54,28,16,.42)';
  g.fill();
  smooth(g, blob(R * 0.5, R * 0.4, 0.3, 9, r, R * 0.15, R * 0.2));
  g.fillStyle = 'rgba(40,18,10,.35)';
  g.fill();
  // bund med stumper af stave
  g.save();
  g.translate(-R * 0.1, R * 0.05);
  g.beginPath();
  g.arc(0, 0, R * 0.55, 0, Math.PI * 2);
  const bg = g.createRadialGradient(-R * 0.2, -R * 0.2, 0, 0, 0, R * 0.6);
  bg.addColorStop(0, rgb(shift(OAK, 8)));
  bg.addColorStop(1, rgb(shift(OAK, -42)));
  g.fillStyle = bg;
  g.fill();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.05);
  g.stroke();
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(-R * 0.5, -R * 0.55 + i * R * 0.275);
    g.lineTo(R * 0.5, -R * 0.55 + i * R * 0.275);
    g.strokeStyle = 'rgba(16,8,0,.35)';
    g.lineWidth = Math.max(0.6, R * 0.02);
    g.stroke();
  }
  ironRing(g, R * 0.46, Math.max(1.2, R * 0.06));
  g.restore();
  // løse stave
  const list: { x: number; y: number; a: number; l: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (r() - 0.5) * 0.4;
    list.push({ x: Math.cos(a) * R * (0.35 + r() * 0.3), y: Math.sin(a) * R * (0.35 + r() * 0.3), a: a + (r() - 0.5) * 0.8, l: R * (0.5 + r() * 0.4) });
  }
  list.sort((p, q) => p.x + p.y - (q.x + q.y));
  for (const s of list) {
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.a);
    shard(g, r, s.l, R * 0.2, OAK);
    g.restore();
  }
  // brækket jernbånd
  g.beginPath();
  g.arc(R * 0.38, -R * 0.4, R * 0.3, 0.5, 5.1);
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(2, R * 0.1);
  g.stroke();
  g.strokeStyle = rgb(shift(IRON, 20));
  g.lineWidth = Math.max(1, R * 0.06);
  g.stroke();
}

// ------------------------------------------------------------------ kasser

function nailHeads(g: G, pts: [number, number][], s: number): void {
  g.fillStyle = 'rgba(30,26,24,.85)';
  g.beginPath();
  for (const [x, y] of pts) {
    g.moveTo(x + s, y);
    g.arc(x, y, s, 0, Math.PI * 2);
  }
  g.fill();
  g.fillStyle = 'rgba(255,240,210,.35)';
  g.beginPath();
  for (const [x, y] of pts) {
    g.moveTo(x - s * 0.3 + s * 0.4, y - s * 0.3);
    g.arc(x - s * 0.3, y - s * 0.3, s * 0.4, 0, Math.PI * 2);
  }
  g.fill();
}

export function drawCrate(g: G, o: DrawInput, mode: 'closed' | 'open'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  const b = S * 0.13;
  const outer = rrPath(g, -w / 2, -h / 2, w, h, S * 0.035);
  outer();
  g.fillStyle = rgb(shift(OAK, -46));
  g.fill();
  if (mode === 'closed') {
    // planker på tværs
    g.save();
    outer();
    g.clip();
    woodSurface(g, -w / 2, -h / 2, w, h, shift(OAK, -10), r, { count: 5, vertical: r() < 0.5, joints: false });
    g.restore();
  } else {
    // åben: kassens vægge og mørkt indre med halm
    g.save();
    outer();
    g.clip();
    woodSurface(g, -w / 2, -h / 2, w, h, shift(OAK, -14), r, { count: 6, joints: false });
    g.restore();
    const inner = rrPath(g, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, S * 0.02);
    inner();
    g.fillStyle = 'rgb(30,19,10)';
    g.fill();
    g.save();
    inner();
    g.clip();
    // indre skygge fra vægge
    const sg = g.createLinearGradient(-w / 2 + b, -h / 2 + b, w / 2, h / 2);
    sg.addColorStop(0, 'rgba(0,0,0,.6)');
    sg.addColorStop(0.5, 'rgba(0,0,0,.15)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg;
    g.fillRect(-w / 2, -h / 2, w, h);
    const cols: RGB[] = [[170, 140, 66], [206, 178, 94], [236, 212, 130]];
    for (const c of cols) {
      g.beginPath();
      for (let i = 0; i < 26; i++) {
        const x = (r() - 0.5) * (w - 3 * b);
        const y = (r() - 0.5) * (h - 3 * b);
        const a = r() * 6.28;
        const l = S * (0.1 + r() * 0.16);
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * l * 0.3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      g.strokeStyle = rgb(c, 0.9);
      g.lineWidth = Math.max(0.7, S * 0.022);
      g.lineCap = 'round';
      g.stroke();
    }
    g.restore();
    bevel(g, inner, S * 0.03, 0.12, 0.5);
  }
  // kantbrædder (rammen)
  const frame = () => {
    g.beginPath();
    g.rect(-w / 2, -h / 2, w, h);
    g.rect(-w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b);
  };
  if (mode === 'closed') {
    g.save();
    outer();
    g.clip();
    g.save();
    frame();
    g.clip('evenodd');
    woodSurface(g, -w / 2, -h / 2, w, h, shift(OAK, -34), r, { count: Math.max(6, Math.round(S / 7)), vertical: false, joints: false });
    g.restore();
    // krydsafstivning
    const diag = (x1: number, y1: number, x2: number, y2: number) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      const l = Math.hypot(x2 - x1, y2 - y1);
      g.save();
      g.translate((x1 + x2) / 2, (y1 + y2) / 2);
      g.rotate(a);
      g.beginPath();
      g.rect(-l / 2, -b * 0.42, l, b * 0.84);
      const gg = g.createLinearGradient(0, -b * 0.42, 0, b * 0.42);
      gg.addColorStop(0, rgb(shift(OAK, -18)));
      gg.addColorStop(1, rgb(shift(OAK, -52)));
      g.fillStyle = gg;
      g.fill();
      g.strokeStyle = 'rgba(16,8,0,.7)';
      g.lineWidth = Math.max(0.8, S * 0.03);
      g.stroke();
      g.restore();
    };
    diag(-w / 2 + b, -h / 2 + b, w / 2 - b, h / 2 - b);
    diag(w / 2 - b, -h / 2 + b, -w / 2 + b, h / 2 - b);
    g.restore();
  } else {
    g.save();
    frame();
    g.clip('evenodd');
    woodSurface(g, -w / 2, -h / 2, w, h, shift(OAK, -30), r, { count: Math.max(6, Math.round(S / 7)), joints: false });
    g.restore();
  }
  // søm i hjørnerne
  const nh: [number, number][] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) nh.push([sx * (w / 2 - b * 0.5), sy * (h / 2 - b * 0.5)]);
  nailHeads(g, nh, Math.max(0.8, S * 0.025));
  bevel(g, outer, S * 0.035);
  outer();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, S * 0.045);
  g.stroke();
}

export function drawCrateBroken(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const list: { x: number; y: number; a: number; l: number; w: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * S * 0.4;
    list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, a: r() * Math.PI, l: S * (0.3 + r() * 0.38), w: S * (0.09 + r() * 0.04) });
  }
  list.sort((p, q) => p.x + p.y - (q.x + q.y));
  for (const s of list) {
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.a);
    shard(g, r, s.l, s.w, shift(OAK, -8));
    nailHeads(g, [[-s.l * 0.38, 0], [s.l * 0.3, 0]], Math.max(0.7, S * 0.02));
    g.restore();
  }
}

// ------------------------------------------------------------------ kister

function brass(g: G, x: number, y: number, w: number, h: number, rad: number): void {
  roundRect(g, x, y, w, h, rad);
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, 'rgb(248,220,120)');
  gr.addColorStop(0.5, 'rgb(208,160,50)');
  gr.addColorStop(1, 'rgb(130,92,24)');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(40,22,4,.85)';
  g.lineWidth = Math.max(0.7, Math.min(w, h) * 0.08);
  g.stroke();
}

function ironBand(g: G, x: number, y: number, w: number, h: number): void {
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, rgb(shift(IRON, 56)));
  gr.addColorStop(0.5, rgb(IRON));
  gr.addColorStop(1, rgb(shift(IRON, -22)));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(10,8,6,.9)';
  g.lineWidth = 0.8;
  g.strokeRect(x, y, w, h);
}

function coins(g: G, r: () => number, cx: number, cy: number, rx: number, ry: number, n: number, s: number): void {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r());
    pts.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * 0.9, s * (0.85 + r() * 0.35)]);
  }
  pts.sort((p, q) => p[1] - q[1]);
  for (const [x, y, rr] of pts) {
    const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, 0, x, y, rr);
    gr.addColorStop(0, 'rgb(255,238,150)');
    gr.addColorStop(0.55, 'rgb(220,170,52)');
    gr.addColorStop(1, 'rgb(140,98,24)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(60,34,6,.6)';
    g.lineWidth = Math.max(0.4, rr * 0.18);
    g.stroke();
  }
  // enkelte ædelsten
  const gems: RGB[] = [[200, 36, 52], [46, 120, 210], [40, 170, 96]];
  for (let i = 0; i < 3; i++) {
    const x = cx + (r() - 0.5) * rx * 1.3;
    const y = cy + (r() - 0.5) * ry * 1.1;
    const c = gems[i]!;
    g.fillStyle = rgb(c);
    g.beginPath();
    g.moveTo(x, y - s * 1.1);
    g.lineTo(x + s * 0.9, y);
    g.lineTo(x, y + s * 1.1);
    g.lineTo(x - s * 0.9, y);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(20,10,10,.8)';
    g.lineWidth = Math.max(0.5, s * 0.2);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath();
    g.arc(x - s * 0.25, y - s * 0.3, s * 0.25, 0, Math.PI * 2);
    g.fill();
  }
}

export function drawChest(g: G, o: DrawInput, mode: 'closed' | 'open' | 'broken'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  const rad = h * 0.1;
  const wood = shift(OAK, -22);
  if (mode === 'closed') {
    const body = rrPath(g, -w / 2, -h / 2, w, h, rad);
    body();
    g.fillStyle = rgb(shift(wood, -30));
    g.fill();
    g.save();
    body();
    g.clip();
    woodSurface(g, -w / 2, -h / 2, w, h, wood, r, { count: 5, joints: false });
    // buet låg: cylinder-lys langs bredden
    const cg = g.createLinearGradient(0, -h / 2, 0, h / 2);
    cg.addColorStop(0, 'rgba(255,236,196,.3)');
    cg.addColorStop(0.35, 'rgba(255,236,196,.05)');
    cg.addColorStop(0.7, 'rgba(0,0,0,.12)');
    cg.addColorStop(1, 'rgba(0,0,0,.4)');
    g.fillStyle = cg;
    g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
    for (const fx of [-0.34, 0.34]) ironBand(g, w * fx - w * 0.045, -h / 2, w * 0.09, h);
    // metalkanter foran og bagpå
    ironBand(g, -w / 2, -h / 2, w, h * 0.06);
    ironBand(g, -w / 2, h / 2 - h * 0.06, w, h * 0.06);
    const rv: [number, number][] = [];
    for (const fx of [-0.34, 0.34]) for (const fy of [-0.36, 0.36]) rv.push([w * fx, h * fy]);
    nailHeads(g, rv, Math.max(0.8, S * 0.035));
    // lås
    brass(g, -w * 0.06, -h * 0.14, w * 0.12, h * 0.3, S * 0.03);
    g.fillStyle = 'rgba(20,10,2,.9)';
    g.beginPath();
    g.arc(0, -h * 0.03, S * 0.025, 0, Math.PI * 2);
    g.fill();
    g.fillRect(-S * 0.008, -h * 0.03, S * 0.016, S * 0.06);
    // hængsler (bagkant)
    // sidehåndtag
    for (const sx of [-1, 1]) {
      g.strokeStyle = rgb(shift(IRON, 20));
      g.lineWidth = Math.max(1, S * 0.04);
      g.beginPath();
      g.moveTo(sx * (w / 2 - w * 0.006), -h * 0.1);
      g.lineTo(sx * (w / 2 + w * 0.012), 0);
      g.lineTo(sx * (w / 2 - w * 0.006), h * 0.1);
      g.stroke();
    }
    bevel(g, body, Math.max(1, S * 0.04));
    body();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(1, S * 0.06);
    g.stroke();
    return;
  }
  // åben / knust: kiste set med åbent låg
  if (mode === 'open') {
    // låget klappet op bagved (øverst), set indefra
    const lid = rrPath(g, -w / 2, -h / 2 - h * 0.11, w, h * 0.21, h * 0.07);
    lid();
    g.fillStyle = 'rgb(86,26,34)';
    g.fill();
    g.save();
    lid();
    g.clip();
    const lg = g.createLinearGradient(0, -h / 2 - h * 0.11, 0, -h / 2 + h * 0.1);
    lg.addColorStop(0, 'rgba(255,200,200,.18)');
    lg.addColorStop(1, 'rgba(0,0,0,.5)');
    g.fillStyle = lg;
    g.fillRect(-w / 2, -h / 2 - h * 0.2, w, h * 0.4);
    g.restore();
    g.strokeStyle = rgb(shift(wood, -10));
    g.lineWidth = Math.max(1.5, S * 0.07);
    lid();
    g.stroke();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(1, S * 0.03);
    lid();
    g.stroke();
  }
  const body = rrPath(g, -w / 2, -h / 2 + h * 0.06, w, h * 0.94, rad);
  body();
  g.fillStyle = rgb(shift(wood, -30));
  g.fill();
  const inner = rrPath(g, -w / 2 + w * 0.06, -h / 2 + h * 0.14, w * 0.88, h * 0.78, rad * 0.7);
  g.save();
  body();
  g.clip();
  woodSurface(g, -w / 2, -h / 2 + h * 0.06, w, h * 0.94, wood, r, { count: 5, joints: false });
  g.restore();
  inner();
  g.fillStyle = 'rgb(54,16,26)';
  g.fill();
  g.save();
  inner();
  g.clip();
  const sh = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  sh.addColorStop(0, 'rgba(0,0,0,.65)');
  sh.addColorStop(0.6, 'rgba(0,0,0,.1)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.fillRect(-w / 2, -h / 2, w, h);
  if (mode === 'open') {
    coins(g, r, 0, h * 0.04, w * 0.34, h * 0.26, 40, S * 0.045);
  } else {
    coins(g, r, w * 0.18, h * 0.12, w * 0.12, h * 0.1, 5, S * 0.04);
  }
  g.restore();
  bevel(g, inner, Math.max(1, S * 0.035), 0.1, 0.5);
  for (const fx of [-0.34, 0.34]) ironBand(g, w * fx - w * 0.045, -h / 2 + h * 0.06, w * 0.09, h * 0.94);
  nailHeads(g, [[-w * 0.34, -h * 0.34], [w * 0.34, -h * 0.34], [-w * 0.34, h * 0.4], [w * 0.34, h * 0.4]], Math.max(0.8, S * 0.035));
  bevel(g, body, Math.max(1, S * 0.04));
  body();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, S * 0.06);
  g.stroke();
  if (mode === 'broken') {
    // flækkede planker og sprængt lås
    for (let i = 0; i < 5; i++) {
      g.save();
      g.translate((r() - 0.5) * w * 1.0, (r() - 0.5) * h * 1.0);
      g.rotate(r() * Math.PI);
      shard(g, r, w * (0.22 + r() * 0.16), h * 0.1, wood);
      g.restore();
    }
    g.save();
    g.translate(w * 0.05, h * 0.1);
    g.rotate(0.6);
    brass(g, -w * 0.05, -h * 0.07, w * 0.1, h * 0.14, 2);
    g.restore();
  }
}

// ------------------------------------------------------------------ senge

const BLANKET: Record<string, RGB> = { red: [150, 42, 42], blue: [52, 84, 150], green: [56, 112, 68], brown: [122, 90, 56] };

function fabricFolds(g: G, r: () => number, x: number, y: number, w: number, h: number, n: number): void {
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const fy = y + h * (0.1 + (i / n) * 0.8) + (r() - 0.5) * h * 0.06;
    g.beginPath();
    g.moveTo(x, fy);
    g.quadraticCurveTo(x + w * 0.5, fy + (r() - 0.5) * h * 0.1, x + w, fy + (r() - 0.5) * h * 0.04);
    g.strokeStyle = 'rgba(0,0,0,.16)';
    g.lineWidth = Math.max(1, h * 0.03);
    g.stroke();
    g.translate(0, h * 0.02);
    g.strokeStyle = 'rgba(255,255,255,.1)';
    g.stroke();
    g.translate(0, -h * 0.02);
  }
  g.restore();
}

export function drawBed(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col = BLANKET[param(o, 'blanket', 'red')] ?? BLANKET.red!;
  const frame = rrPath(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.05);
  frame();
  g.fillStyle = rgb(shift(OAK, -40));
  g.fill();
  g.save();
  frame();
  g.clip();
  woodSurface(g, -w / 2, -h / 2, w, h, shift(OAK, -26), r, { count: 6, vertical: true, joints: false });
  g.restore();
  // sengegavl øverst
  const head = rrPath(g, -w / 2, -h / 2, w, h * 0.07, 3);
  head();
  g.fillStyle = rgb(shift(OAK, -44));
  g.fill();
  bevel(g, frame, Math.max(1, w * 0.04));
  frame();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, w * 0.05);
  g.stroke();
  // madras
  const m = w * 0.08;
  const mat = rrPath(g, -w / 2 + m, -h / 2 + h * 0.08, w - 2 * m, h - h * 0.08 - m, w * 0.05);
  mat();
  const mg = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  mg.addColorStop(0, 'rgb(244,238,224)');
  mg.addColorStop(1, 'rgb(206,198,180)');
  g.fillStyle = mg;
  g.fill();
  g.strokeStyle = 'rgba(40,30,20,.5)';
  g.lineWidth = Math.max(0.8, w * 0.02);
  g.stroke();
  // tæppe: en fold ned over fodenden
  const bx = -w / 2 + m;
  const bw = w - 2 * m;
  const by = -h / 2 + h * 0.34;
  const bh = h - h * 0.34 - m + h * 0.01;
  const blk = rrPath(g, bx - w * 0.015, by, bw + w * 0.03, bh, w * 0.05);
  blk();
  g.fillStyle = rgb(col);
  g.fill();
  g.save();
  blk();
  g.clip();
  const bg = g.createLinearGradient(bx, by, bx + bw, by + bh);
  bg.addColorStop(0, rgb(shift(col, 26)));
  bg.addColorStop(0.55, rgb(col));
  bg.addColorStop(1, rgb(shift(col, -34)));
  g.fillStyle = bg;
  g.fillRect(bx - 4, by, bw + 8, bh);
  // vævede striber
  g.fillStyle = rgb(shift(col, -26), 0.55);
  for (const f of [0.1, 0.16, 0.7, 0.76]) g.fillRect(bx - 4, by + bh * f, bw + 8, bh * 0.025);
  fabricFolds(g, r, bx, by, bw, bh, 4);
  g.restore();
  // foldekant
  g.fillStyle = rgb(shift(col, 34), 0.7);
  g.fillRect(bx - w * 0.01, by, bw + w * 0.02, h * 0.04);
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(bx - w * 0.01, by + h * 0.04, bw + w * 0.02, h * 0.012);
  blk();
  g.strokeStyle = rgb(shift(col, -60), 0.9);
  g.lineWidth = Math.max(0.8, w * 0.02);
  g.stroke();
  // pude
  const pill = rrPath(g, -w / 2 + m * 1.5, -h / 2 + h * 0.1, w - 3 * m, h * 0.2, w * 0.14);
  pill();
  const pg = g.createRadialGradient(-w * 0.15, -h * 0.4, 0, 0, -h * 0.36, w * 0.5);
  pg.addColorStop(0, 'rgb(255,254,248)');
  pg.addColorStop(1, 'rgb(214,208,192)');
  g.fillStyle = pg;
  g.fill();
  g.strokeStyle = 'rgba(40,30,20,.45)';
  g.lineWidth = Math.max(0.8, w * 0.02);
  g.stroke();
  g.strokeStyle = 'rgba(80,70,50,.25)';
  g.lineWidth = Math.max(0.6, w * 0.015);
  g.beginPath();
  g.moveTo(-w * 0.2, -h * 0.4);
  g.quadraticCurveTo(0, -h * 0.36, w * 0.2, -h * 0.4);
  g.stroke();
}

export function drawBedroll(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col = BLANKET[param(o, 'blanket', 'green')] ?? BLANKET.green!;
  const body = rrPath(g, -w / 2, -h / 2, w, h, w * 0.3);
  body();
  const bg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  bg.addColorStop(0, rgb(shift(col, 30)));
  bg.addColorStop(0.5, rgb(shift(col, 6)));
  bg.addColorStop(1, rgb(shift(col, -42)));
  g.fillStyle = bg;
  g.fill();
  g.save();
  body();
  g.clip();
  // stikkede sektioner på tværs
  for (let i = 1; i < 6; i++) {
    const y = -h * 0.2 + (i / 6) * h * 0.75;
    g.beginPath();
    g.moveTo(-w / 2, y);
    g.quadraticCurveTo(0, y + h * 0.015, w / 2, y);
    g.strokeStyle = rgb(shift(col, -50), 0.55);
    g.lineWidth = Math.max(0.8, w * 0.03);
    g.stroke();
    g.translate(0, w * 0.03);
    g.strokeStyle = rgb(shift(col, 40), 0.3);
    g.stroke();
    g.translate(0, -w * 0.03);
  }
  // længdefold
  g.strokeStyle = 'rgba(0,0,0,.18)';
  g.lineWidth = Math.max(1, w * 0.05);
  g.beginPath();
  g.moveTo(w * 0.1, -h * 0.2);
  g.quadraticCurveTo(w * 0.15, h * 0.1, w * 0.08, h / 2);
  g.stroke();
  fabricFolds(g, r, -w / 2, -h / 2, w, h, 3);
  g.restore();
  bevel(g, body, Math.max(1, w * 0.05), 0.2, 0.3);
  body();
  g.strokeStyle = rgb(shift(col, -78), 0.95);
  g.lineWidth = Math.max(1, w * 0.045);
  g.stroke();
  // hovedpude
  const pill = rrPath(g, -w * 0.38, -h * 0.46, w * 0.76, h * 0.2, w * 0.12);
  pill();
  const pg = g.createRadialGradient(-w * 0.1, -h * 0.4, 0, 0, -h * 0.36, w * 0.45);
  pg.addColorStop(0, 'rgb(246,236,210)');
  pg.addColorStop(1, 'rgb(196,184,152)');
  g.fillStyle = pg;
  g.fill();
  g.strokeStyle = 'rgba(40,30,16,.5)';
  g.lineWidth = Math.max(0.8, w * 0.025);
  g.stroke();
  // rem
  g.fillStyle = 'rgb(96,66,36)';
  g.fillRect(-w / 2 - 1, h * 0.28, w + 2, h * 0.04);
  g.fillStyle = 'rgb(206,170,60)';
  g.fillRect(-w * 0.03, h * 0.275, w * 0.06, h * 0.05);
}
