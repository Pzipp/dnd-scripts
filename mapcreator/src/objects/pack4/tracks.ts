import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { clamp, lerp, rf, rng, smoothstep, type G } from './common';

/** Spor og mærker i jorden: hjulspor, fodspor, dyrespor, slæbespor, blod og brændte spor. Flade mærker uden skygge, lys fra øverst til venstre (kantlys nederst til højre, mørk bund øverst til venstre). */

type Rnd = () => number;

interface Ground {
  /** Bundens mørke farve (rgb-streng uden alfa). */
  dark: string;
  /** Kantlys. */
  rim: string;
  rimA: number;
  darkA: number;
}

const GROUNDS: Record<string, Ground> = {
  mud: { dark: '38,24,12', rim: '255,226,180', rimA: 0.3, darkA: 0.5 },
  snow: { dark: '70,92,140', rim: '255,255,255', rimA: 0.8, darkA: 0.5 },
  sand: { dark: '120,86,40', rim: '255,240,200', rimA: 0.5, darkA: 0.42 },
  dust: { dark: '70,60,48', rim: '240,230,210', rimA: 0.35, darkA: 0.36 },
};

const groundP: ParamDef = { key: 'ground', label: 'Underlag', type: 'select', default: 'mud', options: [{ value: 'mud', label: 'Mudder' }, { value: 'snow', label: 'Sne' }, { value: 'sand', label: 'Sand' }, { value: 'dust', label: 'Tør jord' }] };
const groundOf = (o: DrawInput): Ground => GROUNDS[param(o, 'ground', 'mud')] ?? GROUNDS.mud!;

/** Et mærke med dybde: kantlys forskudt nederst til højre, mørk bund med skygge mod øverst til venstre. `shape` lægger delstier på den aktuelle sti. */
function imprint(g: G, gr: Ground, s: number, shape: () => void, alpha = 1): void {
  g.save();
  g.translate(s * 0.06, s * 0.08);
  g.beginPath();
  shape();
  g.fillStyle = `rgba(${gr.rim},${gr.rimA * alpha})`;
  g.fill();
  g.restore();
  g.beginPath();
  shape();
  const grad = g.createLinearGradient(-s * 0.5, -s * 0.4, s * 0.5, s * 0.4);
  grad.addColorStop(0, `rgba(${gr.dark},${gr.darkA * alpha * 1.25})`);
  grad.addColorStop(1, `rgba(${gr.dark},${gr.darkA * alpha * 0.55})`);
  g.fillStyle = grad;
  g.fill('nonzero');
  g.strokeStyle = `rgba(${gr.dark},${0.35 * alpha})`;
  g.lineWidth = Math.max(0.5, s * 0.03);
  g.stroke();
}

/** Toner begge ender af sporet ud (alfa-maske over hele sprite'n). */
function fadeEnds(g: G, w: number, h: number, a = 0.14): void {
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const m = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  m.addColorStop(0, 'rgba(0,0,0,0)');
  m.addColorStop(a, 'rgba(0,0,0,1)');
  m.addColorStop(1 - a, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(-w, -h, w * 2, h * 2);
  g.restore();
}

const line = (g: G, pts: [number, number][], dx: number, dy: number, col: string, wd: number): void => {
  g.beginPath();
  pts.forEach((q, i) => (i ? g.lineTo(q[0] + dx, q[1] + dy) : g.moveTo(q[0] + dx, q[1] + dy)));
  g.strokeStyle = col;
  g.lineWidth = wd;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
};

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0): void => {
  // ellipse som delsti (moveTo før, så den ikke forbindes med forrige)
  g_.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
  g_.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
};
let g_: G;
const withG = (g: G, fn: () => void): void => {
  g_ = g;
  fn();
};

type PrintKind = 'boot' | 'bare' | 'cat' | 'wolf' | 'bear' | 'horse' | 'ox' | 'claw';

