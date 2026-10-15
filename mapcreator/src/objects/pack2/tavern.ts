import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  body, castShadow, clipped, ellBody, groundShadow, lin, mix, mottle, OUT, polyBody, polyPath, radial, rectBody, rectPath, rgb, rivet, shift,
  tube, woodGrain, type G, type RGB, type Rnd,
} from './helpers';

// ------------------------------------------------------------------ krus og tallerkner

function tankard(g: G, r: Rnd, x: number, y: number, rad: number, tone: 'wood' | 'pewter', ale: RGB): void {
  g.save();
  g.translate(x, y);
  const rot = (r() - 0.5) * 1.2;
  g.rotate(rot);
  // hank
  const hk = () => { g.beginPath(); g.arc(rad * 1.05, 0, rad * 0.55, -1.4, 1.4); };
  tube(g, hk, rad * 0.28, tone === 'wood' ? [104, 72, 42] : [150, 150, 156], { outline: 1.4 });
  const base: RGB = tone === 'wood' ? [118, 80, 46] : [156, 156, 162];
  groundShadow(g, rad * 0.4, rad * 0.5, rad * 1.2, rad * 1.1, 0.35);
  ellBody(g, 0, 0, rad, rad, base, { lw: 1.4, ao: rad * 0.12, rim: 1, light: 34, dark: 38 });
  if (tone === 'wood') {
    g.strokeStyle = 'rgba(30,14,4,.4)';
    g.lineWidth = 0.7;
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      g.moveTo(Math.cos(a) * rad * 0.82, Math.sin(a) * rad * 0.82);
      g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.stroke();
  }
  // øl med skum
  ellBody(g, 0, 0, rad * 0.78, rad * 0.78, [60, 36, 14], { lw: 0.8, ao: rad * 0.1, rim: 0, light: 4, dark: 20 });
  g.fillStyle = radial(g, 0, 0, rad * 0.74, [[0, rgb(shift(ale, 36))], [0.8, rgb(ale)], [1, rgb(shift(ale, -50))]], -rad * 0.2, -rad * 0.2, 0.5);
  g.beginPath();
  g.arc(0, 0, rad * 0.72, 0, 7);
  g.fill();
  // skum
  g.fillStyle = 'rgba(252,246,226,.92)';
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.283;
    g.moveTo(Math.cos(a) * rad * 0.34 + rad * 0.14, Math.sin(a) * rad * 0.34);
    g.arc(Math.cos(a) * rad * 0.34, Math.sin(a) * rad * 0.34, rad * 0.2, 0, 7);
  }
  g.arc(0, 0, rad * 0.34, 0, 7);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath();
  g.arc(-rad * 0.2, -rad * 0.24, rad * 0.1, 0, 7);
  g.fill();
  g.restore();
}

