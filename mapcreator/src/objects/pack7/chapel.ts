import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, vary } from '../pack3/common';
import { candle, dome, foldCloth, glow, openBook, steam, BRASS, WOOD_DARK } from './props';
import { pick } from './kit';

/** Kirke og tempel: bænke, prædikestol, døbefont, alter, lysestager, skriftestol og røgelse. */

const STONE: RGB = [170, 164, 152];

function pew(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // sæde (planke), ryglæn bagerst (tykkere liste foroven), knæler foran, gavle i enderne
  woodRect(g, r, -W / 2, -H * 0.12, W, H * 0.5, [128, 88, 52], { vertical: false, count: 3, rad: 2 });
  rectBody(g, -W / 2, -H / 2, W, H * 0.34, 2.5, [100, 66, 38], { lw: 1.6, ao: 1.8, rim: 1.4 });
  g.strokeStyle = 'rgba(255,220,150,.3)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-W / 2 + 3, -H / 2 + 3.5);
  g.lineTo(W / 2 - 3, -H / 2 + 3.5);
  g.stroke();
  rectBody(g, -W * 0.46, H * 0.4, W * 0.92, H * 0.1, 2, [80, 56, 36], { lw: 1.2, ao: 0.8 });
  for (const s of [-1, 1]) {
    rectBody(g, s * W * 0.5 - (s > 0 ? 5 : 0), -H / 2 - 1, 5, H + 2, 2, [86, 56, 32], { lw: 1.3, ao: 0.8, rim: 0.8 });
    dome(g, s * W * 0.5 - (s > 0 ? 2.5 : -2.5), -H / 2 + 1, 2.4, 2.4, BRASS, 0.8);
  }
  // en salmebog
  if (param(o, 'book', true) && r() < 0.8) rectBody(g, -W * 0.1, H * 0.0, 7, 5, 1, [90, 30, 36], { lw: 0.9, ao: 0.4 });
}

function pulpit(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // ottekantet platform
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283 + 0.3927;
    pts.push([Math.cos(a) * S * 0.47, Math.sin(a) * S * 0.47]);
  }
  polyBody(g, pts, [118, 80, 48], { lw: 1.8, ao: 4, rim: 2 });
  const inner: [number, number][] = pts.map(([x, y]) => [x * 0.84, y * 0.84]);
  polyBody(g, inner, [138, 98, 58], { lw: 1.2, ao: 3, rim: 1.4 });
  clipped(g, () => { g.beginPath(); inner.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }, () => {
    g.strokeStyle = 'rgba(30,14,4,.3)';
    g.lineWidth = 0.8;
    for (let i = -5; i <= 5; i++) {
      g.beginPath();
      g.moveTo(-S / 2, i * S * 0.08);
      g.lineTo(S / 2, i * S * 0.08 + (r() - 0.5) * 2);
      g.stroke();
    }
  });
  // skråt bogpult med opslået bog og en kors-ornament
  woodRect(g, r, -S * 0.26, -S * 0.2, S * 0.52, S * 0.36, [96, 66, 38], { count: 2, rad: 2 });
  openBook(g, r, 0, -S * 0.03, S * 0.4, S * 0.26, 0);
  // støbt hjørnepynt
  for (let i = 0; i < 8; i++) dome(g, pts[i]![0] * 0.9, pts[i]![1] * 0.9, 2.2, 2.2, BRASS, 0.7);
}

function font(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // sokkelfod (kvadrat) og rundt bassin med vand
  rectBody(g, -S * 0.44, -S * 0.44, S * 0.88, S * 0.88, 5, STONE, { lw: 1.8, ao: 4, rim: 2 });
  ellBody(g, 0, 0, S * 0.36, S * 0.36, shift(STONE, 14), { lw: 1.6, ao: S * 0.04, rim: 2 });
  g.beginPath();
  g.arc(0, 0, S * 0.27, 0, 7);
  g.fillStyle = radial(g, 0, 0, S * 0.27, [[0, 'rgba(176,210,230,.95)'], [1, 'rgba(90,130,160,.95)']], -S * 0.1, -S * 0.1, 1);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 0, S * 0.15, 0.3, 4);
  g.stroke();
  // hjørne-rosetter
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) dome(g, sx * S * 0.34, sy * S * 0.34, S * 0.04, S * 0.04, shift(STONE, -14), 0.9);
  clipped(g, rectPath(g, -S * 0.44, -S * 0.44, S * 0.88, S * 0.88, 5), () => mottle(g, r, [-S * 0.44, -S * 0.44, S * 0.44, S * 0.44], STONE, 18, 3, 14, 0.3));
}

