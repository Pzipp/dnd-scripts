import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, vary } from '../pack3/common';
import { dome, foldCloth, openBook, BRASS, WOOD, WOOD_DARK } from './props';
import { pick } from './kit';

/** Musikinstrumenter set oppefra: harpe, orgel, trommer, lut, violin, fløjte, horn og cembalo. */

const STRING = 'rgba(244,236,210,.92)';

function harp(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // lyd-kasse (buet) nederst, søjle og hals set oppefra
  const wood: RGB = pick(r, [[150, 100, 56], [112, 70, 40], [176, 130, 74]] as RGB[]);
  const col = rectPath(g, W * 0.26, -H * 0.46, W * 0.14, H * 0.9, 4);
  body(g, col, shift(wood, -10), [W * 0.26, -H * 0.46, W * 0.4, H * 0.44], { lw: 1.5, ao: 1.6, rim: 1.2 });
  // lydkasse: smal, afrundet, langs venstre side
  const sb = () => {
    g.beginPath();
    g.moveTo(-W * 0.42, H * 0.46);
    g.quadraticCurveTo(-W * 0.5, -H * 0.1, -W * 0.3, -H * 0.5);
    g.lineTo(-W * 0.12, -H * 0.5);
    g.quadraticCurveTo(-W * 0.2, -H * 0.1, -W * 0.14, H * 0.46);
    g.closePath();
  };
  body(g, sb, wood, [-W * 0.5, -H * 0.5, -W * 0.1, H * 0.46], { lw: 1.7, ao: 2.4, rim: 1.6 });
  clipped(g, sb, () => {
    g.strokeStyle = 'rgba(30,14,4,.3)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.moveTo(-W * 0.5, -H * 0.45 + i * H * 0.08);
      g.lineTo(-W * 0.1, -H * 0.45 + i * H * 0.08 + (r() - 0.5) * 2);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) dome(g, -W * 0.28 + (r() - 0.5) * 2, -H * 0.2 + i * H * 0.1, 1.8, 1.8, [40, 24, 12], 0.4);
  });
  // krum hals foroven
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.22, -H * 0.5);
    g.quadraticCurveTo(0, -H * 0.58, W * 0.33, -H * 0.46);
  }, W * 0.1, wood, { outline: 1.4 });
  // strenge
  const n = Math.round(param(o, 'strings', 14));
  g.strokeStyle = STRING;
  g.lineWidth = 0.9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    g.beginPath();
    g.moveTo(-W * 0.2 + t * W * 0.08, H * 0.42 - t * H * 0.8 + H * 0.02);
    g.lineTo(W * 0.3, -H * 0.4 + t * H * 0.8 * 0.0 + (1 - t) * H * 0.0 + (t - 0.5) * H * 0.02);
    g.stroke();
  }
  for (let i = 0; i < n; i++) dome(g, W * 0.3, -H * 0.4 + (i / (n - 1)) * H * 0.8, 1.4, 1.4, BRASS, 0.4);
}

