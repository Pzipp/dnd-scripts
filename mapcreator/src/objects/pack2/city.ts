import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blade, blobPath, body, castShadow, clipped, crack, ellBody, groundShadow, lin, mix, mossPatch, mottle, OUT, polyBody, polyPath, radial,
  rectBody, rectPath, rgb, rivet, shift, tube, wobble, woodGrain, type G, type RGB, type Rnd,
} from './helpers';

// ------------------------------------------------------------------ brosten

const COBBLE: Record<string, RGB> = { grey: [128, 126, 124], warm: [152, 128, 104], dark: [84, 84, 90] };

function cobblePatch(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const base = COBBLE[param(o, 'tone', 'grey')] ?? COBBLE.grey!;
  const wear = param(o, 'wear', 'clean');
  // omrids af pletten: uregelmæssig blob, hvor kanten opløses i enkeltsten
  const shape = wobble(r, 0, 0, w * 0.46, h * 0.46, 16, 0.07);
  const area = blobPath(g, shape);
  // jord/fuge-grund
  area();
  g.fillStyle = radial(g, 0, 0, w * 0.5, [[0, 'rgb(48,42,36)'], [0.9, 'rgb(58,50,40)'], [1, 'rgba(60,52,40,0)']]);
  g.fill();
  const rowH = Math.min(w, h) * 0.085;
  const rows = Math.ceil(h / rowH);
  const inside = (x: number, y: number): number => {
    const d = Math.hypot(x / (w * 0.47), y / (h * 0.47));
    return Math.max(0, Math.min(1, (1.08 - d) * 6));
  };
  interface Stone { x: number; y: number; w: number; h: number; rad: number; c: RGB }
  const stones: Stone[] = [];
  for (let row = 0; row < rows; row++) {
    const y = -h / 2 + (row + 0.5) * rowH + (r() - 0.5) * 1.4;
    let x = -w / 2 + (row % 2 ? rowH * 0.6 : 0);
    while (x < w / 2) {
      const sw = rowH * (0.82 + r() * 0.5);
      const cx = x + sw / 2 + (r() - 0.5) * 1.2;
      const cy = y + (r() - 0.5) * 1.6;
      x += sw + rowH * 0.1;
      const k = inside(cx, cy);
      if (k <= 0 || r() > k) continue;
      const sh = rowH * (0.82 + r() * 0.18);
      stones.push({ x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh, rad: Math.min(sw, sh) * 0.38, c: shift(base, (r() - 0.5) * 36 + (r() < 0.12 ? 14 : 0)) });
    }
  }
  const rp = (s: Stone, dx = 0, dy = 0): void => {
    const x0 = s.x + dx;
    const y0 = s.y + dy;
    g.moveTo(x0 + s.rad, y0);
    g.arcTo(x0 + s.w, y0, x0 + s.w, y0 + s.h, s.rad);
    g.arcTo(x0 + s.w, y0 + s.h, x0, y0 + s.h, s.rad);
    g.arcTo(x0, y0 + s.h, x0, y0, s.rad);
    g.arcTo(x0, y0, x0 + s.w, y0, s.rad);
    g.closePath();
  };
  // skygger (samlet), selve stenene, og kanter i bundter
  g.fillStyle = 'rgba(8,4,0,.55)';
  g.beginPath();
  for (const s of stones) rp(s, 1, 1.4);
  g.fill();
  for (const s of stones) {
    g.fillStyle = rgb(s.c);
    g.beginPath();
    rp(s);
    g.fill();
  }
  // lys/skygge fra øverst til venstre: to halvtransparente flader over alle stene
  g.fillStyle = 'rgba(255,250,235,.16)';
  g.beginPath();
  for (const s of stones) {
    g.moveTo(s.x + s.rad, s.y + 0.5);
    g.lineTo(s.x + s.w - s.rad, s.y + 0.5);
    g.lineTo(s.x + s.w - s.rad - 1, s.y + s.h * 0.35);
    g.lineTo(s.x + 1, s.y + s.h * 0.35);
    g.lineTo(s.x + 0.5, s.y + s.rad);
    g.closePath();
  }
  g.fill();
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.beginPath();
  for (const s of stones) {
    g.moveTo(s.x + s.w * 0.15, s.y + s.h * 0.72);
    g.lineTo(s.x + s.w - 0.5, s.y + s.h * 0.62);
    g.lineTo(s.x + s.w - s.rad, s.y + s.h - 0.5);
    g.lineTo(s.x + s.rad, s.y + s.h - 0.5);
    g.closePath();
  }
  g.fill();
  g.strokeStyle = 'rgba(14,8,4,.65)';
  g.lineWidth = 0.9;
  g.beginPath();
  for (const s of stones) rp(s);
  g.stroke();
  // pletter, ridser og mos
  g.fillStyle = 'rgba(20,12,6,.22)';
  g.beginPath();
  for (const s of stones) if (r() < 0.3) {
    g.moveTo(s.x + s.w * 0.6 + s.w * 0.1, s.y + s.h * 0.5);
    g.ellipse(s.x + s.w * 0.6, s.y + s.h * 0.5, s.w * 0.1, s.h * 0.07, 0, 0, 7);
  }
  g.fill();
  if (wear === 'mossy') {
    g.fillStyle = 'rgba(96,136,48,.55)';
    g.beginPath();
    for (const s of stones) if (r() < 0.3) {
      g.moveTo(s.x + s.w * 0.4 + s.w * 0.24, s.y + s.h * 0.55);
      g.ellipse(s.x + s.w * 0.4, s.y + s.h * 0.55, s.w * 0.24, s.h * 0.16, 0, 0, 7);
    }
    g.fill();
  }
  if (wear === 'mossy') {
    clipped(g, area, () => {
      for (let i = 0; i < 26; i++) {
        const a = r() * 6.28;
        const d = r() * w * 0.4;
        g.fillStyle = `rgba(${70 + r() * 40},${110 + r() * 40},40,${0.25 + r() * 0.3})`;
        g.beginPath();
        g.ellipse(Math.cos(a) * d, Math.sin(a) * d * (h / w), 1.2 + r() * 2.6, 1 + r() * 1.6, r() * 3, 0, 7);
        g.fill();
      }
    });
  }
  if (wear === 'muddy') {
    clipped(g, area, () => {
      for (let i = 0; i < 6; i++) {
        const x = (r() - 0.5) * w * 0.7;
        const y = (r() - 0.5) * h * 0.7;
        const rad = Math.min(w, h) * (0.08 + r() * 0.12);
        g.fillStyle = radial(g, x, y, rad, [[0, 'rgba(70,52,34,.85)'], [0.7, 'rgba(70,52,34,.6)'], [1, 'rgba(70,52,34,0)']]);
        g.beginPath();
        g.ellipse(x, y, rad * 1.3, rad, r() * 3, 0, 7);
        g.fill();
        g.fillStyle = 'rgba(160,190,200,.25)';
        g.beginPath();
        g.ellipse(x - rad * 0.2, y - rad * 0.25, rad * 0.5, rad * 0.14, -0.4, 0, 7);
        g.fill();
      }
    });
  }
  // gruspletter ved kanten
  for (let i = 0; i < 50; i++) {
    const a = r() * 6.28;
    const k = 0.9 + r() * 0.16;
    g.fillStyle = `rgba(${90 + r() * 40},${80 + r() * 30},${60 + r() * 20},${0.5 + r() * 0.4})`;
    g.beginPath();
    g.arc(Math.cos(a) * w * 0.47 * k, Math.sin(a) * h * 0.47 * k, 0.8 + r() * 1.6, 0, 7);
    g.fill();
  }
}

