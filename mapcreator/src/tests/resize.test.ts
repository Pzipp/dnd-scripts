import { describe, expect, it } from 'vitest';
import { createDoc, createLayer } from '../model/doc';
import { ensureTile } from '../model/paint';
import { pixelAt } from '../model/paint';
import { resizeMap } from '../model/resize';
import { CELL_PX } from '../model/types';

function doc() {
  const d = createDoc({ name: 't', widthCells: 10, heightCells: 8 });
  const o = createLayer('objects', 'O');
  o.elements = [{ id: 'a', kind: 'x', x: 100, y: 100, w: 50, h: 50, rot: 0, seed: 1, z: 0, params: {} }, { id: 'b', kind: 'x', x: 450, y: 350, w: 50, h: 50, rot: 0, seed: 1, z: 0, params: {} }];
  const w = createLayer('walls', 'W');
  w.walls = [{ id: 'w', style: 'stone', points: [[0, 0], [100, 0]], closed: false, thickness: 10, seed: 1, openings: [] }];
  d.layers.push(o, w);
  return d;
}

describe('ændr kortstørrelse', () => {
  it('forstørrer og flytter genstande og mure med ankeret', () => {
    const d = doc();
    resizeMap(20, 16, { x: 0.5, y: 0.5 }).apply(d);
    expect([d.widthCells, d.heightCells]).toEqual([20, 16]);
    const els = d.layers[1]!.elements!;
    expect(els[0]!.x).toBe(100 + 5 * CELL_PX);
    expect(els[0]!.y).toBe(100 + 4 * CELL_PX);
    expect(d.layers[2]!.walls![0]!.points[1]).toEqual([100 + 5 * CELL_PX, 4 * CELL_PX]);
    const p = d.layers[0]!.paint!;
    expect(p.w).toBe(20 * p.ppc);
    expect(p.fill?.ox).toBe(5 * CELL_PX);
  });
  it('ankret øverst til venstre flytter ingenting', () => {
    const d = doc();
    resizeMap(15, 8, { x: 0, y: 0 }).apply(d);
    expect(d.layers[1]!.elements![0]!.x).toBe(100);
  });
  it('mindre kort fjerner genstande uden for, og fortryd henter alt tilbage', () => {
    const d = doc();
    const cmd = resizeMap(5, 4, { x: 0, y: 0 });
    cmd.apply(d);
    expect(d.layers[1]!.elements!.map((e) => e.id)).toEqual(['a']);
    cmd.revert(d);
    expect([d.widthCells, d.heightCells]).toEqual([10, 8]);
    expect(d.layers[1]!.elements!.length).toBe(2);
    expect(d.layers[0]!.paint!.w).toBe(10 * d.layers[0]!.paint!.ppc);
    cmd.apply(d);
    expect(d.widthCells).toBe(5);
    expect(d.layers[1]!.elements!.length).toBe(1);
  });
  it('bevarer maling ved forskydning og lader nyt område følge baggrunden', () => {
    const d = doc();
    const p = d.layers[0]!.paint!;
    ensureTile(p, 0, 0);
    const t = p.tiles.get(0)!;
    t.data[0] = 11; t.data[3] = 255; // pixel (0, 0): rød 11, dækkende
    resizeMap(12, 8, { x: 1, y: 0 }).apply(d);
    const n = d.layers[0]!.paint!;
    expect(pixelAt(n, 2 * CELL_PX + 0.5, 0.5)![0]).toBe(11);
    expect(pixelAt(n, 1, 1)![3]).toBe(255); // nyt område i en flise, der findes: følger baggrunden
    expect(n.fill!.ox).toBe(2 * CELL_PX);
  });
});
