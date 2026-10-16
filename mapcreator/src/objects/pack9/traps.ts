import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { ellBody, polyBody, rectBody, woodGrain } from '../pack2/helpers';
import { blobPath, clipped, crack, FLOOR, glow, glowOf, glowParam, holePts, lin, mix, mottle, OUT, radial, rgb, rune, shift, slab, spike, stateParam, voidHole, type G, type RGB } from './common';

// ---------------------------------------------------------------- trykplader

/** Trykplade i en gulvflise: hævet (lys øverst til venstre) eller nedtrykket (skygge øverst til venstre). */
function plate(g: G, o: DrawInput, style: 'stone' | 'rune' | 'iron' | 'bone'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  const pressed = param(o, 'state', 'normal') === 'pressed';
  const base: RGB = style === 'iron' ? [98, 102, 110] : style === 'rune' ? [116, 110, 120] : style === 'bone' ? [196, 186, 160] : [132, 124, 112];
  const floor: RGB = style === 'bone' ? [92, 84, 76] : [112, 106, 98];
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, floor, { cracks: 3, rad: S * 0.04 });
  const ins = S * 0.17;
  const x = -w / 2 + ins;
  const y = -h / 2 + ins;
  const pw = w - ins * 2;
  const ph = h - ins * 2;
  // fuge omkring pladen
  rectBody(g, x - S * 0.035, y - S * 0.035, pw + S * 0.07, ph + S * 0.07, S * 0.03, [34, 30, 28], { lw: 1.2, ao: S * 0.03 });
  const off = pressed ? S * 0.025 : -S * 0.012;
  rectBody(g, x + off, y + off, pw, ph, S * 0.025, shift(base, pressed ? -14 : 0), { lw: Math.max(1.2, S * 0.025), light: pressed ? 4 : 30, dark: 40, ao: S * 0.04 });
  const path = () => { g.beginPath(); g.rect(x + off, y + off, pw, ph); };
  clipped(g, path, () => {
    g.translate(off, off);
    mottle(g, r, [x, y, x + pw, y + ph], base, 18, S * 0.05, 18, 0.3);
    if (style === 'iron') {
      g.strokeStyle = 'rgba(0,0,0,.32)';
      g.lineWidth = 1;
      for (let i = -8; i < 12; i++) {
        g.beginPath();
        g.moveTo(x + (i * pw) / 8, y);
        g.lineTo(x + (i * pw) / 8 + ph, y + ph);
        g.stroke();
      }
      g.strokeStyle = 'rgba(255,255,255,.14)';
      for (let i = -8; i < 12; i++) {
        g.beginPath();
        g.moveTo(x + (i * pw) / 8 + 1.2, y);
        g.lineTo(x + (i * pw) / 8 + ph + 1.2, y + ph);
        g.stroke();
      }
    } else if (style === 'bone') {
      for (let i = 0; i < 5; i++) crack(g, r, x + r() * pw, y + r() * ph, S * 0.3, r() * 6.3, S * 0.014);
    } else {
      for (let i = 0; i < 3; i++) crack(g, r, x + r() * pw, y + r() * ph, S * (0.2 + r() * 0.25), r() * 6.3, Math.max(0.7, S * 0.013));
    }
    g.translate(-off, -off);
  });
  g.save();
  g.translate(off, off);
  if (style === 'iron') {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.fillStyle = 'rgba(8,4,0,.55)';
      g.beginPath();
      g.arc(sx * pw * 0.38 + 0.6, sy * ph * 0.38 + 0.7, S * 0.045, 0, 7);
      g.fill();
      g.fillStyle = radial(g, sx * pw * 0.38, sy * ph * 0.38, S * 0.045, [[0, 'rgb(190,192,200)'], [1, 'rgb(64,66,74)']], sx * pw * 0.38 - 1, sy * ph * 0.38 - 1, 0.2);
      g.beginPath();
      g.arc(sx * pw * 0.38, sy * ph * 0.38, S * 0.045, 0, 7);
      g.fill();
    }
  } else if (style === 'rune') {
    const gl = glowOf(o, 'arcane');
    glow(g, 0, 0, S * 0.5, gl.edge, pressed ? 0.5 : 0.28);
    rune(g, 0, 0, S * 0.36, r, gl.edge, 0.95, S * 0.04);
    g.strokeStyle = rgb(gl.edge, 0.7);
    g.lineWidth = Math.max(0.8, S * 0.02);
    g.beginPath();
    g.rect(-pw * 0.4, -ph * 0.4, pw * 0.8, ph * 0.8);
    g.stroke();
  } else if (style === 'bone') {
    // lille kranie-antydning set oppefra
    g.fillStyle = 'rgba(40,30,22,.7)';
    g.beginPath();
    g.ellipse(0, -ph * 0.04, pw * 0.2, ph * 0.18, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.ellipse(-pw * 0.07, ph * 0.02, pw * 0.05, ph * 0.05, 0, 0, 7);
    g.ellipse(pw * 0.07, ph * 0.02, pw * 0.05, ph * 0.05, 0, 0, 7);
    g.fillStyle = 'rgba(8,4,2,.9)';
    g.fill();
  }
  g.restore();
}

