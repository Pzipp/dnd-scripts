import { pathLength, pathOf, pointAt, subPath, type Pt } from '../model/walls';
import type { Layer, MapDoc, Wall } from '../model/types';
import { rng, rgb, shift, type RGB } from '../objects/util';
import { rimShade, shadeOut } from './materials';
import { fbm, smoothstep, valueNoise } from './noise';
import { wallStyle } from './walls';

/**
 * Linjer uden åbninger: stier, broer, kløfter og hegn. De tegnes langs en vilkårlig linje af punkter; `wall.flip` vender den side,
 * en klippekant, bro eller kløft har sin "yderside" på. Samme tegning bruges i forhåndsvisning og eksport.
 */

type G = CanvasRenderingContext2D;

function line(g: G, pts: Pt[], close = false): void {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  if (close) g.closePath();
}

/** Samples langs linjen: (x, y, tangent, buelængde) for hver `step` pixels, med lidt tilfældig skridtlængde. */
function along(path: Pt[], step: number, R: (() => number) | null, visit: (x: number, y: number, tx: number, ty: number, s: number, seg: number) => void): void {
  const total = pathLength(path);
  let s = 0;
  while (s <= total) {
    const p = pointAt(path, s);
    visit(p.x, p.y, p.tx, p.ty, s, p.seg);
    s += R ? step * (0.7 + R() * 0.6) : step;
  }
}

/** Linjen forskudt `d` pixels ud til siden (positiv = til venstre for retningen); hjørner tages med gennemsnitlig normal. */
export function offsetPath(path: Pt[], d: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)]!;
    const b = path[Math.min(path.length - 1, i + 1)]!;
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    out.push([path[i]![0] + ty * d, path[i]![1] - tx * d]);
  }
  return out;
}

function shadowOn(g: G, layer: Layer, doc: Pick<MapDoc, 'lightAngle'>, deviceScale: number, dist0: number): void {
  const dist = dist0 + layer.height * 6;
  if (dist <= 0) return;
  const a = (doc.lightAngle * Math.PI) / 180;
  g.shadowColor = 'rgba(0,0,0,0.38)';
  g.shadowBlur = dist * 0.5 * deviceScale;
  g.shadowOffsetX = -Math.cos(a) * dist * deviceScale;
  g.shadowOffsetY = -Math.sin(a) * dist * deviceScale;
}
const shadowOff = (g: G): void => {
  g.shadowColor = 'transparent';
  g.shadowBlur = 0;
  g.shadowOffsetX = 0;
  g.shadowOffsetY = 0;
};

