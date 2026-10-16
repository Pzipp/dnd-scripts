import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blobPath, body, castShadow, clipped, crack, ellBody, groundShadow, lin, mix, mossPatch, mottle, OUT, plankBoard, polyBody, polyPath,
  radial, rectBody, rectPath, rgb, rivet, shift, tube, wobble, woodGrain, type G, type RGB, type Rnd,
} from './helpers';

interface Pal {
  hi: RGB;
  mid: RGB;
  deep: RGB;
}
const PALS: Record<string, Pal> = {
  blue: { hi: [190, 240, 255], mid: [70, 160, 240], deep: [20, 50, 160] },
  red: { hi: [255, 214, 190], mid: [240, 80, 70], deep: [120, 16, 40] },
  green: { hi: [214, 255, 190], mid: [80, 210, 100], deep: [16, 100, 60] },
  violet: { hi: [236, 214, 255], mid: [160, 90, 240], deep: [66, 24, 140] },
  amber: { hi: [255, 244, 190], mid: [250, 180, 50], deep: [150, 70, 10] },
};
const colorParam = { key: 'color', label: 'Farve', type: 'select' as const, default: 'blue', options: [{ value: 'blue', label: 'Blå' }, { value: 'red', label: 'Rød' }, { value: 'green', label: 'Grøn' }, { value: 'violet', label: 'Violet' }, { value: 'amber', label: 'Rav' }] };

function glowDot(g: G, x: number, y: number, rad: number, col: RGB, a: number): void {
  g.fillStyle = radial(g, x, y, rad, [[0, rgb(col, a)], [0.5, rgb(col, a * 0.4)], [1, rgb(col, 0)]]);
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.fill();
}

// ------------------------------------------------------------------ krystalklynge

function crystal(g: G, r: Rnd, bx: number, by: number, ang: number, L: number, W: number, pal: Pal): void {
  g.save();
  g.translate(bx, by);
  g.rotate(ang);
  const pts: [number, number][] = [[-W / 2, 0], [-W * 0.55, -L * 0.5], [-W * 0.12, -L * 0.92], [W * 0.05, -L], [W * 0.5, -L * 0.55], [W / 2, 0]];
  const path = polyPath(g, pts);
  castShadow(g, path, 5, 6, 7, 0.4);
  const toLight = Math.cos(ang - Math.PI * 1.25 + Math.PI / 2);
  const flip = toLight > 0 ? 1 : -1;
  const left = polyPath(g, [pts[0]!, pts[1]!, pts[2]!, pts[3]!, [0, -L * 0.15], [0, 0]]);
  const right = polyPath(g, [[0, 0], [0, -L * 0.15], pts[3]!, pts[4]!, pts[5]!]);
  for (const [p, lit, x0, x1] of [[left, flip > 0, -W / 2, 0], [right, flip < 0, 0, W / 2]] as const) {
    p();
    const c0 = lit ? mix(pal.mid, pal.hi, 0.35) : pal.mid;
    const c1 = lit ? pal.mid : pal.deep;
    g.fillStyle = lin(g, x0, 0, x1, -L * 0.9, [[0, rgb(shift(c0, 10))], [0.6, rgb(c1)], [1, rgb(shift(pal.deep, 20))]]);
    g.fill();
  }
  clipped(g, path, () => {
    // lys fra krystallens indre
    g.fillStyle = radial(g, 0, -L * 0.3, L * 0.7, [[0, rgb(pal.hi, 0.85)], [0.35, rgb(pal.mid, 0.35)], [1, rgb(pal.deep, 0)]]);
    g.fillRect(-W, -L, W * 2, L);
    g.strokeStyle = rgb(pal.hi, 0.5);
    g.lineWidth = 0.9;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const y = -L * (0.15 + r() * 0.65);
      g.moveTo(-W * 0.4, y);
      g.lineTo(W * 0.4, y - L * 0.12);
    }
    g.stroke();
  });
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -L * 0.15);
  g.lineTo(pts[3]![0], pts[3]![1]);
  g.strokeStyle = rgb(pal.hi, 0.9);
  g.lineWidth = 1.2;
  g.stroke();
  g.beginPath();
  g.moveTo(0, -L * 0.15);
  g.lineTo(pts[1]![0], pts[1]![1]);
  g.moveTo(0, -L * 0.15);
  g.lineTo(pts[4]![0], pts[4]![1]);
  g.strokeStyle = rgb(pal.deep, 0.6);
  g.lineWidth = 1;
  g.stroke();
  path();
  g.strokeStyle = rgb(shift(pal.deep, -60), 0.95);
  g.lineWidth = 1.6;
  g.lineJoin = 'round';
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath();
  g.arc(-W * 0.14 * flip, -L * 0.72, Math.max(1, W * 0.07), 0, 7);
  g.fill();
  g.restore();
}

