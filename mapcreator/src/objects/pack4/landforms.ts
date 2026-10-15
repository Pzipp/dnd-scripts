import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rgb, type RGB } from '../util';
import { blobPath, clipped, crack, mix, mottle, polyBody, shift, wobble } from '../pack2/helpers';
import { clamp, lerp, mixc, rf, rng, type G } from './common';
import { jag, PAL, type Palette } from './peaks';

/** Klippeformationer: tabelbjerg, knolde, stenbuer og vulkaner (skråt oppefra, lys fra øverst til venstre). */

type P = [number, number];

const toneP = (d: string): ParamDef => ({
  key: 'tone', label: 'Sten', type: 'select', default: d,
  options: [['grey', 'Grå'], ['brown', 'Brun'], ['red', 'Rød'], ['dark', 'Mørk'], ['sand', 'Sand']].map(([value, label]) => ({ value: value!, label: label! })),
});
const pal = (o: DrawInput, d: string): Palette => PAL[param(o, 'tone', d)] ?? PAL.grey!;

/** Klippelag som gradient: vandrette bånd i skiftende nuancer. */
function strataColor(base: Palette, t: number, band: number): RGB {
  const k = (Math.sin(band * 12.9898) * 43758.5453) % 1;
  return mixc(mixc(base.lo, base.mid, 0.5 + t * 0.3), base.hi, clamp(0.08 + (k - Math.floor(k)) * 0.22, 0, 1));
}

function scatterRocks(g: G, r: () => number, p: Palette, n: number, cx: number, cy: number, rx: number, ry: number, size: number): void {
  const items: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r());
    items.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, s: size * rf(r, 0.5, 1.2) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    const pts = wobble(r, it.x, it.y, it.s, it.s * rf(r, 0.65, 0.9), 7, 0.3, r() * 6);
    polyBody(g, pts, shift(p.mid, (r() - 0.5) * 36), { lw: Math.max(0.8, it.s * 0.12), light: 34, dark: 36, ao: it.s * 0.2 });
  }
}

