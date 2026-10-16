import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, crack, ellBody, ellipsePath, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, ironRect, sack, vary } from '../pack3/common';
import { apple, board, bowl, bottle, candle, cheeseWheel, flame, glow, jar, loaf, pan, pot, steam, BRASS, CLAY, COPPER, PEWTER, WOOD, WOOD_DARK } from './props';

/** Køkken: komfur, ildsted, skærebræt, spisekammer, brødtrug, ovn, spid og vaskebalje. */

function stoneSlab(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB = [118, 112, 104], rows = 3): void {
  const path = rectPath(g, x, y, w, h, 3);
  body(g, path, base, [x, y, x + w, y + h], { lw: 1.7, ao: 4 });
  g.save();
  path();
  g.clip();
  const rh = h / rows;
  for (let j = 0; j < rows; j++) {
    let cx = x - (j % 2 ? rh * 0.9 : 0);
    while (cx < x + w) {
      const bw = rh * (1.5 + r() * 0.9);
      g.fillStyle = rgb(shift(base, (r() - 0.5) * 22), 0.55);
      g.fillRect(cx + 0.5, y + j * rh + 0.5, bw - 1, rh - 1);
      g.strokeStyle = 'rgba(14,8,4,.55)';
      g.lineWidth = 0.8;
      g.strokeRect(cx, y + j * rh, bw, rh);
      cx += bw;
    }
  }
  mottle(g, r, [x, y, x + w, y + h], base, Math.round((w * h) / 260), 3, 20, 0.35);
  g.restore();
  g.strokeStyle = 'rgba(255,246,220,.28)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x + 1.5, y + h - 2);
  g.lineTo(x + 1.5, y + 1.5);
  g.lineTo(x + w - 2, y + 1.5);
  g.stroke();
  path();
  g.strokeStyle = 'rgba(22,12,6,.85)';
  g.lineWidth = 1.7;
  g.stroke();
}

/** Glødende kul/gløder i en rist. */
function embers(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, n = 26): void {
  g.fillStyle = radial(g, cx, cy, Math.max(rx, ry), [[0, 'rgba(255,130,30,.9)'], [0.6, 'rgba(180,50,10,.8)'], [1, 'rgba(40,16,8,.9)']]);
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, 7);
  g.fill();
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r());
    const s = Math.min(rx, ry) * (0.08 + r() * 0.12);
    g.fillStyle = r() < 0.3 ? 'rgba(255,230,130,.95)' : r() < 0.6 ? 'rgba(255,140,40,.95)' : 'rgba(60,24,12,.9)';
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * rx * d * 0.85, cy + Math.sin(a) * ry * d * 0.85, s * 1.3, s, r() * 3, 0, 7);
    g.fill();
  }
  glow(g, cx, cy, Math.max(rx, ry) * 1.6, [255, 120, 30], 0.3);
}

function range(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  stoneSlab(g, r, -W / 2, -H / 2, W, H, [112, 106, 100], 4);
  // jernplade med to ildhuller
  const plate = ironRect;
  plate(g, r, -W * 0.46, -H * 0.4, W * 0.92, H * 0.8, [58, 58, 62], { rivets: true, rad: 3 });
  const n = Math.max(2, Math.round(W / 55));
  const gap = (W * 0.84) / n;
  const hasFire = param(o, 'fire', true);
  for (let i = 0; i < n; i++) {
    const cx = -W * 0.42 + gap * (i + 0.5);
    const rad = Math.min(gap * 0.4, H * 0.3);
    ellBody(g, cx, 0, rad * 1.1, rad * 1.1, [34, 34, 38], { lw: 1.2, ao: 1 });
    if (hasFire && i % 2 === 0) {
      embers(g, r, cx, 0, rad * 0.85, rad * 0.85, 10);
    }
    const t = (i + (o.seed & 3)) % 3;
    if (t === 0) pot(g, r, cx, 0, rad * 0.85, [84, 82, 86], { lid: r() < 0.4, soup: [150, 96, 50] });
    else if (t === 1) pan(g, cx, 0, rad * 0.8, -0.6 + r() * 0.4, [58, 56, 58]);
    else {
      pot(g, r, cx, 0, rad * 0.75, COPPER, { lid: true });
    }
    if (hasFire && i % 2 === 0) steam(g, r, cx, -rad * 0.3, rad * 0.8, 4, 0.18);
  }
  // rørtang og slev
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.44, H * 0.34);
    g.lineTo(-W * 0.18, H * 0.34);
  }, 1.8, [90, 90, 96], { outline: 1 });
  ellBody(g, -W * 0.1, H * 0.34, 3.5, 2.6, [120, 120, 126], { lw: 0.9, ao: 0.3 });
}

