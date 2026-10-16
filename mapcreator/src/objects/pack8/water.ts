import { kind, param, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { body, clipped, mottle, ellipsePath, rectPath, wobble, woodGrain, leaf, mossPatch } from '../pack2/helpers';
import { blobPath, dome, foam, limb, pebble, polyPath, reedTuft, rgb, rr, shift, waterFill, radial, lin, type G, type RGB, type Rnd } from './common';

/** Vand og kyst (pakke 8): vandfald, strygere, damme, sumphuller, kildevæld, tidevandsbassiner, kystklipper, drivtømmer og vragdele. Alt set oppefra. */

const FAM = 'waterx';
const ROCK: RGB = [128, 120, 108];

/** Klippekant: række af klippeblokke langs en vandret linje. */
function rockBand(g: G, r: Rnd, x0: number, x1: number, yc: number, th: number, base: RGB, gaps: [number, number][] = []): void {
  const n = Math.round((x1 - x0) / (th * 0.55));
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) / n) * (x1 - x0);
    if (gaps.some(([a, b]) => x > a && x < b)) continue;
    const s = th * (0.42 + r() * 0.2);
    pebble(g, r, x, yc + (r() - 0.5) * th * 0.35, s, shift(base, (r() - 0.5) * 22));
  }
}

function waterfall(w: number, h: number, g: G, seed: number, o: { stepsN: number; wide: number; cliff: boolean; mist: boolean }): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const sw = w * o.wide;
  const cliffH = h * 0.2;
  // bund: mørk sten og mos
  g.fillStyle = 'rgba(60,54,46,.0)';
  const bank = rectPath(g, x0, y0, w, h, 6);
  clipped(g, bank, () => {
    g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, 'rgb(110,104,94)'], [0.42, 'rgb(96,100,84)'], [1, 'rgb(84,110,78)']]);
    g.fillRect(x0, y0, w, h);
    mottle(g, r, [x0, y0, x0 + w, y0 + h], [104, 100, 88], 60, w * 0.04, 22, 0.35);
    for (let i = 0; i < 12; i++) mossPatch(g, r, x0 + r() * w, y0 + h * (0.2 + r() * 0.8), w * 0.05, 8);
  });
  // strømmen
  const pool = (): void => {
    g.beginPath();
    g.ellipse(0, h * 0.3, sw * 0.95, h * 0.22, 0, 0, 7);
  };
  const stream = (): void => {
    g.beginPath();
    g.moveTo(-sw * 0.5, y0 + 1);
    g.lineTo(sw * 0.5, y0 + 1);
    g.lineTo(sw * 0.5 * 1.05, y0 + cliffH * 1.2);
    for (let i = 0; i <= 8; i++) g.lineTo(sw * (0.5 + 0.25 * (i / 8)) * (1 + Math.sin(i * 1.7) * 0.04), y0 + cliffH * 1.2 + (h * 0.5) * (i / 8));
    g.lineTo(-sw * 0.8, y0 + cliffH * 1.2 + h * 0.5);
    for (let i = 8; i >= 0; i--) g.lineTo(-sw * (0.5 + 0.25 * (i / 8)) * (1 + Math.cos(i * 1.3) * 0.04), y0 + cliffH * 1.2 + (h * 0.5) * (i / 8));
    g.lineTo(-sw * 0.5 * 1.05, y0 + cliffH * 1.2);
    g.closePath();
  };
  waterFill(g, r, pool, [-sw, h * 0.08, sw, h * 0.52], [34, 96, 128], [118, 188, 190], { ripples: 6 });
  clipped(g, stream, () => {
    g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, 'rgb(180,226,236)'], [0.3, 'rgb(104,176,196)'], [1, 'rgb(48,110,140)']]);
    g.fillRect(x0, y0, w, h);
    // længdestrøg, der viser strømmen
    for (let i = 0; i < 26; i++) {
      const sx = (r() - 0.5) * sw * 1.1;
      const yy = y0 + r() * h * 0.7;
      g.strokeStyle = `rgba(240,252,255,${0.25 + r() * 0.4})`;
      g.lineWidth = 1 + r() * 1.6;
      g.beginPath();
      g.moveTo(sx, yy);
      g.quadraticCurveTo(sx + (r() - 0.5) * 6, yy + h * 0.1, sx + (r() - 0.5) * 8, yy + h * 0.2);
      g.stroke();
    }
    g.fillStyle = 'rgba(8,36,58,.18)';
    g.fillRect(-sw, y0 + cliffH * 1.4, sw * 2, 2);
  });
  g.strokeStyle = 'rgba(14,32,34,.65)';
  g.lineWidth = 1.2;
  stream();
  g.stroke();
  // trin i faldet: skumkanter
  for (let s = 0; s < o.stepsN; s++) {
    const yy = y0 + cliffH * 1.1 + (s + 0.5) * (h * 0.46 / o.stepsN);
    const half = sw * (0.5 + 0.22 * ((yy - y0) / h));
    g.fillStyle = 'rgba(30,50,60,.28)';
    g.fillRect(-half, yy + 2, half * 2, 2);
    foam(g, r, -half, yy - 3, half * 2, 6, Math.round(half * 0.7), 0.9);
  }
  // klippekant øverst
  rockBand(g, r, x0 + 4, x0 + w - 4, y0 + cliffH * 0.55, cliffH, ROCK, [[-sw * 0.5, sw * 0.5]]);
  if (o.cliff) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) pebble(g, r, side * (sw * (0.7 + r() * 0.3) + r() * w * 0.12 + w * 0.06), y0 + h * (0.25 + r() * 0.5), w * (0.035 + r() * 0.03), shift(ROCK, (r() - 0.5) * 20));
    }
  }
  // skum og bobler i plumpebassinet
  const ringY = h * 0.3;
  for (let i = 0; i < 40; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r());
    g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`;
    g.beginPath();
    g.ellipse(Math.cos(a) * sw * 0.6 * d, ringY + Math.sin(a) * h * 0.13 * d - h * 0.06, 1.6 + r() * 3.2, 1.2 + r() * 2.2, r() * 3, 0, 7);
    g.fill();
  }
  if (o.mist) {
    for (let i = 0; i < 5; i++) {
      const gr = g.createRadialGradient(0, ringY - h * 0.08, 0, 0, ringY - h * 0.08, sw * 0.7);
      gr.addColorStop(0, 'rgba(240,250,255,.22)');
      gr.addColorStop(1, 'rgba(240,250,255,0)');
      g.fillStyle = gr;
      g.fillRect(-sw, ringY - sw, sw * 2, sw * 2);
    }
  }
  // sten i vandet
  for (let i = 0; i < 4; i++) pebble(g, r, (r() - 0.5) * sw * 1.4, h * 0.38 + (r() - 0.5) * h * 0.14, w * (0.02 + r() * 0.02), ROCK);
}

const wf = (key: string, name: string, w: number, h: number, wide: number, stepsN: number, cliff: boolean, mist: boolean): ObjectKind =>
  kind({
    key, family: FAM, name, w, h, shadow: 0, bleed: 0.02, tags: ['mountain', 'forest', 'cave'], randomRotation: false,
    draw: (g, o) => waterfall(o.w, o.h, g, o.seed, { stepsN: stepsN, wide, cliff, mist }),
  });

/** Å-stryg: strømmende vand med sten og hvide bølgetoppe. */
function rapids(w: number, h: number, g: G, seed: number, rocks: number, bankCol: RGB): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const bank = rectPath(g, x0, y0, w, h, 5);
  clipped(g, bank, () => {
    g.fillStyle = rgb(bankCol);
    g.fillRect(x0, y0, w, h);
    mottle(g, r, [x0, y0, x0 + w, y0 + h], bankCol, 40, w * 0.05, 24, 0.35);
  });
  const half = (t: number): number => w * (0.3 + Math.sin(t * 6 + seed) * 0.03);
  const chan = (): void => {
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = Math.sin(t * 3.4 + seed) * w * 0.05 - half(t);
      if (i) g.lineTo(x, y0 + t * h);
      else g.moveTo(x, y0);
    }
    for (let i = 12; i >= 0; i--) {
      const t = i / 12;
      g.lineTo(Math.sin(t * 3.4 + seed) * w * 0.05 + half(t), y0 + t * h);
    }
    g.closePath();
  };
  waterFill(g, r, chan, [x0, y0, x0 + w, y0 + h], [46, 112, 142], [140, 200, 204], { ripples: 4 });
  clipped(g, chan, () => {
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * w * 0.6;
      const y = y0 + r() * h;
      g.strokeStyle = `rgba(250,255,255,${0.35 + r() * 0.4})`;
      g.lineWidth = 1 + r() * 1.4;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (r() - 0.5) * 8, y + h * 0.06, x + (r() - 0.5) * 10, y + h * 0.14);
      g.stroke();
    }
  });
  for (let i = 0; i < rocks; i++) {
    const t = (i + 0.5 + (r() - 0.5) * 0.6) / rocks;
    const x = (r() - 0.5) * w * 0.5;
    const y = y0 + t * h;
    const s = w * (0.045 + r() * 0.05);
    pebble(g, r, x, y, s, shift(ROCK, (r() - 0.5) * 24));
    // skumhale under stenen (mod nederst: strømmen går nedad)
    foam(g, r, x - s * 0.8, y + s, s * 1.6, s * 2.2, 12, 0.9);
  }
  for (let i = 0; i < 6; i++) reedTuft(g, r, (r() < 0.5 ? -1 : 1) * (half(r()) + w * 0.08), y0 + r() * h, w * 0.06);
}

function pondShape(r: Rnd, rx: number, ry: number): { path: () => void; pts: [number, number][] } {
  const pts = wobble(r, 0, 0, rx, ry, 11, 0.12);
  return { pts, path: () => { /* tegnes af kalderen */ } };
}

function pond(g: G, w: number, h: number, seed: number, o: { lilies: number; reeds: number; mud: boolean; cat: boolean }): void {
  const r = rng(seed);
  const rx = w * 0.42;
  const ry = h * 0.4;
  const { pts } = pondShape(r, rx, ry);
  const outer = wobble(r, 0, 0, rx * 1.22, ry * 1.22, 11, 0.1);
  const bankPath = blobPath(g, outer);
  const waterPath = blobPath(g, pts);
  const bankCol: RGB = o.mud ? [104, 82, 56] : [96, 124, 66];
  body(g, bankPath, bankCol, [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.2, ao: 2, rim: 1.2 });
  clipped(g, bankPath, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], bankCol, 40, w * 0.04, 28, 0.4);
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.283;
      const d = rx * (1.0 + r() * 0.3);
      leaf(g, Math.cos(a) * d, Math.sin(a) * d * (ry / rx), a + 3.14, w * 0.06, w * 0.014, shift([84, 128, 56], (r() - 0.5) * 30), false);
    }
  });
  waterFill(g, r, waterPath, [-rx, -ry, rx, ry], [38, 92, 110], [96, 156, 150], { ripples: 8 });
  // åkander: runde blade med et indhak og enkelte blomster
  for (let i = 0; i < o.lilies; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * 0.78;
    const x = Math.cos(a) * rx * d;
    const y = Math.sin(a) * ry * d;
    const s = w * (0.05 + r() * 0.04);
    const rot = r() * 6.283;
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, s, rot + 0.35, rot + 6.283 - 0.0);
    g.closePath();
    g.fillStyle = radial(g, x, y, s, [[0, rgb([96, 156, 70])], [1, rgb([50, 108, 52])]], x - s * 0.3, y - s * 0.3, 0.5);
    g.fill();
    g.strokeStyle = 'rgba(14,34,14,.75)';
    g.lineWidth = 1;
    g.stroke();
    g.strokeStyle = 'rgba(200,236,160,.35)';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(rot + 3) * s * 0.9, y + Math.sin(rot + 3) * s * 0.9);
    g.stroke();
    if (r() < 0.3) {
      for (let k = 0; k < 6; k++) {
        const pa = (k / 6) * 6.283;
        g.fillStyle = k % 2 ? 'rgb(250,228,240)' : 'rgb(244,190,214)';
        g.beginPath();
        g.ellipse(x + Math.cos(pa) * s * 0.28, y + Math.sin(pa) * s * 0.28, s * 0.3, s * 0.13, pa, 0, 7);
        g.fill();
      }
      dome(g, x, y, s * 0.12, s * 0.12, [250, 210, 70], { lw: 0 });
    }
  }
  for (let i = 0; i < o.reeds; i++) {
    const a = r() * 6.283;
    reedTuft(g, r, Math.cos(a) * rx * (0.98 + r() * 0.16), Math.sin(a) * ry * (0.98 + r() * 0.16), w * 0.07);
    if (o.cat && r() < 0.6) {
      const px = Math.cos(a) * rx * 1.05;
      const py = Math.sin(a) * ry * 1.05;
      dome(g, px, py, 2.4, 1.6, [96, 58, 34], { lw: 0.6 });
    }
  }
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.283;
    pebble(g, r, Math.cos(a) * rx * 1.12, Math.sin(a) * ry * 1.12, w * (0.02 + r() * 0.015), ROCK);
  }
}

const pondKind = (key: string, name: string, w: number, h: number, lilies: number, reeds: number, mud: boolean, cat: boolean, tags: string[]): ObjectKind =>
  kind({
    key, family: FAM, name, w, h, shadow: 0, bleed: 0.04, randomRotation: true, sizeJitter: 0.15, tags,
    draw: (g, o) => pond(g, o.w, o.h, o.seed, { lilies, reeds, mud, cat }),
  });

function bog(g: G, w: number, h: number, seed: number, kindOf: 'hole' | 'spring' | 'flooded'): void {
  const r = rng(seed);
  const rx = w * 0.42;
  const ry = h * 0.4;
  if (kindOf === 'spring') {
    // kildevæld: stenkrans omkring en lille bassin med bobler
    const ring = ellipsePath(g, 0, 0, rx, ry);
    body(g, ring, [96, 124, 70], [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.2, ao: 2 });
    clipped(g, ring, () => mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], [96, 124, 70], 30, w * 0.04, 24, 0.4));
    const wp = ellipsePath(g, 0, 0, rx * 0.62, ry * 0.62);
    waterFill(g, r, wp, [-rx * 0.62, -ry * 0.62, rx * 0.62, ry * 0.62], [60, 150, 170], [170, 230, 226], { ripples: 4 });
    for (let k = 1; k < 4; k++) {
      g.strokeStyle = `rgba(255,255,255,${0.5 - k * 0.1})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, 0, rx * 0.12 * k, ry * 0.12 * k, 0, 0, 7);
      g.stroke();
    }
    foam(g, r, -rx * 0.12, -ry * 0.12, rx * 0.24, ry * 0.24, 10, 0.9);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283 + r() * 0.3;
      pebble(g, r, Math.cos(a) * rx * 0.74, Math.sin(a) * ry * 0.74, w * (0.045 + r() * 0.025), shift(ROCK, (r() - 0.5) * 24));
    }
    return;
  }
  const mud: RGB = kindOf === 'hole' ? [64, 60, 38] : [86, 78, 52];
  const pts = wobble(r, 0, 0, rx * 1.2, ry * 1.2, 12, 0.14);
  const outer = blobPath(g, pts);
  body(g, outer, [84, 96, 52], [-w / 2, -h / 2, w / 2, h / 2], { lw: 1, ao: 3, rim: 1 });
  clipped(g, outer, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], [84, 96, 52], 60, w * 0.04, 28, 0.45);
  });
  if (kindOf === 'hole') {
    const inner = blobPath(g, wobble(r, 0, 0, rx * 0.8, ry * 0.8, 10, 0.12));
    inner();
    g.fillStyle = radial(g, 0, 0, rx * 0.85, [[0, 'rgb(34,32,20)'], [0.7, rgb(mud)], [1, 'rgb(96,92,52)']], -rx * 0.2, -ry * 0.2, 1);
    g.fill();
    g.strokeStyle = 'rgba(18,14,6,.8)';
    g.lineWidth = 1.4;
    g.stroke();
    // bobler og blank slim
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * rx * 0.62;
      const s = 1.4 + r() * 3;
      g.strokeStyle = 'rgba(190,200,150,.65)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d * (ry / rx), s, 0, 7);
      g.stroke();
      g.fillStyle = 'rgba(255,255,230,.5)';
      g.fillRect(Math.cos(a) * d - s * 0.5, Math.sin(a) * d * (ry / rx) - s * 0.5, 1.2, 1);
    }
    for (let i = 0; i < 5; i++) {
      const a = r() * 6.283;
      limb(g, [[Math.cos(a) * rx * 0.9, Math.sin(a) * ry * 0.9], [Math.cos(a) * rx * 0.6, Math.sin(a) * ry * 0.6]], 2.6, [92, 70, 44]);
    }
  } else {
    // forsumpet bred: mudder med vandpytter
    for (let i = 0; i < 6; i++) {
      const a = r() * 6.283;
      const d = r() * 0.6;
      const px = Math.cos(a) * rx * d;
      const py = Math.sin(a) * ry * d;
      const pp = blobPath(g, wobble(r, px, py, rx * (0.2 + r() * 0.2), ry * (0.14 + r() * 0.16), 8, 0.2, r()));
      waterFill(g, r, pp, [px - rx * 0.4, py - ry * 0.3, px + rx * 0.4, py + ry * 0.3], [70, 90, 80], [130, 150, 120], { ripples: 1, rim: 4 });
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = r() * 6.283;
    reedTuft(g, r, Math.cos(a) * rx * (0.8 + r() * 0.5), Math.sin(a) * ry * (0.8 + r() * 0.5), w * 0.07, [110, 128, 58]);
  }
  for (let i = 0; i < 6; i++) {
    const a = r() * 6.283;
    const d = rx * (0.9 + r() * 0.3);
    dome(g, Math.cos(a) * d, Math.sin(a) * d * (ry / rx), w * 0.04, w * 0.034, [88, 118, 52], { lw: 0.8 });
  }
}