/** Tabelbjerg: flad top, lodret klippeside i lag og en skråning af grus nederst. */
function mesa(g: G, o: DrawInput, p: Palette, grassTop: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const cliff = h * 0.34;
  const topH = h - cliff - h * 0.08;
  const tx = 0;
  const ty = -h / 2 + topH / 2 + h * 0.01;
  const rotv = r() * 6;
  const topPts = wobble(r, tx, ty, w * 0.44, topH * 0.5, 16, 0.1, 0).map((q, i): P => [q[0] + Math.sin(i * 1.7 + rotv) * w * 0.015, q[1]]);
  const shiftBlob = (dy: number, sc: number): P[] => topPts.map((q) => [q[0] * sc, ty + (q[1] - ty) * sc + dy]);
  // grusskråning ved foden (bredere end toppen)
  const skirt = shiftBlob(cliff + h * 0.04, 1.07);
  g.save();
  blobPath(g, skirt)();
  g.fillStyle = rgb(mixc(p.mid, p.foot, 0.55), 0.92);
  g.fill();
  g.strokeStyle = 'rgba(22,12,8,.6)';
  g.lineWidth = 1.5;
  g.stroke();
  g.restore();
  // klippesiden: bloben skubbes ned i trin, så siden dannes
  const steps = Math.ceil(cliff / 1.5);
  for (let i = steps; i >= 0; i--) {
    const dy = (i / steps) * cliff;
    const t = i / steps;
    const band = Math.floor(t * 7);
    blobPath(g, shiftBlob(dy, 1))();
    g.fillStyle = rgb(strataColor(p, t, band));
    g.fill();
  }
  // lys/skygge på siden: lys mod venstre, mørk mod højre
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const sg = g.createLinearGradient(-w * 0.45, 0, w * 0.45, 0);
  sg.addColorStop(0, 'rgba(255,240,210,.34)');
  sg.addColorStop(0.35, 'rgba(255,240,210,0)');
  sg.addColorStop(0.6, 'rgba(10,6,12,.1)');
  sg.addColorStop(1, 'rgba(10,6,12,.55)');
  g.fillStyle = sg;
  g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();
  // lodrette furer i klippesiden
  clipped(g, blobPath(g, shiftBlob(cliff, 1)), () => {
    for (let i = 0; i < 30; i++) {
      const x = (r() - 0.5) * w * 0.86;
      const y = ty + topH * 0.2 + r() * (cliff + topH * 0.5);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 4, y + cliff * rf(r, 0.15, 0.5));
      g.strokeStyle = `rgba(14,8,6,${0.1 + r() * 0.18})`;
      g.lineWidth = 0.8 + r() * 1.8;
      g.stroke();
    }
  });
  // toppen
  const top = blobPath(g, topPts);
  top();
  const tg = g.createLinearGradient(-w * 0.4, ty - topH * 0.4, w * 0.4, ty + topH * 0.4);
  const tc = grassTop ? mixc(p.foot, [96, 132, 62], 0.6) : mixc(p.mid, p.hi, 0.35);
  tg.addColorStop(0, rgb(mixc(tc, [255, 250, 230], 0.2)));
  tg.addColorStop(1, rgb(mixc(tc, p.lo, 0.35)));
  g.fillStyle = tg;
  g.fill();
  clipped(g, top, () => {
    mottle(g, r, [-w / 2, ty - topH / 2, w / 2, ty + topH / 2], tc, w * 0.06, 20, 0.22);
    for (let i = 0; i < 6; i++) crack(g, r, (r() - 0.5) * w * 0.7, ty + (r() - 0.5) * topH * 0.7, w * rf(r, 0.06, 0.14), r() * 6.28, 0.8, false);
    top();
    g.strokeStyle = 'rgba(255,246,224,.34)';
    g.lineWidth = 3;
    g.translate(1.5, 1.5);
    g.stroke();
  });
  scatterRocks(g, r, p, 6, tx, ty, w * 0.34, topH * 0.34, w * 0.03);
  top();
  g.strokeStyle = 'rgba(22,12,8,.85)';
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.stroke();
  // grus ved foden
  scatterRocks(g, r, p, 16, 0, h * 0.5 - h * 0.1, w * 0.52, h * 0.06, w * 0.022);
}

/** Klippeknold: en afrundet høj af sten og græs med spredte kampesten. */
function knoll(g: G, o: DrawInput, p: Palette, grassy: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const body = blobPath(g, wobble(r, 0, 0, w * 0.47, h * 0.45, 14, 0.09, r() * 6));
  body();
  const base = grassy ? mixc(p.foot, [90, 128, 58], 0.7) : mixc(p.mid, p.foot, 0.3);
  const gr = g.createRadialGradient(-w * 0.18, -h * 0.2, w * 0.03, 0, 0, w * 0.55);
  gr.addColorStop(0, rgb(mixc(base, [255, 248, 220], 0.24)));
  gr.addColorStop(0.55, rgb(base));
  gr.addColorStop(1, rgb(mixc(base, [14, 12, 8], 0.5)));
  g.fillStyle = gr;
  g.fill();
  clipped(g, body, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], base, 40, w * 0.07, 22, 0.3);
    // klippebånd langs højen
    for (let i = 0; i < 5; i++) {
      const y = lerp(-h * 0.25, h * 0.35, i / 4) + r() * h * 0.05;
      g.beginPath();
      g.moveTo(-w * 0.5, y);
      g.quadraticCurveTo(0, y + h * 0.08, w * 0.5, y - h * 0.03);
      g.strokeStyle = 'rgba(30,20,12,.18)';
      g.lineWidth = 1 + r() * 2;
      g.stroke();
    }
    body();
    g.strokeStyle = 'rgba(8,4,0,.32)';
    g.lineWidth = w * 0.06;
    g.translate(-w * 0.03, -w * 0.03);
    g.stroke();
  });
  body();
  g.strokeStyle = 'rgba(22,12,8,.82)';
  g.lineWidth = 1.8;
  g.stroke();
  scatterRocks(g, r, p, 9, 0, 0, w * 0.34, h * 0.32, w * 0.06);
  if (grassy) {
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28;
      const d = Math.sqrt(r()) * 0.42;
      const x = Math.cos(a) * w * d;
      const y = Math.sin(a) * h * d;
      g.strokeStyle = rgb(mixc([76, 116, 48], [150, 170, 86], r()), 0.8);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 4);
      g.stroke();
    }
  }
}

