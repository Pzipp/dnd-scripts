import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng, softDot } from '../util';
import { blobPath, body, ellBody, eye, mottle, pick, radial, rgb, shift, tone, tube, type G, type RGB, type Rnd } from './kit';
import { polyBody } from '../pack2/helpers';

/** Smådyr: fugle, gnavere, slanger, edderkopper, sværme, krebs og fisk, frøer og skygge-væsner. Alle set oppefra, hoved mod toppen. */

const sel = (key: string, label: string, list: [string, string][]): ParamDef => ({ key, label, type: 'select', default: list[0]![0], options: list.map(([value, l]) => ({ value, label: l })) });

// ---------------------------------------------------------------- fugle

interface BirdCfg {
  col: RGB;
  wing: RGB;
  belly?: RGB;
  head: RGB;
  beak: RGB;
  comb?: RGB;
  tail: 'fan' | 'wedge' | 'plume';
  tailCol: RGB;
  speckle?: RGB;
  bodyW: number;
  bodyL: number;
  headR: number;
  spread: number;
}

function feather(g: G, x: number, y: number, ang: number, len: number, wid: number, col: RGB): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const p = () => {
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -wid, len, -wid * 0.15);
    g.quadraticCurveTo(len * 1.02, 0, len, wid * 0.15);
    g.quadraticCurveTo(len * 0.5, wid, 0, 0);
    g.closePath();
  };
  body(g, p, col, [0, -wid, len, wid], { lw: 0.9, ao: 0.5, rim: 0.4, light: 16, dark: 22 });
  g.beginPath();
  g.moveTo(len * 0.05, 0);
  g.lineTo(len * 0.95, 0);
  g.strokeStyle = 'rgba(0,0,0,.22)';
  g.lineWidth = 0.6;
  g.stroke();
  g.restore();
}

function bird(g: G, o: DrawInput, c: BirdCfg): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const bx = 0;
  const by = H * 0.06;
  const rx = Math.min(W, H) * c.bodyW;
  const ry = H * c.bodyL;
  const hr = Math.min(W, H) * c.headR;
  const hy = by - ry - hr * 0.4;
  // hale
  if (c.tail === 'plume') {
    for (let i = -3; i <= 3; i++) {
      feather(g, bx + i * rx * 0.12, by + ry * 0.7, Math.PI / 2 + i * 0.3 + (r() - 0.5) * 0.1, H * 0.34 * (1 - Math.abs(i) * 0.08), rx * 0.34, tone(r, shift(c.tailCol, -Math.abs(i) * 6), 10));
    }
  } else if (c.tail === 'fan') {
    for (let i = -2; i <= 2; i++) feather(g, bx + i * rx * 0.1, by + ry * 0.75, Math.PI / 2 + i * 0.28, H * 0.26, rx * 0.3, shift(c.tailCol, i * 3));
  } else {
    for (let i = -1; i <= 1; i++) feather(g, bx + i * rx * 0.12, by + ry * 0.7, Math.PI / 2 + i * 0.1, H * 0.3, rx * 0.28, shift(c.tailCol, i * 4));
  }
  // vinger
  if (c.spread > 0.5) {
    const span = W / 2 - rx * 0.4;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const ang = s > 0 ? -0.18 + t * 0.9 : Math.PI + 0.18 - t * 0.9;
        const len = span * (1.02 - t * 0.28);
        feather(g, bx + s * rx * 0.55, by - ry * 0.35 + t * ry * 0.7, ang, len, rx * 0.34, shift(c.wing, -t * 10 + (r() - 0.5) * 8));
      }
    }
  }
  // krop
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.283;
    const front = Math.max(0, -Math.sin(a));
    pts.push([bx + Math.cos(a) * rx * (1 - front * 0.18), by + Math.sin(a) * ry]);
  }
  body(g, blobPath(g, pts), c.col, [bx - rx, by - ry, bx + rx, by + ry], { lw: 1.4, ao: rx * 0.16 });
  if (c.speckle) mottle(g, r, [bx - rx * 0.7, by - ry * 0.7, bx + rx * 0.7, by + ry * 0.7], c.speckle, 22, rx * 0.12, 24, 0.7);
  if (c.spread <= 0.5) {
    // sammenfoldede vinger langs siderne
    for (const s of [-1, 1]) {
      const wp = () => {
        g.beginPath();
        g.moveTo(bx + s * rx * 0.2, by - ry * 0.55);
        g.quadraticCurveTo(bx + s * rx * 1.08, by - ry * 0.2, bx + s * rx * 0.7, by + ry * 1.0);
        g.quadraticCurveTo(bx + s * rx * 0.2, by + ry * 0.7, bx + s * rx * 0.1, by - ry * 0.2);
        g.closePath();
      };
      body(g, wp, c.wing, [bx - rx, by - ry, bx + rx, by + ry], { lw: 1.2, ao: 0.9, rim: 0.5 });
      g.save();
      wp();
      g.clip();
      g.strokeStyle = 'rgba(0,0,0,.26)';
      g.lineWidth = 0.7;
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.moveTo(bx + s * rx * 0.1, by - ry * 0.3 + i * ry * 0.18);
        g.quadraticCurveTo(bx + s * rx * 0.7, by - ry * 0.25 + i * ry * 0.18, bx + s * rx * 0.95, by - ry * 0.05 + i * ry * 0.2);
        g.stroke();
      }
      g.restore();
    }
  } else {
    // skulderfjer
    for (const s of [-1, 1]) ellBody(g, bx + s * rx * 0.5, by - ry * 0.2, rx * 0.45, ry * 0.4, c.wing, { lw: 1, ao: 0.8, rim: 0.4 });
  }
  if (c.belly) mottle(g, r, [bx - rx * 0.3, by - ry * 0.2, bx + rx * 0.3, by + ry * 0.6], c.belly, 4, rx * 0.2, 10, 0.4);
  // hoved og næb
  polyBody(g, [[bx - hr * 0.32, hy - hr * 0.7], [bx + hr * 0.32, hy - hr * 0.7], [bx, hy - hr * 1.75]], c.beak, { lw: 1, ao: 0.4, rim: 0.3 });
  ellBody(g, bx, hy, hr, hr * 1.05, c.head, { lw: 1.3, ao: hr * 0.18 });
  if (c.comb) {
    for (let i = 0; i < 4; i++) ellBody(g, bx + (i - 1.5) * 0.001, hy - hr * 0.55 + i * hr * 0.42, hr * 0.3, hr * 0.26, c.comb, { lw: 0.9, ao: 0.3 });
    ellBody(g, bx, hy - hr * 1.0, hr * 0.14, hr * 0.28, c.comb, { lw: 0.7, ao: 0.2 });
  }
  eye(g, bx - hr * 0.7, hy - hr * 0.2, Math.max(0.9, hr * 0.2));
  eye(g, bx + hr * 0.7, hy - hr * 0.2, Math.max(0.9, hr * 0.2));
}