// ------------------------------------------------------------------ lygtepæl

function streetLamp(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const lit = param(o, 'lit', true);
  const warm = param(o, 'light', 'warm') === 'warm';
  const lc: RGB = warm ? [255, 200, 110] : [170, 220, 255];
  const iron: RGB = [46, 48, 54];
  // lyspøl på jorden
  if (lit) {
    g.fillStyle = radial(g, 0, 0, R * 3.2, [[0, rgb(lc, 0.55)], [0.3, rgb(lc, 0.28)], [0.7, rgb(lc, 0.08)], [1, rgb(lc, 0)]]);
    g.beginPath();
    g.arc(0, 0, R * 3.2, 0, 7);
    g.fill();
  }
  // sokkel af sten og støbejern
  const bp = polyPath(g, Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * 6.283 + 0.39) * R * 0.78, Math.sin((i / 8) * 6.283 + 0.39) * R * 0.78] as [number, number]));
  castShadow(g, bp, 3, 4, 4, 0.4);
  body(g, bp, [112, 108, 112], [-R, -R, R, R], { lw: 1.8, ao: R * 0.08, rim: 1.4 });
  clipped(g, bp, () => {
    mottle(g, r, [-R, -R, R, R], [112, 108, 112], 40, 2, 18, 0.3);
    crack(g, r, -R * 0.4, R * 0.2, R * 0.4, 0.4, 0.9);
  });
  ellBody(g, 0, 0, R * 0.55, R * 0.55, iron, { lw: 1.6, ao: R * 0.07, rim: 1.2, light: 30 });
  ellBody(g, 0, 0, R * 0.38, R * 0.38, shift(iron, 10), { lw: 1.4, ao: R * 0.05, rim: 1, light: 36 });
  // fire dekorative konsoller
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.283 + 0.785;
    const arm = () => {
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
      g.quadraticCurveTo(Math.cos(a + 0.4) * R * 0.5, Math.sin(a + 0.4) * R * 0.5, Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7);
    };
    tube(g, arm, R * 0.09, iron, { outline: 1.6 });
  }
  // lanternen: glas lyser rundt om kanten
  const lr = R * 0.5;
  const hex = (rad: number): [number, number][] => Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * 6.283 + 0.52) * rad, Math.sin((i / 6) * 6.283 + 0.52) * rad] as [number, number]);
  const glass = polyPath(g, hex(lr * 1.18));
  glass();
  g.fillStyle = lit ? radial(g, 0, 0, lr * 1.2, [[0, rgb([255, 252, 220])], [0.6, rgb(lc)], [1, rgb(shift(lc, -70))]]) : 'rgb(60,66,70)';
  g.fill();
  g.strokeStyle = 'rgba(8,4,0,.9)';
  g.lineWidth = 1.6;
  g.stroke();
  // tagfladerne: seks flader, lys fra nordvest
  const rp = hex(lr);
  for (let i = 0; i < 6; i++) {
    const a = rp[i]!;
    const b = rp[(i + 1) % 6]!;
    const mid = Math.atan2((a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    const k = Math.cos(mid - Math.PI * 1.25);
    const c = shift(iron, 16 + k * 40);
    polyPath(g, [[0, 0], a, b])();
    g.fillStyle = rgb(c);
    g.fill();
    g.strokeStyle = 'rgba(6,4,2,.85)';
    g.lineWidth = 1;
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.1 + Math.max(0, k) * 0.3})`;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(0, 0);
    g.stroke();
  }
  ellBody(g, 0, 0, R * 0.09, R * 0.09, [150, 124, 60], { lw: 1, ao: 0.4, light: 50 });
  if (lit) {
    // gnistrande kerne
    g.fillStyle = radial(g, 0, 0, lr * 1.6, [[0, rgb([255, 244, 200], 0.0)], [0.7, rgb(lc, 0.22)], [1, rgb(lc, 0)]]);
    g.beginPath();
    g.arc(0, 0, lr * 1.6, 0, 7);
    g.fill();
  }
}

// ------------------------------------------------------------------ vandpost

function handPump(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const wet = param(o, 'wet', true);
  const bucket = param(o, 'bucket', true);
  const stone: RGB = [134, 130, 124];
  const iron: RGB = [52, 78, 70]; // grønmalet støbejern
  // trug af sten
  const tx = -w * 0.1;
  const ty = -h * 0.3;
  const tw = w * 0.56;
  const th = h * 0.6;
  const tp = rectPath(g, tx, ty, tw, th, 7);
  castShadow(g, tp, 4, 5, 5, 0.45);
  body(g, tp, stone, [tx, ty, tx + tw, ty + th], { lw: 2, ao: 3, rim: 1.6 });
  clipped(g, tp, () => {
    mottle(g, r, [tx, ty, tx + tw, ty + th], stone, 60, 2.4, 20, 0.3);
    g.strokeStyle = 'rgba(10,6,2,.5)';
    g.lineWidth = 1;
    for (let i = 1; i < 9; i++) {
      const t = i / 9 + (r() - 0.5) * 0.03;
      g.beginPath();
      g.moveTo(tx + tw * t, ty);
      g.lineTo(tx + tw * t, ty + th * 0.14);
      g.moveTo(tx + tw * (1 - t), ty + th);
      g.lineTo(tx + tw * (1 - t), ty + th * 0.86);
      g.stroke();
    }
    mossPatch(g, r, tx + tw * 0.9, ty + th * 0.9, tw * 0.15, 20);
  });
  // vandspejlet
  const wp = rectPath(g, tx + tw * 0.07, ty + th * 0.15, tw * 0.86, th * 0.7, 4);
  wp();
  g.fillStyle = lin(g, tx, ty, tx + tw, ty + th, [[0, 'rgb(86,140,170)'], [0.5, 'rgb(48,92,124)'], [1, 'rgb(26,56,84)']]);
  g.fill();
  clipped(g, wp, () => {
    g.strokeStyle = 'rgba(210,236,250,.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = ty + th * (0.25 + i * 0.1);
      g.beginPath();
      for (let k = 0; k <= 12; k++) {
        const x = tx + tw * 0.08 + (k / 12) * tw * 0.84;
        const yy = y + Math.sin(k * 0.9 + i) * 1.6;
        if (k) g.lineTo(x, yy);
        else g.moveTo(x, yy);
      }
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath();
    g.ellipse(tx + tw * 0.62, ty + th * 0.3, tw * 0.18, th * 0.04, -0.2, 0, 7);
    g.fill();
    // inderside skygge
    g.save();
    g.translate(1.5, 2);
    wp();
    g.strokeStyle = 'rgba(0,10,20,.55)';
    g.lineWidth = 4;
    g.stroke();
    g.restore();
    if (wet) {
      // ringe, hvor vandet rammer
      for (let i = 1; i <= 3; i++) {
        g.strokeStyle = `rgba(230,246,255,${0.65 - i * 0.14})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(tx + tw * 0.28, ty + th * 0.5, i * 4.5, i * 3.5, 0, 0, 7);
        g.stroke();
      }
    }
  });
  wp();
  g.strokeStyle = 'rgba(10,20,30,.8)';
  g.lineWidth = 1.5;
  g.stroke();
  // pumpesokkel
  const px = -w * 0.3;
  const py = -h * 0.02;
  castShadow(g, () => { g.beginPath(); g.arc(px, py, h * 0.28, 0, 7); }, 4, 5, 5, 0.45);
  const poly = Array.from({ length: 8 }, (_, i) => [px + Math.cos((i / 8) * 6.283 + 0.39) * h * 0.28, py + Math.sin((i / 8) * 6.283 + 0.39) * h * 0.28] as [number, number]);
  polyBody(g, poly, shift(stone, -6), { lw: 1.8, ao: 2.4, rim: 1.4 });
  // tud mod truget
  const spout = () => { g.beginPath(); g.moveTo(px, py); g.lineTo(tx + tw * 0.28, ty + th * 0.5); };
  castShadow(g, spout, 3, 5, 4, 0.0);
  tube(g, spout, h * 0.1, iron);
  // håndtag (svinger op til venstre) med modvægt
  const hl = () => { g.beginPath(); g.moveTo(px + h * 0.04, py - h * 0.02); g.lineTo(px - w * 0.15, py - h * 0.3); };
  castShadow(g, hl, 3, 5, 4, 0.0);
  tube(g, hl, h * 0.06, [78, 102, 94]);
  ellBody(g, px - w * 0.15, py - h * 0.3, h * 0.07, h * 0.07, [70, 70, 76], { lw: 1.4, ao: 1, rim: 0.8, light: 40 });
  ellBody(g, px, py, h * 0.17, h * 0.17, iron, { lw: 2, ao: h * 0.04, rim: 1.4, light: 36, dark: 38 });
  ellBody(g, px, py, h * 0.11, h * 0.11, shift(iron, 14), { lw: 1.5, ao: h * 0.02, rim: 1, light: 44 });
  ellBody(g, px, py, h * 0.05, h * 0.05, [130, 130, 136], { lw: 1.2, ao: 0.6, light: 50 });
  for (let i = 0; i < 6; i++) rivet(g, px + Math.cos(i * 1.047) * h * 0.145, py + Math.sin(i * 1.047) * h * 0.145, 1.1, [120, 130, 120]);
  // vandstråle
  if (wet) {
    g.strokeStyle = 'rgba(200,230,245,.85)';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(tx + tw * 0.28 - 1, ty + th * 0.5 - 6);
    g.lineTo(tx + tw * 0.28, ty + th * 0.5);
    g.stroke();
  }
  if (bucket) {
    const bx = tx + tw * 0.62;
    const by = ty + th + h * 0.1;
    groundShadow(g, bx + 3, by + 4, h * 0.11, h * 0.1, 0.4);
    ellBody(g, bx, by, h * 0.095, h * 0.095, [112, 78, 46], { lw: 1.8, ao: 2, rim: 1.2 });
    g.strokeStyle = 'rgba(30,14,4,.4)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.283;
      g.beginPath();
      g.moveTo(bx + Math.cos(a) * h * 0.07, by + Math.sin(a) * h * 0.07);
      g.lineTo(bx + Math.cos(a) * h * 0.095, by + Math.sin(a) * h * 0.095);
      g.stroke();
    }
    ellBody(g, bx, by, h * 0.072, h * 0.072, [40, 70, 92], { lw: 1.2, ao: 2, rim: 0.4, light: 14, dark: 10 });
    g.fillStyle = 'rgba(200,230,245,.5)';
    g.beginPath();
    g.ellipse(bx - h * 0.025, by - h * 0.025, h * 0.025, h * 0.01, -0.5, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(70,70,76,.9)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(bx, by, h * 0.1, 0.4, 2.7, false);
    g.stroke();
  }
  // blade i truget og vandpytter på jorden
  if (wet) {
    g.fillStyle = 'rgba(70,100,120,.38)';
    g.beginPath();
    g.ellipse(tx + tw * 0.28, ty + th + h * 0.03, tw * 0.28, h * 0.05, 0, 0, 7);
    g.fill();
  }
}

