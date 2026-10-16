import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, vary } from '../pack3/common';
import { bowl, bottle, candle, dome, foldCloth, glow, jar, steam, flame, BRASS, COPPER, WOOD, WOOD_DARK, CLAY } from './props';
import { pick } from './kit';

/** Badehus og alkymilaboratorium: kar, bassiner, damp, destillation, retorter og burbur. */

/** Vand i en sti: dybde-gradient, bølgeringe, spejling og eventuelle bobler/skum. */
function water(g: G, r: Rnd, path: () => void, box: [number, number, number, number], tint: RGB, o: { foam?: number; ripples?: number } = {}): void {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.max(x1 - x0, y1 - y0) / 2;
  g.save();
  path();
  g.clip();
  g.fillStyle = radial(g, cx, cy, R, [[0, rgb(shift(tint, 30))], [0.7, rgb(tint)], [1, rgb(shift(tint, -34))]], x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.3, 1);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = 'rgba(255,255,255,.3)';
  g.lineWidth = 0.9;
  for (let i = 0; i < (o.ripples ?? 4); i++) {
    g.beginPath();
    g.ellipse(cx + (r() - 0.5) * (x1 - x0) * 0.4, cy + (r() - 0.5) * (y1 - y0) * 0.4, R * (0.15 + r() * 0.35), R * (0.1 + r() * 0.25), r() * 3, 0.2, 4);
    g.stroke();
  }
  for (let i = 0; i < (o.foam ?? 0); i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const s = 1.4 + r() * 3.4;
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.fillStyle = 'rgba(252,252,255,.88)';
    g.fill();
    g.beginPath();
    g.arc(x - s * 0.3, y - s * 0.3, s * 0.35, 0, 7);
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.fill();
    g.strokeStyle = 'rgba(120,140,170,.4)';
    g.lineWidth = 0.5;
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.stroke();
  }
  // lys-refleks
  g.fillStyle = radial(g, x0 + (x1 - x0) * 0.28, y0 + (y1 - y0) * 0.25, R * 0.8, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.restore();
}

function bathTub(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const kindSel = param(o, 'style', 'copper');
  const rim: RGB = kindSel === 'copper' ? COPPER : kindSel === 'stone' ? [190, 186, 178] : [132, 94, 60];
  const rad = Math.min(W, H) * 0.5;
  // ydre kant
  const outer = rectPath(g, -W / 2, -H / 2, W, H, rad);
  body(g, outer, rim, [-W / 2, -H / 2, W / 2, H / 2], { lw: 2, ao: 4, rim: 2 });
  clipped(g, outer, () => {
    if (kindSel === 'wood') {
      g.strokeStyle = 'rgba(30,14,4,.35)';
      g.lineWidth = 0.8;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * 6.283;
        g.beginPath();
        g.moveTo(Math.cos(a) * W * 0.4, Math.sin(a) * H * 0.4);
        g.lineTo(Math.cos(a) * W * 0.55, Math.sin(a) * H * 0.55);
        g.stroke();
      }
    } else {
      mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], rim, 24, 3, 22, 0.35);
    }
  });
  const m = Math.min(W, H) * 0.12;
  const inner = rectPath(g, -W / 2 + m, -H / 2 + m, W - m * 2, H - m * 2, rad - m);
  body(g, inner, shift(rim, -50), [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.4, ao: 4, outline: 'rgba(22,12,6,.7)' });
  const m2 = m * 1.6;
  const wp = rectPath(g, -W / 2 + m2, -H / 2 + m2, W - m2 * 2, H - m2 * 2, rad - m2);
  const full = param(o, 'full', true);
  if (full) {
    water(g, r, wp, [-W / 2, -H / 2, W / 2, H / 2], [96, 156, 190], { foam: Math.round(param(o, 'foam', 1) * 14), ripples: 4 });
  }
  if (param(o, 'steam', true) && full) steam(g, r, 0, 0, Math.min(W, H) * 0.7, 6, 0.18);
  // vandhane i hovedenden og børste
  dome(g, 0, -H / 2 + m * 0.5, m * 0.3, m * 0.3, BRASS, 0.8);
  void WOOD;
}