const HEN: RGB[] = [[232, 226, 212], [168, 108, 62], [54, 48, 48], [190, 150, 98], [210, 120, 60]];

function hen(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x31);
  const col = tone(r, pick(r, HEN), 8);
  bird(g, o, { col, wing: shift(col, -16), head: shift(col, 6), beak: [226, 168, 54], comb: [196, 40, 36], tail: 'fan', tailCol: shift(col, -30), speckle: r() < 0.4 ? shift(col, -50) : undefined, bodyW: 0.34, bodyL: 0.3, headR: 0.13, spread: 0 });
}
function rooster(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x32);
  const col = tone(r, pick(r, [[176, 92, 40], [218, 214, 204], [120, 70, 40]]), 8);
  bird(g, o, { col, wing: shift(col, -26), head: [196, 120, 50], beak: [226, 168, 54], comb: [204, 36, 34], tail: 'plume', tailCol: [36, 82, 74], bodyW: 0.34, bodyL: 0.28, headR: 0.12, spread: 0 });
}
function crow(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x33);
  const blk = param(o, 'tone', 'black');
  const col: RGB = blk === 'grey' ? tone(r, [96, 96, 102], 8) : tone(r, [34, 34, 42], 6);
  const flying = param(o, 'pose', 'perched') === 'flying';
  bird(g, o, { col, wing: shift(col, 8), head: shift(col, 6), beak: [62, 56, 50], tail: 'wedge', tailCol: shift(col, -6), bodyW: flying ? 0.14 : 0.3, bodyL: 0.28, headR: flying ? 0.07 : 0.13, spread: flying ? 1 : 0 });
}
function dove(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x34);
  const col = tone(r, pick(r, [[190, 190, 196], [234, 232, 226], [150, 150, 160]]), 8);
  const flying = param(o, 'pose', 'perched') === 'flying';
  bird(g, o, { col, wing: shift(col, -14), head: shift(col, 4), beak: [210, 170, 140], tail: 'fan', tailCol: shift(col, -20), belly: [236, 226, 226], bodyW: flying ? 0.14 : 0.3, bodyL: 0.28, headR: flying ? 0.07 : 0.12, spread: flying ? 1 : 0 });
}
function owl(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x35);
  const col = tone(r, [150, 118, 84], 14);
  const flying = param(o, 'pose', 'perched') === 'flying';
  bird(g, o, { col, wing: shift(col, -20), head: shift(col, 10), beak: [64, 52, 40], tail: 'wedge', tailCol: shift(col, -20), speckle: [236, 224, 196], bodyW: flying ? 0.15 : 0.32, bodyL: 0.3, headR: flying ? 0.09 : 0.2, spread: flying ? 1 : 0 });
}

function chicks(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x36);
  const n = Math.round(param(o, 'count', 5));
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * 0.4;
    const x = Math.cos(a) * o.w * d;
    const y = Math.sin(a) * o.h * d;
    const s = Math.min(o.w, o.h) * 0.12;
    g.save();
    g.translate(x, y);
    g.rotate(r() * 6.28);
    for (const q of [-1, 1]) ellBody(g, q * s * 0.55, s * 0.15, s * 0.5, s * 0.34, [250, 230, 120], { lw: 0.9, ao: 0.4, rim: 0.3 });
    ellBody(g, 0, 0, s * 0.78, s * 0.95, [252, 226, 96], { lw: 1.1, ao: s * 0.2 });
    ellBody(g, 0, -s * 0.9, s * 0.5, s * 0.5, [254, 232, 110], { lw: 1, ao: s * 0.15 });
    polyBody(g, [[-s * 0.14, -s * 1.28], [s * 0.14, -s * 1.28], [0, -s * 1.6]], [236, 150, 50], { lw: 0.7, ao: 0.1, rim: 0.1 });
    g.restore();
  }
}

// ---------------------------------------------------------------- gnavere og små pattedyr

function rat(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x41);
  const W = o.w;
  const H = o.h;
  const col = tone(r, pick(r, [[96, 84, 74], [64, 56, 52], [128, 108, 92], [150, 142, 134]]), 8);
  const tailC: RGB = [206, 150, 144];
  // hale
  const sw = (r() - 0.5) * W * 0.8;
  tube(g, () => {
    g.beginPath();
    g.moveTo(0, H * 0.3);
    g.bezierCurveTo(sw, H * 0.5, -sw * 0.6, H * 0.6, sw * 0.3, H * 0.5 + H * 0.02);
  }, Math.max(1.2, W * 0.07), tailC, { outline: 1 });
  // poter
  for (const s of [-1, 1]) for (const y of [-0.12, 0.2]) ellBody(g, s * W * 0.34, H * y, W * 0.1, W * 0.07, [200, 150, 140], { lw: 0.8, ao: 0.2 });
  // krop
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.283;
    const f = Math.max(0, -Math.sin(a));
    pts.push([Math.cos(a) * W * 0.33 * (1 - f * 0.45), H * 0.08 + Math.sin(a) * H * 0.26]);
  }
  body(g, blobPath(g, pts), col, [-W * 0.33, -H * 0.18, W * 0.33, H * 0.34], { lw: 1.3, ao: W * 0.05 });
  mottle(g, r, [-W * 0.25, -H * 0.1, W * 0.25, H * 0.3], col, 14, 1.4, 22, 0.6);
  // hoved
  const hy = -H * 0.3;
  polyBody(g, [[-W * 0.2, hy + H * 0.08], [W * 0.2, hy + H * 0.08], [0, hy - H * 0.2]], shift(col, 4), { lw: 1.2, ao: 1, rim: 0.4 });
  ellBody(g, 0, hy - H * 0.2, W * 0.05, W * 0.045, [226, 156, 150], { lw: 0.7, ao: 0.1 });
  for (const s of [-1, 1]) {
    ellBody(g, s * W * 0.22, hy + H * 0.05, W * 0.1, W * 0.1, [214, 160, 154], { lw: 1, ao: 0.4 });
    eye(g, s * W * 0.1, hy - H * 0.04, Math.max(0.8, W * 0.04));
  }
}