const bogKind = (key: string, name: string, w: number, h: number, type: 'hole' | 'spring' | 'flooded', tags: string[]): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: 0, bleed: 0.04, randomRotation: true, sizeJitter: 0.15, tags, draw: (g, o) => bog(g, o.w, o.h, o.seed, type) });

/** Tidevandsbassin: klippebassin med vand, tang, søstjerner og muslinger. */
const tidepool = kind({
  key: 'waterx_tidepool', family: FAM, name: 'Tidevandsbassin', w: 3, h: 2.4, shadow: 0, bleed: 0.04, randomRotation: true, sizeJitter: 0.15, tags: ['water', 'harbor'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const rock = blobPath(g, wobble(r, 0, 0, w * 0.48, h * 0.47, 13, 0.1));
    body(g, rock, [112, 106, 98], [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.6, ao: 3 });
    clipped(g, rock, () => {
      mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], [112, 106, 98], 60, w * 0.04, 26, 0.4);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = 'rgba(236,230,214,.8)';
        g.beginPath();
        g.arc((r() - 0.5) * w, (r() - 0.5) * h, 0.8 + r() * 1.2, 0, 7);
        g.fill();
      }
    });
    const rx = w * 0.32;
    const ry = h * 0.3;
    const wp = blobPath(g, wobble(r, 0, 0, rx, ry, 9, 0.14));
    waterFill(g, r, wp, [-rx, -ry, rx, ry], [60, 130, 140], [140, 204, 190], { ripples: 3, rim: 6 });
    clipped(g, wp, () => {
      for (let i = 0; i < 5; i++) {
        let x = (r() - 0.5) * rx * 1.3;
        let y = (r() - 0.5) * ry * 1.3;
        g.strokeStyle = rgb(shift([88, 100, 40], (r() - 0.5) * 30), 0.85);
        g.lineWidth = 2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 8; y += (r() - 0.5) * 8; g.lineTo(x, y); }
        g.stroke();
      }
      // søstjerner
      for (let i = 0; i < 3; i++) {
        const sx = (r() - 0.5) * rx * 1.1;
        const sy = (r() - 0.5) * ry * 1.1;
        const sr = w * 0.035;
        const col: RGB = [[230, 110, 60], [210, 70, 80], [244, 170, 70]][i % 3] as RGB;
        const a0 = r() * 6.283;
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = a0 + (k / 10) * 6.283;
          const q = k % 2 ? 0.38 : 1;
          const px = sx + Math.cos(a) * sr * q;
          const py = sy + Math.sin(a) * sr * q;
          if (k) g.lineTo(px, py);
          else g.moveTo(px, py);
        }
        g.closePath();
        g.fillStyle = rgb(col);
        g.fill();
        g.strokeStyle = 'rgba(70,20,10,.7)';
        g.lineWidth = 0.8;
        g.stroke();
      }
    });
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.283;
      const d = 1.08 + r() * 0.25;
      dome(g, Math.cos(a) * rx * d, Math.sin(a) * ry * d, 2.4, 2, [200, 196, 184], { lw: 0.6 });
    }
  },
});