/** Stenbue: to stensøjler og et spænd med et hul, man kan se igennem. */
function arch(g: G, o: DrawInput, p: Palette): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const x0 = -w * 0.48;
  const x1 = w * 0.48;
  const yTop = -h * 0.12;
  const yBot = h * 0.44;
  const depth = h * 0.32;
  // forside med jagede kanter
  const topEdge = jag(r, [x0, yTop], [x1, yTop + rf(r, -0.03, 0.03) * h], 0.09, 4);
  const botEdge = [...jag(r, [x1 + w * 0.02, yBot], [x1, yBot], 0.1, 1), ...jag(r, [x1, yBot], [x0, yBot], 0.03, 3), [x0 - w * 0.02, yBot] as P];
  const hx = rf(r, -0.04, 0.04) * w;
  const hr = w * rf(r, 0.17, 0.22);
  const hy = yBot + 2;
  const hTop = yTop + (yBot - yTop) * rf(r, 0.32, 0.42);
  const front = (): void => {
    g.beginPath();
    topEdge.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    botEdge.forEach((q) => g.lineTo(q[0], q[1]));
    g.closePath();
    // hullet (buet) skæres ud med evenodd
    g.moveTo(hx - hr, hy);
    g.lineTo(hx - hr, hTop + hr);
    g.arc(hx, hTop + hr, hr, Math.PI, 0);
    g.lineTo(hx + hr, hy);
    g.closePath();
  };
  // overside: lys plade bag og over forsiden
  const upper: P[] = [...topEdge, ...jag(r, [x1 - w * 0.06, yTop - depth], [x0 + w * 0.06, yTop - depth * rf(r, 0.9, 1.1)], 0.1, 4)];
  const bodyTop = (): void => {
    g.beginPath();
    upper.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.closePath();
  };
  // inderside af buen: mørk bagvæg set gennem hullet er jorden (gennemsigtig), så kun en mørk kant tegnes
  g.save();
  bodyTop();
  const tg = g.createLinearGradient(x0, yTop - depth, x1, yTop);
  tg.addColorStop(0, rgb(mixc(p.hi, [255, 250, 232], 0.1)));
  tg.addColorStop(1, rgb(mixc(p.mid, p.hi, 0.4)));
  g.fillStyle = tg;
  g.fill();
  clipped(g, bodyTop, () => {
    mottle(g, r, [x0, yTop - depth, x1, yTop], p.mid, 24, w * 0.03, 22, 0.16);
    for (let i = 0; i < 8; i++) crack(g, r, lerp(x0, x1, r()), yTop - depth * r(), w * 0.08, r() * 6.28, 0.8, false);
  });
  g.restore();
  g.save();
  front();
  const fg = g.createLinearGradient(x0, 0, x1, 0);
  fg.addColorStop(0, rgb(mixc(p.mid, p.hi, 0.35)));
  fg.addColorStop(0.5, rgb(p.mid));
  fg.addColorStop(1, rgb(mixc(p.lo, p.mid, 0.25)));
  g.fillStyle = fg;
  g.fill('evenodd');
  g.clip('evenodd');
  for (let i = 0; i < 9; i++) {
    const yy = lerp(yTop, yBot, (i + r() * 0.6) / 9);
    g.fillStyle = `rgba(${r() < 0.5 ? '20,12,8' : '255,240,210'},${0.05 + r() * 0.09})`;
    g.fillRect(x0, yy, x1 - x0, 1 + r() * 4);
  }
  for (let i = 0; i < 22; i++) {
    const x = lerp(x0, x1, r());
    const y = lerp(yTop, yBot, r());
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 5, y + h * rf(r, 0.04, 0.12));
    g.strokeStyle = `rgba(14,8,6,${0.12 + r() * 0.16})`;
    g.lineWidth = 0.8 + r() * 1.6;
    g.stroke();
  }
  // ambient occlusion langs hullet og bunden
  const ao = g.createLinearGradient(0, yTop, 0, yBot);
  ao.addColorStop(0, 'rgba(255,240,210,.12)');
  ao.addColorStop(1, 'rgba(14,8,6,.3)');
  g.fillStyle = ao;
  g.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  g.restore();
  // konturer
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(22,12,8,.85)';
  g.lineWidth = 2;
  front();
  g.stroke();
  bodyTop();
  g.stroke();
  // lys kant øverst på forsiden
  g.beginPath();
  topEdge.forEach((q, i) => (i ? g.lineTo(q[0], q[1] + 2) : g.moveTo(q[0], q[1] + 2)));
  g.strokeStyle = 'rgba(255,246,224,.4)';
  g.lineWidth = 1.6;
  g.stroke();
  // mørk indvendig kant i hullet (højre side), lys i venstre
  g.beginPath();
  g.arc(hx, hTop + hr, hr - 2, Math.PI * 1.05, Math.PI * 1.55);
  g.strokeStyle = 'rgba(255,240,210,.3)';
  g.lineWidth = 2;
  g.stroke();
  scatterRocks(g, r, p, 12, 0, yBot + h * 0.02, w * 0.5, h * 0.05, w * 0.024);
}

