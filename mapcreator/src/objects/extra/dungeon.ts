import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { blob, mix, rgb, rng, roundRect, shift, smooth, softDot, type RGB } from '../util';
import { blobP, contact, ellP, OUT, paint, polyP, rectP, sphere, speckle } from './helpers';

type G = CanvasRenderingContext2D;
const GROUND: ('ground' | 'objects' | 'effects')[] = ['ground', 'objects', 'effects'];

const TONE: Record<string, RGB> = { stone: [140, 138, 132], marble: [214, 212, 206], bronze: [110, 140, 118] };
const toneParam = [{ key: 'tone', label: 'Materiale', type: 'select' as const, default: 'stone', options: [{ value: 'stone', label: 'Sten' }, { value: 'marble', label: 'Marmor' }, { value: 'bronze', label: 'Bronze' }] }];

// ---------------------------------------------------------------- sarkofag og alter

function coffinPts(w: number, h: number, k = 1): [number, number][] {
  return ([[-0.31, -0.5], [0.31, -0.5], [0.48, -0.3], [0.48, 0.1], [0.33, 0.5], [-0.33, 0.5], [-0.48, 0.1], [-0.48, -0.3]] as [number, number][]).map(([x, y]) => [x * w * k, y * h * k]);
}

function effigy(g: G, w: number, h: number): void {
  g.save();
  g.lineCap = 'round';
  const draw = (dx: number, dy: number, col: string) => {
    g.save();
    g.translate(dx, dy);
    g.strokeStyle = col;
    g.fillStyle = col;
    g.lineWidth = Math.max(1, w * 0.035);
    g.beginPath();
    g.ellipse(0, -h * 0.31, w * 0.1, w * 0.11, 0, 0, 6.28);
    g.stroke();
    // arme over kors
    g.beginPath();
    g.moveTo(-w * 0.2, -h * 0.17);
    g.lineTo(w * 0.04, -h * 0.07);
    g.moveTo(w * 0.2, -h * 0.17);
    g.lineTo(-w * 0.04, -h * 0.07);
    g.stroke();
    // krop
    g.beginPath();
    g.moveTo(-w * 0.23, -h * 0.22);
    g.lineTo(-w * 0.2, h * 0.3);
    g.lineTo(-w * 0.12, h * 0.4);
    g.moveTo(w * 0.23, -h * 0.22);
    g.lineTo(w * 0.2, h * 0.3);
    g.lineTo(w * 0.12, h * 0.4);
    g.moveTo(-w * 0.1, -h * 0.2);
    g.lineTo(w * 0.1, -h * 0.2);
    g.stroke();
    g.restore();
  };
  draw(0.8, 0.9, 'rgba(255,250,235,.35)');
  draw(0, 0, 'rgba(30,26,22,.55)');
  g.restore();
}

function sarcophagus(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const lid = param(o, 'lid', 'closed');
  const body = shift([142, 138, 130], 0);
  const pts = coffinPts(w, h);
  const drawLid = () => {
    contact(g, w * 0.04, h * 0.03, w * 0.55, h * 0.5, 0.25);
    polyP(g, pts, body, { lw: Math.max(2, w * 0.045), bevel: w * 0.04, light: 26, dark: 30 });
    polyP(g, coffinPts(w, h, 0.8), shift(body, 8), { lw: Math.max(1, w * 0.02), bevel: w * 0.02, outline: 'rgba(20,10,5,.5)' });
    g.save();
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.clip();
    speckle(g, r, [-w / 2, -h / 2, w / 2, h / 2], 60, body, 0.5, 1.3);
    g.restore();
    effigy(g, w, h);
  };
  if (lid === 'closed') {
    drawLid();
    return;
  }
  // åben kiste: mørkt indre med knogler
  polyP(g, pts, shift(body, -10), { lw: Math.max(2, w * 0.045), bevel: w * 0.03 });
  const inner = coffinPts(w, h, 0.84);
  paint(g, () => {
    g.beginPath();
    inner.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
  }, [20, 16, 14], [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.5, bevel: 0, light: 0, dark: 0 });
  g.save();
  g.beginPath();
  inner.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.clip();
  const ig = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  ig.addColorStop(0, 'rgba(0,0,0,.7)');
  ig.addColorStop(1, 'rgba(60,50,40,.2)');
  g.fillStyle = ig;
  g.fillRect(-w / 2, -h / 2, w, h);
  // skelet
  g.strokeStyle = 'rgb(214,206,184)';
  g.fillStyle = 'rgb(214,206,184)';
  g.lineWidth = Math.max(1, w * 0.04);
  g.lineCap = 'round';
  sphere(g, 0, -h * 0.33, w * 0.1, [216, 208, 188], 0.8);
  for (let i = 0; i < 4; i++) {
    const y = -h * 0.2 + i * h * 0.055;
    g.beginPath();
    g.moveTo(-w * 0.17, y + 3);
    g.quadraticCurveTo(0, y - 3, w * 0.17, y + 3);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, -h * 0.24);
  g.lineTo(0, h * 0.05);
  g.moveTo(-w * 0.14, h * 0.08);
  g.lineTo(-w * 0.18, h * 0.42);
  g.moveTo(w * 0.14, h * 0.08);
  g.lineTo(w * 0.18, h * 0.42);
  g.stroke();
  g.restore();
  if (lid === 'ajar') {
    g.save();
    g.translate(w * 0.3, h * 0.08);
    g.rotate(0.2);
    drawLid();
    g.restore();
  }
}