function crystalCluster(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = PALS[param(o, 'color', 'blue')] ?? PALS.blue!;
  glowDot(g, 0, 0, R * 1.0, pal.mid, 0.5);
  // klippegrund med facetter og lysende sprækker
  const stones = 6 + Math.floor(r() * 3);
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * 6.283 + r() * 0.5;
    const d = R * (0.3 + r() * 0.35);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const sr = R * (0.2 + r() * 0.14);
    const sp = polyPath(g, wobble(r, x, y, sr, sr * 0.82, 7, 0.22));
    castShadow(g, sp, 3, 4, 4, 0.45);
    body(g, sp, [66, 62, 72], [x - sr, y - sr, x + sr, y + sr], { lw: 1.5, ao: sr * 0.2, rim: 1.2, light: 28, dark: 28 });
    clipped(g, sp, () => {
      mottle(g, r, [x - sr, y - sr, x + sr, y + sr], [66, 62, 72], 14, 2, 18, 0.35);
      g.save();
      g.globalAlpha = 0.9;
      crack(g, r, x - sr * 0.4, y - sr * 0.2, sr * 0.9, r() * 6, 1.1);
      g.restore();
    });
    // skær i sprækken
    g.strokeStyle = rgb(pal.mid, 0.6);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x - sr * 0.3, y);
    g.lineTo(x + sr * 0.4, y + sr * 0.3);
    g.stroke();
  }
  const n = 9 + Math.floor(r() * 4);
  const list: { x: number; y: number; a: number; L: number; W: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + r() * 0.5;
    const small = i >= 6;
    const d = small ? R * (0.3 + r() * 0.35) : R * (0.04 + r() * 0.16);
    const L = R * (small ? 0.34 + r() * 0.24 : 0.7 + r() * 0.36);
    list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, a: a + Math.PI / 2, L, W: L * (0.3 + r() * 0.08) });
  }
  list.sort((p, q) => q.L - p.L);
  for (const s of list) crystal(g, r, s.x, s.y, s.a, s.L, s.W, pal);
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28;
    const d = R * (0.15 + r() * 0.85);
    glowDot(g, Math.cos(a) * d, Math.sin(a) * d, 2 + r() * 3, pal.hi, 0.9);
  }
}

// ------------------------------------------------------------------ flydende kugler

