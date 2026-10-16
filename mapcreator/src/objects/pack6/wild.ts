import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng, softDot } from '../util';
import { tube, ellBody } from '../pack2/helpers';
import { base, crack, lerp, mixc, mottle, OUT, polyBody, radial, rf, rgb, shift, tufts, type G, type P, type RGB } from './common';

/** Fantasy-miljø set straks oppefra: malstrøm, jordsprække, slim, spindelvæv, æg, tjørnekrat, lynsvidning, lygtemænd, kranier og obsidian. */

const GLOWS: Record<string, RGB> = { blue: [90, 170, 255], purple: [180, 110, 255], green: [90, 230, 140], red: [255, 90, 80], gold: [255, 200, 80] };
const glowP = (d: string): ParamDef => ({ key: 'glow', label: 'Farve', type: 'select', default: d, options: [{ value: 'blue', label: 'Blå' }, { value: 'purple', label: 'Lilla' }, { value: 'green', label: 'Grøn' }, { value: 'red', label: 'Rød' }, { value: 'gold', label: 'Guld' }] });
const glowOf = (o: DrawInput, d: string): RGB => GLOWS[param(o, 'glow', d)] ?? GLOWS.blue!;
const WH: RGB = [255, 255, 255];

function vortex(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'purple');
  const { w, h } = o;
  const R = Math.min(w, h) * 0.47;
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fillStyle = radial(g, 0, 0, R, [[0, 'rgb(4,2,10)'], [0.45, rgb(shift(col, -150))], [0.8, rgb(shift(col, -70))], [1, rgb(col, 0.0)]]);
  g.fill();
  for (let k = 0; k < 5; k++) {
    g.beginPath();
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      const a = k * 1.2566 + t * 11;
      const rr = R * (0.08 + t * 0.9);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.strokeStyle = rgb(col, 0.35);
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = rgb(mixc(col, WH, 0.55), 0.85);
    g.lineWidth = 1.2;
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, R * 0.1, 0, 7);
  g.fillStyle = 'rgb(0,0,0)';
  g.fill();
  softDot(g, 0, 0, R * 1.1, col, 0.2);
  for (let i = 0; i < 12; i++) {
    const a = r() * 6.28;
    const d = rf(r, 0.4, 1) * R;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, rf(r, 0.8, 1.6), 0, 7);
    g.fillStyle = rgb(mixc(col, WH, 0.7), 0.9);
    g.fill();
  }
}

function rift(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'red');
  const { w, h } = o;
  const pts: P[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) pts.push([lerp(-w * 0.46, w * 0.46, i / n), Math.sin(i * 0.5 + o.seed) * h * 0.14 + rf(r, -1, 1) * h * 0.07]);
  const trace = (): void => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  };
  softDot(g, 0, 0, w * 0.4, col, 0.2);
  for (const [wd, a] of [[h * 0.3, 0.14], [h * 0.18, 0.28], [h * 0.09, 0.9]] as const) {
    trace();
    g.strokeStyle = wd < h * 0.1 ? 'rgb(14,6,6)' : rgb(col, a);
    g.lineWidth = wd * (wd < h * 0.1 ? 1 : 1);
    g.lineJoin = 'round';
    g.stroke();
  }
  trace();
  g.strokeStyle = rgb(mixc(col, WH, 0.65), 0.95);
  g.lineWidth = 1.6;
  g.stroke();
  for (let i = 0; i < 7; i++) {
    const p = pts[Math.floor(r() * pts.length)]!;
    crack(g, r, p[0], p[1], rf(r, 10, 26), r() * 6.28, 1, true);
  }
}

