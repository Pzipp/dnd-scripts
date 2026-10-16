import { gapRanges, pathLength, pathOf, pointAt, solidPieces, subPath, type Pt } from '../model/walls';
import type { Layer, MapDoc, Opening, OpeningKind, Wall, WallStyle } from '../model/types';
import { CELL_PX } from '../model/types';
import { rng, rgb, shift, type RGB } from '../objects/util';
import { drawLine } from './lines';
import { FULL_PROFILE, type QualityProfile } from './quality';
import { drawShapeFill } from './shapeFill';

export interface WallStyleDef {
  key: WallStyle;
  label: string;
  /** Standardtykkelse i felter. */
  thickness: number;
  fill: RGB;
  outline: RGB;
  joint: RGB;
  /** Skyggens afstand i verdenspixels ved højde 0. */
  shadow: number;
  /** Overskrift i vælgeren. */
  group: string;
  /** Rigtig mur (kan have døre og vinduer). Andre linjer (stier, broer, kløfter, hegn) tegnes af `lines.ts`. */
  solid: boolean;
}

export const WALL_STYLES: WallStyleDef[] = [
  { key: 'stone', label: 'Stenmur', thickness: 0.4, fill: [150, 148, 140], outline: [40, 38, 36], joint: [84, 82, 78], shadow: 16, group: 'Mure', solid: true },
  { key: 'brick', label: 'Murstensmur', thickness: 0.4, fill: [170, 96, 72], outline: [52, 28, 22], joint: [100, 52, 40], shadow: 16, group: 'Mure', solid: true },
  { key: 'wood', label: 'Trævæg', thickness: 0.3, fill: [140, 100, 62], outline: [42, 26, 14], joint: [80, 54, 30], shadow: 12, group: 'Mure', solid: true },
  { key: 'cave', label: 'Grottevæg, brun', thickness: 1, fill: [104, 84, 66], outline: [28, 20, 14], joint: [60, 46, 36], shadow: 14, group: 'Grotte', solid: true },
  { key: 'cave_dark', label: 'Grottevæg, mørk', thickness: 1, fill: [70, 58, 74], outline: [18, 12, 22], joint: [40, 32, 44], shadow: 14, group: 'Grotte', solid: true },
  { key: 'cave_ice', label: 'Grottevæg, is', thickness: 1, fill: [150, 180, 200], outline: [40, 62, 84], joint: [100, 130, 154], shadow: 12, group: 'Grotte', solid: true },
  { key: 'hedge', label: 'Hæk', thickness: 0.7, fill: [54, 106, 44], outline: [28, 62, 28], joint: [30, 70, 30], shadow: 10, group: 'Hæk og hegn', solid: true },
  { key: 'path_dirt', label: 'Jordsti', thickness: 1.2, fill: [152, 118, 78], outline: [96, 70, 44], joint: [120, 92, 60], shadow: 0, group: 'Stier', solid: false },
  { key: 'path_gravel', label: 'Grussti', thickness: 1.2, fill: [168, 160, 144], outline: [110, 104, 92], joint: [130, 124, 110], shadow: 0, group: 'Stier', solid: false },
  { key: 'path_cobble', label: 'Brostenssti', thickness: 1.2, fill: [132, 128, 122], outline: [40, 36, 32], joint: [60, 56, 50], shadow: 3, group: 'Stier', solid: false },
  { key: 'bridge_wood', label: 'Træbro', thickness: 1.5, fill: [150, 108, 66], outline: [42, 26, 14], joint: [80, 54, 30], shadow: 12, group: 'Broer', solid: false },
  { key: 'bridge_stone', label: 'Stenbro', thickness: 1.6, fill: [150, 148, 140], outline: [40, 38, 36], joint: [84, 82, 78], shadow: 14, group: 'Broer', solid: false },
  { key: 'bridge_rope', label: 'Rebbro', thickness: 1.2, fill: [136, 104, 70], outline: [40, 26, 14], joint: [90, 64, 38], shadow: 10, group: 'Broer', solid: false },
  { key: 'cliff', label: 'Klippekant', thickness: 1.5, fill: [120, 104, 88], outline: [30, 24, 18], joint: [70, 58, 48], shadow: 0, group: 'Kløft og klippe', solid: false },
  { key: 'ravine', label: 'Kløft', thickness: 2, fill: [120, 104, 88], outline: [30, 24, 18], joint: [70, 58, 48], shadow: 0, group: 'Kløft og klippe', solid: false },
  { key: 'fence', label: 'Hegn', thickness: 0.35, fill: [140, 100, 62], outline: [42, 26, 14], joint: [80, 54, 30], shadow: 6, group: 'Hæk og hegn', solid: false },
];
export const wallStyle = (k: WallStyle): WallStyleDef => WALL_STYLES.find((s) => s.key === k) ?? WALL_STYLES[0]!;

