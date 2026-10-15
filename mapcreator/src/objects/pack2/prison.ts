import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blobPath, body, castShadow, clipped, crack, ellBody, groundShadow, lin, mix, mossPatch, mottle, OUT, polyBody, polyPath, radial,
  rectBody, rectPath, rgb, rivet, shift, tube, wobble, woodGrain, plankBoard, type G, type RGB, type Rnd,
} from './helpers';

const BONE: RGB = [218, 208, 180];

/** Led i en kæde langs en kurve af punkter. */
function chain(g: G, pts: [number, number][], link: number, col: RGB = [96, 96, 102]): void {
  let acc = 0;
  let idx = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const a = Math.atan2(y1 - y0, x1 - x0);
    let d = acc;
    while (d < len) {
      const x = x0 + Math.cos(a) * d;
      const y = y0 + Math.sin(a) * d;
      g.save();
      g.translate(x, y);
      g.rotate(a + (idx % 2 ? Math.PI / 2 : 0));
      g.beginPath();
      g.ellipse(0, 0, link * (idx % 2 ? 0.34 : 0.62), link * (idx % 2 ? 0.28 : 0.34), 0, 0, 7);
      g.strokeStyle = 'rgba(8,4,2,.8)';
      g.lineWidth = link * 0.36 + 1;
      g.stroke();
      g.strokeStyle = rgb(col);
      g.lineWidth = link * 0.3;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.lineWidth = link * 0.1;
      g.beginPath();
      g.ellipse(-link * 0.06, -link * 0.06, link * (idx % 2 ? 0.34 : 0.62), link * (idx % 2 ? 0.28 : 0.34), 0, 3.5, 5.2);
      g.stroke();
      g.restore();
      idx++;
      d += link * 0.78;
    }
    acc = d - len;
  }
}

function boneTube(g: G, a: [number, number], b: [number, number], wd: number, col: RGB = BONE): void {
  const tr = () => {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
  };
  tube(g, tr, wd, col, { outline: 1.6 });
  for (const p of [a, b]) {
    g.beginPath();
    g.arc(p[0], p[1], wd * 0.78, 0, 7);
    g.fillStyle = rgb(shift(col, 6));
    g.fill();
    g.strokeStyle = 'rgba(40,28,12,.85)';
    g.lineWidth = 1.1;
    g.stroke();
    g.fillStyle = 'rgba(255,255,245,.5)';
    g.beginPath();
    g.arc(p[0] - wd * 0.25, p[1] - wd * 0.25, wd * 0.24, 0, 7);
    g.fill();
  }
}