function altar(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  rectBody(g, -W / 2, -H / 2, W, H, 3, STONE, { lw: 1.9, ao: 5, rim: 2 });
  clipped(g, rectPath(g, -W / 2, -H / 2, W, H, 3), () => mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], STONE, 30, 4, 14, 0.3));
  const col: RGB = pick(r, [[236, 230, 214], [140, 30, 40], [96, 40, 120]] as RGB[]);
  // alterdug med fald ned til siderne og guldbort
  const cw = W * 0.88;
  foldCloth(g, r, -cw / 2, -H * 0.3, cw, H * 0.6, col, 3, true);
  g.strokeStyle = rgb(BRASS, 0.9);
  g.lineWidth = 1.6;
  g.strokeRect(-cw / 2 + 2, -H * 0.3 + 2, cw - 4, H * 0.6 - 4);
  // lysestager, kalk og bog
  for (const s of [-1, 1]) {
    dome(g, s * W * 0.38, -H * 0.05, H * 0.1, H * 0.1, BRASS, 1);
    candle(g, s * W * 0.38, -H * 0.05, H * 0.06, param(o, 'lit', true), [240, 232, 206]);
  }
  openBook(g, r, -W * 0.13, 0, W * 0.2, H * 0.3, -0.05);
  dome(g, W * 0.1, 0, H * 0.11, H * 0.11, [226, 190, 80], 1.2);
  g.beginPath();
  g.arc(W * 0.1, 0, H * 0.07, 0, 7);
  g.fillStyle = 'rgba(110,20,40,.95)';
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath();
  g.ellipse(W * 0.1 - 2, -2, 2, 1.2, -0.6, 0, 7);
  g.fill();
  ellBody(g, W * 0.24, 0, H * 0.06, H * 0.06, [236, 230, 210], { lw: 0.9, ao: 0.4 });
  // kors-ornament (svagt)
  g.fillStyle = rgb(BRASS, 0.8);
  g.fillRect(-1.6, -H * 0.26, 3.2, H * 0.12);
  g.fillRect(-H * 0.05, -H * 0.23, H * 0.1, 3);
}

function candelabra(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const W = o.w;
  const H = o.h;
  const n = Math.round(param(o, 'arms', 7));
  const lit = param(o, 'lit', true);
  // fod
  dome(g, 0, H * 0.3, S * 0.2, S * 0.2, BRASS, 1.2);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 - Math.PI * 0.5 + (Math.PI * (n === 1 ? 0.5 : i / (n - 1)));
    const x = Math.cos(a) * W * 0.44;
    const y = Math.sin(a) * H * 0.7 + H * 0.3;
    tube(g, () => {
      g.beginPath();
      g.moveTo(0, H * 0.3);
      g.quadraticCurveTo(Math.cos(a) * W * 0.3, Math.sin(a) * H * 0.2 + H * 0.3, x, y);
    }, S * 0.06, BRASS, { outline: 1 });
    dome(g, x, y, S * 0.09, S * 0.09, shift(BRASS, 10), 0.9);
    candle(g, x, y, S * 0.065, lit, [240, 232, 206]);
  }
  dome(g, 0, H * 0.3, S * 0.1, S * 0.1, shift(BRASS, 16), 1);
  void r;
}

function votive(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // stativ med små lys i rækker
  rectBody(g, -W / 2, -H / 2, W, H, 3, [100, 70, 44], { lw: 1.6, ao: 2.4, rim: 1.4 });
  const cols = Math.max(3, Math.round(W / 16));
  const rows = Math.max(2, Math.round(H / 16));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = -W / 2 + (W * (i + 0.5)) / cols;
      const y = -H / 2 + (H * (j + 0.5)) / rows;
      ellBody(g, x, y, Math.min(W / cols, H / rows) * 0.4, Math.min(W / cols, H / rows) * 0.4, [200, 70, 70], { lw: 0.8, ao: 0.4, rim: 0.4 });
      if (r() < param(o, 'lit', 0.7)) candle(g, x, y, Math.min(W / cols, H / rows) * 0.2, true);
    }
  }
}

