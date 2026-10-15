import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rgb, type RGB } from '../util';
import { clamp, lerp, mixc, pebble, rf, rng, type G } from './common';

/** Tårne set skråt oppefra: murens side antydet nederst, kamme (tinder) på toppen, kegle- og pyramidetage, tårntoppe med flag, ballista og bål. */

type Rnd = () => number;
const OUT = 'rgba(22,12,6,.86)';

const STONES: Record<string, RGB> = { grey: [146, 142, 134], sand: [190, 166, 124], dark: [88, 86, 92], red: [150, 98, 80] };
const ROOFS: Record<string, RGB> = { red: [168, 66, 44], blue: [66, 96, 150], slate: [92, 98, 112], green: [64, 124, 88], purple: [100, 66, 150], brown: [124, 88, 56] };

const stoneP = (d: string): ParamDef => ({ key: 'stone', label: 'Sten', type: 'select', default: d, options: [{ value: 'grey', label: 'Grå' }, { value: 'sand', label: 'Sand' }, { value: 'dark', label: 'Mørk' }, { value: 'red', label: 'Rødlig' }] });
const roofP = (d: string): ParamDef => ({ key: 'roof', label: 'Tag', type: 'select', default: d, options: [{ value: 'red', label: 'Rødt' }, { value: 'blue', label: 'Blåt' }, { value: 'slate', label: 'Skifer' }, { value: 'green', label: 'Grønt' }, { value: 'purple', label: 'Lilla' }, { value: 'brown', label: 'Brunt' }] });
const litP: ParamDef = { key: 'lit', label: 'Tændt', type: 'toggle', default: true };

const lt = (c: RGB, d: number): RGB => [c[0] + d, c[1] + d, c[2] + d];

/** Mur-side: former skubbes ned i trin, så en lodret side opstår; lys til venstre, mørk til højre. `path` tegner formen ved forskydning dy. */
function extrude(g: G, r: Rnd, path: (dy: number) => void, H: number, w: number, h: number, base: RGB, bands?: (t: number) => RGB): void {
  const steps = Math.max(2, Math.ceil(H / 1.5));
  for (let i = steps; i >= 1; i--) {
    path((i / steps) * H);
    g.fillStyle = rgb(bands ? bands(i / steps) : mixc(base, [20, 14, 12], 0.25 + (i / steps) * 0.1));
    g.fill();
  }
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const sg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  sg.addColorStop(0, 'rgba(255,240,210,.3)');
  sg.addColorStop(0.4, 'rgba(255,240,210,0)');
  sg.addColorStop(0.65, 'rgba(8,4,12,.12)');
  sg.addColorStop(1, 'rgba(8,4,12,.58)');
  g.fillStyle = sg;
  g.fillRect(-w / 2, -h / 2, w, h);
  // stenskifter i siden
  const rows = Math.max(2, Math.round(H / 7));
  for (let i = 1; i < rows; i++) {
    g.fillStyle = 'rgba(14,8,6,.28)';
    g.fillRect(-w / 2, -h / 2 + (h - H) + (i / rows) * H * 0.9, w, 1);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(14,8,6,.22)';
    g.fillRect(rf(r, -w / 2, w / 2), rf(r, -h / 2, h / 2), 1, rf(r, 3, 7));
  }
  g.restore();
}

