import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rgb, type RGB } from '../util';
import { clamp, lerp, mixc, pebble, rf, rng, type G } from './common';

/** Broer: lange i y-retningen (som de eksisterende), set oppefra med skrå antydning af rækværk, planker og sten. Lys øverst til venstre. */

type Rnd = () => number;
const OUT = 'rgba(22,12,6,.85)';

const woodTone = (c: RGB, d: number): RGB => [c[0] + d, c[1] + d * 0.9, c[2] + d * 0.8];

/** Dæk af planker på tværs (vandrette bånd), med tone, årer, fuger og søm. */
function deck(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB, plankH: number, o: { missing?: number } = {}): { cells: number[] } {
  const n = Math.max(3, Math.round(h / plankH));
  const t = h / n;
  const miss: number[] = [];
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  for (let i = 0; i < n; i++) {
    const col = woodTone(base, (r() - 0.5) * 26);
    const py = y + i * t;
    const lg = g.createLinearGradient(x, 0, x + w, 0);
    lg.addColorStop(0, rgb(woodTone(col, 14)));
    lg.addColorStop(0.5, rgb(col));
    lg.addColorStop(1, rgb(woodTone(col, -20)));
    g.fillStyle = lg;
    g.fillRect(x + (r() - 0.5) * 1.2, py, w, t);
    // årer
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      const gy = py + t * (0.25 + r() * 0.5);
      g.moveTo(x, gy);
      g.lineTo(x + w * 0.5, gy + (r() - 0.5) * 1.2);
      g.lineTo(x + w, gy + (r() - 0.5) * 1.2);
      g.strokeStyle = `rgba(30,14,4,${0.1 + r() * 0.14})`;
      g.lineWidth = 0.6 + r() * 0.8;
      g.stroke();
    }
    // lys kant øverst, mørk fuge nederst
    g.fillStyle = 'rgba(255,238,200,.2)';
    g.fillRect(x, py, w, Math.max(0.6, t * 0.09));
    g.fillStyle = 'rgba(10,4,0,.6)';
    g.fillRect(x, py + t - Math.max(0.8, t * 0.1), w, Math.max(0.9, t * 0.12));
    // søm i begge ender
    for (const e of [0.08, 0.92]) {
      g.fillStyle = 'rgba(210,190,150,.8)';
      g.beginPath();
      g.arc(x + w * e, py + t / 2, Math.max(0.6, t * 0.1), 0, 7);
      g.fill();
    }
    if (o.missing && r() < o.missing) miss.push(i);
  }
  g.restore();
  return { cells: miss };
}

/** Stolpe set oppefra: kvadratisk top med lys kant, en smule sidefladen mod nederst til højre. */
function post(g: G, x: number, y: number, s: number, col: RGB): void {
  g.fillStyle = 'rgba(8,4,0,.42)';
  g.fillRect(x - s * 0.5 + s * 0.35, y - s * 0.5 + s * 0.5, s, s);
  const gr = g.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
  gr.addColorStop(0, rgb(woodTone(col, 34)));
  gr.addColorStop(1, rgb(woodTone(col, -26)));
  g.fillStyle = gr;
  g.fillRect(x - s / 2, y - s / 2, s, s);
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(0.8, s * 0.12);
  g.strokeRect(x - s / 2, y - s / 2, s, s);
  g.fillStyle = 'rgba(255,240,205,.3)';
  g.fillRect(x - s / 2 + s * 0.12, y - s / 2 + s * 0.12, s * 0.5, s * 0.16);
}

/** Bjælke langs y (rækværksrør eller bæredragere) med lys venstre kant. */
function beam(g: G, x: number, y0: number, y1: number, bw: number, col: RGB): void {
  g.fillStyle = 'rgba(8,4,0,.4)';
  g.fillRect(x - bw / 2 + bw * 0.5, y0 + bw * 0.4, bw, y1 - y0);
  const gr = g.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  gr.addColorStop(0, rgb(woodTone(col, 24)));
  gr.addColorStop(0.55, rgb(col));
  gr.addColorStop(1, rgb(woodTone(col, -30)));
  g.fillStyle = gr;
  g.fillRect(x - bw / 2, y0, bw, y1 - y0);
  g.strokeStyle = OUT;
  g.lineWidth = 1.1;
  g.strokeRect(x - bw / 2, y0, bw, y1 - y0);
}

