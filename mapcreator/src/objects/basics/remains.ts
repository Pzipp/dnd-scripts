import { param, type DrawInput } from '../registry';
import { blob, mix, polygon, rgb, rng, roundRect, shift, smooth, type RGB } from '../util';
import { OUTLINE, rockBody, ROCK_PALS, type RockPal } from './helpers';
import { bevel, woodSurface, OAK } from './interior';

type G = CanvasRenderingContext2D;

// ------------------------------------------------------------------ blod

export function drawBloodPool(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const rx = o.w * 0.4;
  const ry = o.h * 0.4;
  const fresh = param(o, 'fresh', true);
  const dark: RGB = fresh ? [86, 6, 10] : [48, 18, 16];
  const mid: RGB = fresh ? [138, 14, 18] : [78, 28, 24];
  const light: RGB = fresh ? [196, 34, 34] : [112, 44, 36];
  const pts = blob(rx, ry, 0.34, 13, r);
  smooth(g, pts);
  g.fillStyle = rgb(dark, 0.95);
  g.fill();
  smooth(g, blob(rx * 0.84, ry * 0.84, 0.28, 12, r, -rx * 0.04, -ry * 0.05));
  const gr = g.createRadialGradient(-rx * 0.3, -ry * 0.3, 0, 0, 0, rx);
  gr.addColorStop(0, rgb(light, 0.95));
  gr.addColorStop(0.7, rgb(mid, 0.95));
  gr.addColorStop(1, rgb(dark, 0.95));
  g.fillStyle = gr;
  g.fill();
  if (!fresh) {
    // indtørret: revner og mørk skorpe
    g.strokeStyle = 'rgba(20,6,4,.5)';
    g.lineWidth = Math.max(0.6, rx * 0.025);
    for (let i = 0; i < 7; i++) {
      const a = r() * 6.28;
      g.beginPath();
      g.moveTo(Math.cos(a) * rx * 0.1, Math.sin(a) * ry * 0.1);
      g.lineTo(Math.cos(a + 0.3) * rx * 0.5, Math.sin(a + 0.3) * ry * 0.5);
      g.lineTo(Math.cos(a - 0.1) * rx * 0.85, Math.sin(a - 0.1) * ry * 0.85);
      g.stroke();
    }
  } else {
    // våd glans
    smooth(g, blob(rx * 0.26, ry * 0.12, 0.3, 8, r, -rx * 0.3, -ry * 0.34, -0.6));
    g.fillStyle = 'rgba(255,200,190,.26)';
    g.fill();
    smooth(g, blob(rx * 0.1, ry * 0.07, 0.3, 6, r, rx * 0.2, ry * 0.2, -0.6));
    g.fillStyle = 'rgba(255,220,210,.2)';
    g.fill();
  }
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28;
    const d = Math.max(rx, ry) * (1.05 + r() * 0.5);
    const s = Math.max(rx, ry) * (0.03 + r() * 0.06);
    g.fillStyle = rgb(mid, 0.95);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,200,190,.4)';
    g.beginPath();
    g.arc(Math.cos(a) * d - s * 0.3, Math.sin(a) * d - s * 0.3, s * 0.3, 0, Math.PI * 2);
    g.fill();
  }
}

export function drawSplatter(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const fresh = param(o, 'fresh', true);
  const col: RGB = fresh ? [128, 12, 16] : [72, 26, 22];
  smooth(g, blob(R * 0.2, R * 0.2, 0.3, 9, r));
  g.fillStyle = rgb(col, 0.96);
  g.fill();
  g.lineCap = 'round';
  const base = r() * 6.28;
  for (let i = 0; i < 34; i++) {
    const a = base + (r() < 0.7 ? (r() - 0.5) * 2.2 : r() * 6.28);
    const d = R * (0.15 + r() * 0.7);
    const len = R * (0.05 + r() * 0.22) * (1 - d / (R * 1.1));
    // stråle med dråbe i enden
    g.strokeStyle = rgb(col, 0.92);
    g.lineWidth = Math.max(0.8, R * (0.015 + r() * 0.03));
    g.beginPath();
    g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
    g.lineTo(Math.cos(a) * (d + len), Math.sin(a) * (d + len));
    g.stroke();
    g.fillStyle = rgb(col, 0.95);
    g.beginPath();
    g.arc(Math.cos(a) * (d + len * 1.3), Math.sin(a) * (d + len * 1.3), Math.max(0.8, R * (0.015 + r() * 0.03)), 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 20; i++) {
    const a = r() * 6.28;
    const d = R * (0.5 + r() * 0.55);
    g.fillStyle = rgb(col, 0.9);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.6, R * (0.01 + r() * 0.02)), 0, Math.PI * 2);
    g.fill();
  }
  if (fresh) {
    g.fillStyle = 'rgba(255,200,190,.35)';
    g.beginPath();
    g.ellipse(-R * 0.06, -R * 0.07, R * 0.07, R * 0.04, -0.6, 0, Math.PI * 2);
    g.fill();
  }
}

