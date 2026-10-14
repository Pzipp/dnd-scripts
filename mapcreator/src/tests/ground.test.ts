import { describe, expect, it } from 'vitest';
import { paintCells } from '../model/commands';
import { createDoc } from '../model/doc';
import { createGround, decodeGround, encodeGround, fillChange, Stroke } from '../model/ground';
import { History } from '../model/history';
import { renderGroundTile, type PixelBuffer } from '../render/ground';
import { exportProblem, exportSize, safeFileName } from '../render/export';

const buf = (w: number, h: number): PixelBuffer => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });

describe('terrænmaske', () => {
  it('kodning og afkodning giver samme maske', () => {
    const g = createGround(10, 8, 1);
    g.data.fill(3, 100, 250);
    g.data[5] = 6;
    g.data.fill(2, 300, 300 + 70000 > g.data.length ? g.data.length : 300 + 70000);
    const back = decodeGround(encodeGround(g));
    expect(back.w).toBe(g.w);
    expect(Array.from(back.data)).toEqual(Array.from(g.data));
  });

  it('lange ens strækninger fylder lidt', () => {
    const g = createGround(300, 300, 1);
    expect(encodeGround(g).rle.length).toBeLessThan(40);
  });

  it('ødelagte data afvises', () => {
    const g = encodeGround(createGround(4, 4, 1));
    expect(() => decodeGround({ ...g, rle: 'AAAA' })).toThrow();
    expect(() => decodeGround({ ...g, w: 0 })).toThrow();
  });

  it('et penselstrøg ændrer en cirkel og kan fortrydes og gentages', () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const g = doc.layers[0]!.ground!;
    const before = Uint8Array.from(g.data);
    const h = new History();
    const stroke = new Stroke();
    const rect = stroke.line(g, 100, 100, 300, 100, 40, 6);
    expect(rect).not.toBeNull();
    const painted = Uint8Array.from(g.data);
    expect(painted.filter((v) => v === 6).length).toBeGreaterThan(20);
    const change = stroke.result(g)!;
    h.execute(doc, paintCells(doc.layers[0]!.id, change));
    expect(Array.from(g.data)).toEqual(Array.from(painted));
    h.undo(doc);
    expect(Array.from(g.data)).toEqual(Array.from(before));
    h.redo(doc);
    expect(Array.from(g.data)).toEqual(Array.from(painted));
  });

  it('et afbrudt strøg lægger det gamle tilbage', () => {
    const g = createGround(10, 10, 1);
    const s = new Stroke();
    s.stamp(g, 250, 250, 60, 2);
    expect(g.data.includes(2)).toBe(true);
    s.undoAll(g);
    expect(g.data.every((v) => v === 1)).toBe(true);
  });

  it('fyld ændrer kun de celler, der er anderledes', () => {
    const g = createGround(4, 4, 1);
    g.data[3] = 2;
    const c = fillChange(g, 1)!;
    expect(c.indices.length).toBe(1);
    expect(fillChange(createGround(4, 4, 1), 1)).toBeNull();
  });
});

describe('terræntegning', () => {
  it('tomt terræn er gennemsigtigt, udfyldt er dækkende', () => {
    const empty = buf(8, 8);
    renderGroundTile(empty, createGround(10, 10, 0), 1, 0, 0, 1);
    expect(empty.data[3]).toBe(0);
    const full = buf(8, 8);
    renderGroundTile(full, createGround(10, 10, 1), 1, 0, 0, 1);
    expect(full.data[3]).toBe(255);
    expect(full.data[1]!).toBeGreaterThan(full.data[0]!); // græs er grønt
  });

  it('er deterministisk og afhænger af seed', () => {
    const g = createGround(10, 10, 1);
    const a = buf(16, 16), b = buf(16, 16), c = buf(16, 16);
    renderGroundTile(a, g, 5, 40, 40, 1);
    renderGroundTile(b, g, 5, 40, 40, 1);
    renderGroundTile(c, g, 6, 40, 40, 1);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
    expect(Array.from(a.data)).not.toEqual(Array.from(c.data));
  });

  it('en kant mellem to materialer viser begge farver', () => {
    const g = createGround(10, 10, 1);
    for (let y = 0; y < g.h; y++) for (let x = g.w / 2; x < g.w; x++) g.data[y * g.w + x] = 6; // vand i højre halvdel
    const t = buf(100, 4);
    renderGroundTile(t, g, 1, 200, 200, 1); // verdenspixel 200..300 midt på kortet
    const px = (x: number) => [t.data[x * 4]!, t.data[x * 4 + 1]!, t.data[x * 4 + 2]!];
    expect(px(2)[1]).toBeGreaterThan(px(2)[2]); // venstre: grønt dominerer
    expect(px(97)[2]).toBeGreaterThan(px(97)[0]); // højre: blåt vand
  });

  it('samme maske giver samme billede uanset flisernes opdeling', () => {
    const g = createGround(10, 10, 1);
    g.data.fill(6, 0, 400);
    const whole = buf(64, 32);
    renderGroundTile(whole, g, 3, 0, 0, 1);
    const left = buf(32, 32);
    renderGroundTile(left, g, 3, 0, 0, 1);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        for (let c = 0; c < 4; c++) expect(left.data[(y * 32 + x) * 4 + c]).toBe(whole.data[(y * 64 + x) * 4 + c]);
      }
    }
  });
});

describe('eksport', () => {
  it('filnavne renses, men beholder æøå og mellemrum', () => {
    expect(safeFileName('Skovsti - med lig')).toBe('Skovsti - med lig');
    expect(safeFileName('By: nat/tag?')).toBe('By nattag');
    expect(safeFileName('  ..Søen  ')).toBe('Søen');
    expect(safeFileName('///')).toBe('kort');
  });

  it('størrelse og grænser', () => {
    const doc = { widthCells: 80, heightCells: 55 };
    expect(exportSize(doc, { pxPerCell: 50 })).toEqual({ w: 4000, h: 2750 });
    expect(exportProblem(doc, { pxPerCell: 50 })).toBeNull();
    expect(exportProblem({ widthCells: 300, heightCells: 300 }, { pxPerCell: 100 })).toMatch(/px/);
  });
});