const POST_WOOD: RGB = [118, 82, 48];

interface WoodCfg {
  base: RGB;
  rails: boolean;
  plankH: number;
  broken: number;
}

function woodBridge(g: G, o: DrawInput, c: WoodCfg): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const side = Math.max(5, w * 0.12);
  const deckW = w - side * 2;
  const x0 = -deckW / 2;
  const y0 = -h / 2 + h * 0.03;
  const L = h * 0.94;
  // bæredragere under dækket (ses i siderne)
  for (const sx of [-1, 1]) beam(g, sx * (deckW / 2 + side * 0.4), y0 - 2, y0 + L + 2, side * 0.9, [92, 62, 38]);
  const { cells } = deck(g, r, x0, y0, deckW, L, c.base, c.plankH, { missing: c.broken });
  // endebjælker (tværgående, lidt bredere end dækket)
  for (const e of [0, 1]) {
    const ey = e ? y0 + L - side * 0.5 : y0 - side * 0.1;
    beam(g, 0, ey, ey + side * 0.6, 0, [0, 0, 0]);
    g.fillStyle = rgb([84, 58, 36]);
    g.fillRect(-w / 2 + side * 0.2, ey, w - side * 0.4, side * 0.6);
    g.strokeStyle = OUT;
    g.lineWidth = 1;
    g.strokeRect(-w / 2 + side * 0.2, ey, w - side * 0.4, side * 0.6);
    g.fillStyle = 'rgba(255,238,200,.25)';
    g.fillRect(-w / 2 + side * 0.2, ey, w - side * 0.4, 1.2);
  }
  // huller (manglende planker)
  if (c.broken > 0) {
    const n = Math.max(3, Math.round(L / c.plankH));
    const t = L / n;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    for (const i of cells) {
      if (i === 0 || i === n - 1) continue;
      const a = r() * 0.2;
      g.beginPath();
      g.moveTo(x0 - 1, y0 + i * t);
      g.lineTo(x0 + deckW * (0.3 + a), y0 + i * t + (r() - 0.5) * 2);
      g.lineTo(x0 + deckW + 1, y0 + i * t + 1);
      g.lineTo(x0 + deckW + 1, y0 + (i + 2) * t);
      g.lineTo(x0 + deckW * (0.7 - a), y0 + (i + 2) * t + (r() - 0.5) * 2);
      g.lineTo(x0 - 1, y0 + (i + 2) * t);
      g.closePath();
      g.fill();
    }
    g.restore();
    // splinter ved hullernes kanter
    for (const i of cells) {
      if (i === 0 || i === n - 1) continue;
      for (let k = 0; k < 4; k++) {
        const sx = x0 + r() * deckW;
        g.beginPath();
        g.moveTo(sx, y0 + i * t);
        g.lineTo(sx + rf(r, -2, 2), y0 + i * t + t * rf(r, 0.15, 0.4));
        g.lineTo(sx + rf(r, 1, 3), y0 + i * t);
        g.fillStyle = 'rgba(230,200,150,.85)';
        g.fill();
        g.strokeStyle = OUT;
        g.lineWidth = 0.7;
        g.stroke();
      }
    }
    // løs planke, der hænger skråt
    g.save();
    g.translate(x0 + deckW * 0.5, y0 + L * rf(r, 0.3, 0.7));
    g.rotate(rf(r, -0.9, 0.9));
    g.fillStyle = rgb(woodTone(c.base, -12));
    g.fillRect(-deckW * 0.3, -t * 0.4, deckW * 0.6, t * 0.8);
    g.strokeStyle = OUT;
    g.strokeRect(-deckW * 0.3, -t * 0.4, deckW * 0.6, t * 0.8);
    g.restore();
  }
  if (c.rails) {
    const sp = Math.max(28, w * 0.9);
    const m = Math.max(2, Math.round(L / sp));
    for (const sx of [-1, 1]) {
      const rx = sx * (w / 2 - side * 0.45);
      beam(g, rx, y0 + 2, y0 + L - 2, side * 0.42, [128, 90, 54]);
      for (let i = 0; i <= m; i++) {
        if (c.broken && i > 0 && i < m && r() < c.broken * 0.5) continue;
        post(g, rx, y0 + 3 + (i / m) * (L - 6), side * 0.8, POST_WOOD);
      }
    }
  }
}