/** Vulkan: kegle med krater, lavastrømme og striber af aske. */
function volcano(g: G, o: DrawInput, p: Palette, crater: string): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const hw = w * 0.47;
  const baseY = h * 0.3;
  const cy = -h * 0.28;
  const rx = hw * rf(r, 0.3, 0.38);
  const ry = rx * 0.42;
  const rimL: P = [-rx, cy];
  const rimR: P = [rx, cy];
  const L: P = [-hw, baseY];
  const R: P = [hw, baseY];
  const left = jag(r, rimL, L, 0.06, 4);
  const right = jag(r, R, rimR, 0.06, 4);
  const bottom: P[] = [];
  for (let i = 1; i < 14; i++) {
    const a = Math.PI * (i / 14);
    bottom.push([-Math.cos(a) * hw * 0.99, baseY + Math.sin(a) * hw * 0.2 + (r() - 0.5) * 3]);
  }
  const bodyPts: P[] = [...left, ...bottom, ...right];
  const bodyPath = (): void => {
    g.beginPath();
    bodyPts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.closePath();
  };
  g.save();
  bodyPath();
  const bg = g.createLinearGradient(-hw, 0, hw, 0);
  bg.addColorStop(0, rgb(mixc(p.mid, p.hi, 0.5)));
  bg.addColorStop(0.45, rgb(p.mid));
  bg.addColorStop(1, rgb(mixc(p.lo, [8, 6, 10], 0.3)));
  g.fillStyle = bg;
  g.fill();
  g.clip();
  // riller fra krateret mod foden
  for (let i = 0; i < 26; i++) {
    const a = lerp(Math.PI * 0.02, Math.PI * 0.98, r());
    const sx = Math.cos(a) * rx * 0.9;
    const sy = cy + Math.sin(a) * ry * 0.9 + ry * 0.5;
    const ex = Math.cos(a) * hw * rf(r, 0.75, 1.0);
    const ey = baseY + Math.sin(a) * hw * 0.16;
    const line = jag(r, [-sx, sy], [-ex, ey], 0.05, 3);
    g.beginPath();
    line.forEach((q, j) => (j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.strokeStyle = `rgba(14,8,10,${0.16 + r() * 0.2})`;
    g.lineWidth = 0.8 + r() * 1.8;
    g.stroke();
  }
  // lavastrømme
  if (crater === 'lava') {
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * rf(r, 0.15, 0.85);
      const pts: P[] = [[Math.cos(a) * rx * 0.8, cy + Math.sin(a) * ry * 0.7 + ry * 0.4]];
      let x = pts[0]![0];
      let y = pts[0]![1];
      const steps = 6 + Math.floor(r() * 3);
      const dirx = (-Math.cos(a)) * 0.2 + (r() - 0.5) * 0.3;
      for (let k = 0; k < steps; k++) {
        x += (-Math.cos(a) * hw * 0.5 / steps) * 1 + (r() - 0.5) * hw * 0.06 + dirx * 4;
        y += (baseY - cy) * rf(r, 0.85, 1.05) / steps;
        pts.push([x, y]);
      }
      const stroke = (col: string, wd: number): void => {
        g.beginPath();
        pts.forEach((q, j) => (j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
        g.strokeStyle = col;
        g.lineWidth = wd;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.stroke();
      };
      stroke('rgba(255,90,20,.25)', hw * 0.1);
      stroke('rgba(40,14,8,.85)', hw * 0.05);
      stroke('rgba(255,110,24,.95)', hw * 0.032);
      stroke('rgba(255,214,96,.9)', hw * 0.013);
    }
  }
  // ambient occlusion nederst
  const ao = g.createLinearGradient(0, baseY - h * 0.2, 0, baseY + hw * 0.25);
  ao.addColorStop(0, 'rgba(14,8,6,0)');
  ao.addColorStop(1, 'rgba(14,8,6,.4)');
  g.fillStyle = ao;
  g.fillRect(-hw, baseY - h * 0.2, hw * 2, h * 0.5);
  g.restore();
  bodyPath();
  g.strokeStyle = 'rgba(22,12,8,.85)';
  g.lineWidth = 2.2;
  g.lineJoin = 'round';
  g.stroke();
  // krateret
  g.beginPath();
  g.ellipse(0, cy, rx * 1.12, ry * 1.16, 0, 0, Math.PI * 2);
  const rim = g.createLinearGradient(-rx, cy - ry, rx, cy + ry);
  rim.addColorStop(0, rgb(mixc(p.hi, [255, 248, 230], 0.2)));
  rim.addColorStop(1, rgb(mixc(p.mid, p.lo, 0.4)));
  g.fillStyle = rim;
  g.fill();
  g.strokeStyle = 'rgba(22,12,8,.85)';
  g.lineWidth = 1.8;
  g.stroke();
  g.beginPath();
  g.ellipse(0, cy + ry * 0.08, rx * 0.88, ry * 0.86, 0, 0, Math.PI * 2);
  let inner: CanvasGradient;
  if (crater === 'lava') {
    inner = g.createRadialGradient(-rx * 0.1, cy, 1, 0, cy, rx);
    inner.addColorStop(0, 'rgb(255,226,110)');
    inner.addColorStop(0.5, 'rgb(244,120,26)');
    inner.addColorStop(1, 'rgb(150,36,10)');
  } else if (crater === 'lake') {
    inner = g.createRadialGradient(-rx * 0.2, cy - ry * 0.2, 1, 0, cy, rx);
    inner.addColorStop(0, 'rgb(110,196,196)');
    inner.addColorStop(1, 'rgb(28,92,108)');
  } else {
    inner = g.createRadialGradient(-rx * 0.2, cy - ry * 0.2, 1, 0, cy, rx);
    inner.addColorStop(0, 'rgb(70,64,64)');
    inner.addColorStop(1, 'rgb(20,16,18)');
  }
  g.fillStyle = inner;
  g.fill();
  g.save();
  g.clip();
  if (crater === 'lava') {
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(40,14,8,${0.4 + r() * 0.3})`;
      g.beginPath();
      g.ellipse((r() - 0.5) * rx * 1.4, cy + (r() - 0.5) * ry * 1.2, rx * rf(r, 0.06, 0.15), ry * rf(r, 0.06, 0.14), r() * 3, 0, 7);
      g.fill();
    }
  }
  g.beginPath();
  g.ellipse(rx * 0.1, cy + ry * 0.3, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(10,4,2,.45)';
  g.lineWidth = rx * 0.35;
  g.translate(-rx * 0.08, -ry * 0.12);
  g.stroke();
  g.restore();
  g.beginPath();
  g.ellipse(0, cy + ry * 0.08, rx * 0.88, ry * 0.86, 0, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(22,12,8,.8)';
  g.lineWidth = 1.4;
  g.stroke();
  if (crater === 'lava') {
    const glow = g.createRadialGradient(0, cy, rx * 0.2, 0, cy, rx * 1.6);
    glow.addColorStop(0, 'rgba(255,140,40,.28)');
    glow.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = glow;
    g.fillRect(-rx * 2, cy - rx * 1.4, rx * 4, rx * 2.8);
  }
  void mix;
}

const craterP = (d: string): ParamDef => ({ key: 'crater', label: 'Krater', type: 'select', default: d, options: [{ value: 'lava', label: 'Lava' }, { value: 'ash', label: 'Aske' }, { value: 'lake', label: 'Kratersø' }] });
const MT = { keepAspect: false as const, bleed: 0.03 };

export const landformKinds: ObjectKind[] = [
  kind({ key: 'mtn_mesa', family: 'mountain', name: 'Tabelbjerg (klippeplateau)', w: 5, h: 4.4, shadow: 18, ...MT, sizeJitter: 0.2, params: [toneP('red')], tags: ['mountain', 'desert', 'outdoor'], draw: (g, o) => mesa(g, o, pal(o, 'red'), false) }),
  kind({ key: 'mtn_mesa_grey', family: 'mountain', name: 'Klippeplateau med græs', w: 4, h: 3.6, shadow: 16, ...MT, sizeJitter: 0.2, params: [toneP('grey')], tags: ['mountain', 'grassland', 'outdoor'], draw: (g, o) => mesa(g, o, pal(o, 'grey'), true) }),
  kind({ key: 'mtn_knoll', family: 'mountain', name: 'Klippeknold', w: 3.6, h: 3.2, shadow: 12, ...MT, sizeJitter: 0.25, randomRotation: false, params: [toneP('grey')], tags: ['mountain', 'grassland', 'outdoor'], draw: (g, o) => knoll(g, o, pal(o, 'grey'), true) }),
  kind({ key: 'mtn_hill_rock', family: 'mountain', name: 'Stenhøj', w: 4.4, h: 3.8, shadow: 14, ...MT, sizeJitter: 0.25, params: [toneP('brown')], tags: ['mountain', 'outdoor', 'cave'], draw: (g, o) => knoll(g, o, pal(o, 'brown'), false) }),
  kind({ key: 'mtn_arch', family: 'mountain', name: 'Stenbue', w: 6, h: 3.8, shadow: 18, ...MT, params: [toneP('red')], tags: ['mountain', 'desert', 'outdoor', 'magic'], draw: (g, o) => arch(g, o, pal(o, 'red')) }),
  kind({ key: 'mtn_arch_grey', family: 'mountain', name: 'Stenbue, grå', w: 5, h: 3.4, shadow: 18, ...MT, params: [toneP('grey')], tags: ['mountain', 'outdoor', 'magic'], draw: (g, o) => arch(g, o, pal(o, 'grey')) }),
  kind({ key: 'mtn_volcano', family: 'mountain', name: 'Vulkan', w: 9, h: 8, shadow: 26, ...MT, params: [craterP('lava'), toneP('dark')], tags: ['mountain', 'outdoor', 'magic'], draw: (g, o) => volcano(g, o, pal(o, 'dark'), param(o, 'crater', 'lava')) }),
  kind({ key: 'mtn_volcano_small', family: 'mountain', name: 'Lille vulkan', w: 5, h: 4.6, shadow: 16, ...MT, sizeJitter: 0.15, params: [craterP('ash'), toneP('brown')], tags: ['mountain', 'outdoor', 'magic'], draw: (g, o) => volcano(g, o, pal(o, 'brown'), param(o, 'crater', 'ash')) }),
];