function floatingOrbs(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const pal = PALS[param(o, 'color', 'violet')] ?? PALS.violet!;
  const glass = param(o, 'style', 'arcane') === 'glass';
  const n = 3 + Math.floor(r() * 2);
  const orbs: { x: number; y: number; R: number }[] = [];
  const base = Math.min(w, h) * 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + r() * 0.8 + 0.4;
    const d = i === 0 ? 0 : base * (0.38 + r() * 0.18);
    orbs.push({ x: Math.cos(a) * d * 1.1, y: Math.sin(a) * d * 0.9 - base * 0.05, R: base * (i === 0 ? 0.36 : 0.2 + r() * 0.1) });
  }
  // skygger og farvet lys på jorden (svævehøjde)
  for (const ob of orbs) {
    const sx = ob.x + ob.R * 0.9;
    const sy = ob.y + ob.R * 1.15;
    g.save();
    g.translate(sx, sy);
    g.scale(1, 0.62);
    g.fillStyle = radial(g, 0, 0, ob.R * 1.2, [[0, 'rgba(10,6,20,.45)'], [1, 'rgba(10,6,20,0)']]);
    g.beginPath();
    g.arc(0, 0, ob.R * 1.2, 0, 7);
    g.fill();
    g.restore();
    glowDot(g, ob.x + ob.R * 0.5, ob.y + ob.R * 0.7, ob.R * 1.7, pal.mid, glass ? 0.12 : 0.3);
  }
  // forbindelsesstråler mellem kuglerne
  if (!glass) {
    g.lineCap = 'round';
    for (let i = 1; i < orbs.length; i++) {
      const a = orbs[0]!;
      const b = orbs[i]!;
      g.strokeStyle = rgb(pal.hi, 0.35);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo((a.x + b.x) / 2 + (r() - 0.5) * 14, (a.y + b.y) / 2 + (r() - 0.5) * 14, b.x, b.y);
      g.stroke();
    }
  }
  for (const ob of orbs) {
    const { x, y, R } = ob;
    // ydre glød
    glowDot(g, x, y, R * 1.8, pal.mid, glass ? 0.1 : 0.4);
    const sp = () => {
      g.beginPath();
      g.arc(x, y, R, 0, 7);
    };
    // glaslegemet
    g.fillStyle = glass
      ? radial(g, x, y, R, [[0, 'rgba(210,235,250,.12)'], [0.75, rgb(pal.mid, 0.2)], [1, rgb(pal.deep, 0.62)]], x - R * 0.2, y - R * 0.2, R * 0.1)
      : radial(g, x, y, R, [[0, rgb(pal.hi, 1)], [0.45, rgb(pal.mid, 0.95)], [1, rgb(pal.deep, 0.98)]], x - R * 0.25, y - R * 0.25, R * 0.05);
    sp();
    g.fill();
    clipped(g, sp, () => {
      // hvirvlende skyer inde i kuglen
      for (let k = 0; k < 6; k++) {
        const a0 = r() * 6.28;
        g.strokeStyle = rgb(k % 2 ? pal.hi : pal.deep, glass ? 0.3 : 0.45);
        g.lineWidth = R * (0.08 + r() * 0.1);
        g.lineCap = 'round';
        g.beginPath();
        g.arc(x + (r() - 0.5) * R * 0.3, y + (r() - 0.5) * R * 0.3, R * (0.3 + r() * 0.5), a0, a0 + 1 + r() * 1.4);
        g.stroke();
      }
      // refleksion fra jorden nederst til højre
      g.fillStyle = radial(g, x + R * 0.55, y + R * 0.65, R * 0.7, [[0, rgb(pal.hi, 0.5)], [1, rgb(pal.hi, 0)]]);
      g.fillRect(x - R, y - R, R * 2, R * 2);
    });
    sp();
    g.strokeStyle = rgb(shift(pal.deep, -30), 0.95);
    g.lineWidth = 1.6;
    g.stroke();
    // lys kant øverst til venstre + spejling
    g.beginPath();
    g.arc(x, y, R * 0.88, Math.PI * 1.05, Math.PI * 1.6);
    g.strokeStyle = 'rgba(255,255,255,.75)';
    g.lineWidth = Math.max(1.2, R * 0.07);
    g.lineCap = 'round';
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath();
    g.ellipse(x - R * 0.38, y - R * 0.42, R * 0.2, R * 0.11, -0.7, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath();
    g.arc(x + R * 0.3, y + R * 0.38, R * 0.05, 0, 7);
    g.fill();
  }
  // gnister
  for (let i = 0; i < 24; i++) {
    const a = r() * 6.28;
    const d = base * (0.2 + r() * 0.85);
    glowDot(g, Math.cos(a) * d, Math.sin(a) * d * 0.9, 1.5 + r() * 2.4, pal.hi, 0.85);
  }
}

// ------------------------------------------------------------------ portalring