/** Mursten som bue-stumper og fuger på en cirkelring set ovenfra. */
function ringBlocks(g: G, r: Rnd, rad0: number, rad1: number, cx: number, cy: number): void {
  const rows = Math.max(1, Math.round((rad1 - rad0) / 7));
  for (let k = 0; k < rows; k++) {
    const rr = lerp(rad0, rad1, (k + 0.5) / rows);
    const cnt = Math.max(8, Math.round((rr * 6.283) / 12));
    const off = k % 2 ? 0.5 : 0;
    for (let i = 0; i < cnt; i++) {
      const a = ((i + off) / cnt) * 6.283;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (rr - 3.2), cy + Math.sin(a) * (rr - 3.2));
      g.lineTo(cx + Math.cos(a) * (rr + 3.2), cy + Math.sin(a) * (rr + 3.2));
      g.strokeStyle = 'rgba(20,12,8,.3)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  }
}

function merlons(g: G, r: Rnd, cx: number, cy: number, R: number, wallT: number, n: number, stone: RGB, broken = 0): void {
  const arc = ((Math.PI * 2 * R) / n) * 0.58;
  for (let i = 0; i < n; i++) {
    if (broken && r() < broken) continue;
    const a = (i / n) * Math.PI * 2 + 0.1;
    g.save();
    g.translate(cx + Math.cos(a) * (R - wallT * 0.5), cy + Math.sin(a) * (R - wallT * 0.5));
    g.rotate(a);
    // sidefladen (nederst til højre) og toppen
    g.fillStyle = 'rgba(10,6,4,.5)';
    g.fillRect(-wallT * 0.5 + 1.4, -arc / 2 + 2.4, wallT, arc);
    const lit = clamp(-Math.cos(a - Math.PI * 1.25) * 0, -1, 1);
    void lit;
    const gr = g.createLinearGradient(-wallT / 2, -arc / 2, wallT / 2, arc / 2);
    gr.addColorStop(0, rgb(lt(stone, 36)));
    gr.addColorStop(1, rgb(lt(stone, -26)));
    g.fillStyle = gr;
    g.fillRect(-wallT / 2, -arc / 2, wallT, arc);
    g.strokeStyle = OUT;
    g.lineWidth = 1.1;
    g.strokeRect(-wallT / 2, -arc / 2, wallT, arc);
    g.restore();
  }
}

/** Tårnets fod og topring (rund). Returnerer indre radius. */
function roundBody(g: G, r: Rnd, o: DrawInput, stone: RGB, opts: { crenel: boolean; roofless: boolean; broken?: number }): { cx: number; cy: number; R: number; inner: number } {
  const { w, h } = o;
  const R = Math.min(w / 2, (h * 0.88) / 2) * 0.97;
  const H = h - 2 * R - 2;
  const cx = 0;
  const cy = -h / 2 + R + 1;
  const wallT = R * 0.24;
  const disc = (dy: number): void => {
    g.beginPath();
    g.arc(cx, cy + dy, R, 0, Math.PI * 2);
  };
  extrude(g, r, disc, H, w, h, stone);
  // topring
  disc(0);
  const gr = g.createLinearGradient(-R, cy - R, R, cy + R);
  gr.addColorStop(0, rgb(lt(stone, 34)));
  gr.addColorStop(1, rgb(lt(stone, -22)));
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.stroke();
  g.save();
  disc(0);
  g.clip();
  ringBlocks(g, r, R - wallT, R, cx, cy);
  g.restore();
  // indre gulv
  const inner = R - wallT;
  if (opts.roofless) {
    g.beginPath();
    g.arc(cx, cy, inner, 0, Math.PI * 2);
    const fg = g.createRadialGradient(cx - inner * 0.3, cy - inner * 0.3, 2, cx, cy, inner);
    fg.addColorStop(0, rgb(mixc(stone, [90, 70, 50], 0.35)));
    fg.addColorStop(1, rgb(mixc(stone, [40, 28, 20], 0.55)));
    g.fillStyle = fg;
    g.fill();
    g.save();
    g.clip();
    // skygge fra muren mod øverst til venstre
    g.beginPath();
    g.arc(cx, cy, inner, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(8,4,2,.5)';
    g.lineWidth = wallT * 0.9;
    g.translate(wallT * 0.28, wallT * 0.38);
    g.stroke();
    g.restore();
    g.beginPath();
    g.arc(cx, cy, inner, 0, Math.PI * 2);
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
  }
  if (opts.crenel) merlons(g, r, cx, cy, R, wallT, Math.max(8, Math.round((Math.PI * 2 * R) / (wallT * 2.2))), stone, opts.broken ?? 0);
  return { cx, cy, R, inner };
}

/** Kegletag set skråt oppefra: facetter med lys mod øverst til venstre og skygge mod nederst til højre. */
function coneRoof(g: G, r: Rnd, cx: number, cy: number, Rr: number, rise: number, roof: RGB, facets: number, opts: { stars?: boolean } = {}): [number, number] {
  const apex: [number, number] = [cx, cy - rise];
  for (let i = 0; i < facets; i++) {
    const a0 = (i / facets) * Math.PI * 2;
    const a1 = ((i + 1) / facets) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    // lys: facetter, der peger mod øverst til venstre (-135 grader)
    const l = Math.cos(am - Math.PI * 1.25);
    const col = mixc(roof, l > 0 ? [255, 244, 220] : [10, 6, 16], Math.abs(l) * (l > 0 ? 0.34 : 0.5));
    g.beginPath();
    g.moveTo(apex[0], apex[1]);
    g.lineTo(cx + Math.cos(a0) * Rr, cy + Math.sin(a0) * Rr);
    g.lineTo(cx + Math.cos(a1) * Rr, cy + Math.sin(a1) * Rr);
    g.closePath();
    g.fillStyle = rgb(col);
    g.fill();
    g.strokeStyle = `rgba(14,8,10,${0.35 + 0.15 * (i % 2)})`;
    g.lineWidth = 0.9;
    g.stroke();
  }
  // tagsten/spån i rækker
  g.save();
  g.beginPath();
  g.arc(cx, cy, Rr, 0, Math.PI * 2);
  g.clip();
  for (let k = 1; k <= 4; k++) {
    const t = k / 5;
    g.beginPath();
    g.ellipse(lerp(apex[0], cx, t), lerp(apex[1], cy, t), Rr * t, Rr * t, 0, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(14,8,10,.26)';
    g.lineWidth = 1.2;
    g.stroke();
  }
  if (opts.stars) {
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * Rr * 0.85;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d - rise * 0.3 * (1 - d / Rr);
      g.fillStyle = `rgba(255,236,150,${0.55 + r() * 0.4})`;
      g.beginPath();
      g.arc(x, y, 0.8 + r() * 1.6, 0, 7);
      g.fill();
    }
  }
  g.restore();
  // krans (tagudhæng): en mørk kant langs bunden
  g.beginPath();
  g.arc(cx, cy, Rr, 0, Math.PI * 2);
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.arc(cx - 1, cy - 1, Rr - 1, Math.PI * 0.9, Math.PI * 1.7);
  g.strokeStyle = 'rgba(255,244,220,.35)';
  g.lineWidth = 1.5;
  g.stroke();
  return apex;
}

function flag(g: G, r: Rnd, x: number, y: number, len: number, col: RGB, wave = 1): void {
  // stang og vimpel mod nederst til højre (vind fra nordvest)
  g.strokeStyle = 'rgba(10,6,4,.4)';
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(x + 1.5, y + 1.5);
  g.lineTo(x + 1.5, y - len + 1.5);
  g.stroke();
  g.strokeStyle = 'rgb(90,62,36)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - len);
  g.stroke();
  g.fillStyle = 'rgb(214,178,90)';
  g.beginPath();
  g.arc(x, y - len, 2, 0, 7);
  g.fill();
  const fw = len * 0.85;
  const fh = len * 0.34;
  g.beginPath();
  g.moveTo(x, y - len + 2);
  g.bezierCurveTo(x + fw * 0.3, y - len + 2 - fh * 0.2 * wave, x + fw * 0.6, y - len + 2 + fh * 0.5 * wave, x + fw, y - len + 2 + fh * 0.25);
  g.lineTo(x + fw * 0.86, y - len + 2 + fh * 0.62);
  g.bezierCurveTo(x + fw * 0.6, y - len + 2 + fh * 1.05 * wave, x + fw * 0.3, y - len + 2 + fh * 0.62, x, y - len + 2 + fh);
  g.closePath();
  const fg = g.createLinearGradient(x, y - len, x + fw, y - len + fh);
  fg.addColorStop(0, rgb(lt(col, 26)));
  fg.addColorStop(1, rgb(lt(col, -34)));
  g.fillStyle = fg;
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1;
  g.stroke();
  void r;
}

function roundTower(g: G, o: DrawInput, mode: 'watch' | 'cone' | 'wizard' | 'ruin' | 'light'): void {
  const r = rng(o.seed);
  const stone = STONES[param(o, 'stone', 'grey')] ?? STONES.grey!;
  const roofCol = ROOFS[param(o, 'roof', mode === 'wizard' ? 'purple' : 'red')] ?? ROOFS.red!;
  const { w, h } = o;
  if (mode === 'watch') {
    const b = roundBody(g, r, o, stone, { crenel: true, roofless: true });
    // lem i gulvet og lille bænk
    g.fillStyle = 'rgba(10,6,4,.5)';
    g.fillRect(b.cx - b.inner * 0.28 + 2, b.cy - b.inner * 0.28 + 2, b.inner * 0.56, b.inner * 0.56);
    const hg = g.createLinearGradient(b.cx - b.inner * 0.28, b.cy, b.cx + b.inner * 0.28, b.cy);
    hg.addColorStop(0, 'rgb(150,108,66)');
    hg.addColorStop(1, 'rgb(96,66,40)');
    g.fillStyle = hg;
    g.fillRect(b.cx - b.inner * 0.28, b.cy - b.inner * 0.28, b.inner * 0.56, b.inner * 0.56);
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    g.strokeRect(b.cx - b.inner * 0.28, b.cy - b.inner * 0.28, b.inner * 0.56, b.inner * 0.56);
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(b.cx - b.inner * 0.28, b.cy - b.inner * 0.28 + (i / 4) * b.inner * 0.56);
      g.lineTo(b.cx + b.inner * 0.28, b.cy - b.inner * 0.28 + (i / 4) * b.inner * 0.56);
      g.strokeStyle = 'rgba(20,10,4,.5)';
      g.stroke();
    }
    g.fillStyle = 'rgb(60,60,64)';
    g.beginPath();
    g.arc(b.cx + b.inner * 0.2, b.cy + b.inner * 0.2, 2.2, 0, 7);
    g.fill();
    return;
  }
  if (mode === 'ruin') {
    const b = roundBody(g, r, o, stone, { crenel: true, roofless: true, broken: 0.5 });
    // brudte sektioner: hug "bidder" ud af ringen og siden
    g.save();
    g.globalCompositeOperation = 'destination-out';
    const bites = 2 + Math.floor(r() * 2);
    for (let i = 0; i < bites; i++) {
      const a = r() * 6.283;
      const span = rf(r, 0.35, 0.7);
      g.beginPath();
      g.moveTo(b.cx + Math.cos(a) * b.R * 1.4, b.cy + Math.sin(a) * b.R * 1.4);
      let prev = a - span / 2;
      g.lineTo(b.cx + Math.cos(prev) * b.R * 1.3, b.cy + Math.sin(prev) * b.R * 1.3);
      for (let k = 0; k < 5; k++) {
        const aa = lerp(a - span / 2, a + span / 2, k / 4);
        const d = b.R * rf(r, 0.62, 0.95);
        g.lineTo(b.cx + Math.cos(aa) * d, b.cy + Math.sin(aa) * d);
        prev = aa;
      }
      g.lineTo(b.cx + Math.cos(a + span / 2) * b.R * 1.3, b.cy + Math.sin(a + span / 2) * b.R * 1.3);
      g.closePath();
      g.fill();
    }
    g.restore();
    // murbrokker, mos og revner
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.283;
      const d = b.R * rf(r, 0.2, 1.1);
      pebble(g, r, b.cx + Math.cos(a) * d, b.cy + Math.sin(a) * d, b.R * rf(r, 0.04, 0.1), lt(stone, (r() - 0.5) * 30));
    }
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.283;
      const d = b.R * rf(r, 0.4, 1);
      g.fillStyle = rgb(mixc([72, 108, 44], [120, 144, 62], r()), 0.55);
      g.beginPath();
      g.ellipse(b.cx + Math.cos(a) * d, b.cy + Math.sin(a) * d, b.R * rf(r, 0.04, 0.1), b.R * rf(r, 0.03, 0.07), r() * 3, 0, 7);
      g.fill();
    }
    return;
  }
  if (mode === 'light') {
    // fyrtårn: rød-hvide bånd i siden, galleri og lanterne
    const R = Math.min(w / 2, (h * 0.8) / 2) * 0.97;
    const H = h - 2 * R - 2;
    const cy = -h / 2 + R + 1;
    const disc = (dy: number): void => {
      g.beginPath();
      g.arc(0, cy + dy, R, 0, Math.PI * 2);
    };
    extrude(g, r, disc, H, w, h, [236, 232, 222], (t) => (Math.floor(t * 6) % 2 ? [186, 52, 44] : [238, 234, 224]));
    disc(0);
    const tg = g.createLinearGradient(-R, cy - R, R, cy + R);
    tg.addColorStop(0, 'rgb(250,246,238)');
    tg.addColorStop(1, 'rgb(190,186,180)');
    g.fillStyle = tg;
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 2;
    g.stroke();
    // galleri med rækværk
    g.beginPath();
    g.arc(0, cy, R * 0.78, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(30,24,24,.85)';
    g.lineWidth = 2.4;
    g.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.283;
      g.fillStyle = 'rgb(60,56,60)';
      g.beginPath();
      g.arc(Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78, 1.5, 0, 7);
      g.fill();
    }
    // lanterne
    const lit = param(o, 'lit', true);
    const lr = R * 0.5;
    g.beginPath();
    g.arc(0, cy, lr, 0, Math.PI * 2);
    const lg = g.createRadialGradient(-lr * 0.3, cy - lr * 0.3, 1, 0, cy, lr);
    lg.addColorStop(0, lit ? 'rgb(255,248,190)' : 'rgb(190,214,222)');
    lg.addColorStop(1, lit ? 'rgb(255,170,40)' : 'rgb(96,122,138)');
    g.fillStyle = lg;
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283;
      g.beginPath();
      g.moveTo(0, cy);
      g.lineTo(Math.cos(a) * lr, cy + Math.sin(a) * lr);
      g.strokeStyle = 'rgba(40,30,26,.8)';
      g.lineWidth = 1.4;
      g.stroke();
    }
    g.beginPath();
    g.arc(0, cy, lr * 0.22, 0, Math.PI * 2);
    g.fillStyle = 'rgb(60,56,60)';
    g.fill();
    if (lit) {
      const gl = g.createRadialGradient(0, cy, lr * 0.5, 0, cy, R * 1.25);
      gl.addColorStop(0, 'rgba(255,214,110,.35)');
      gl.addColorStop(1, 'rgba(255,214,110,0)');
      g.fillStyle = gl;
      g.fillRect(-R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
    }
    return;
  }
  // kegletårn (slot eller troldmand): plads foroven til flagstangen eller krystallen
  const wiz = mode === 'wizard';
  const R = Math.min(w / 2, (h * (wiz ? 0.62 : 0.56)) / 2) * 0.97;
  const pad = R * (wiz ? 0.3 : 0.72);
  const cy = -h / 2 + R + pad;
  const H = h / 2 - cy - R * (wiz ? 0.86 : 0.92);
  const disc = (dy: number): void => {
    g.beginPath();
    g.arc(0, cy + dy, R * (wiz ? 0.86 : 0.92), 0, Math.PI * 2);
  };
  extrude(g, r, disc, H, w, h, stone);
  // lille vindue-skygge i siden
  g.fillStyle = 'rgba(10,6,12,.8)';
  for (const wx of [-0.45, 0.1, 0.55]) {
    g.beginPath();
    g.ellipse(wx * R, cy + H * 0.62, R * 0.05, R * 0.09, 0, 0, 7);
    g.fill();
  }
  const apex = coneRoof(g, r, 0, cy, R * (wiz ? 0.97 : 1.04), R * (wiz ? 0.95 : 0.7), roofCol, mode === 'wizard' ? 20 : 16, { stars: mode === 'wizard' });
  if (mode === 'wizard') {
    // lysende krystal på toppen og en måne på taget
    const lit = param(o, 'lit', true);
    const gl = g.createRadialGradient(apex[0], apex[1], 0, apex[0], apex[1], R * 0.45);
    gl.addColorStop(0, lit ? 'rgba(170,230,255,.8)' : 'rgba(170,230,255,.2)');
    gl.addColorStop(1, 'rgba(170,230,255,0)');
    g.fillStyle = gl;
    g.fillRect(apex[0] - R * 0.5, apex[1] - R * 0.5, R, R);
    g.beginPath();
    g.moveTo(apex[0], apex[1] - R * 0.18);
    g.lineTo(apex[0] + R * 0.07, apex[1]);
    g.lineTo(apex[0], apex[1] + R * 0.08);
    g.lineTo(apex[0] - R * 0.07, apex[1]);
    g.closePath();
    g.fillStyle = 'rgb(180,236,255)';
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1;
    g.stroke();
  } else {
    flag(g, r, apex[0], apex[1], R * 0.7, mixc(roofCol, [220, 190, 80], 0.5));
  }
}