/** Kystklippe: ru klippe med brænding af skum langs den ene kant (nederst), så retningen er tydelig. */
function coastCliff(g: G, w: number, h: number, seed: number, stack: boolean): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  // brænding og lavt vand nederst
  const sea = rectPath(g, x0, y0 + h * 0.5, w, h * 0.5, 4);
  waterFill(g, r, sea, [x0, y0 + h * 0.5, x0 + w, y0 + h], [34, 100, 130], [128, 200, 204], { ripples: 6, rim: 8 });
  // klippemasse: tung og rodet
  const pts: [number, number][] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([x0 + t * w, y0 + h * (0.05 + Math.sin(t * 7 + seed) * 0.05) + (r() - 0.5) * h * 0.06 + (stack ? Math.sin(t * Math.PI) * h * 0.35 : 0) + h * 0.38]);
  }
  pts.push([x0 + w, y0], [x0, y0]);
  const mass = polyPath(g, pts);
  body(g, mass, [118, 110, 98], [x0, y0, x0 + w, y0 + h], { lw: 1.8, ao: 4 });
  clipped(g, mass, () => {
    mottle(g, r, [x0, y0, x0 + w, y0 + h], [118, 110, 98], 90, w * 0.04, 30, 0.45);
    // grønt øverst (græsbræmme)
    g.fillStyle = 'rgba(96,128,64,.5)';
    g.fillRect(x0, y0, w, h * 0.22);
    mottle(g, r, [x0, y0, x0 + w, y0 + h * 0.3], [88, 126, 58], 30, w * 0.05, 18, 0.5);
    for (let i = 0; i < 9; i++) {
      const x = x0 + r() * w;
      const y = y0 + h * (0.25 + r() * 0.5);
      const s = w * (0.04 + r() * 0.05);
      pebble(g, r, x, y, s, shift([124, 116, 104], (r() - 0.5) * 30));
    }
  });
  // skumlinje langs klippefoden
  for (let i = 0; i <= n; i++) {
    const [px, py] = pts[i]!;
    foam(g, r, px - w / n, py - 1, w / n * 2, 12, 5, 0.9);
  }
  for (let i = 0; i < 5; i++) pebble(g, r, x0 + r() * w, y0 + h * (0.8 + r() * 0.15), w * (0.025 + r() * 0.025), ROCK);
}