function organ(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // skabet set oppefra med piberne som cirkler i rækker (de højeste i midten)
  woodRect(g, r, -W / 2, -H / 2, W, H * 0.74, [100, 66, 38], { vertical: false, count: 5, rad: 4 });
  const rows = 3;
  const cols = Math.max(7, Math.round(W / 16));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = -W * 0.45 + ((W * 0.9) * (i + 0.5)) / cols;
      const y = -H * 0.42 + j * H * 0.19 + (j === 1 ? H * 0.02 : 0);
      const t = Math.abs(i - (cols - 1) / 2) / (cols / 2);
      const rad = Math.min(W / cols * 0.4, H * 0.085) * (1 - t * 0.35);
      g.beginPath();
      g.arc(x, y, rad, 0, 7);
      g.fillStyle = radial(g, x, y, rad, [[0, 'rgb(234,230,218)'], [0.6, 'rgb(176,172,168)'], [1, 'rgb(96,94,100)']], x - rad * 0.3, y - rad * 0.3, 0.5);
      g.fill();
      g.beginPath();
      g.arc(x, y, rad * 0.7, 0, 7);
      g.fillStyle = 'rgba(14,8,6,.85)';
      g.fill();
      g.strokeStyle = 'rgba(14,8,6,.8)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.arc(x, y, rad, 0, 7);
      g.stroke();
    }
  }
  // klaviaturet
  rectBody(g, -W * 0.3, H * 0.18, W * 0.6, H * 0.14, 2, [72, 46, 28], { lw: 1.4, ao: 1.2 });
  g.fillStyle = 'rgb(240,234,214)';
  const keys = 20;
  for (let i = 0; i < keys; i++) {
    g.fillRect(-W * 0.28 + (i * W * 0.56) / keys + 0.4, H * 0.2, (W * 0.56) / keys - 0.8, H * 0.1);
  }
  g.fillStyle = 'rgb(30,22,20)';
  for (let i = 0; i < keys; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) g.fillRect(-W * 0.28 + ((i + 0.65) * W * 0.56) / keys, H * 0.2, (W * 0.56) / keys * 0.6, H * 0.06);
  // bænk
  rectBody(g, -W * 0.14, H * 0.36, W * 0.28, H * 0.12, 3, [128, 88, 52], { lw: 1.4, ao: 1.2, rim: 1 });
}

function kettleDrum(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // kedel (kobber) med skind og snor-spænding
  ellBody(g, 0, 0, S * 0.46, S * 0.46, [176, 104, 56], { lw: 1.7, ao: 4, rim: 2 });
  g.beginPath();
  g.arc(0, 0, S * 0.4, 0, 7);
  g.fillStyle = radial(g, 0, 0, S * 0.4, [[0, 'rgb(244,232,200)'], [0.9, 'rgb(214,196,156)'], [1, 'rgb(170,150,110)']], -S * 0.1, -S * 0.1, 1);
  g.fill();
  g.strokeStyle = 'rgba(80,60,30,.6)';
  g.lineWidth = 1;
  g.stroke();
  // spændeskruer langs kanten
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283;
    tube(g, () => {
      g.beginPath();
      g.moveTo(Math.cos(a) * S * 0.4, Math.sin(a) * S * 0.4);
      g.lineTo(Math.cos(a) * S * 0.48, Math.sin(a) * S * 0.48);
    }, S * 0.035, BRASS, { outline: 0.8 });
  }
  g.strokeStyle = 'rgba(90,70,40,.25)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(0, 0, S * 0.2, 0, 7);
  g.stroke();
  // trommestikker
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(-S * 0.05 + s * S * 0.07, -S * 0.1);
      g.lineTo(S * 0.18 + s * S * 0.07, S * 0.14 + (r() - 0.5) * 4);
    }, S * 0.03, [196, 160, 100], { outline: 0.8 });
    ellBody(g, S * 0.18 + s * S * 0.07, S * 0.14, S * 0.03, S * 0.03, [176, 140, 80], { lw: 0.7, ao: 0.1 });
  }
}

function drumSet(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const sizes = [0.3, 0.22, 0.26];
  sizes.forEach((q, i) => {
    const x = -W * 0.3 + i * W * 0.3;
    const y = (i % 2 ? 1 : -1) * H * 0.08;
    const R = Math.min(W, H) * q;
    ellBody(g, x, y, R, R, [112, 72, 42], { lw: 1.5, ao: 3, rim: 1.6 });
    g.beginPath();
    g.arc(x, y, R * 0.86, 0, 7);
    g.fillStyle = radial(g, x, y, R, [[0, 'rgb(244,232,200)'], [1, 'rgb(196,176,136)']], x - R * 0.2, y - R * 0.2, 1);
    g.fill();
    // snore (zig-zag) rundt
    g.strokeStyle = 'rgba(120,80,40,.9)';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const a = (k / 16) * 6.283;
      const rr = k % 2 ? R * 0.9 : R * 1.0;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.stroke();
  });
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.12, H * 0.4);
    g.lineTo(W * 0.1, H * 0.34);
  }, 2.6, [190, 150, 90], { outline: 0.8 });
  void r;
}

