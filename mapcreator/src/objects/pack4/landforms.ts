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

/** Kantet klippeblok med lys flade mod øverst til venstre og mørk side mod nederst til højre. */
function outcrop(g: G, r: () => number, p: Palette, x: number, y: number, s: number): void {
  const n = 6;
  const pts: P[] = [];
  const rot = r() * 6;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * 6.283;
    const k = 0.7 + r() * 0.5;
    pts.push([x + Math.cos(a) * s * k, y + Math.sin(a) * s * k * 0.75]);
  }
  const path = (): void => {
    g.beginPath();
    pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.closePath();
  };
  polyBody(g, pts, shift(p.mid, (r() - 0.5) * 24), { lw: Math.max(0.9, s * 0.07), light: 38, dark: 44, ao: s * 0.2 });
  // skråkant (facet): mørk trekant nederst til højre
  clipped(g, path, () => {
    g.beginPath();
    g.moveTo(x - s * 0.1, y + s * 0.05);
    g.lineTo(x + s * 1.2, y - s * 0.4);
    g.lineTo(x + s * 1.2, y + s * 1.2);
    g.lineTo(x - s * 0.5, y + s * 1.2);
    g.closePath();
    g.fillStyle = 'rgba(10,6,4,.3)';
    g.fill();
    crack(g, r, x - s * 0.3, y - s * 0.3, s * 0.8, 0.6 + r(), 0.8, false);
  });
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
  // højdekam: lys flade mod nordvest, mørk mod sydøst (volumen)
  clipped(g, body, () => {
    const lg = g.createRadialGradient(-w * 0.2, -h * 0.24, w * 0.02, -w * 0.06, -h * 0.06, w * 0.5);
    lg.addColorStop(0, 'rgba(255,246,220,.42)');
    lg.addColorStop(0.5, 'rgba(255,246,220,.08)');
    lg.addColorStop(1, 'rgba(255,246,220,0)');
    g.fillStyle = lg;
    g.fillRect(-w / 2, -h / 2, w, h);
    const dg = g.createRadialGradient(w * 0.22, h * 0.26, w * 0.05, w * 0.1, h * 0.12, w * 0.55);
    dg.addColorStop(0, 'rgba(8,4,0,.5)');
    dg.addColorStop(0.55, 'rgba(8,4,0,.12)');
    dg.addColorStop(1, 'rgba(8,4,0,0)');
    g.fillStyle = dg;
    g.fillRect(-w / 2, -h / 2, w, h);
  });
  // klippeudspring: kantede flader, lys øverst til venstre og mørk nederst til højre
  const outs = 3 + Math.floor(r() * 3);
  for (let i = 0; i < outs; i++) {
    const a = r() * 6.283;
    const d = 0.1 + r() * 0.26;
    outcrop(g, r, p, Math.cos(a) * w * d, Math.sin(a) * h * d * 0.9, w * rf(r, 0.07, 0.13));
  }
  scatterRocks(g, r, p, 9, 0, 0, w * 0.34, h * 0.32, w * 0.05);
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