function slime(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'green');
  const { w, h } = o;
  const pts: P[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.283;
    const k = 0.62 + r() * 0.45;
    pts.push([Math.cos(a) * w * 0.44 * k, Math.sin(a) * h * 0.44 * k]);
  }
  const path = (): void => {
    const n = pts.length;
    g.beginPath();
    g.moveTo((pts[0]![0] + pts[n - 1]![0]) / 2, (pts[0]![1] + pts[n - 1]![1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % n]!;
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  };
  path();
  g.fillStyle = radial(g, 0, 0, w * 0.45, [[0, rgb(shift(col, -40), 0.9)], [1, rgb(shift(col, -90), 0.85)]]);
  g.fill();
  g.strokeStyle = rgb(shift(col, -110), 0.9);
  g.lineWidth = 1.6;
  g.stroke();
  g.save();
  path();
  g.clip();
  for (let i = 0; i < 10; i++) {
    const x = rf(r, -w * 0.3, w * 0.3);
    const y = rf(r, -h * 0.3, h * 0.3);
    const s = rf(r, 3, 9);
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.strokeStyle = rgb(shift(col, -100), 0.7);
    g.lineWidth = 1;
    g.stroke();
    g.beginPath();
    g.ellipse(x - s * 0.3, y - s * 0.3, s * 0.35, s * 0.22, -0.6, 0, 7);
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.fill();
  }
  g.restore();
  g.beginPath();
  g.ellipse(-w * 0.15, -h * 0.15, w * 0.1, h * 0.04, -0.5, 0, 7);
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.fill();
}

function web(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.47;
  const n = 11;
  g.lineCap = 'round';
  const rays: number[] = [];
  for (let i = 0; i < n; i++) rays.push((i / n) * 6.283 + rf(r, -0.12, 0.12));
  g.strokeStyle = 'rgba(8,4,0,.25)';
  g.lineWidth = 2.4;
  for (const a of rays) {
    g.beginPath();
    g.moveTo(1, 2);
    g.lineTo(Math.cos(a) * R + 1, Math.sin(a) * R + 2);
    g.stroke();
  }
  g.strokeStyle = 'rgba(244,244,236,.9)';
  g.lineWidth = 1.1;
  for (const a of rays) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    g.stroke();
  }
  for (let k = 1; k <= 8; k++) {
    const rr = (R * k) / 8.4;
    g.beginPath();
    rays.forEach((a, i) => {
      const next = rays[(i + 1) % n]! + (i + 1 === n ? 6.283 : 0);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      const mx = Math.cos((a + next) / 2) * rr * 0.9;
      const my = Math.sin((a + next) / 2) * rr * 0.9;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
      g.quadraticCurveTo(mx, my, Math.cos(next) * rr, Math.sin(next) * rr);
    });
    g.strokeStyle = 'rgba(244,244,236,.7)';
    g.lineWidth = 0.9;
    g.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const a = r() * 6.28;
    const d = rf(r, 0.2, 1) * R;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, rf(r, 0.8, 1.6), 0, 7);
    g.fillStyle = 'rgba(190,225,255,.95)';
    g.fill();
  }
  g.lineCap = 'butt';
}

function eggs(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const m = Math.min(w, h);
  g.beginPath();
  g.ellipse(0, 0, w * 0.46, h * 0.44, 0, 0, 7);
  g.fillStyle = 'rgba(70,90,40,.5)';
  g.fill();
  const list: { x: number; y: number; s: number; a: number }[] = [];
  for (let i = 0; i < 7; i++) list.push({ x: rf(r, -w * 0.25, w * 0.25), y: rf(r, -h * 0.25, h * 0.25), s: m * rf(r, 0.1, 0.16), a: r() * 3 });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    g.save();
    g.translate(e.x, e.y);
    g.rotate(e.a);
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.beginPath();
    g.ellipse(2.5, 3, e.s * 0.8, e.s * 1.1, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.ellipse(0, 0, e.s * 0.8, e.s * 1.1, 0, 0, 7);
    g.fillStyle = radial(g, 0, 0, e.s * 1.1, [[0, 'rgb(236,222,176)'], [0.7, 'rgb(196,176,120)'], [1, 'rgb(120,100,66)']], -e.s * 0.3, -e.s * 0.4, 1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    g.stroke();
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(rf(r, -e.s * 0.4, e.s * 0.4), rf(r, -e.s * 0.6, e.s * 0.6), rf(r, 1, 2.4), 0, 7);
      g.fillStyle = 'rgba(120,96,60,.5)';
      g.fill();
    }
    g.restore();
  }
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.ellipse(rf(r, -w * 0.35, w * 0.35), rf(r, -h * 0.35, h * 0.35), rf(r, 2, 5), rf(r, 1, 3), 0, 0, 7);
    g.fillStyle = 'rgba(190,230,120,.55)';
    g.fill();
  }
}