function altar(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const cover = param(o, 'cover', 'bare');
  const candles = param(o, 'candles', true);
  rectP(g, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, 3, [104, 100, 96], { lw: 2, bevel: 2 });
  g.save();
  g.beginPath();
  g.rect(-w * 0.49, -h * 0.49, w * 0.98, h * 0.98);
  g.clip();
  speckle(g, r, [-w / 2, -h / 2, w / 2, h / 2], 50, [100, 96, 92], 0.5, 1.4);
  g.restore();
  contact(g, w * 0.03, h * 0.03, w * 0.42, h * 0.32, 0.3);
  const sx = -w * 0.4, sy = -h * 0.3, sw = w * 0.8, sh = h * 0.6;
  rectP(g, sx, sy, sw, sh, 3, [160, 156, 148], { lw: 2, bevel: 2, light: 24 });
  g.save();
  g.beginPath();
  g.rect(sx, sy, sw, sh);
  g.clip();
  speckle(g, r, [sx, sy, sx + sw, sy + sh], 60, [154, 150, 142], 0.5, 1.3);
  g.restore();
  if (cover === 'cloth') {
    const cw = sw * 0.46;
    g.save();
    roundRect(g, -cw / 2, sy - h * 0.06, cw, sh + h * 0.12, 3);
    g.fillStyle = 'rgb(130,28,40)';
    g.fill();
    g.clip();
    const gr = g.createLinearGradient(-cw / 2, 0, cw / 2, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.18)');
    gr.addColorStop(1, 'rgba(0,0,0,.3)');
    g.fillStyle = gr;
    g.fillRect(-cw / 2, sy - h * 0.06, cw, sh + h * 0.12);
    g.strokeStyle = 'rgba(0,0,0,.25)';
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(-cw / 2 + cw * (0.2 + 0.2 * i), sy);
      g.quadraticCurveTo(-cw / 2 + cw * (0.25 + 0.2 * i), 0, -cw / 2 + cw * (0.2 + 0.2 * i), sy + sh);
      g.stroke();
    }
    g.restore();
    g.fillStyle = 'rgb(214,170,70)';
    g.fillRect(-cw / 2, sy - h * 0.06, cw, 2);
    g.fillRect(-cw / 2, sy + sh + h * 0.06 - 2, cw, 2);
    roundRect(g, -cw / 2, sy - h * 0.06, cw, sh + h * 0.12, 3);
    g.strokeStyle = OUT;
    g.lineWidth = 1.5;
    g.stroke();
    sphere(g, 0, 0, w * 0.045, [214, 172, 70], 1);
  } else if (cover === 'blood') {
    smooth(g, blob(sw * 0.28, sh * 0.34, 0.2, 12, r, 0, 0));
    g.fillStyle = 'rgba(110,12,16,.9)';
    g.fill();
    g.strokeStyle = 'rgba(70,6,8,.9)';
    g.lineWidth = 1.2;
    g.stroke();
    for (const dx of [-0.12, 0.05, 0.2]) {
      g.beginPath();
      g.moveTo(sw * dx, sh * 0.15);
      g.lineTo(sw * dx + (r() - 0.5) * 6, sy + sh + h * 0.12);
      g.lineWidth = 2.2;
      g.strokeStyle = 'rgba(100,10,14,.85)';
      g.stroke();
    }
    softDot(g, -sw * 0.08, -sh * 0.1, sw * 0.08, [255, 140, 130], 0.3);
  }
  if (candles) {
    for (const x of [-w * 0.34, w * 0.34]) {
      softDot(g, x, 0, w * 0.2, [255, 200, 110], 0.45);
      sphere(g, x, 0, w * 0.038, [236, 226, 196], 0.9);
      softDot(g, x, 0, w * 0.04, [255, 250, 190], 1);
    }
  }
}

