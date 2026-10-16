import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  body, castShadow, clipped, crack, groundShadow, lin, mix, mottle, OUT, polyBody, polyPath, radial, rectBody, rgb, shift, tube,
  type G, type RGB, type Rnd,
} from './helpers';

/** Rillet kuppel (kaktus set oppefra): ribber, torne, lys fra øverst til venstre. */
function ribbed(g: G, r: Rnd, cx: number, cy: number, R: number, n: number, col: RGB, spines: boolean): void {
  const path = () => {
    g.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const rad = R * (1 + 0.055 * Math.cos(a * n));
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
  };
  path();
  g.fillStyle = radial(g, cx, cy, R * 1.05, [[0, rgb(shift(col, 36))], [0.5, rgb(col)], [1, rgb(shift(col, -42))]], cx - R * 0.35, cy - R * 0.38, R * 0.05);
  g.fill();
  clipped(g, path, () => {
    g.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 0.5) / n) * Math.PI * 2;
      // dal (mørk) og ryg (lys), lyse mod nordvest
      const lit = Math.cos(a1 - Math.PI * 1.25) * 0.5 + 0.5;
      g.strokeStyle = `rgba(14,30,18,${0.28 + (1 - lit) * 0.25})`;
      g.lineWidth = Math.max(1, R * 0.07);
      g.beginPath();
      g.moveTo(cx + Math.cos(a1) * R * 0.1, cy + Math.sin(a1) * R * 0.1);
      g.lineTo(cx + Math.cos(a1) * R * 1.05, cy + Math.sin(a1) * R * 1.05);
      g.stroke();
      g.strokeStyle = `rgba(210,240,170,${0.1 + lit * 0.18})`;
      g.lineWidth = Math.max(0.8, R * 0.05);
      g.beginPath();
      g.moveTo(cx + Math.cos(a0) * R * 0.1, cy + Math.sin(a0) * R * 0.1);
      g.lineTo(cx + Math.cos(a0) * R * 1.05, cy + Math.sin(a0) * R * 1.05);
      g.stroke();
    }
  });
  if (spines) {
    g.strokeStyle = 'rgba(236,224,176,.8)';
    g.lineWidth = 0.7;
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      for (let j = 0; j < 5; j++) {
        const d = R * (0.28 + j * 0.17 + (r() - 0.5) * 0.04);
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d;
        for (let s = 0; s < 3; s++) {
          const sa = a + (s - 1) * 0.7 + (r() - 0.5) * 0.4;
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(sa) * R * 0.07, y + Math.sin(sa) * R * 0.07);
        }
      }
    }
    g.stroke();
  }
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.stroke();
}