function portalRing(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = PALS[param(o, 'color', 'violet')] ?? PALS.violet!;
  const active = param(o, 'active', true);
  const stone: RGB = [112, 108, 114];
  const Ro = R * 0.94;
  const Ri = R * 0.66;
  groundShadow(g, R * 0.05, R * 0.06, R, R * 0.96, 0.5);
  if (active) glowDot(g, 0, 0, R * 1.05, pal.mid, 0.35);
  // indre portal
  const hole = () => {
    g.beginPath();
    g.arc(0, 0, Ri, 0, 7);
  };
  hole();
  g.fillStyle = active ? radial(g, 0, 0, Ri, [[0, rgb(pal.hi)], [0.3, rgb(pal.mid)], [0.8, rgb(pal.deep)], [1, rgb(shift(pal.deep, -40))]]) : radial(g, 0, 0, Ri, [[0, 'rgb(40,36,34)'], [1, 'rgb(14,12,12)']]);
  g.fill();
  clipped(g, hole, () => {
    if (active) {
      g.lineCap = 'round';
      for (let a = 0; a < 7; a++) {
        const off = (a / 7) * 6.283;
        g.beginPath();
        for (let t = 0; t <= 60; t++) {
          const k = t / 60;
          const ang = off + k * 4.4;
          const rad = Ri * (0.05 + k * 0.98);
          const x = Math.cos(ang) * rad;
          const y = Math.sin(ang) * rad;
          if (t) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.strokeStyle = rgb(a % 2 ? pal.hi : pal.mid, 0.55);
        g.lineWidth = Ri * (0.06 + (a % 3) * 0.03);
        g.stroke();
      }
      glowDot(g, 0, 0, Ri * 0.5, [255, 255, 255], 0.9);
    } else {
      // mørk, stille åbning: jord og få sten
      mottle(g, r, [-Ri, -Ri, Ri, Ri], [60, 52, 44], 50, 4, 24, 0.5);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(-Ri, -Ri, Ri * 2, Ri * 2);
    }
    // indre skygge fra ringen (øverst til venstre)
    g.save();
    g.translate(Ri * 0.06, Ri * 0.08);
    hole();
    g.strokeStyle = 'rgba(0,0,0,.5)';
    g.lineWidth = Ri * 0.16;
    g.stroke();
    g.restore();
  });
  // stenblokke i ringen
  const nb = 14;
  for (let i = 0; i < nb; i++) {
    const a0 = (i / nb) * 6.283 + 0.02;
    const a1 = ((i + 1) / nb) * 6.283 - 0.02;
    const rr = [Ri * 0.98, Ro];
    const bp = () => {
      g.beginPath();
      g.arc(0, 0, rr[1]!, a0, a1);
      g.arc(0, 0, rr[0]!, a1, a0, true);
      g.closePath();
    };
    const mid = (a0 + a1) / 2;
    const lit = Math.cos(mid - Math.PI * 1.25) * 0.5 + 0.5;
    const c = shift(stone, (r() - 0.5) * 16 + (lit - 0.5) * 34);
    castShadow(g, bp, 3, 4, 4, 0.35);
    body(g, bp, c, [Math.cos(mid) * Ri - 12, Math.sin(mid) * Ri - 12, Math.cos(mid) * Ro + 12, Math.sin(mid) * Ro + 12], { lw: 1.6, ao: 2.2, rim: 1.2, light: 18, dark: 22, angle: 45 });
    clipped(g, bp, () => {
      mottle(g, r, [Math.min(Math.cos(a0), Math.cos(a1)) * Ro - 2, Math.min(Math.sin(a0), Math.sin(a1)) * Ro - 2, Math.max(Math.cos(a0), Math.cos(a1)) * Ro + 2, Math.max(Math.sin(a0), Math.sin(a1)) * Ro + 2], c, 10, 2, 20, 0.3);
      if (r() < 0.3) mossPatch(g, r, Math.cos(mid) * Ro * 0.9, Math.sin(mid) * Ro * 0.9, R * 0.1, 18);
      if (r() < 0.35) crack(g, r, Math.cos(mid) * Ri * 1.05, Math.sin(mid) * Ri * 1.05, R * 0.14, mid + 1.5, 0.9);
    });
    // glød-rune
    const rm = (Ri + Ro) / 2;
    const gx = Math.cos(mid) * rm;
    const gy = Math.sin(mid) * rm;
    g.save();
    g.translate(gx, gy);
    g.rotate(mid + Math.PI / 2);
    const rn = [
      [[-3, -4], [3, -4], [0, 4]],
      [[-3, 4], [0, -4], [3, 4]],
      [[-3, -4], [-3, 4], [3, 0]],
      [[0, -5], [0, 5]],
    ][i % 4]!;
    g.beginPath();
    rn.forEach((p, k) => (k ? g.lineTo(p[0]!, p[1]!) : g.moveTo(p[0]!, p[1]!)));
    g.strokeStyle = active ? rgb(pal.hi, 0.95) : 'rgba(18,12,8,.55)';
    g.lineWidth = active ? 1.5 : 1.3;
    g.lineJoin = 'round';
    if (active) {
      g.strokeStyle = rgb(pal.mid, 0.45);
      g.lineWidth = 3.6;
      g.stroke();
      g.strokeStyle = rgb(pal.hi, 0.95);
      g.lineWidth = 1.5;
    }
    g.stroke();
    g.restore();
  }
  // yderkant
  g.beginPath();
  g.arc(0, 0, Ro, 0, 7);
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, Ri * 0.99, 0, 7);
  g.strokeStyle = active ? rgb(pal.hi, 0.7) : OUT;
  g.lineWidth = 1.6;
  g.stroke();
  if (active) {
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28;
      const d = r() * Ri * 1.1;
      glowDot(g, Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * 2.5, pal.hi, 0.9);
    }
  }
}