function printShape(k: PrintKind, s: number, mirror: number): () => void {
  const m = mirror;
  switch (k) {
    case 'boot':
      return () => {
        ell(-0.38 * s, 0, 0.14 * s, 0.14 * s);
        g_.moveTo(-0.16 * s, -0.13 * s);
        g_.bezierCurveTo(0, -0.12 * s, 0.05 * s, -0.22 * s, 0.28 * s, -0.22 * s);
        g_.quadraticCurveTo(0.58 * s, -0.2 * s, 0.58 * s, 0);
        g_.quadraticCurveTo(0.58 * s, 0.2 * s, 0.28 * s, 0.22 * s);
        g_.bezierCurveTo(0.05 * s, 0.22 * s, 0, 0.12 * s, -0.16 * s, 0.13 * s);
        g_.closePath();
      };
    case 'bare':
      return () => {
        ell(-0.28 * s, 0, 0.18 * s, 0.13 * s);
        ell(0.05 * s, 0, 0.3 * s, 0.14 * s);
        ell(0.2 * s, m * 0.02 * s, 0.2 * s, 0.2 * s);
        for (let i = 0; i < 5; i++) ell((0.46 - Math.abs(i - 2) * 0.03) * s + (m > 0 ? 0 : 0), (i - 2) * 0.09 * s, 0.05 * s * (1 - i * 0.05), 0.05 * s * (1 - i * 0.05));
      };
    case 'cat':
      return () => {
        ell(-0.1 * s, 0, 0.22 * s, 0.18 * s);
        for (let i = 0; i < 4; i++) {
          const a = lerp(-0.9, 0.9, i / 3);
          ell(0.2 * s + Math.cos(a) * 0.08 * s, Math.sin(a) * 0.32 * s, 0.09 * s, 0.1 * s);
        }
      };
    case 'wolf':
      return () => {
        ell(-0.12 * s, 0, 0.24 * s, 0.2 * s);
        for (let i = 0; i < 4; i++) {
          const a = lerp(-1, 1, i / 3);
          ell(0.2 * s + Math.cos(a) * 0.1 * s, Math.sin(a) * 0.36 * s, 0.1 * s, 0.075 * s);
          // klo
          g_.moveTo(0.3 * s + Math.cos(a) * 0.1 * s, Math.sin(a) * 0.36 * s - 0.01 * s);
          g_.lineTo(0.42 * s + Math.cos(a) * 0.1 * s, Math.sin(a) * 0.4 * s);
          g_.lineTo(0.3 * s + Math.cos(a) * 0.1 * s, Math.sin(a) * 0.36 * s + 0.02 * s);
        }
      };
    case 'bear':
      return () => {
        ell(-0.1 * s, 0, 0.42 * s, 0.3 * s);
        for (let i = 0; i < 5; i++) {
          const a = lerp(-1.05, 1.05, i / 4);
          ell(0.36 * s + Math.cos(a) * 0.07 * s, Math.sin(a) * 0.4 * s, 0.075 * s, 0.075 * s);
          g_.moveTo(0.44 * s, Math.sin(a) * 0.4 * s - 0.015 * s);
          g_.lineTo(0.62 * s + Math.cos(a) * 0.06 * s, Math.sin(a) * 0.46 * s);
          g_.lineTo(0.44 * s, Math.sin(a) * 0.4 * s + 0.015 * s);
        }
      };
    case 'horse':
      return () => {
        g_.arc(0, 0, 0.5 * s, Math.PI - 0.6, -(Math.PI - 0.6), true);
        g_.arc(0, 0, 0.28 * s, -(Math.PI - 0.6), Math.PI - 0.6, false);
        g_.closePath();
      };
    case 'ox':
      return () => {
        ell(0, -0.2 * s, 0.36 * s, 0.17 * s, 0.12);
        ell(0, 0.2 * s, 0.36 * s, 0.17 * s, -0.12);
      };
    case 'claw':
      return () => {
        ell(-0.2 * s, 0, 0.3 * s, 0.34 * s);
        for (let i = 0; i < 3; i++) {
          const y = (i - 1) * 0.28 * s;
          ell(0.26 * s, y, 0.17 * s, 0.1 * s);
          g_.moveTo(0.38 * s, y - 0.045 * s);
          g_.lineTo(0.78 * s, y + (i - 1) * 0.06 * s);
          g_.lineTo(0.38 * s, y + 0.045 * s);
        }
      };
  }
}