export function drawTrail(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const fresh = param(o, 'fresh', true);
  const dark: RGB = fresh ? [96, 8, 12] : [56, 20, 16];
  const light: RGB = fresh ? [160, 22, 24] : [92, 34, 28];
  const ph = r() * 6;
  const path = (k: number): void => {
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = -o.w / 2 + o.w * (0.04 + t * 0.92);
      const y = Math.sin(t * 5 + ph) * o.h * 0.22 + k * o.h * 0.04;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [wd, col, a, k] of [[0.5, dark, 0.8, 0], [0.38, mix(dark, light, 0.5), 0.9, 0], [0.18, light, 0.85, -0.5], [0.1, light, 0.5, 1.5]] as const) {
    g.beginPath();
    path(k);
    g.strokeStyle = rgb(col, a);
    g.lineWidth = Math.max(1.2, o.h * wd);
    g.stroke();
  }
  // fingerstriber og dråber langs sporet
  g.strokeStyle = rgb(dark, 0.6);
  g.lineWidth = Math.max(0.8, o.h * 0.04);
  for (let i = 0; i < 6; i++) {
    const t = r();
    const x = -o.w / 2 + o.w * (0.04 + t * 0.92);
    const y = Math.sin(t * 5 + ph) * o.h * 0.22;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - o.w * 0.04, y + (r() - 0.5) * o.h * 0.5);
    g.stroke();
  }
  g.fillStyle = rgb(dark, 0.9);
  for (let i = 0; i < 8; i++) {
    const t = r();
    g.beginPath();
    g.arc(-o.w / 2 + o.w * (0.04 + t * 0.92), Math.sin(t * 5 + ph) * o.h * 0.22 + (r() - 0.5) * o.h * 0.9, Math.max(0.7, o.h * (0.02 + r() * 0.03)), 0, Math.PI * 2);
    g.fill();
  }
}

// ------------------------------------------------------------------ knogler

const BONE: RGB = [228, 218, 192];