/** Firkantet tårn: mur, kamme og evt. pyramidetag. */
function squareTower(g: G, o: DrawInput, roof: boolean, ruin: boolean): void {
  const r = rng(o.seed);
  const stone = STONES[param(o, 'stone', 'grey')] ?? STONES.grey!;
  const roofCol = ROOFS[param(o, 'roof', 'slate')] ?? ROOFS.slate!;
  const { w, h } = o;
  const S = roof ? Math.min(w * 0.86, h * 0.62) : Math.min(w, h * 0.86);
  const y0 = roof ? -h / 2 + S * 0.34 : -h / 2 + 1;
  const H = h / 2 - y0 - S - 1;
  const x0 = -S / 2;
  const rect = (dy: number): void => {
    g.beginPath();
    g.rect(x0, y0 + dy, S, S);
  };
  extrude(g, r, rect, H, w, h, stone);
  rect(0);
  const gr = g.createLinearGradient(x0, y0, x0 + S, y0 + S);
  gr.addColorStop(0, rgb(lt(stone, 34)));
  gr.addColorStop(1, rgb(lt(stone, -22)));
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.stroke();
  const wallT = S * 0.18;
  if (!roof) {
    // gulv
    g.fillStyle = rgb(mixc(stone, [50, 36, 28], 0.5));
    g.fillRect(x0 + wallT, y0 + wallT, S - wallT * 2, S - wallT * 2);
    g.fillStyle = 'rgba(8,4,2,.45)';
    g.fillRect(x0 + wallT, y0 + wallT, S - wallT * 2, wallT * 0.5);
    g.fillRect(x0 + wallT, y0 + wallT, wallT * 0.35, S - wallT * 2);
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.strokeRect(x0 + wallT, y0 + wallT, S - wallT * 2, S - wallT * 2);
    for (let i = 1; i < 5; i++) {
      g.beginPath();
      g.moveTo(x0 + wallT, y0 + wallT + (i / 5) * (S - wallT * 2));
      g.lineTo(x0 + S - wallT, y0 + wallT + (i / 5) * (S - wallT * 2));
      g.strokeStyle = 'rgba(14,8,6,.3)';
      g.stroke();
    }
    // kamme (tinder) rundt langs kanten
    const per = Math.max(3, Math.round(S / (wallT * 2.2)));
    const mw = (S / per) * 0.55;
    const miss = ruin ? 0.5 : 0;
    const drawM = (x: number, y: number, ww: number, hh: number): void => {
      g.fillStyle = 'rgba(10,6,4,.5)';
      g.fillRect(x + 1.4, y + 2.4, ww, hh);
      const mg = g.createLinearGradient(x, y, x + ww, y + hh);
      mg.addColorStop(0, rgb(lt(stone, 36)));
      mg.addColorStop(1, rgb(lt(stone, -26)));
      g.fillStyle = mg;
      g.fillRect(x, y, ww, hh);
      g.strokeStyle = OUT;
      g.lineWidth = 1.1;
      g.strokeRect(x, y, ww, hh);
    };
    for (let i = 0; i < per; i++) {
      const c = x0 + ((i + 0.5) / per) * S;
      if (r() >= miss) drawM(c - mw / 2, y0, mw, wallT);
      if (r() >= miss) drawM(c - mw / 2, y0 + S - wallT, mw, wallT);
      const cy = y0 + ((i + 0.5) / per) * S;
      if (i > 0 && i < per - 1) {
        if (r() >= miss) drawM(x0, cy - mw / 2, wallT, mw);
        if (r() >= miss) drawM(x0 + S - wallT, cy - mw / 2, wallT, mw);
      }
    }
    // hjørnetårne
    for (const [cx2, cy2] of [[x0, y0], [x0 + S - wallT * 1.2, y0], [x0, y0 + S - wallT * 1.2], [x0 + S - wallT * 1.2, y0 + S - wallT * 1.2]] as const) {
      if (!ruin || r() > 0.3) drawM(cx2, cy2, wallT * 1.2, wallT * 1.2);
    }
    if (ruin) {
      for (let i = 0; i < 14; i++) pebble(g, r, rf(r, x0, x0 + S), rf(r, y0, y0 + S + H), S * rf(r, 0.02, 0.05), lt(stone, (r() - 0.5) * 30));
      for (let i = 0; i < 22; i++) {
        g.fillStyle = rgb(mixc([72, 108, 44], [120, 144, 62], r()), 0.55);
        g.beginPath();
        g.ellipse(rf(r, x0, x0 + S), rf(r, y0, y0 + S), S * rf(r, 0.03, 0.08), S * rf(r, 0.02, 0.05), r() * 3, 0, 7);
        g.fill();
      }
    }
    return;
  }
  // pyramidetag
  const cx = 0;
  const cy = y0 + S / 2;
  const apex: [number, number] = [cx, cy - S * 0.4];
  const eave = S * 0.54;
  const corners: [number, number][] = [[cx - eave, cy - eave], [cx + eave, cy - eave], [cx + eave, cy + eave], [cx - eave, cy + eave]];
  for (let i = 0; i < 4; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % 4]!;
    const l = [1, -0.5, -1, 0.7][i]!; // top (let lys), højre (skygge), bund (skygge), venstre (lys)
    g.beginPath();
    g.moveTo(apex[0], apex[1]);
    g.lineTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.closePath();
    g.fillStyle = rgb(mixc(roofCol, l > 0 ? [255, 244, 220] : [10, 6, 16], Math.abs(l) * (l > 0 ? 0.3 : 0.42)));
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
    g.save();
    g.clip();
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      g.beginPath();
      g.moveTo(lerp(apex[0], a[0], t), lerp(apex[1], a[1], t));
      g.lineTo(lerp(apex[0], b[0], t), lerp(apex[1], b[1], t));
      g.strokeStyle = 'rgba(14,8,10,.28)';
      g.lineWidth = 1;
      g.stroke();
    }
    g.restore();
  }
  flag(g, r, apex[0], apex[1], S * 0.4, mixc(roofCol, [220, 190, 80], 0.5));
}