const tombKinds: ObjectKind[] = [
  kind({
    key: 'sarcophagus', family: 'tomb', name: 'Sarkofag', w: 1.4, h: 2.6, shadow: 8, bleed: 0.3,
    params: [{ key: 'lid', label: 'Låg', type: 'select', default: 'closed', options: [{ value: 'closed', label: 'Lukket' }, { value: 'ajar', label: 'Skubbet til side' }, { value: 'open', label: 'Åben' }] }],
    draw: sarcophagus,
  }),
  kind({
    key: 'altar', family: 'tomb', name: 'Alter', w: 2, h: 1.4, shadow: 8, bleed: 0.2,
    params: [
      { key: 'cover', label: 'Dække', type: 'select', default: 'bare', options: [{ value: 'bare', label: 'Bar sten' }, { value: 'cloth', label: 'Rød dug' }, { value: 'blood', label: 'Blodplettet' }] },
      { key: 'candles', label: 'Lys', type: 'toggle', default: true },
    ],
    draw: altar,
  }),
];

// ---------------------------------------------------------------- magiske cirkler

const MAGIC: Record<string, RGB> = { purple: [176, 96, 255], red: [255, 74, 64], blue: [96, 176, 255], green: [96, 255, 150], gold: [255, 206, 90] };
const magicParams = (def: string): ParamDef[] => [
  { key: 'color', label: 'Farve', type: 'select', default: def, options: [{ value: 'purple', label: 'Lilla' }, { value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }, { value: 'green', label: 'Grøn' }, { value: 'gold', label: 'Guld' }] },
  { key: 'glow', label: 'Lysende', type: 'toggle', default: true },
];

/** Tegner stien med glød (bred, svag streg) og kerne. Uden glød: kridt/indlagt metal. */
function glowStroke(g: G, o: DrawInput, path: () => void, width: number): void {
  const col = MAGIC[param(o, 'color', 'purple')] ?? MAGIC.purple!;
  const glow = param(o, 'glow', true);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (glow) {
    for (const [k, a] of [[5, 0.12], [2.8, 0.25]] as const) {
      path();
      g.strokeStyle = rgb(col, a);
      g.lineWidth = width * k;
      g.stroke();
    }
    path();
    g.strokeStyle = rgb(mix(col, [255, 255, 255], 0.35), 0.95);
    g.lineWidth = width;
    g.stroke();
  } else {
    path();
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.lineWidth = width * 1.5;
    g.stroke();
    path();
    g.strokeStyle = 'rgba(236,230,214,.92)';
    g.lineWidth = width;
    g.stroke();
  }
}

function glyph(g: G, o: DrawInput, x: number, y: number, s: number, ang: number, r: () => number): void {
  const pts: [number, number][] = [];
  const n = 3 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) pts.push([(r() - 0.5) * s, (r() - 0.5) * s]);
  glowStroke(g, o, () => {
    g.beginPath();
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.moveTo(0, -s * 0.5);
    g.lineTo(0, s * 0.5);
    for (const p of pts) {
      g.moveTo(0, p[1]);
      g.lineTo(p[0], p[1] + (r() - 0.5) * s * 0.4);
    }
    g.restore();
  }, Math.max(1, s * 0.12));
}

function star(cx: number, cy: number, R: number, n: number, step: number, rot: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (((i * step) % n) / n) * 6.28;
    pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  return pts;
}

function circleSummon(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = (Math.min(o.w, o.h) / 2) * 0.94;
  const col = MAGIC[param(o, 'color', 'purple')] ?? MAGIC.purple!;
  const lw = Math.max(1.8, R * 0.03);
  if (param(o, 'glow', true)) softDot(g, 0, 0, R * 1.05, col, 0.18);
  const circle = (rad: number) => () => {
    g.beginPath();
    g.arc(0, 0, rad, 0, 6.28);
  };
  glowStroke(g, o, circle(R), lw * 1.3);
  glowStroke(g, o, circle(R * 0.9), lw);
  glowStroke(g, o, circle(R * 0.62), lw);
  const rot = r() * 6.28;
  const st = star(0, 0, R * 0.9, 5, 2, rot);
  glowStroke(g, o, () => {
    g.beginPath();
    st.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
  }, lw * 1.2);
  for (const p of st) glowStroke(g, o, () => { g.beginPath(); g.arc(p[0], p[1], R * 0.07, 0, 6.28); }, lw);
  // runer mellem ringene
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * 6.28;
    glyph(g, o, Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, R * 0.085, a + 1.57, r);
  }
  glowStroke(g, o, circle(R * 0.2), lw);
  glyph(g, o, 0, 0, R * 0.2, rot, r);
}