function bathPool(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const round = param(o, 'shape', 'rect') === 'round';
  const tilePath = round ? ellipsePath(g, 0, 0, W / 2, H / 2) : rectPath(g, -W / 2, -H / 2, W, H, 6);
  body(g, tilePath, [200, 196, 186], [-W / 2, -H / 2, W / 2, H / 2], { lw: 2, ao: 5, rim: 3 });
  // fliser langs kanten
  clipped(g, tilePath, () => {
    g.strokeStyle = 'rgba(70,60,50,.4)';
    g.lineWidth = 0.7;
    const t = 12;
    for (let x = -W / 2; x < W / 2; x += t) {
      g.beginPath();
      g.moveTo(x, -H / 2);
      g.lineTo(x, H / 2);
      g.stroke();
    }
    for (let y = -H / 2; y < H / 2; y += t) {
      g.beginPath();
      g.moveTo(-W / 2, y);
      g.lineTo(W / 2, y);
      g.stroke();
    }
    mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], [200, 196, 186], 30, 4, 18, 0.3);
  });
  const m = Math.min(W, H) * 0.1;
  const wp = round ? ellipsePath(g, 0, 0, W / 2 - m, H / 2 - m) : rectPath(g, -W / 2 + m, -H / 2 + m, W - m * 2, H - m * 2, 4);
  // inderkant
  g.save();
  wp();
  g.fillStyle = 'rgba(30,60,80,.9)';
  g.fill();
  g.restore();
  water(g, r, wp, [-W / 2 + m, -H / 2 + m, W / 2 - m, H / 2 - m], param(o, 'tint', 'clear') === 'green' ? [80, 150, 120] : [90, 160, 196], { foam: param(o, 'foam', false) ? 40 : 0, ripples: 7 });
  if (param(o, 'steam', false)) steam(g, r, 0, 0, Math.min(W, H) * 0.8, 9, 0.16);
  // trappe-trin i hjørnet
  if (!round) {
    for (let i = 0; i < 3; i++) {
      g.fillStyle = `rgba(220,216,206,${0.85 - i * 0.18})`;
      g.fillRect(-W / 2 + m + i * 4, -H / 2 + m + i * 4, 28 - i * 8, 8);
    }
  }
}

function hotTub(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  ellBody(g, 0, 0, S * 0.48, S * 0.48, WOOD, { lw: 1.8, ao: 4, rim: 2 });
  clipped(g, ellipsePath(g, 0, 0, S * 0.48, S * 0.48), () => {
    g.strokeStyle = 'rgba(30,14,4,.45)';
    g.lineWidth = 0.9;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.283;
      g.beginPath();
      g.moveTo(Math.cos(a) * S * 0.38, Math.sin(a) * S * 0.38);
      g.lineTo(Math.cos(a) * S * 0.48, Math.sin(a) * S * 0.48);
      g.stroke();
    }
  });
  for (const rr of [0.465, 0.42]) {
    g.beginPath();
    g.arc(0, 0, S * rr, 0, 7);
    g.strokeStyle = 'rgba(60,60,66,.8)';
    g.lineWidth = 1.5;
    g.stroke();
  }
  water(g, r, ellipsePath(g, 0, 0, S * 0.38, S * 0.38), [-S * 0.38, -S * 0.38, S * 0.38, S * 0.38], [104, 158, 184], { foam: 8, ripples: 4 });
  steam(g, r, 0, 0, S * 0.5, 8, 0.2);
  // bænk i kanten med håndklæde
  if (param(o, 'towel', true)) foldCloth(g, r, S * 0.2, S * 0.38, S * 0.26, S * 0.1, [236, 232, 220], 2);
}

function sauna(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // stenovn med glødende sten
  const p = rectPath(g, -S * 0.42, -S * 0.42, S * 0.84, S * 0.84, 5);
  body(g, p, [64, 62, 66], [-S / 2, -S / 2, S / 2, S / 2], { lw: 2, ao: 5, rim: 2 });
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * S * 0.3;
    const rad = S * (0.05 + r() * 0.04);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    ellBody(g, x, y, rad, rad * 0.85, vary(r, [96, 90, 86], 36), { lw: 0.9, ao: 1.4, rim: 0.7 });
    glow(g, x, y, rad * 1.8, [255, 110, 30], 0.18);
  }
  steam(g, r, 0, 0, S * 0.7, 6, 0.2);
  // spand og øse
  ellBody(g, S * 0.62, 0, S * 0.12, S * 0.12, [132, 94, 60], { lw: 1.2, ao: 1, rim: 0.5 });
  void polyBody;
  void rectBody;
}