function hearthPots(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // ring af sten
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    ellBody(g, Math.cos(a) * S * 0.44, Math.sin(a) * S * 0.44, S * 0.1, S * 0.08, shift([122, 116, 108], (r() - 0.5) * 24), { lw: 1.2, ao: 1 });
  }
  g.fillStyle = 'rgba(14,8,4,.8)';
  g.beginPath();
  g.arc(0, 0, S * 0.37, 0, 7);
  g.fill();
  embers(g, r, 0, 0, S * 0.34, S * 0.34, 32);
  // trefod
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.283 + 0.5;
    tube(g, () => {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * S * 0.38, Math.sin(a) * S * 0.38);
    }, 2.4, [54, 52, 54], { outline: 1 });
  }
  pot(g, r, 0, 0, S * 0.27, [62, 60, 64], { soup: [158, 112, 52] });
  steam(g, r, 0, 0, S * 0.3, 5, 0.2);
  // slev
  tube(g, () => {
    g.beginPath();
    g.moveTo(S * 0.2, -S * 0.12);
    g.lineTo(S * 0.47, -S * 0.3);
  }, 2, [150, 150, 156], { outline: 1 });
}

function choppingBoard(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [136, 96, 58], { vertical: false, count: Math.max(3, Math.round(H / 12)) });
  const t = param(o, 'content', 'veg');
  // skærebræt
  const bw = W * 0.5;
  const bh = H * 0.7;
  rectBody(g, -W * 0.3, -bh / 2, bw, bh, 4, [178, 138, 88], { lw: 1.4, ao: 2 });
  g.strokeStyle = 'rgba(70,40,16,.35)';
  g.lineWidth = 0.7;
  for (let i = 0; i < 14; i++) {
    const x = -W * 0.3 + 4 + r() * (bw - 8);
    const y = -bh / 2 + 4 + r() * (bh - 8);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 6 + r() * 8, y + (r() - 0.5) * 4);
    g.stroke();
  }
  if (t === 'veg') {
    // gulerødder, løg, kål
    for (let i = 0; i < 4; i++) {
      g.save();
      g.translate(-W * 0.22 + i * W * 0.1, (r() - 0.5) * bh * 0.5);
      g.rotate(0.3 + r() * 0.4);
      polyBody(g, [[-W * 0.07, -2.6], [W * 0.07, 0], [-W * 0.07, 2.6]], [226, 120, 36], { lw: 0.9, ao: 0.5, rim: 0.3 });
      for (let k = 0; k < 3; k++) {
        tube(g, () => {
          g.beginPath();
          g.moveTo(-W * 0.07, 0);
          g.lineTo(-W * 0.09, (k - 1) * 2.2);
        }, 1.2, [90, 150, 52], { outline: 0.5 });
      }
      g.restore();
    }
    ellBody(g, W * 0.12, -bh * 0.1, H * 0.16, H * 0.15, [226, 214, 170], { lw: 1, ao: 1 });
    ellBody(g, W * 0.08, bh * 0.22, H * 0.12, H * 0.11, [180, 110, 150], { lw: 1, ao: 1 });
  } else if (t === 'meat') {
    for (let i = 0; i < 3; i++) {
      const x = -W * 0.18 + i * W * 0.14;
      ellBody(g, x, (r() - 0.5) * bh * 0.4, W * 0.07, H * 0.17, vary(r, [186, 74, 70], 16), { lw: 1.1, ao: 1.2 });
      g.fillStyle = 'rgba(250,220,210,.7)';
      g.beginPath();
      g.ellipse(x + 2, 0, 1.5, 5, 0.4, 0, 7);
      g.fill();
    }
  } else {
    loaf(g, r, -W * 0.1, 0, W * 0.34, H * 0.36, 0.2);
    cheeseWheel(g, W * 0.1, bh * 0.1, H * 0.15, [226, 190, 90], true);
  }
  // kniv
  g.save();
  g.translate(W * 0.34, -H * 0.05);
  g.rotate(-0.3);
  polyBody(g, [[-2.4, -H * 0.28], [2.4, -H * 0.28], [2.4, H * 0.14], [-2.4, H * 0.1]], [196, 198, 206], { lw: 1, ao: 0.4, rim: 0.4 });
  rectBody(g, -2.6, H * 0.14, 5.2, H * 0.22, 2, [74, 46, 26], { lw: 1, ao: 0.4 });
  g.restore();
}