/** En blød, ujævn stribe (sti): kanten opløses i klumper. */
function softBand(g: G, path: Pt[], t: number, base: RGB, edge: RGB, R: () => number, speck: RGB[], dots: number): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = rgb(edge, 0.5);
  g.lineWidth = t * 1.02;
  line(g, path);
  g.stroke();
  g.strokeStyle = rgb(base);
  g.lineWidth = t * 0.86;
  line(g, path);
  g.stroke();
  // ujævn kant: klumper ud og ind
  along(path, Math.max(5, t * 0.16), R, (x, y, tx, ty) => {
    for (const side of [-1, 1]) {
      const off = side * t * (0.4 + R() * 0.16);
      const r = t * (0.08 + R() * 0.12);
      g.fillStyle = rgb(R() < 0.5 ? base : shift(base, -10), 1);
      g.beginPath();
      g.arc(x - ty * off, y + tx * off, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  // lysere midte
  g.strokeStyle = rgb(shift(base, 12), 0.45);
  g.lineWidth = t * 0.42;
  line(g, path);
  g.stroke();
  // korn
  along(path, Math.max(2.5, t * 0.05 / Math.max(0.2, dots)), R, (x, y, tx, ty) => {
    const off = (R() - 0.5) * t * 0.8;
    const c = speck[Math.floor(R() * speck.length)]!;
    g.fillStyle = rgb(c, 0.55);
    g.beginPath();
    g.arc(x - ty * off, y + tx * off, 0.6 + R() * 1.4, 0, Math.PI * 2);
    g.fill();
  });
}

function cobblePath(g: G, path: Pt[], t: number, R: () => number, base: RGB, mortar: RGB): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = rgb(mortar, 0.9);
  g.lineWidth = t * 0.98;
  line(g, path);
  g.stroke();
  const rows = Math.max(2, Math.round(t / 14));
  const rowW = t / rows;
  for (let r = 0; r < rows; r++) {
    const off = -t / 2 + rowW * (r + 0.5);
    const isEdge = r === 0 || r === rows - 1;
    along(path, rowW * 1.05, R, (x, y, tx, ty) => {
      if (isEdge && R() < 0.14) return;
      const ox = x - ty * off + (R() - 0.5) * 1.6;
      const oy = y + tx * off + (R() - 0.5) * 1.6;
      const w = rowW * (0.78 + R() * 0.3);
      const h = rowW * (0.72 + R() * 0.22);
      g.save();
      g.translate(ox, oy);
      g.rotate(Math.atan2(ty, tx));
      const tone = (R() - 0.5) * 34;
      g.fillStyle = rgb(shift(base, tone));
      g.beginPath();
      g.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.38);
      g.fill();
      g.fillStyle = 'rgba(255,250,235,.16)';
      g.beginPath();
      g.roundRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h * 0.4, Math.min(w, h) * 0.3);
      g.fill();
      g.strokeStyle = 'rgba(20,14,8,.5)';
      g.lineWidth = Math.max(0.6, rowW * 0.05);
      g.stroke();
      g.restore();
    });
  }
}

/** Planker på tværs af linjen (bro). */
function planks(g: G, path: Pt[], t: number, pw: number, R: () => number, base: RGB, joint: RGB, gap: number): void {
  along(path, pw, null, (x, y, tx, ty) => {
    g.save();
    g.translate(x, y);
    g.rotate(Math.atan2(ty, tx));
    g.fillStyle = rgb(shift(base, (R() - 0.5) * 30));
    g.fillRect(-pw / 2 + gap / 2, -t / 2, pw - gap, t);
    g.strokeStyle = rgb(joint, 0.55);
    g.lineWidth = Math.max(0.7, t * 0.02);
    g.beginPath();
    g.moveTo(-pw / 2 + gap / 2, -t / 2);
    g.lineTo(-pw / 2 + gap / 2, t / 2);
    g.moveTo(-pw * 0.1, -t * (0.4 - R() * 0.1));
    g.lineTo(pw * 0.2, -t * (0.4 - R() * 0.1));
    g.stroke();
    g.restore();
  });
}

function post(g: G, x: number, y: number, r: number, col: RGB): void {
  g.fillStyle = rgb(col);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(20,12,6,.8)';
  g.lineWidth = Math.max(0.8, r * 0.35);
  g.stroke();
}