const plateState = stateParam('normal', [['normal', 'Oppe'], ['pressed', 'Nedtrykket']]);

// ---------------------------------------------------------------- faldgruber

type PitStyle = 'open' | 'spikes' | 'boards' | 'leaves' | 'water' | 'acid';

function pit(g: G, o: DrawInput, style: PitStyle): void {
  const r = rng(o.seed);
  const R = (Math.min(o.w, o.h) / 2) * 0.94;
  const sprung = param(o, 'state', style === 'boards' ? 'intact' : style === 'leaves' ? 'hidden' : 'open') !== (style === 'boards' ? 'intact' : 'hidden');
  const pts = holePts(r, R * 0.8, R * 0.8, 0.07);
  const holePath = blobPath(g, pts);
  // jordring med små sten
  const ringPts = holePts(r, R * 1.0, R * 1.0, 0.06, 20);
  const ringPath = blobPath(g, ringPts);
  const earth: RGB = style === 'acid' ? [88, 96, 70] : [112, 96, 76];
  g.save();
  ringPath();
  g.fillStyle = radial(g, 0, 0, R * 1.02, [[0, rgb(earth)], [0.8, rgb(shift(earth, -6))], [1, rgb(shift(earth, -6), 0)]]);
  g.fill();
  g.restore();
  clipped(g, ringPath, () => mottle(g, r, [-R, -R, R, R], earth, 40, R * 0.08, 24, 0.4));
  if (style === 'leaves' && !sprung) {
    // tildækket: næsten ingen mørke, kun let nedsynkning, blade og kviste
    glow(g, 0, 0, R * 0.9, [60, 44, 28], 0.22);
    for (let i = 0; i < 4; i++) crack(g, r, (r() - 0.5) * R * 0.9, (r() - 0.5) * R * 0.9, R * 0.5, r() * 6.3, 0.9);
    scatterLeaves(g, r, R * 0.95, 46);
    for (let i = 0; i < 6; i++) twig(g, r, (r() - 0.5) * R * 1.4, (r() - 0.5) * R * 1.4, R * (0.25 + r() * 0.3));
    return;
  }
  if (style === 'boards' && !sprung) {
    boardCover(g, r, R, 0);
    return;
  }
  voidHole(g, holePath, [-R * 0.8, -R * 0.8, R * 0.8, R * 0.8]);
  if (style === 'spikes') {
    clipped(g, holePath, () => {
      const n = 7;
      for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
        const x = ((ix + 0.5) / n - 0.5) * R * 1.7 + (r() - 0.5) * R * 0.1;
        const y = ((iy + 0.5) / n - 0.5) * R * 1.7 + (r() - 0.5) * R * 0.1;
        if (Math.hypot(x, y) > R * 0.8) continue;
        spike(g, x, y, R * 0.075, [150, 154, 164]);
      }
      g.fillStyle = radial(g, 0, 0, R * 0.85, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,.15)'], [1, 'rgba(0,0,0,.7)']]);
      g.fillRect(-R, -R, R * 2, R * 2);
      if (r() < 0.6) {
        g.fillStyle = 'rgba(130,16,20,.6)';
        g.beginPath();
        g.ellipse((r() - 0.5) * R * 0.5, (r() - 0.5) * R * 0.5, R * 0.1, R * 0.07, r() * 3, 0, 7);
        g.fill();
      }
    });
  } else if (style === 'water' || style === 'acid') {
    const col: RGB = style === 'acid' ? [128, 210, 60] : [52, 86, 112];
    clipped(g, holePath, () => {
      g.fillStyle = radial(g, -R * 0.1, -R * 0.1, R * 0.8, [[0, rgb(shift(col, 20), 0.95)], [0.7, rgb(col, 0.95)], [1, rgb(shift(col, -40), 0.98)]]);
      g.fillRect(-R, -R, R * 2, R * 2);
      g.strokeStyle = 'rgba(255,255,255,.28)';
      g.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.ellipse((r() - 0.5) * R * 0.5, (r() - 0.5) * R * 0.5, R * (0.1 + r() * 0.3), R * (0.06 + r() * 0.2), 0, 0.3, 2.4);
        g.stroke();
      }
      if (style === 'acid') glow(g, 0, 0, R * 0.8, [190, 255, 90], 0.3);
      g.strokeStyle = 'rgba(10,20,10,.5)';
      g.lineWidth = R * 0.22;
      blobPath(g, pts)();
      g.stroke();
    });
    if (style === 'acid') {
      for (let i = 0; i < 7; i++) {
        const a = r() * 6.3;
        g.fillStyle = 'rgba(200,255,120,.4)';
        g.beginPath();
        g.arc(Math.cos(a) * R * 0.5 * r(), Math.sin(a) * R * 0.5 * r(), R * (0.02 + r() * 0.04), 0, 7);
        g.fill();
      }
    }
  } else if (style === 'boards' && sprung) {
    boardCover(g, r, R, 1);
  } else if (style === 'leaves' && sprung) {
    scatterLeaves(g, r, R * 1.0, 18, true);
    for (let i = 0; i < 3; i++) twig(g, r, (r() - 0.5) * R * 1.4, (r() - 0.5) * R * 1.4, R * 0.5);
  }
  // knuste kantsten
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.28 + r() * 0.5;
    const d = R * (0.82 + r() * 0.12);
    const s = R * (0.06 + r() * 0.07);
    const sp = Array.from({ length: 6 }, (_, k): [number, number] => [Math.cos(a) * d + Math.cos(k * 1.05 + r()) * s * (0.7 + r() * 0.5), Math.sin(a) * d + Math.sin(k * 1.05 + r()) * s * (0.7 + r() * 0.5)]);
    polyBody(g, sp, shift([128, 118, 104], (r() - 0.5) * 30), { lw: 1.1, ao: s * 0.3 });
  }
}