function lute(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const wood: RGB = pick(r, [[186, 130, 70], [150, 96, 52], [210, 170, 110]] as RGB[]);
  // hals og hovedstok forneden/oven (hovedstok bøjet bagud)
  tube(g, () => {
    g.beginPath();
    g.moveTo(0, -H * 0.05);
    g.lineTo(0, -H * 0.38);
  }, W * 0.17, [70, 46, 28], { outline: 1.2 });
  polyBody(g, [[-W * 0.1, -H * 0.38], [W * 0.1, -H * 0.38], [W * 0.1, -H * 0.5], [-W * 0.1, -H * 0.5]], [60, 40, 24], { lw: 1.2, ao: 0.8, rim: 0.6 });
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) ellBody(g, s * W * 0.14, -H * 0.46 + i * H * 0.025, W * 0.035, W * 0.03, [226, 220, 200], { lw: 0.7, ao: 0.1 });
  // skålformet krop (halvpære)
  const bp = () => {
    g.beginPath();
    g.moveTo(0, -H * 0.06);
    g.bezierCurveTo(W * 0.5, -H * 0.04, W * 0.48, H * 0.48, 0, H * 0.5);
    g.bezierCurveTo(-W * 0.48, H * 0.48, -W * 0.5, -H * 0.04, 0, -H * 0.06);
    g.closePath();
  };
  body(g, bp, wood, [-W / 2, -H * 0.06, W / 2, H * 0.5], { lw: 1.6, ao: 4, rim: 2.2 });
  clipped(g, bp, () => {
    g.strokeStyle = 'rgba(70,36,10,.45)';
    g.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      g.beginPath();
      g.moveTo(0, -H * 0.05);
      g.quadraticCurveTo(i * W * 0.1, H * 0.2, i * W * 0.08, H * 0.5);
      g.stroke();
    }
  });
  // rosette og bro
  ellBody(g, 0, H * 0.14, W * 0.13, W * 0.13, [40, 24, 14], { lw: 1, ao: 1 });
  g.strokeStyle = rgb(wood);
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, H * 0.14, W * 0.09, 0, 7);
  g.stroke();
  rectBody(g, -W * 0.14, H * 0.32, W * 0.28, H * 0.035, 1, [70, 44, 26], { lw: 0.9, ao: 0.3 });
  g.strokeStyle = STRING;
  g.lineWidth = 0.7;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * W * 0.03, -H * 0.4);
    g.lineTo(i * W * 0.05, H * 0.33);
    g.stroke();
  }
}