function towels(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // bænk med håndklæder, sæbe og børste
  woodRect(g, r, -W / 2, -H / 2, W, H, [150, 108, 66], { vertical: false, count: 3, rad: 2 });
  const n = 3;
  for (let i = 0; i < n; i++) foldCloth(g, r, -W * 0.46 + (i * W * 0.3), -H * 0.3, W * 0.26, H * 0.55, vary(r, pick(r, [[236, 232, 220], [196, 150, 150], [150, 176, 200]] as RGB[]), 8), 2, true);
  ellBody(g, W * 0.42, -H * 0.1, 4, 3, [236, 210, 150], { lw: 0.8, ao: 0.4 });
  ellBody(g, W * 0.42, H * 0.14, 5, 3, [190, 160, 120], { lw: 0.8, ao: 0.4 });
  void bowl;
}

function bucket(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  ellBody(g, 0, 0, S * 0.46, S * 0.46, WOOD_DARK, { lw: 1.6, ao: 3 });
  for (const rr of [0.44, 0.34]) {
    g.beginPath();
    g.arc(0, 0, S * rr, 0, 7);
    g.strokeStyle = 'rgba(70,70,76,.8)';
    g.lineWidth = 1.2;
    g.stroke();
  }
  water(g, r, ellipsePath(g, 0, 0, S * 0.36, S * 0.36), [-S * 0.36, -S * 0.36, S * 0.36, S * 0.36], [100, 160, 190], { foam: 2, ripples: 2 });
  tube(g, () => {
    g.beginPath();
    g.arc(0, 0, S * 0.46, Math.PI * 1.1, Math.PI * 1.9);
  }, 1.8, [110, 110, 116], { outline: 1 });
}

// ---------------------------------------------------------------- alkymi

function still(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // ildsted under kobberkedlen
  const bp = rectPath(g, -W * 0.46, -H * 0.38, W * 0.54, H * 0.76, 5);
  body(g, bp, [96, 92, 90], [-W * 0.46, -H * 0.4, W * 0.1, H * 0.4], { lw: 1.7, ao: 4 });
  // kedel (kobber) og hat (alembik)
  dome(g, -W * 0.19, 0, H * 0.34, H * 0.34, COPPER, 1.6);
  g.beginPath();
  g.arc(-W * 0.19, 0, H * 0.27, 0, 7);
  g.strokeStyle = 'rgba(255,230,180,.45)';
  g.lineWidth = 1;
  g.stroke();
  for (let i = 0; i < 3; i++) g.fillRect(-W * 0.19 + (i - 1) * H * 0.18, -H * 0.02, 1.5, 1.5);
  dome(g, -W * 0.19, 0, H * 0.18, H * 0.18, shift(COPPER, 14), 1.3);
  rectBody(g, -W * 0.19 - 3, -H * 0.19, 6, 8, 2, shift(COPPER, -10), { lw: 1, ao: 0.4 });
  // rør til kondensator
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.19, -H * 0.2);
    g.quadraticCurveTo(-W * 0.04, -H * 0.4, W * 0.1, -H * 0.2);
  }, 4, shift(COPPER, 8), { outline: 1.4 });
  // kølespiral i tønde
  ellBody(g, W * 0.22, -H * 0.04, H * 0.26, H * 0.26, [112, 84, 52], { lw: 1.5, ao: 3 });
  g.beginPath();
  g.arc(W * 0.22, -H * 0.04, H * 0.2, 0, 7);
  g.fillStyle = 'rgba(120,170,196,.9)';
  g.fill();
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(W * 0.22, -H * 0.04, H * (0.05 + i * 0.035), 0.4 * i, 5.8 + 0.4 * i);
    g.strokeStyle = rgb(shift(COPPER, 10));
    g.lineWidth = 2.4;
    g.stroke();
  }
  // opsamlings-flaske
  bottle(g, W * 0.4, H * 0.3, H * 0.4, 0.4, [120, 200, 150], false);
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.22 + H * 0.14, H * 0.1);
    g.lineTo(W * 0.4, H * 0.2);
  }, 2.4, shift(COPPER, 8), { outline: 1 });
  // ild
  flame(g, -W * 0.38, H * 0.36, 4);
  flame(g, -W * 0.32, H * 0.38, 3);
  steam(g, r, -W * 0.19, -H * 0.1, H * 0.3, 4, 0.14);
}