const coastKind = (key: string, name: string, w: number, h: number, stack: boolean): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: 0, bleed: 0.03, tags: ['water', 'harbor', 'mountain'], draw: (g, o) => coastCliff(g, o.w, o.h, o.seed, stack) });

/** Strandsten og tang. */
const strand = (key: string, name: string, w: number, h: number, kelp: boolean, stones: number): ObjectKind =>
  kind({
    key, family: FAM, name, w, h, shadow: 0, bleed: 0.05, randomRotation: true, sizeJitter: 0.25, tags: ['water', 'harbor', 'desert'],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { w: W, h: H } = o;
      if (kelp) {
        for (let s = 0; s < 6; s++) {
          let x = (r() - 0.5) * W * 0.6;
          let y = (r() - 0.5) * H * 0.6;
          let a = r() * 6.283;
          const col: RGB = shift([78, 82, 36], (r() - 0.5) * 30);
          g.lineCap = 'round';
          g.lineJoin = 'round';
          const pts: [number, number][] = [[x, y]];
          for (let k = 0; k < 6; k++) { a += (r() - 0.5) * 1.3; x += Math.cos(a) * W * 0.07; y += Math.sin(a) * W * 0.07; pts.push([x, y]); }
          for (const [c, lw, d] of [['rgba(18,14,6,.7)', 5, 0.8], [rgb(col), 3.4, 0], [rgb(shift(col, 30), 0.6), 1.2, -0.5]] as const) {
            g.beginPath();
            pts.forEach((p, i) => (i ? g.lineTo(p[0] + d, p[1] + d) : g.moveTo(p[0] + d, p[1] + d)));
            g.strokeStyle = c;
            g.lineWidth = lw;
            g.stroke();
          }
          for (const p of pts) if (r() < 0.5) dome(g, p[0], p[1], 1.6, 1.6, shift(col, 24), { lw: 0.5 });
        }
      }
      const list: [number, number, number][] = [];
      for (let i = 0; i < stones; i++) list.push([(r() - 0.5) * W * 0.85, (r() - 0.5) * H * 0.85, Math.min(W, H) * (0.05 + r() * 0.09)]);
      list.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
      for (const [x, y, s] of list) pebble(g, r, x, y, s, shift([156, 146, 128], (r() - 0.5) * 50));
      // muslingeskaller
      for (let i = 0; i < 3; i++) dome(g, (r() - 0.5) * W * 0.8, (r() - 0.5) * H * 0.8, 3, 2.4, [240, 226, 206], { lw: 0.6 });
    },
  });