function fiddle(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const wood: RGB = pick(r, [[170, 100, 48], [140, 78, 38], [196, 130, 70]] as RGB[]);
  g.save();
  g.translate(-W * 0.12, 0);
  const bp = () => {
    g.beginPath();
    g.moveTo(-W * 0.16, -H * 0.08);
    g.bezierCurveTo(-W * 0.2, -H * 0.2, W * 0.2, -H * 0.2, W * 0.16, -H * 0.08);
    g.bezierCurveTo(W * 0.08, -H * 0.02, W * 0.08, H * 0.04, W * 0.16, H * 0.1);
    g.bezierCurveTo(W * 0.26, H * 0.34, -W * 0.26, H * 0.34, -W * 0.16, H * 0.1);
    g.bezierCurveTo(-W * 0.08, H * 0.04, -W * 0.08, -H * 0.02, -W * 0.16, -H * 0.08);
    g.closePath();
  };
  tube(g, () => {
    g.beginPath();
    g.moveTo(0, -H * 0.1);
    g.lineTo(0, -H * 0.42);
  }, W * 0.06, [50, 32, 20], { outline: 1 });
  ellBody(g, 0, -H * 0.46, W * 0.06, H * 0.05, wood, { lw: 1, ao: 0.6 });
  body(g, bp, wood, [-W * 0.26, -H * 0.2, W * 0.26, H * 0.34], { lw: 1.5, ao: 3, rim: 1.6 });
  for (const s of [-1, 1]) {
    g.strokeStyle = 'rgba(10,6,2,.85)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(s * W * 0.06, -H * 0.02);
    g.quadraticCurveTo(s * W * 0.12, H * 0.08, s * W * 0.06, H * 0.2);
    g.stroke();
  }
  g.strokeStyle = STRING;
  g.lineWidth = 0.7;
  for (let i = -1; i <= 1; i += 0.67) {
    g.beginPath();
    g.moveTo(i * W * 0.015, -H * 0.4);
    g.lineTo(i * W * 0.025, H * 0.24);
    g.stroke();
  }
  rectBody(g, -W * 0.06, H * 0.2, W * 0.12, H * 0.05, 1, [40, 28, 20], { lw: 0.8, ao: 0.2 });
  g.restore();
  // bue
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.3, -H * 0.4);
    g.quadraticCurveTo(W * 0.34, 0, W * 0.3, H * 0.42);
  }, W * 0.024, [90, 60, 36], { outline: 0.8 });
  g.strokeStyle = 'rgba(240,230,200,.8)';
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(W * 0.296, -H * 0.4);
  g.lineTo(W * 0.296, H * 0.42);
  g.stroke();
}

function flute(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const t = param(o, 'type', 'flute');
  g.save();
  g.rotate((r() - 0.5) * 0.3);
  if (t === 'horn') {
    // hornet krummer i en spiral
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = 3.6 + (i / 24) * 4.4;
      const rad = (0.1 + (i / 24) * 0.34) * Math.min(W, H);
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.9]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const wd = (0.02 + (i / 24) * 0.09) * Math.min(W, H);
      tube(g, () => {
        g.beginPath();
        g.moveTo(pts[i]![0], pts[i]![1]);
        g.lineTo(pts[i + 1]![0], pts[i + 1]![1]);
      }, wd * 2, [208, 196, 164], { outline: 1.2 });
    }
    ellBody(g, pts[24]![0], pts[24]![1], Math.min(W, H) * 0.1, Math.min(W, H) * 0.08, [36, 26, 20], { lw: 1, ao: 1 });
  } else {
    tube(g, () => {
      g.beginPath();
      g.moveTo(-W * 0.44, 0);
      g.lineTo(W * 0.44, 0);
    }, H * 0.2, t === 'flute' ? [186, 140, 80] : [92, 60, 36], { outline: 1.4 });
    for (let i = 0; i < 6; i++) ellBody(g, -W * 0.14 + i * W * 0.1, 0, H * 0.04, H * 0.04, [20, 12, 8], { lw: 0.6, ao: 0.2 });
    ellBody(g, -W * 0.34, 0, H * 0.05, H * 0.06, [20, 12, 8], { lw: 0.6, ao: 0.2 });
    for (const x of [-W * 0.42, W * 0.42]) dome(g, x, 0, H * 0.11, H * 0.11, BRASS, 0.8);
  }
  g.restore();
}

