import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, lin, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, vary, bead } from '../pack3/common';
import { board, book, candle, inkwell, openBook, scroll, dome, glow, bottle, WOOD, WOOD_DARK, PARCHMENT, BRASS, CLOTH_RED } from './props';
import { pick } from './kit';

/** Bibliotek og studerekammer: bogreoler set oppefra, pulte, skriveborde, globus og kortbord. */

const SPINES: RGB[] = [[120, 36, 36], [44, 70, 110], [48, 92, 62], [96, 64, 36], [70, 44, 84], [150, 120, 60], [60, 54, 50], [140, 90, 60], [32, 60, 70], [170, 70, 50]];

/** Bogreol set oppefra: stativets top (planke med kant), og rækken af bogryggenes toppe skimtet i hver sektion. */
function bookshelf(g: G, o: DrawInput, double: boolean): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const frame = rectPath(g, -W / 2, -H / 2, W, H, 2.5);
  body(g, frame, WOOD_DARK, [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 3 });
  clipped(g, frame, () => {
    g.fillStyle = 'rgba(10,4,0,.5)';
    g.fillRect(-W / 2, -H / 2, W, H);
  });
  const rows = double ? 2 : 1;
  const m = Math.max(3, H * 0.08);
  const secH = (H - m * 2 - (rows - 1) * m) / rows;
  const sections = Math.max(2, Math.round(W / 62));
  const sw = (W - m * 2 - (sections - 1) * m) / sections;
  const fill = param(o, 'fill', 0.85);
  for (let row = 0; row < rows; row++) {
    for (let s = 0; s < sections; s++) {
      const x = -W / 2 + m + s * (sw + m);
      const y = -H / 2 + m + row * (secH + m);
      // bagpladen i sektionen (mørk) med bogryggenes toppe
      g.fillStyle = 'rgba(14,8,4,.9)';
      g.fillRect(x, y, sw, secH);
      let cx = x + 0.5;
      const flip = double && row === 1 ? -1 : 1;
      while (cx < x + sw - 3) {
        if (r() > fill) {
          cx += 3 + r() * 6;
          continue;
        }
        const bw = Math.min(x + sw - cx - 0.5, 2.6 + r() * 3.4);
        const bh = secH * (0.62 + r() * 0.32);
        const col = vary(r, pick(r, SPINES), 16);
        const by = flip > 0 ? y + secH - bh : y;
        g.fillStyle = rgb(shift(col, -26));
        g.fillRect(cx, by, bw, bh);
        g.fillStyle = lin(g, cx, by, cx + bw, by, [[0, rgb(shift(col, 18))], [1, rgb(shift(col, -12))]]);
        g.fillRect(cx, by, bw - 0.4, bh * 0.84);
        g.fillStyle = 'rgba(255,240,200,.28)';
        g.fillRect(cx, by, 0.7, bh * 0.84);
        if (r() < 0.35) {
          g.fillStyle = rgb(BRASS, 0.8);
          g.fillRect(cx, by + bh * 0.2, bw, 0.9);
        }
        cx += bw + 0.3;
        if (r() < 0.07) cx += 4 + r() * 8; // luft i rækken
      }
      // lidt støv foran
      g.fillStyle = 'rgba(14,8,4,.2)';
      g.fillRect(x, y, sw, 2);
      g.strokeStyle = 'rgba(255,230,180,.22)';
      g.lineWidth = 0.7;
      g.strokeRect(x, y, sw, secH);
    }
  }
  // opstander mellem sektionerne med kant, og topgesims
  g.fillStyle = 'rgba(255,236,190,.28)';
  g.fillRect(-W / 2 + 1.5, -H / 2 + 1.5, W - 3, 1.2);
  for (let s = 0; s <= sections; s++) {
    const x = -W / 2 + m / 2 + s * (sw + m);
    g.fillStyle = rgb(shift(WOOD, -10), 0.9);
    g.fillRect(x - 1.5, -H / 2 + 1, 3, H - 2);
    g.fillStyle = 'rgba(255,236,190,.3)';
    g.fillRect(x - 1.5, -H / 2 + 1, 0.9, H - 2);
  }
  frame();
  g.strokeStyle = 'rgba(22,12,6,.85)';
  g.lineWidth = 1.8;
  g.stroke();
}

