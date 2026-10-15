import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blade, blobBody, blobPath, body, castShadow, clipped, crack, ellBody, ellipsePath, groundShadow, lin, mix, mossPatch, mottle,
  OUT, orb, plankBoard, polyPath, radial, rectBody, rectPath, rgb, rivet, shift, wobble, type G, type RGB, type Rnd,
} from './helpers';

const STONES: Record<string, RGB> = { granite: [128, 128, 126], marble: [206, 204, 196], slate: [84, 90, 96], sandstone: [178, 150, 106] };

/** Gravsten set lidt skråt: topflade, forside med buet top, indgravering, lav og revner. */
function headstone(g: G, r: Rnd, cx: number, cy: number, w: number, h: number, depth: number, col: RGB, shape: number, mossy: boolean): void {
  const round = shape === 0;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const arch = round ? w * 0.5 : shape === 2 ? w * 0.42 : w * 0.12;
  const front = (dy: number) => () => {
    g.beginPath();
    g.moveTo(x0, cy + h + dy);
    g.lineTo(x0, cy + arch + dy);
    if (round) g.arc(cx, cy + arch + dy, w / 2, Math.PI, 0);
    else if (shape === 2) {
      g.quadraticCurveTo(x0 + w * 0.05, cy + arch * 0.35 + dy, cx, cy + dy);
      g.quadraticCurveTo(x1 - w * 0.05, cy + arch * 0.35 + dy, x1, cy + arch + dy);
    } else {
      g.lineTo(x0 + w * 0.12, cy + dy);
      g.lineTo(x1 - w * 0.12, cy + dy);
      g.lineTo(x1, cy + arch + dy);
    }
    g.lineTo(x1, cy + h + dy);
    g.closePath();
  };
  castShadow(g, front(0), depth * 1.8, depth * 1.8, depth * 2, 0.45);
  // topflade (tykkelsen) og forside
  body(g, front(-depth), shift(col, 34), [x0, cy - depth, x1, cy + h], { lw: 1.2, ao: 0, rim: 0, light: 8, dark: 4 });
  const fp = front(0);
  body(g, fp, col, [x0, cy, x1, cy + h], { lw: 1.7, ao: w * 0.07, rim: 1.2, light: 18, dark: 30 });
  clipped(g, fp, () => {
    mottle(g, r, [x0, cy, x1, cy + h], col, 30, w * 0.05, 18, 0.35);
    if (mossy) {
      mossPatch(g, r, x0 + w * 0.12, cy + h * 0.98, w * 0.35, 26);
      mossPatch(g, r, x1 - w * 0.05, cy + h * 0.9, w * 0.2, 12, [110, 136, 60]);
    }
    // indgravering: kors eller bue + tekstlinjer
    const ex = cx;
    const ey = cy + arch * 0.9 + h * 0.12;
    const s = w * 0.15;
    for (const [off, c] of [[0.8, 'rgba(255,248,230,.28)'], [0, 'rgba(14,8,4,.62)']] as const) {
      g.strokeStyle = c;
      g.lineWidth = Math.max(0.9, w * 0.035);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(ex + off, ey - s + off);
      g.lineTo(ex + off, ey + s * 1.5 + off);
      g.moveTo(ex - s + off, ey + off);
      g.lineTo(ex + s + off, ey + off);
      g.stroke();
      g.lineWidth = Math.max(0.6, w * 0.02);
      for (let i = 0; i < 3; i++) {
        const ly = ey + s * 2.3 + i * h * 0.1 + off;
        const lw = w * (0.46 - i * 0.1) * 0.5;
        g.beginPath();
        g.moveTo(ex - lw + off, ly);
        g.lineTo(ex + lw + off, ly);
        g.stroke();
      }
    }
    if (r() < 0.7) crack(g, r, x0 + w * (0.2 + r() * 0.6), cy + h * (0.3 + r() * 0.3), h * 0.35, 1.2 + r(), 0.9);
    // sod fra jorden nederst
    g.fillStyle = lin(g, 0, cy + h * 0.7, 0, cy + h, [[0, 'rgba(40,24,10,0)'], [1, 'rgba(40,24,10,.5)']]);
    g.fillRect(x0, cy + h * 0.7, w, h * 0.3);
  });
}