/** Tårntop: kammet platform med noget på (flag, ballista, bål). */
function towerTop(g: G, o: DrawInput, what: 'flag' | 'ballista' | 'fire'): void {
  const r = rng(o.seed);
  const stone = STONES[param(o, 'stone', 'grey')] ?? STONES.grey!;
  const { w, h } = o;
  const R = Math.min(w, h) / 2 * 0.9;
  const cx = 0;
  const cy = 0;
  const wallT = R * 0.22;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  const rg = g.createLinearGradient(-R, -R, R, R);
  rg.addColorStop(0, rgb(lt(stone, 34)));
  rg.addColorStop(1, rgb(lt(stone, -22)));
  g.fillStyle = rg;
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.stroke();
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  ringBlocks(g, r, R - wallT, R, cx, cy);
  g.restore();
  const inner = R - wallT;
  g.beginPath();
  g.arc(cx, cy, inner, 0, Math.PI * 2);
  const fg = g.createRadialGradient(-inner * 0.3, -inner * 0.3, 2, 0, 0, inner);
  fg.addColorStop(0, rgb(mixc(stone, [110, 86, 60], 0.4)));
  fg.addColorStop(1, rgb(mixc(stone, [40, 28, 20], 0.5)));
  g.fillStyle = fg;
  g.fill();
  g.save();
  g.clip();
  g.beginPath();
  g.arc(cx, cy, inner, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(8,4,2,.5)';
  g.lineWidth = wallT * 0.9;
  g.translate(wallT * 0.28, wallT * 0.38);
  g.stroke();
  // fliser/brædder
  for (let i = -5; i <= 5; i++) {
    g.beginPath();
    g.moveTo(-inner, (i / 5) * inner * 0.9);
    g.lineTo(inner, (i / 5) * inner * 0.9);
    g.strokeStyle = 'rgba(14,8,6,.2)';
    g.lineWidth = 1;
    g.stroke();
  }
  g.restore();
  g.beginPath();
  g.arc(cx, cy, inner, 0, Math.PI * 2);
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  merlons(g, r, cx, cy, R, wallT, Math.max(8, Math.round((Math.PI * 2 * R) / (wallT * 2.2))), stone);
  if (what === 'flag') {
    g.fillStyle = 'rgba(10,6,4,.5)';
    g.beginPath();
    g.ellipse(2, 3, inner * 0.18, inner * 0.14, 0, 0, 7);
    g.fill();
    g.fillStyle = rgb([96, 72, 48]);
    g.beginPath();
    g.ellipse(0, 0, inner * 0.16, inner * 0.12, 0, 0, 7);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    g.stroke();
    flag(g, r, 0, 0, inner * 1.5, [176, 52, 44]);
  } else if (what === 'ballista') {
    const a = ((param(o, 'dir', 315) as number) * Math.PI) / 180;
    g.save();
    g.rotate(a + Math.PI / 2 - Math.PI / 2);
    const L = inner * 1.3;
    // fod/drejeskive
    g.fillStyle = 'rgba(10,6,4,.45)';
    g.beginPath();
    g.arc(2, 3, inner * 0.3, 0, 7);
    g.fill();
    g.fillStyle = rgb([104, 78, 50]);
    g.beginPath();
    g.arc(0, 0, inner * 0.3, 0, 7);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.stroke();
    // skinne (langs retningen) og buearme
    const rail = (x0: number, x1: number, th: number, col: RGB): void => {
      g.fillStyle = 'rgba(10,6,4,.4)';
      g.fillRect(x0 + 1.5, -th / 2 + 2, x1 - x0, th);
      const gr = g.createLinearGradient(0, -th / 2, 0, th / 2);
      gr.addColorStop(0, rgb(lt(col, 24)));
      gr.addColorStop(1, rgb(lt(col, -26)));
      g.fillStyle = gr;
      g.fillRect(x0, -th / 2, x1 - x0, th);
      g.strokeStyle = OUT;
      g.lineWidth = 1.1;
      g.strokeRect(x0, -th / 2, x1 - x0, th);
    };
    rail(-L * 0.38, L * 0.46, inner * 0.14, [132, 94, 56]);
    // buearme
    for (const sy of [-1, 1]) {
      g.beginPath();
      g.moveTo(L * 0.2, 0);
      g.quadraticCurveTo(L * 0.2 - 4, sy * inner * 0.4, L * 0.1, sy * inner * 0.78);
      g.strokeStyle = OUT;
      g.lineWidth = inner * 0.12 + 2;
      g.lineCap = 'round';
      g.stroke();
      g.strokeStyle = 'rgb(122,84,48)';
      g.lineWidth = inner * 0.12;
      g.stroke();
    }
    // streng
    g.beginPath();
    g.moveTo(L * 0.1, -inner * 0.78);
    g.lineTo(-L * 0.12, 0);
    g.lineTo(L * 0.1, inner * 0.78);
    g.strokeStyle = 'rgba(230,220,190,.9)';
    g.lineWidth = 1.2;
    g.stroke();
    // bolt
    g.beginPath();
    g.moveTo(-L * 0.12, 0);
    g.lineTo(L * 0.5, 0);
    g.strokeStyle = 'rgb(70,56,40)';
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.moveTo(L * 0.5, 0);
    g.lineTo(L * 0.42, -3);
    g.lineTo(L * 0.42, 3);
    g.closePath();
    g.fillStyle = 'rgb(170,170,176)';
    g.fill();
    g.restore();
    // tønde med bolte ved siden af
    const bx = -inner * 0.55;
    const by = inner * 0.5;
    g.fillStyle = 'rgba(10,6,4,.45)';
    g.beginPath();
    g.arc(bx + 1.5, by + 2.2, inner * 0.2, 0, 7);
    g.fill();
    g.fillStyle = 'rgb(122,84,48)';
    g.beginPath();
    g.arc(bx, by, inner * 0.2, 0, 7);
    g.fill();
    g.strokeStyle = OUT;
    g.stroke();
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(bx - 4 + k * 2.5, by - 2);
      g.lineTo(bx - 4 + k * 2.5, by + 3);
      g.strokeStyle = 'rgb(60,46,30)';
      g.lineWidth = 1.2;
      g.stroke();
    }
  } else {
    const lit = param(o, 'lit', true);
    const br = inner * 0.34;
    if (lit) {
      const gl = g.createRadialGradient(0, 0, br * 0.5, 0, 0, inner * 1.2);
      gl.addColorStop(0, 'rgba(255,170,60,.4)');
      gl.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = gl;
      g.fillRect(-inner * 1.3, -inner * 1.3, inner * 2.6, inner * 2.6);
    }
    // jernkurv med brænde
    g.fillStyle = 'rgba(10,6,4,.45)';
    g.beginPath();
    g.arc(2, 3, br, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(0, 0, br, 0, 7);
    const bg = g.createLinearGradient(-br, -br, br, br);
    bg.addColorStop(0, 'rgb(130,126,130)');
    bg.addColorStop(1, 'rgb(40,38,42)');
    g.fillStyle = bg;
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = r() * 6.28;
      g.save();
      g.translate(Math.cos(a) * br * 0.3, Math.sin(a) * br * 0.3);
      g.rotate(a);
      g.fillStyle = lit ? 'rgb(70,28,14)' : 'rgb(60,40,28)';
      g.fillRect(-br * 0.5, -2, br, 4);
      g.restore();
    }
    if (lit) {
      for (let i = 0; i < 6; i++) {
        const a = r() * 6.28;
        const d = r() * br * 0.5;
        const fr = br * rf(r, 0.35, 0.6);
        const fg2 = g.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, fr);
        fg2.addColorStop(0, 'rgba(255,240,150,.95)');
        fg2.addColorStop(0.5, 'rgba(255,130,30,.8)');
        fg2.addColorStop(1, 'rgba(200,40,10,0)');
        g.fillStyle = fg2;
        g.beginPath();
        g.arc(Math.cos(a) * d, Math.sin(a) * d, fr, 0, 7);
        g.fill();
      }
    }
  }
}