function bookshelfLadder(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 3);
  bookshelf(g, o, false);
  // rullestige henover reolen
  const W = o.w;
  const H = o.h;
  const x = W * (0.1 + r() * 0.3);
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(x + s * 7, -H * 0.5 - 4);
      g.lineTo(x + s * 7, H * 0.5 + 8);
    }, 3.4, [140, 98, 60], { outline: 1.2 });
  }
  for (let i = 0; i < 5; i++) {
    const y = -H * 0.38 + i * (H * 0.92 / 4);
    tube(g, () => {
      g.beginPath();
      g.moveTo(x - 7, y);
      g.lineTo(x + 7, y);
    }, 2.2, [170, 126, 78], { outline: 1 });
  }
}

function bookCorner(g: G, o: DrawInput): void {
  // hjørnereol (L-formet)
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  g.save();
  const t = Math.min(W, H) * 0.3;
  const p = () => {
    g.beginPath();
    g.moveTo(-W / 2, -H / 2);
    g.lineTo(W / 2, -H / 2);
    g.lineTo(W / 2, -H / 2 + t);
    g.lineTo(-W / 2 + t, -H / 2 + t);
    g.lineTo(-W / 2 + t, H / 2);
    g.lineTo(-W / 2, H / 2);
    g.closePath();
  };
  body(g, p, WOOD_DARK, [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 3 });
  clipped(g, p, () => {
    g.fillStyle = 'rgba(10,4,0,.55)';
    g.fillRect(-W / 2, -H / 2, W, H);
    const draw = (x0: number, y0: number, w: number, h: number, vertical: boolean) => {
      let c = vertical ? y0 : x0;
      const end = vertical ? y0 + h : x0 + w;
      while (c < end - 3) {
        const bw = 2.6 + r() * 3.4;
        const col = vary(r, pick(r, SPINES), 16);
        const bh = (vertical ? w : h) * (0.6 + r() * 0.3);
        g.fillStyle = rgb(col);
        if (vertical) g.fillRect(x0 + (w - bh), c, bh, bw);
        else g.fillRect(c, y0 + (h - bh), bw, bh);
        g.fillStyle = 'rgba(255,240,200,.25)';
        if (vertical) g.fillRect(x0 + (w - bh), c, bh, 0.7);
        else g.fillRect(c, y0 + (h - bh), 0.7, bh);
        c += bw + 0.3;
      }
    };
    draw(-W / 2 + 4, -H / 2 + 4, W - 8, t - 8, false);
    draw(-W / 2 + 4, -H / 2 + t, t - 8, H - t - 4, true);
  });
  p();
  g.strokeStyle = 'rgba(22,12,6,.85)';
  g.lineWidth = 1.8;
  g.stroke();
  g.restore();
}

function lectern(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // fod og stander set oppefra: skrå plade med lister
  woodRect(g, r, -W * 0.42, -H * 0.46, W * 0.84, H * 0.92, [126, 86, 52], { vertical: false, count: 5, rad: 3 });
  // underkant (læbe)
  rectBody(g, -W * 0.42, H * 0.3, W * 0.84, H * 0.16, 2, shift(WOOD_DARK, 10), { lw: 1.3, ao: 1 });
  const open = param(o, 'book', 'open');
  if (open === 'open') openBook(g, r, 0, -H * 0.04, W * 0.7, H * 0.5, (r() - 0.5) * 0.1);
  else if (open === 'closed') book(g, r, 0, -H * 0.04, W * 0.5, H * 0.48, (r() - 0.5) * 0.2, pick(r, SPINES));
  else scroll(g, r, 0, -H * 0.04, W * 0.7, H * 0.42, 0, true);
  // bogstøtte
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.3, H * 0.32);
    g.lineTo(W * 0.3, H * 0.32);
  }, 2.6, [190, 150, 84], { outline: 1 });
}