function opuntia(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R0 = Math.min(o.w, o.h) / 2;
  const fruit = param(o, 'fruit', true);
  const hue = r();
  const col: RGB = mix([86, 128, 92], [112, 138, 72], hue);
  type Pad = { x: number; y: number; a: number; rx: number; ry: number; parent: number };
  const pads: Pad[] = [{ x: 0, y: 0, a: r() * 6.28, rx: R0 * 0.26, ry: R0 * 0.34, parent: -1 }];
  const n = 6 + Math.floor(r() * 4);
  for (let i = 1; i < n; i++) {
    const pi = Math.floor(Math.pow(r(), 0.6) * pads.length);
    const p = pads[pi]!;
    const a = p.a + (r() - 0.5) * 2.2 + (pi === 0 ? r() * 6.28 : 0);
    const rx = R0 * (0.2 + r() * 0.07);
    const ry = rx * (1.25 + r() * 0.15);
    const dist = p.ry * 0.82 + ry * 0.7;
    pads.push({ x: p.x + Math.sin(a) * dist, y: p.y - Math.cos(a) * dist, a, rx, ry, parent: pi });
  }
  // tilpas til boksen
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pads) {
    x0 = Math.min(x0, p.x - p.ry); x1 = Math.max(x1, p.x + p.ry); y0 = Math.min(y0, p.y - p.ry); y1 = Math.max(y1, p.y + p.ry);
  }
  const k = (R0 * 1.8) / Math.max(x1 - x0, y1 - y0);
  g.save();
  g.scale(k, k);
  g.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  pads.forEach((p, idx) => {
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.a);
    const path = () => {
      g.beginPath();
      g.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
    };
    castShadow(g, path, 6, 7, 6, 0.38);
    const c = shift(col, (r() - 0.5) * 18 - idx * 1.5);
    g.save();
    g.rotate(-p.a);
    // lysretning uafhængig af padens vinkel
    g.restore();
    body(g, path, c, [-p.rx, -p.ry, p.rx, p.ry], { lw: 1.8, ao: p.rx * 0.2, rim: 1.4, light: 22, dark: 34, angle: 45 - (p.a * 180) / Math.PI });
    clipped(g, path, () => {
      // blålig dug og mørke kanter
      g.fillStyle = radial(g, 0, 0, p.ry, [[0, 'rgba(170,200,190,.22)'], [1, 'rgba(170,200,190,0)']], -p.rx * 0.2, -p.ry * 0.25, 1);
      g.fillRect(-p.rx, -p.ry, p.rx * 2, p.ry * 2);
      // areoler i ruder med torne
      g.strokeStyle = 'rgba(240,230,180,.8)';
      g.lineWidth = 0.7;
      g.beginPath();
      for (let yy = -p.ry * 0.8; yy < p.ry * 0.85; yy += p.rx * 0.5) {
        const row = Math.round((yy + p.ry) / (p.rx * 0.5));
        for (let xx = -p.rx * 0.78 + (row % 2) * p.rx * 0.38; xx < p.rx * 0.8; xx += p.rx * 0.76) {
          const px = xx + (r() - 0.5) * 2;
          const py = yy + (r() - 0.5) * 2;
          for (let s = 0; s < 3; s++) {
            const sa = (s / 3) * 6.28 + r();
            g.moveTo(px, py);
            g.lineTo(px + Math.cos(sa) * p.rx * 0.2, py + Math.sin(sa) * p.rx * 0.2);
          }
        }
      }
      g.stroke();
      g.fillStyle = 'rgba(60,40,20,.7)';
      for (let yy = -p.ry * 0.8; yy < p.ry * 0.85; yy += p.rx * 0.5) {
        const row = Math.round((yy + p.ry) / (p.rx * 0.5));
        for (let xx = -p.rx * 0.78 + (row % 2) * p.rx * 0.38; xx < p.rx * 0.8; xx += p.rx * 0.76) {
          g.beginPath();
          g.arc(xx, yy, 1.1, 0, 7);
          g.fill();
        }
      }
    });
    // frugter langs kanten af de yderste puder
    if (fruit && idx > 1 && r() < 0.75) {
      for (let f = 0; f < 3; f++) {
        const fa = -1.57 + (f - 1) * 0.55 + (r() - 0.5) * 0.3;
        const fx = Math.cos(fa) * p.rx * 0.95;
        const fy = Math.sin(fa) * p.ry * 0.95;
        g.beginPath();
        g.ellipse(fx, fy, p.rx * 0.2, p.rx * 0.27, fa + 1.57, 0, 7);
        g.fillStyle = radial(g, fx, fy, p.rx * 0.3, [[0, 'rgb(220,70,90)'], [1, 'rgb(110,20,50)']], fx - 1.5, fy - 1.5, 0.5);
        g.fill();
        g.strokeStyle = 'rgba(40,6,20,.85)';
        g.lineWidth = 1;
        g.stroke();
        g.fillStyle = 'rgba(255,200,210,.7)';
        g.beginPath();
        g.arc(fx - 1.2, fy - 1.4, 0.9, 0, 7);
        g.fill();
      }
    }
    g.restore();
  });
  g.restore();
}

// ------------------------------------------------------------------ palme