export const cityKinds: ObjectKind[] = [
  kind({
    key: 'cobble_patch', family: 'city', name: 'Brosten', w: 2, h: 2, keepAspect: false, shadow: 0, bleed: 0.02, randomRotation: false, layers: ['objects', 'effects'],
    params: [
      { key: 'tone', label: 'Farve', type: 'select', default: 'grey', options: [{ value: 'grey', label: 'Grå' }, { value: 'warm', label: 'Varm' }, { value: 'dark', label: 'Mørk' }] },
      { key: 'wear', label: 'Stand', type: 'select', default: 'clean', options: [{ value: 'clean', label: 'Ren' }, { value: 'mossy', label: 'Mosbevokset' }, { value: 'muddy', label: 'Mudret' }] },
    ],
    draw: cobblePatch,
  }),
  kind({
    key: 'street_lamp', family: 'city', name: 'Lygtepæl', w: 0.7, h: 0.7, shadow: 8, bleed: 3.2, randomRotation: false,
    params: [{ key: 'lit', label: 'Tændt', type: 'toggle', default: true }, { key: 'light', label: 'Lys', type: 'select', default: 'warm', options: [{ value: 'warm', label: 'Varmt' }, { value: 'cold', label: 'Koldt' }] }],
    draw: streetLamp,
  }),
  kind({
    key: 'hand_pump', family: 'city', name: 'Vandpost med trug', w: 2.4, h: 1.5, keepAspect: false, shadow: 5, bleed: 0.06, randomRotation: false,
    params: [{ key: 'bucket', label: 'Spand', type: 'toggle', default: true }, { key: 'wet', label: 'Vådt', type: 'toggle', default: true }],
    draw: handPump,
  }),
];

void blade;
void mix;
void OUT;
void polyBody;
void rectBody;
void woodGrain;
void Object;