function desk(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [112, 74, 44], { vertical: false, count: Math.max(3, Math.round(H / 13)), nails: false, rad: 3 });
  // skrivefilt (læder)
  rectBody(g, -W * 0.3, -H * 0.38, W * 0.55, H * 0.76, 3, [58, 74, 60], { lw: 1.1, ao: 2 });
  const clutter = Math.round(param(o, 'clutter', 2));
  // papirer
  for (let i = 0; i < 2 + clutter; i++) {
    g.save();
    g.translate(-W * 0.06 + (r() - 0.5) * W * 0.24, (r() - 0.5) * H * 0.3);
    g.rotate((r() - 0.5) * 0.5);
    rectBody(g, -W * 0.1, -H * 0.2, W * 0.2, H * 0.4, 0.6, shift(PARCHMENT, (r() - 0.5) * 16), { lw: 0.8, ao: 0.6, rim: 0.2 });
    g.strokeStyle = 'rgba(40,30,20,.55)';
    g.lineWidth = 0.55;
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      g.moveTo(-W * 0.08, -H * 0.15 + k * H * 0.07);
      g.lineTo(W * 0.08 - r() * 6, -H * 0.15 + k * H * 0.07);
      g.stroke();
    }
    g.restore();
  }
  inkwell(g, W * 0.17, -H * 0.2, Math.min(H * 0.07, 4.5));
  // lys og bøger til højre
  candle(g, W * 0.4, -H * 0.28, Math.min(H * 0.08, 5), param(o, 'lit', true), [226, 214, 180]);
  for (let i = 0; i < clutter + 1; i++) book(g, r, W * 0.38, -H * 0.02 + i * H * 0.14, W * 0.16, H * 0.22, (r() - 0.5) * 0.3, pick(r, SPINES));
  // skuffe-håndtag antydet nederst
  g.fillStyle = rgb(BRASS);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(s * W * 0.18, H * 0.46, 1.6, 0, 7);
    g.fill();
  }
}

function globe(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // fod (kors af planker)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.283 + 0.5;
    tube(g, () => {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * S * 0.46, Math.sin(a) * S * 0.46);
    }, S * 0.07, [112, 74, 44], { outline: 1.3 });
  }
  // kugle
  const R = S * 0.36;
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fillStyle = radial(g, 0, 0, R * 1.1, [[0, 'rgb(120,170,196)'], [0.7, 'rgb(70,120,160)'], [1, 'rgb(30,60,92)']], -R * 0.35, -R * 0.4, 1);
  g.fill();
  clipped(g, ellipsePath(g, 0, 0, R, R), () => {
    // kontinenter
    for (let i = 0; i < 6; i++) {
      const a = r() * 6.283;
      const d = r() * R * 0.6;
      const cx = Math.cos(a) * d;
      const cy = Math.sin(a) * d;
      const pts: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const aa = (k / 10) * 6.283;
        const q = 0.5 + r() * 0.8;
        pts.push([cx + Math.cos(aa) * R * 0.26 * q, cy + Math.sin(aa) * R * 0.2 * q]);
      }
      g.beginPath();
      pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
      g.fillStyle = rgb(vary(r, [172, 150, 92], 28), 0.95);
      g.fill();
      g.strokeStyle = 'rgba(70,50,20,.5)';
      g.lineWidth = 0.7;
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,.18)';
    g.lineWidth = 0.6;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.ellipse(0, 0, Math.abs(i) < 0.1 ? R : R * (1 - Math.abs(i) * 0.22), R, 0, 0, 7);
      g.stroke();
    }
    g.fillStyle = radial(g, -R * 0.35, -R * 0.4, R * 0.8, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(-R, -R, R * 2, R * 2);
  });
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.strokeStyle = 'rgba(20,10,5,.8)';
  g.lineWidth = 1.3;
  g.stroke();
  // messingmeridian
  g.beginPath();
  g.arc(0, 0, R * 1.12, 0, 7);
  g.strokeStyle = rgb(BRASS);
  g.lineWidth = Math.max(1.8, S * 0.035);
  g.stroke();
  g.strokeStyle = 'rgba(80,50,10,.6)';
  g.lineWidth = 0.7;
  g.stroke();
  for (const a of [0.4, 3.54]) {
    g.fillStyle = rgb(BRASS);
    g.beginPath();
    g.arc(Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.12, S * 0.03, 0, 7);
    g.fill();
  }
}

function mapTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [104, 70, 42], { vertical: false, count: Math.max(4, Math.round(H / 12)), nails: true, rad: 3 });
  // kort
  const mw = W * 0.84;
  const mh = H * 0.8;
  rectBody(g, -mw / 2, -mh / 2, mw, mh, 1, [220, 200, 150], { lw: 1, ao: 2, rim: 1 });
  clipped(g, rectPath(g, -mw / 2, -mh / 2, mw, mh, 1), () => {
    mottle(g, r, [-mw / 2, -mh / 2, mw / 2, mh / 2], [200, 170, 110], 30, 8, 20, 0.35);
    // kystlinjer og floder
    g.strokeStyle = 'rgba(90,60,30,.7)';
    g.lineWidth = 1.1;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      let x = -mw / 2 + r() * mw * 0.3;
      let y = -mh * 0.3 + k * mh * 0.28;
      g.moveTo(x, y);
      for (let i = 0; i < 12; i++) {
        x += mw * 0.07;
        y += (r() - 0.5) * mh * 0.25;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = 'rgba(80,130,170,.4)';
    g.beginPath();
    g.ellipse(mw * 0.25, -mh * 0.12, mw * 0.14, mh * 0.2, 0.4, 0, 7);
    g.fill();
    // bjerge og byer
    for (let i = 0; i < 9; i++) {
      const x = (r() - 0.5) * mw * 0.8;
      const y = (r() - 0.5) * mh * 0.7;
      g.fillStyle = 'rgba(100,70,40,.7)';
      g.beginPath();
      g.moveTo(x - 4, y + 3);
      g.lineTo(x, y - 4);
      g.lineTo(x + 4, y + 3);
      g.fill();
    }
    g.strokeStyle = 'rgba(150,40,30,.65)';
    g.setLineDash([3, 3]);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-mw * 0.35, mh * 0.2);
    g.quadraticCurveTo(0, -mh * 0.2, mw * 0.3, mh * 0.1);
    g.stroke();
    g.setLineDash([]);
  });
  // brikker og lys
  for (let i = 0; i < 4; i++) {
    const x = (r() - 0.5) * mw * 0.6;
    const y = (r() - 0.5) * mh * 0.5;
    const col = pick(r, [[170, 40, 40], [40, 70, 150], [210, 180, 60], [50, 120, 60]] as RGB[]);
    ellBody(g, x, y, 4.4, 4.4, col, { lw: 1, ao: 0.8, rim: 0.4 });
    ellBody(g, x, y, 2.2, 2.2, shift(col, 22), { lw: 0.6, ao: 0.1 });
  }
  candle(g, -W * 0.46 + 6, -H * 0.4, 4.5, true);
  candle(g, W * 0.46 - 6, H * 0.38, 4.5, true);
  g.fillStyle = 'rgba(0,0,0,0)';
  void bead;
}

function bookPile(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const n = Math.round(param(o, 'count', 5));
  const S = Math.min(o.w, o.h);
  for (let i = 0; i < n; i++) {
    const rot = (r() - 0.5) * 1.4;
    book(g, r, (r() - 0.5) * S * 0.3, (r() - 0.5) * S * 0.3, S * (0.5 - i * 0.02), S * (0.38 - i * 0.015), rot, vary(r, pick(r, SPINES), 12));
  }
  if (param(o, 'scroll', false)) scroll(g, r, S * 0.18, -S * 0.2, S * 0.5, S * 0.18, 0.5);
}

function scrollRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  board(g, r, -W / 2, -H / 2, W, H, WOOD_DARK);
  const cols = Math.max(3, Math.round(W / 14));
  const rows = Math.max(2, Math.round(H / 14));
  const cw = (W - 6) / cols;
  const rh = (H - 6) / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = -W / 2 + 3 + cw * (i + 0.5);
      const y = -H / 2 + 3 + rh * (j + 0.5);
      g.fillStyle = 'rgba(8,4,0,.8)';
      g.beginPath();
      g.ellipse(x, y, cw * 0.46, rh * 0.46, 0, 0, 7);
      g.fill();
      if (r() < 0.78) {
        ellBody(g, x, y, cw * 0.36, rh * 0.36, shift(PARCHMENT, (r() - 0.5) * 24), { lw: 0.8, ao: 0.5, rim: 0.3 });
        g.strokeStyle = 'rgba(100,70,40,.6)';
        g.lineWidth = 0.6;
        g.beginPath();
        g.arc(x, y, cw * 0.16, 0, 5);
        g.stroke();
        if (r() < 0.3) {
          g.fillStyle = rgb(CLOTH_RED);
          g.beginPath();
          g.arc(x + cw * 0.12, y + rh * 0.12, 1.5, 0, 7);
          g.fill();
        }
      }
    }
  }
}

function readingTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [118, 80, 48], { vertical: false, count: Math.max(3, Math.round(H / 12)), rad: 3 });
  // opslåede bøger ved hver plads, lys i midten
  const n = Math.max(2, Math.round(W / 70));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    for (const s of [-1, 1]) {
      if (r() < 0.8) openBook(g, r, x + (r() - 0.5) * 6, s * H * 0.27, W / n * 0.5, H * 0.3, (r() - 0.5) * 0.3 + (s > 0 ? Math.PI : 0));
    }
    candle(g, x, 0, 3.8, true);
  }
}

const countParam: ParamDef = { key: 'count', label: 'Antal', type: 'range', min: 2, max: 9, step: 1, default: 5 };
const T = { family: 'study', shadow: 6 } as const;
const tags = ['indoor', 'house', 'rich', 'city', 'magic'];

export const studyKinds: ObjectKind[] = [
  kind({ ...T, key: 'study_bookshelf', name: 'Bogreol', w: 2.2, h: 0.6, params: [{ key: 'fill', label: 'Fyldt', type: 'range', min: 0.3, max: 1, step: 0.05, default: 0.85 }], tags, draw: (g, o) => bookshelf(g, o, false) }),
  kind({ ...T, key: 'study_bookshelf_long', name: 'Bogreol, lang', w: 3.6, h: 0.6, params: [{ key: 'fill', label: 'Fyldt', type: 'range', min: 0.3, max: 1, step: 0.05, default: 0.85 }], tags, draw: (g, o) => bookshelf(g, o, false) }),
  kind({ ...T, key: 'study_bookshelf_double', name: 'Bogreol, dobbelt', w: 2.4, h: 1.1, params: [{ key: 'fill', label: 'Fyldt', type: 'range', min: 0.3, max: 1, step: 0.05, default: 0.85 }], tags, draw: (g, o) => bookshelf(g, o, true) }),
  kind({ ...T, key: 'study_bookshelf_ladder', name: 'Bogreol med rullestige', w: 2.6, h: 0.7, params: [{ key: 'fill', label: 'Fyldt', type: 'range', min: 0.3, max: 1, step: 0.05, default: 0.85 }], tags, draw: bookshelfLadder }),
  kind({ ...T, key: 'study_bookshelf_corner', name: 'Hjørnereol', w: 1.6, h: 1.6, params: [], tags, draw: bookCorner }),
  kind({ ...T, key: 'study_lectern', name: 'Læsepult', w: 0.8, h: 0.9, params: [{ key: 'book', label: 'Indhold', type: 'select', default: 'open', options: [{ value: 'open', label: 'Opslået bog' }, { value: 'closed', label: 'Lukket bog' }, { value: 'scroll', label: 'Skriftrulle' }] }], tags: [...tags, 'temple'], draw: lectern }),
  kind({ ...T, key: 'study_desk', name: 'Skrivebord', w: 1.8, h: 0.9, params: [{ key: 'clutter', label: 'Rod', type: 'range', min: 0, max: 5, step: 1, default: 2 }, { key: 'lit', label: 'Lys tændt', type: 'toggle', default: true }], tags, draw: desk }),
  kind({ ...T, key: 'study_desk_large', name: 'Skrivebord, stort', w: 2.4, h: 1.1, params: [{ key: 'clutter', label: 'Rod', type: 'range', min: 0, max: 5, step: 1, default: 3 }, { key: 'lit', label: 'Lys tændt', type: 'toggle', default: true }], tags, draw: desk }),
  kind({ ...T, key: 'study_globe', name: 'Globus', w: 1, h: 1, randomRotation: true, params: [], tags, draw: globe }),
  kind({ ...T, key: 'study_map_table', name: 'Kortbord', w: 2.4, h: 1.6, params: [], tags: [...tags, 'military'], draw: mapTable }),
  kind({ ...T, key: 'study_reading_table', name: 'Læsebord med bøger', w: 3, h: 1.2, params: [], tags, draw: readingTable }),
  kind({ ...T, key: 'study_book_pile', name: 'Bunke bøger', w: 0.9, h: 0.9, shadow: 3, randomRotation: true, params: [countParam, { key: 'scroll', label: 'Skriftrulle', type: 'toggle', default: false }], tags: [...tags, 'ruin', 'dungeon'], draw: bookPile }),
  kind({ ...T, key: 'study_scroll_rack', name: 'Skriftrulle-stativ', w: 1.2, h: 0.8, params: [], tags: [...tags, 'temple'], draw: scrollRack }),
];
void dome;
void glow;
void bottle;
void polyBody;
void rectBody;