/** Skelet set oppefra, liggende med hovedet opad. `s` er skalaen (højde ≈ 2.6·s). */
function skeleton(g: G, r: Rnd, cx: number, cy: number, s: number, spread: number): void {
  g.save();
  g.translate(cx, cy);
  const bw = s * 0.11;
  // skygge
  groundShadow(g, s * 0.1, s * 0.12, s * 0.9, s * 1.3, 0.25);
  // ben
  for (const side of [-1, 1]) {
    const hip: [number, number] = [side * s * 0.14, s * 0.5];
    const knee: [number, number] = [side * (s * 0.2 + spread * s * 0.18), s * 1.08];
    const foot: [number, number] = [side * (s * 0.25 + spread * s * 0.3 + (r() - 0.5) * s * 0.1), s * 1.62];
    boneTube(g, hip, knee, bw * 1.2);
    boneTube(g, knee, foot, bw);
    // fod
    g.beginPath();
    g.ellipse(foot[0] + side * s * 0.02, foot[1] + s * 0.07, s * 0.07, s * 0.11, side * 0.15, 0, 7);
    g.fillStyle = rgb(shift(BONE, -6));
    g.fill();
    g.strokeStyle = 'rgba(40,28,12,.85)';
    g.lineWidth = 1.1;
    g.stroke();
  }
  // bækken
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(side * s * 0.15, s * 0.46, s * 0.17, s * 0.12, side * -0.5, 0, 7);
    g.fillStyle = rgb(shift(BONE, -6));
    g.fill();
    g.strokeStyle = 'rgba(40,28,12,.85)';
    g.lineWidth = 1.2;
    g.stroke();
    g.beginPath();
    g.ellipse(side * s * 0.12, s * 0.5, s * 0.06, s * 0.05, 0, 0, 7);
    g.fillStyle = 'rgba(30,20,10,.7)';
    g.fill();
  }
  // rygrad
  for (let i = 0; i < 14; i++) {
    const y = -s * 0.44 + (i / 13) * s * 0.9;
    g.fillStyle = rgb(shift(BONE, -4 + (i % 2) * 10));
    g.beginPath();
    g.ellipse(0, y, s * 0.05, s * 0.034, 0, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(40,28,12,.8)';
    g.lineWidth = 0.9;
    g.stroke();
  }
  // ribben
  for (let i = 0; i < 6; i++) {
    const y = -s * 0.38 + i * s * 0.1;
    const wd = s * (0.34 - Math.abs(i - 1.5) * 0.02 - i * 0.012);
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(side * s * 0.04, y);
      g.bezierCurveTo(side * wd * 0.9, y - s * 0.06, side * wd * 1.05, y + s * 0.08, side * s * 0.06, y + s * 0.13);
      g.strokeStyle = 'rgba(40,28,12,.85)';
      g.lineWidth = bw * 0.62 + 1.3;
      g.stroke();
      g.strokeStyle = rgb(BONE);
      g.lineWidth = bw * 0.62;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,240,.45)';
      g.lineWidth = bw * 0.18;
      g.translate(-0.6, -0.6);
      g.stroke();
      g.translate(0.6, 0.6);
    }
  }
  // brystben
  g.beginPath();
  g.moveTo(0, -s * 0.34);
  g.lineTo(0, -s * 0.04);
  g.strokeStyle = 'rgba(40,28,12,.85)';
  g.lineWidth = bw * 0.8 + 1.4;
  g.stroke();
  g.strokeStyle = rgb(shift(BONE, 6));
  g.lineWidth = bw * 0.8;
  g.stroke();
  // arme
  for (const side of [-1, 1]) {
    const sh: [number, number] = [side * s * 0.32, -s * 0.38];
    const el: [number, number] = [side * (s * 0.55 + spread * s * 0.2), -s * 0.16 + (r() - 0.5) * s * 0.12];
    const ha: [number, number] = [side * (s * 0.7 + spread * s * 0.35), s * 0.2 + (r() - 0.5) * s * 0.2];
    boneTube(g, sh, el, bw);
    boneTube(g, el, ha, bw * 0.9);
    for (let f = 0; f < 4; f++) {
      const a = Math.atan2(ha[1] - el[1], ha[0] - el[0]) + (f - 1.5) * 0.32;
      g.beginPath();
      g.moveTo(ha[0], ha[1]);
      g.lineTo(ha[0] + Math.cos(a) * s * 0.12, ha[1] + Math.sin(a) * s * 0.12);
      g.strokeStyle = 'rgba(40,28,12,.85)';
      g.lineWidth = bw * 0.32 + 1.1;
      g.stroke();
      g.strokeStyle = rgb(BONE);
      g.lineWidth = bw * 0.32;
      g.stroke();
    }
  }
  // kranie
  const sy = -s * 0.64;
  const sr = s * 0.2;
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.beginPath();
  g.ellipse(sr * 0.25, sy + sr * 0.3, sr, sr * 1.05, 0, 0, 7);
  g.fill();
  g.fillStyle = radial(g, 0, sy, sr * 1.1, [[0, rgb(shift(BONE, 28))], [0.7, rgb(BONE)], [1, rgb(shift(BONE, -48))]], -sr * 0.3, sy - sr * 0.35, 1);
  g.beginPath();
  g.ellipse(0, sy, sr, sr * 1.05, 0, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(40,28,12,.9)';
  g.lineWidth = 1.5;
  g.stroke();
  // øjenhuler, næse, tænder
  for (const side of [-1, 1]) {
    g.fillStyle = 'rgba(14,8,4,.95)';
    g.beginPath();
    g.ellipse(side * sr * 0.4, sy + sr * 0.22, sr * 0.24, sr * 0.28, 0, 0, 7);
    g.fill();
  }
  g.beginPath();
  g.moveTo(0, sy + sr * 0.35);
  g.lineTo(-sr * 0.1, sy + sr * 0.62);
  g.lineTo(sr * 0.1, sy + sr * 0.62);
  g.closePath();
  g.fillStyle = 'rgba(14,8,4,.9)';
  g.fill();
  g.strokeStyle = 'rgba(40,28,12,.9)';
  g.lineWidth = 0.9;
  g.beginPath();
  for (let i = -3; i <= 3; i++) {
    g.moveTo(i * sr * 0.12, sy + sr * 0.72);
    g.lineTo(i * sr * 0.12, sy + sr * 0.92);
  }
  g.stroke();
  g.strokeStyle = 'rgba(255,255,245,.5)';
  g.beginPath();
  g.arc(0, sy, sr * 0.9, Math.PI * 1.05, Math.PI * 1.55);
  g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ jernbur

function ironCage(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const inside = param(o, 'inside', 'skeleton');
  const open = param(o, 'open', false);
  const iron: RGB = [50, 52, 58];
  const x0 = -w * 0.46;
  const y0 = -h * 0.46;
  const W = w * 0.92;
  const H = h * 0.92;
  const rect = rectPath(g, x0, y0, W, H, 3);
  // bundplader og halm
  castShadow(g, rect, 5, 6, 7, 0.4);
  body(g, rect, [74, 68, 62], [x0, y0, x0 + W, y0 + H], { lw: 2.4, ao: 2, rim: 1, outline: OUT });
  clipped(g, rect, () => {
    plankBoard(g, r, x0, y0, W, H, [78, 64, 48], 6, { wear: 1.5, nails: true, vertical: false });
    // mørk bund, så indersiden læses som dybde
    g.fillStyle = 'rgba(8,4,0,.22)';
    g.fillRect(x0, y0, W, H);
    if (inside !== 'empty') {
      for (let i = 0; i < 38; i++) {
        const x = x0 + r() * W;
        const y = y0 + r() * H;
        const a = r() * 6.28;
        g.strokeStyle = rgb(shift([160, 130, 70] as RGB, (r() - 0.5) * 40), 0.8);
        g.lineWidth = 1 + r();
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
        g.stroke();
      }
    }
    // gamle pletter
    for (let i = 0; i < 4; i++) {
      const x = x0 + r() * W;
      const y = y0 + r() * H;
      g.fillStyle = radial(g, x, y, 12, [[0, 'rgba(90,14,10,.4)'], [1, 'rgba(90,14,10,0)']]);
      g.beginPath();
      g.arc(x, y, 12, 0, 7);
      g.fill();
    }
  });
  if (inside === 'skeleton') skeleton(g, r, 0, -h * 0.12, w * 0.24, r() * 0.5);
  if (inside === 'bones') {
    for (let i = 0; i < 5; i++) boneTube(g, [(r() - 0.5) * W * 0.7, (r() - 0.5) * H * 0.7], [(r() - 0.5) * W * 0.7, (r() - 0.5) * H * 0.7], w * 0.025);
    ellBody(g, W * 0.2, -H * 0.1, w * 0.06, w * 0.06, BONE, { lw: 1.4, ao: 1, rim: 1, light: 30 });
  }
  // skygge af tremmerne på bunden
  const bars = 5;
  g.save();
  g.beginPath();
  g.rect(x0, y0, W, H);
  g.clip();
  g.translate(w * 0.03, h * 0.04);
  g.strokeStyle = 'rgba(8,4,0,.4)';
  g.lineWidth = 2.6;
  g.beginPath();
  for (let i = 0; i <= bars; i++) {
    const t = i / bars;
    g.moveTo(x0 + W * t, y0);
    g.lineTo(x0 + W * t, y0 + H);
    g.moveTo(x0, y0 + H * t);
    g.lineTo(x0 + W, y0 + H * t);
  }
  g.stroke();
  g.restore();
  // tremmer (loftgitter), set oppefra
  for (let i = 0; i <= bars; i++) {
    const t = i / bars;
    const vx = () => { g.beginPath(); g.moveTo(x0 + W * t, y0); g.lineTo(x0 + W * t, y0 + H); };
    const hy = () => { g.beginPath(); g.moveTo(x0, y0 + H * t); g.lineTo(x0 + W, y0 + H * t); };
    if (i > 0 && i < bars) {
      tube(g, vx, w * 0.022, iron, { outline: 1.6 });
      tube(g, hy, w * 0.022, iron, { outline: 1.6 });
    }
  }
  // ramme
  const fw = w * 0.05;
  for (const [ax, ay, bx2, by2] of [[x0, y0, x0 + W, y0], [x0, y0 + H, x0 + W, y0 + H], [x0, y0, x0, y0 + H], [x0 + W, y0, x0 + W, y0 + H]] as const) {
    const tr = () => { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); };
    tube(g, tr, fw, shift(iron, 6), { outline: 2 });
  }
  // nitter i krydsene
  for (let i = 1; i < bars; i++) for (let j = 1; j < bars; j++) rivet(g, x0 + (W * i) / bars, y0 + (H * j) / bars, 1.5, [84, 86, 92]);
  // hjørnestolper med knopper
  for (const [px, py] of [[x0, y0], [x0 + W, y0], [x0, y0 + H], [x0 + W, y0 + H]] as const) {
    ellBody(g, px, py, w * 0.05, w * 0.05, shift(iron, 8), { lw: 1.8, ao: 2, rim: 1.4, light: 44 });
    ellBody(g, px, py, w * 0.02, w * 0.02, [120, 122, 128], { lw: 0.8, ao: 0, light: 50 });
  }
  // dør i forsiden med hængelås
  const doorX = x0 + W * 0.3;
  const doorW = W * 0.4;
  if (open) {
    const gx0 = doorX - w * 0.07;
    const gy0 = y0 + H;
    const gw = w * 0.07;
    const gl = doorW;
    const gate = rectPath(g, gx0, gy0, gw, gl, 2);
    castShadow(g, gate, 3, 4, 4, 0.4);
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.fillRect(gx0 + gw, gy0, gw * 2.5, gl);
    rectBody(g, gx0, gy0, gw, gl, 2, shift(iron, 6), { lw: 1.6, ao: 0.8, rim: 0.8 });
    for (let i = 0; i < 4; i++) {
      const yy = gy0 + (gl * (i + 0.5)) / 4;
      const tr = () => { g.beginPath(); g.moveTo(gx0, yy); g.lineTo(gx0 + gw, yy); };
      tube(g, tr, w * 0.016, iron, { outline: 1.2 });
    }
    // mørk åbning i forsiden
    g.fillStyle = 'rgba(0,0,0,.55)';
    g.fillRect(doorX, y0 + H - fw * 0.6, doorW, fw * 1.2);
  } else {
    // hængelås og hasp
    rectBody(g, doorX - 1, y0 + H - fw * 0.8, doorW + 2, fw * 1.6, 1, [62, 62, 68], { lw: 1.2, ao: 0.6, rim: 0.6 });
    ellBody(g, 0, y0 + H, w * 0.035, w * 0.04, [150, 126, 62], { lw: 1.4, ao: 1, rim: 0.8, light: 40 });
    g.fillStyle = 'rgba(0,0,0,.9)';
    g.beginPath();
    g.arc(0, y0 + H + 0.5, 1.2, 0, 7);
    g.fill();
  }
  // glans på jernet og rust
  clipped(g, rect, () => {
    for (let i = 0; i < 16; i++) {
      g.fillStyle = `rgba(${130 + r() * 40},${60 + r() * 24},26,${0.14 + r() * 0.18})`;
      g.beginPath();
      g.ellipse(x0 + r() * W, y0 + r() * H, 1 + r() * 2.5, 1 + r() * 2.5, 0, 0, 7);
      g.fill();
    }
  });
}