function retorts(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [100, 68, 42], { vertical: false, count: 3, rad: 2 });
  const n = Math.max(3, Math.round(W / 34));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    const col: RGB = pick(r, [[200, 60, 70], [70, 170, 210], [120, 210, 90], [220, 190, 60], [170, 90, 200], [230, 230, 240]] as RGB[]);
    const rad = Math.min(W / n * 0.38, H * 0.3);
    // kolbens kugle, hals mod toppen
    tube(g, () => {
      g.beginPath();
      g.moveTo(x, -rad * 0.4);
      g.quadraticCurveTo(x + (r() - 0.5) * 8, -H * 0.36, x + 5, -H * 0.44);
    }, rad * 0.34, [186, 210, 220], { outline: 1 });
    g.beginPath();
    g.arc(x, 0, rad, 0, 7);
    g.fillStyle = radial(g, x, 0, rad, [[0, rgb(shift(col, 50))], [0.7, rgb(col)], [1, rgb(shift(col, -60))]], x - rad * 0.3, -rad * 0.3, 1);
    g.fill();
    g.strokeStyle = 'rgba(210,230,240,.8)';
    g.lineWidth = 1.6;
    g.stroke();
    g.strokeStyle = 'rgba(20,10,5,.6)';
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(x, 0, rad + 0.8, 0, 7);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.65)';
    g.beginPath();
    g.ellipse(x - rad * 0.38, -rad * 0.4, rad * 0.22, rad * 0.12, -0.7, 0, 7);
    g.fill();
    glow(g, x, 0, rad * 1.6, col, 0.14);
  }
}

function labBench(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [88, 62, 42], { vertical: false, count: Math.max(3, Math.round(H / 12)), rad: 3 });
  // syrepletter (mørke)
  g.fillStyle = 'rgba(20,40,20,.25)';
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse((r() - 0.5) * W * 0.8, (r() - 0.5) * H * 0.6, 4 + r() * 8, 3 + r() * 5, r() * 3, 0, 7);
    g.fill();
  }
  const n = Math.round(param(o, 'items', 7));
  for (let i = 0; i < n; i++) {
    const x = -W * 0.43 + (W * 0.86 * (i + 0.5)) / n;
    const y = (r() - 0.5) * H * 0.36;
    const s = Math.min(W / n * 0.46, H * 0.32);
    const t = Math.floor(r() * 6);
    const col: RGB = pick(r, [[200, 60, 70], [70, 170, 210], [120, 210, 90], [220, 190, 60], [170, 90, 200]] as RGB[]);
    if (t === 0) {
      // rundkolbe
      g.beginPath();
      g.arc(x, y, s, 0, 7);
      g.fillStyle = radial(g, x, y, s, [[0, rgb(shift(col, 50))], [0.7, rgb(col)], [1, rgb(shift(col, -60))]], x - s * 0.3, y - s * 0.3, 1);
      g.fill();
      g.strokeStyle = 'rgba(210,230,240,.8)';
      g.lineWidth = 1.4;
      g.stroke();
      ellBody(g, x, y, s * 0.28, s * 0.28, [220, 232, 240], { lw: 0.8, ao: 0.3 });
    } else if (t === 1) {
      bottle(g, x, y, s * 2.3, r() * 2, shift(col, -30));
    } else if (t === 2) {
      // morter
      ellBody(g, x, y, s * 0.9, s * 0.9, [176, 170, 160], { lw: 1.2, ao: s * 0.1, rim: 0.8 });
      ellBody(g, x, y, s * 0.62, s * 0.62, [60, 54, 48], { lw: 0.8, ao: 1 });
      mottle(g, r, [x - s * 0.4, y - s * 0.4, x + s * 0.4, y + s * 0.4], [120, 160, 70], 8, 1.4, 20, 0.9);
      tube(g, () => {
        g.beginPath();
        g.moveTo(x + s * 0.2, y);
        g.lineTo(x + s * 1.1, y - s * 0.6);
      }, s * 0.3, [200, 194, 184], { outline: 1 });
    } else if (t === 3) {
      // brænder med flamme
      ellBody(g, x, y, s * 0.6, s * 0.6, [80, 76, 80], { lw: 1.1, ao: 1 });
      flame(g, x, y, s * 0.5);
    } else if (t === 4) {
      // vægt
      tube(g, () => {
        g.beginPath();
        g.moveTo(x - s * 1.1, y);
        g.lineTo(x + s * 1.1, y);
      }, 1.6, BRASS, { outline: 0.8 });
      for (const q of [-1, 1]) ellBody(g, x + q * s * 1.1, y, s * 0.5, s * 0.5, shift(BRASS, 6), { lw: 0.9, ao: 0.4, rim: 0.5 });
      ellBody(g, x, y, 2.2, 2.2, BRASS, { lw: 0.7, ao: 0 });
    } else {
      jar(g, x, y, s * 0.85, [190, 210, 200], [110, 80, 52], shift(col, -20));
    }
  }
}