function flowers(g: G, r: Rnd, cx: number, cy: number, rad: number, n: number): void {
  const cols: RGB[] = [[226, 70, 70], [240, 220, 100], [240, 240, 235], [170, 100, 210], [236, 140, 170]];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * rad;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.7;
    for (let k = 0; k < 2; k++) blade(g, x, y, a + k * 2.2, rad * 0.35, rad * 0.07, [60, 110, 40]);
    const c = cols[Math.floor(r() * cols.length)]!;
    const pr = rad * (0.09 + r() * 0.05);
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * 6.28 + r();
      g.fillStyle = rgb(shift(c, (r() - 0.5) * 30));
      g.beginPath();
      g.arc(x + Math.cos(pa) * pr * 0.9, y + Math.sin(pa) * pr * 0.9, pr * 0.7, 0, 7);
      g.fill();
    }
    g.fillStyle = 'rgba(250,210,70,.95)';
    g.beginPath();
    g.arc(x, y, pr * 0.45, 0, 7);
    g.fill();
  }
}

function graveMound(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const age = param(o, 'age', 'old');
  const col = STONES[param(o, 'stone', 'granite')] ?? STONES.granite!;
  const kerb = param(o, 'kerb', true);
  const fx = -w * 0.34;
  const fw = w * 0.68;
  const fy = -h * 0.12;
  const fh = h * 0.6;
  groundShadow(g, 3, fy + fh / 2 + 3, fw * 0.75, fh * 0.62, 0.5);
  const soil: RGB = age === 'fresh' ? [98, 66, 40] : [84, 62, 38];
  const kw = kerb ? w * 0.075 : 0;
  if (kerb) {
    const fp = rectPath(g, fx, fy, fw, fh, 3);
    body(g, fp, col, [fx, fy, fx + fw, fy + fh], { lw: 1.8, ao: 2, rim: 1.2, light: 20, dark: 30 });
    clipped(g, fp, () => {
      mottle(g, r, [fx, fy, fx + fw, fy + fh], col, 40, w * 0.03, 20, 0.35);
      // fuger mellem randstenene
      g.strokeStyle = 'rgba(10,5,2,.6)';
      g.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const t = i / 6 + (r() - 0.5) * 0.05;
        for (const [x, y, hz] of [[fx + fw * t, fy, 1], [fx + fw * (1 - t), fy + fh - kw, 1], [fx, fy + fh * t, 0], [fx + fw - kw, fy + fh * (1 - t), 0]] as const) {
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(hz ? x : x + kw, hz ? y + kw : y);
          g.stroke();
        }
      }
      mossPatch(g, r, fx + fw * 0.9, fy + fh * 0.95, w * 0.18, 18);
      mossPatch(g, r, fx + fw * 0.1, fy + fh * 0.05, w * 0.1, 8);
    });
  }
  const sx = fx + kw;
  const sy = fy + kw;
  const sw = fw - kw * 2;
  const sh = fh - kw * 2;
  const mound = rectPath(g, sx, sy, sw, sh, w * 0.1);
  mound();
  g.fillStyle = radial(g, 0, sy + sh / 2, sw * 0.85, [[0, rgb(shift(soil, 28))], [0.7, rgb(soil)], [1, rgb(shift(soil, -34))]], -sw * 0.15, sy + sh * 0.3, 2);
  g.fill();
  clipped(g, mound, () => {
    const n = age === 'fresh' ? 130 : 55;
    for (let i = 0; i < n; i++) {
      const x = sx + r() * sw;
      const y = sy + r() * sh;
      const s = w * (0.012 + r() * 0.03);
      g.fillStyle = 'rgba(14,8,2,.38)';
      g.beginPath();
      g.ellipse(x + s * 0.4, y + s * 0.5, s, s * 0.8, r() * 3, 0, 7);
      g.fill();
      g.fillStyle = rgb(shift(soil, 10 + r() * 36));
      g.beginPath();
      g.ellipse(x, y, s, s * 0.8, r() * 3, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(255,230,190,.2)';
      g.beginPath();
      g.ellipse(x - s * 0.3, y - s * 0.3, s * 0.45, s * 0.3, 0, 0, 7);
      g.fill();
    }
    if (age !== 'fresh') {
      const gn = age === 'overgrown' ? 260 : 90;
      for (let i = 0; i < gn; i++) {
        blade(g, sx + r() * sw, sy + r() * sh, -1.57 + (r() - 0.5) * 2.6, w * (0.05 + r() * 0.09), w * 0.012, [58 + r() * 40, 110 + r() * 50, 36 + r() * 24]);
      }
    }
    g.fillStyle = lin(g, sx, sy, sx + sw, sy + sh, [[0, 'rgba(255,240,200,.22)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.4)']]);
    g.fillRect(sx, sy, sw, sh);
    // gravhøjens bløde kamlinje
    g.fillStyle = radial(g, 0, sy + sh * 0.45, sw * 0.6, [[0, 'rgba(255,230,180,.16)'], [1, 'rgba(255,230,180,0)']]);
    g.fillRect(sx, sy, sw, sh);
  });
  mound();
  g.strokeStyle = 'rgba(30,16,6,.6)';
  g.lineWidth = 1.2;
  g.stroke();
  if (param(o, 'flowers', true)) flowers(g, r, 0, sy + sh * 0.2, w * 0.2, 9);
  headstone(g, r, 0, -h * 0.46, w * 0.62, h * 0.31, h * 0.03, col, Math.floor(r() * 3), age !== 'fresh' && r() < 0.8);
  // sokkel
  rectBody(g, -w * 0.36, -h * 0.17, w * 0.72, h * 0.06, 2, shift(col, -8), { lw: 1.4, ao: 1.5, rim: 1 });
  if (param(o, 'flowers', true)) flowers(g, r, w * 0.22, -h * 0.08, w * 0.09, 3);
}