function plate(g: G, r: Rnd, x: number, y: number, rad: number, food: string): void {
  groundShadow(g, x + rad * 0.2, y + rad * 0.3, rad * 1.15, rad * 1.05, 0.35);
  ellBody(g, x, y, rad, rad, [166, 166, 172], { lw: 1.4, ao: rad * 0.1, rim: 1, light: 40, dark: 34 });
  ellBody(g, x, y, rad * 0.78, rad * 0.78, [130, 130, 138], { lw: 0.9, ao: rad * 0.1, rim: 0.5, light: 10, dark: 30 });
  g.save();
  g.translate(x, y);
  if (food === 'chicken') {
    // kyllingelår
    g.rotate((r() - 0.5) * 1.5);
    const bp = () => { g.beginPath(); g.moveTo(rad * 0.2, 0); g.lineTo(rad * 0.74, 0); };
    tube(g, bp, rad * 0.12, [232, 224, 200], { outline: 1.2 });
    ellBody(g, rad * 0.78, -rad * 0.05, rad * 0.1, rad * 0.1, [236, 228, 204], { lw: 0.9 });
    ellBody(g, rad * 0.78, rad * 0.08, rad * 0.1, rad * 0.1, [236, 228, 204], { lw: 0.9 });
    const mp = () => { g.beginPath(); g.ellipse(-rad * 0.14, 0, rad * 0.46, rad * 0.32, 0, 0, 7); };
    body(g, mp, [170, 98, 36], [-rad * 0.6, -rad * 0.32, rad * 0.32, rad * 0.32], { lw: 1.2, ao: 1.4, rim: 1, light: 40 });
    g.fillStyle = 'rgba(255,214,130,.55)';
    g.beginPath();
    g.ellipse(-rad * 0.25, -rad * 0.1, rad * 0.2, rad * 0.09, -0.3, 0, 7);
    g.fill();
  } else if (food === 'bread') {
    g.rotate((r() - 0.5) * 1.5);
    const bp = () => { g.beginPath(); g.ellipse(0, 0, rad * 0.62, rad * 0.36, 0, 0, 7); };
    body(g, bp, [196, 142, 70], [-rad * 0.62, -rad * 0.36, rad * 0.62, rad * 0.36], { lw: 1.3, ao: 1.6, rim: 1.1, light: 40, dark: 30 });
    g.strokeStyle = 'rgba(250,226,170,.9)';
    g.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(i * rad * 0.28 - rad * 0.08, -rad * 0.2);
      g.lineTo(i * rad * 0.28 + rad * 0.08, rad * 0.2);
      g.stroke();
    }
  } else if (food === 'cheese') {
    g.rotate((r() - 0.5) * 3);
    polyBody(g, [[-rad * 0.5, rad * 0.3], [rad * 0.55, rad * 0.1], [rad * 0.5, -rad * 0.3], [-rad * 0.5, -rad * 0.28]], [236, 196, 70], { lw: 1.2, ao: 1.2, rim: 0.8, light: 30 });
    g.fillStyle = 'rgba(160,110,20,.6)';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc((r() - 0.5) * rad * 0.8, (r() - 0.5) * rad * 0.4, rad * (0.04 + r() * 0.05), 0, 7);
      g.fill();
    }
  } else {
    // æbler
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.283 + r();
      const px = Math.cos(a) * rad * 0.32;
      const py = Math.sin(a) * rad * 0.32;
      g.beginPath();
      g.arc(px, py, rad * 0.26, 0, 7);
      g.fillStyle = radial(g, px, py, rad * 0.28, [[0, rgb(i % 2 ? [236, 90, 70] : [150, 190, 70])], [1, rgb(i % 2 ? [130, 24, 24] : [70, 110, 30])]], px - rad * 0.08, py - rad * 0.1, 0.5);
      g.fill();
      g.strokeStyle = 'rgba(30,10,4,.85)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.beginPath();
      g.arc(px - rad * 0.09, py - rad * 0.1, rad * 0.045, 0, 7);
      g.fill();
    }
  }
  g.restore();
}