// ---------------------------------------------------------------- slanger

function snakePath(r: Rnd, W: number, H: number, coil: boolean, n = 70): { pts: [number, number][]; head: number } {
  const pts: [number, number][] = [];
  if (coil) {
    const turns = 2.2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const a = t * turns * 6.283 + 1;
      const rad = (0.46 - t * 0.38) * Math.min(W, H) * (1 + Math.sin(a * 0.9) * 0.04);
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    // halen yderst, hovedet i midten
    pts.reverse();
    return { pts, head: 0 };
  }
  const ph = r() * 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = -H * 0.48 + t * H * 0.96;
    const x = Math.sin(t * 6.283 * 1.6 + ph) * W * 0.34 * (0.45 + 0.55 * Math.sin(t * 3.1 + 0.6));
    pts.push([x, y]);
  }
  return { pts, head: 0 };
}

function snake(g: G, o: DrawInput, coil: boolean): void {
  const r = rng(o.seed ^ 0x51);
  const sp = param(o, 'species', 'green');
  const base: Record<string, RGB> = { green: [86, 128, 52], viper: [150, 128, 88], black: [40, 38, 40], coral: [196, 52, 44], sand: [200, 170, 110] };
  const col = tone(r, base[sp] ?? base.green!, 8);
  const { pts } = snakePath(r, o.w, o.h, coil);
  const n = pts.length;
  const width = (i: number) => {
    const t = i / (n - 1);
    const k = coil ? 1 - t : t;
    // hoved i starten (i=0), tyk midte, tynd hale
    const body = Math.min(1, 0.55 + Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.6);
    void k;
    return Math.min(o.w, o.h) * (coil ? 0.075 : 0.085) * (t < 0.04 ? 0.8 : body) * (1 - Math.max(0, t - 0.78) * 3.3);
  };
  // kontur, så krop, så mønster
  for (const pass of [0, 1, 2]) {
    for (let i = n - 1; i >= 0; i--) {
      const [x, y] = pts[i]!;
      const w = width(i);
      if (pass === 0) {
        g.fillStyle = 'rgba(20,10,5,.85)';
        g.beginPath();
        g.arc(x, y, w + 1.1, 0, 7);
        g.fill();
      } else if (pass === 1) {
        g.fillStyle = rgb(shift(col, i % 2 ? -4 : 2));
        g.beginPath();
        g.arc(x, y, w, 0, 7);
        g.fill();
        g.fillStyle = rgb(shift(col, 36), 0.5);
        g.beginPath();
        g.arc(x - w * 0.3, y - w * 0.3, w * 0.45, 0, 7);
        g.fill();
        g.fillStyle = rgb(shift(col, -46), 0.38);
        g.beginPath();
        g.arc(x + w * 0.35, y + w * 0.35, w * 0.55, 0, 7);
        g.fill();
      } else {
        // mønster
        if (sp === 'viper' && i % 6 < 3 && i > 4) {
          g.fillStyle = 'rgba(40,24,12,.7)';
          g.beginPath();
          g.ellipse(x, y, w * 0.55, w * 0.4, 0.8, 0, 7);
          g.fill();
        } else if (sp === 'coral' && i % 9 < 2 && i > 4) {
          g.fillStyle = i % 9 < 1 ? 'rgba(236,200,60,.95)' : 'rgba(20,16,16,.9)';
          g.beginPath();
          g.arc(x, y, w * 1.02, 0, 7);
          g.fill();
        } else if (sp === 'green' && i % 4 === 0) {
          g.fillStyle = 'rgba(210,214,120,.35)';
          g.beginPath();
          g.arc(x, y, w * 0.42, 0, 7);
          g.fill();
        } else if (i % 3 === 0) {
          g.fillStyle = 'rgba(0,0,0,.14)';
          g.beginPath();
          g.arc(x, y, w * 0.9, 0, 7);
          g.fill();
        }
      }
    }
  }
  // hoved
  const [hx, hy] = pts[0]!;
  const [nx, ny] = pts[3]!;
  const ang = Math.atan2(hy - ny, hx - nx);
  const hs = Math.min(o.w, o.h) * 0.1;
  g.save();
  g.translate(hx, hy);
  g.rotate(ang + Math.PI / 2);
  const hp = () => {
    g.beginPath();
    g.moveTo(0, -hs * 1.2);
    g.quadraticCurveTo(hs * 0.95, -hs * 0.6, hs * 0.8, hs * 0.4);
    g.quadraticCurveTo(0, hs * 0.9, -hs * 0.8, hs * 0.4);
    g.quadraticCurveTo(-hs * 0.95, -hs * 0.6, 0, -hs * 1.2);
    g.closePath();
  };
  body(g, hp, shift(col, 4), [-hs, -hs * 1.2, hs, hs], { lw: 1.2, ao: 1.2 });
  for (const s of [-1, 1]) eye(g, s * hs * 0.55, -hs * 0.45, Math.max(0.9, hs * 0.16), 'rgba(200,170,20,.98)');
  g.strokeStyle = 'rgba(210,40,50,.9)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, -hs * 1.2);
  g.lineTo(0, -hs * 1.8);
  g.lineTo(-hs * 0.3, -hs * 2.1);
  g.moveTo(0, -hs * 1.8);
  g.lineTo(hs * 0.3, -hs * 2.1);
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- leddyr

function legs(g: G, r: Rnd, n: number, reach: number, thick: number, col: RGB, jitter = 0.2): void {
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const a0 = (-0.9 + t * 2.4) * 1; // fra fremad til bagud (vinkel fra lodret)
      const ang = a0 + (r() - 0.5) * jitter;
      const sx = side * 3;
      const sy = -reach * 0.1 + t * reach * 0.3;
      const kx = sx + side * Math.cos(ang * 0.7) * reach * 0.55;
      const ky = sy - Math.sin(-ang) * reach * 0.5 - reach * 0.25;
      const fx = kx + side * reach * 0.35;
      const fy = sy + (t - 0.4) * reach * 1.2;
      tube(g, () => {
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(kx, ky);
        g.lineTo(fx, fy);
      }, thick, col, { outline: 1.2 });
    }
  }
}