const crossPath = (g: G, w: number, h: number, thick: number, celtic: boolean) => (): void => {
  const t = thick / 2;
  const vx = [-t, t];
  const armY = -h * 0.18;
  const armT = t * 0.9;
  g.beginPath();
  g.moveTo(vx[0]!, h * 0.5);
  g.lineTo(vx[0]!, armY + armT);
  g.lineTo(-w / 2, armY + armT);
  g.lineTo(-w / 2, armY - armT);
  g.lineTo(vx[0]!, armY - armT);
  g.lineTo(vx[0]!, -h * 0.5);
  g.lineTo(vx[1]!, -h * 0.5);
  g.lineTo(vx[1]!, armY - armT);
  g.lineTo(w / 2, armY - armT);
  g.lineTo(w / 2, armY + armT);
  g.lineTo(vx[1]!, armY + armT);
  g.lineTo(vx[1]!, h * 0.5);
  g.closePath();
  if (celtic) {
    g.moveTo(Math.hypot(w * 0.3, 0) + 0, armY);
    g.arc(0, armY, w * 0.31, 0, Math.PI * 2);
  }
};

function graveCross(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const style = param(o, 'style', 'stone');
  const col = style === 'wood' ? ([118, 84, 50] as RGB) : (STONES[param(o, 'stone', 'granite')] ?? STONES.granite!);
  // sokkel i to trin nederst, korset rejser sig over den
  groundShadow(g, w * 0.04, h * 0.2, w * 0.55, h * 0.36, 0.5);
  const steps: [number, number, number, number][] = [[0.86, 0.28, 0.2, 0], [0.62, 0.2, 0.14, 1]];
  steps.forEach(([sw, sh, yb], i) => {
    const x = -w * sw / 2;
    const y = h * yb;
    rectBody(g, x, y, w * sw, h * sh, 3, shift(col, -8 + i * 10), { lw: 1.5, ao: w * 0.03, rim: 1 });
    if (style !== 'wood') clipped(g, rectPath(g, x, y, w * sw, h * sh, 3), () => mottle(g, r, [x, y, x + w * sw, y + h * sh], col, 14, w * 0.03, 18, 0.3));
    if (style === 'wood' && i === 0) clipped(g, rectPath(g, x, y, w * sw, h * sh, 3), () => mossPatch(g, r, -w * 0.2, y + 6, w * 0.2, 20, [72, 110, 40]));
  });
  const cw = w * (style === 'celtic' ? 0.86 : 0.78);
  const ch = h * 0.8;
  g.save();
  g.translate(0, -h * 0.1);
  const cp = crossPath(g, cw, ch, w * 0.15, style === 'celtic');
  const sh = () => {
    g.save();
    g.translate(w * 0.07, h * 0.07);
    cp();
    g.restore();
  };
  void sh;
  castShadow(g, cp, w * 0.1, h * 0.1, w * 0.05, 0.55);
  g.save();
  body(g, cp, shift(col, 6), [-cw / 2, -ch / 2, cw / 2, ch / 2], { lw: 1.7, ao: w * 0.028, rim: 1.4, light: 30, dark: 40 });
  clipped(g, cp, () => {
    if (style === 'wood') {
      // trækorn og søm
      for (let i = 0; i < 12; i++) {
        g.strokeStyle = r() < 0.5 ? 'rgba(30,14,4,.3)' : 'rgba(255,226,170,.16)';
        g.lineWidth = 0.7;
        const x = -w * 0.06 + r() * w * 0.12;
        g.beginPath();
        g.moveTo(x, -ch / 2);
        g.lineTo(x + (r() - 0.5) * 3, ch / 2);
        g.stroke();
      }
      rivet(g, 0, -h * 0.18, 1.8, [70, 60, 55]);
    } else {
      mottle(g, r, [-cw / 2, -ch / 2, cw / 2, ch / 2], col, 40, w * 0.025, 20, 0.35);
      if (style === 'celtic') {
        for (let i = 0; i < 3; i++) {
          g.strokeStyle = 'rgba(15,8,4,.35)';
          g.lineWidth = 1;
          g.beginPath();
          g.arc(0, -h * 0.18, w * 0.2 - i * 3.2, 0, 7);
          g.stroke();
        }
      }
      crack(g, r, -w * 0.02, -h * 0.05, h * 0.3, 1.5, 0.9);
      mossPatch(g, r, 0, ch * 0.42, w * 0.12, 18);
    }
  });
  g.restore();
  g.restore();
}

