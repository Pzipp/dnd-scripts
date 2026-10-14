import { type Camera } from './camera';
import { CELL_PX, type MapDoc } from '../model/types';

export interface ViewOptions {
  grid: boolean;
}

const THEME = { bg: '#1b1d22', paper: '#c9c3ad', border: '#000', grid: 'rgba(0,0,0,.22)' };

/** Tegner dokumentet i vinduet. Lagenes indhold kommer i de næste trin; her tegnes kun kortets flade og grid (kun til visning). */
export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, cam: Camera, doc: MapDoc, view: ViewOptions): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.panX, cam.panY);
  const mw = doc.widthCells * CELL_PX;
  const mh = doc.heightCells * CELL_PX;
  ctx.fillStyle = THEME.paper;
  ctx.fillRect(0, 0, mw, mh);

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
}