function scatterLeaves(g: G, r: () => number, R: number, n: number, dark = false): void {
  const cols: RGB[] = [[150, 98, 40], [182, 134, 52], [118, 112, 50], [96, 70, 36], [138, 60, 32]];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * R;
    const c = cols[Math.floor(r() * cols.length)]!;
    g.save();
    g.translate(Math.cos(a) * d, Math.sin(a) * d);
    g.rotate(r() * 6.3);
    const s = R * (0.045 + r() * 0.05);
    g.beginPath();
    g.ellipse(0, 0, s, s * 0.55, 0, 0, 7);
    g.fillStyle = rgb(shift(c, dark ? -34 : (r() - 0.5) * 24), 0.95);
    g.fill();
    g.strokeStyle = 'rgba(30,14,4,.5)';
    g.lineWidth = 0.6;
    g.stroke();
    g.beginPath();
    g.moveTo(-s, 0);
    g.lineTo(s, 0);
    g.stroke();
    g.restore();
  }
}

function twig(g: G, r: () => number, x: number, y: number, len: number): void {
  const a = r() * 6.3;
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(18,10,4,.7)';
  g.lineWidth = Math.max(1.3, len * 0.06);
  g.beginPath();
  g.moveTo(-len / 2, 0);
  g.quadraticCurveTo(0, (r() - 0.5) * len * 0.2, len / 2, 0);
  g.stroke();
  g.strokeStyle = 'rgb(96,70,42)';
  g.lineWidth = Math.max(0.8, len * 0.035);
  g.stroke();
  g.restore();
}