function ropeBridge(g: G, o: DrawInput, broken: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const sw = w * 0.42;
  const n = Math.round(h / 8);
  const sag = (t: number): number => Math.sin(t * Math.PI * 2) * w * 0.05 * 0;
  // planker i en let buet kurve; hver plank en smal bræt
  const ropeX = (t: number, s: number): number => s * sw + sag(t);
  const pts = (s: number): [number, number][] => Array.from({ length: 24 }, (_, i) => [ropeX(i / 23, s), -h / 2 + (i / 23) * h]);
  const rope = (p: [number, number][], th: number, dx = 0): void => {
    g.beginPath();
    p.forEach((q, i) => (i ? g.lineTo(q[0] + dx, q[1]) : g.moveTo(q[0] + dx, q[1])));
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
    void th;
  };
  // nedre reb (sidereb) under planker
  for (const s of [-1, 1]) {
    g.strokeStyle = 'rgba(8,4,0,.4)';
    g.lineWidth = w * 0.06;
    rope(pts(s), 0, w * 0.04);
  }
  for (let i = 0; i < n; i++) {
    if (broken && r() < 0.28 && i > 1 && i < n - 2) continue;
    const t = (i + 0.5) / n;
    const y = -h / 2 + t * h;
    const col = woodTone([140, 100, 62], (r() - 0.5) * 30);
    const pw = w * 0.74;
    g.save();
    g.translate(0, y);
    g.rotate((r() - 0.5) * 0.06);
    const gr = g.createLinearGradient(-pw / 2, 0, pw / 2, 0);
    gr.addColorStop(0, rgb(woodTone(col, 16)));
    gr.addColorStop(1, rgb(woodTone(col, -26)));
    g.fillStyle = gr;
    g.fillRect(-pw / 2, -3.2, pw, 6.4);
    g.strokeStyle = OUT;
    g.lineWidth = 1;
    g.strokeRect(-pw / 2, -3.2, pw, 6.4);
    g.fillStyle = 'rgba(255,238,200,.3)';
    g.fillRect(-pw / 2, -3, pw, 1);
    g.restore();
  }
  // rebene (hovedreb) og håndreb
  for (const s of [-1, 1]) {
    const p = pts(s);
    g.strokeStyle = 'rgba(12,6,2,.8)';
    g.lineWidth = w * 0.085;
    rope(p, 0);
    g.strokeStyle = rgb([176, 144, 92]);
    g.lineWidth = w * 0.06;
    rope(p, 0);
    g.setLineDash([2.5, 2.5]);
    g.strokeStyle = 'rgba(90,64,34,.7)';
    g.lineWidth = w * 0.06;
    rope(p, 0);
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,240,200,.3)';
    g.lineWidth = w * 0.016;
    rope(p, 0, -w * 0.016);
  }
  // lodrette reb mellem hånd- og sidereb
  for (let i = 0; i < n; i += 3) {
    const y = -h / 2 + ((i + 0.5) / n) * h;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * sw, y);
      g.lineTo(s * sw * 1.12, y - 2);
      g.strokeStyle = 'rgba(40,24,10,.7)';
      g.lineWidth = 1.2;
      g.stroke();
    }
  }
  // stolper i begge ender
  for (const e of [0, 1]) for (const s of [-1, 1]) post(g, s * sw, -h / 2 + (e ? h - 5 : 5), w * 0.22, [104, 72, 42]);
}

