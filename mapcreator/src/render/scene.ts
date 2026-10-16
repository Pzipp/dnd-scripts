import { type Camera } from './camera';
import { groundCache } from './groundCache';
import { CELL_PX, hasGround, type Layer, type MapDoc, type MapElement, type Opening, type Wall, type WallStyle } from '../model/types';
import { midpoints, pathOf, pointAt, type Pt } from '../model/walls';
import { drawOpening, drawWallsLayer, wallStyle } from './walls';
import { HANDLES, handlePos } from '../model/geometry';
import { profile } from './quality';
import { drawElement, drawElementsLayer } from './sprites';
import '../objects';

export interface ViewOptions {
  grid: boolean;
  /** Penselring (verdenskoordinater og radius i verdenspixels), hvis et malerværktøj er valgt. */
  brush?: { x: number; y: number; r: number; ok: boolean } | null;
  /** Valgt genstand: tegnes med ramme og håndtag. */
  selected?: MapElement | null;
  /** Genstande, der er ved at blive sat ud (halvgennemsigtige): enkelt udsætning eller et scatter-strøg. */
  ghosts?: { el: MapElement; layer: Layer }[];
  ghostAlpha?: number;
  /** Genstande, der markeres med rød ramme (fx dem, et scatter-strøg i fjern-tilstand fjerner). */
  markers?: MapElement[];
  /** Mur, der tegnes lige nu: punkter hidtil, og hvor musen er. */
  draft?: { points: Pt[]; cursor: Pt | null; style: WallStyle; thickness: number; closed?: boolean; fill?: boolean } | null;
  /** Valgt mur (punkthåndtag) og evt. valgt åbning. */
  wallSel?: { wall: Wall; layer: Layer; opening: Opening | null } | null;
  /** Åbning, der er ved at blive sat ind (følger musen langs en mur). */
  openingGhost?: { wall: Wall; layer: Layer; opening: Opening } | null;
}

/** Afstand (skærmpixels) fra toppen til rotationshåndtaget. */
export const ROT_HANDLE_PX = 28;

const THEME = { bg: '#1b1d22', paper: '#c9c3ad', border: '#000', grid: 'rgba(0,0,0,.22)' };

/** Tegner dokumentet i vinduet (forhåndsvisning). Grid og penselring er kun til visning og kommer aldrig med i eksporten. */
export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, cam: Camera, doc: MapDoc, view: ViewOptions): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.panX, cam.panY);
  const mw = doc.widthCells * CELL_PX;
  const mh = doc.heightCells * CELL_PX;
  ctx.fillStyle = THEME.paper;
  ctx.fillRect(0, 0, mw, mh);

  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    if (hasGround(layer.type)) {
      const c = groundCache.canvas(layer.id);
      if (!c) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(c, 0, 0, mw, mh);
      ctx.globalAlpha = 1;
    }
    if (layer.type === 'objects' || layer.type === 'effects') {
      ctx.globalAlpha = layer.opacity;
      drawElementsLayer(ctx, layer, doc, cam.zoom, profile());
      ctx.globalAlpha = 1;
    }
    if (layer.type === 'walls') {
      ctx.globalAlpha = layer.opacity;
      drawWallsLayer(ctx, layer, doc, cam.zoom, profile());
      ctx.globalAlpha = 1;
    }
  }

  if (view.ghosts?.length) {
    ctx.globalAlpha = view.ghostAlpha ?? 0.6;
    for (const gh of view.ghosts) drawElement(ctx, gh.el, gh.layer, doc, cam.zoom, profile());
    ctx.globalAlpha = 1;
  }
  if (view.markers?.length) {
    ctx.strokeStyle = '#e05a4a';
    ctx.lineWidth = 2 / cam.zoom;
    for (const m of view.markers) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      ctx.fillStyle = 'rgba(224,90,74,.25)';
      ctx.fillRect(-m.w / 2, -m.h / 2, m.w, m.h);
      ctx.strokeRect(-m.w / 2, -m.h / 2, m.w, m.h);
      ctx.restore();
    }
  }

  if (view.grid) {
    ctx.beginPath();
    for (let x = 0; x <= doc.widthCells; x++) {
      ctx.moveTo(x * CELL_PX, 0);
      ctx.lineTo(x * CELL_PX, mh);
    }
    for (let y = 0; y <= doc.heightCells; y++) {
      ctx.moveTo(0, y * CELL_PX);
      ctx.lineTo(mw, y * CELL_PX);
    }
    ctx.strokeStyle = THEME.grid;
    ctx.lineWidth = 1 / cam.zoom;
    ctx.stroke();
  }

  ctx.strokeStyle = THEME.border;
  ctx.lineWidth = 2 / cam.zoom;
  ctx.strokeRect(0, 0, mw, mh);

  if (view.openingGhost) {
    ctx.globalAlpha = 0.65;
    drawOpening(ctx, view.openingGhost.wall, view.openingGhost.opening, view.openingGhost.layer, doc, cam.zoom);
    ctx.globalAlpha = 1;
  }
  if (view.draft) drawDraft(ctx, view.draft, cam.zoom);
  if (view.wallSel) drawWallSelection(ctx, view.wallSel.wall, view.wallSel.opening, cam.zoom);
  if (view.selected) drawSelection(ctx, view.selected, cam.zoom);

  if (view.brush) {
    const b = view.brush;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.lineWidth = 3 / cam.zoom;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.stroke();
    ctx.lineWidth = 1.5 / cam.zoom;
    ctx.strokeStyle = b.ok ? '#fff' : '#e05a4a';
    ctx.stroke();
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, el: MapElement, zoom: number): void {
  const px = 1 / zoom;
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rot);
  ctx.lineWidth = 1.5 * px;
  ctx.strokeStyle = '#e8b04a';
  ctx.setLineDash([6 * px, 4 * px]);
  ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
  ctx.setLineDash([]);
  ctx.restore();
  const rotOffset = ROT_HANDLE_PX * px;
  const [tx, ty] = handlePos(el, 'n', 0);
  const [rx, ry] = handlePos(el, 'rot', rotOffset);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(rx, ry);
  ctx.lineWidth = 1.5 * px;
  ctx.strokeStyle = '#e8b04a';
  ctx.stroke();
  for (const h of [...HANDLES, 'rot' as const]) {
    const [x, y] = handlePos(el, h, rotOffset);
    ctx.beginPath();
    if (h === 'rot') ctx.arc(x, y, 5.5 * px, 0, Math.PI * 2);
    else ctx.rect(x - 4.5 * px, y - 4.5 * px, 9 * px, 9 * px);
    ctx.fillStyle = '#1b1d22';
    ctx.fill();
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = '#e8b04a';
    ctx.stroke();
  }
}