function palm(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const n = 11 + Math.floor(r() * 3);
  const dark: RGB = mix([36, 92, 44], [60, 110, 40], r());
  const light: RGB = mix([112, 168, 60], [150, 176, 70], r());
  const fronds: { a: number; len: number; bend: number; dead: boolean }[] = [];
  for (let i = 0; i < n; i++) fronds.push({ a: (i / n) * 6.283 + (r() - 0.5) * 0.35, len: R * (0.78 + r() * 0.24), bend: (r() - 0.5) * 0.5, dead: i % 5 === 3 && r() < 0.5 });
  const drawFronds = (shadow: boolean): void => {
    fronds.forEach((f, idx) => {
      const lit = Math.cos(f.a - Math.PI * 1.25) * 0.5 + 0.5; // vender mod nordvest = lys
      const ex = Math.cos(f.a) * f.len;
      const ey = Math.sin(f.a) * f.len;
      const nx = -Math.sin(f.a);
      const ny = Math.cos(f.a);
      const cxp = ex * 0.5 + nx * f.len * f.bend;
      const cyp = ey * 0.5 + ny * f.len * f.bend;
      const P = (t: number): [number, number, number, number] => {
        const u = 1 - t;
        const x = 2 * u * t * cxp + t * t * ex;
        const y = 2 * u * t * cyp + t * t * ey;
        const tx = 2 * u * cxp + 2 * t * (ex - cxp);
        const ty = 2 * u * cyp + 2 * t * (ey - cyp);
        const l = Math.hypot(tx, ty) || 1;
        return [x, y, tx / l, ty / l];
      };
      const c = f.dead ? ([140, 120, 70] as RGB) : mix(dark, light, lit * 0.8 + (idx % 2) * 0.1);
      const leaf = (col: string, w: number, off: number): void => {
        g.beginPath();
        const steps = 26;
        for (let i = 0; i < steps; i++) {
          const t = 0.14 + (i / (steps - 1)) * 0.84;
          const [x, y, tx, ty] = P(t);
          const ll = f.len * 0.3 * Math.sin(Math.PI * Math.pow(t, 0.75)) * (f.dead ? 0.6 : 1);
          for (const s of [-1, 1]) {
            const ang = Math.atan2(ty, tx) + s * (0.95 - t * 0.35);
            // bladene bøjer lidt mod nederst til højre (tyngdekraft)
            const ex2 = x + Math.cos(ang) * ll + 0.12 * ll;
            const ey2 = y + Math.sin(ang) * ll + 0.18 * ll;
            g.moveTo(x + off, y + off);
            g.lineTo(ex2 + off, ey2 + off);
          }
        }
        g.strokeStyle = col;
        g.lineWidth = w;
        g.lineCap = 'round';
        g.stroke();
      };
      if (shadow) {
        leaf('rgba(10,6,0,.5)', 2.4, 0);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(cxp, cyp, ex, ey);
        g.strokeStyle = 'rgba(10,6,0,.5)';
        g.lineWidth = 3;
        g.stroke();
        return;
      }
      leaf(rgb(shift(c, -38)), 2.6, 0);
      leaf(rgb(c), 1.7, -0.4);
      leaf(rgb(shift(c, 30), 0.85), 0.8, -0.9);
      // midterribbe
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(cxp, cyp, ex, ey);
      g.strokeStyle = 'rgba(30,22,8,.85)';
      g.lineWidth = 3.4;
      g.stroke();
      g.strokeStyle = rgb(f.dead ? [190, 170, 110] : [186, 200, 120]);
      g.lineWidth = 1.5;
      g.translate(-0.5, -0.5);
      g.stroke();
      g.translate(0.5, 0.5);
    });
  };
  // fronderne ligger lagvis: de nederste først
  drawFronds(false);
  // krone: bladfødder, dadler
  const crown: [number, number][] = [];
  for (let i = 0; i < 12; i++) crown.push([Math.cos(i * 0.52) * R * 0.1, Math.sin(i * 0.52) * R * 0.1]);
  g.fillStyle = radial(g, 0, 0, R * 0.17, [[0, 'rgb(108,86,52)'], [1, 'rgb(52,38,22)']], -R * 0.04, -R * 0.04, 1);
  g.beginPath();
  g.arc(0, 0, R * 0.15, 0, 7);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  g.strokeStyle = 'rgba(30,18,8,.6)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7;
    g.moveTo(Math.cos(a) * R * 0.04, Math.sin(a) * R * 0.04);
    g.lineTo(Math.cos(a) * R * 0.14, Math.sin(a) * R * 0.14);
  }
  g.stroke();
  if (param(o, 'dates', true)) {
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.28;
      const d = R * (0.08 + r() * 0.14);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      g.fillStyle = radial(g, x, y, R * 0.04, [[0, 'rgb(240,160,50)'], [1, 'rgb(150,70,20)']], x - 1, y - 1, 0.3);
      g.beginPath();
      g.ellipse(x, y, R * 0.03, R * 0.045, a, 0, 7);
      g.fill();
      g.strokeStyle = 'rgba(40,16,4,.7)';
      g.lineWidth = 0.7;
      g.stroke();
    }
  }
}

// ------------------------------------------------------------------ obelisk