function stoneBridge(g: G, o: DrawInput, style: string): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const wall = w * 0.2;
  const deckW = w - wall * 2;
  const stone: RGB = style === 'old' ? [128, 126, 112] : [150, 146, 136];
  // svagt udsving i bredden: bred ved enderne, smallere i midten (buen)
  const x0 = -deckW / 2;
  g.save();
  g.beginPath();
  g.rect(-w / 2, -h / 2, w, h);
  g.clip();
  // kørebane: brosten med lys i midten (buens top) og mørkere mod enderne
  const lg = g.createLinearGradient(0, -h / 2, 0, h / 2);
  lg.addColorStop(0, rgb(mixc(stone, [30, 24, 20], 0.35)));
  lg.addColorStop(0.5, rgb(mixc(stone, [255, 250, 236], 0.12)));
  lg.addColorStop(1, rgb(mixc(stone, [30, 24, 20], 0.35)));
  g.fillStyle = lg;
  g.fillRect(x0, -h / 2, deckW, h);
  // brostensrækker
  const rows = Math.round(h / (deckW * 0.28));
  for (let i = 0; i < rows; i++) {
    const y = -h / 2 + (i / rows) * h;
    const rh = h / rows;
    let x = x0;
    let k = 0;
    while (x < x0 + deckW - 1) {
      const sw2 = Math.min(deckW * rf(r, 0.2, 0.34), x0 + deckW - x);
      const col = mixc(stone, [90, 86, 78], r() * 0.5);
      g.fillStyle = rgb(col, 0.55);
      g.fillRect(x + 0.6, y + 0.6, sw2 - 1.2, rh - 1.2);
      g.strokeStyle = 'rgba(20,14,10,.55)';
      g.lineWidth = 0.9;
      g.strokeRect(x, y, sw2, rh);
      g.fillStyle = 'rgba(255,248,230,.14)';
      g.fillRect(x + 0.6, y + 0.6, sw2 - 1.2, 1.2);
      x += sw2 + (k++ % 2 ? 0.5 : 0);
    }
  }
  // kantsten (flade), der markerer buens bredde
  g.restore();
  // brystværn: blokke langs siderne, tykkere ved enderne (landfæste)
  for (const sx of [-1, 1]) {
    const px = sx * (w / 2 - wall / 2);
    const gr = g.createLinearGradient(px - wall / 2, 0, px + wall / 2, 0);
    gr.addColorStop(0, rgb(mixc(stone, [255, 250, 236], 0.2)));
    gr.addColorStop(0.6, rgb(stone));
    gr.addColorStop(1, rgb(mixc(stone, [20, 14, 12], 0.35)));
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fillRect(px - wall / 2 + wall * 0.5, -h / 2 + wall * 0.4, wall, h);
    g.fillStyle = gr;
    g.fillRect(px - wall / 2, -h / 2, wall, h);
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.strokeRect(px - wall / 2, -h / 2, wall, h);
    const m = Math.round(h / (wall * 1.3));
    for (let i = 0; i < m; i++) {
      const y = -h / 2 + (i / m) * h;
      g.strokeStyle = 'rgba(20,12,8,.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(px - wall / 2, y);
      g.lineTo(px + wall / 2, y);
      g.stroke();
      g.fillStyle = 'rgba(255,248,226,.2)';
      g.fillRect(px - wall / 2 + 1, y + 1, wall * 0.4, 1.2);
      if (style === 'old' && r() < 0.3) pebble(g, r, px + (r() - 0.5) * wall * 0.5, y + (h / m) * 0.5, wall * 0.14, [90, 120, 60]);
    }
    // lys top på brystværnet
    g.fillStyle = 'rgba(255,248,226,.16)';
    g.fillRect(px - wall / 2, -h / 2, wall * 0.3, h);
  }
  // endepiller
  for (const e of [0, 1]) for (const sx of [-1, 1]) {
    const px = sx * (w / 2 - wall / 2);
    const py = -h / 2 + (e ? h - wall * 0.7 : wall * 0.7);
    g.fillStyle = rgb(mixc(stone, [255, 250, 236], 0.12));
    g.fillRect(px - wall * 0.62, py - wall * 0.62, wall * 1.24, wall * 1.24);
    g.strokeStyle = OUT;
    g.lineWidth = 1.5;
    g.strokeRect(px - wall * 0.62, py - wall * 0.62, wall * 1.24, wall * 1.24);
    g.fillStyle = 'rgba(255,248,226,.25)';
    g.fillRect(px - wall * 0.5, py - wall * 0.5, wall * 0.5, wall * 0.14);
  }
  if (style === 'old') {
    for (let i = 0; i < 18; i++) {
      g.fillStyle = rgb(mixc([72, 108, 44], [120, 140, 60], r()), 0.6);
      g.beginPath();
      g.ellipse(rf(r, -w / 2, w / 2), rf(r, -h / 2, h / 2), w * 0.05, w * 0.03, r() * 3, 0, 7);
      g.fill();
    }
  }
}