// ------------------------------------------------------------------ pinebænk

function rack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const occupied = param(o, 'occupied', 'none');
  const wood: RGB = [84, 56, 34];
  const iron: RGB = [64, 64, 70];
  const x0 = -w * 0.44;
  const W = w * 0.62;
  const y0 = -h * 0.36;
  const H = h * 0.72;
  // ramme: to langsider
  const bed = rectPath(g, x0, y0, W, H, 4);
  castShadow(g, bed, 5, 6, 6, 0.45);
  body(g, bed, wood, [x0, y0, x0 + W, y0 + H], { lw: 2.2, ao: 3, rim: 1.4 });
  clipped(g, bed, () => {
    plankBoard(g, r, x0, y0, W, H, wood, 4, { vertical: true, nails: true, wear: 1.5 });
    // blod og snavs
    for (let i = 0; i < 5; i++) {
      const x = x0 + W * (0.2 + r() * 0.6);
      const y = y0 + H * (0.2 + r() * 0.6);
      const rd = w * (0.06 + r() * 0.07);
      g.fillStyle = radial(g, x, y, rd, [[0, 'rgba(96,12,10,.62)'], [0.7, 'rgba(96,12,10,.32)'], [1, 'rgba(96,12,10,0)']]);
      g.beginPath();
      g.ellipse(x, y, rd * 1.3, rd, r() * 3, 0, 7);
      g.fill();
    }
  });
  for (const side of [-1, 1]) {
    const rx = side < 0 ? x0 - w * 0.07 : x0 + W - w * 0.01;
    rectBody(g, rx, y0 - H * 0.04, w * 0.08, H * 1.08, 3, shift(wood, -14), { lw: 2, ao: 2, rim: 1.2 });
    clipped(g, rectPath(g, rx, y0 - H * 0.04, w * 0.08, H * 1.08, 3), () => woodGrain(g, r, [rx, y0, rx + w * 0.08, y0 + H], wood, { rot: Math.PI / 2, lines: 6, knots: 1 }));
  }
  // rullerne i begge ender
  for (const [ry, up] of [[y0 - H * 0.03, 1], [y0 + H * 1.03, -1]] as const) {
    const rh = h * 0.07;
    const rp = rectPath(g, x0 - w * 0.12, ry - rh, W + w * 0.24, rh * 2, rh);
    castShadow(g, rp, 3, 4, 4, 0.4);
    body(g, rp, shift(wood, 12), [x0, ry - rh, x0 + W, ry + rh], { lw: 1.8, ao: 2, rim: 1.2, angle: 90 });
    clipped(g, rp, () => {
      for (let i = 0; i < 12; i++) {
        g.strokeStyle = 'rgba(20,10,4,.35)';
        g.lineWidth = 1;
        const x = x0 - w * 0.1 + r() * (W + w * 0.2);
        g.beginPath();
        g.moveTo(x, ry - rh);
        g.lineTo(x + 2, ry + rh);
        g.stroke();
      }
      // rebvikling
      g.strokeStyle = 'rgba(176,144,88,.95)';
      g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(x0 + W * 0.3 + i * 3.4, ry - rh);
        g.lineTo(x0 + W * 0.3 + i * 3.4 + 2, ry + rh);
        g.stroke();
      }
    });
    // tandhjul og skralde
    const gx = x0 + W + w * 0.09;
    const gy = ry;
    g.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.283;
      const rad = rh * (i % 2 ? 1.5 : 1.9);
      g.lineTo(gx + Math.cos(a) * rad, gy + Math.sin(a) * rad);
    }
    g.closePath();
    g.fillStyle = lin(g, gx - rh * 2, gy - rh * 2, gx + rh * 2, gy + rh * 2, [[0, rgb(shift(iron, 40))], [1, rgb(shift(iron, -20))]]);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.stroke();
    ellBody(g, gx, gy, rh * 0.8, rh * 0.8, shift(iron, 8), { lw: 1.2, ao: 1, rim: 0.8, light: 30 });
    // håndtag
    const hd = () => { g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + w * 0.17, gy + up * h * 0.08); };
    tube(g, hd, rh * 0.7, wood);
    ellBody(g, gx + w * 0.17, gy + up * h * 0.08, rh * 0.6, rh * 0.6, shift(wood, -10), { lw: 1.2, ao: 0.8, rim: 0.6 });
  }
  // reb og manchetter
  for (const side of [-1, 1]) {
    for (const [ry, up] of [[y0 - H * 0.03, 1], [y0 + H * 1.03, -1]] as const) {
      const ax = x0 + W * (0.5 + side * 0.18);
      const ay = ry + up * h * 0.06;
      const bx = x0 + W * (0.5 + side * 0.15);
      const by = ry + up * h * (0.06 + 0.12 + (occupied === 'none' ? 0 : 0.0));
      rope(g, [[ax, ay], [(ax + bx) / 2, (ay + by) / 2], [bx, by]], 3.2);
      // manchet
      const cuff = () => { g.beginPath(); g.ellipse(bx, by + up * 3, 5, 4.2, 0, 0, 7); };
      body(g, cuff, [96, 62, 34], [bx - 5, by - 5, bx + 5, by + 5], { lw: 1.3, ao: 1, rim: 0.7 });
      ellBody(g, bx, by + up * 3, 2.4, 2.1, [20, 12, 6], { lw: 0.6, ao: 0 });
    }
  }
  if (occupied === 'skeleton') {
    g.save();
    g.beginPath();
    g.rect(x0 - 2, y0 - 2, W + 4, H + 4);
    g.clip();
    g.restore();
    skeleton(g, r, 0, y0 + H * 0.2, W * 0.2, 0.3);
  }
  // beslag og nitter på langsiderne
  for (const side of [-1, 1]) {
    const rx = side < 0 ? x0 - w * 0.07 : x0 + W - w * 0.01;
    for (const t of [0.15, 0.5, 0.85]) {
      rectBody(g, rx - 1, y0 + H * t - 3, w * 0.08 + 2, 6, 1, iron, { lw: 1, ao: 0.4, rim: 0.4 });
      rivet(g, rx + w * 0.04, y0 + H * t, 1.2);
    }
  }
}