function circleArcane(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = (Math.min(o.w, o.h) / 2) * 0.94;
  const col = MAGIC[param(o, 'color', 'blue')] ?? MAGIC.blue!;
  const lw = Math.max(1.8, R * 0.028);
  if (param(o, 'glow', true)) softDot(g, 0, 0, R * 1.05, col, 0.15);
  const circle = (rad: number, dash?: number[]) => () => {
    g.beginPath();
    g.setLineDash(dash ?? []);
    g.arc(0, 0, rad, 0, 6.28);
  };
  glowStroke(g, o, circle(R), lw * 1.4);
  glowStroke(g, o, circle(R * 0.93), lw * 0.8);
  glowStroke(g, o, circle(R * 0.78, [R * 0.03, R * 0.05]), lw * 1.1);
  g.setLineDash([]);
  glowStroke(g, o, circle(R * 0.55), lw);
  const rot = r() * 6.28;
  for (const [n, step, rad] of [[8, 3, 0.78], [8, 1, 0.55]] as const) {
    const st = star(0, 0, R * rad, n, step, rot);
    glowStroke(g, o, () => {
      g.beginPath();
      st.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
    }, lw);
  }
  for (let i = 0; i < 8; i++) {
    const a = rot + (i / 8) * 6.28;
    glowStroke(g, o, () => {
      g.beginPath();
      g.arc(Math.cos(a) * R * 0.855, Math.sin(a) * R * 0.855, R * 0.065, 0, 6.28);
    }, lw);
    glyph(g, o, Math.cos(a) * R * 0.855, Math.sin(a) * R * 0.855, R * 0.07, a, r);
    glowStroke(g, o, () => {
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
      g.lineTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55);
    }, lw * 0.7);
  }
  // øje i midten
  glowStroke(g, o, () => {
    g.beginPath();
    g.moveTo(-R * 0.2, 0);
    g.quadraticCurveTo(0, -R * 0.2, R * 0.2, 0);
    g.quadraticCurveTo(0, R * 0.2, -R * 0.2, 0);
  }, lw);
  glowStroke(g, o, () => { g.beginPath(); g.arc(0, 0, R * 0.07, 0, 6.28); }, lw * 1.4);
}

const magicKinds: ObjectKind[] = [
  kind({ key: 'circle_summon', family: 'magic', name: 'Manings-cirkel', w: 3, h: 3, randomRotation: true, shadow: 0, bleed: 0.25, layers: GROUND, params: magicParams('purple'), draw: circleSummon }),
  kind({
    key: 'circle_arcane', family: 'magic', name: 'Arkan cirkel', w: 3, h: 3, randomRotation: true, shadow: 0, bleed: 0.25, layers: GROUND,
    params: magicParams('blue'),
    draw: circleArcane,
  }),
];

// ---------------------------------------------------------------- fælder og huller

function tile(g: G, w: number, h: number, base: RGB, r: () => number): void {
  rectP(g, -w * 0.48, -h * 0.48, w * 0.96, h * 0.96, w * 0.03, base, { lw: Math.max(1.5, w * 0.03), bevel: w * 0.025 });
  g.save();
  g.beginPath();
  g.rect(-w * 0.48, -h * 0.48, w * 0.96, h * 0.96);
  g.clip();
  speckle(g, r, [-w / 2, -h / 2, w / 2, h / 2], 50, base, 0.5, 1.3);
  g.restore();
}

function spikeTrap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const state = param(o, 'state', 'armed');
  tile(g, w, h, [118, 114, 108], r);
  const n = 5;
  const step = (w * 0.76) / (n - 1);
  const rad = w * 0.045;
  for (let iy = 0; iy < n; iy++) {
    for (let ix = 0; ix < n; ix++) {
      const x = -w * 0.38 + ix * step, y = -h * 0.38 + iy * step;
      if (state === 'retracted') {
        sphere(g, x, y, rad * 0.8, [20, 16, 14], 0.8);
      } else {
        g.beginPath();
        g.arc(x, y, rad * 1.1, 0, 6.28);
        g.fillStyle = 'rgba(0,0,0,.45)';
        g.fill();
        const gr = g.createRadialGradient(x - rad * 0.4, y - rad * 0.4, 0, x, y, rad * 1.05);
        gr.addColorStop(0, 'rgb(244,246,250)');
        gr.addColorStop(0.35, 'rgb(170,176,188)');
        gr.addColorStop(1, 'rgb(70,74,84)');
        g.beginPath();
        g.moveTo(x, y - rad * 1.0);
        g.lineTo(x + rad * 0.95, y + rad * 0.7);
        g.lineTo(x - rad * 0.95, y + rad * 0.7);
        g.closePath();
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = 'rgba(20,10,5,.8)';
        g.lineWidth = 0.9;
        g.stroke();
        if (state === 'bloody' && r() > 0.4) {
          sphere(g, x + rad * 0.1, y + rad * 0.1, rad * 0.5, [140, 20, 24], 0.4);
        }
      }
    }
  }
  if (state === 'bloody') {
    for (let i = 0; i < 6; i++) softDot(g, (r() - 0.5) * w * 0.7, (r() - 0.5) * h * 0.7, w * (0.04 + r() * 0.06), [110, 10, 14], 0.55);
  }
}