function plank(g: G, o: DrawInput, kindOf: 'plank' | 'log'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  if (kindOf === 'log') {
    const lw = w * 0.86;
    const lean = rf(r, -0.03, 0.03) * h;
    g.save();
    g.rotate(lean / h);
    g.fillStyle = 'rgba(8,4,0,.34)';
    g.beginPath();
    g.roundRect?.(-lw / 2 + lw * 0.1, -h / 2 + 2, lw, h - 2, lw * 0.4);
    g.fill();
    g.beginPath();
    g.roundRect?.(-lw / 2, -h / 2, lw, h, lw * 0.4);
    const gr = g.createLinearGradient(-lw / 2, 0, lw / 2, 0);
    gr.addColorStop(0, 'rgb(150,108,66)');
    gr.addColorStop(0.35, 'rgb(122,84,48)');
    gr.addColorStop(1, 'rgb(58,36,20)');
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.8;
    g.stroke();
    g.clip();
    for (let i = 0; i < 26; i++) {
      const x = rf(r, -lw / 2, lw / 2);
      g.beginPath();
      g.moveTo(x, -h / 2);
      let yy = -h / 2;
      let xx = x;
      while (yy < h / 2) {
        yy += rf(r, 8, 24);
        xx += (r() - 0.5) * 3;
        g.lineTo(xx, yy);
      }
      g.strokeStyle = r() < 0.6 ? 'rgba(30,16,6,.35)' : 'rgba(220,180,130,.18)';
      g.lineWidth = 0.8 + r() * 1.4;
      g.stroke();
    }
    // grene-stubbe og mos
    for (let i = 0; i < 4; i++) {
      const y = rf(r, -h * 0.4, h * 0.4);
      const x = rf(r, -lw * 0.3, lw * 0.3);
      g.fillStyle = 'rgba(40,22,10,.7)';
      g.beginPath();
      g.ellipse(x, y, lw * 0.08, lw * 0.06, 0, 0, 7);
      g.fill();
      g.strokeStyle = 'rgba(200,160,110,.5)';
      g.beginPath();
      g.ellipse(x, y, lw * 0.05, lw * 0.035, 0, 0, 7);
      g.stroke();
    }
    for (let i = 0; i < 20; i++) {
      g.fillStyle = rgb(mixc([70, 110, 44], [120, 144, 62], r()), 0.55);
      g.beginPath();
      g.ellipse(rf(r, -lw / 2, lw / 2), rf(r, -h / 2, h / 2), lw * 0.12, lw * 0.07, r() * 3, 0, 7);
      g.fill();
    }
    g.restore();
    return;
  }
  // smal planke: to brede brædder med søm, let skæv
  g.save();
  g.rotate(rf(r, -0.025, 0.025));
  const pw = w * 0.92;
  const col: RGB = [150, 108, 66];
  g.fillStyle = 'rgba(8,4,0,.34)';
  g.fillRect(-pw / 2 + pw * 0.1, -h / 2 + 3, pw, h - 2);
  const parts = 2;
  for (let i = 0; i < parts; i++) {
    const px = -pw / 2 + (i / parts) * pw;
    const c = woodTone(col, (r() - 0.5) * 20);
    const gr = g.createLinearGradient(px, 0, px + pw / parts, 0);
    gr.addColorStop(0, rgb(woodTone(c, 22)));
    gr.addColorStop(1, rgb(woodTone(c, -24)));
    g.fillStyle = gr;
    g.fillRect(px, -h / 2, pw / parts, h);
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.strokeRect(px, -h / 2, pw / parts, h);
    for (let k = 0; k < 5; k++) {
      const x = px + rf(r, 0.15, 0.85) * (pw / parts);
      g.beginPath();
      g.moveTo(x, -h / 2 + 2);
      g.lineTo(x + (r() - 0.5) * 2, h / 2 - 2);
      g.strokeStyle = `rgba(30,14,4,${0.12 + r() * 0.15})`;
      g.lineWidth = 0.7;
      g.stroke();
    }
  }
  for (const e of [0.04, 0.96]) {
    for (const nx of [-0.25, 0.25]) {
      g.fillStyle = 'rgba(220,200,160,.85)';
      g.beginPath();
      g.arc(nx * pw, -h / 2 + h * e, 1.4, 0, 7);
      g.fill();
    }
  }
  // tværbånd
  g.fillStyle = 'rgba(30,18,8,.5)';
  g.fillRect(-pw / 2, -h * 0.02, pw, 3);
  g.restore();
}