function rope(g: G, pts: [number, number][], th: number): void {
  const tr = () => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  };
  g.lineCap = 'round';
  tr();
  g.strokeStyle = 'rgba(14,8,3,.8)';
  g.lineWidth = th + 1.4;
  g.stroke();
  tr();
  g.strokeStyle = 'rgb(160,130,80)';
  g.lineWidth = th;
  g.stroke();
  g.setLineDash([th * 0.4, th * 0.4]);
  tr();
  g.strokeStyle = 'rgba(40,24,8,.45)';
  g.stroke();
  g.setLineDash([]);
}

// ------------------------------------------------------------------ lænket skelet

function shackled(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const rust = param(o, 'rust', true);
  const iron: RGB = rust ? [112, 82, 62] : [90, 90, 96];
  const spread = r();
  const s = w * 0.26;
  const cx = 0;
  const cy = -h * 0.08;
  // tørret blod og snavs under
  for (let i = 0; i < 4; i++) {
    const x = (r() - 0.5) * w * 0.5;
    const y = (r() - 0.3) * h * 0.5;
    const rd = w * (0.08 + r() * 0.1);
    g.fillStyle = radial(g, x, y, rd, [[0, 'rgba(78,12,8,.45)'], [1, 'rgba(78,12,8,0)']]);
    g.beginPath();
    g.ellipse(x, y, rd * 1.3, rd, r() * 3, 0, 7);
    g.fill();
  }
  // ringe i gulvet
  const rings: [number, number][] = [[-w * 0.42, -h * 0.34], [w * 0.42, -h * 0.34], [-w * 0.3, h * 0.46], [w * 0.3, h * 0.46]];
  // skelettet
  skeleton(g, r, cx, cy, s, 0.3 + spread * 0.5);
  // håndled og ankler, forbundet med kæder til ringene
  const wrists: [number, number][] = [[-(s * 0.7 + (0.3 + spread * 0.5) * s * 0.35), cy + s * 0.2], [s * 0.7 + (0.3 + spread * 0.5) * s * 0.35, cy + s * 0.2]];
  const ankles: [number, number][] = [[-(s * 0.25 + (0.3 + spread * 0.5) * s * 0.3), cy + s * 1.62], [s * 0.25 + (0.3 + spread * 0.5) * s * 0.3, cy + s * 1.62]];
  const targets: [number, number][] = [rings[0]!, rings[1]!, rings[2]!, rings[3]!];
  const pts = [wrists[0]!, wrists[1]!, ankles[0]!, ankles[1]!];
  pts.forEach((p, i) => {
    const t = targets[i]!;
    const mid: [number, number] = [(p[0] + t[0]) / 2 + (r() - 0.5) * 6, (p[1] + t[1]) / 2 + 5];
    chain(g, [p, mid, t], w * 0.06, iron);
    // manchet
    const cuff = () => { g.beginPath(); g.ellipse(p[0], p[1], w * 0.045, w * 0.05, 0, 0, 7); };
    cuff();
    g.strokeStyle = 'rgba(8,4,2,.9)';
    g.lineWidth = w * 0.036 + 1.4;
    g.stroke();
    g.strokeStyle = rgb(iron);
    g.lineWidth = w * 0.036;
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.3)';
    g.lineWidth = 1;
    g.stroke();
    // ring i gulvet
    const rg = () => { g.beginPath(); g.arc(t[0], t[1], w * 0.055, 0, 7); };
    groundShadow(g, t[0] + 2, t[1] + 3, w * 0.07, w * 0.06, 0.4);
    ellBody(g, t[0], t[1], w * 0.075, w * 0.075, [92, 90, 94], { lw: 1.4, ao: 1.4, rim: 0.8 });
    tube(g, rg, w * 0.03, iron);
  });
  // gamle klude
  for (let i = 0; i < 3; i++) {
    const x = (r() - 0.5) * s * 0.5;
    const y = cy - s * 0.1 + r() * s * 0.7;
    g.save();
    g.translate(x, y);
    g.rotate(r() * 3);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(8, -6, 16, 2);
    g.quadraticCurveTo(8, 8, 0, 0);
    g.fillStyle = rgb([84 + r() * 30, 70 + r() * 20, 56] as RGB, 0.85);
    g.fill();
    g.strokeStyle = 'rgba(20,12,4,.6)';
    g.lineWidth = 0.9;
    g.stroke();
    g.restore();
  }
}