/** Brædder over et hul; `broken` = nogle brædder er knækket og faldet ned. */
function boardCover(g: G, r: () => number, R: number, broken: number): void {
  const n = 6;
  const bw = (R * 2.0) / n;
  const wood: RGB = [132, 98, 60];
  for (let i = 0; i < n; i++) {
    const x = -R + i * bw;
    const len = R * (1.7 + r() * 0.2);
    const cut = broken && (i === 2 || i === 3 || (i === 1 && r() < 0.5));
    const half = len / 2;
    const clip = () => {
      g.beginPath();
      g.ellipse(0, 0, R * 1.0, R * 1.0, 0, 0, 7);
    };
    clipped(g, clip, () => {
      const col = shift(wood, (r() - 0.5) * 26);
      const y0 = cut ? (i === 2 ? -half : -half * 0.2) : -half;
      const y1 = cut ? (i === 2 ? -R * 0.05 : half) : half;
      const pts: [number, number][] = cut ? jagged(r, x + bw * 0.04, y0, bw * 0.92, y1 - y0, i === 2 ? 'bottom' : 'top') : [[x + bw * 0.04, y0], [x + bw * 0.96, y0], [x + bw * 0.96, y1], [x + bw * 0.04, y1]];
      polyBody(g, pts, col, { lw: 1.3, ao: bw * 0.1 });
      const p2 = () => { g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
      clipped(g, p2, () => woodGrain(g, r, [x, y0, x + bw, y1], col, { rot: Math.PI / 2, lines: 5, knots: r() < 0.3 ? 1 : 0 }));
      if (!cut) for (const yy of [-half * 0.82, half * 0.82]) {
        g.fillStyle = 'rgba(210,190,150,.8)';
        g.beginPath();
        g.arc(x + bw / 2, yy, 1.5, 0, 7);
        g.fill();
      }
    });
  }
}

function jagged(r: () => number, x: number, y: number, w: number, h: number, edge: 'top' | 'bottom'): [number, number][] {
  const pts: [number, number][] = [];
  const m = 5;
  if (edge === 'bottom') {
    pts.push([x, y], [x + w, y]);
    for (let i = m; i >= 0; i--) pts.push([x + (w * i) / m, y + h + (i % 2 ? 1 : -1) * w * (0.15 + r() * 0.2)]);
  } else {
    pts.push([x, y + h], [x + w, y + h]);
    for (let i = m; i >= 0; i--) pts.push([x + (w * i) / m, y + (i % 2 ? 1 : -1) * w * (0.15 + r() * 0.2)]);
  }
  return pts;
}

// ---------------------------------------------------------------- pigge

function spikeField(g: G, o: DrawInput, style: 'field' | 'row' | 'ring' | 'bloody'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const ext = param(o, 'state', 'out');
  const dirt: RGB = [96, 84, 72];
  if (style === 'row') {
    slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [110, 104, 96], { cracks: 2 });
  } else if (style === 'ring') {
    ellBody(g, 0, 0, w * 0.48, h * 0.48, [110, 104, 96], { lw: 1.6 });
  } else {
    glow(g, 0, 0, Math.max(w, h) * 0.5, [40, 30, 22], 0.55);
    clipped(g, blobPath(g, holePts(r, w * 0.46, h * 0.46, 0.08, 16)), () => mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], dirt, 26, w * 0.05, 20, 0.5));
  }
  const pts: [number, number][] = [];
  const gap = Math.min(w, h) * (style === 'row' ? 0.32 : 0.17);
  for (let y = -h * 0.42; y <= h * 0.42; y += gap) {
    for (let x = -w * 0.42; x <= w * 0.42; x += gap) {
      const px = x + (r() - 0.5) * gap * 0.5;
      const py = y + (r() - 0.5) * gap * 0.5;
      if (style === 'ring' && Math.hypot(px / w, py / h) > 0.43) continue;
      if (style === 'field' && Math.hypot(px / w, py / h) > 0.45) continue;
      pts.push([px, py]);
    }
  }
  for (const [x, y] of pts) {
    const s = gap * 0.3;
    const out = ext === 'out' ? 0.75 + r() * 0.5 : ext === 'half' ? 0.45 + r() * 0.3 : 0.2;
    g.fillStyle = 'rgba(0,0,0,.78)';
    g.beginPath();
    g.arc(x, y, s * 1.15, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(180,170,150,.25)';
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(x, y, s * 1.15, Math.PI * 0.9, Math.PI * 1.7);
    g.stroke();
    if (ext !== 'in') spike(g, x - s * 0.1, y - s * 0.1, s * out, [168, 174, 186], out);
    if (style === 'bloody' && r() < 0.5) {
      g.fillStyle = 'rgba(120,12,16,.65)';
      g.beginPath();
      g.arc(x, y, s * 0.55, 0, 7);
      g.fill();
    }
  }
  if (style === 'bloody') {
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(110,14,18,.5)';
      g.beginPath();
      g.ellipse((r() - 0.5) * w * 0.6, (r() - 0.5) * h * 0.6, w * (0.04 + r() * 0.07), h * (0.03 + r() * 0.05), r() * 3, 0, 7);
      g.fill();
    }
  }
}

