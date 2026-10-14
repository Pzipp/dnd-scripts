import { type Camera } from './camera';
import { groundCache } from './groundCache';
import { CELL_PX, type MapDoc } from '../model/types';

export interface ViewOptions {
  grid: boolean;
  /** Penselring (verdenskoordinater og radius i verdenspixels), hvis et malerværktøj er valgt. */
  brush?: { x: number; y: number; r: number; ok: boolean } | null;
}

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
    if (layer.type === 'ground') {
      const c = groundCache.canvas(layer.id);
      if (!c) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(c, 0, 0, mw, mh);
      ctx.globalAlpha = 1;
    }
    // Genstande, mure og effekter tegnes her, når de findes.
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