const PRINT: Record<PrintKind, { size: number; stride: number; side: number; paired?: boolean }> = {
  boot: { size: 26, stride: 2.9, side: 0.45 },
  bare: { size: 26, stride: 2.9, side: 0.4 },
  cat: { size: 17, stride: 2.8, side: 0.5 },
  wolf: { size: 22, stride: 2.9, side: 0.6 },
  bear: { size: 38, stride: 2.5, side: 0.65 },
  horse: { size: 27, stride: 2.9, side: 0.7, paired: true },
  ox: { size: 30, stride: 2.8, side: 0.7, paired: true },
  claw: { size: 44, stride: 2.4, side: 0.85 },
};

/** En række spor langs x: skiftevis venstre og højre, let uregelmæssig. */
function printRow(g: G, o: DrawInput, k: PrintKind, scale = 1): void {
  const r = rng(o.seed);
  const gr = groundOf(o);
  const spec = PRINT[k];
  const s = spec.size * scale;
  const stride = s * spec.stride;
  const n = Math.max(2, Math.floor(o.w / stride));
  const x0 = -(n - 1) * stride * 0.5;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const x = x0 + i * stride + rf(r, -0.12, 0.12) * s;
    const y = side * s * spec.side * 0.5 + rf(r, -0.1, 0.1) * s;
    const rot = rf(r, -0.14, 0.14) + side * 0.05;
    const fade = i === 0 || i === n - 1 ? 0.8 : 1;
    const pairs = spec.paired ? 2 : 1;
    for (let p = 0; p < pairs; p++) {
      g.save();
      g.translate(x + (p ? -s * 0.35 : 0), y + (p ? side * s * 0.1 : 0));
      g.rotate(rot);
      withG(g, () => undefined);
      g_ = g;
      imprint(g, gr, s, printShape(k, s, side), fade * (p ? 0.8 : 1));
      g.restore();
    }
  }
}

/** Hjulspor: to parallelle riller med profil (skygge foroven, lys kant forneden) og slidbane. */
function wheelTracks(g: G, o: DrawInput, wind: number, gapRatio: number): void {
  const r = rng(o.seed);
  const gr = groundOf(o);
  const { w, h } = o;
  const gap = h * gapRatio;
  const gw = Math.max(2.4, h * 0.13);
  const n = 70;
  const ph = r() * 6.28;
  const f = rf(r, 1, 2);
  const cy = (t: number): number => Math.sin(t * Math.PI * f + ph) * (h * 0.5 - gap / 2 - gw) * wind;
  const pt = (t: number, off: number): [number, number] => {
    const x = (t - 0.5) * w * 0.98;
    const e = 0.01;
    const dy = cy(t + e) - cy(t - e);
    const dx = w * 0.98 * 2 * e;
    const len = Math.hypot(dx, dy);
    return [x + (-dy / len) * off, cy(t) + (dx / len) * off];
  };
  for (const side of [-1, 1]) {
    const wob = (r() - 0.5) * 0.6;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) pts.push(pt(i / n, side * gap / 2 + wob * Math.sin((i / n) * 9)));
    line(g, pts, gw * 0.35, gw * 0.5, `rgba(${gr.rim},${gr.rimA})`, gw * 0.9);
    line(g, pts, 0, 0, `rgba(${gr.dark},${gr.darkA})`, gw);
    line(g, pts, -gw * 0.22, -gw * 0.3, `rgba(${gr.dark},${gr.darkA * 0.7})`, gw * 0.45);
    // mønster fra dækket (tværstriber)
    for (let i = 0; i < n; i += 2) {
      const a = pts[i]!;
      g.beginPath();
      g.moveTo(a[0] - gw * 0.3, a[1] - gw * 0.5);
      g.lineTo(a[0] + gw * 0.3, a[1] + gw * 0.5);
      g.strokeStyle = `rgba(${gr.dark},.25)`;
      g.lineWidth = 0.8;
      g.stroke();
    }
  }
  // opkastet jord/sne langs siderne
  for (let i = 0; i < 26; i++) {
    const t = r();
    const side = r() < 0.5 ? -1 : 1;
    const p = pt(t, side * (gap / 2 + gw * rf(r, 1.2, 2.6)));
    g.fillStyle = `rgba(${gr.dark},${0.12 + r() * 0.14})`;
    g.beginPath();
    g.ellipse(p[0], p[1], gw * rf(r, 0.2, 0.5), gw * rf(r, 0.15, 0.35), r() * 3, 0, 7);
    g.fill();
  }
  fadeEnds(g, w, h);
}