// ------------------------------------------------------------------ alkymibord

const LIQ: Record<string, RGB> = { green: [90, 220, 110], purple: [170, 90, 230], red: [230, 60, 70], blue: [70, 160, 240] };

function flask(g: G, r: Rnd, x: number, y: number, rad: number, liquid: RGB, shape: 'round' | 'erlen' | 'tube', fill: number): void {
  // flaske set oppefra: en rund bund, hals og prop; vi viser den let skråt
  const body0 = () => {
    g.beginPath();
    g.arc(x, y, rad, 0, 7);
  };
  groundShadow(g, x + rad * 0.5, y + rad * 0.6, rad * 1.1, rad * 0.8, 0.45);
  g.fillStyle = radial(g, x, y, rad, [[0, 'rgba(230,246,255,.35)'], [0.6, 'rgba(160,200,220,.4)'], [1, 'rgba(60,90,110,.65)']], x - rad * 0.3, y - rad * 0.3, 0.5);
  body0();
  g.fill();
  // væske
  const lp = () => {
    g.beginPath();
    g.arc(x + rad * 0.04, y + rad * 0.06, rad * (0.55 + 0.35 * fill), 0, 7);
  };
  g.fillStyle = radial(g, x, y, rad, [[0, rgb(shift(liquid, 40), 0.95)], [0.6, rgb(liquid, 0.95)], [1, rgb(shift(liquid, -60), 0.98)]], x - rad * 0.2, y - rad * 0.2, 0.5);
  lp();
  g.fill();
  // glød fra væsken
  g.fillStyle = radial(g, x, y, rad * 1.8, [[0, rgb(liquid, 0.18)], [1, rgb(liquid, 0)]]);
  g.beginPath();
  g.arc(x, y, rad * 1.8, 0, 7);
  g.fill();
  body0();
  g.strokeStyle = 'rgba(14,20,24,.85)';
  g.lineWidth = 1.4;
  g.stroke();
  // hals og prop
  if (shape !== 'round') {
    const nr = shape === 'tube' ? rad * 0.2 : rad * 0.26;
    ellBody(g, x, y, nr + 1.2, nr + 1.2, [170, 190, 200], { lw: 1, ao: 0.4, rim: 0.4 });
    ellBody(g, x, y, nr * 0.55, nr * 0.55, [120, 86, 52], { lw: 0.9, ao: 0.4, rim: 0.4 });
  } else {
    ellBody(g, x, y, rad * 0.3, rad * 0.3, [214, 232, 240], { lw: 1, ao: 0.4, rim: 0.4 });
    ellBody(g, x, y, rad * 0.18, rad * 0.18, [128, 92, 56], { lw: 0.8, ao: 0.4, rim: 0.4 });
  }
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.beginPath();
  g.ellipse(x - rad * 0.5, y - rad * 0.55, rad * 0.22, rad * 0.1, -0.7, 0, 7);
  g.fill();
  void r;
}

function alchemyTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const liq = param(o, 'liquid', 'green');
  const lc = LIQ[liq] ?? LIQ.green!;
  const wood: RGB = [102, 72, 44];
  const x0 = -w * 0.48;
  const y0 = -h * 0.46;
  const W = w * 0.96;
  const H = h * 0.92;
  const tp = rectPath(g, x0, y0, W, H, 5);
  castShadow(g, tp, 4, 6, 6, 0.4);
  body(g, tp, wood, [x0, y0, x0 + W, y0 + H], { lw: 2.2, ao: 3, rim: 1.6 });
  clipped(g, tp, () => {
    plankBoard(g, r, x0, y0, W, H, wood, 4, { wear: 1.4 });
    // brændemærker og pletter
    for (let i = 0; i < 6; i++) {
      const x = x0 + r() * W;
      const y = y0 + r() * H;
      const c = r() < 0.5 ? lc : [30, 16, 6];
      g.fillStyle = radial(g, x, y, 5 + r() * 8, [[0, rgb(c as RGB, 0.35)], [1, rgb(c as RGB, 0)]]);
      g.beginPath();
      g.arc(x, y, 5 + r() * 8, 0, 7);
      g.fill();
    }
    g.fillStyle = lin(g, x0, y0, x0 + W, y0 + H, [[0, 'rgba(255,230,190,.12)'], [1, 'rgba(0,0,0,.2)']]);
    g.fillRect(x0, y0, W, H);
  });
  // åben bog
  const bx = -w * 0.2;
  const by = h * 0.02;
  const bw = w * 0.2;
  const bh = h * 0.5;
  g.save();
  g.translate(bx, by);
  g.rotate(-0.12);
  castShadow(g, rectPath(g, -bw, -bh / 2, bw * 2, bh, 2), 2, 3, 3, 0.4);
  rectBody(g, -bw - 2, -bh / 2 - 2, bw * 2 + 4, bh + 4, 3, [96, 36, 34], { lw: 1.6, ao: 1.5, rim: 1 });
  for (const s of [-1, 1]) {
    const px = s < 0 ? -bw : 0;
    rectBody(g, px, -bh / 2, bw, bh, 1, [232, 220, 188], { lw: 1, ao: 1.4, rim: 0.4 });
    g.strokeStyle = 'rgba(60,40,24,.55)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 9; i++) {
      const ly = -bh / 2 + 5 + i * (bh - 10) / 8;
      g.beginPath();
      g.moveTo(px + 4, ly);
      g.lineTo(px + bw - 4 - r() * 8, ly);
      g.stroke();
    }
  }
  // lille skitse
  g.strokeStyle = rgb(shift(lc, -60), 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.arc(-bw * 0.5, -bh * 0.1, bh * 0.1, 0, 7);
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,.2)';
  g.fillRect(-1, -bh / 2, 2, bh);
  g.restore();
  // fjerpen
  const qx = -w * 0.03;
  const qy = h * 0.26;
  g.beginPath();
  g.moveTo(qx, qy);
  g.lineTo(qx + w * 0.1, qy - h * 0.1);
  g.strokeStyle = 'rgba(30,20,10,.9)';
  g.lineWidth = 2.8;
  g.stroke();
  g.strokeStyle = 'rgb(236,230,214)';
  g.lineWidth = 1.6;
  g.stroke();
  // morter med støder
  const mx = w * 0.04;
  const my = -h * 0.2;
  ellBody(g, mx, my, h * 0.15, h * 0.15, [100, 98, 94], { lw: 1.6, ao: 2, rim: 1.2, light: 30 });
  ellBody(g, mx, my, h * 0.11, h * 0.11, [58, 56, 52], { lw: 1.2, ao: 2, rim: 0.4, light: -10, dark: 4 });
  g.fillStyle = 'rgb(120,170,80)';
  for (let i = 0; i < 10; i++) {
    g.beginPath();
    g.arc(mx + (r() - 0.5) * h * 0.1, my + (r() - 0.5) * h * 0.1, 1.2 + r(), 0, 7);
    g.fill();
  }
  const pe = () => { g.beginPath(); g.moveTo(mx - 1, my); g.lineTo(mx + h * 0.2, my + h * 0.12); };
  tube(g, pe, 5, [196, 190, 180]);
  // flasker i et trægestel
  const fy = -h * 0.17;
  const fx = w * 0.3;
  rectBody(g, fx - w * 0.085, fy - h * 0.1, w * 0.3, h * 0.2, 3, [76, 52, 32], { lw: 1.3, ao: 1.4, rim: 0.8 });
  const sh: ('round' | 'erlen' | 'tube')[] = ['round', 'erlen', 'tube'];
  const cols = [lc, LIQ.purple!, LIQ.red!];
  for (let i = 0; i < 3; i++) flask(g, r, fx - w * 0.03 + i * w * 0.095, fy, h * (0.1 + (i % 2) * 0.012), cols[(i + (liq === 'green' ? 0 : 1)) % 3]!, sh[i]!, 0.4 + r() * 0.5);
  // brænder med kolbe, der bobler
  const kx = w * 0.18;
  const ky = h * 0.2;
  // tripod
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.3;
    const lg = () => { g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(a) * h * 0.2, ky + Math.sin(a) * h * 0.2); };
    tube(g, lg, 2.8, [60, 58, 60]);
  }
  glowDot(g, kx, ky, h * 0.2, [120, 190, 255], 0.5);
  ellBody(g, kx, ky, h * 0.05, h * 0.05, [150, 210, 255], { lw: 0.8, ao: 0, light: 60 });
  flask(g, r, kx, ky, h * 0.17, lc, 'erlen', 0.7);
  // bobler
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(kx + (r() - 0.5) * h * 0.14, ky + (r() - 0.5) * h * 0.14, 1 + r() * 1.8, 0, 7);
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  // lys
  const cx = -w * 0.38;
  const cy = -h * 0.28;
  glowDot(g, cx, cy, h * 0.3, [255, 190, 90], 0.45);
  ellBody(g, cx, cy, h * 0.05, h * 0.05, [236, 226, 200], { lw: 1.1, ao: 0.8, rim: 0.6 });
  ellBody(g, cx - 0.5, cy - 0.5, h * 0.026, h * 0.026, [255, 220, 120], { lw: 0.6, ao: 0, light: 40 });
  glowDot(g, cx, cy, h * 0.06, [255, 244, 190], 1);
  // urter på bordet
  for (let i = 0; i < 6; i++) {
    const hx = -w * 0.04 + i * 4;
    const hy = h * 0.32 + (r() - 0.5) * 8;
    g.save();
    g.translate(hx, hy);
    g.rotate(r() * 6);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(5, -3, 9, 0);
    g.quadraticCurveTo(5, 3, 0, 0);
    g.fillStyle = rgb(shift([88, 140, 60], (r() - 0.5) * 50));
    g.fill();
    g.strokeStyle = 'rgba(20,40,10,.8)';
    g.lineWidth = 0.8;
    g.stroke();
    g.restore();
  }
}