/** Drivtømmer: afblegede stammer med knaster og afbarkede ender. */
const driftwood = (key: string, name: string, w: number, h: number, logs: number): ObjectKind =>
  kind({
    key, family: FAM, name, w, h, shadow: 8, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['water', 'harbor', 'desert', 'forest'],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { w: W, h: H } = o;
      for (let i = 0; i < logs; i++) {
        const len = W * (0.6 + r() * 0.35);
        const th = H * (0.2 + r() * 0.12) / Math.sqrt(logs);
        const cx = (r() - 0.5) * W * 0.12;
        const cy = (i - (logs - 1) / 2) * H * 0.34 / Math.sqrt(logs) + (r() - 0.5) * 4;
        const rot = (r() - 0.5) * 0.5;
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        const col: RGB = shift([186, 170, 144], (r() - 0.5) * 30);
        const p = rectPath(g, -len / 2, -th / 2, len, th, th * 0.5);
        body(g, p, col, [-len / 2, -th / 2, len / 2, th / 2], { lw: 1.4, ao: th * 0.2 });
        clipped(g, p, () => {
          woodGrain(g, r, [-len / 2, -th / 2, len / 2, th / 2], col, { lines: 8, contrast: 0.8, knots: 1 });
        });
        // afbarkede ender med årringe
        for (const sx of [-1, 1]) {
          g.fillStyle = rgb(shift(col, 14));
          g.beginPath();
          g.ellipse(sx * (len / 2 - th * 0.3), 0, th * 0.3, th * 0.45, 0, 0, 7);
          g.fill();
          g.strokeStyle = 'rgba(60,40,24,.5)';
          g.lineWidth = 0.7;
          g.beginPath();
          g.ellipse(sx * (len / 2 - th * 0.3), 0, th * 0.17, th * 0.28, 0, 0, 7);
          g.stroke();
        }
        if (r() < 0.7) limb(g, [[len * (r() - 0.5) * 0.4, 0], [len * (r() - 0.5) * 0.5, (r() < 0.5 ? -1 : 1) * th * 1.1]], th * 0.28, col);
        g.restore();
      }
    },
  });