function spider(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x61);
  const S = Math.min(o.w, o.h);
  const kindSel = param(o, 'species', 'black');
  const col: RGB = kindSel === 'tarantula' ? [96, 66, 44] : kindSel === 'green' ? [78, 112, 56] : kindSel === 'pale' ? [186, 176, 150] : [38, 32, 34];
  const reach = S * 0.46;
  legs(g, r, 4, reach, S * 0.032, shift(col, kindSel === 'tarantula' ? -4 : 4));
  if (kindSel === 'tarantula') {
    // hårede ben: korte strøg
    g.strokeStyle = 'rgba(190,140,90,.35)';
    g.lineWidth = 0.7;
    for (let i = 0; i < 80; i++) {
      const a = r() * 6.28;
      const d = S * (0.1 + r() * 0.35);
      g.beginPath();
      g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      g.lineTo(Math.cos(a) * d + 2, Math.sin(a) * d + 2);
      g.stroke();
    }
  }
  // bagkrop
  const ab = () => {
    g.beginPath();
    g.ellipse(0, S * 0.18, S * 0.17, S * 0.22, 0, 0, 7);
  };
  body(g, ab, col, [-S * 0.17, -S * 0.04, S * 0.17, S * 0.4], { lw: 1.6, ao: S * 0.03 });
  g.save();
  ab();
  g.clip();
  g.fillStyle = kindSel === 'pale' ? 'rgba(80,60,30,.35)' : kindSel === 'green' ? 'rgba(220,226,120,.35)' : 'rgba(200,30,30,.55)';
  if (kindSel === 'black') {
    // timeglasmærke
    g.beginPath();
    g.moveTo(-S * 0.05, S * 0.08);
    g.lineTo(S * 0.05, S * 0.08);
    g.lineTo(0, S * 0.18);
    g.lineTo(S * 0.05, S * 0.28);
    g.lineTo(-S * 0.05, S * 0.28);
    g.lineTo(0, S * 0.18);
    g.closePath();
    g.fill();
  } else {
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse(0, S * 0.06 + i * S * 0.08, S * 0.08 - i * S * 0.012, S * 0.025, 0, 0, 7);
      g.fill();
    }
  }
  g.fillStyle = radial(g, -S * 0.07, S * 0.06, S * 0.2, [[0, 'rgba(255,250,235,.35)'], [1, 'rgba(255,250,235,0)']]);
  g.fillRect(-S * 0.2, -S * 0.05, S * 0.4, S * 0.5);
  g.restore();
  // forkrop
  ellBody(g, 0, -S * 0.09, S * 0.12, S * 0.13, shift(col, 6), { lw: 1.4, ao: S * 0.02 });
  // øjne
  for (const [x, y, q] of [[-0.04, -0.14, 0.022], [0.04, -0.14, 0.022], [-0.075, -0.115, 0.016], [0.075, -0.115, 0.016], [-0.02, -0.17, 0.014], [0.02, -0.17, 0.014]] as [number, number, number][]) {
    g.fillStyle = 'rgba(235,190,60,.95)';
    g.beginPath();
    g.arc(x * S, y * S, q * S + 0.4, 0, 7);
    g.fill();
  }
  // giftklør
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.04, -S * 0.19);
      g.lineTo(s * S * 0.07, -S * 0.27);
    }, S * 0.03, shift(col, 14), { outline: 1 });
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.07, -S * 0.27);
      g.lineTo(s * S * 0.04, -S * 0.31);
    }, S * 0.014, [190, 170, 130], { outline: 0.8 });
  }
}

function scorpion(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x62);
  const S = Math.min(o.w, o.h);
  const col: RGB = param(o, 'tone', 'sand') === 'black' ? [44, 40, 44] : [176, 138, 78];
  legs(g, r, 4, S * 0.34, S * 0.026, shift(col, -6), 0.15);
  // hale (bøjet over ryggen)
  const tail: [number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    tail.push([Math.sin(t * 2.4 - 0.5) * S * 0.14, S * 0.14 + t * S * 0.22 - Math.sin(t * 3.1) * S * 0.12]);
  }
  for (let i = tail.length - 1; i >= 0; i--) ellBody(g, tail[i]![0], tail[i]![1] + S * 0.1, S * (0.06 - i * 0.003), S * 0.05, shift(col, -i * 3), { lw: 1.1, ao: 0.6 });
  polyBody(g, [[tail[6]![0] - S * 0.03, tail[6]![1] + S * 0.08], [tail[6]![0] + S * 0.03, tail[6]![1] + S * 0.08], [tail[6]![0], tail[6]![1] + S * 0.18]], [60, 30, 20], { lw: 0.9, ao: 0.2, rim: 0.2 });
  // krop
  ellBody(g, 0, 0, S * 0.12, S * 0.2, col, { lw: 1.5, ao: S * 0.03 });
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = 'rgba(30,16,6,.35)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(-S * 0.1, -S * 0.1 + i * S * 0.06);
    g.lineTo(S * 0.1, -S * 0.1 + i * S * 0.06);
    g.stroke();
  }
  // klosakse
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.07, -S * 0.18);
      g.lineTo(s * S * 0.2, -S * 0.3);
    }, S * 0.03, col, { outline: 1.1 });
    ellBody(g, s * S * 0.2, -S * 0.36, S * 0.07, S * 0.1, shift(col, 4), { lw: 1.3, ao: S * 0.02 });
    g.fillStyle = 'rgba(20,10,5,.7)';
    g.beginPath();
    g.moveTo(s * S * 0.2, -S * 0.34);
    g.lineTo(s * S * 0.2 + s * S * 0.02, -S * 0.44);
    g.lineTo(s * S * 0.17, -S * 0.34);
    g.fill();
  }
}