function pressurePlate(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const pressed = param(o, 'state', 'normal') === 'pressed';
  tile(g, w, h, [120, 116, 110], r);
  // fuge rundt om pladen
  g.fillStyle = 'rgb(24,20,18)';
  g.fillRect(-w * 0.34, -h * 0.34, w * 0.68, h * 0.68);
  const inset = pressed ? w * 0.04 : 0;
  rectP(g, -w * 0.3 + inset, -h * 0.3 + inset, w * 0.6 - inset * 2, h * 0.6 - inset * 2, 2, pressed ? [104, 100, 96] : [150, 146, 138], { lw: 1.4, bevel: pressed ? 0.3 : w * 0.03, light: pressed ? 4 : 22 });
  g.strokeStyle = 'rgba(40,34,30,.55)';
  g.lineWidth = Math.max(1, w * 0.03);
  g.beginPath();
  g.arc(0, 0, w * 0.13, 0, 6.28);
  g.moveTo(0, -w * 0.13);
  g.lineTo(0, w * 0.13);
  g.moveTo(-w * 0.13, 0);
  g.lineTo(w * 0.13, 0);
  g.stroke();
  // revner
  g.beginPath();
  g.moveTo(-w * 0.28, -h * 0.1);
  g.lineTo(-w * 0.12, -h * 0.02);
  g.lineTo(-w * 0.08, h * 0.12);
  g.strokeStyle = 'rgba(30,24,20,.5)';
  g.lineWidth = 0.9;
  g.stroke();
}

function pit(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const bottom = param(o, 'bottom', 'dark');
  // kant af jord og sten
  blobP(g, blob(R * 0.97, R * 0.93, 0.07, 16, r), [112, 98, 80], { lw: 1.8, bevel: 0, light: 8, dark: 12 });
  const hole = blob(R * 0.72, R * 0.68, 0.16, 14, r, R * 0.02, R * 0.02);
  g.save();
  smooth(g, hole);
  g.clip();
  const gr = g.createLinearGradient(-R * 0.7, -R * 0.7, R * 0.7, R * 0.7);
  gr.addColorStop(0, 'rgb(6,4,4)');
  gr.addColorStop(0.7, 'rgb(34,28,24)');
  gr.addColorStop(1, 'rgb(96,82,66)');
  g.fillStyle = gr;
  g.fillRect(-R, -R, R * 2, R * 2);
  if (bottom === 'spikes') {
    for (let i = 0; i < 26; i++) {
      const x = (r() - 0.5) * R * 1.3, y = (r() - 0.5) * R * 1.3;
      const s = R * 0.07;
      g.beginPath();
      g.moveTo(x, y - s);
      g.lineTo(x + s * 0.6, y + s * 0.6);
      g.lineTo(x - s * 0.6, y + s * 0.6);
      g.closePath();
      g.fillStyle = 'rgba(190,194,204,.85)';
      g.fill();
    }
  } else if (bottom === 'water') {
    const wg = g.createRadialGradient(-R * 0.1, -R * 0.1, 0, 0, 0, R * 0.7);
    wg.addColorStop(0, 'rgba(60,110,140,.9)');
    wg.addColorStop(1, 'rgba(10,30,44,.95)');
    g.fillStyle = wg;
    g.fillRect(-R, -R, R * 2, R * 2);
    g.strokeStyle = 'rgba(255,255,255,.22)';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(0, 0, R * 0.3, R * 0.25, 0, 0.4, 4);
    g.stroke();
  }
  // mørk kerne
  softDot(g, -R * 0.12, -R * 0.12, R * 0.6, [0, 0, 0], bottom === 'dark' ? 0.9 : 0.35);
  g.restore();
  smooth(g, hole);
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.8, R * 0.05);
  g.stroke();
  // sten og jordklumper på kanten
  for (let i = 0; i < 12; i++) {
    const a = r() * 6.28;
    const d = R * (0.8 + r() * 0.12);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    blobP(g, blob(R * (0.05 + r() * 0.05), R * (0.04 + r() * 0.04), 0.2, 7, r, x, y, a), mix([130, 124, 114], [96, 88, 76], r()), { lw: 1, bevel: 0.5 });
  }
}