/** Skibsvrag: kølbjælke med spanter, planker og knækket mast set oppefra. */
function wreck(g: G, w: number, h: number, seed: number, part: 'ribs' | 'bow' | 'mast'): void {
  const r = rng(seed);
  const wood: RGB = [110, 80, 52];
  const x0 = -w / 2;
  const yy = 0;
  if (part === 'mast') {
    const len = w * 0.92;
    const th = h * 0.14;
    const p = rectPath(g, -len / 2, -th / 2, len, th, th * 0.45);
    body(g, p, [136, 100, 62], [-len / 2, -th / 2, len / 2, th / 2], { lw: 1.6, ao: th * 0.2 });
    clipped(g, p, () => woodGrain(g, r, [-len / 2, -th / 2, len / 2, th / 2], wood, { lines: 8, knots: 1 }));
    // splintret ende
    g.fillStyle = rgb(shift(wood, 30));
    g.beginPath();
    g.moveTo(-len / 2, -th / 2);
    for (let i = 0; i < 5; i++) g.lineTo(-len / 2 - th * (0.2 + r() * 0.5), -th / 2 + ((i + 0.5) / 5) * th);
    g.lineTo(-len / 2, th / 2);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(20,10,4,.8)';
    g.lineWidth = 1.2;
    g.stroke();
    // bom, rigning og sejlstykker
    const bm = rectPath(g, -len * 0.05, -h * 0.34, th * 0.5, h * 0.68, 2);
    body(g, bm, [124, 90, 56], [-len * 0.05, -h * 0.34, -len * 0.05 + th * 0.5, h * 0.34], { lw: 1.2, ao: 1 });
    const sail = polyPath(g, [[-len * 0.05 + th * 0.5, -h * 0.32], [len * 0.22, -h * 0.26], [len * 0.2 + r() * 8, h * 0.0], [len * 0.08, h * 0.3], [-len * 0.05 + th * 0.5, h * 0.32]]);
    body(g, sail, [208, 196, 168], [-len * 0.05, -h * 0.32, len * 0.22, h * 0.32], { lw: 1.2, ao: 3, alpha: 0.96 });
    clipped(g, sail, () => {
      g.strokeStyle = 'rgba(60,40,20,.25)';
      for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(-len * 0.05, -h * 0.32 + i * h * 0.11); g.lineTo(len * 0.25, -h * 0.28 + i * h * 0.1); g.stroke(); }
      mottle(g, r, [-len * 0.05, -h * 0.32, len * 0.22, h * 0.32], [190, 176, 140], 10, 5, 20, 0.4);
    });
    for (let i = 0; i < 3; i++) limb(g, [[len * 0.3, (i - 1) * th], [len * 0.4, (i - 1) * th * 3 + (r() - 0.5) * 6], [len * 0.46, (i - 1) * th * 5]], 1.6, [150, 130, 90]);
    return;
  }
  // kølbjælke
  const keelH = h * 0.1;
  const keel = rectPath(g, x0, yy - keelH / 2, w, keelH, keelH * 0.3);
  const ribN = part === 'ribs' ? 9 : 6;
  // planker på den ene side, som mangler i stykker
  for (const side of [-1, 1]) {
    for (let i = 0; i < ribN; i++) {
      const t = (i + 0.5) / ribN;
      const x = x0 + t * w;
      // spant buer ud fra kølen
      const reach = (part === 'bow' ? h * (0.46 - Math.abs(t - 0.5) * 0.0) * Math.sin(Math.min(1, (1 - t * 0.9)) * 1.6) : h * 0.46 * Math.sin(Math.PI * (0.12 + t * 0.76)));
      const rc = reach * (0.85 + r() * 0.2) * (side < 0 && part === 'ribs' && i % 4 === 3 ? 0.55 : 1);
      limb(g, [[x, yy], [x + side * 0, yy + side * rc * 0.5], [x + (t - 0.5) * -2, yy + side * rc]], Math.max(3, w * 0.025), shift(wood, (r() - 0.5) * 24));
    }
    // plankegang langs spantenderne (de bevarede)
    for (let k = 0; k < 3; k++) {
      const a = 0.12 + k * 0.28 + r() * 0.05;
      const b = a + 0.12 + r() * 0.14;
      const ex = (t: number): number => h * 0.46 * Math.sin(Math.PI * (0.12 + t * 0.76)) * (part === 'bow' ? 0.9 : 1);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 6; i++) { const t = a + ((b - a) * i) / 6; pts.push([x0 + t * w, yy + side * ex(t) * 0.97]); }
      limb(g, pts, Math.max(3.2, h * 0.04), shift(wood, 10 + (r() - 0.5) * 24));
    }
  }
  body(g, keel, [128, 94, 58], [x0, -keelH / 2, x0 + w, keelH / 2], { lw: 1.6, ao: keelH * 0.2 });
  clipped(g, keel, () => woodGrain(g, r, [x0, -keelH / 2, x0 + w, keelH / 2], wood, { lines: 6 }));
  // tovværk, krukkeskår, tang
  for (let i = 0; i < 4; i++) pebble(g, r, (r() - 0.5) * w * 0.8, (r() - 0.5) * h * 0.8, w * (0.015 + r() * 0.02), [124, 110, 90]);
  if (part === 'bow') {
    // stævnstykke: spids stævn med figur
    const tip = polyPath(g, [[x0, -keelH * 0.7], [x0 - w * 0.09, 0], [x0, keelH * 0.7]]);
    body(g, tip, [132, 98, 60], [x0 - w * 0.09, -keelH, x0, keelH], { lw: 1.4, ao: 1 });
  }
}