export const OPENING_KINDS: { key: OpeningKind; label: string; width: number }[] = [
  { key: 'opening', label: 'Åbning', width: 1 },
  { key: 'door', label: 'Dør', width: 1 },
  { key: 'double_door', label: 'Dobbeltdør', width: 2 },
  { key: 'gate', label: 'Port', width: 2 },
  { key: 'window', label: 'Vindue', width: 1 },
];

const WOOD: RGB = [150, 108, 66];

function strokePath(g: CanvasRenderingContext2D, pts: Pt[], close = false): void {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  if (close) g.closePath();
}

/** Prøver langs et stykke linje: (punkt, retning) for hver `step` pixels. */
function along(piece: Pt[], step: number, jitter: (() => number) | null, visit: (x: number, y: number, tx: number, ty: number, s: number, len: number) => void): void {
  const total = pathLength(piece);
  let s = 0;
  while (s < total) {
    const len = jitter ? step * (0.75 + jitter() * 0.6) : step;
    const mid = pointAt(piece, Math.min(total, s + len / 2));
    visit(mid.x, mid.y, mid.tx, mid.ty, s, Math.min(len, total - s));
    s += len;
  }
}

function drawBody(g: CanvasRenderingContext2D, wall: Wall, layer: Layer, doc: Pick<MapDoc, 'lightAngle'>, deviceScale: number): void {
  const def = wallStyle(wall.style);
  if (!def.solid) {
    drawLine(g, wall, layer, doc, deviceScale);
    return;
  }
  const t = wall.thickness;
  const path = pathOf(wall);
  if (path.length < 2) return;
  const cuts = gapRanges(wall);
  const closedWhole = wall.closed && wall.points.length > 2 && cuts.length === 0;
  const pieces = closedWhole ? [wall.points.map((p) => [p[0], p[1]] as Pt)] : solidPieces(path, cuts);
  const R = rng(wall.seed);
  const outlineW = Math.max(2, t * 0.12);

  // 1) skygge og kontur
  g.save();
  const dist = def.shadow + layer.height * 6;
  const a = (doc.lightAngle * Math.PI) / 180;
  g.shadowColor = 'rgba(0,0,0,0.4)';
  g.shadowBlur = dist * 0.5 * deviceScale;
  g.shadowOffsetX = -Math.cos(a) * dist * deviceScale;
  g.shadowOffsetY = -Math.sin(a) * dist * deviceScale;
  g.lineJoin = wall.style === 'hedge' || wall.style.startsWith('cave') ? 'round' : 'miter';
  g.miterLimit = 3;
  g.lineCap = 'butt';
  g.strokeStyle = rgb(def.outline);
  g.lineWidth = t + outlineW * 2;
  for (const p of pieces) {
    strokePath(g, p, closedWhole);
    g.stroke();
  }
  g.restore();

  // 2) selve muren
  g.lineJoin = wall.style === 'hedge' || wall.style.startsWith('cave') ? 'round' : 'miter';
  g.miterLimit = 3;
  g.lineCap = 'butt';
  g.strokeStyle = rgb(def.fill);
  g.lineWidth = t;
  for (const p of pieces) {
    strokePath(g, p, closedWhole);
    g.stroke();
  }

  // 3) struktur
  for (const raw of pieces) {
    const piece = closedWhole ? [...raw, raw[0]!] : raw;
    if (wall.style === 'stone' || wall.style === 'brick') {
      const block = wall.style === 'stone' ? Math.max(14, t * 1.6) : Math.max(10, t * 1.1);
      along(piece, block, R, (x, y, tx, ty, s, len) => {
        // hver blok får sin egen nuance
        const sub = subPath(piece, s, s + len);
        g.strokeStyle = rgb(shift(def.fill, (R() - 0.5) * 26));
        g.lineWidth = t * 0.9;
        g.lineCap = 'butt';
        g.lineJoin = 'round';
        strokePath(g, sub);
        g.stroke();
        // fuge på tværs i begyndelsen af blokken
        const st = pointAt(piece, s);
        g.strokeStyle = rgb(def.joint);
        g.lineWidth = Math.max(1, t * 0.05);
        g.beginPath();
        if (wall.style === 'brick') {
          const half = s % 2 < 1 ? -1 : 1; // forskudte fuger i to rækker
          g.moveTo(st.x - st.ty * t * 0.45 * half, st.y + st.tx * t * 0.45 * half);
          g.lineTo(st.x, st.y);
        } else {
          g.moveTo(st.x - st.ty * t * 0.44, st.y + st.tx * t * 0.44);
          g.lineTo(st.x + st.ty * t * 0.44, st.y - st.tx * t * 0.44);
        }
        g.stroke();
        void x;
        void y;
        void tx;
        void ty;
      });
      if (wall.style === 'brick') {
        g.strokeStyle = rgb(def.joint, 0.7);
        g.lineWidth = Math.max(1, t * 0.05);
        strokePath(g, piece);
        g.stroke();
      }
    } else if (wall.style === 'wood') {
      const plank = Math.max(5, t * 0.45);
      along(piece, plank, null, (x, y, tx, ty, _s, len) => {
        g.strokeStyle = rgb(shift(def.fill, (R() - 0.5) * 30));
        g.lineWidth = len + 0.6;
        g.lineCap = 'butt';
        g.beginPath();
        g.moveTo(x - ty * t * 0.48, y + tx * t * 0.48);
        g.lineTo(x + ty * t * 0.48, y - tx * t * 0.48);
        g.stroke();
        g.strokeStyle = rgb(def.joint, 0.55);
        g.lineWidth = Math.max(0.8, t * 0.03);
        g.beginPath();
        g.moveTo(x - tx * len * 0.5 - ty * t * 0.48, y - ty * len * 0.5 + tx * t * 0.48);
        g.lineTo(x - tx * len * 0.5 + ty * t * 0.48, y - ty * len * 0.5 - tx * t * 0.48);
        g.stroke();
      });
    } else if (wall.style === 'cave' || wall.style === 'cave_dark' || wall.style === 'cave_ice') {
      // klippevæg: overlappende, kantede sten med lyse kanter mod lyset
      const ice = wall.style === 'cave_ice';
      along(piece, Math.max(8, t * 0.34), R, (x, y, tx, ty) => {
        for (let k = 0; k < 3; k++) {
          const off = (R() - 0.5) * t * 0.62;
          const cx = x - ty * off + (R() - 0.5) * t * 0.2;
          const cy = y + tx * off + (R() - 0.5) * t * 0.2;
          const rr = t * (0.2 + R() * 0.22);
          const n = 6 + Math.floor(R() * 3);
          const rot = R() * 6.28;
          const pts: Pt[] = [];
          for (let i = 0; i < n; i++) {
            const a = rot + (i / n) * Math.PI * 2;
            const d = rr * (0.7 + R() * 0.5);
            pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85]);
          }
          const tone = (R() - 0.5) * 34;
          const grad = g.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr);
          grad.addColorStop(0, rgb(shift(def.fill, tone + 30)));
          grad.addColorStop(0.55, rgb(shift(def.fill, tone)));
          grad.addColorStop(1, rgb(shift(def.fill, tone - 34)));
          g.fillStyle = grad;
          strokePath(g, pts, true);
          g.fill();
          g.strokeStyle = rgb(def.outline, 0.8);
          g.lineWidth = Math.max(1, t * 0.035);
          g.stroke();
          if (ice) {
            g.strokeStyle = 'rgba(255,255,255,.5)';
            g.lineWidth = Math.max(0.8, t * 0.025);
            g.beginPath();
            g.moveTo(pts[0]![0], pts[0]![1]);
            g.lineTo(pts[1]![0], pts[1]![1]);
            g.stroke();
          }
        }
      });
    } else {
      // hæk: klumper af blade
      along(piece, Math.max(6, t * 0.32), R, (x, y, tx, ty) => {
        for (let k = 0; k < 2; k++) {
          const off = (R() - 0.5) * t * 0.5;
          const rr = t * (0.3 + R() * 0.25);
          const cx = x - ty * off;
          const cy = y + tx * off;
          g.fillStyle = rgb(shift(def.fill, -14 + R() * 20 + k * 22));
          g.beginPath();
          g.arc(cx, cy, rr, 0, Math.PI * 2);
          g.fill();
        }
      });
    }
    // 4) afskåret kant (så en ende ser færdig ud)
    if (!closedWhole) {
      for (const end of [piece[0]!, piece.at(-1)!]) {
        const d = end === piece[0]! ? pointAt(piece, 0) : pointAt(piece, pathLength(piece));
        g.strokeStyle = rgb(def.outline);
        g.lineWidth = outlineW;
        g.beginPath();
        g.moveTo(end[0] - d.ty * (t / 2 + outlineW), end[1] + d.tx * (t / 2 + outlineW));
        g.lineTo(end[0] + d.ty * (t / 2 + outlineW), end[1] - d.tx * (t / 2 + outlineW));
        g.stroke();
      }
    }
    // 5) let lys kant
    g.strokeStyle = 'rgba(255,255,255,.1)';
    g.lineWidth = t * 0.55;
    g.lineCap = 'butt';
    strokePath(g, piece, closedWhole);
    g.stroke();
  }
}