function obelisk(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const stoneName = param(o, 'stone', 'sandstone');
  const base: RGB = stoneName === 'basalt' ? [70, 70, 76] : stoneName === 'limestone' ? [208, 198, 170] : [196, 158, 104];
  const S = w * 0.2; // halv bredde af skaftet
  const cx = -w * 0.2;
  const cy = -h * 0.2;
  const tall = w * 0.95;
  // sokkel i to trin
  const step = (s: number, c: RGB): void => {
    const x0 = cx - s;
    const y0 = cy - s;
    castShadow(g, () => { g.beginPath(); g.rect(x0, y0, s * 2, s * 2); }, 4, 5, 5, 0.35);
    rectBody(g, x0, y0, s * 2, s * 2, 2, c, { lw: 1.8, ao: s * 0.1, rim: 1.4 });
    clipped(g, () => { g.beginPath(); g.rect(x0, y0, s * 2, s * 2); }, () => {
      mottle(g, r, [x0, y0, x0 + s * 2, y0 + s * 2], c, 16, 2.4, 20, 0.35);
      crack(g, r, x0 + r() * s * 2, y0 + r() * s * 2, s * 0.8, r() * 6, 0.9);
    });
  };
  step(S * 1.35, shift(base, -16));
  step(S * 1.12, shift(base, -4));
  // skaftet set ovenfra: fire flader mod toppen (pyramidion)
  const T = S * 0.18; // toppens halve bredde
  const A: [number, number] = [cx - S, cy - S];
  const B: [number, number] = [cx + S, cy - S];
  const C: [number, number] = [cx + S, cy + S];
  const D: [number, number] = [cx - S, cy + S];
  const a: [number, number] = [cx - T, cy - T];
  const b: [number, number] = [cx + T, cy - T];
  const c: [number, number] = [cx + T, cy + T];
  const d: [number, number] = [cx - T, cy + T];
  const faces: [[number, number][], number][] = [
    [[A, B, b, a], 6],
    [[A, a, d, D], 22],
    [[B, C, c, b], -10],
    [[D, C, c, d], -30],
  ];
  const cap = param(o, 'cap', 'plain');
  for (const [pts, lit] of faces) {
    const fc = shift(base, lit);
    polyBody(g, pts, fc, { lw: 1.4, ao: 0, rim: 0, light: 6, dark: 8, outline: 'rgba(30,18,8,.6)' });
    clipped(g, polyPath(g, pts), () => {
      mottle(g, r, [cx - S, cy - S, cx + S, cy + S], fc, 14, 2, 18, 0.3);
      // vind-erosion: lyse striber og mørke render langs fladen
      g.strokeStyle = 'rgba(30,16,6,.2)';
      g.lineWidth = 0.8;
      for (let i = 0; i < 9; i++) {
        const t = r();
        g.beginPath();
        g.moveTo(cx - S + t * S * 2, cy - S);
        g.lineTo(cx - S * 0.2 + t * S * 0.4, cy);
        g.stroke();
        g.beginPath();
        g.moveTo(cx - S, cy - S + t * S * 2);
        g.lineTo(cx, cy - S * 0.2 + t * S * 0.4);
        g.stroke();
      }
      crack(g, r, cx - S + r() * S * 2, cy - S + r() * S * 2, S * 0.7, r() * 6, 0.8);
      void cap;
    });
  }
  // kanterne (diagonaler) som lyse/mørke grater
  g.lineCap = 'round';
  for (const [p, q, col] of [[A, a, 'rgba(255,240,205,.4)'], [B, b, 'rgba(0,0,0,.25)'], [C, c, 'rgba(0,0,0,.4)'], [D, d, 'rgba(0,0,0,.25)']] as const) {
    g.beginPath();
    g.moveTo(p[0], p[1]);
    g.lineTo(q[0], q[1]);
    g.strokeStyle = col;
    g.lineWidth = 1.4;
    g.stroke();
  }
  // spids
  const tip: [number, number][] = [a, b, c, d];
  if (cap === 'gilded') {
    polyBody(g, tip, [214, 172, 62], { lw: 1.3, ao: 0, rim: 1, light: 50, dark: 40 });
    g.fillStyle = 'rgba(255,248,200,.8)';
    g.beginPath();
    g.arc(cx - T * 0.3, cy - T * 0.3, T * 0.28, 0, 7);
    g.fill();
  } else {
    polyBody(g, tip, shift(base, 36), { lw: 1.2, ao: 0, rim: 0.8, light: 18, dark: 16 });
  }
}

export const desertKinds: ObjectKind[] = [
  kind({
    key: 'cactus_opuntia', family: 'desert', name: 'Fikenkaktus', w: 1.4, h: 1.4, randomRotation: true, sizeJitter: 0.25, shadow: 5, bleed: 0.12,
    params: [{ key: 'fruit', label: 'Frugter', type: 'toggle', default: true }],
    draw: opuntia,
  }),
  kind({
    key: 'palm_date', family: 'desert', name: 'Daddelpalme', w: 3.2, h: 3.2, randomRotation: true, sizeJitter: 0.2, shadow: 9, bleed: 0.12,
    params: [{ key: 'dates', label: 'Dadler', type: 'toggle', default: true }],
    draw: palm,
  }),
  kind({
    key: 'obelisk', family: 'desert', name: 'Obelisk', w: 2.2, h: 2.2, shadow: 12, bleed: 0.08,
    params: [
      { key: 'stone', label: 'Sten', type: 'select', default: 'sandstone', options: [{ value: 'sandstone', label: 'Sandsten' }, { value: 'limestone', label: 'Kalksten' }, { value: 'basalt', label: 'Basalt' }] },
      { key: 'cap', label: 'Spids', type: 'select', default: 'plain', options: [{ value: 'plain', label: 'Sten' }, { value: 'gilded', label: 'Forgyldt' }] },
    ],
    draw: obelisk,
  }),
];

void groundShadow;
void body;