export const prisonKinds: ObjectKind[] = [
  kind({
    key: 'iron_cage', family: 'prison', name: 'Jernbur', w: 2, h: 2, keepAspect: false, shadow: 6, bleed: 0.2, randomRotation: false,
    params: [
      { key: 'inside', label: 'Indhold', type: 'select', default: 'skeleton', options: [{ value: 'skeleton', label: 'Skelet' }, { value: 'bones', label: 'Knogler' }, { value: 'straw', label: 'Kun halm' }, { value: 'empty', label: 'Tomt' }] },
      { key: 'open', label: 'Åben dør', type: 'toggle', default: false },
    ],
    draw: ironCage,
  }),
  kind({
    key: 'torture_rack', family: 'prison', name: 'Pinebænk', w: 1.8, h: 2.8, keepAspect: false, shadow: 4, bleed: 0.08, randomRotation: false,
    params: [{ key: 'occupied', label: 'Fange', type: 'select', default: 'none', options: [{ value: 'none', label: 'Ingen' }, { value: 'skeleton', label: 'Skelet' }] }],
    draw: rack,
  }),
  kind({
    key: 'shackled_skeleton', family: 'prison', name: 'Lænket skelet', w: 2, h: 2.6, keepAspect: false, shadow: 0, bleed: 0.05, randomRotation: false,
    params: [{ key: 'rust', label: 'Rustne lænker', type: 'toggle', default: true }],
    draw: shackled,
  }),
];

void blobPath;
void mix;
void polyPath;
void mossPatch;
void mottle;
void crack;
void wobble;