/** Slæbespor: bredt, glat bånd med to dybere furer og afrevet jord langs kanten. */
function dragTrail(g: G, o: DrawInput, kindOf: 'body' | 'sack' | 'branch'): void {
  const r = rng(o.seed);
  const gr = groundOf(o);
  const { w, h } = o;
  const n = 70;
  const ph = r() * 6.28;
  const cy = (t: number): number => Math.sin(t * Math.PI * 1.4 + ph) * h * 0.18;
  const band = kindOf === 'branch' ? h * 0.5 : h * 0.55;
  const P = (t: number, off: number): [number, number] => [(t - 0.5) * w * 0.98, cy(t) + off];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(P(i / n, 0));
  line(g, pts, band * 0.07, band * 0.1, `rgba(${gr.rim},${gr.rimA * 0.7})`, band * 0.95);
  line(g, pts, 0, 0, `rgba(${gr.dark},${gr.darkA * 0.55})`, band * 0.9);
  line(g, pts, -band * 0.07, -band * 0.1, `rgba(${gr.dark},${gr.darkA * 0.3})`, band * 0.45);
  if (kindOf !== 'sack') {
    for (const off of [-band * 0.28, band * 0.28]) line(g, pts, off * 0.2, off, `rgba(${gr.dark},${gr.darkA * 0.8})`, 1.6);
  }
  // opkastede klumper og skrammer
  for (let i = 0; i < 34; i++) {
    const t = r();
    const p = P(t, rf(r, -band * 0.7, band * 0.7));
    g.fillStyle = `rgba(${gr.dark},${0.16 + r() * 0.22})`;
    g.beginPath();
    g.ellipse(p[0], p[1], band * rf(r, 0.05, 0.14), band * rf(r, 0.03, 0.08), r() * 3, 0, 7);
    g.fill();
    g.fillStyle = `rgba(${gr.rim},${gr.rimA * 0.5})`;
    g.beginPath();
    g.ellipse(p[0] + 1, p[1] + 1.3, band * 0.05, band * 0.03, 0, 0, 7);
    g.fill();
  }
  if (kindOf === 'branch') {
    for (let i = 0; i < 8; i++) {
      const p = P(r(), rf(r, -band * 0.5, band * 0.5));
      g.beginPath();
      g.moveTo(p[0], p[1]);
      g.lineTo(p[0] + rf(r, 4, 12), p[1] + rf(r, -4, 4));
      g.strokeStyle = 'rgba(70,46,24,.7)';
      g.lineWidth = 1;
      g.stroke();
    }
  }
  fadeEnds(g, w, h);
}