function furnace(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const p = ellipsePath(g, 0, 0, S * 0.46, S * 0.46);
  body(g, p, [100, 76, 62], [-S / 2, -S / 2, S / 2, S / 2], { lw: 2, ao: 6, rim: 3 });
  clipped(g, p, () => {
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 6.283;
      g.strokeStyle = 'rgba(30,14,6,.4)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(Math.cos(a) * S * 0.18, Math.sin(a) * S * 0.18);
      g.lineTo(Math.cos(a) * S * 0.5, Math.sin(a) * S * 0.5);
      g.stroke();
    }
    for (const rr of [0.26, 0.34, 0.42]) {
      g.beginPath();
      g.arc(0, 0, S * rr, 0, 7);
      g.stroke();
    }
  });
  ellBody(g, 0, 0, S * 0.18, S * 0.18, [20, 12, 10], { lw: 1.4, ao: 2 });
  ellBody(g, 0, 0, S * 0.13, S * 0.13, [200, 90, 30], { lw: 0.6, ao: 0 });
  glow(g, 0, 0, S * 0.5, [255, 120, 30], 0.35);
  // digel
  dome(g, 0, 0, S * 0.1, S * 0.1, [90, 86, 90], 1.2);
  g.beginPath();
  g.arc(0, 0, S * 0.065, 0, 7);
  g.fillStyle = radial(g, 0, 0, S * 0.065, [[0, 'rgb(255,230,140)'], [1, 'rgb(240,120,30)']]);
  g.fill();
  // blæsebælg
  polyBody(g, [[S * 0.4, -S * 0.1], [S * 0.62, -S * 0.2], [S * 0.62, S * 0.2], [S * 0.4, S * 0.1]], [120, 84, 52], { lw: 1.3, ao: 1.2, rim: 0.6 });
  void r;
}

function jarShelf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [90, 62, 38], { vertical: false, count: 3, rad: 2 });
  const n = Math.max(4, Math.round(W / 22));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    const rad = Math.min(W / n * 0.42, H * 0.34);
    const col: RGB = pick(r, [[150, 200, 170], [196, 190, 150], [170, 150, 200], [200, 150, 130]] as RGB[]);
    jar(g, x, (r() - 0.5) * H * 0.2, rad, col, [100, 70, 44], pick(r, [[90, 60, 40], [130, 150, 80], [180, 80, 90], [60, 70, 100]] as RGB[]));
  }
  void CLAY;
  void candle;
}

const T = { family: 'bath', shadow: 6 } as const;
const A = { family: 'alchemy', shadow: 6 } as const;
const batht = ['indoor', 'house', 'rich', 'city'];
const alct = ['magic', 'indoor', 'house', 'dungeon'];