function pantryShelf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  board(g, r, -W / 2, -H / 2, W, H, WOOD);
  // bagplade (mørk) og hylde-kant foran
  g.fillStyle = 'rgba(20,10,4,.35)';
  g.fillRect(-W / 2 + 2, -H / 2 + 2, W - 4, H * 0.18);
  const n = Math.max(4, Math.round(W / 24));
  const slot = (W - 8) / n;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 4 + slot * (i + 0.5);
    const y = (r() - 0.35) * H * 0.2;
    const t = Math.floor(r() * 6);
    const rad = Math.min(slot * 0.42, H * 0.3);
    if (t === 0) jar(g, x, y, rad, [136, 170, 150], [150, 110, 70], [200, 60, 50]);
    else if (t === 1) jar(g, x, y, rad, [200, 190, 150], [100, 70, 44], [226, 180, 70]);
    else if (t === 2) cheeseWheel(g, x, y, rad * 1.05, vary(r, [226, 190, 90], 20), r() < 0.3);
    else if (t === 3) ellBody(g, x, y, rad, rad, vary(r, CLAY, 14), { lw: 1.1, ao: rad * 0.1, rim: 0.7 }), ellBody(g, x, y, rad * 0.55, rad * 0.55, [40, 24, 14], { lw: 0.7, ao: 0 });
    else if (t === 4) sack(g, r, x, y, rad * 1.05, [186, 160, 112], [226, 210, 150]);
    else bowl(g, x, y, rad, [196, 176, 140], [200, 150, 70]);
  }
  // en hængende skinke/ølpølse lugter forbi i forkanten
  if (r() < 0.6) ellBody(g, W * (r() - 0.5) * 0.7, H * 0.32, W * 0.04, H * 0.14, [160, 66, 56], { lw: 1, ao: 0.6 });
}

function breadTrough(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const path = rectPath(g, -W / 2, -H / 2, W, H, H * 0.28);
  body(g, path, WOOD, [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 3 });
  clipped(g, path, () => {
    g.strokeStyle = 'rgba(30,14,4,.28)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      const y = -H / 2 + r() * H;
      g.beginPath();
      g.moveTo(-W / 2, y);
      g.lineTo(W / 2, y + (r() - 0.5) * 2);
      g.stroke();
    }
  });
  // indre trug med dej
  const ip = rectPath(g, -W / 2 + 6, -H / 2 + 6, W - 12, H - 12, H * 0.22);
  body(g, ip, [78, 50, 28], [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.2, ao: 4 });
  const mode = param(o, 'content', 'dough');
  clipped(g, ip, () => {
    mottle(g, r, [-W / 2 + 6, -H / 2 + 6, W / 2 - 6, H / 2 - 6], [236, 230, 214], 40, 4, 10, 0.5);
    if (mode === 'dough') {
      ellBody(g, -W * 0.15, 0, W * 0.3, H * 0.34, [236, 222, 190], { lw: 1.1, ao: 3, rim: 2 });
      ellBody(g, W * 0.22, H * 0.03, W * 0.18, H * 0.26, [232, 216, 182], { lw: 1.1, ao: 3, rim: 2 });
    } else {
      const n = 4;
      for (let i = 0; i < n; i++) loaf(g, r, -W * 0.34 + i * (W * 0.23), (r() - 0.5) * H * 0.12, W * 0.2, H * 0.4, (r() - 0.5) * 0.4);
    }
  });
  // mel-støv og kavle
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.2, H * 0.26);
    g.lineTo(W * 0.46, H * 0.22);
  }, 4.4, [196, 160, 110], { outline: 1.2 });
}