/** Blodspor: dråber, der bliver mindre, og udtværinger. `age`: frisk eller tørret. */
function bloodTrail(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const fresh = param(o, 'age', 'fresh') === 'fresh';
  const col = fresh ? [150, 14, 14] : [74, 20, 14];
  const hi = fresh ? 'rgba(255,170,150,.55)' : 'rgba(200,150,120,.18)';
  const n = 34;
  const ph = r() * 6.28;
  const cy = (t: number): number => Math.sin(t * Math.PI * 1.6 + ph) * h * 0.22;
  // udtværet bånd
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    const a = [(t - 0.5) * w * 0.98, cy(t)];
    const b = [((i + 1) / 60 - 0.5) * w * 0.98, cy((i + 1) / 60)];
    const env = smoothstep(0, 0.15, t) * (1 - smoothstep(0.85, 1, t)) * (0.4 + 0.6 * Math.abs(Math.sin(t * 17 + ph)));
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.55 * env})`;
    g.lineWidth = h * 0.22 * (0.5 + 0.5 * env);
    g.lineCap = 'round';
    g.stroke();
  }
  for (let i = 0; i < n; i++) {
    const t = r();
    const sz = h * 0.1 * rf(r, 0.4, 1.4) * (1.15 - t * 0.5);
    const x = (t - 0.5) * w * 0.98;
    const y = cy(t) + rf(r, -h * 0.26, h * 0.26);
    g.save();
    g.translate(x, y);
    g.rotate(rf(r, -0.5, 0.5));
    g.beginPath();
    g.ellipse(0, 0, sz * 1.4, sz, 0, 0, 7);
    g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},.92)`;
    g.fill();
    g.strokeStyle = 'rgba(30,4,4,.55)';
    g.lineWidth = 0.8;
    g.stroke();
    g.beginPath();
    g.ellipse(-sz * 0.35, -sz * 0.3, sz * 0.4, sz * 0.22, -0.4, 0, 7);
    g.fillStyle = hi;
    g.fill();
    // lille dråbehale mod bevægelsen
    g.beginPath();
    g.moveTo(sz * 1.4, 0);
    g.lineTo(sz * 2.4, -sz * 0.15);
    g.lineTo(sz * 1.4, sz * 0.3);
    g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},.8)`;
    g.fill();
    g.restore();
  }
}

/** Brændte spor: sodsvedne striber og pletter med gløder. */
function burntTrail(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const embers = param(o, 'embers', true);
  const ph = r() * 6.28;
  const cy = (t: number): number => Math.sin(t * Math.PI * 1.5 + ph) * h * 0.2;
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    const env = smoothstep(0, 0.12, t) * (1 - smoothstep(0.88, 1, t)) * (0.5 + 0.5 * Math.abs(Math.sin(t * 13 + ph)));
    const a = [(t - 0.5) * w * 0.98, cy(t)];
    const b = [((i + 1) / 60 - 0.5) * w * 0.98, cy((i + 1) / 60)];
    for (const [wd, al] of [[h * 0.5, 0.2], [h * 0.3, 0.38], [h * 0.14, 0.55]] as const) {
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.strokeStyle = `rgba(12,10,10,${al * env})`;
      g.lineWidth = wd * (0.7 + 0.3 * env);
      g.lineCap = 'round';
      g.stroke();
    }
  }
  for (let i = 0; i < 40; i++) {
    const t = r();
    const x = (t - 0.5) * w * 0.98;
    const y = cy(t) + rf(r, -h * 0.3, h * 0.3);
    g.fillStyle = `rgba(10,8,8,${0.25 + r() * 0.35})`;
    g.beginPath();
    g.ellipse(x, y, h * rf(r, 0.04, 0.1), h * rf(r, 0.03, 0.07), r() * 3, 0, 7);
    g.fill();
    if (embers && r() < 0.35) {
      const gl = g.createRadialGradient(x, y, 0, x, y, h * 0.09);
      gl.addColorStop(0, 'rgba(255,200,80,.95)');
      gl.addColorStop(0.4, 'rgba(255,100,20,.7)');
      gl.addColorStop(1, 'rgba(255,60,10,0)');
      g.fillStyle = gl;
      g.fillRect(x - h * 0.1, y - h * 0.1, h * 0.2, h * 0.2);
    }
  }
}

const base = { keepAspect: false as const, shadow: 0, bleed: 0.03, layers: ['objects' as const, 'effects' as const] };
const OUT = ['outdoor'];

export const trackKinds: ObjectKind[] = [
  kind({ key: 'track_wheel_short', family: 'tracks', name: 'Hjulspor, kort', w: 3, h: 0.9, ...base, params: [groundP], tags: [...OUT, 'village', 'farm'], draw: (g, o) => wheelTracks(g, o, 0.4, 0.55) }),
  kind({ key: 'track_wheel', family: 'tracks', name: 'Hjulspor', w: 6, h: 1, ...base, params: [groundP], tags: [...OUT, 'village', 'farm'], draw: (g, o) => wheelTracks(g, o, 0.5, 0.55) }),
  kind({ key: 'track_wheel_long', family: 'tracks', name: 'Hjulspor, langt', w: 10, h: 1.2, ...base, params: [groundP], tags: [...OUT, 'village', 'farm'], draw: (g, o) => wheelTracks(g, o, 0.6, 0.55) }),
  kind({ key: 'track_wheel_winding', family: 'tracks', name: 'Hjulspor, bugtet', w: 8, h: 2.8, ...base, params: [groundP], tags: [...OUT, 'village', 'farm'], draw: (g, o) => wheelTracks(g, o, 1, 0.32) }),
  kind({ key: 'track_boots', family: 'tracks', name: 'Fodspor (støvler)', w: 5, h: 1, ...base, params: [groundP], tags: [...OUT, 'forest', 'camp'], draw: (g, o) => printRow(g, o, 'boot') }),
  kind({ key: 'track_bare', family: 'tracks', name: 'Fodspor (bare fødder)', w: 4.5, h: 1, ...base, params: [groundP], tags: [...OUT, 'swamp', 'desert'], draw: (g, o) => printRow(g, o, 'bare') }),
  kind({ key: 'track_cat', family: 'tracks', name: 'Kattespor', w: 3.5, h: 0.7, ...base, params: [groundP], tags: [...OUT, 'forest'], draw: (g, o) => printRow(g, o, 'cat') }),
  kind({ key: 'track_wolf', family: 'tracks', name: 'Ulvespor', w: 5, h: 0.9, ...base, params: [groundP], tags: [...OUT, 'forest', 'arctic'], draw: (g, o) => printRow(g, o, 'wolf') }),
  kind({ key: 'track_bear', family: 'tracks', name: 'Bjørnespor', w: 5, h: 1.3, ...base, params: [groundP], tags: [...OUT, 'forest', 'mountain'], draw: (g, o) => printRow(g, o, 'bear') }),
  kind({ key: 'track_horse', family: 'tracks', name: 'Hovspor (hest)', w: 6, h: 1.2, ...base, params: [groundP], tags: [...OUT, 'village', 'grassland'], draw: (g, o) => printRow(g, o, 'horse') }),
  kind({ key: 'track_ox', family: 'tracks', name: 'Klovspor (okse)', w: 5.5, h: 1.2, ...base, params: [groundP], tags: [...OUT, 'farm', 'grassland'], draw: (g, o) => printRow(g, o, 'ox') }),
  kind({ key: 'track_monster', family: 'tracks', name: 'Spor af uhyre med kløer', w: 7, h: 2.2, ...base, params: [groundP], tags: [...OUT, 'forest', 'cave', 'swamp'], draw: (g, o) => printRow(g, o, 'claw') }),
  kind({ key: 'track_drag_body', family: 'tracks', name: 'Slæbespor (krop)', w: 6, h: 1.3, ...base, params: [groundP], tags: [...OUT, 'battlefield', 'dungeon'], draw: (g, o) => dragTrail(g, o, 'body') }),
  kind({ key: 'track_drag_sack', family: 'tracks', name: 'Slæbespor (sæk)', w: 5, h: 1, ...base, params: [groundP], tags: [...OUT, 'camp'], draw: (g, o) => dragTrail(g, o, 'sack') }),
  kind({ key: 'track_drag_branch', family: 'tracks', name: 'Slæbespor (gren)', w: 6, h: 1.2, ...base, params: [groundP], tags: [...OUT, 'forest'], draw: (g, o) => dragTrail(g, o, 'branch') }),
  kind({ key: 'track_blood', family: 'tracks', name: 'Blodspor', w: 6, h: 1.2, ...base, params: [{ key: 'age', label: 'Alder', type: 'select', default: 'fresh', options: [{ value: 'fresh', label: 'Frisk' }, { value: 'dry', label: 'Tørret' }] }], tags: [...OUT, 'battlefield', 'dungeon', 'crypt'], draw: bloodTrail }),
  kind({ key: 'track_burnt', family: 'tracks', name: 'Brændt spor', w: 6, h: 1.4, ...base, params: [{ key: 'embers', label: 'Gløder', type: 'toggle', default: true }], tags: [...OUT, 'battlefield', 'magic', 'dungeon'], draw: burntTrail }),
];
void clamp;