function cryptHatch(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const open = param(o, 'open', false);
  const col = STONES[param(o, 'stone', 'granite')] ?? STONES.granite!;
  const x0 = -w * 0.46;
  const y0 = -h * 0.46;
  const W = w * 0.92;
  const H = h * 0.92;
  groundShadow(g, 0, 0, w * 0.55, h * 0.52, 0.5);
  // stenramme af store blokke
  const frame = rectPath(g, x0, y0, W, H, 4);
  body(g, frame, col, [x0, y0, x0 + W, y0 + H], { lw: 2, ao: w * 0.03, rim: 1.4 });
  clipped(g, frame, () => {
    const bs = w * 0.17;
    for (let ring = 0; ring < 2; ring++) {
      const n = Math.round((W - ring * bs * 2) / bs);
      for (let i = 0; i < n; i++) {
        const bw = (W - ring * bs * 2) / n;
        for (const yy of [y0 + ring * bs, y0 + H - bs - ring * bs]) {
          const bx = x0 + ring * bs + i * bw;
          const bc = shift(col, (r() - 0.5) * 30);
          rectBody(g, bx, yy, bw, bs, 1.5, bc, { lw: 1, ao: 1.2, rim: 0.8 });
        }
      }
      const m = Math.round((H - ring * bs * 2) / bs);
      for (let i = 1; i < m - 1; i++) {
        const bh = (H - ring * bs * 2) / m;
        for (const xx of [x0 + ring * bs, x0 + W - bs - ring * bs]) {
          rectBody(g, xx, y0 + ring * bs + i * bh, bs, bh, 1.5, shift(col, (r() - 0.5) * 30), { lw: 1, ao: 1.2, rim: 0.8 });
        }
      }
    }
    mottle(g, r, [x0, y0, x0 + W, y0 + H], col, 80, w * 0.02, 18, 0.25);
    mossPatch(g, r, x0 + W * 0.9, y0 + H * 0.1, w * 0.2, 36);
    mossPatch(g, r, x0 + W * 0.05, y0 + H * 0.95, w * 0.15, 20);
    for (let i = 0; i < 3; i++) crack(g, r, x0 + r() * W, y0 + r() * H, w * 0.2, r() * 6, 1);
  });
  // indre åbning
  const ix = x0 + w * 0.34 * 0.5;
  const iy = y0 + w * 0.17 * 2 * 0.95;
  const iw = W - w * 0.17 * 2 * 0.97;
  const ih = H - w * 0.17 * 2 * 0.97;
  const ip = rectPath(g, ix + w * 0.1, iy - w * 0.02, iw - w * 0.0, ih, 2);
  void ix;
  const bx = -w * 0.28;
  const by = -h * 0.27;
  const bw = w * 0.56;
  const bh = h * 0.54;
  const hole = rectPath(g, bx, by, bw, bh, 2);
  void ip;
  g.fillStyle = '#07050a';
  hole();
  g.fill();
  if (open) {
    // trappetrin, der forsvinder i mørket
    clipped(g, hole, () => {
      const steps = 7;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const yy = by + bh * 0.02 + t * bh * 0.98;
        const a = 0.9 - t * 0.9;
        g.fillStyle = `rgba(${150 - i * 14},${140 - i * 14},${128 - i * 12},${a})`;
        g.fillRect(bx, yy, bw, bh / steps - 1.3);
        g.fillStyle = `rgba(255,250,230,${0.28 * a})`;
        g.fillRect(bx, yy, bw, 1.1);
        g.fillStyle = `rgba(0,0,0,${0.45 * a})`;
        g.fillRect(bx, yy + bh / steps - 2, bw, 1);
      }
      g.fillStyle = lin(g, 0, by, 0, by + bh, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(4,2,8,.92)']]);
      g.fillRect(bx, by, bw, bh);
      g.fillStyle = lin(g, bx, 0, bx + bw * 0.25, 0, [[0, 'rgba(0,0,0,.6)'], [1, 'rgba(0,0,0,0)']]);
      g.fillRect(bx, by, bw * 0.25, bh);
    });
    // dørfløje slået op
    for (const side of [-1, 1]) {
      const px = side * bw / 2;
      const dw = bw * 0.46;
      g.save();
      g.translate(px + side * 0.01, 0);
      const dx = side < 0 ? -dw - 2 : 2;
      const dp = rectPath(g, dx, by, dw, bh, 1.5);
      body(g, dp, [88, 62, 38], [dx, by, dx + dw, by + bh], { lw: 1.6, ao: 1.8, rim: 1 });
      clipped(g, dp, () => {
        plankBoard(g, r, dx, by, dw, bh, [96, 68, 42], 3, { vertical: true, wear: 0.5 });
      });
      for (const yy of [by + bh * 0.16, by + bh * 0.8]) {
        rectBody(g, dx, yy, dw, bh * 0.08, 1, [64, 62, 64], { lw: 1, ao: 0.8, rim: 0.7 });
        for (let k = 0; k < 4; k++) rivet(g, dx + dw * (0.12 + k * 0.25), yy + bh * 0.04, 1.2);
      }
      ellBody(g, dx + (side < 0 ? dw * 0.14 : dw * 0.86), by + bh * 0.5, 3, 3, [150, 130, 70], { lw: 1 });
      g.restore();
    }
  } else {
    const dw = bw / 2;
    for (const side of [0, 1]) {
      const dx = bx + side * dw;
      const dp = rectPath(g, dx, by, dw, bh, 1.5);
      body(g, dp, [92, 66, 40], [dx, by, dx + dw, by + bh], { lw: 1.8, ao: 2, rim: 1.2 });
      clipped(g, dp, () => {
        plankBoard(g, r, dx, by, dw, bh, [100, 72, 44], 4, { vertical: false, wear: 0.8 });
      });
      for (const yy of [by + bh * 0.14, by + bh * 0.46, by + bh * 0.78]) {
        rectBody(g, dx, yy, dw, bh * 0.07, 1, [62, 60, 62], { lw: 1, ao: 0.8, rim: 0.7 });
        for (let k = 0; k < 3; k++) rivet(g, dx + dw * (0.16 + k * 0.34), yy + bh * 0.035, 1.3);
      }
    }
    // kæde og hængelås
    const cy = by + bh * 0.5;
    const links = 7;
    for (let i = 0; i < links; i++) {
      const x = bx - 2 + (i / (links - 1)) * (bw + 4);
      g.save();
      g.translate(x, cy + (i % 2 ? 1 : -1) * 0.6);
      g.rotate(i % 2 ? 0 : 0.2);
      g.beginPath();
      g.ellipse(0, 0, bw * 0.06, bw * 0.034, 0, 0, 7);
      g.strokeStyle = 'rgba(10,6,4,.85)';
      g.lineWidth = 3.4;
      g.stroke();
      g.strokeStyle = 'rgb(138,136,140)';
      g.lineWidth = 2;
      g.stroke();
      g.restore();
    }
    ellBody(g, 0, cy + 5, 4.2, 5, [150, 126, 62], { lw: 1.2 });
    g.fillStyle = 'rgba(10,6,4,.85)';
    g.beginPath();
    g.arc(0, cy + 5.5, 1.2, 0, 7);
    g.fill();
    // spind mellem fløjene
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.fillRect(-0.7, by, 1.4, bh);
  }
  g.strokeStyle = 'rgba(10,5,2,.9)';
  g.lineWidth = 2.2;
  hole();
  g.stroke();
}