function bakeOven(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const W = o.w;
  const H = o.h;
  stoneSlab(g, r, -W / 2, -H / 2, W, H, [140, 100, 78], 5);
  // kuppel
  const rad = S * 0.36;
  ellBody(g, 0, -H * 0.04, rad * 1.1, rad * 1.1, [158, 116, 88], { lw: 2, ao: 6, rim: 3 });
  clipped(g, ellipsePath(g, 0, -H * 0.04, rad * 1.1, rad * 1.1), () => {
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(0, -H * 0.04, rad * (0.2 + i * 0.17), 0, 7);
      g.strokeStyle = 'rgba(30,14,6,.35)';
      g.lineWidth = 0.9;
      g.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      g.beginPath();
      g.moveTo(Math.cos(a) * rad * 0.2, -H * 0.04 + Math.sin(a) * rad * 0.2);
      g.lineTo(Math.cos(a) * rad * 1.1, -H * 0.04 + Math.sin(a) * rad * 1.1);
      g.strokeStyle = 'rgba(30,14,6,.22)';
      g.stroke();
    }
  });
  // åbning forrest
  const p = () => {
    g.beginPath();
    g.moveTo(-S * 0.14, H / 2 - 1);
    g.lineTo(-S * 0.14, H * 0.28);
    g.quadraticCurveTo(0, H * 0.14, S * 0.14, H * 0.28);
    g.lineTo(S * 0.14, H / 2 - 1);
    g.closePath();
  };
  body(g, p, [30, 18, 12], [-S * 0.14, H * 0.14, S * 0.14, H / 2], { lw: 1.6, ao: 3 });
  if (param(o, 'fire', true)) {
    embers(g, r, 0, H * 0.4, S * 0.12, S * 0.07, 10);
    flame(g, -S * 0.04, H * 0.38, 4);
    flame(g, S * 0.05, H * 0.4, 3.4);
  }
  // brødskovl
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.42, -H * 0.4);
    g.lineTo(W * 0.42, H * 0.24);
  }, 3, [150, 112, 70], { outline: 1.2 });
  ellBody(g, W * 0.42, H * 0.34, S * 0.1, S * 0.12, [186, 148, 98], { lw: 1.2, ao: 1 });
}

function spitRoast(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // glødebed
  const p = rectPath(g, -W * 0.44, -H * 0.3, W * 0.88, H * 0.6, 6);
  body(g, p, [64, 56, 50], [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.6, ao: 5 });
  clipped(g, p, () => {
    embers(g, r, 0, 0, W * 0.42, H * 0.28, 60);
  });
  // gafler (stativer)
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * W * 0.47, -H * 0.38);
      g.lineTo(s * W * 0.47, H * 0.38);
    }, 4, [60, 58, 62], { outline: 1.4 });
    ellBody(g, s * W * 0.47, 0, 4, 5, [90, 88, 94], { lw: 1, ao: 0.5 });
  }
  // spid med steg
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.5, 0);
    g.lineTo(W * 0.52, 0);
  }, 3, [132, 134, 140], { outline: 1.2 });
  const type = param(o, 'meat', 'pig');
  const rx = W * 0.3;
  const ry = H * 0.2;
  ellBody(g, 0, 0, rx, ry, type === 'fowl' ? [204, 150, 70] : [176, 100, 52], { lw: 1.6, ao: ry * 0.2, rim: 2 });
  clipped(g, ellipsePath(g, 0, 0, rx, ry), () => {
    mottle(g, r, [-rx, -ry, rx, ry], [150, 70, 30], 40, 3, 30, 0.6);
    g.strokeStyle = 'rgba(60,24,8,.4)';
    g.lineWidth = 0.8;
    for (let i = -4; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * rx * 0.2, -ry);
      g.lineTo(i * rx * 0.2 + 3, ry);
      g.stroke();
    }
  });
  if (type === 'pig') {
    ellBody(g, -rx * 1.02, 0, W * 0.07, ry * 0.7, [190, 112, 62], { lw: 1.2, ao: 1 });
    for (const s of [-1, 1]) ellBody(g, -rx * 0.9, s * ry * 0.5, W * 0.025, H * 0.04, [160, 80, 40], { lw: 0.8, ao: 0.2 });
  }
  // dryppende fedt og dampe
  for (let i = 0; i < 4; i++) glow(g, (r() - 0.5) * rx, (r() - 0.5) * ry, 6, [255, 200, 90], 0.3);
  steam(g, r, 0, -ry * 0.4, W * 0.25, 4, 0.12);
  // sved/håndsving
  ellBody(g, W * 0.52, 0, 3.4, 3.4, [180, 180, 186], { lw: 0.9, ao: 0.4 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.52, 0);
    g.lineTo(W * 0.52, H * 0.18);
    g.lineTo(W * 0.58, H * 0.18);
  }, 2, [96, 94, 100], { outline: 1 });
}

function workTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [150, 108, 66], { vertical: false, count: Math.max(3, Math.round(H / 12)), nails: true });
  const items = Math.round(param(o, 'items', 7));
  for (let i = 0; i < items; i++) {
    const x = -W * 0.42 + (W * 0.84 * (i + 0.5)) / items + (r() - 0.5) * W * 0.04;
    const y = (r() - 0.5) * H * 0.4;
    const t = Math.floor(r() * 7);
    const s = Math.min(W / items * 0.4, H * 0.28);
    if (t === 0) pot(g, r, x, y, s, [84, 82, 88], { soup: [196, 150, 70] });
    else if (t === 1) bowl(g, x, y, s * 0.9, [186, 160, 124], [236, 226, 196]);
    else if (t === 2) loaf(g, r, x, y, s * 1.9, s * 1.1, r() * 2);
    else if (t === 3) { apple(g, x, y, s * 0.4); apple(g, x + s * 0.6, y + s * 0.2, s * 0.4, [214, 176, 50]); apple(g, x + s * 0.1, y + s * 0.7, s * 0.4, [150, 180, 60]); }
    else if (t === 4) bottle(g, x, y, s * 2, r() * 3, [64, 100, 70]);
    else if (t === 5) cheeseWheel(g, x, y, s * 0.9, [226, 190, 90], r() < 0.5);
    else { g.save(); g.translate(x, y); g.rotate(r() * 3); tube(g, () => { g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); }, 2, [150, 150, 156], { outline: 1 }); ellBody(g, s, 0, 4, 3, [150, 150, 156], { lw: 0.9, ao: 0.3 }); g.restore(); }
  }
  void crack;
}

function washTub(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  ellBody(g, 0, 0, S * 0.48, S * 0.48, WOOD, { lw: 1.8, ao: 3 });
  clipped(g, ellipsePath(g, 0, 0, S * 0.48, S * 0.48), () => {
    g.strokeStyle = 'rgba(30,14,4,.4)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * 6.283;
      g.beginPath();
      g.moveTo(Math.cos(a) * S * 0.38, Math.sin(a) * S * 0.38);
      g.lineTo(Math.cos(a) * S * 0.48, Math.sin(a) * S * 0.48);
      g.stroke();
    }
  });
  for (const rr of [0.46, 0.34]) {
    g.beginPath();
    g.arc(0, 0, S * rr, 0, 7);
    g.strokeStyle = 'rgba(70,70,76,.8)';
    g.lineWidth = 1.6;
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, S * 0.36, 0, 7);
  g.fillStyle = radial(g, 0, 0, S * 0.36, [[0, 'rgba(176,206,222,.95)'], [1, 'rgba(100,140,166,.95)']], -S * 0.1, -S * 0.1, 2);
  g.fill();
  // sæbeskum
  g.fillStyle = 'rgba(252,252,255,.9)';
  for (let i = 0; i < 18; i++) {
    const a = r() * 6.283;
    const d = r() * S * 0.28;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, S * (0.02 + r() * 0.04), 0, 7);
    g.fill();
  }
  // vasketøj og vaskebræt
  if (param(o, 'cloth', true)) {
    ellBody(g, -S * 0.08, S * 0.02, S * 0.14, S * 0.09, [226, 220, 206], { lw: 1, ao: 1.5 });
    ellBody(g, S * 0.1, -S * 0.1, S * 0.1, S * 0.07, [170, 130, 120], { lw: 1, ao: 1.2 });
  }
}