/** Stenbue: naturlig bue med tykkelse. Forside (flade i lag og revner), overside bagved (lys, med mos) og en mørk indersidekant omkring hullet. */
function arch(g: G, o: DrawInput, p: Palette): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const x0 = -w * 0.48;
  const x1 = w * 0.48;
  const yTop = -h * 0.05;
  const yBot = h * 0.44;
  const depth = h * 0.3;
  const skew = rf(r, -0.12, 0.12);
  // ydre omrids: kuppel med ujævn top og stejle sider
  const outer: P[] = [[x0 - w * 0.015, yBot]];
  const N = 26;
  const domeH = h * rf(r, 0.2, 0.26);
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * 2 - 1;
    const dome = Math.pow(Math.abs(u), 2.4) * domeH;
    const x = u * w * 0.48 + (i === 0 || i === N ? 0 : rf(r, -0.01, 0.01) * w);
    const y = yTop + dome + (r() - 0.5) * h * 0.035 + u * skew * h * 0.1;
    outer.push([x, y + (i === 0 || i === N ? h * 0.1 : 0)]);
  }
  const side = (a: P, b: P): P[] => jag(r, a, b, 0.07, 3).slice(1, -1);
  const left = side([x0 - w * 0.015, yBot], outer[1]!);
  const right = side(outer[outer.length - 1]!, [x1 + w * 0.015, yBot]);
  const front0: P[] = [[x0 - w * 0.015, yBot], ...left, ...outer.slice(1), ...right, [x1 + w * 0.015, yBot]];
  // hullet: ujævn ellipse med lidt skæv top
  const hx = rf(r, -0.05, 0.05) * w;
  const hr = w * rf(r, 0.24, 0.29);
  const hTop = yTop + h * rf(r, 0.1, 0.15);
  const legH = (yBot - hTop) * 0.34;
  const hole: P[] = [[hx - hr * 1.05, yBot + 3]];
  const M = 22;
  for (let i = 0; i <= M; i++) {
    const a = Math.PI + (i / M) * Math.PI;
    const k = 1 + (r() - 0.5) * 0.09;
    hole.push([hx + Math.cos(a) * hr * k, yBot - legH + Math.sin(a) * (yBot - legH - hTop) * k + (Math.cos(a) > 0 ? skew * h * 0.03 : 0)]);
  }
  hole.push([hx + hr * 1.05, yBot + 3]);
  const front = (): void => {
    g.beginPath();
    front0.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.closePath();
    hole.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.closePath();
  };
  // åben sti (uden bunden), så jordkanten ikke streges
  const holePath = (): void => {
    g.beginPath();
    hole.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  };
  const frontOuter = (): void => {
    g.beginPath();
    front0.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.closePath();
  };
  // overside: forsidens kuppel skubbet bagud (op), hullet holdes fri
  const dx = -w * 0.02;
  // toppen: kuppelens øvre kant (fra skulder til skulder) og samme kant skubbet bagud
  const shoulders = outer.slice(1);
  const slab = (): void => {
    g.beginPath();
    shoulders.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    for (let i = shoulders.length - 1; i >= 0; i--) g.lineTo(shoulders[i]![0] + dx, shoulders[i]![1] - depth);
    g.closePath();
  };
  g.save();
  g.beginPath();
  g.rect(-w, -h, w * 2, h * 2);
  hole.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  g.closePath();
  g.clip('evenodd');
  // forbindelsen mellem for- og overside: ekstruderet trinvis, så siden bag (nordlige kant) bliver en flade
  const steps = 10;
  for (let i = steps; i >= 0; i--) {
    g.save();
    g.translate(dx * (i / steps) * 0.6, -depth * (i / steps));
    frontOuter();
    g.fillStyle = rgb(mixc(p.mid, p.lo, 0.2 + (1 - i / steps) * 0.1));
    g.fill();
    g.restore();
  }
  slab();
  const tg = g.createLinearGradient(x0, yTop - depth * 1.3, x1, yTop);
  tg.addColorStop(0, rgb(mixc(p.hi, [255, 250, 232], 0.2)));
  tg.addColorStop(0.55, rgb(mixc(p.mid, p.hi, 0.5)));
  tg.addColorStop(1, rgb(mixc(p.mid, p.lo, 0.1)));
  g.fillStyle = tg;
  g.fill();
  clipped(g, slab, () => {
    mottle(g, r, [x0, yTop - depth * 1.4, x1, yTop + domeH], p.mid, 40, w * 0.035, 26, 0.22);
    for (let i = 0; i < 9; i++) crack(g, r, lerp(x0, x1, r()), yTop - depth * r() * 1.2, w * 0.07, r() * 6.28, 0.8, false);
    // mos og græs på toppen
    for (let i = 0; i < 26; i++) {
      const x = lerp(x0 + w * 0.05, x1 - w * 0.05, r());
      const y = yTop - depth * rf(r, 0.3, 1.2);
      g.fillStyle = rgb(mixc([74, 112, 46], [140, 164, 84], r()), 0.5 + r() * 0.3);
      g.beginPath();
      g.ellipse(x, y, w * rf(r, 0.008, 0.02), w * rf(r, 0.005, 0.012), r() * 3, 0, 7);
      g.fill();
    }
  });
  slab();
  g.strokeStyle = 'rgba(22,12,8,.85)';
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.stroke();
  g.restore();
  // forsiden
  g.save();
  front();
  const fg = g.createLinearGradient(x0, yTop, x1, yBot);
  fg.addColorStop(0, rgb(mixc(p.mid, p.hi, 0.42)));
  fg.addColorStop(0.5, rgb(p.mid));
  fg.addColorStop(1, rgb(mixc(p.lo, p.mid, 0.3)));
  g.fillStyle = fg;
  g.fill('evenodd');
  g.clip('evenodd');
  // lagdeling i vandrette, let bølgede bånd
  for (let i = 0; i < 10; i++) {
    const yy = lerp(yTop, yBot, (i + r() * 0.6) / 10);
    g.beginPath();
    g.moveTo(x0, yy);
    g.bezierCurveTo(x0 + w * 0.3, yy + rf(r, -4, 4), x1 - w * 0.3, yy + rf(r, -4, 4), x1, yy + rf(r, -3, 3));
    g.strokeStyle = `rgba(${r() < 0.55 ? '20,12,8' : '255,240,210'},${0.07 + r() * 0.1})`;
    g.lineWidth = 1 + r() * 3.2;
    g.stroke();
  }
  mottle(g, r, [x0, yTop, x1, yBot], p.mid, 46, w * 0.03, 22, 0.2);
  for (let i = 0; i < 24; i++) {
    const x = lerp(x0, x1, r());
    const y = lerp(yTop, yBot, r());
    crack(g, r, x, y, h * rf(r, 0.05, 0.13), Math.PI / 2 + (r() - 0.5) * 1.2, 0.9, false);
  }
  // lys på venstre ben, mørkt på højre
  const sh = g.createLinearGradient(x0, 0, x1, 0);
  sh.addColorStop(0, 'rgba(255,240,210,.2)');
  sh.addColorStop(0.35, 'rgba(255,240,210,0)');
  sh.addColorStop(0.7, 'rgba(10,6,14,.05)');
  sh.addColorStop(1, 'rgba(10,6,14,.45)');
  g.fillStyle = sh;
  g.fillRect(x0, yTop - 4, x1 - x0, yBot - yTop + 8);
  // mørk bund (ambient occlusion mod jorden) og kantlys øverst
  const ao = g.createLinearGradient(0, yTop, 0, yBot);
  ao.addColorStop(0, 'rgba(255,240,210,.16)');
  ao.addColorStop(0.55, 'rgba(0,0,0,0)');
  ao.addColorStop(1, 'rgba(14,8,6,.38)');
  g.fillStyle = ao;
  g.fillRect(x0, yTop - 4, x1 - x0, yBot - yTop + 8);
  // indersiden af buen: mørk indre skygge langs hullet (tykkelsen)
  holePath();
  g.strokeStyle = 'rgba(10,5,2,.5)';
  g.lineWidth = w * 0.05;
  g.translate(-w * 0.005, w * 0.012);
  g.stroke();
  g.translate(w * 0.005, -w * 0.012);
  holePath();
  g.strokeStyle = 'rgba(10,5,2,.4)';
  g.lineWidth = w * 0.02;
  g.stroke();
  g.restore();
  // lys kantlinje langs forsidens top (kuppelen)
  g.save();
  frontOuter();
  g.clip();
  g.translate(0, 2.4);
  frontOuter();
  g.strokeStyle = 'rgba(255,246,224,.45)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(22,12,8,.88)';
  g.lineWidth = 2.1;
  front();
  g.stroke();
  holePath();
  g.stroke();
  // lys kant på hullets venstre kant (indersidens lysende flade)
  g.beginPath();
  for (let i = 3; i < 12; i++) {
    if (i === 3) g.moveTo(hole[i]![0] + 2.4, hole[i]![1] + 2.4);
    else g.lineTo(hole[i]![0] + 2.4, hole[i]![1] + 2.4);
  }
  g.strokeStyle = 'rgba(255,240,210,.32)';
  g.lineWidth = 1.8;
  g.stroke();
  scatterRocks(g, r, p, 14, 0, yBot + h * 0.015, w * 0.5, h * 0.05, w * 0.024);
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