function leaf(g: CanvasRenderingContext2D, len: number, thick: number, col: RGB): void {
  g.fillStyle = rgb(col);
  g.fillRect(0, -thick / 2, len, thick);
  g.strokeStyle = 'rgba(30,18,8,.9)';
  g.lineWidth = Math.max(1, thick * 0.18);
  g.strokeRect(0, -thick / 2, len, thick);
  g.strokeStyle = 'rgba(30,18,8,.35)';
  g.lineWidth = Math.max(0.6, thick * 0.08);
  g.beginPath();
  g.moveTo(len * 0.5, -thick / 2);
  g.lineTo(len * 0.5, thick / 2);
  g.stroke();
}

/** Tegner en åbning (dør, port, vindue …) i muren. */
export function drawOpening(g: CanvasRenderingContext2D, wall: Wall, o: Opening, layer: Layer, doc: Pick<MapDoc, 'lightAngle'>, deviceScale: number): void {
  const c = pointAt(pathOf(wall), o.at);
  const t = wall.thickness;
  const w = o.width;
  const side = o.flip ? -1 : 1;
  g.save();
  g.translate(c.x, c.y);
  g.rotate(Math.atan2(c.ty, c.tx));
  const dist = 5 + layer.height * 3;
  const a = (doc.lightAngle * Math.PI) / 180;
  const shadowOn = () => {
    g.shadowColor = 'rgba(0,0,0,.35)';
    g.shadowBlur = dist * 0.5 * deviceScale;
    g.shadowOffsetX = -Math.cos(a) * dist * deviceScale;
    g.shadowOffsetY = -Math.sin(a) * dist * deviceScale;
  };
  const shadowOff = () => {
    g.shadowColor = 'transparent';
  };

  if (o.kind === 'window') {
    g.fillStyle = 'rgb(150,192,214)';
    g.fillRect(-w / 2, -t * 0.3, w, t * 0.6);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(-w / 2, -t * 0.3, w, t * 0.18);
    g.strokeStyle = 'rgba(30,24,20,.95)';
    g.lineWidth = Math.max(1, t * 0.1);
    g.strokeRect(-w / 2, -t * 0.3, w, t * 0.6);
    g.beginPath();
    g.moveTo(0, -t * 0.3);
    g.lineTo(0, t * 0.3);
    g.stroke();
    g.restore();
    return;
  }

  // dørkarm i begge sider af hullet
  g.fillStyle = 'rgb(48,40,34)';
  for (const sx of [-1, 1]) g.fillRect(sx * (w / 2) - (sx > 0 ? 0 : t * 0.14), -t / 2 - 1, t * 0.14, t + 2);

  if (o.kind === 'opening') {
    g.fillStyle = 'rgba(0,0,0,.07)';
    g.fillRect(-w / 2, -t / 2, w, t);
  } else if (o.kind === 'door') {
    if (o.open) {
      // åben dør: bladet står vinkelret på muren med hængsel i den ene ende
      g.save();
      g.translate(-w / 2, 0);
      g.rotate((side * Math.PI) / 2);
      shadowOn();
      leaf(g, w - 2, t * 0.5, WOOD);
      shadowOff();
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,.18)';
      g.lineWidth = Math.max(0.8, t * 0.05);
      g.setLineDash([4, 4]);
      g.beginPath();
      g.arc(-w / 2, 0, w - 2, side > 0 ? 0 : -Math.PI / 2, side > 0 ? Math.PI / 2 : 0);
      g.stroke();
      g.setLineDash([]);
    } else {
      g.save();
      g.translate(-w / 2 + 1, 0);
      shadowOn();
      leaf(g, w - 2, t * 0.6, WOOD);
      shadowOff();
      g.restore();
      g.fillStyle = 'rgb(214,170,60)';
      g.beginPath();
      g.arc(w / 2 - w * 0.14, 0, Math.max(1.5, t * 0.07), 0, Math.PI * 2);
      g.fill();
    }
  } else if (o.kind === 'double_door') {
    const half = w / 2 - 1;
    for (const sx of [-1, 1]) {
      g.save();
      g.translate(sx * (w / 2), 0);
      if (o.open) {
        // bladene svinger ud fra hver sin ende
        g.rotate(side * (sx > 0 ? -Math.PI / 2 : Math.PI / 2));
        if (sx > 0) g.scale(-1, 1);
      } else if (sx > 0) g.scale(-1, 1);
      shadowOn();
      leaf(g, half, t * (o.open ? 0.5 : 0.6), WOOD);
      shadowOff();
      g.restore();
    }
  } else if (o.kind === 'gate') {
    const bars = (len: number, thick: number) => {
      g.fillStyle = 'rgba(40,40,44,.15)';
      g.fillRect(0, -thick / 2, len, thick);
      g.strokeStyle = 'rgb(58,58,64)';
      g.lineWidth = Math.max(1, thick * 0.14);
      g.strokeRect(0, -thick / 2, len, thick);
      const n = Math.max(3, Math.round(len / 9));
      g.lineWidth = Math.max(0.8, thick * 0.1);
      g.beginPath();
      for (let i = 1; i < n; i++) {
        g.moveTo((len * i) / n, -thick / 2);
        g.lineTo((len * i) / n, thick / 2);
      }
      g.moveTo(0, 0);
      g.lineTo(len, 0);
      g.stroke();
    };
    shadowOn();
    if (o.open) {
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * (w / 2), 0);
        g.rotate(side * (sx > 0 ? Math.PI * 1.5 : Math.PI / 2));
        if (sx > 0) g.scale(1, -1);
        bars(w / 2 - 1, t * 0.4);
        g.restore();
      }
    } else {
      g.save();
      g.translate(-w / 2, 0);
      bars(w, t * 0.5);
      g.restore();
    }
    shadowOff();
  }
  g.restore();
}

export function drawWallsLayer(g: CanvasRenderingContext2D, layer: Layer, doc: Pick<MapDoc, 'lightAngle'>, deviceScale: number, q: QualityProfile = FULL_PROFILE): void {
  // først alle udfyldninger (former), så kanterne og murene oven på
  for (const wall of layer.walls ?? []) if (wall.fill) drawShapeFill(g, wall, Math.min(q.ground, deviceScale));
  for (const wall of layer.walls ?? []) {
    if (wall.stroke !== false) drawBody(g, wall, layer, doc, deviceScale);
    for (const o of wall.openings) drawOpening(g, wall, o, layer, doc, deviceScale);
  }
}

export const defaultThickness = (style: WallStyle): number => wallStyle(style).thickness * CELL_PX;