/** Vindebro: bræddedæk med jernbånd og kæder, sænket (flad) eller hævet (set næsten fra kanten). */
function drawbridge(g: G, o: DrawInput, raised: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const side = w * 0.1;
  const L = raised ? h * 0.62 : h * 0.92;
  const y0 = raised ? -h / 2 + h * 0.04 : -h / 2 + h * 0.04;
  const base: RGB = [112, 78, 46];
  deck(g, r, -w / 2 + side, y0, w - side * 2, L, base, raised ? 7 : 9);
  // jernbånd på tværs
  const bands = raised ? 2 : 5;
  for (let i = 0; i < bands; i++) {
    const y = y0 + ((i + 0.5) / bands) * L;
    const gr = g.createLinearGradient(0, y - 3, 0, y + 3);
    gr.addColorStop(0, 'rgb(130,128,128)');
    gr.addColorStop(1, 'rgb(46,44,48)');
    g.fillStyle = gr;
    g.fillRect(-w / 2 + side, y - 3, w - side * 2, 6);
    g.strokeStyle = OUT;
    g.lineWidth = 1;
    g.strokeRect(-w / 2 + side, y - 3, w - side * 2, 6);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(210,210,210,.7)';
      g.beginPath();
      g.arc(lerp(-w / 2 + side + 4, w / 2 - side - 4, k / 5), y, 1.2, 0, 7);
      g.fill();
    }
  }
  // sidebjælker
  for (const sx of [-1, 1]) beam(g, sx * (w / 2 - side / 2), y0 - 1, y0 + L + 1, side, [84, 58, 36]);
  // kæder
  for (const sx of [-1, 1]) {
    const cx = sx * (w / 2 - side / 2);
    const yEnd = y0 + L - 2;
    const yTop = raised ? y0 + L + h * 0.25 : y0 + L - 2;
    void yTop;
    const links = Math.round(L / 6);
    for (let i = 0; i < links; i++) {
      const y = y0 + 4 + (i / links) * (L - 6);
      g.save();
      g.translate(cx + sx * 0, y);
      g.fillStyle = 'rgba(8,4,0,.4)';
      g.fillRect(-1.3 + 1.2, -2.4 + 1.2, 2.6, 4.8);
      g.strokeStyle = i % 2 ? 'rgb(168,166,170)' : 'rgb(96,94,100)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(0, 0, i % 2 ? 1.4 : 2.2, i % 2 ? 2.7 : 1.5, 0, 0, 7);
      g.stroke();
      g.restore();
    }
    void yEnd;
  }
  // stenfæste ved kanten
  g.fillStyle = rgb([128, 124, 112]);
  g.fillRect(-w / 2, y0 - h * 0.04, w, h * 0.04);
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.strokeRect(-w / 2, y0 - h * 0.04, w, h * 0.04);
}