/** Skifertag-flade: skæl-formede tegl i rækker. Tegnes i lokale koordinater, hvor tagfoden (dryppen) er nederst. */
function shingles(g: G, r: Rnd, wx: number, hy: number, base: RGB, rows: number, mossy: boolean, lit: number): void {
  const path = rectPath(g, -wx / 2, -hy / 2, wx, hy, 0);
  path();
  g.fillStyle = rgb(shift(base, lit - 20));
  g.fill();
  clipped(g, path, () => {
    const rh = hy / rows;
    const n = Math.max(4, Math.round(wx / (rh * 1.25)));
    const tw = wx / n;
    for (let i = rows - 1; i >= 0; i--) {
      const y = -hy / 2 + i * rh;
      const off = i % 2 ? tw / 2 : 0;
      for (let j = -1; j <= n; j++) {
        const x = -wx / 2 + j * tw + off;
        const tc = shift(base, lit + (r() - 0.5) * 26 - (i / rows) * 6);
        g.beginPath();
        g.moveTo(x, y - rh);
        g.lineTo(x + tw, y - rh);
        g.lineTo(x + tw, y + rh * 0.55);
        g.arc(x + tw / 2, y + rh * 0.55, tw / 2, 0, Math.PI);
        g.closePath();
        g.fillStyle = rgb(tc);
        g.fill();
        g.strokeStyle = 'rgba(8,4,0,.5)';
        g.lineWidth = 0.9;
        g.stroke();
        g.beginPath();
        g.arc(x + tw / 2, y + rh * 0.55 - 1, tw / 2 - 1, 0.15, Math.PI - 0.15);
        g.strokeStyle = 'rgba(255,246,225,.2)';
        g.stroke();
      }
    }
    mottle(g, r, [-wx / 2, -hy / 2, wx / 2, hy / 2], base, 26, rh * 0.8, 14, 0.25);
    if (mossy) {
      for (let k = 0; k < 3; k++) mossPatch(g, r, (r() - 0.5) * wx, (r() - 0.2) * hy, rh * 2.4, 22);
    }
    // blød skygge mod tagfod og nokken
    g.fillStyle = lin(g, 0, -hy / 2, 0, hy / 2, [[0, 'rgba(255,240,200,.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.28)']]);
    g.fillRect(-wx / 2, -hy / 2, wx, hy);
  });
}