/** Klippekant: stenet rand langs linjen og en mørk dybde til den ene side (eller begge for en kløft). */
function rock(g: G, path: Pt[], t: number, R: () => number, def: { fill: RGB; outline: RGB }, sides: (1 | -1)[], depth: number): void {
  // dybden: mørk, lysere nær kanten (skrå væg)
  for (const side of sides) {
    const centre = offsetPath(path, side * depth * 0.5);
    g.lineCap = 'butt';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgb(14,11,10)';
    g.lineWidth = depth;
    line(g, centre);
    g.stroke();
    // skrå væg: lys stribe nær kanten og mørkere ned mod dybden
    for (const [f, w, a, k] of [[0.1, 0.22, 1, 0.82], [0.28, 0.3, 0.85, 0.6], [0.55, 0.35, 0.6, 0.38]] as const) {
      g.strokeStyle = `rgba(${def.fill[0] * k | 0},${def.fill[1] * k | 0},${def.fill[2] * k | 0},${a})`;
      g.lineWidth = depth * w;
      line(g, offsetPath(path, side * depth * f));
      g.stroke();
    }
  }
  // kantsten
  for (const side of sides) {
    along(path, Math.max(9, t * 0.13), R, (x, y, tx, ty) => {
      const off = side * (R() * 4);
      const cx = x + ty * off;
      const cy = y - tx * off;
      const rr = 7 + R() * 8;
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
      grad.addColorStop(0, rgb(shift(def.fill, tone + 34)));
      grad.addColorStop(0.55, rgb(shift(def.fill, tone)));
      grad.addColorStop(1, rgb(shift(def.fill, tone - 36)));
      g.fillStyle = grad;
      line(g, pts, true);
      g.fill();
      g.strokeStyle = rgb(def.outline, 0.85);
      g.lineWidth = 1.1;
      g.stroke();
    });
  }
}

/** Tomrummets klippekant som linje: materialet bag grottekanterne, de tre `Tomrum`-materialer i paletten (id 19–21). */
const CAVE_RIM: Record<string, number> = { cave_rim: 19, cave_rim_purple: 20, cave_rim_ice: 21 };
/** Bredden (pixels) fra land til sort; samme som penslens `RIM_WIDTH`. */
const CAVE_RIM_W = 34;
/** Bredden af skyggen på landsiden. */
const CAVE_SHADOW = 14;
const CAVE_CHUNK = 512;

/**
 * Grottekant: land i skygge, en lys klippekant, klippeflade af kantede sten og så sort tomrum (til `depth`), på den ene side af linjen.
 * Samme farver og udseende som Tomrum-penslen, men regnet ud fra afstanden til linjen. Tegnes i stykker á 512 × 512 pixels.
 */
function caveRim(g: G, path: Pt[], depth: number, flip: 1 | -1, voidId: number, seed: number): void {
  const reach = Math.max(depth, CAVE_RIM_W) + 4;
  const m = Math.max(reach, CAVE_SHADOW) + 4;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of path) {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
  }
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m); x1 = Math.ceil(x1 + m); y1 = Math.ceil(y1 + m);
  const C = CAVE_CHUNK;
  const dist = new Float32Array(C * C);
  const side = new Int8Array(C * C);
  const cv = document.createElement('canvas');
  cv.width = C;
  cv.height = C;
  const cg = cv.getContext('2d');
  if (!cg) return;
  const img = cg.createImageData(C, C);
  const out = img.data;
  for (let cy = y0; cy < y1; cy += C) {
    for (let cx = x0; cx < x1; cx += C) {
      dist.fill(1e9);
      let any = false;
      for (let k = 0; k + 1 < path.length; k++) {
        const [ax, ay] = path[k]!;
        const [bx, by] = path[k + 1]!;
        const sx0 = Math.max(cx, Math.floor(Math.min(ax, bx) - m));
        const sx1 = Math.min(cx + C, Math.ceil(Math.max(ax, bx) + m));
        const sy0 = Math.max(cy, Math.floor(Math.min(ay, by) - m));
        const sy1 = Math.min(cy + C, Math.ceil(Math.max(ay, by) + m));
        if (sx0 >= sx1 || sy0 >= sy1) continue;
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        const len = Math.sqrt(len2);
        for (let py = sy0; py < sy1; py++) {
          for (let px = sx0; px < sx1; px++) {
            const qx = px + 0.5 - ax, qy = py + 0.5 - ay;
            const u = Math.min(1, Math.max(0, (qx * dx + qy * dy) / len2));
            const d = Math.hypot(qx - dx * u, qy - dy * u);
            const i = (py - cy) * C + (px - cx);
            if (d < dist[i]!) {
              dist[i] = d;
              // positivt til den side, som `offsetPath` kalder positiv (højre for retningen på skærmen)
              side[i] = (-(dx * qy - dy * qx) / len) * flip >= 0 ? 1 : -1;
              any = true;
            }
          }
        }
      }
      if (!any) continue;
      out.fill(0);
      for (let py = cy; py < Math.min(cy + C, y1); py++) {
        for (let px = cx; px < Math.min(cx + C, x1); px++) {
          const i = (py - cy) * C + (px - cx);
          const d0 = dist[i]!;
          if (d0 > m) continue;
          const wx = px + 0.5, wy = py + 0.5;
          // ujævn kant: lidt støj på afstanden
          const sd = side[i]! * d0 + (fbm(wx / 30, wy / 30, seed + 101, 2) - 0.5) * 8 + (valueNoise(wx / 7, wy / 7, seed + 103) - 0.5) * 3;
          const o = i * 4;
          if (sd <= -CAVE_SHADOW) continue;
          if (sd < 0) {
            // landsiden: en blød skygge
            out[o + 3] = 115 * smoothstep(-CAVE_SHADOW, 0, sd);
            continue;
          }
          if (sd > depth) continue;
          const jag = (valueNoise(wx / 7, wy / 7, seed + 121) - 0.5) * 0.16;
          const u = Math.max(0, sd / CAVE_RIM_W + jag);
          rimShade(voidId, wx, wy, seed);
          const toRim = smoothstep(0.17, 0.21, u);
          const toBlack = smoothstep(0.7, 0.84, u);
          const hi = 1 + 0.3 * Math.max(0, 1 - Math.abs(u - 0.2) / 0.025);
          const k = 1 - toBlack;
          const shadow = 0.5 * smoothstep(0, 0.2, u);
          out[o] = shadeOut[0]! * hi * toRim * k + 8 * toBlack;
          out[o + 1] = shadeOut[1]! * hi * toRim * k + 7 * toBlack;
          out[o + 2] = shadeOut[2]! * hi * toRim * k + 9 * toBlack;
          out[o + 3] = (shadow + (1 - shadow) * toRim) * 255;
        }
      }
      cg.putImageData(img, 0, 0);
      g.drawImage(cv, cx, cy);
    }
  }
}

