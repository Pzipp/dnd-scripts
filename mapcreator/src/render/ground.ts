import type { GroundData } from '../model/ground';
import { CELL_PX } from '../model/types';
import { shade, shadeOut } from './materials';
import { fbm, smoothstep } from './noise';

/** Det, vi skriver pixels i (ImageData passer; i tests bruges et simpelt objekt). */
export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const ids = new Int32Array(4);
const wts = new Float64Array(4);
let count = 0;

function accumulate(id: number, w: number): void {
  for (let k = 0; k < count; k++) {
    if (ids[k] === id) {
      wts[k] = wts[k]! + w;
      return;
    }
  }
  ids[count] = id;
  wts[count] = w;
  count++;
}

/**
 * Tegner terrænet i et område: bufferens pixel (0, 0) ligger i verdenspunktet (x0, y0), og `scale` er pixels pr. verdenspixel.
 * Maskens celler fladtrykkes til en bilineær vægt pr. materiale; koordinaterne forvrænges med støj, så kanterne bliver
 * organiske, og to materialer blandes blødt over en smal kant.
 */
export function renderGroundTile(buf: PixelBuffer, ground: GroundData, seed: number, x0: number, y0: number, scale: number): void {
  const cell = CELL_PX / ground.res;
  const { w: gw, h: gh, data: mask } = ground;
  const out = buf.data;
  let p = 0;
  for (let py = 0; py < buf.height; py++) {
    for (let px = 0; px < buf.width; px++, p += 4) {
      const wx = x0 + (px + 0.5) / scale;
      const wy = y0 + (py + 0.5) / scale;
      const dx = (fbm(wx / 80, wy / 80, seed + 101, 3) - 0.5) * 40;
      const dy = (fbm(wx / 80 + 50, wy / 80 + 50, seed + 102, 3) - 0.5) * 40;
      const gx = (wx + dx) / cell - 0.5;
      const gy = (wy + dy) / cell - 0.5;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const fx = gx - ix;
      const fy = gy - iy;
      const xa = Math.min(gw - 1, Math.max(0, ix));
      const xb = Math.min(gw - 1, Math.max(0, ix + 1));
      const ya = Math.min(gh - 1, Math.max(0, iy));
      const yb = Math.min(gh - 1, Math.max(0, iy + 1));
      const m00 = mask[ya * gw + xa]!;
      const m10 = mask[ya * gw + xb]!;
      const m01 = mask[yb * gw + xa]!;
      const m11 = mask[yb * gw + xb]!;

      let r: number, g: number, b: number, a: number;
      if (m00 === m10 && m00 === m01 && m00 === m11) {
        // indre punkt: ét materiale
        shade(m00, wx, wy, seed, 1);
        r = shadeOut[0]!; g = shadeOut[1]!; b = shadeOut[2]!; a = shadeOut[3]!;
      } else {
        // saml vægtene pr. materiale (højst fire forskellige)
        count = 0;
        accumulate(m00, (1 - fx) * (1 - fy));
        accumulate(m10, fx * (1 - fy));
        accumulate(m01, (1 - fx) * fy);
        accumulate(m11, fx * fy);
        const n = count;
        let top = 0;
        for (let k = 1; k < n; k++) if (wts[k]! > wts[top]!) top = k;
        let sec = -1;
        for (let k = 0; k < n; k++) if (k !== top && (sec < 0 || wts[k]! > wts[sec]!)) sec = k;
        const margin = wts[top]! - wts[sec]!;
        const t = 0.5 + 0.5 * smoothstep(0, 0.2, margin);
        shade(ids[top]!, wx, wy, seed, margin);
        const rT = shadeOut[0]!, gT = shadeOut[1]!, bT = shadeOut[2]!, aT = shadeOut[3]!;
        if (t >= 0.999) {
          r = rT; g = gT; b = bT; a = aT;
        } else {
          shade(ids[sec]!, wx, wy, seed, margin);
          const wT = aT * t;
          const wS = shadeOut[3]! * (1 - t);
          a = wT + wS;
          if (a > 0) {
            r = (rT * wT + shadeOut[0]! * wS) / a;
            g = (gT * wT + shadeOut[1]! * wS) / a;
            b = (bT * wT + shadeOut[2]! * wS) / a;
          } else {
            r = g = b = 0;
          }
        }
      }
      out[p] = r;
      out[p + 1] = g;
      out[p + 2] = b;
      out[p + 3] = a * 255;
    }
  }
}