function boneStick(g: G, x: number, y: number, a: number, len: number, wd: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  const knob = wd * 0.95;
  const p = () => {
    g.beginPath();
    g.moveTo(-len / 2, -wd * 0.4);
    g.quadraticCurveTo(0, -wd * 0.28, len / 2, -wd * 0.4);
    g.lineTo(len / 2, wd * 0.4);
    g.quadraticCurveTo(0, wd * 0.28, -len / 2, wd * 0.4);
    g.closePath();
  };
  const ends: [number, number][] = [[-len / 2, -knob * 0.55], [-len / 2, knob * 0.55], [len / 2, -knob * 0.55], [len / 2, knob * 0.55]];
  // kontur
  g.strokeStyle = 'rgba(40,28,16,.85)';
  g.lineWidth = Math.max(1, wd * 0.34);
  g.lineJoin = 'round';
  p();
  g.stroke();
  for (const [ex, ey] of ends) {
    g.beginPath();
    g.arc(ex, ey, knob * 0.62, 0, Math.PI * 2);
    g.stroke();
  }
  // krop og led med gradient
  const gr = g.createLinearGradient(0, -wd * 0.5, 0, wd * 0.5);
  gr.addColorStop(0, rgb(shift(BONE, 18)));
  gr.addColorStop(1, rgb(shift(BONE, -42)));
  p();
  g.fillStyle = gr;
  g.fill();
  for (const [ex, ey] of ends) {
    const rg = g.createRadialGradient(ex - knob * 0.2, ey - knob * 0.2, 0, ex, ey, knob * 0.62);
    rg.addColorStop(0, rgb(shift(BONE, 22)));
    rg.addColorStop(1, rgb(shift(BONE, -36)));
    g.fillStyle = rg;
    g.beginPath();
    g.arc(ex, ey, knob * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export function drawSkull(g: G, sx: number, sy: number, S: number, a = 0): void {
  g.save();
  g.translate(sx, sy);
  g.rotate(a);
  const R = S * 0.14;
  // kæbe nederst
  g.beginPath();
  g.ellipse(0, R * 0.95, R * 0.58, R * 0.42, 0, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(BONE, -26));
  g.fill();
  g.strokeStyle = 'rgba(40,28,16,.85)';
  g.lineWidth = Math.max(1, S * 0.022);
  g.stroke();
  // kranie
  g.beginPath();
  g.ellipse(0, 0, R * 0.95, R * 1.05, 0, 0, Math.PI * 2);
  const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
  gr.addColorStop(0, rgb(shift(BONE, 24)));
  gr.addColorStop(0.7, rgb(BONE));
  gr.addColorStop(1, rgb(shift(BONE, -52)));
  g.fillStyle = gr;
  g.fill();
  g.stroke();
  // syning, hulrum, næse, tænder
  g.fillStyle = 'rgb(26,18,14)';
  for (const d of [-1, 1]) {
    g.beginPath();
    g.ellipse(d * R * 0.38, R * 0.18, R * 0.26, R * 0.3, d * 0.2, 0, Math.PI * 2);
    g.fill();
  }
  polygon(g, [[-R * 0.1, R * 0.55], [R * 0.1, R * 0.55], [0, R * 0.3]]);
  g.fill();
  g.strokeStyle = 'rgba(40,28,16,.75)';
  g.lineWidth = Math.max(0.6, S * 0.012);
  g.beginPath();
  for (let i = -3; i <= 3; i++) {
    g.moveTo(i * R * 0.12, R * 0.78);
    g.lineTo(i * R * 0.12, R * 1.0);
  }
  g.stroke();
  g.beginPath();
  g.moveTo(R * 0.1, -R * 0.95);
  g.lineTo(R * 0.25, -R * 0.4);
  g.lineTo(R * 0.15, -R * 0.15);
  g.strokeStyle = 'rgba(60,44,28,.55)';
  g.stroke();
  g.restore();
}

export function drawRibs(g: G, cx: number, cy: number, S: number, a = 0): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(a);
  g.lineCap = 'round';
  // ryghvirvler
  for (let i = -4; i <= 4; i++) {
    const y = i * S * 0.05;
    g.fillStyle = 'rgba(40,28,16,.85)';
    g.beginPath();
    g.ellipse(0, y, S * 0.045, S * 0.032, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgb(shift(BONE, -8));
    g.beginPath();
    g.ellipse(0, y, S * 0.036, S * 0.024, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = -3; i <= 3; i++) {
    const y = i * S * 0.058;
    const reach = S * (0.3 - Math.abs(i) * 0.03);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * S * 0.03, y);
      g.quadraticCurveTo(s * reach * 0.8, y - S * 0.03, s * reach, y + S * 0.07);
      g.strokeStyle = 'rgba(40,28,16,.85)';
      g.lineWidth = Math.max(1.4, S * 0.05);
      g.stroke();
      g.strokeStyle = rgb(shift(BONE, 4));
      g.lineWidth = Math.max(0.8, S * 0.032);
      g.stroke();
      g.strokeStyle = 'rgba(255,250,230,.4)';
      g.lineWidth = Math.max(0.5, S * 0.01);
      g.translate(0, -S * 0.006);
      g.stroke();
      g.translate(0, S * 0.006);
    }
  }
  g.restore();
}

export function drawBonesScatter(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  for (let i = 0; i < 6; i++) boneStick(g, (r() - 0.5) * S * 0.7, (r() - 0.5) * S * 0.7, r() * Math.PI, S * (0.26 + r() * 0.2), S * 0.06);
  drawRibs(g, S * 0.12, S * 0.04, S * 0.85, (r() - 0.5) * 1.2);
  drawSkull(g, -S * 0.2, -S * 0.16, S * 1.0, (r() - 0.5) * 1.6);
  // små knoglestumper
  for (let i = 0; i < 5; i++) boneStick(g, (r() - 0.5) * S * 0.8, (r() - 0.5) * S * 0.8, r() * 3, S * 0.09, S * 0.035);
}

// ------------------------------------------------------------------ piller

const STONE: RGB = [142, 140, 132];
const stonePal: RockPal = ROCK_PALS.limestone!;

export function drawPillar(g: G, o: DrawInput, shape: 'round' | 'square' | 'broken'): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const path = (k: number): void => {
    if (shape === 'square') roundRect(g, -R * k, -R * k, R * 2 * k, R * 2 * k, R * 0.07);
    else {
      g.beginPath();
      g.arc(0, 0, R * k, 0, Math.PI * 2);
    }
  };
  if (shape === 'broken') {
    // brokker rundt om
    for (let i = 0; i < 8; i++) {
      const a = r() * 6.28;
      const d = R * (1.05 + r() * 0.45);
      const s = R * (0.1 + r() * 0.14);
      rockBody(g, r, Math.cos(a) * d, Math.sin(a) * d, s, s * 0.8, stonePal, { n: 6, rough: 0.3, cracks: 0, grain: 4, relief: 1.1 });
    }
    // kernen med takket bruddflade
    const pts: [number, number][] = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28;
      const k = 0.92 + r() * 0.12 - (i % 2 ? 0.06 : 0);
      pts.push([Math.cos(a) * R * k, Math.sin(a) * R * k]);
    }
    polygon(g, pts);
    g.fillStyle = rgb(shift(STONE, -34));
    g.fill();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(1, R * 0.06);
    g.lineJoin = 'round';
    g.stroke();
    g.save();
    polygon(g, pts);
    g.clip();
    // facetterede bruddeler fra et lavt toppunkt
    const peak: [number, number] = [-R * 0.1, -R * 0.1];
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % n]!;
      const mx = (p[0] + q[0]) / 2 - peak[0];
      const my = (p[1] + q[1]) / 2 - peak[1];
      const l = Math.hypot(mx, my) || 1;
      const lit = -(mx / l) * 0.7 - (my / l) * 0.7 + (r() - 0.5) * 0.4;
      polygon(g, [peak, p, q]);
      g.fillStyle = lit > 0 ? `rgba(255,252,236,${Math.min(0.4, lit * 0.4)})` : `rgba(10,6,2,${Math.min(0.5, -lit * 0.5)})`;
      g.fill();
    }
    // rester af kannelurer
    g.strokeStyle = 'rgba(40,36,30,.3)';
    g.lineWidth = Math.max(0.7, R * 0.03);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.28 + 0.1;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55);
      g.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
      g.stroke();
    }
    g.restore();
    return;
  }
  // sokkel/basis
  path(1);
  g.fillStyle = rgb(shift(STONE, -36));
  g.fill();
  const gb = g.createLinearGradient(-R, -R, R, R);
  gb.addColorStop(0, rgb(shift(STONE, 30)));
  gb.addColorStop(1, rgb(shift(STONE, -40)));
  path(1);
  g.fillStyle = gb;
  g.fill();
  bevel(g, () => path(1), Math.max(1, R * 0.06), 0.25, 0.4);
  // skaft/top med radial belysning
  path(0.78);
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.05, 0, 0, R * 0.85);
  gr.addColorStop(0, rgb(shift(STONE, 52)));
  gr.addColorStop(0.6, rgb(shift(STONE, 6)));
  gr.addColorStop(1, rgb(shift(STONE, -30)));
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(30,26,20,.6)';
  g.lineWidth = Math.max(1, R * 0.045);
  g.stroke();
  if (shape === 'round') {
    // kannelurer
    g.strokeStyle = 'rgba(40,36,30,.28)';
    g.lineWidth = Math.max(0.7, R * 0.035);
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.28;
      g.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
      g.lineTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97);
    }
    g.stroke();
  } else {
    path(0.54);
    g.strokeStyle = 'rgba(40,36,30,.45)';
    g.lineWidth = Math.max(0.8, R * 0.04);
    g.stroke();
    bevel(g, () => path(0.54), Math.max(0.8, R * 0.04), 0.2, 0.3);
  }
  // kapitælets inderring
  g.beginPath();
  g.arc(0, 0, R * 0.38, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(255,252,236,.18)';
  g.lineWidth = Math.max(0.8, R * 0.05);
  g.stroke();
  // revner og skår
  g.strokeStyle = 'rgba(30,26,20,.5)';
  g.lineWidth = Math.max(0.6, R * 0.028);
  for (let i = 0; i < 2; i++) {
    const a = r() * 6.28;
    g.beginPath();
    g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
    g.lineTo(Math.cos(a + 0.3) * R * 0.55, Math.sin(a + 0.3) * R * 0.55);
    g.lineTo(Math.cos(a + 0.1) * R * 0.76, Math.sin(a + 0.1) * R * 0.76);
    g.stroke();
  }
  path(1);
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.07);
  g.stroke();
}