// ------------------------------------------------------------------ spåkugle

function scryingOrb(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = PALS[param(o, 'color', 'violet')] ?? PALS.violet!;
  const stone: RGB = [126, 122, 130];
  // ottekantet sokkel i to trin
  const oct = (rad: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 + 0.3927;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    return pts;
  };
  castShadow(g, polyPath(g, oct(R * 0.9)), 5, 6, 6, 0.45);
  polyBody(g, oct(R * 0.9), shift(stone, -14), { lw: 2, ao: R * 0.05, rim: 1.6 });
  clipped(g, polyPath(g, oct(R * 0.9)), () => {
    mottle(g, r, [-R, -R, R, R], stone, 80, 3, 20, 0.3);
    crack(g, r, R * 0.5, -R * 0.3, R * 0.3, 2, 1);
    mossPatch(g, r, -R * 0.6, R * 0.5, R * 0.2, 18);
  });
  polyBody(g, oct(R * 0.7), stone, { lw: 1.8, ao: R * 0.04, rim: 1.4, light: 24 });
  // runer om kanten
  g.strokeStyle = rgb(pal.mid, 0.75);
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.283;
    const rr = R * 0.8;
    g.save();
    g.translate(Math.cos(a) * rr, Math.sin(a) * rr);
    g.rotate(a);
    g.beginPath();
    g.moveTo(-1.5, -3);
    g.lineTo(r() < 0.5 ? 2 : -2, 0);
    g.lineTo(-1.5, 3);
    g.stroke();
    g.restore();
  }
  // klosholder: tre bronze-klør
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.283 + 0.9;
    const claw = () => {
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.68, Math.sin(a) * R * 0.68);
      g.quadraticCurveTo(Math.cos(a + 0.2) * R * 0.5, Math.sin(a + 0.2) * R * 0.5, Math.cos(a) * R * 0.38, Math.sin(a) * R * 0.38);
    };
    tube(g, claw, R * 0.12, [150, 108, 54]);
  }
  // selve kuglen
  const kr = R * 0.5;
  glowDot(g, 0, 0, R * 1.0, pal.mid, 0.3);
  const sp = () => {
    g.beginPath();
    g.arc(0, 0, kr, 0, 7);
  };
  castShadow(g, sp, 4, 5, 5, 0.35);
  g.fillStyle = radial(g, 0, 0, kr, [[0, rgb(pal.hi, 0.95)], [0.4, rgb(pal.mid, 0.9)], [0.85, rgb(pal.deep, 0.95)], [1, rgb(shift(pal.deep, -40), 1)]], -kr * 0.2, -kr * 0.2, kr * 0.05);
  sp();
  g.fill();
  clipped(g, sp, () => {
    g.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const a0 = r() * 6.28;
      g.strokeStyle = rgb(k % 2 ? pal.hi : pal.deep, 0.5);
      g.lineWidth = kr * (0.05 + r() * 0.1);
      g.beginPath();
      g.arc((r() - 0.5) * kr * 0.4, (r() - 0.5) * kr * 0.4, kr * (0.25 + r() * 0.55), a0, a0 + 0.8 + r() * 1.6);
      g.stroke();
    }
    glowDot(g, kr * 0.1, kr * 0.1, kr * 0.5, pal.hi, 0.5);
    g.fillStyle = radial(g, kr * 0.5, kr * 0.6, kr * 0.7, [[0, rgb(pal.hi, 0.4)], [1, rgb(pal.hi, 0)]]);
    g.fillRect(-kr, -kr, kr * 2, kr * 2);
  });
  sp();
  g.strokeStyle = rgb(shift(pal.deep, -50), 0.95);
  g.lineWidth = 1.8;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, kr * 0.88, Math.PI * 1.05, Math.PI * 1.6);
  g.strokeStyle = 'rgba(255,255,255,.8)';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.beginPath();
  g.ellipse(-kr * 0.4, -kr * 0.45, kr * 0.2, kr * 0.1, -0.7, 0, 7);
  g.fill();
  for (let i = 0; i < 10; i++) {
    const a = r() * 6.28;
    glowDot(g, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, 1.5 + r() * 2, pal.hi, 0.8);
  }
}