const damageP: ParamDef = { key: 'damage', label: 'Skade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5 };
const base = { keepAspect: false as const, bleed: 0.05, layers: ['objects' as const, 'effects' as const] };

export const bridgeKinds: ObjectKind[] = [
  kind({ key: 'bridge_wood_short', family: 'bridge', name: 'Træbro, kort', w: 1.8, h: 3, shadow: 8, ...base, tags: ['outdoor', 'village', 'forest', 'swamp'], draw: (g, o) => woodBridge(g, o, { base: [150, 108, 68], rails: true, plankH: 10, broken: 0 }) }),
  kind({ key: 'bridge_wood', family: 'bridge', name: 'Træbro', w: 2, h: 5, shadow: 8, ...base, tags: ['outdoor', 'village', 'forest', 'swamp'], draw: (g, o) => woodBridge(g, o, { base: [150, 108, 68], rails: true, plankH: 10, broken: 0 }) }),
  kind({ key: 'bridge_wood_long', family: 'bridge', name: 'Lang træbro', w: 2, h: 9, shadow: 8, ...base, tags: ['outdoor', 'village', 'forest', 'swamp'], draw: (g, o) => woodBridge(g, o, { base: [140, 100, 62], rails: true, plankH: 11, broken: 0 }) }),
  kind({ key: 'bridge_wood_wide', family: 'bridge', name: 'Bred træbro (vogn)', w: 3.6, h: 6, shadow: 8, ...base, tags: ['outdoor', 'village', 'city'], draw: (g, o) => woodBridge(g, o, { base: [156, 114, 72], rails: true, plankH: 12, broken: 0 }) }),
  kind({ key: 'bridge_wood_plain', family: 'bridge', name: 'Træbro uden rækværk', w: 1.8, h: 4, shadow: 8, ...base, tags: ['outdoor', 'forest', 'camp'], draw: (g, o) => woodBridge(g, o, { base: [136, 98, 62], rails: false, plankH: 9, broken: 0 }) }),
  kind({ key: 'bridge_wood_broken', family: 'bridge', name: 'Faldefærdig træbro', w: 2, h: 5, shadow: 8, ...base, params: [damageP], tags: ['outdoor', 'ruin', 'swamp', 'forest'], draw: (g, o) => woodBridge(g, o, { base: [112, 84, 56], rails: true, plankH: 10, broken: param(o, 'damage', 0.5) * 1.0 }) }),
  kind({ key: 'bridge_stone_arch', family: 'bridge', name: 'Stenbro (buet)', w: 2.8, h: 6, shadow: 8, ...base, tags: ['outdoor', 'village', 'city', 'rich'], draw: (g, o) => stoneBridge(g, o, 'new') }),
  kind({ key: 'bridge_stone_old', family: 'bridge', name: 'Gammel stenbro', w: 2.4, h: 5, shadow: 8, ...base, tags: ['outdoor', 'ruin', 'forest'], draw: (g, o) => stoneBridge(g, o, 'old') }),
  kind({ key: 'bridge_rope_swing', family: 'bridge', name: 'Rebbro (svajende)', w: 1.4, h: 7, shadow: 6, ...base, params: [], tags: ['outdoor', 'mountain', 'cave', 'forest'], draw: (g, o) => ropeBridge(g, o, false) }),
  kind({ key: 'bridge_rope_broken', family: 'bridge', name: 'Rebbro med manglende planker', w: 1.4, h: 7, shadow: 6, ...base, tags: ['outdoor', 'mountain', 'cave', 'ruin'], draw: (g, o) => ropeBridge(g, o, true) }),
  kind({ key: 'bridge_plank', family: 'bridge', name: 'Smal planke', w: 0.7, h: 4, shadow: 5, ...base, tags: ['outdoor', 'mountain', 'cave', 'dungeon'], draw: (g, o) => plank(g, o, 'plank') }),
  kind({ key: 'bridge_log', family: 'bridge', name: 'Væltet træ som bro', w: 0.9, h: 5, shadow: 7, ...base, sizeJitter: 0.1, tags: ['outdoor', 'forest', 'swamp'], draw: (g, o) => plank(g, o, 'log') }),
  kind({ key: 'bridge_drawbridge', family: 'bridge', name: 'Vindebro', w: 2.6, h: 3.4, shadow: 9, ...base, tags: ['outdoor', 'military', 'city'], draw: (g, o) => drawbridge(g, o, false) }),
  kind({ key: 'bridge_drawbridge_up', family: 'bridge', name: 'Vindebro, hævet', w: 2.6, h: 1.5, shadow: 9, ...base, tags: ['outdoor', 'military', 'city'], draw: (g, o) => drawbridge(g, o, true) }),
];
void clamp;
