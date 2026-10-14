import { describe, expect, it } from 'vitest';
import { addOpening, addWall, removeOpening, removeWall, transformWall, updateOpening, updateWall } from '../model/commands';
import { createDoc, createLayer } from '../model/doc';
import { History } from '../model/history';
import type { Opening, Wall } from '../model/types';
import { constrainAngle, gapRanges, hitOpening, hitWall, midpoints, nearestOnPath, pathLength, pathOf, pointAt, solidPieces, subPath, type Pt } from '../model/walls';

const wall = (over: Partial<Wall> = {}): Wall => ({ id: 'w1', style: 'stone', points: [[0, 0], [100, 0], [100, 100]], closed: false, thickness: 20, seed: 1, openings: [], ...over });
const door = (over: Partial<Opening> = {}): Opening => ({ id: 'o1', kind: 'door', at: 50, width: 40, open: false, flip: false, ...over });

describe('mur-geometri', () => {
  it('længde, punkt og retning langs linjen', () => {
    const p = pathOf(wall());
    expect(pathLength(p)).toBe(200);
    const a = pointAt(p, 150);
    expect(a.x).toBeCloseTo(100);
    expect(a.y).toBeCloseTo(50);
    expect([a.tx, a.ty]).toEqual([0, 1]);
    expect(pointAt(p, 9999).y).toBeCloseTo(100); // klemmes
  });

  it('en lukket mur får første punkt med til sidst', () => {
    const p = pathOf(wall({ closed: true }));
    expect(p).toHaveLength(4);
    expect(pathLength(p)).toBeCloseTo(100 + 100 + Math.hypot(100, 100));
  });

  it('nærmeste punkt og afstand', () => {
    const n = nearestOnPath(pathOf(wall()), 60, 30)!;
    expect(n.dist).toBeCloseTo(30);
    expect(n.s).toBeCloseTo(60);
    expect(n.seg).toBe(0);
  });

  it('delstykke følger hjørner', () => {
    const s = subPath(pathOf(wall()), 50, 150);
    expect(s).toEqual([[50, 0], [100, 0], [100, 50]]);
  });

  it('huller i muren giver massive stykker på begge sider', () => {
    const w = wall({ openings: [door({ at: 50, width: 40 })] });
    const pieces = solidPieces(pathOf(w), gapRanges(w));
    expect(pieces).toHaveLength(2);
    expect(pieces[0]!.at(-1)).toEqual([30, 0]);
    expect(pieces[1]![0]).toEqual([70, 0]);
  });

  it('vinduer skærer ikke hul, og overlappende huller slås sammen', () => {
    const w = wall({ openings: [door({ kind: 'window' })] });
    expect(gapRanges(w)).toEqual([]);
    const w2 = wall({ openings: [door({ id: 'a', at: 50 }), door({ id: 'b', at: 70 })] });
    expect(solidPieces(pathOf(w2), gapRanges(w2))).toHaveLength(2);
  });

  it('åbning i enden af muren giver ét stykke', () => {
    const w = wall({ openings: [door({ at: 10, width: 20 })] });
    expect(solidPieces(pathOf(w), gapRanges(w))).toHaveLength(1);
  });

  it('hit-test af mur og åbning', () => {
    const w = wall();
    expect(hitWall(w, 50, 8)).toBe(true);
    expect(hitWall(w, 50, 30)).toBe(false);
    expect(hitWall(w, 50, 30, 25)).toBe(true);
    expect(hitOpening(w, door(), 60, 5)).toBe(true);
    expect(hitOpening(w, door(), 90, 5)).toBe(false);
  });

  it('midtpunkter og vinkellås', () => {
    expect(midpoints(wall()).map((m) => m.at)).toEqual([[50, 0], [100, 50]]);
    const c = constrainAngle([0, 0], [100, 8]) as Pt;
    expect(c[1]).toBeCloseTo(0, 5);
    const d = constrainAngle([0, 0], [100, 95], 45);
    expect(d[0]).toBeCloseTo(d[1]);
  });
});

describe('mur-kommandoer', () => {
  const setup = () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const layer = createLayer('walls', 'Mure');
    doc.layers.push(layer);
    return { doc, layer, h: new History() };
  };

  it('tilføj, slet og fortryd mur', () => {
    const { doc, layer, h } = setup();
    h.execute(doc, addWall(layer.id, wall()));
    expect(layer.walls).toHaveLength(1);
    h.execute(doc, removeWall(layer.id, 'w1'));
    expect(layer.walls).toHaveLength(0);
    h.undo(doc);
    expect(layer.walls).toHaveLength(1);
  });

  it('flytning af punkter bliver én fortryd med de gamle punkter', () => {
    const { doc, layer, h } = setup();
    const w = wall();
    h.execute(doc, addWall(layer.id, w));
    const before = w.points.map((p) => [...p] as Pt);
    w.points[1] = [300, 0]; // trækket har allerede ændret punktet
    h.execute(doc, transformWall(layer.id, 'w1', before, w.points.map((p) => [...p] as Pt)));
    h.undo(doc);
    expect(w.points[1]).toEqual([100, 0]);
    h.redo(doc);
    expect(w.points[1]).toEqual([300, 0]);
  });

  it('tykkelse og stil kan rettes og fortrydes', () => {
    const { doc, layer, h } = setup();
    const w = wall();
    h.execute(doc, addWall(layer.id, w));
    h.execute(doc, updateWall(layer.id, 'w1', { thickness: 40, style: 'brick' }));
    expect([w.thickness, w.style]).toEqual([40, 'brick']);
    h.undo(doc);
    expect([w.thickness, w.style]).toEqual([20, 'stone']);
  });

  it('åbninger: tilføj, ret, slet og fortryd', () => {
    const { doc, layer, h } = setup();
    const w = wall();
    h.execute(doc, addWall(layer.id, w));
    h.execute(doc, addOpening(layer.id, 'w1', door()));
    h.execute(doc, updateOpening(layer.id, 'w1', 'o1', { open: true }));
    expect(w.openings[0]!.open).toBe(true);
    h.execute(doc, removeOpening(layer.id, 'w1', 'o1'));
    expect(w.openings).toHaveLength(0);
    h.undo(doc);
    expect(w.openings).toHaveLength(1);
    h.undo(doc);
    expect(w.openings[0]!.open).toBe(false);
  });
});