function grave(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const coffin = param(o, 'coffin', true);
  // jordhøj
  const mound = blob(w * 0.2, h * 0.34, 0.1, 14, r, w * 0.3, h * 0.02);
  smooth(g, mound);
  const mg = g.createRadialGradient(w * 0.24, -h * 0.1, 0, w * 0.3, h * 0.02, h * 0.34);
  mg.addColorStop(0, 'rgb(130,96,64)');
  mg.addColorStop(1, 'rgb(74,52,34)');
  g.fillStyle = mg;
  g.fill();
  g.save();
  smooth(g, mound);
  g.clip();
  speckle(g, r, [0, -h / 2, w / 2, h / 2], 80, [100, 74, 50], 0.6, 1.5);
  g.restore();
  smooth(g, mound);
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.stroke();
  // hul
  const hx = -w * 0.2, hw = w * 0.3, hh = h * 0.42;
  const rim: [number, number][] = ([[-1, -1], [-0.2, -1.04], [1, -0.98], [1.04, 0.1], [0.96, 1], [0, 1.03], [-1, 0.97], [-1.04, 0]] as [number, number][]).map(([x, y]) => [hx + x * hw * 1.18 + (r() - 0.5) * 3, y * hh * 1.1 + (r() - 0.5) * 3] as [number, number]);
  polyP(g, rim, [96, 70, 46], { lw: 1.6, bevel: 0, light: 6, dark: 8 });
  g.save();
  roundRect(g, hx - hw, -hh, hw * 2, hh * 2, 3);
  g.clip();
  const gr = g.createLinearGradient(hx - hw, -hh, hx + hw, hh);
  gr.addColorStop(0, 'rgb(8,6,5)');
  gr.addColorStop(1, 'rgb(68,50,36)');
  g.fillStyle = gr;
  g.fillRect(hx - hw, -hh, hw * 2, hh * 2);
  if (coffin) {
    const pts: [number, number][] = ([[-0.5, -0.8], [0.5, -0.8], [0.8, -0.3], [0.8, 0.3], [0.5, 0.8], [-0.5, 0.8], [-0.8, 0.3], [-0.8, -0.3]] as [number, number][]).map(([x, y]) => [hx + x * hw * 0.95, y * hh * 0.95] as [number, number]);
    polyP(g, pts, [112, 78, 46], { lw: 1.2, bevel: 0.8 });
    g.strokeStyle = 'rgba(30,16,8,.6)';
    g.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(hx + i * hw * 0.4, -hh * 0.78);
      g.lineTo(hx + i * hw * 0.4, hh * 0.78);
      g.stroke();
    }
  }
  softDot(g, hx - hw * 0.2, -hh * 0.3, hw * 1.2, [0, 0, 0], coffin ? 0.4 : 0.85);
  g.restore();
  roundRect(g, hx - hw, -hh, hw * 2, hh * 2, 3);
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.stroke();
  // skovl i højen
  g.save();
  g.translate(w * 0.34, h * 0.0);
  g.rotate(0.35);
  rectP(g, -w * 0.018, -h * 0.28, w * 0.036, h * 0.4, 1, [120, 84, 50], { lw: 1, bevel: 0.4 });
  polyP(g, [[-w * 0.05, h * 0.12], [w * 0.05, h * 0.12], [w * 0.04, h * 0.24], [0, h * 0.27], [-w * 0.04, h * 0.24]], [150, 156, 166], { lw: 1.2, bevel: 0.5 });
  g.restore();
}

const trapKinds: ObjectKind[] = [
  kind({
    key: 'spike_trap', family: 'trap', name: 'Piggefælde', w: 2, h: 2, shadow: 2, bleed: 0.04, layers: GROUND,
    params: [{ key: 'state', label: 'Tilstand', type: 'select', default: 'armed', options: [{ value: 'armed', label: 'Pigge oppe' }, { value: 'retracted', label: 'Pigge nede' }, { value: 'bloody', label: 'Blodige pigge' }] }],
    draw: spikeTrap,
  }),
  kind({
    key: 'pressure_plate', family: 'trap', name: 'Trykplade', w: 1, h: 1, shadow: 1, bleed: 0.03, layers: GROUND,
    params: [{ key: 'state', label: 'Tilstand', type: 'select', default: 'normal', options: [{ value: 'normal', label: 'Oppe' }, { value: 'pressed', label: 'Nedtrykket' }] }],
    draw: pressurePlate,
  }),
  kind({
    key: 'pit_hole', family: 'trap', name: 'Hul', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: GROUND,
    params: [{ key: 'bottom', label: 'Bund', type: 'select', default: 'dark', options: [{ value: 'dark', label: 'Bundløs' }, { value: 'spikes', label: 'Pigge' }, { value: 'water', label: 'Vand' }] }],
    draw: pit,
  }),
  kind({
    key: 'open_grave', family: 'trap', name: 'Åben grav', w: 2, h: 2.4, keepAspect: false, shadow: 0, bleed: 0.05, layers: GROUND,
    params: [{ key: 'coffin', label: 'Ligkiste', type: 'toggle', default: true }],
    draw: grave,
  }),
];

// ---------------------------------------------------------------- skat