// ---------------------------------------------------------------- sværme

function swarm(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x71);
  const t = param(o, 'type', 'flies');
  const n = Math.round(param(o, 'density', 40));
  const R = Math.min(o.w, o.h) * 0.46;
  // blødt mørkt skær midt i sværmen
  g.fillStyle = radial(g, 0, 0, R, [[0, 'rgba(20,12,6,.22)'], [1, 'rgba(20,12,6,0)']]);
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fill();
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * R;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rot = r() * 6.28;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    if (t === 'rats') {
      const s = R * 0.13;
      const col = tone(r, pick(r, [[96, 84, 74], [64, 56, 52], [128, 108, 92]]), 8);
      tube(g, () => {
        g.beginPath();
        g.moveTo(0, s * 0.8);
        g.quadraticCurveTo((r() - 0.5) * s, s * 1.5, (r() - 0.5) * s * 1.4, s * 2);
      }, 1.2, [206, 150, 144], { outline: 0.8 });
      ellBody(g, 0, 0, s * 0.55, s * 0.8, col, { lw: 1, ao: 0.6 });
      ellBody(g, 0, -s * 0.85, s * 0.32, s * 0.4, shift(col, 4), { lw: 0.9, ao: 0.4 });
      ellBody(g, 0, -s * 1.2, s * 0.1, s * 0.1, [226, 156, 150], { lw: 0.5, ao: 0 });
    } else if (t === 'bats') {
      const s = R * 0.16;
      for (const q of [-1, 1]) {
        polyBody(g, [[0, -s * 0.1], [q * s * 1.1, -s * 0.5], [q * s * 0.9, -s * 0.05], [q * s * 0.6, s * 0.2], [q * s * 0.4, s * 0.0], [q * s * 0.2, s * 0.35]], [44, 36, 40], { lw: 0.9, ao: 0.4, rim: 0.2 });
      }
      ellBody(g, 0, 0, s * 0.18, s * 0.35, [58, 48, 50], { lw: 0.9, ao: 0.2 });
    } else {
      const s = t === 'locusts' ? R * 0.1 : t === 'bees' ? R * 0.07 : R * 0.05;
      const col: RGB = t === 'locusts' ? [136, 120, 52] : t === 'bees' ? [226, 176, 40] : [40, 36, 36];
      if (t !== 'locusts') {
        g.fillStyle = 'rgba(220,230,240,.45)';
        for (const q of [-1, 1]) {
          g.beginPath();
          g.ellipse(q * s * 0.7, -s * 0.1, s * 0.55, s * 0.22, q * 0.5, 0, 7);
          g.fill();
        }
      } else {
        g.fillStyle = 'rgba(170,150,90,.7)';
        for (const q of [-1, 1]) {
          g.beginPath();
          g.ellipse(q * s * 0.45, s * 0.2, s * 0.22, s * 0.85, q * 0.2, 0, 7);
          g.fill();
        }
      }
      ellBody(g, 0, 0, s * 0.38, s * 0.7, col, { lw: 0.8, ao: 0.2, rim: 0.2 });
      if (t === 'bees') {
        g.fillStyle = 'rgba(30,20,10,.85)';
        g.fillRect(-s * 0.36, -s * 0.02, s * 0.72, s * 0.16);
        g.fillRect(-s * 0.3, s * 0.34, s * 0.6, s * 0.14);
      }
      ellBody(g, 0, -s * 0.78, s * 0.26, s * 0.26, shift(col, -12), { lw: 0.6, ao: 0 });
    }
    g.restore();
  }
}

// ---------------------------------------------------------------- vandlevende

function fishShape(g: G, r: Rnd, x: number, y: number, len: number, rot: number, col: RGB, belly: RGB, spots: boolean, sway: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const wd = len * 0.17;
  // halefinne
  polyBody(g, [[0, len * 0.38], [-len * 0.2 + sway * len * 0.1, len * 0.62], [len * 0.2 + sway * len * 0.1, len * 0.62]], shift(col, -12), { lw: 0.9, ao: 0.4, rim: 0.3 });
  // brystfinner
  for (const s of [-1, 1]) polyBody(g, [[s * wd * 0.7, -len * 0.18], [s * wd * 1.9, -len * 0.04], [s * wd * 0.8, len * 0.04]], shift(col, -10), { lw: 0.8, ao: 0.3, rim: 0.2 });
  const p = () => {
    g.beginPath();
    g.moveTo(0, -len * 0.5);
    g.quadraticCurveTo(wd * 1.35, -len * 0.25, wd * 0.9 + sway * len * 0.02, len * 0.2);
    g.quadraticCurveTo(wd * 0.35, len * 0.4, 0, len * 0.42);
    g.quadraticCurveTo(-wd * 0.35, len * 0.4, -wd * 0.9 + sway * len * 0.02, len * 0.2);
    g.quadraticCurveTo(-wd * 1.35, -len * 0.25, 0, -len * 0.5);
    g.closePath();
  };
  body(g, p, col, [-wd * 1.3, -len * 0.5, wd * 1.3, len * 0.42], { lw: 1.2, ao: wd * 0.25 });
  g.save();
  p();
  g.clip();
  g.fillStyle = rgb(belly, 0.5);
  g.fillRect(-wd * 1.6, -len * 0.2, wd * 3.2, len * 0.1);
  // skæl
  g.strokeStyle = 'rgba(0,0,0,.16)';
  g.lineWidth = 0.6;
  for (let i = 0; i < 6; i++) {
    for (let j = -1; j <= 1; j++) {
      g.beginPath();
      g.arc(j * wd * 0.5, -len * 0.3 + i * len * 0.11, wd * 0.3, 0.2, Math.PI - 0.2);
      g.stroke();
    }
  }
  if (spots) mottle(g, r, [-wd, -len * 0.3, wd, len * 0.3], [40, 30, 20], 12, wd * 0.12, 8, 0.7);
  // rygfinne-stribe
  g.strokeStyle = rgb(shift(col, -40), 0.7);
  g.lineWidth = wd * 0.3;
  g.beginPath();
  g.moveTo(0, -len * 0.1);
  g.lineTo(0, len * 0.36);
  g.stroke();
  g.restore();
  for (const s of [-1, 1]) eye(g, s * wd * 0.55, -len * 0.38, Math.max(0.9, len * 0.028));
  g.restore();
}