export const kitchenKinds: ObjectKind[] = [
  kind({ key: 'kitchen_range_small', family: 'kitchen', name: 'Komfur, lille', w: 1.2, h: 1, shadow: 8, bleed: 0.04, params: [{ key: 'fire', label: 'Ild', type: 'toggle', default: true }], tags: ['indoor', 'house', 'tavern', 'village'], draw: range }),
  kind({ key: 'kitchen_range_large', family: 'kitchen', name: 'Komfur, stort', w: 2.4, h: 1, shadow: 8, bleed: 0.04, params: [{ key: 'fire', label: 'Ild', type: 'toggle', default: true }], tags: ['indoor', 'house', 'tavern', 'city', 'rich'], draw: range }),
  kind({ key: 'kitchen_hearth_pots', family: 'kitchen', name: 'Ildsted med gryde', w: 1.4, h: 1.4, shadow: 4, randomRotation: true, params: [], tags: ['indoor', 'camp', 'house', 'village', 'tavern'], draw: hearthPots }),
  kind({ key: 'kitchen_board_veg', family: 'kitchen', name: 'Skærebord, grønt', w: 1.4, h: 0.9, shadow: 5, params: [{ key: 'content', label: 'Indhold', type: 'select', default: 'veg', options: [{ value: 'veg', label: 'Grønt' }, { value: 'meat', label: 'Kød' }, { value: 'bread', label: 'Brød og ost' }] }], tags: ['indoor', 'house', 'tavern', 'village'], draw: choppingBoard }),
  kind({ key: 'kitchen_pantry_shelf', family: 'kitchen', name: 'Spisekammerhylde', w: 2.2, h: 0.6, shadow: 6, params: [], tags: ['indoor', 'house', 'tavern', 'village'], draw: pantryShelf }),
  kind({ key: 'kitchen_pantry_shelf_long', family: 'kitchen', name: 'Spisekammerhylde, lang', w: 3.4, h: 0.6, shadow: 6, params: [], tags: ['indoor', 'house', 'tavern', 'city'], draw: pantryShelf }),
  kind({ key: 'kitchen_bread_trough', family: 'kitchen', name: 'Brødtrug', w: 1.6, h: 0.8, shadow: 5, params: [{ key: 'content', label: 'Indhold', type: 'select', default: 'dough', options: [{ value: 'dough', label: 'Dej' }, { value: 'loaves', label: 'Brød' }] }], tags: ['indoor', 'house', 'tavern', 'village'], draw: breadTrough }),
  kind({ key: 'kitchen_oven', family: 'kitchen', name: 'Bageovn', w: 1.8, h: 1.8, shadow: 8, params: [{ key: 'fire', label: 'Ild', type: 'toggle', default: true }], tags: ['indoor', 'house', 'tavern', 'village', 'city'], draw: bakeOven }),
  kind({ key: 'kitchen_spit_roast', family: 'kitchen', name: 'Spid med steg', w: 2.2, h: 1.2, shadow: 4, params: [{ key: 'meat', label: 'Steg', type: 'select', default: 'pig', options: [{ value: 'pig', label: 'Gris' }, { value: 'fowl', label: 'Fjerkræ' }] }], tags: ['indoor', 'tavern', 'camp', 'rich', 'village'], draw: spitRoast }),
  kind({ key: 'kitchen_worktable', family: 'kitchen', name: 'Køkkenbord', w: 2, h: 0.9, shadow: 7, params: [{ key: 'items', label: 'Ting', type: 'range', min: 3, max: 10, step: 1, default: 7 }], tags: ['indoor', 'house', 'tavern', 'village'], draw: workTable }),
  kind({ key: 'kitchen_washtub', family: 'kitchen', name: 'Vaskebalje', w: 1, h: 1, shadow: 5, randomRotation: true, params: [{ key: 'cloth', label: 'Vasketøj', type: 'toggle', default: true }], tags: ['indoor', 'house', 'village', 'poor', 'outdoor'], draw: washTub }),
];
void candle;
void PEWTER;
void BRASS;
void WOOD_DARK;