function roofPlane(g: G, r: Rnd, cx: number, cy: number, ang: number, wx: number, hy: number, base: RGB, rows: number, mossy: boolean, lit: number): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(ang);
  shingles(g, r, wx, hy, base, rows, mossy, lit);
  g.restore();
}

function mausoleum(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col = STONES[param(o, 'stone', 'granite')] ?? STONES.granite!;
  const mossy = param(o, 'moss', true);
  const roof = shift(col, -34);
  const W = w * 0.9;
  const top = -h * 0.47;
  const rb = h * 0.14;
  const mid = (top + rb) / 2;
  groundShadow(g, 4, 2, w * 0.58, h * 0.55, 0.5);
  // fundament og trin
  rectBody(g, -w * 0.33, h * 0.36, w * 0.66, h * 0.11, 2, shift(col, -2), { lw: 1.5, ao: 1.5 });
  rectBody(g, -w * 0.29, h * 0.31, w * 0.58, h * 0.09, 2, shift(col, 8), { lw: 1.5, ao: 1.5 });
  for (const sx of [-1, 1]) rectBody(g, sx * w * 0.3 - w * 0.03, h * 0.3, w * 0.06, h * 0.17, 2, shift(col, -12), { lw: 1.4, ao: 1.2 });
  // hovedtaget: muret under, to flader
  const wall = rectPath(g, -W / 2 - 3, top - 3, W + 6, rb - top + 9, 3);
  castShadow(g, wall, w * 0.05, h * 0.035, w * 0.05, 0.5);
  body(g, wall, shift(col, -16), [-W / 2, top, W / 2, rb + 6], { lw: 2, ao: 2 });
  roofPlane(g, r, 0, (top + mid) / 2 - 0.3, Math.PI, W, mid - top, roof, 5, mossy, 14);
  roofPlane(g, r, 0, (mid + rb) / 2 + 0.3, 0, W, rb - mid, roof, 5, mossy, -4);
  for (const [y0, y1] of [[top, mid], [mid, rb]] as const) {
    g.strokeStyle = OUT;
    g.lineWidth = 2;
    g.strokeRect(-W / 2, y0, W, y1 - y0);
  }
  // nokken af store sten med kugler i enderne
  rectBody(g, -W / 2, mid - 3.5, W, 7, 3, shift(col, 8), { lw: 1.4, ao: 1, rim: 1 });
  for (let i = 1; i < 9; i++) {
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fillRect(-W / 2 + (W * i) / 9, mid - 3.2, 1, 6.4);
  }
  // portikens tag (gavl mod syd)
  const pw = w * 0.56;
  const py0 = rb - h * 0.02;
  const py1 = h * 0.37;
  const porch = rectPath(g, -pw / 2 - 2, py0, pw + 4, py1 - py0 + 2, 2);
  castShadow(g, porch, w * 0.03, h * 0.03, w * 0.04, 0.55);
  g.fillStyle = rgb(shift(col, -20));
  porch();
  g.fill();
  roofPlane(g, r, -pw / 4, (py0 + py1) / 2, Math.PI / 2, py1 - py0, pw / 2, roof, 4, mossy, 18);
  roofPlane(g, r, pw / 4, (py0 + py1) / 2, -Math.PI / 2, py1 - py0, pw / 2, roof, 4, mossy, -8);
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.strokeRect(-pw / 2, py0, pw, py1 - py0);
  rectBody(g, -3.2, py0 - 1, 6.4, py1 - py0 + 3, 2, shift(col, 8), { lw: 1.4, ao: 1, rim: 1 });
  // gavlens forkant (frontispice) og søjlehoveder
  rectBody(g, -pw / 2 - 4, py1 - 1, pw + 8, h * 0.035, 2, shift(col, 14), { lw: 1.5, ao: 1.2, rim: 1 });
  for (const sx of [-0.5, -0.2, 0.2, 0.5]) {
    const x = sx * pw;
    ellBody(g, x, py1 + h * 0.045, w * 0.028, w * 0.028, shift(col, 26), { lw: 1.3, ao: 1.5, light: 34, dark: 44 });
    ellBody(g, x, py1 + h * 0.045, w * 0.015, w * 0.015, shift(col, 40), { lw: 0.7, ao: 0 });
  }
  // kors på toppen
  const kx = 0;
  const ky = mid;
  castShadow(g, () => { g.beginPath(); g.rect(kx - 1.5, ky - 9, 3, 18); g.rect(kx - 6, ky - 3, 12, 3); }, 3, 3, 2, 0.5);
  rectBody(g, kx - 2, ky - 9, 4, 18, 1, shift(col, 18), { lw: 1, ao: 0.5, rim: 0.5 });
  rectBody(g, kx - 7, ky - 4, 14, 4, 1, shift(col, 18), { lw: 1, ao: 0.5, rim: 0.5 });
  // skorsten/revner i tagfladerne
  for (let i = 0; i < 2; i++) {
    g.save();
    g.beginPath();
    g.rect(-W / 2, top, W, rb - top);
    g.clip();
    crack(g, r, (r() - 0.5) * W, top + r() * (rb - top), h * 0.1, r() * 6, 0.9);
    g.restore();
  }
}