const base = { keepAspect: true as const, bleed: 0.04, layers: ['objects' as const, 'effects' as const] };
const T = ['outdoor', 'military', 'city'];

export const towerKinds: ObjectKind[] = [
  kind({ key: 'tower_watch', family: 'tower', name: 'Vagttårn (rundt, åbent)', w: 3, h: 3.5, shadow: 22, ...base, params: [stoneP('grey')], tags: [...T, 'village'], draw: (g, o) => roundTower(g, o, 'watch') }),
  kind({ key: 'tower_castle', family: 'tower', name: 'Slottårn (kegletag)', w: 4, h: 5.2, shadow: 26, ...base, params: [stoneP('grey'), roofP('red')], tags: [...T, 'rich'], draw: (g, o) => roundTower(g, o, 'cone') }),
  kind({ key: 'tower_wizard', family: 'tower', name: 'Troldmandstårn', w: 3.6, h: 5.4, shadow: 26, ...base, params: [stoneP('sand'), roofP('purple'), litP], tags: ['outdoor', 'magic', 'rich'], draw: (g, o) => roundTower(g, o, 'wizard') }),
  kind({ key: 'tower_ruin', family: 'tower', name: 'Ruintårn (rundt)', w: 3.6, h: 4, shadow: 18, ...base, sizeJitter: 0.1, params: [stoneP('grey')], tags: ['outdoor', 'ruin', 'forest'], draw: (g, o) => roundTower(g, o, 'ruin') }),
  kind({ key: 'tower_lighthouse', family: 'tower', name: 'Fyrtårn', w: 3.6, h: 5.6, shadow: 26, ...base, params: [litP], tags: ['outdoor', 'harbor', 'water'], draw: (g, o) => roundTower(g, o, 'light') }),
  kind({ key: 'tower_square', family: 'tower', name: 'Firkantet tårn (åbent)', w: 4, h: 5, shadow: 24, ...base, params: [stoneP('grey')], tags: [...T], draw: (g, o) => squareTower(g, o, false, false) }),
  kind({ key: 'tower_square_roof', family: 'tower', name: 'Firkantet tårn (tag)', w: 4, h: 5.6, shadow: 26, ...base, params: [stoneP('grey'), roofP('slate')], tags: [...T, 'village', 'rich'], draw: (g, o) => squareTower(g, o, true, false) }),
  kind({ key: 'tower_square_ruin', family: 'tower', name: 'Firkantet ruintårn', w: 4, h: 4.8, shadow: 18, ...base, sizeJitter: 0.1, params: [stoneP('grey')], tags: ['outdoor', 'ruin', 'forest'], draw: (g, o) => squareTower(g, o, false, true) }),
  kind({ key: 'tower_top_flag', family: 'tower', name: 'Tårntop med flagstang', w: 3, h: 3.6, shadow: 14, ...base, params: [stoneP('grey')], tags: [...T], draw: (g, o) => towerTop(g, o, 'flag') }),
  kind({ key: 'tower_top_ballista', family: 'tower', name: 'Tårntop med ballista', w: 3.2, h: 3.2, shadow: 14, ...base, params: [stoneP('grey'), { key: 'dir', label: 'Retning', type: 'range', min: 0, max: 360, step: 15, default: 315 }], tags: [...T, 'battlefield'], draw: (g, o) => towerTop(g, o, 'ballista') }),
  kind({ key: 'tower_top_fire', family: 'tower', name: 'Tårntop med bål', w: 3, h: 3, shadow: 14, ...base, params: [stoneP('grey'), litP], tags: [...T], draw: (g, o) => towerTop(g, o, 'fire') }),
];