function confessional(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // tre kamre set oppefra: tag over midten (præst) og lavere tag over siderne (angrende)
  const dk: RGB = [82, 56, 34];
  woodRect(g, r, -W / 2, -H / 2, W, H, dk, { vertical: false, count: 5, rad: 3 });
  rectBody(g, -W * 0.18, -H / 2 + 2, W * 0.36, H - 4, 3, shift(dk, 16), { lw: 1.6, ao: 2.4, rim: 1.5 });
  clipped(g, rectPath(g, -W * 0.18, -H / 2 + 2, W * 0.36, H - 4, 3), () => {
    g.strokeStyle = 'rgba(20,10,4,.5)';
    g.lineWidth = 1;
    for (let i = 1; i < 9; i++) {
      g.beginPath();
      g.moveTo(-W * 0.18, -H / 2 + (H * i) / 9);
      g.lineTo(W * 0.18, -H / 2 + (H * i) / 9);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(0, -H / 2);
    g.lineTo(0, H / 2);
    g.stroke();
  });
  for (const s of [-1, 1]) {
    // gardin i åbningen foran (set oppefra som en farvet stribe)
    g.fillStyle = 'rgba(120,30,40,.9)';
    g.fillRect(s * W * 0.34 - W * 0.1, H / 2 - 6, W * 0.2, 5);
    dome(g, s * W * 0.44, -H * 0.4, 2.4, 2.4, BRASS, 0.7);
  }
  dome(g, 0, -H / 2 + 5, 3, 3, BRASS, 0.9);
}

function censer(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // stativ med røgelseskar og røgfane
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.283 + 0.4;
    tube(g, () => {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * S * 0.38, Math.sin(a) * S * 0.38);
    }, S * 0.06, [96, 66, 40], { outline: 1 });
  }
  dome(g, 0, 0, S * 0.22, S * 0.22, BRASS, 1.3);
  g.beginPath();
  g.arc(0, 0, S * 0.15, 0, 7);
  g.fillStyle = 'rgba(30,18,10,.9)';
  g.fill();
  glow(g, 0, 0, S * 0.3, [255, 120, 40], 0.5);
  for (let i = 0; i < 6; i++) {
    const a = r() * 6.283;
    ellBody(g, Math.cos(a) * S * 0.06, Math.sin(a) * S * 0.06, 2, 1.6, [220, 90, 30], { lw: 0.4, ao: 0 });
  }
  steam(g, r, 0, 0, S * 0.8, 6, 0.2);
}

const T = { family: 'chapel', shadow: 6 } as const;
const tags = ['temple', 'indoor', 'city', 'village'];

export const chapelKinds: ObjectKind[] = [
  kind({ ...T, key: 'chapel_pew', name: 'Kirkebænk', w: 2.4, h: 0.9, params: [{ key: 'book', label: 'Salmebog', type: 'toggle', default: true }], tags, draw: pew }),
  kind({ ...T, key: 'chapel_pew_short', name: 'Kirkebænk, kort', w: 1.4, h: 0.9, params: [{ key: 'book', label: 'Salmebog', type: 'toggle', default: true }], tags, draw: pew }),
  kind({ ...T, key: 'chapel_pulpit', name: 'Prædikestol', w: 1.4, h: 1.4, params: [], tags, draw: pulpit }),
  kind({ ...T, key: 'chapel_font', name: 'Døbefont', w: 1.2, h: 1.2, params: [], tags, draw: font }),
  kind({ ...T, key: 'chapel_altar', name: 'Alter', w: 2.6, h: 1.2, params: [{ key: 'lit', label: 'Lys tændt', type: 'toggle', default: true }], tags: [...tags, 'rich'], draw: altar }),
  kind({ ...T, key: 'chapel_candelabra', name: 'Lysestage', w: 1, h: 0.7, shadow: 4, params: [{ key: 'arms', label: 'Arme', type: 'range', min: 3, max: 9, step: 2, default: 7 }, { key: 'lit', label: 'Lys tændt', type: 'toggle', default: true }], tags, draw: candelabra }),
  kind({ ...T, key: 'chapel_votive', name: 'Lysestativ', w: 1.2, h: 0.8, params: [{ key: 'lit', label: 'Tændte', type: 'range', min: 0, max: 1, step: 0.1, default: 0.7 }], tags, draw: votive }),
  kind({ ...T, key: 'chapel_confessional', name: 'Skriftestol', w: 2.2, h: 1.4, params: [], tags, draw: confessional }),
  kind({ ...T, key: 'chapel_censer', name: 'Røgelseskar', w: 0.8, h: 0.8, shadow: 3, randomRotation: true, params: [], tags: [...tags, 'magic'], draw: censer }),
];
void polyBody;
void WOOD_DARK;
void vary;