const wreckKind = (key: string, name: string, w: number, h: number, part: 'ribs' | 'bow' | 'mast'): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: 8, bleed: 0.05, randomRotation: false, tags: ['water', 'harbor', 'ruin'], draw: (g, o) => wreck(g, o.w, o.h, o.seed, part) });

const WF_PARAM: ParamDef[] = [];
void WF_PARAM; void param; void rr;

export const waterKinds: ObjectKind[] = [
  wf('waterx_waterfall_big', 'Vandfald, stort', 5, 7, 0.46, 4, true, true),
  wf('waterx_waterfall_slim', 'Vandfald, smalt', 3, 6, 0.26, 3, true, true),
  wf('waterx_waterfall_small', 'Lille vandfald', 3, 4, 0.34, 2, false, false),
  wf('waterx_waterfall_cascade', 'Vandfald i trin', 4, 7, 0.4, 6, true, false),
  kind({ key: 'waterx_rapids_a', family: FAM, name: 'Stryg i å, med sten', w: 3, h: 5, shadow: 0, bleed: 0.02, tags: ['forest', 'mountain', 'grassland'], draw: (g, o) => rapids(o.w, o.h, g, o.seed, 6, [96, 112, 72]) }),
  kind({ key: 'waterx_rapids_b', family: FAM, name: 'Vildt stryg', w: 3, h: 5, shadow: 0, bleed: 0.02, tags: ['mountain', 'forest'], draw: (g, o) => rapids(o.w, o.h, g, o.seed + 9, 11, [112, 106, 92]) }),
  kind({ key: 'waterx_rapids_wide', family: FAM, name: 'Bred å, rolig stryg', w: 5, h: 4, shadow: 0, bleed: 0.02, tags: ['grassland', 'forest', 'farm'], draw: (g, o) => rapids(o.w, o.h, g, o.seed + 4, 4, [104, 122, 70]) }),
  pondKind('waterx_pond_lilies', 'Dam med åkander', 4, 3.4, 9, 12, false, false, ['forest', 'grassland', 'swamp', 'farm']),
  pondKind('waterx_pond_reeds', 'Dam med siv og dunhammer', 3.4, 3, 2, 22, false, true, ['swamp', 'forest', 'grassland']),
  pondKind('waterx_pond_muddy', 'Mudret vandhul', 3, 2.6, 0, 10, true, false, ['grassland', 'farm', 'poor']),
  pondKind('waterx_pond_small', 'Lille tjern', 2.4, 2, 4, 8, false, false, ['forest', 'grassland']),
  bogKind('waterx_bog_hole', 'Sumphul', 3, 2.6, 'hole', ['swamp', 'forest']),
  bogKind('waterx_bog_flooded', 'Forsumpet bred', 4, 3, 'flooded', ['swamp', 'grassland']),
  bogKind('waterx_spring', 'Kildevæld', 2.2, 2, 'spring', ['forest', 'mountain', 'grassland']),
  tidepool,
  coastKind('waterx_coast_cliff', 'Kystklippe', 5, 3, false),
  coastKind('waterx_coast_stack', 'Kystklippe med skær', 5, 3.4, true),
  strand('waterx_beach_stones', 'Strandsten', 2.4, 1.8, false, 14),
  strand('waterx_beach_kelp', 'Tang og sten på stranden', 2.4, 1.8, true, 7),
  driftwood('waterx_driftwood_one', 'Drivtømmer', 2.4, 1.1, 1),
  driftwood('waterx_driftwood_pile', 'Drivtømmer, bunke', 2.6, 1.8, 4),
  wreckKind('waterx_wreck_ribs', 'Vrag, spanter', 5, 2.6, 'ribs'),
  wreckKind('waterx_wreck_bow', 'Vrag, stævn', 4, 2.4, 'bow'),
  wreckKind('waterx_wreck_mast', 'Vrag, knækket mast med sejl', 4, 2, 'mast'),
];
void lin; void ellipsePath; void mossPatch;