function brambles(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const stems: P[][] = [];
  for (let s = 0; s < 8; s++) {
    const pts: P[] = [];
    let x = rf(r, -w * 0.3, w * 0.3);
    let y = rf(r, -h * 0.3, h * 0.3);
    let a = r() * 6.28;
    for (let i = 0; i < 12; i++) {
      pts.push([x, y]);
      a += rf(r, -0.9, 0.9);
      x = Math.max(-w * 0.46, Math.min(w * 0.46, x + Math.cos(a) * w * 0.07));
      y = Math.max(-h * 0.44, Math.min(h * 0.44, y + Math.sin(a) * h * 0.09));
    }
    stems.push(pts);
  }
  g.fillStyle = 'rgba(30,40,10,.25)';
  g.beginPath();
  g.ellipse(0, 0, w * 0.46, h * 0.44, 0, 0, 7);
  g.fill();
  for (const pts of stems) tube(g, () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); }, 4, [86, 66, 44]);
  for (const pts of stems) {
    for (const p of pts) {
      if (r() < 0.55) {
        g.save();
        g.translate(p[0], p[1]);
        g.rotate(r() * 6.28);
        g.beginPath();
        g.ellipse(5, 0, rf(r, 4, 7), rf(r, 2, 3.4), 0, 0, 7);
        g.fillStyle = rgb(mixc([60, 110, 50], [130, 170, 70], r()));
        g.fill();
        g.restore();
      }
      if (r() < 0.5) {
        const a = r() * 6.28;
        g.beginPath();
        g.moveTo(p[0], p[1]);
        g.lineTo(p[0] + Math.cos(a) * 6, p[1] + Math.sin(a) * 6);
        g.strokeStyle = 'rgb(200,190,170)';
        g.lineWidth = 1.2;
        g.stroke();
      }
    }
  }
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(rf(r, -w * 0.35, w * 0.35), rf(r, -h * 0.3, h * 0.3), 2.4, 0, 7);
    g.fillStyle = 'rgb(170,40,60)';
    g.fill();
  }
}

function scorch(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.46;
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fillStyle = radial(g, 0, 0, R, [[0, 'rgb(14,10,10)'], [0.5, 'rgba(30,24,22,.85)'], [1, 'rgba(40,34,30,0)']]);
  g.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.283 + rf(r, -0.2, 0.2);
    const pts: P[] = [[0, 0]];
    let x = 0;
    let y = 0;
    let ang = a;
    for (let k = 0; k < 6; k++) {
      ang += rf(r, -0.5, 0.5);
      x += Math.cos(ang) * R * 0.15;
      y += Math.sin(ang) * R * 0.15;
      pts.push([x, y]);
    }
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.strokeStyle = 'rgba(8,6,6,.85)';
    g.lineWidth = 2.4;
    g.stroke();
    g.strokeStyle = 'rgba(190,220,255,.35)';
    g.lineWidth = 0.9;
    g.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28;
    const d = rf(r, 0.2, 0.8) * R;
    g.beginPath();
    g.moveTo(Math.cos(a) * d, Math.sin(a) * d - 3);
    g.lineTo(Math.cos(a) * d + 2.5, Math.sin(a) * d + 2);
    g.lineTo(Math.cos(a) * d - 2.5, Math.sin(a) * d + 2);
    g.closePath();
    g.fillStyle = 'rgba(180,210,230,.8)';
    g.fill();
  }
}

function wisps(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'blue');
  const { w, h } = o;
  for (let i = 0; i < 4; i++) {
    const x = rf(r, -w * 0.4, w * 0.08);
    const y = rf(r, -h * 0.3, h * 0.3);
    const s = Math.min(w, h) * rf(r, 0.07, 0.12);
    softDot(g, x, y, s * 3.2, col, 0.4);
    const trace = (): void => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 2, y + s, x + s * 4, y + s * 0.3); };
    trace();
    g.strokeStyle = rgb(col, 0.35);
    g.lineWidth = s * 0.8;
    g.lineCap = 'round';
    g.stroke();
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.fillStyle = rgb(mixc(col, WH, 0.75));
    g.fill();
  }
}

function skullPile(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const m = Math.min(w, h);
  g.fillStyle = 'rgba(30,20,10,.3)';
  g.beginPath();
  g.ellipse(0, 0, w * 0.46, h * 0.44, 0, 0, 7);
  g.fill();
  for (let i = 0; i < 9; i++) {
    const a = rf(r, 0, 3.14);
    const L = m * rf(r, 0.25, 0.4);
    const cx = rf(r, -w * 0.25, w * 0.25);
    const cy = rf(r, -h * 0.25, h * 0.25);
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * L / 2, cy - Math.sin(a) * L / 2);
    g.lineTo(cx + Math.cos(a) * L / 2, cy + Math.sin(a) * L / 2);
    g.strokeStyle = 'rgba(20,12,6,.8)';
    g.lineWidth = 5.4;
    g.lineCap = 'round';
    g.stroke();
    g.strokeStyle = 'rgb(226,216,190)';
    g.lineWidth = 3.6;
    g.stroke();
  }
  const sk = [[-0.12, -0.1], [0.14, -0.04], [0, 0.16], [-0.18, 0.12]] as const;
  for (const [sx, sy] of sk) {
    const x = sx * w;
    const y = sy * h;
    const s = m * 0.1;
    ellBody(g, x, y, s, s * 0.9, [226, 216, 190], { lw: 1.3 });
    g.fillStyle = 'rgb(24,18,16)';
    for (const k of [-1, 1]) {
      g.beginPath();
      g.ellipse(x + k * s * 0.38, y - s * 0.12, s * 0.2, s * 0.24, 0, 0, 7);
      g.fill();
    }
    g.fillRect(x - s * 0.08, y + s * 0.2, s * 0.16, s * 0.3);
  }
  g.lineCap = 'butt';
}