const stoneParam = { key: 'stone', label: 'Sten', type: 'select' as const, default: 'granite', options: [{ value: 'granite', label: 'Granit' }, { value: 'marble', label: 'Marmor' }, { value: 'slate', label: 'Skifer' }, { value: 'sandstone', label: 'Sandsten' }] };

export const graveyardKinds: ObjectKind[] = [
  kind({
    key: 'grave_mound', family: 'graveyard', name: 'Grav med gravsten', w: 1.3, h: 2, keepAspect: false, shadow: 5, bleed: 0.08,
    params: [
      stoneParam,
      { key: 'age', label: 'Alder', type: 'select', default: 'old', options: [{ value: 'fresh', label: 'Frisk jord' }, { value: 'old', label: 'Gammel' }, { value: 'overgrown', label: 'Overgroet' }] },
      { key: 'flowers', label: 'Blomster', type: 'toggle', default: true },
      { key: 'kerb', label: 'Randsten', type: 'toggle', default: true },
    ],
    draw: graveMound,
  }),
  kind({
    key: 'grave_cross', family: 'graveyard', name: 'Gravkors', w: 1.2, h: 1.6, keepAspect: false, shadow: 8, bleed: 0.12,
    params: [
      { key: 'style', label: 'Type', type: 'select', default: 'stone', options: [{ value: 'stone', label: 'Stenkors' }, { value: 'celtic', label: 'Keltisk kors' }, { value: 'wood', label: 'Trækors' }] },
      stoneParam,
    ],
    draw: graveCross,
  }),
  kind({
    key: 'crypt_hatch', family: 'graveyard', name: 'Krypt-luge', w: 2, h: 2, shadow: 5, bleed: 0.04,
    params: [{ key: 'open', label: 'Åben', type: 'toggle', default: false }, stoneParam],
    draw: cryptHatch,
  }),
  kind({
    key: 'mausoleum', family: 'graveyard', name: 'Mausoleum', w: 3, h: 3.4, keepAspect: false, shadow: 10, bleed: 0.06,
    params: [stoneParam, { key: 'moss', label: 'Mos', type: 'toggle', default: true }],
    draw: mausoleum,
  }),
];

void blobBody;
void ellipsePath;
void mix;
void orb;
