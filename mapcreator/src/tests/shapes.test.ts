import { describe, expect, it } from 'vitest';
import { bounds, chaikin, ellipsePoints, pointInPolygon, rectPoints, simplify } from '../model/shapes';
import { hitWall } from '../model/walls';
import type { Wall } from '../model/types';
import { WALL_STYLES, wallStyle } from '../render/walls';

describe('former og frihåndslinjer', () => {
  it('forenkling fjerner punkter på en ret linje og beholder knæk', () => {
    const straight = Array.from({ length: 50 }, (_, i) => [i * 2, 0] as [number, number]);
    expect(simplify(straight, 1).length).toBe(2);
    const bent = [...straight, ...Array.from({ length: 25 }, (_, i) => [98, (i + 1) * 2] as [number, number])];
    const s = simplify(bent, 1);
    expect(s.length).toBe(3);
    expect(s[1]).toEqual([98, 0]);
  });

  it('udjævning giver flere punkter og beholder enderne på en åben linje', () => {
    const line: [number, number][] = [[0, 0], [10, 10], [20, 0]];
    const s = chaikin(line, 2);
    expect(s.length).toBeGreaterThan(line.length);
    expect(s[0]).toEqual([0, 0]);
    expect(s.at(-1)).toEqual([20, 0]);
  });

  it('firkant og ellipse får de rigtige punkter og mål', () => {
    expect(rectPoints([10, 20], [0, 5])).toEqual([[0, 5], [10, 5], [10, 20], [0, 20]]);
    const e = ellipsePoints(100, 100, 40, 20, 32);
    expect(e.length).toBe(32);
    const b = bounds(e);
    expect(b.x1 - b.x0).toBeCloseTo(80, 0);
    expect(b.y1 - b.y0).toBeCloseTo(40, 0);
  });

  it('punkt i polygon', () => {
    const sq = rectPoints([0, 0], [10, 10]);
    expect(pointInPolygon(sq, 5, 5)).toBe(true);
    expect(pointInPolygon(sq, 15, 5)).toBe(false);
  });

  it('en form vælges inde i udfyldningen; en form uden kant kun der', () => {
    const wall: Wall = { id: 'a', style: 'stone', points: rectPoints([0, 0], [100, 100]), closed: true, thickness: 20, seed: 1, openings: [], fill: { material: 17 }, shape: 'rect' };
    expect(hitWall(wall, 50, 50)).toBe(true);
    expect(hitWall(wall, 250, 50)).toBe(false);
    expect(hitWall({ ...wall, stroke: false }, 99, 50, 0)).toBe(true);
    expect(hitWall({ ...wall, stroke: false }, 108, 50, 0)).toBe(false); // uden kant tæller kun det indre
  });

  it('stilarter: alle har gruppe, og kun rigtige mure kan have åbninger', () => {
    for (const s of WALL_STYLES) expect(s.group.length).toBeGreaterThan(0);
    expect(wallStyle('stone').solid).toBe(true);
    for (const k of ['path_dirt', 'bridge_wood', 'cliff', 'ravine', 'fence'] as const) expect(wallStyle(k).solid).toBe(false);
  });
});