function coin(g: G, x: number, y: number, rad: number, col: RGB): void {
  const gr = g.createRadialGradient(x - rad * 0.4, y - rad * 0.4, 0, x, y, rad * 1.1);
  gr.addColorStop(0, rgb(shift(col, 52)));
  gr.addColorStop(0.6, rgb(col));
  gr.addColorStop(1, rgb(shift(col, -48)));
  g.beginPath();
  g.ellipse(x, y, rad, rad * 0.86, 0, 0, 6.28);
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(40,24,6,.75)';
  g.lineWidth = Math.max(0.6, rad * 0.16);
  g.stroke();
  g.beginPath();
  g.ellipse(x, y, rad * 0.55, rad * 0.46, 0, 0, 6.28);
  g.strokeStyle = 'rgba(60,40,10,.28)';
  g.stroke();
}

function gem(g: G, x: number, y: number, s: number, col: RGB, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const pts: [number, number][] = [[0, -s], [s * 0.8, -s * 0.2], [s * 0.55, s * 0.8], [-s * 0.55, s * 0.8], [-s * 0.8, -s * 0.2]];
  polyP(g, pts, col, { lw: Math.max(0.8, s * 0.12), bevel: 0, light: 50, dark: 30 });
  g.beginPath();
  g.moveTo(0, -s);
  g.lineTo(0, s * 0.8);
  g.moveTo(-s * 0.8, -s * 0.2);
  g.lineTo(s * 0.8, -s * 0.2);
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 0.7;
  g.stroke();
  g.restore();
}

function treasure(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const type = param(o, 'type', 'gold');
  const GOLD: RGB = [226, 182, 56], SILVER: RGB = [196, 202, 212];
  const pile = blob(R * 0.86, R * 0.8, 0.1, 14, r);
  contact(g, R * 0.06, R * 0.08, R * 0.95, R * 0.9, 0.5);
  smooth(g, pile);
  g.fillStyle = 'rgb(70,52,18)';
  g.fill();
  const coins: { x: number; y: number; d: number; c: RGB }[] = [];
  const n = 150;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28;
    const d = Math.pow(r(), 0.7) * R * 0.8;
    const c = type === 'silver' ? SILVER : type === 'mixed' && r() > 0.5 ? SILVER : GOLD;
    coins.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.94, d, c: shift(c, (r() - 0.5) * 30) });
  }
  coins.sort((p, q) => q.d - p.d);
  for (const c of coins) coin(g, c.x, c.y, R * 0.085, c.c);
  softDot(g, -R * 0.2, -R * 0.25, R * 0.4, [255, 244, 190], 0.25);
  if (type === 'gems' || type === 'mixed') {
    const cols: RGB[] = [[210, 40, 60], [50, 120, 220], [50, 190, 110], [170, 70, 200], [240, 240, 250]];
    for (let i = 0; i < 9; i++) {
      const a = r() * 6.28;
      const d = r() * R * 0.62;
      gem(g, Math.cos(a) * d, Math.sin(a) * d, R * (0.07 + r() * 0.05), cols[(r() * cols.length) | 0]!, r() * 3);
    }
  }
  if (type === 'mixed') {
    // guldbarrer
    for (const [x, y, a] of [[-R * 0.5, R * 0.3, 0.4], [R * 0.4, R * 0.45, -0.3]] as const) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      polyP(g, [[-R * 0.2, -R * 0.08], [R * 0.2, -R * 0.08], [R * 0.24, R * 0.1], [-R * 0.24, R * 0.1]], [236, 192, 60], { lw: 1.2, bevel: 1, light: 40 });
      g.restore();
    }
  }
}

const treasureKinds: ObjectKind[] = [
  kind({
    key: 'treasure_pile', family: 'treasure', name: 'Skattebunke', w: 1.6, h: 1.6, randomRotation: true, sizeJitter: 0.15, shadow: 4, bleed: 0.1,
    params: [{ key: 'type', label: 'Skat', type: 'select', default: 'gold', options: [{ value: 'gold', label: 'Guldmønter' }, { value: 'silver', label: 'Sølvmønter' }, { value: 'gems', label: 'Mønter og ædelsten' }, { value: 'mixed', label: 'Blandet skat' }] }],
    draw: treasure,
  }),
];

// ---------------------------------------------------------------- statuer

function pedestal(g: G, R: number, base: RGB, round: boolean): void {
  contact(g, R * 0.08, R * 0.1, R, R, 0.3);
  if (round) ellP(g, 0, 0, R * 0.96, R * 0.96, shift(base, -22), { lw: Math.max(1.6, R * 0.06), bevel: R * 0.05 });
  else rectP(g, -R * 0.92, -R * 0.92, R * 1.84, R * 1.84, R * 0.08, shift(base, -22), { lw: Math.max(1.6, R * 0.06), bevel: R * 0.05 });
}