function tableSetting(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const style = param(o, 'style', 'feast');
  const ale: RGB = [196, 128, 30];
  const n = style === 'drinks' ? 4 : 3;
  // tallerkner og mad
  const foods = ['chicken', 'bread', 'cheese', 'apples'];
  if (style !== 'drinks') {
    for (let i = 0; i < 3; i++) {
      const x = -w * 0.3 + i * w * 0.3 + (r() - 0.5) * w * 0.04;
      const y = (r() - 0.5) * h * 0.2 + (i % 2 ? h * 0.12 : -h * 0.1);
      plate(g, r, x, y, h * 0.19, style === 'leftovers' ? (i === 0 ? 'bread' : 'apples') : foods[(i + Math.floor(r() * 4)) % 4]!);
      if (style === 'leftovers') {
        g.fillStyle = 'rgba(90,50,20,.6)';
        for (let k = 0; k < 6; k++) {
          g.beginPath();
          g.arc(x + (r() - 0.5) * h * 0.2, y + (r() - 0.5) * h * 0.2, 1 + r() * 1.5, 0, 7);
          g.fill();
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const x = -w * 0.36 + (i + 0.5) * (w * 0.72 / n) + (r() - 0.5) * w * 0.05;
    const y = (r() < 0.5 ? -1 : 1) * h * (0.28 + r() * 0.08);
    tankard(g, r, x, y, h * 0.12, r() < 0.5 ? 'wood' : 'pewter', ale);
  }
  // kande
  const jx = w * 0.4;
  const jy = (r() - 0.5) * h * 0.3;
  groundShadow(g, jx + 3, jy + 4, h * 0.14, h * 0.13, 0.4);
  ellBody(g, jx, jy, h * 0.13, h * 0.13, [96, 112, 126], { lw: 1.6, ao: h * 0.03, rim: 1, light: 36 });
  ellBody(g, jx, jy, h * 0.075, h * 0.075, [40, 54, 66], { lw: 1, ao: 1.4, rim: 0.4, dark: 10 });
  const hk = () => { g.beginPath(); g.arc(jx - h * 0.12, jy, h * 0.07, 1.6, 4.7); };
  tube(g, hk, h * 0.04, [96, 112, 126], { outline: 1.3 });
  // kniv og gaffel
  if (style !== 'drinks') {
    g.save();
    g.translate(-w * 0.44, h * 0.3);
    g.rotate(-0.15);
    const kn = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.17, 0); };
    tube(g, kn, h * 0.04, [198, 198, 204], { outline: 1.2 });
    rectBody(g, -w * 0.06, -h * 0.025, w * 0.06, h * 0.05, 2, [96, 66, 38], { lw: 1, ao: 0.5, rim: 0.4 });
    g.restore();
  }
  // spildt øl og krummer
  for (let i = 0; i < 2; i++) {
    const x = (r() - 0.5) * w * 0.8;
    const y = (r() - 0.5) * h * 0.4;
    const rd = h * (0.05 + r() * 0.05);
    g.fillStyle = radial(g, x, y, rd * 1.6, [[0, 'rgba(120,70,16,.55)'], [1, 'rgba(120,70,16,0)']]);
    g.beginPath();
    g.ellipse(x, y, rd * 1.8, rd, r() * 3, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(${200 + r() * 30},${160 + r() * 30},90,.9)`;
    g.beginPath();
    g.arc((r() - 0.5) * w * 0.9, (r() - 0.5) * h * 0.7, 0.7 + r() * 0.9, 0, 7);
    g.fill();
  }
}

// ------------------------------------------------------------------ skakbræt

type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

function piece(g: G, x: number, y: number, rad: number, t: PieceType, white: boolean): void {
  const c: RGB = white ? [238, 228, 204] : [48, 36, 30];
  const edge = white ? 'rgba(50,32,14,.9)' : 'rgba(0,0,0,.95)';
  g.save();
  g.translate(x, y);
  // skygge
  g.fillStyle = 'rgba(8,4,0,.45)';
  g.beginPath();
  g.ellipse(rad * 0.35, rad * 0.5, rad * 1.1, rad * 0.9, 0.5, 0, 7);
  g.fill();
  const fill = (rad0: number): void => {
    g.fillStyle = radial(g, 0, 0, rad0 * 1.1, [[0, rgb(shift(c, white ? 8 : 52))], [0.6, rgb(c)], [1, rgb(shift(c, white ? -58 : -22))]], -rad0 * 0.3, -rad0 * 0.3, 0.3);
  };
  if (t === 'rook') {
    // firkantet krone med tinder
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.283 + 0.785;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      g.moveTo(px + rad * 0.3, py);
      g.arc(px, py, rad * 0.3, 0, 7);
    }
    fill(rad);
    g.fill();
    g.strokeStyle = edge;
    g.lineWidth = 0.9;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, rad * 0.88, 0, 7);
  } else if (t === 'queen') {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283;
      g.moveTo(Math.cos(a) * rad * 1.05 + rad * 0.2, Math.sin(a) * rad * 1.05);
      g.arc(Math.cos(a) * rad * 1.05, Math.sin(a) * rad * 1.05, rad * 0.2, 0, 7);
    }
    fill(rad);
    g.fill();
    g.strokeStyle = edge;
    g.lineWidth = 0.9;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, rad * 0.88, 0, 7);
  } else if (t === 'knight') {
    g.beginPath();
    g.moveTo(-rad * 0.8, rad * 0.3);
    g.quadraticCurveTo(-rad * 0.9, -rad * 0.8, rad * 0.1, -rad * 0.9);
    g.lineTo(rad * 1.2, -rad * 0.2);
    g.lineTo(rad * 0.9, rad * 0.2);
    g.lineTo(rad * 0.2, rad * 0.1);
    g.lineTo(rad * 0.7, rad * 0.9);
    g.lineTo(-rad * 0.6, rad * 0.9);
    g.closePath();
  } else if (t === 'bishop') {
    g.beginPath();
    g.ellipse(0, 0, rad * 0.8, rad * 1.0, 0, 0, 7);
  } else {
    g.beginPath();
    g.arc(0, 0, t === 'king' ? rad * 1.0 : rad * 0.72, 0, 7);
  }
  fill(rad);
  g.fill();
  g.strokeStyle = edge;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = white ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.25)';
  g.beginPath();
  g.ellipse(-rad * 0.28, -rad * 0.32, rad * 0.22, rad * 0.12, -0.7, 0, 7);
  g.fill();
  g.strokeStyle = white ? 'rgba(60,40,18,.7)' : 'rgba(255,240,210,.35)';
  g.lineWidth = 1;
  if (t === 'king') {
    g.beginPath();
    g.moveTo(0, -rad * 0.6);
    g.lineTo(0, rad * 0.6);
    g.moveTo(-rad * 0.5, 0);
    g.lineTo(rad * 0.5, 0);
    g.stroke();
  } else if (t === 'bishop') {
    g.beginPath();
    g.moveTo(-rad * 0.3, rad * 0.5);
    g.lineTo(rad * 0.3, -rad * 0.5);
    g.stroke();
  } else if (t === 'queen') {
    g.beginPath();
    g.arc(0, 0, rad * 0.42, 0, 7);
    g.stroke();
  } else if (t === 'rook') {
    g.beginPath();
    g.rect(-rad * 0.34, -rad * 0.34, rad * 0.68, rad * 0.68);
    g.stroke();
  } else if (t === 'knight') {
    g.beginPath();
    g.arc(rad * 0.5, -rad * 0.3, rad * 0.08, 0, 7);
    g.stroke();
  }
  g.restore();
}

function chessBoard(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const set = param(o, 'set', 'game');
  const frame: RGB = [88, 58, 32];
  const x0 = -w * 0.47;
  const y0 = -h * 0.47;
  const W = w * 0.94;
  const H = h * 0.94;
  const outer = rectPath(g, x0, y0, W, H, 3);
  castShadow(g, outer, 3, 4, 4, 0.45);
  body(g, outer, frame, [x0, y0, x0 + W, y0 + H], { lw: 2, ao: 2.4, rim: 1.4 });
  clipped(g, outer, () => woodGrain(g, r, [x0, y0, x0 + W, y0 + H], frame, { lines: 12, contrast: 1.1 }));
  const bw = W * 0.88;
  const bx = -bw / 2;
  const by = -bw / 2 * (H / W);
  const sq = bw / 8;
  const light: RGB = [214, 176, 118];
  const dark: RGB = [92, 58, 34];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const c = shift(((i + j) % 2 ? dark : light) as RGB, (r() - 0.5) * 12);
      const x = bx + i * sq;
      const y = by + j * sq;
      g.fillStyle = lin(g, x, y, x + sq, y + sq, [[0, rgb(shift(c, 10))], [1, rgb(shift(c, -10))]]);
      g.fillRect(x, y, sq, sq);
      g.strokeStyle = 'rgba(30,14,4,.25)';
      g.lineWidth = 0.5;
      g.beginPath();
      for (let k = 0; k < 2; k++) {
        const yy = y + sq * (0.3 + r() * 0.4);
        g.moveTo(x, yy);
        g.lineTo(x + sq, yy + (r() - 0.5) * 1.2);
      }
      g.stroke();
    }
  }
  g.strokeStyle = 'rgba(14,6,2,.85)';
  g.lineWidth = 1.2;
  g.strokeRect(bx, by, bw, bw);
  // indlæg på rammen
  g.strokeStyle = 'rgba(220,180,110,.6)';
  g.lineWidth = 0.8;
  g.strokeRect(x0 + 2.4, y0 + 2.4, W - 4.8, H - 4.8);
  // brikker
  const order: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  const taken = new Set<string>();
  const place = (i: number, j: number, t: PieceType, white: boolean) => {
    taken.add(`${i},${j}`);
    piece(g, bx + (i + 0.5) * sq, by + (j + 0.5) * sq, sq * 0.41, t, white);
  };
  if (set === 'start') {
    for (let i = 0; i < 8; i++) {
      place(i, 0, order[i]!, false);
      place(i, 1, 'pawn', false);
      place(i, 6, 'pawn', true);
      place(i, 7, order[i]!, true);
    }
  } else if (set !== 'empty') {
    const total = 15 + Math.floor(r() * 5);
    const types: PieceType[] = ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
    for (let n = 0; n < total; n++) {
      const i = Math.floor(r() * 8);
      const j = Math.floor(r() * 8);
      if (taken.has(`${i},${j}`)) continue;
      place(i, j, types[Math.floor(r() * types.length)]!, r() < 0.5);
    }
  }
}

// ------------------------------------------------------------------ tønde med hane

function kegTap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const tone = param(o, 'tone', 'oak');
  const wood: RGB = tone === 'dark' ? [88, 58, 34] : [150, 108, 62];
  const hoop: RGB = param(o, 'hoops', 'iron') === 'brass' ? [176, 138, 56] : [72, 72, 78];
  const bx = -w * 0.34;
  const bw = w * 0.68;
  const by = -h * 0.42;
  const bh = h * 0.6;
  // trækonsol
  for (const sx of [-1, 1]) {
    const x = sx * bw * 0.34 - w * 0.06;
    rectBody(g, x, by - h * 0.04, w * 0.12, bh + h * 0.08, 3, shift(wood, -26), { lw: 1.8, ao: 2, rim: 1 });
  }
  // tøndens krop med bugtet silhuet
  const barrel = () => {
    g.beginPath();
    g.moveTo(bx + bw * 0.02, by + bh * 0.12);
    g.quadraticCurveTo(bx + bw * 0.5, by - bh * 0.1, bx + bw * 0.98, by + bh * 0.12);
    g.lineTo(bx + bw * 0.98, by + bh * 0.88);
    g.quadraticCurveTo(bx + bw * 0.5, by + bh * 1.1, bx + bw * 0.02, by + bh * 0.88);
    g.closePath();
  };
  castShadow(g, barrel, 4, 6, 6, 0.45);
  body(g, barrel, wood, [bx, by, bx + bw, by + bh], { lw: 2.2, ao: 3, rim: 1.6, angle: 90 });
  clipped(g, barrel, () => {
    // stave
    const n = 9;
    for (let i = 0; i < n; i++) {
      const y = by + (bh * i) / n;
      g.fillStyle = rgb(shift(wood, (r() - 0.5) * 22));
      g.fillRect(bx, y, bw, bh / n + 0.5);
      g.save();
      g.beginPath();
      g.rect(bx, y, bw, bh / n);
      g.clip();
      woodGrain(g, r, [bx, y, bx + bw, y + bh / n], wood, { lines: 3, knots: r() < 0.2 ? 1 : 0 });
      g.restore();
      g.fillStyle = 'rgba(10,4,0,.5)';
      g.fillRect(bx, y + bh / n - 0.8, bw, 1.2);
      g.fillStyle = 'rgba(255,236,196,.14)';
      g.fillRect(bx, y, bw, 1);
    }
    // rund form: lys øverst, mørk nederst
    g.fillStyle = lin(g, 0, by, 0, by + bh, [[0, 'rgba(255,240,200,.3)'], [0.3, 'rgba(255,240,200,.05)'], [0.7, 'rgba(0,0,0,.1)'], [1, 'rgba(0,0,0,.52)']]);
    g.fillRect(bx, by - 4, bw, bh + 8);
    // pletter af øl
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(40,20,6,.22)';
      g.beginPath();
      g.ellipse(bx + r() * bw, by + bh * (0.3 + r() * 0.7), 3 + r() * 6, 2 + r() * 4, 0, 0, 7);
      g.fill();
    }
  });
  barrel();
  g.strokeStyle = OUT;
  g.lineWidth = 2.2;
  g.stroke();
  // bånd (hoops)
  for (const t of [0.1, 0.26, 0.74, 0.9]) {
    const x = bx + bw * t;
    const hw = bh * (1 + 0.12 * Math.sin(t * Math.PI)) * 0.98;
    const hp = rectPath(g, x - w * 0.018, by + bh / 2 - hw / 2, w * 0.036, hw, 1.5);
    body(g, hp, hoop, [x - 4, 0, x + 4, 0], { lw: 1.3, ao: 0.8, rim: 0.8, angle: 0, light: 40, dark: 30 });
    for (const yy of [by + bh * 0.2, by + bh * 0.8]) rivet(g, x, yy, 1.2, [140, 140, 146]);
  }
  // spunshul på toppen
  ellBody(g, bx + bw * 0.5, by + bh * 0.1, w * 0.04, w * 0.04, [60, 36, 18], { lw: 1.2, ao: 1, rim: 0.4 });
  ellBody(g, bx + bw * 0.5 - 0.5, by + bh * 0.1 - 0.5, w * 0.026, w * 0.026, [140, 98, 56], { lw: 0.9, ao: 0.6, rim: 0.4 });
  // hane i forenden (mod nederst), med dryp
  const tx = bx + bw * 0.5;
  const ty = by + bh * 0.96;
  const tp = () => { g.beginPath(); g.moveTo(tx, ty - 2); g.lineTo(tx, ty + h * 0.14); };
  castShadow(g, tp, 2, 3, 3, 0.0);
  tube(g, tp, w * 0.04, [176, 138, 56], { outline: 1.6 });
  ellBody(g, tx, ty, w * 0.05, w * 0.05, [176, 138, 56], { lw: 1.4, ao: 0.8, rim: 0.8, light: 44 });
  rectBody(g, tx - w * 0.07, ty + h * 0.02, w * 0.14, h * 0.025, 1.5, [176, 138, 56], { lw: 1.2, ao: 0.5, rim: 0.6, light: 40 });
  // krus under
  if (param(o, 'mug', true)) {
    const mx = tx + w * 0.0;
    const my = ty + h * 0.17;
    groundShadow(g, mx + 3, my + 4, h * 0.1, h * 0.09, 0.4);
    const hk = () => { g.beginPath(); g.arc(mx + h * 0.1, my, h * 0.05, -1.4, 1.4); };
    tube(g, hk, h * 0.025, [150, 150, 156], { outline: 1.2 });
    ellBody(g, mx, my, h * 0.09, h * 0.09, [156, 156, 162], { lw: 1.3, ao: 1.4, rim: 1, light: 34 });
    ellBody(g, mx, my, h * 0.065, h * 0.065, [200, 130, 34], { lw: 0.8, ao: 1, rim: 0, light: 20, dark: 40 });
    g.fillStyle = 'rgba(252,246,226,.9)';
    g.beginPath();
    g.arc(mx - 1, my - 1, h * 0.04, 0, 7);
    g.fill();
  }
  // pytter
  g.fillStyle = radial(g, tx + 6, ty + h * 0.2, h * 0.16, [[0, 'rgba(120,70,16,.5)'], [1, 'rgba(120,70,16,0)']]);
  g.beginPath();
  g.ellipse(tx + 6, ty + h * 0.2, h * 0.2, h * 0.07, 0, 0, 7);
  g.fill();
}

export const tavernKinds: ObjectKind[] = [
  kind({
    key: 'table_setting', family: 'tavern', name: 'Krus og tallerkner', w: 1.8, h: 1, keepAspect: false, shadow: 0, bleed: 0.04, randomRotation: false,
    params: [{ key: 'style', label: 'Dækning', type: 'select', default: 'feast', options: [{ value: 'feast', label: 'Festmåltid' }, { value: 'drinks', label: 'Kun drikke' }, { value: 'leftovers', label: 'Rester' }] }],
    draw: tableSetting,
  }),
  kind({
    key: 'chess_board', family: 'tavern', name: 'Skakbræt', w: 1.5, h: 1.5, shadow: 2, bleed: 0.06, randomRotation: false,
    params: [{ key: 'set', label: 'Stilling', type: 'select', default: 'game', options: [{ value: 'game', label: 'Midt i spillet' }, { value: 'start', label: 'Start' }, { value: 'empty', label: 'Tomt' }] }],
    draw: chessBoard,
  }),
  kind({
    key: 'keg_tap', family: 'tavern', name: 'Tønde med hane', w: 1.5, h: 1.4, keepAspect: false, shadow: 5, bleed: 0.06, randomRotation: false,
    params: [
      { key: 'tone', label: 'Træ', type: 'select', default: 'oak', options: [{ value: 'oak', label: 'Lyst egetræ' }, { value: 'dark', label: 'Mørkt' }] },
      { key: 'hoops', label: 'Bånd', type: 'select', default: 'iron', options: [{ value: 'iron', label: 'Jern' }, { value: 'brass', label: 'Messing' }] },
      { key: 'mug', label: 'Krus under hanen', type: 'toggle', default: true },
    ],
    draw: kegTap,
  }),
];

void mix;
void mottle;
void polyPath;