function obsidian(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'red');
  const { w, h } = o;
  const m = Math.min(w, h);
  softDot(g, 0, 0, m * 0.55, col, 0.25);
  const list = Array.from({ length: 8 }, () => ({ a: r() * 6.283, d: r() * 0.3, s: m * rf(r, 0.08, 0.2), rot: r() * 6.28 }));
  list.sort((a, b) => a.s - b.s);
  for (const it of list) {
    const x = Math.cos(it.a) * it.d * m;
    const y = Math.sin(it.a) * it.d * m;
    const L = it.s * 2.2;
    const pts: P[] = [[0, -L], [it.s * 0.55, 0], [it.s * 0.2, L * 0.5], [-it.s * 0.4, L * 0.2]];
    g.save();
    g.translate(x, y);
    g.rotate(it.rot);
    polyBody(g, pts, [28, 26, 34], { lw: 1.3, light: 36, dark: 10, ao: 1 });
    polyBody(g, [pts[0]!, pts[1]!, [0, 0]], [78, 76, 92], { lw: 0.8, light: 14, dark: 10, ao: 0 });
    g.restore();
  }
}

const common = { ...base, keepAspect: true as const, shadow: 0 };
const M = ['magic', 'outdoor'];

export const wildKinds: ObjectKind[] = [
  kind({ key: 'fant_vortex', family: 'fantasy', name: 'Malstrøm af magi', w: 3.2, h: 3.2, ...common, params: [glowP('purple')], tags: [...M, 'dungeon'], draw: (g, o) => vortex(g, o) }),
  kind({ key: 'fant_rift', family: 'fantasy', name: 'Glødende jordsprække', w: 6, h: 1.8, ...common, params: [glowP('red')], tags: [...M, 'cave', 'mountain'], draw: (g, o) => rift(g, o) }),
  kind({ key: 'fant_slime', family: 'fantasy', name: 'Slimpøl', w: 2.4, h: 2.2, ...common, shadow: 3, randomRotation: true, params: [glowP('green')], tags: ['dungeon', 'cave', 'swamp'], draw: (g, o) => slime(g, o) }),
  kind({ key: 'fant_web', family: 'fantasy', name: 'Kæmpe spindelvæv', w: 3.4, h: 3.4, ...common, randomRotation: true, params: [], tags: ['dungeon', 'cave', 'forest'], draw: (g, o) => web(g, o) }),
  kind({ key: 'fant_eggs', family: 'fantasy', name: 'Rede med æg', w: 2.2, h: 2.2, ...common, shadow: 6, randomRotation: true, params: [], tags: ['cave', 'dungeon', 'mountain'], draw: (g, o) => eggs(g, o) }),
  kind({ key: 'fant_brambles', family: 'fantasy', name: 'Tjørnekrat', w: 3.2, h: 2.6, ...common, shadow: 4, randomRotation: true, params: [], tags: ['forest', 'ruin', 'outdoor'], draw: (g, o) => brambles(g, o) }),
  kind({ key: 'fant_scorch', family: 'fantasy', name: 'Lynsvidning', w: 2.4, h: 2.4, ...common, randomRotation: true, params: [], tags: ['outdoor', 'battlefield', 'magic'], draw: (g, o) => scorch(g, o) }),
  kind({ key: 'fant_wisps', family: 'fantasy', name: 'Lygtemænd', w: 2.4, h: 2.4, ...common, params: [glowP('blue')], tags: [...M, 'swamp', 'graveyard'], draw: (g, o) => wisps(g, o) }),
  kind({ key: 'fant_skull_pile', family: 'fantasy', name: 'Kranie- og knoglebunke', w: 2.4, h: 2.2, ...common, shadow: 6, randomRotation: true, params: [], tags: ['dungeon', 'crypt', 'battlefield', 'cave'], draw: (g, o) => skullPile(g, o) }),
  kind({ key: 'fant_obsidian', family: 'fantasy', name: 'Obsidianskår', w: 2.4, h: 2.4, ...common, shadow: 6, randomRotation: true, params: [glowP('red')], tags: [...M, 'mountain', 'cave'], draw: (g, o) => obsidian(g, o) }),
];
void tufts;