function statueKnight(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const base = TONE[param(o, 'tone', 'stone')] ?? TONE.stone!;
  pedestal(g, R, base, false);
  g.save();
  g.translate(0, -R * 0.06);
  g.scale(1.3, 1.3);
  // sværd, spidsen nedad
  rectP(g, -R * 0.045, R * 0.1, R * 0.09, R * 0.55, 1, shift(base, 40), { lw: 1.1, bevel: 0.5 });
  rectP(g, -R * 0.26, R * 0.08, R * 0.52, R * 0.08, 1, shift(base, 10), { lw: 1.1, bevel: 0.5 });
  // skjold
  polyP(g, [[-R * 0.78, -R * 0.1], [-R * 0.42, -R * 0.1], [-R * 0.42, R * 0.35], [-R * 0.6, R * 0.6], [-R * 0.78, R * 0.35]], shift(base, -6), { lw: 1.4, bevel: 1.2 });
  g.beginPath();
  g.moveTo(-R * 0.6, -R * 0.06);
  g.lineTo(-R * 0.6, R * 0.5);
  g.moveTo(-R * 0.76, R * 0.16);
  g.lineTo(-R * 0.44, R * 0.16);
  g.strokeStyle = 'rgba(30,26,22,.4)';
  g.lineWidth = 1.2;
  g.stroke();
  // skuldre, arme og hoved
  ellP(g, 0, -R * 0.12, R * 0.62, R * 0.3, shift(base, 6), { lw: Math.max(1.4, R * 0.05), bevel: R * 0.04 });
  ellP(g, R * 0.34, R * 0.1, R * 0.12, R * 0.12, shift(base, 6), { lw: 1.2, bevel: 0.5 });
  ellP(g, -R * 0.32, R * 0.1, R * 0.12, R * 0.12, shift(base, 6), { lw: 1.2, bevel: 0.5 });
  ellP(g, 0, -R * 0.14, R * 0.24, R * 0.26, shift(base, 16), { lw: Math.max(1.4, R * 0.05), bevel: R * 0.03 });
  g.beginPath();
  g.moveTo(0, -R * 0.38);
  g.lineTo(0, -R * 0.02);
  g.strokeStyle = 'rgba(30,26,22,.4)';
  g.lineWidth = 1.2;
  g.stroke();
  // visir
  g.fillStyle = 'rgba(20,16,14,.55)';
  g.fillRect(-R * 0.12, -R * 0.2, R * 0.24, R * 0.035);
  g.restore();
  if (param(o, 'moss', false)) for (let i = 0; i < 9; i++) softDot(g, (r() - 0.5) * R * 1.5, (r() - 0.2) * R * 1.4, R * (0.08 + r() * 0.12), [84, 130, 52], 0.75);
}

function statueWinged(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const base = TONE[param(o, 'tone', 'stone')] ?? TONE.stone!;
  pedestal(g, R * 0.62, base, true);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const a = -0.35 + t * 1.5;
      g.save();
      g.translate(s * R * 0.14, -R * 0.12);
      g.rotate(s === 1 ? Math.PI / 2 - a * 0.9 - 0.5 : Math.PI / 2 + a * 0.9 + 0.5);
      const len = R * (0.78 + Math.sin(t * 3) * 0.2);
      paint(g, () => {
        g.beginPath();
        g.ellipse(len / 2, 0, len / 2, R * 0.1, 0, 0, 6.28);
      }, shift(base, (r() - 0.5) * 14 + (1 - t) * 8), [0, -R * 0.1, len, R * 0.1], { lw: 1, bevel: 0.5 });
      g.restore();
    }
  }
  ellP(g, 0, -R * 0.1, R * 0.38, R * 0.22, shift(base, 6), { lw: Math.max(1.3, R * 0.05), bevel: R * 0.03 });
  ellP(g, 0, R * 0.04, R * 0.14, R * 0.1, shift(base, 4), { lw: 1.1, bevel: 0.5 });
  ellP(g, 0, -R * 0.14, R * 0.15, R * 0.17, shift(base, 16), { lw: Math.max(1.3, R * 0.05), bevel: R * 0.03 });
}

const statueKinds: ObjectKind[] = [
  kind({ key: 'statue_knight', family: 'statue', name: 'Ridderstatue', w: 1, h: 1, shadow: 8, bleed: 0.06, params: [...toneParam, { key: 'moss', label: 'Mos', type: 'toggle' as const, default: false }], draw: statueKnight }),
  kind({ key: 'statue_winged', family: 'statue', name: 'Engel', w: 2, h: 2, shadow: 8, bleed: 0.06, params: toneParam, draw: statueWinged }),
];

export const dungeonKinds: ObjectKind[] = [...tombKinds, ...magicKinds, ...trapKinds, ...treasureKinds, ...statueKinds];