export const bathKinds: ObjectKind[] = [
  kind({ ...T, key: 'bath_tub_oval', name: 'Badekar', w: 1.2, h: 2.2, params: [{ key: 'style', label: 'Materiale', type: 'select', default: 'copper', options: [{ value: 'copper', label: 'Kobber' }, { value: 'stone', label: 'Sten' }, { value: 'wood', label: 'Træ' }] }, { key: 'full', label: 'Fyldt', type: 'toggle', default: true }, { key: 'steam', label: 'Damp', type: 'toggle', default: true }, { key: 'foam', label: 'Skum', type: 'range', min: 0, max: 2, step: 0.5, default: 1 }], tags: batht, draw: bathTub }),
  kind({ ...T, key: 'bath_tub_small', name: 'Badekar, lille', w: 1, h: 1.8, params: [{ key: 'style', label: 'Materiale', type: 'select', default: 'wood', options: [{ value: 'wood', label: 'Træ' }, { value: 'copper', label: 'Kobber' }, { value: 'stone', label: 'Sten' }] }, { key: 'full', label: 'Fyldt', type: 'toggle', default: true }, { key: 'steam', label: 'Damp', type: 'toggle', default: true }, { key: 'foam', label: 'Skum', type: 'range', min: 0, max: 2, step: 0.5, default: 1 }], tags: [...batht, 'village', 'tavern', 'poor'], draw: bathTub }),
  kind({ ...T, key: 'bath_pool', name: 'Badebassin', w: 4, h: 3, shadow: 0, params: [{ key: 'shape', label: 'Form', type: 'select', default: 'rect', options: [{ value: 'rect', label: 'Rektangulær' }, { value: 'round', label: 'Rund' }] }, { key: 'tint', label: 'Vand', type: 'select', default: 'clear', options: [{ value: 'clear', label: 'Klart' }, { value: 'green', label: 'Grønligt' }] }, { key: 'steam', label: 'Damp', type: 'toggle', default: false }, { key: 'foam', label: 'Skum', type: 'toggle', default: false }], tags: [...batht, 'temple'], draw: bathPool }),
  kind({ ...T, key: 'bath_pool_round', name: 'Badebassin, rundt', w: 3, h: 3, shadow: 0, params: [{ key: 'shape', label: 'Form', type: 'select', default: 'round', options: [{ value: 'round', label: 'Rund' }, { value: 'rect', label: 'Rektangulær' }] }, { key: 'tint', label: 'Vand', type: 'select', default: 'clear', options: [{ value: 'clear', label: 'Klart' }, { value: 'green', label: 'Grønligt' }] }, { key: 'steam', label: 'Damp', type: 'toggle', default: true }, { key: 'foam', label: 'Skum', type: 'toggle', default: false }], tags: [...batht, 'temple'], draw: bathPool }),
  kind({ ...T, key: 'bath_hot_tub', name: 'Tøndebad', w: 1.6, h: 1.6, randomRotation: true, params: [{ key: 'towel', label: 'Håndklæde', type: 'toggle', default: true }], tags: [...batht, 'village', 'tavern', 'outdoor'], draw: hotTub }),
  kind({ ...T, key: 'bath_sauna_stove', name: 'Saunaovn', w: 1.4, h: 1.4, params: [], tags: [...batht, 'arctic', 'village'], draw: sauna }),
  kind({ ...T, key: 'bath_towel_bench', name: 'Bænk med håndklæder', w: 1.8, h: 0.7, params: [], tags: batht, draw: towels }),
  kind({ ...T, key: 'bath_bucket', name: 'Vandspand', w: 0.6, h: 0.6, shadow: 3, randomRotation: true, params: [], tags: [...batht, 'village', 'farm', 'poor', 'tavern'], draw: bucket }),
];

export const alchemyKinds: ObjectKind[] = [
  kind({ ...A, key: 'alchemy_still', name: 'Destillationsapparat', w: 2.4, h: 1.4, params: [], tags: alct, draw: still }),
  kind({ ...A, key: 'alchemy_retorts', name: 'Retorter', w: 1.6, h: 0.7, params: [], tags: alct, draw: retorts }),
  kind({ ...A, key: 'alchemy_retorts_long', name: 'Retorter, lang række', w: 2.6, h: 0.7, params: [], tags: alct, draw: retorts }),
  kind({ ...A, key: 'alchemy_bench', name: 'Laboratoriebord', w: 2.4, h: 1, params: [{ key: 'items', label: 'Ting', type: 'range', min: 3, max: 10, step: 1, default: 7 }], tags: alct, draw: labBench }),
  kind({ ...A, key: 'alchemy_bench_long', name: 'Laboratoriebord, langt', w: 3.6, h: 1, params: [{ key: 'items', label: 'Ting', type: 'range', min: 4, max: 14, step: 1, default: 10 }], tags: alct, draw: labBench }),
  kind({ ...A, key: 'alchemy_furnace', name: 'Smelteovn med digel', w: 1.4, h: 1.4, randomRotation: true, params: [], tags: alct, draw: furnace }),
  kind({ ...A, key: 'alchemy_jar_shelf', name: 'Hylde med krukker', w: 2.2, h: 0.6, params: [], tags: alct, draw: jarShelf }),
];