export const arcaneKinds: ObjectKind[] = [
  kind({
    key: 'crystal_cluster', family: 'arcane', name: 'Krystalklynge', w: 1.6, h: 1.6, sizeJitter: 0.2, shadow: 5, bleed: 0.14, randomRotation: true,
    params: [colorParam],
    draw: crystalCluster,
  }),
  kind({
    key: 'floating_orbs', family: 'arcane', name: 'Flydende kugler', w: 2, h: 2, shadow: 0, bleed: 0.15, layers: ['effects', 'objects'],
    params: [
      { ...colorParam, default: 'violet' },
      { key: 'style', label: 'Udseende', type: 'select', default: 'arcane', options: [{ value: 'arcane', label: 'Glødende' }, { value: 'glass', label: 'Glas' }] },
    ],
    draw: floatingOrbs,
  }),
  kind({
    key: 'portal_ring', family: 'arcane', name: 'Portalring', w: 3, h: 3, shadow: 0, bleed: 0.1, layers: ['objects', 'effects'],
    params: [{ ...colorParam, default: 'violet' }, { key: 'active', label: 'Aktiv', type: 'toggle', default: true }],
    draw: portalRing,
  }),
];

export const workshopKinds: ObjectKind[] = [
  kind({
    key: 'alchemy_table', family: 'workshop', name: 'Alkymibord', w: 3, h: 1.9, keepAspect: false, shadow: 4, bleed: 0.06, randomRotation: false,
    params: [{ key: 'liquid', label: 'Eliksir', type: 'select', default: 'green', options: [{ value: 'green', label: 'Grøn' }, { value: 'purple', label: 'Lilla' }, { value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }] }],
    draw: alchemyTable,
  }),
  kind({
    key: 'scrying_orb', family: 'workshop', name: 'Spåkugle på sokkel', w: 1.6, h: 1.6, shadow: 5, bleed: 0.1, randomRotation: false,
    params: [colorParam].map((p) => ({ ...p, default: 'violet' })),
    draw: scryingOrb,
  }),
];

void rectBody;
void woodGrain;
void rivet;
void blobPath;