function fish(g: G, o: DrawInput, school: boolean): void {
  const r = rng(o.seed ^ 0x81);
  const sp = param(o, 'species', 'carp');
  const cols: Record<string, [RGB, RGB, boolean]> = { carp: [[200, 120, 50], [236, 214, 170], false], trout: [[110, 124, 90], [220, 214, 190], true], pike: [[72, 100, 60], [214, 210, 170], true], koi: [[230, 230, 220], [255, 240, 220], false], dark: [[56, 64, 72], [150, 160, 170], false] };
  const [col, belly, spots] = cols[sp] ?? cols.carp!;
  const S = Math.min(o.w, o.h);
  if (!school) {
    fishShape(g, r, 0, 0, o.h * 0.94, (r() - 0.5) * 0.1, tone(r, col, 12), belly, spots, (r() - 0.5) * 2);
    if (sp === 'koi') mottle(g, r, [-S * 0.1, -S * 0.3, S * 0.1, S * 0.3], [220, 70, 40], 5, S * 0.05, 8, 0.95);
    return;
  }
  const n = Math.round(param(o, 'count', 5));
  const dir = (r() - 0.5) * 0.6;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * 0.34;
    fishShape(g, r, Math.cos(a) * o.w * d, Math.sin(a) * o.h * d, S * (0.3 + r() * 0.12), dir + (r() - 0.5) * 0.7, tone(r, col, 16), belly, spots, (r() - 0.5) * 2);
  }
}

function crayfish(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x82);
  const S = Math.min(o.w, o.h);
  const col = tone(r, param(o, 'tone', 'brown') === 'red' ? [190, 60, 40] : [98, 74, 52], 8);
  legs(g, r, 4, S * 0.3, S * 0.022, shift(col, -4), 0.2);
  // klosakse
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.07, -S * 0.2);
      g.lineTo(s * S * 0.2, -S * 0.34);
    }, S * 0.04, col, { outline: 1.1 });
    ellBody(g, s * S * 0.2, -S * 0.42, S * 0.09, S * 0.11, shift(col, 6), { lw: 1.2, ao: S * 0.02 });
    polyBody(g, [[s * S * 0.2 - s * S * 0.03, -S * 0.49], [s * S * 0.2 + s * S * 0.03, -S * 0.49], [s * S * 0.2, -S * 0.57]], shift(col, -8), { lw: 0.8, ao: 0.1, rim: 0.1 });
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.03, -S * 0.26);
      g.quadraticCurveTo(s * S * 0.12, -S * 0.42, s * S * 0.05, -S * 0.5);
    }, 1, [150, 120, 90], { outline: 0.6 });
  }
  // hale (halefinne)
  for (let i = 0; i < 5; i++) ellBody(g, 0, S * 0.04 + i * S * 0.065, S * (0.1 - i * 0.008), S * 0.04, shift(col, -i * 2), { lw: 1, ao: 0.5 });
  for (const s of [-1, 0, 1]) polyBody(g, [[s * S * 0.03, S * 0.36], [s * S * 0.08 + s * S * 0.04, S * 0.5], [s * S * 0.02 - s * S * 0.01, S * 0.5]], shift(col, -12), { lw: 0.8, ao: 0.2, rim: 0.2 });
  // skjold
  ellBody(g, 0, -S * 0.12, S * 0.12, S * 0.18, shift(col, 4), { lw: 1.3, ao: S * 0.025 });
  for (const s of [-1, 1]) eye(g, s * S * 0.06, -S * 0.27, Math.max(0.9, S * 0.018));
}

function frog(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x83);
  const S = Math.min(o.w, o.h);
  const sp = param(o, 'species', 'frog');
  const col = tone(r, sp === 'toad' ? [118, 96, 64] : [92, 142, 60], 10);
  // bagben
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.14, S * 0.1);
      g.lineTo(s * S * 0.4, S * 0.2);
      g.lineTo(s * S * 0.3, S * 0.42);
    }, S * 0.07, shift(col, -8), { outline: 1.3 });
    for (let i = -1; i <= 1; i++) tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.3, S * 0.42);
      g.lineTo(s * S * (0.3 + i * 0.06), S * 0.5);
    }, S * 0.018, shift(col, 8), { outline: 0.7 });
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.12, -S * 0.12);
      g.lineTo(s * S * 0.28, -S * 0.1);
      g.lineTo(s * S * 0.26, -S * 0.26);
    }, S * 0.045, shift(col, -4), { outline: 1.1 });
  }
  const bp = () => {
    g.beginPath();
    g.ellipse(0, 0, S * 0.2, S * 0.28, 0, 0, 7);
  };
  body(g, bp, col, [-S * 0.2, -S * 0.28, S * 0.2, S * 0.28], { lw: 1.4, ao: S * 0.03 });
  g.save();
  bp();
  g.clip();
  mottle(g, r, [-S * 0.2, -S * 0.28, S * 0.2, S * 0.28], sp === 'toad' ? [70, 52, 34] : [40, 90, 40], 12, S * 0.04, 14, 0.8);
  if (sp === 'toad') mottle(g, r, [-S * 0.18, -S * 0.2, S * 0.18, S * 0.2], [160, 130, 90], 14, S * 0.012, 8, 0.8);
  g.restore();
  // hoved og øjne
  ellBody(g, 0, -S * 0.26, S * 0.15, S * 0.12, shift(col, 4), { lw: 1.3, ao: S * 0.02 });
  for (const s of [-1, 1]) {
    ellBody(g, s * S * 0.09, -S * 0.32, S * 0.05, S * 0.05, shift(col, -6), { lw: 1, ao: 0.4 });
    ellBody(g, s * S * 0.09, -S * 0.32, S * 0.034, S * 0.034, [220, 180, 40], { lw: 0.6, ao: 0 });
    g.fillStyle = 'rgba(10,6,4,.95)';
    g.fillRect(s * S * 0.09 - S * 0.03, -S * 0.325, S * 0.06, S * 0.012);
  }
}