const spikeStates = stateParam('out', [['out', 'Pigge fremme'], ['half', 'Halvt fremme'], ['in', 'Pigge nede']]);

export const trapKinds: ObjectKind[] = [
  // trykplader
  kind({ key: 'trapx_plate_stone', family: 'trapx', name: 'Trykplade, sten', w: 1, h: 1, shadow: 0, bleed: 0.04, layers: FLOOR, params: [plateState], tags: ['dungeon', 'crypt', 'ruin'], draw: (g, o) => plate(g, o, 'stone') }),
  kind({ key: 'trapx_plate_rune', family: 'trapx', name: 'Trykplade med rune', w: 1, h: 1, shadow: 0, bleed: 0.2, layers: FLOOR, params: [plateState, glowParam('arcane')], tags: ['dungeon', 'magic', 'temple'], draw: (g, o) => plate(g, o, 'rune') }),
  kind({ key: 'trapx_plate_iron', family: 'trapx', name: 'Trykplade, jern', w: 1, h: 1, shadow: 0, bleed: 0.04, layers: FLOOR, params: [plateState], tags: ['dungeon', 'military'], draw: (g, o) => plate(g, o, 'iron') }),
  kind({ key: 'trapx_plate_bone', family: 'trapx', name: 'Trykplade, knogle', w: 1, h: 1, shadow: 0, bleed: 0.04, layers: FLOOR, params: [plateState], tags: ['dungeon', 'crypt'], draw: (g, o) => plate(g, o, 'bone') }),
  // faldgruber
  kind({ key: 'trapx_pit_open', family: 'trapx', name: 'Faldgrube, åben', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, tags: ['dungeon', 'outdoor', 'cave'], draw: (g, o) => pit(g, o, 'open') }),
  kind({ key: 'trapx_pit_spikes', family: 'trapx', name: 'Faldgrube med spyd', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, tags: ['dungeon', 'outdoor', 'forest'], draw: (g, o) => pit(g, o, 'spikes') }),
  kind({ key: 'trapx_pit_boards', family: 'trapx', name: 'Faldgrube med brædder', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, params: [stateParam('intact', [['intact', 'Tildækket'], ['broken', 'Brækket igennem']])], tags: ['dungeon', 'outdoor', 'village'], draw: (g, o) => pit(g, o, 'boards') }),
  kind({ key: 'trapx_pit_leaves', family: 'trapx', name: 'Faldgrube under løv', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, params: [stateParam('hidden', [["hidden", "Skjult"], ["sprung", "Udløst"]])], tags: ['forest', 'outdoor', 'grassland'], draw: (g, o) => pit(g, o, 'leaves') }),
  kind({ key: 'trapx_pit_water', family: 'trapx', name: 'Gruve med vand', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, tags: ['dungeon', 'swamp', 'cave'], draw: (g, o) => pit(g, o, 'water') }),
  kind({ key: 'trapx_pit_acid', family: 'trapx', name: 'Syregrube', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.2, layers: FLOOR, tags: ['dungeon', 'magic', 'cave'], draw: (g, o) => pit(g, o, 'acid') }),
  // pigge
  kind({ key: 'trapx_spikes_field', family: 'trapx', name: 'Piggefelt', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, params: [spikeStates], tags: ['dungeon', 'cave', 'battlefield'], draw: (g, o) => spikeField(g, o, 'field') }),
  kind({ key: 'trapx_spikes_row', family: 'trapx', name: 'Pigge i række', w: 3, h: 1, keepAspect: false, shadow: 0, bleed: 0.04, layers: FLOOR, params: [spikeStates], tags: ['dungeon', 'crypt'], draw: (g, o) => spikeField(g, o, 'row') }),
  kind({ key: 'trapx_spikes_ring', family: 'trapx', name: 'Piggecirkel', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.04, layers: FLOOR, params: [spikeStates], tags: ['dungeon', 'temple'], draw: (g, o) => spikeField(g, o, 'ring') }),
  kind({ key: 'trapx_spikes_bloody', family: 'trapx', name: 'Blodige pigge', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, params: [spikeStates], tags: ['dungeon', 'battlefield', 'crypt'], draw: (g, o) => spikeField(g, o, 'bloody') }),
];

export { lin, mix, OUT };