export function drawLine(g: G, wall: Wall, layer: Layer, doc: Pick<MapDoc, 'lightAngle'>, deviceScale: number): void {
  const def = wallStyle(wall.style);
  const t = wall.thickness;
  const path = pathOf(wall);
  if (path.length < 2) return;
  const R = rng(wall.seed);
  const flip = wall.flip ? -1 : 1;
  g.save();
  g.lineCap = 'butt';
  g.lineJoin = 'round';
  switch (wall.style) {
    case 'path_dirt':
      softBand(g, path, t, def.fill, def.outline, R, [[110, 84, 54], [176, 144, 100], [96, 74, 48]], 1);
      break;
    case 'path_gravel':
      softBand(g, path, t, def.fill, def.outline, R, [[120, 114, 102], [204, 198, 184], [92, 88, 80]], 3);
      break;
    case 'path_cobble':
      shadowOn(g, layer, doc, deviceScale, def.shadow);
      g.strokeStyle = rgb(def.joint);
      g.lineWidth = t;
      g.lineCap = 'round';
      line(g, path);
      g.stroke();
      shadowOff(g);
      cobblePath(g, path, t, R, def.fill, def.joint);
      break;
    case 'bridge_wood':
    case 'bridge_rope': {
      const rope = wall.style === 'bridge_rope';
      const w = rope ? t * 0.8 : t;
      shadowOn(g, layer, doc, deviceScale, def.shadow);
      g.strokeStyle = rgb(def.outline);
      g.lineWidth = w + 4;
      line(g, path);
      g.stroke();
      shadowOff(g);
      planks(g, path, w, rope ? Math.max(5, t * 0.16) : Math.max(8, t * 0.2), R, def.fill, def.joint, rope ? 2 : 1);
      // rækværk / tov langs begge sider
      for (const side of [-1, 1]) {
        const rail = offsetPath(path, side * (w / 2 + (rope ? 0 : -t * 0.05)));
        g.strokeStyle = rope ? rgb([176, 150, 104]) : rgb(shift(def.fill, -26));
        g.lineWidth = rope ? Math.max(1.4, t * 0.03) : Math.max(2.5, t * 0.07);
        g.lineCap = 'round';
        line(g, rail);
        g.stroke();
        g.strokeStyle = 'rgba(20,12,6,.55)';
        g.lineWidth = rope ? 0.8 : Math.max(0.8, t * 0.015);
        line(g, rail);
        g.stroke();
        along(rail, Math.max(16, t * 0.9), null, (x, y) => post(g, x, y, Math.max(2.2, t * 0.05), shift(def.fill, -34)));
      }
      break;
    }
    case 'bridge_stone': {
      shadowOn(g, layer, doc, deviceScale, def.shadow);
      g.strokeStyle = rgb(def.outline);
      g.lineWidth = t + 5;
      line(g, path);
      g.stroke();
      shadowOff(g);
      g.strokeStyle = rgb(shift(def.fill, 8));
      g.lineWidth = t;
      line(g, path);
      g.stroke();
      // fuger på tværs
      along(path, Math.max(10, t * 0.34), R, (x, y, tx, ty) => {
        g.strokeStyle = rgb(def.joint, 0.6);
        g.lineWidth = Math.max(0.8, t * 0.02);
        g.beginPath();
        g.moveTo(x - ty * t * 0.36, y + tx * t * 0.36);
        g.lineTo(x + ty * t * 0.36, y - tx * t * 0.36);
        g.stroke();
      });
      // brystværn: to rækker blokke
      for (const side of [-1, 1]) {
        const wallLine = offsetPath(path, side * (t / 2 - t * 0.07));
        g.strokeStyle = rgb(def.outline);
        g.lineWidth = t * 0.17;
        line(g, wallLine);
        g.stroke();
        g.strokeStyle = rgb(shift(def.fill, -12));
        g.lineWidth = t * 0.12;
        line(g, wallLine);
        g.stroke();
        along(wallLine, Math.max(8, t * 0.2), R, (x, y, tx, ty) => {
          g.strokeStyle = rgb(def.joint);
          g.lineWidth = Math.max(0.7, t * 0.015);
          g.beginPath();
          g.moveTo(x - ty * t * 0.06, y + tx * t * 0.06);
          g.lineTo(x + ty * t * 0.06, y - tx * t * 0.06);
          g.stroke();
        });
      }
      break;
    }
    case 'cave_rim':
    case 'cave_rim_purple':
    case 'cave_rim_ice':
      caveRim(g, path, t, flip as 1 | -1, CAVE_RIM[wall.style]!, wall.seed);
      break;
    case 'cliff':
      rock(g, path, t, R, def, [flip as 1 | -1], t);
      break;
    case 'ravine':
      rock(g, path, t, R, def, [1, -1], t / 2);
      break;
    case 'fence': {
      shadowOn(g, layer, doc, deviceScale, def.shadow);
      for (const off of [-0.18, 0.18]) {
        g.strokeStyle = rgb(shift(def.fill, off < 0 ? 6 : -6));
        g.lineWidth = Math.max(2, t * 0.13);
        g.lineCap = 'butt';
        line(g, offsetPath(path, off * t * 1.1));
        g.stroke();
        g.strokeStyle = 'rgba(20,12,6,.7)';
        g.lineWidth = Math.max(0.7, t * 0.02);
        line(g, offsetPath(path, off * t * 1.1));
        g.stroke();
      }
      shadowOff(g);
      along(path, Math.max(18, t * 1.6), null, (x, y) => post(g, x, y, Math.max(3, t * 0.2), def.fill));
      break;
    }
    default:
      break;
  }
  g.restore();
  void subPath;
}