function harpsichord(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // vinge-formet kasse
  const bp = () => {
    g.beginPath();
    g.moveTo(-W * 0.48, -H * 0.5);
    g.lineTo(W * 0.1, -H * 0.5);
    g.bezierCurveTo(W * 0.3, -H * 0.5, W * 0.5, -H * 0.1, W * 0.46, H * 0.16);
    g.lineTo(W * 0.1, H * 0.34);
    g.lineTo(-W * 0.48, H * 0.34);
    g.closePath();
  };
  body(g, bp, [110, 70, 40], [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 4, rim: 2 });
  clipped(g, bp, () => {
    g.strokeStyle = 'rgba(30,14,4,.3)';
    g.lineWidth = 0.9;
    for (let i = 0; i < 18; i++) {
      g.beginPath();
      g.moveTo(-W / 2, -H * 0.5 + i * H * 0.05);
      g.lineTo(W / 2, -H * 0.5 + i * H * 0.05 + (r() - 0.5) * 2);
      g.stroke();
    }
    // dekoration
    g.strokeStyle = rgb(BRASS, 0.7);
    g.lineWidth = 1.2;
    g.strokeRect(-W * 0.43, -H * 0.44, W * 0.55, H * 0.72);
  });
  // klaviatur
  rectBody(g, -W * 0.44, H * 0.34, W * 0.5, H * 0.14, 2, [60, 38, 24], { lw: 1.3, ao: 1 });
  g.fillStyle = 'rgb(240,234,214)';
  for (let i = 0; i < 18; i++) g.fillRect(-W * 0.43 + (i * W * 0.48) / 18, H * 0.36, (W * 0.48) / 18 - 0.8, H * 0.1);
  // strenge/rosett under låget (åbent) og stol
  g.strokeStyle = STRING;
  g.lineWidth = 0.6;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    g.moveTo(-W * 0.4, -H * 0.4 + i * H * 0.045);
    g.lineTo(W * 0.1 + i * 2, -H * 0.4 + i * H * 0.045);
    g.stroke();
  }
  ellBody(g, -W * 0.2, H * 0.62, W * 0.1, W * 0.1, [128, 88, 52], { lw: 1.2, ao: 1, rim: 0.8 });
}

const T = { family: 'music', shadow: 4 } as const;
const tags = ['indoor', 'tavern', 'house', 'rich', 'city', 'temple'];

export const musicKinds: ObjectKind[] = [
  kind({ ...T, key: 'music_harp', name: 'Harpe', w: 1.2, h: 1.6, randomRotation: false, params: [{ key: 'strings', label: 'Strenge', type: 'range', min: 6, max: 22, step: 1, default: 14 }], tags, draw: harp }),
  kind({ ...T, key: 'music_organ', name: 'Orgel', w: 3.4, h: 2, shadow: 8, params: [], tags: [...tags, 'temple'], draw: organ }),
  kind({ ...T, key: 'music_kettle_drum', name: 'Paukedrum', w: 1, h: 1, randomRotation: true, params: [], tags: [...tags, 'military', 'battlefield'], draw: kettleDrum }),
  kind({ ...T, key: 'music_drum_set', name: 'Trommer', w: 2, h: 1, randomRotation: true, params: [], tags: [...tags, 'military', 'camp'], draw: drumSet }),
  kind({ ...T, key: 'music_lute', name: 'Lut', w: 0.7, h: 1.4, shadow: 3, randomRotation: true, params: [], tags, draw: lute }),
  kind({ ...T, key: 'music_fiddle', name: 'Violin med bue', w: 0.9, h: 1.3, shadow: 3, randomRotation: true, params: [], tags, draw: fiddle }),
  kind({ ...T, key: 'music_flute', name: 'Fløjte', w: 1.4, h: 0.3, shadow: 2, randomRotation: true, params: [{ key: 'type', label: 'Slags', type: 'select', default: 'flute', options: [{ value: 'flute', label: 'Fløjte' }, { value: 'pipe', label: 'Skalmeje' }, { value: 'horn', label: 'Horn' }] }], tags, draw: flute }),
  kind({ ...T, key: 'music_horn', name: 'Horn', w: 1, h: 1, shadow: 2, randomRotation: true, params: [{ key: 'type', label: 'Slags', type: 'select', default: 'horn', options: [{ value: 'horn', label: 'Horn' }, { value: 'flute', label: 'Fløjte' }, { value: 'pipe', label: 'Skalmeje' }] }], tags: [...tags, 'military'], draw: flute }),
  kind({ ...T, key: 'music_harpsichord', name: 'Cembalo', w: 2.2, h: 1.6, shadow: 7, params: [], tags: [...tags, 'rich'], draw: harpsichord }),
];
void foldCloth;
void openBook;
void WOOD;
void WOOD_DARK;
void vary;
void ellipsePath;