// ------------------------------------------------------------------ trapper

export function drawStairs(g: G, o: DrawInput, wood: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const n = Math.max(3, Math.round(h / 16));
  const sh = h / n;
  const base: RGB = wood ? OAK : STONE;
  const rail = wood ? w * 0.09 : w * 0.05;
  // trin
  for (let i = 0; i < n; i++) {
    const y = -h / 2 + i * sh;
    const t = i / (n - 1);
    const tone = shift(base, -22 + t * 44);
    if (wood) {
      g.save();
      g.beginPath();
      g.rect(-w / 2, y, w, sh);
      g.clip();
      woodSurface(g, -w / 2, y, w, sh, tone, r, { count: 1, joints: false });
      g.restore();
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + sh);
      gr.addColorStop(0, rgb(shift(tone, 16)));
      gr.addColorStop(1, rgb(shift(tone, -6)));
      g.fillStyle = gr;
      g.fillRect(-w / 2, y, w, sh + 0.5);
      // stenfuger
      g.fillStyle = 'rgba(24,20,14,.35)';
      let x = -w / 2;
      while (x < w / 2) {
        x += w * (0.22 + r() * 0.3);
        if (x < w / 2) g.fillRect(x, y + sh * 0.1, Math.max(0.7, sh * 0.04), sh * 0.7);
      }
      // slid i midten
      g.fillStyle = 'rgba(255,248,226,.08)';
      g.fillRect(-w * 0.22, y + sh * 0.1, w * 0.44, sh * 0.6);
      // afskallede kanter
      if (r() < 0.5) {
        g.fillStyle = rgb(shift(tone, -30));
        const cx = -w / 2 + r() * w;
        polygon(g, [[cx, y + sh * 0.78], [cx + sh * 0.35, y + sh * 0.78], [cx + sh * 0.18, y + sh * 0.62]]);
        g.fill();
      }
    }
    // forkant (lys) og stødtrin (skygge)
    g.fillStyle = 'rgba(255,248,226,.36)';
    g.fillRect(-w / 2, y, w, Math.max(0.8, sh * 0.1));
    const rg = g.createLinearGradient(0, y + sh * 0.7, 0, y + sh);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(0,0,0,.5)');
    g.fillStyle = rg;
    g.fillRect(-w / 2, y + sh * 0.7, w, sh * 0.3);
    if (wood) {
      g.fillStyle = 'rgba(30,26,24,.85)';
      for (const sx of [-0.4, 0.4]) {
        g.beginPath();
        g.arc(w * sx, y + sh * 0.5, Math.max(0.6, sh * 0.06), 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // vanger
  for (const sx of [-1, 1]) {
    const x = sx < 0 ? -w / 2 : w / 2 - rail;
    const gr = g.createLinearGradient(x, 0, x + rail, 0);
    gr.addColorStop(0, rgb(shift(base, wood ? -26 : -18)));
    gr.addColorStop(1, rgb(shift(base, wood ? -44 : -34)));
    g.fillStyle = gr;
    g.fillRect(x, -h / 2, rail, h);
    g.strokeStyle = 'rgba(16,10,4,.6)';
    g.lineWidth = Math.max(0.8, rail * 0.1);
    g.strokeRect(x, -h / 2, rail, h);
  }
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, w * 0.04);
  g.strokeRect(-w / 2, -h / 2, w, h);
}

// ------------------------------------------------------------------ murbrokker

export function drawRubble(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // støv og mørtel
  for (let i = 0; i < 10; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * S * 0.42;
    smooth(g, blob(S * (0.05 + r() * 0.08), S * 0.05, 0.4, 7, r, Math.cos(a) * d, Math.sin(a) * d));
    g.fillStyle = `rgba(${180 + r() * 30},${172 + r() * 26},${150 + r() * 20},${0.3 + r() * 0.2})`;
    g.fill();
  }
  const list: { x: number; y: number; s: number; brick: boolean }[] = [];
  for (let i = 0; i < 17; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * S * 0.38;
    list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: S * (0.05 + r() * r() * 0.15), brick: r() < 0.18 });
  }
  list.sort((p, q) => p.x + p.y - (q.x + q.y));
  const brick: RockPal = { base: [150, 84, 64], hi: [206, 130, 98], lo: [66, 30, 22], grain: [88, 44, 32] };
  for (const p of list) {
    rockBody(g, r, p.x, p.y, p.s, p.s * (0.65 + r() * 0.3), p.brick ? brick : { ...stonePal, base: shift(stonePal.base, (r() - 0.5) * 36) }, { n: p.brick ? 4 : 6, rough: 0.28, cracks: 0, grain: p.s > S * 0.1 ? 6 : 0, relief: 1.2, noShadow: true });
  }
}