// ---------------------------------------------------------------- skygger

function shade(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x91);
  const R = Math.min(o.w, o.h) * 0.5;
  const eyeCol: RGB = ({ yellow: [255, 214, 70], red: [255, 70, 50], green: [120, 255, 110], blue: [130, 200, 255] } as Record<string, RGB>)[param(o, 'eyes', 'yellow')] ?? [255, 214, 70];
  const type = param(o, 'type', 'lurker');
  // mørk, ubestemmelig masse
  const blobs = type === 'pack' ? 0 : 7;
  g.fillStyle = radial(g, 0, 0, R, [[0, 'rgba(6,4,10,.9)'], [0.6, 'rgba(8,6,14,.6)'], [1, 'rgba(8,6,14,0)']]);
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fill();
  for (let i = 0; i < blobs; i++) {
    const a = r() * 6.283;
    const d = r() * R * 0.4;
    const s = R * (0.2 + r() * 0.22);
    g.fillStyle = radial(g, Math.cos(a) * d, Math.sin(a) * d, s, [[0, 'rgba(4,2,8,.95)'], [1, 'rgba(8,6,14,0)']]);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, 7);
    g.fill();
  }
  if (type === 'tendrils') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283 + r() * 0.4;
      const pts: [number, number][] = [];
      let x = Math.cos(a) * R * 0.2;
      let y = Math.sin(a) * R * 0.2;
      let ang = a;
      for (let k = 0; k < 8; k++) {
        ang += (r() - 0.5) * 0.9;
        x += Math.cos(ang) * R * 0.09;
        y += Math.sin(ang) * R * 0.09;
        pts.push([x, y]);
      }
      for (let k = 0; k < pts.length; k++) {
        const wd = R * 0.06 * (1 - k / pts.length) + 0.6;
        g.fillStyle = `rgba(6,4,10,${0.85 - k * 0.07})`;
        g.beginPath();
        g.arc(pts[k]![0], pts[k]![1], wd, 0, 7);
        g.fill();
      }
    }
  }
  // glødende øjne
  const eyes: [number, number, number][] = [];
  if (type === 'pack') {
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283;
      const d = 0.12 + r() * 0.34;
      eyes.push([Math.cos(a) * R * d * 2, Math.sin(a) * R * d * 2, R * (0.025 + r() * 0.02)]);
    }
  } else {
    const n = type === 'lurker' ? 2 : 2 + Math.floor(r() * 3) * 2;
    for (let i = 0; i < n; i += 2) {
      const cx = (r() - 0.5) * R * 0.5;
      const cy = (r() - 0.5) * R * 0.5;
      const gap = R * (0.1 + r() * 0.08) * (type === 'lurker' ? 1.3 : 0.8);
      const s = R * (type === 'lurker' ? 0.07 : 0.04 + r() * 0.03);
      eyes.push([cx - gap, cy, s], [cx + gap, cy, s]);
    }
  }
  for (const [x, y, s] of eyes) {
    softDot(g, x, y, s * 3.4, eyeCol, 0.5);
    g.fillStyle = rgb(eyeCol);
    g.beginPath();
    g.ellipse(x, y, s * 1.1, s * 0.62, 0, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(255,255,240,.9)';
    g.beginPath();
    g.ellipse(x, y, s * 0.5, s * 0.3, 0, 0, 7);
    g.fill();
  }
}

const farm = ['farm', 'village', 'outdoor', 'grassland'];
const C = { family: 'critter', shadow: 3, bleed: 0.05, randomRotation: true, sizeJitter: 0.08, keepAspect: false } as const;