function drawDraft(ctx: CanvasRenderingContext2D, d: NonNullable<ViewOptions['draft']>, zoom: number): void {
  const def = wallStyle(d.style);
  const pts = d.cursor ? [...d.points, d.cursor] : d.points;
  if (pts.length === 0) return;
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  if (d.fill && d.closed && pts.length > 2) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = 'rgba(232,176,74,.28)';
    ctx.fill();
  }
  ctx.strokeStyle = `rgb(${def.outline.join(',')})`;
  ctx.lineWidth = d.thickness + 4;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (d.closed) ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = `rgb(${def.fill.join(',')})`;
  ctx.lineWidth = d.thickness;
  ctx.stroke();
  ctx.restore();
  const px = 1 / zoom;
  if (d.closed) return; // en form under tegning viser kun kanten
  for (const [i, p] of d.points.entries()) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], (i === 0 ? 6 : 4.5) * px, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#e8b04a' : '#1b1d22';
    ctx.fill();
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = '#e8b04a';
    ctx.stroke();
  }
}

function drawWallSelection(ctx: CanvasRenderingContext2D, wall: Wall, opening: Opening | null, zoom: number): void {
  const px = 1 / zoom;
  ctx.save();
  ctx.strokeStyle = '#e8b04a';
  ctx.lineWidth = 1.5 * px;
  ctx.setLineDash([6 * px, 4 * px]);
  const path = pathOf(wall);
  ctx.beginPath();
  path.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  ctx.setLineDash([]);
  // midtpunkter: træk for at indsætte et nyt punkt
  for (const m of midpoints(wall)) {
    ctx.beginPath();
    ctx.arc(m.at[0], m.at[1], 4 * px, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232,176,74,.35)';
    ctx.fill();
    ctx.stroke();
  }
  for (const p of wall.points) {
    ctx.beginPath();
    ctx.rect(p[0] - 5 * px, p[1] - 5 * px, 10 * px, 10 * px);
    ctx.fillStyle = '#1b1d22';
    ctx.fill();
    ctx.stroke();
  }
  if (opening) {
    const c = pointAt(path, opening.at);
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.atan2(c.ty, c.tx));
    ctx.lineWidth = 2 * px;
    ctx.strokeRect(-opening.width / 2 - 2 * px, -wall.thickness / 2 - 4 * px, opening.width + 4 * px, wall.thickness + 8 * px);
  }
  ctx.restore();
}
