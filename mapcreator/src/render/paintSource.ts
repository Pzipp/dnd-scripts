import type { GroundData } from '../model/ground';
import { createPaint, PAINT_TILE, scaleOf, type LazySource, type PaintData } from '../model/paint';
import type { MapDoc } from '../model/types';
import { hasGround } from '../model/types';
import { renderGroundTile } from './ground';
import { setShadeScale, shade, shadeOut } from './materials';

/** Baggrund: tegner et materiale (i verdenskoordinater, forskudt med `ox`, `oy`) i en flise. */
export function fillSource(material: number, seed: number, scale: number, ox: number, oy: number): LazySource {
  return {
    render(data, x0, y0) {
      setShadeScale(scale);
      let p = 0;
      for (let py = 0; py < PAINT_TILE; py++) {
        const wy = (y0 + py + 0.5) / scale - oy;
        for (let px = 0; px < PAINT_TILE; px++, p += 4) {
          shade(material, (x0 + px + 0.5) / scale - ox, wy, seed, 1);
          data[p] = shadeOut[0]!;
          data[p + 1] = shadeOut[1]!;
          data[p + 2] = shadeOut[2]!;
          data[p + 3] = shadeOut[3]! * 255;
        }
      }
    },
  };
}

/** Et kort fra før det malede underlag: tegnes med den gamle terrænmaske (sidste gang), flise for flise. */
export function legacySource(ground: GroundData, seed: number, scale: number, floor: boolean): LazySource {
  return {
    legacy: true,
    render(data, x0, y0) {
      renderGroundTile({ width: PAINT_TILE, height: PAINT_TILE, data }, ground, seed, x0 / scale, y0 / scale, scale, floor);
    },
  };
}

/** Giver lagets fliser en kilde at tegnes fra (baggrund eller ældre maske). Kaldes, når et kort er åbnet, lavet eller ændret. */
export function attachSource(p: PaintData, seed: number, ground?: GroundData, floor = false): void {
  const s = scaleOf(p);
  if (ground) p.lazy = legacySource(ground, seed, s, floor);
  else if (p.fill) p.lazy = fillSource(p.fill.material, seed, s, p.fill.ox, p.fill.oy);
  else delete p.lazy;
}

/** Omdanner lag med en gammel terrænmaske til malede lag (flisernes indhold tegnes først, når der er brug for dem). */
export function adoptLegacy(doc: MapDoc): void {
  for (const l of doc.layers) {
    if (!hasGround(l.type)) continue;
    if (l.ground && !l.paint) {
      l.paint = createPaint(doc.widthCells, doc.heightCells);
      attachSource(l.paint, doc.seed, l.ground, l.type === 'floor');
    }
    delete l.ground;
  }
}