export const critterKinds: ObjectKind[] = [
  kind({ ...C, key: 'critter_hen', name: 'Høne', w: 0.5, h: 0.6, params: [], tags: farm, draw: hen }),
  kind({ ...C, key: 'critter_rooster', name: 'Hane', w: 0.5, h: 0.75, params: [], tags: farm, draw: rooster }),
  kind({ ...C, key: 'critter_chicks', name: 'Kyllinger', w: 0.9, h: 0.9, params: [{ key: 'count', label: 'Antal', type: 'range', min: 2, max: 9, step: 1, default: 5 }], tags: farm, draw: chicks }),
  kind({ ...C, key: 'critter_raven', name: 'Ravn', w: 0.5, h: 0.7, params: [sel('tone', 'Fjerdragt', [['black', 'Sort'], ['grey', 'Gråkrage']]), sel('pose', 'Stilling', [['perched', 'Sidder'], ['flying', 'Flyver']])], tags: ['outdoor', 'forest', 'graveyard', 'battlefield', 'ruin', 'farm'], draw: crow }),
  kind({ ...C, key: 'critter_raven_fly', name: 'Ravn, flyvende', w: 1.5, h: 0.9, params: [sel('tone', 'Fjerdragt', [['black', 'Sort'], ['grey', 'Gråkrage']]), sel('pose', 'Stilling', [['flying', 'Flyver'], ['perched', 'Sidder']])], tags: ['outdoor', 'forest', 'graveyard', 'battlefield', 'ruin'], draw: crow }),
  kind({ ...C, key: 'critter_dove', name: 'Due', w: 0.4, h: 0.55, params: [sel('pose', 'Stilling', [['perched', 'Sidder'], ['flying', 'Flyver']])], tags: ['outdoor', 'city', 'village', 'temple'], draw: dove }),
  kind({ ...C, key: 'critter_owl', name: 'Ugle', w: 0.6, h: 0.75, params: [sel('pose', 'Stilling', [['perched', 'Sidder'], ['flying', 'Flyver']])], tags: ['outdoor', 'forest', 'ruin', 'graveyard', 'magic'], draw: owl }),
  kind({ ...C, key: 'critter_rat', name: 'Rotte', w: 0.35, h: 0.6, params: [], tags: ['dungeon', 'city', 'harbor', 'cave', 'poor', 'crypt'], draw: rat }),
  kind({ ...C, key: 'critter_snake', name: 'Slange', w: 0.9, h: 1.7, params: [sel('species', 'Art', [['green', 'Grøn'], ['viper', 'Hugorm'], ['black', 'Sort'], ['coral', 'Koral'], ['sand', 'Sand']])], tags: ['outdoor', 'swamp', 'desert', 'forest', 'cave', 'dungeon', 'ruin'], draw: (g, o) => snake(g, o, false) }),
  kind({ ...C, key: 'critter_snake_coil', name: 'Slange, sammenrullet', w: 1.1, h: 1.1, params: [sel('species', 'Art', [['viper', 'Hugorm'], ['green', 'Grøn'], ['black', 'Sort'], ['coral', 'Koral'], ['sand', 'Sand']])], tags: ['outdoor', 'swamp', 'desert', 'forest', 'cave', 'dungeon', 'ruin'], draw: (g, o) => snake(g, o, true) }),
  kind({ ...C, key: 'critter_spider', name: 'Kæmpeedderkop', w: 1.5, h: 1.5, params: [sel('species', 'Art', [['black', 'Sort'], ['tarantula', 'Behåret'], ['green', 'Grøn'], ['pale', 'Bleg']])], tags: ['dungeon', 'cave', 'forest', 'ruin', 'crypt', 'swamp'], draw: spider }),
  kind({ ...C, key: 'critter_scorpion', name: 'Skorpion', w: 1, h: 1.2, params: [sel('tone', 'Farve', [['sand', 'Sand'], ['black', 'Sort']])], tags: ['desert', 'cave', 'dungeon', 'outdoor'], draw: scorpion }),
  kind({ ...C, key: 'critter_swarm', name: 'Insektsværm', w: 1.4, h: 1.4, shadow: 0, params: [sel('type', 'Art', [['flies', 'Fluer'], ['bees', 'Bier'], ['locusts', 'Græshopper']]), { key: 'density', label: 'Tæthed', type: 'range', min: 12, max: 90, step: 2, default: 44 }], tags: ['outdoor', 'swamp', 'forest', 'dungeon', 'crypt', 'farm'], draw: swarm }),
  kind({ ...C, key: 'critter_swarm_rats', name: 'Rottesværm', w: 1.5, h: 1.5, params: [{ key: 'type', label: 'Art', type: 'select', default: 'rats', options: [{ value: 'rats', label: 'Rotter' }] }, { key: 'density', label: 'Tæthed', type: 'range', min: 6, max: 30, step: 1, default: 14 }], tags: ['dungeon', 'city', 'harbor', 'cave', 'crypt', 'poor'], draw: swarm }),
  kind({ ...C, key: 'critter_swarm_bats', name: 'Flagermussværm', w: 1.8, h: 1.8, shadow: 0, params: [{ key: 'type', label: 'Art', type: 'select', default: 'bats', options: [{ value: 'bats', label: 'Flagermus' }] }, { key: 'density', label: 'Tæthed', type: 'range', min: 5, max: 30, step: 1, default: 12 }], tags: ['cave', 'dungeon', 'crypt', 'ruin', 'outdoor'], draw: swarm }),
  kind({ ...C, key: 'critter_fish', name: 'Fisk', w: 0.35, h: 0.9, shadow: 0, params: [sel('species', 'Art', [['carp', 'Karpe'], ['trout', 'Ørred'], ['pike', 'Gedde'], ['koi', 'Koi'], ['dark', 'Mørk']])], tags: ['water', 'swamp', 'harbor', 'outdoor'], draw: (g, o) => fish(g, o, false) }),
  kind({ ...C, key: 'critter_fish_school', name: 'Fiskestime', w: 1.6, h: 1.6, shadow: 0, params: [sel('species', 'Art', [['carp', 'Karpe'], ['trout', 'Ørred'], ['pike', 'Gedde'], ['koi', 'Koi'], ['dark', 'Mørk']]), { key: 'count', label: 'Antal', type: 'range', min: 3, max: 12, step: 1, default: 6 }], tags: ['water', 'swamp', 'harbor', 'outdoor'], draw: (g, o) => fish(g, o, true) }),
  kind({ ...C, key: 'critter_crayfish', name: 'Flodkrebs', w: 0.9, h: 1.1, shadow: 0, params: [sel('tone', 'Farve', [['brown', 'Brun'], ['red', 'Rød']])], tags: ['water', 'swamp', 'harbor', 'outdoor'], draw: crayfish }),
  kind({ ...C, key: 'critter_frog', name: 'Frø', w: 0.6, h: 0.75, params: [sel('species', 'Art', [['frog', 'Frø'], ['toad', 'Tudse']])], tags: ['swamp', 'water', 'outdoor', 'forest'], draw: frog }),
  kind({ ...C, key: 'critter_shade', name: 'Skygge med glødende øjne', w: 1.4, h: 1.4, shadow: 0, params: [sel('type', 'Type', [['lurker', 'Lusker'], ['tendrils', 'Med følere'], ['pack', 'Mange øjne']]), sel('eyes', 'Øjne', [['yellow', 'Gule'], ['red', 'Røde'], ['green', 'Grønne'], ['blue', 'Blå']])], tags: ['dungeon', 'cave', 'crypt', 'magic', 'ruin'], draw: shade }),
  kind({ ...C, key: 'critter_shade_pack', name: 'Øjne i mørket', w: 1.8, h: 1.8, shadow: 0, params: [sel('type', 'Type', [['pack', 'Mange øjne'], ['lurker', 'Lusker']]), sel('eyes', 'Øjne', [['yellow', 'Gule'], ['red', 'Røde'], ['green', 'Grønne'], ['blue', 'Blå']])], tags: ['dungeon', 'cave', 'crypt', 'magic', 'ruin', 'forest'], draw: shade }),
];
