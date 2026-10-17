import { describe, expect, it, vi } from 'vitest';
import { generateMap, THEMES } from '../generator';
import { parseDoc, serializeDoc } from '../model/doc';
import { CELL_PX } from '../model/types';
import { getKind } from '../objects';

const sizeOf = (t: { size: [number, number] }): [number, number] => [Math.round(t.size[0] * 0.6), Math.round(t.size[1] * 0.6)];

describe('generator', () => {
  for (const theme of THEMES) {
    it(`${theme.name}: gyldigt, bunden og deterministisk`, () => {
      const [w, h] = sizeOf(theme);
      const a = generateMap({ theme: theme.key, widthCells: w, heightCells: h, seed: 12345 });
      const b = generateMap({ theme: theme.key, widthCells: w, heightCells: h, seed: 12345 });
      const strip = (d: typeof a) => JSON.stringify(serializeDoc(d), (k, v) => (k === 'id' ? undefined : v));
      expect(strip(a)).toBe(strip(b));
      expect(a.widthCells).toBe(w);
      let count = 0;
      for (const l of a.layers) {
        for (const e of l.elements ?? []) {
          count++;
          expect(getKind(e.kind), e.kind).toBeTruthy();
          expect(e.x).toBeGreaterThanOrEqual(0);
          expect(e.y).toBeGreaterThanOrEqual(0);
          expect(e.x).toBeLessThanOrEqual(w * CELL_PX);
          expect(e.y).toBeLessThanOrEqual(h * CELL_PX);
        }
        for (const wall of l.walls ?? []) {
          let len = 0;
          const pts = wall.closed ? [...wall.points, wall.points[0]!] : wall.points;
          for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
          for (const o of wall.openings) {
            expect(o.at - o.width / 2).toBeGreaterThanOrEqual(-1);
            expect(o.at + o.width / 2).toBeLessThanOrEqual(len + 1);
          }
        }
      }
      if (theme.rules.length || theme.buildings || theme.dungeon) expect(count).toBeGreaterThan(5);
      // kan gemmes og åbnes igen
      expect(parseDoc(JSON.parse(JSON.stringify(serializeDoc(a)))).layers.length).toBe(a.layers.length);
    });
  }
  it('andre seeds giver andre kort', () => {
    const t = THEMES[0]!;
    const a = generateMap({ theme: t.key, widthCells: 40, heightCells: 30, seed: 1 });
    const b = generateMap({ theme: t.key, widthCells: 40, heightCells: 30, seed: 2 });
    expect(a.layers[0]!.ground!.data).not.toEqual(b.layers[0]!.ground!.data);
  });
  it('ukendt tema giver fejl', () => {
    expect(() => generateMap({ theme: 'x', widthCells: 10, heightCells: 10, seed: 1 })).toThrow();
  });
});

describe('mure og tomrum', () => {
  it('alle murtyper kan tegnes', async () => {
    const { drawWallsLayer, WALL_STYLES } = await import('../render/walls');
    const { createLayer } = await import('../model/doc');
    const gradient = { addColorStop() {} };
    // grottekanten tegnes pixel for pixel i en hjælpe-canvas: en forfalsket, så testen kan køre uden browser
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }),
      }),
    });
    const g = new Proxy({} as Record<string, unknown>, {
      get: (t, k: string) => (k in t ? t[k] : k.startsWith('create') ? () => gradient : () => undefined),
      set: (t, k: string, v) => ((t[k] = v), true),
    }) as unknown as CanvasRenderingContext2D;
    for (const st of WALL_STYLES) {
      const layer = createLayer('walls', 'W');
      layer.walls = [{ id: 'a', style: st.key, points: [[0, 0], [300, 0], [300, 200]], closed: false, thickness: st.thickness * CELL_PX, seed: 3, openings: [] }];
      expect(() => drawWallsLayer(g, layer, { lightAngle: 225 }, 1), st.key).not.toThrow();
    }
    vi.unstubAllGlobals();
  });
});
