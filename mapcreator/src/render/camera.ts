/** Kamera: skærm = verden * zoom + pan. Verden måles i kortpixels (50 px = ét felt). */
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 8;

export interface Camera {
  zoom: number;
  panX: number;
  panY: number;
}

export function createCamera(): Camera {
  return { zoom: 1, panX: 0, panY: 0 };
}

export function worldToScreen(c: Camera, x: number, y: number): [number, number] {
  return [x * c.zoom + c.panX, y * c.zoom + c.panY];
}

export function screenToWorld(c: Camera, x: number, y: number): [number, number] {
  return [(x - c.panX) / c.zoom, (y - c.panY) / c.zoom];
}

/** Zoomer med `factor`, så punktet (sx, sy) på skærmen bliver stående. */
export function zoomAt(c: Camera, sx: number, sy: number, factor: number): void {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
  const k = zoom / c.zoom;
  c.panX = sx - (sx - c.panX) * k;
  c.panY = sy - (sy - c.panY) * k;
  c.zoom = zoom;
}

/** Viser hele verdensrektanglet midt i vinduet med en margen. */
export function fit(c: Camera, viewW: number, viewH: number, worldW: number, worldH: number, margin = 24): void {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((viewW - 2 * margin) / worldW, (viewH - 2 * margin) / worldH)));
  c.zoom = zoom;
  c.panX = (viewW - worldW * zoom) / 2;
  c.panY = (viewH - worldH * zoom) / 2;
}
