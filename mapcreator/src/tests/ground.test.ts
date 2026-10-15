import { describe, expect, it } from 'vitest';
import { paintCells } from '../model/commands';
import { createDoc } from '../model/doc';
import { createGround, decodeGround, encodeGround, fillChange, Stroke } from '../model/ground';
import { History } from '../model/history';
import { renderGroundTile, type PixelBuffer } from '../render/ground';
import { isStoneMaterial, STONE_STYLES, stone, stoneAt } from '../render/stones';
import { tileSignature } from '../render/groundCache';
import { MATERIALS } from '../render/materials';
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
    expect(px(2)[1]!).toBeGreaterThan(px(2)[2]!); // venstre: grønt dominerer
    expect(px(97)[2]!).toBeGreaterThan(px(97)[0]!); // højre: blåt vand
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

describe('bløde overgange', () => {
  /** Andelen af pixels langs en række, der ikke ligner hverken rent græs eller rent sand: bredden af overgangen. */
  it('overgangen mellem græs og sand er flere pixels bred og uden hårde spring', () => {
    const g = createGround(10, 10, 1);
    for (let y = 0; y < g.h; y++) for (let x = g.w / 2; x < g.w; x++) g.data[y * g.w + x] = 3;
    const row = buf(160, 1);
    renderGroundTile(row, g, 2, 170, 250, 1); // verdenspixel 170..330 omkring grænsen ved x = 250
    // blåt-kanalen: græs er lavt, sand er højt; kig på et glidende gennemsnit
    const blue = Array.from({ length: 160 }, (_, x) => row.data[x * 4 + 2]!);
    const avg = (i: number) => blue.slice(Math.max(0, i - 4), i + 5).reduce((a, b) => a + b, 0) / Math.min(9, blue.length);
    const left = avg(10);
    const right = avg(150);
    expect(right - left).toBeGreaterThan(40);
    const between = blue.filter((_, i) => i > 20 && i < 140).map((_, i) => avg(i + 20)).filter((v) => v > left + 12 && v < right - 12);
    expect(between.length).toBeGreaterThan(12);
  });

  it('alle materialer kan tegnes, er dækkende og giver rigtige tal', () => {
    for (const m of MATERIALS) {
      const g = createGround(4, 4, m.id);
      const t = buf(40, 40);
      renderGroundTile(t, g, 9, 50, 50, 1);
      for (let i = 0; i < t.data.length; i += 4) {
        expect(Number.isFinite(t.data[i]! + t.data[i + 1]! + t.data[i + 2]!), m.key).toBe(true);
        if (isStoneMaterial(m.id)) continue; // fugerne mellem sten og planker er gennemsigtige
        expect(t.data[i + 3], m.key).toBe(255);
      }
    }
  }, 60000);

  it('brosten har mørke fuger og lyse sten', () => {
    const g = createGround(6, 6, 14);
    const t = buf(120, 120);
    renderGroundTile(t, g, 4, 60, 60, 1);
    const lum = Array.from({ length: 120 * 120 }, (_, i) => t.data[i * 4]! + t.data[i * 4 + 1]! + t.data[i * 4 + 2]!);
    expect(Math.min(...lum)).toBeLessThan(200);
    expect(Math.max(...lum)).toBeGreaterThan(330);
  });
});

describe('stier', () => {
  it('en sti males ovenpå og kan fortrydes uden at røre terrænet', () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const g = doc.layers[0]!.ground!;
    const base = Uint8Array.from(g.data);
    const h = new History();
    const stroke = new Stroke('path');
    stroke.line(g, 100, 250, 400, 250, 30, 14);
    expect(g.path?.includes(14)).toBe(true);
    expect(Array.from(g.data)).toEqual(Array.from(base));
    const change = stroke.result(g)!;
    expect(change.target).toBe('path');
    h.execute(doc, paintCells(doc.layers[0]!.id, change));
    const painted = Uint8Array.from(g.path!);
    h.undo(doc);
    expect(g.path!.every((v) => v === 0)).toBe(true);
    h.redo(doc);
    expect(Array.from(g.path!)).toEqual(Array.from(painted));
  });

  it('en viskelæder uden stier opretter ingen', () => {
    const g = createGround(4, 4, 1);
    const s = new Stroke('path');
    expect(s.stamp(g, 100, 100, 30, 0)).toBeNull();
    expect(g.path).toBeUndefined();
    expect(fillChange(g, 0, 'path')).toBeNull();
  });

  it('stier gemmes og indlæses, og et kort uden stier fylder ikke mere', () => {
    const g = createGround(10, 10, 1);
    expect(encodeGround(g).path).toBeUndefined();
    new Stroke('path').stamp(g, 100, 100, 40, 15);
    const enc = encodeGround(g);
    expect(enc.path).toBeDefined();
    const back = decodeGround(enc);
    expect(Array.from(back.path!)).toEqual(Array.from(g.path!));
  });

  it('stien tegnes med sit materiale i midten og ligner terrænet uden for', () => {
    const g = createGround(10, 10, 1);
    const plain = buf(40, 40);
    renderGroundTile(plain, g, 3, 80, 230, 1);
    const s = new Stroke('path');
    s.line(g, 0, 250, 500, 250, 40, 15); // grus tværs over kortet
    const t = buf(40, 40);
    renderGroundTile(t, g, 3, 80, 230, 1);
    const at = (b: PixelBuffer, x: number, y: number) => [b.data[(y * 40 + x) * 4]!, b.data[(y * 40 + x) * 4 + 1]!, b.data[(y * 40 + x) * 4 + 2]!];
    // midt på stien (y = 250 → række 20) er grus: grå og ikke grøn
    const mid = at(t, 20, 20);
    expect(Math.abs(mid[1]! - mid[0]!)).toBeLessThan(40);
    expect(at(plain, 20, 20)[1]!).toBeGreaterThan(at(plain, 20, 20)[0]! + 20);
    const far = buf(10, 10);
    renderGroundTile(far, g, 3, 80, 450, 1); // langt fra stien
    const farPlain = buf(10, 10);
    renderGroundTile(farPlain, createGround(10, 10, 1), 3, 80, 450, 1);
    expect(Array.from(far.data)).toEqual(Array.from(farPlain.data));
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

describe('sten i rækker', () => {
  it('hvert punkt ligger i sin egen sten, og stenen er den samme for hele stenen', () => {
    for (const id of Object.keys(STONE_STYLES).map(Number)) {
      for (let i = 0; i < 400; i++) {
        const x = (i * 37.3) % 700 - 100;
        const y = (i * 53.1) % 500 - 100;
        stoneAt(id, x, y, 9);
        expect(Math.abs(x - stone.cx)).toBeLessThanOrEqual(stone.hw + STONE_STYLES[id]!.gap + 1);
        const cx = stone.cx, cy = stone.cy;
        stoneAt(id, cx, cy, 9);
        expect([stone.cx, stone.cy]).toEqual([cx, cy]);
      }
    }
  });

  it('en brostensplet består af hele sten: ingen pixel uden for en stens eller fugens farver blandes med græs midt i pletten', () => {
    const g = createGround(8, 8, 1);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (x >= 6 && x < 18 && y >= 6 && y < 18) g.data[y * g.w + x] = 14;
    const t = buf(60, 60);
    renderGroundTile(t, g, 4, 150, 150, 1); // midt i pletten
    for (let i = 0; i < 60 * 60; i++) expect(t.data[i * 4 + 1]!).toBeLessThanOrEqual(t.data[i * 4]! + 12); // ingen grønlig pixel
  });

  it('fugerne mellem brosten og planker er gennemsigtige, og en sti af brosten lader terrænet under skinne igennem', () => {
    for (const id of [14, 17]) {
      const g = createGround(6, 6, id);
      const t = buf(100, 100);
      renderGroundTile(t, g, 4, 60, 60, 1);
      const alphas = Array.from({ length: 100 * 100 }, (_, i) => t.data[i * 4 + 3]!);
      expect(Math.min(...alphas), `materiale ${id}`).toBeLessThan(120);
      expect(Math.max(...alphas)).toBe(255);
    }
    const g = createGround(8, 8, 15); // grus
    g.path = new Uint8Array(g.w * g.h);
    g.path.fill(14, 0, g.path.length);
    const t = buf(100, 100);
    renderGroundTile(t, g, 4, 100, 100, 1);
    expect(Math.min(...Array.from({ length: 100 * 100 }, (_, i) => t.data[i * 4 + 3]!))).toBe(255); // grus ligger under hele vejen
    const plain = buf(100, 100);
    renderGroundTile(plain, createGround(8, 8, 15), 4, 100, 100, 1);
    let same = 0;
    for (let i = 0; i < 100 * 100; i++) if (t.data[i * 4] === plain.data[i * 4] && t.data[i * 4 + 1] === plain.data[i * 4 + 1]) same++;
    expect(same).toBeGreaterThan(100); // fuger, hvor gruset ses
  });

  it('en brostensplet på et tomt lag lader resten være tomt', () => {
    const g = createGround(8, 8, 0);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (x < 8 && y < 8) g.data[y * g.w + x] = 14;
    const t = buf(40, 40);
    renderGroundTile(t, g, 4, 300, 300, 1); // langt fra pletten
    for (let i = 0; i < 40 * 40; i++) expect(t.data[i * 4 + 3]).toBe(0);
  });
});

describe('flisernes fingeraftryk (gemte fliser)', () => {
  it('ændrer sig kun, når noget inden for flisens rækkevidde ændres', () => {
    const g = createGround(90, 65, 1);
    const base = tileSignature(g, 3, 0.5, 4, 4);
    expect(tileSignature(g, 3, 0.5, 4, 4)).toBe(base);
    expect(tileSignature(g, 4, 0.5, 4, 4)).not.toBe(base); // andet seed
    expect(tileSignature(g, 3, 0.4, 4, 4)).not.toBe(base); // anden skala
    // en celle langt væk (flise 4,4 dækker verdenspixels 2048..2560) rører ikke
    g.data[(20) * g.w + 300] = 14;
    expect(tileSignature(g, 3, 0.5, 4, 4)).toBe(base);
    // en celle midt i flisen gør
    g.data[185 * g.w + 185] = 14;
    expect(tileSignature(g, 3, 0.5, 4, 4)).not.toBe(base);
    // også en sti
    const g2 = createGround(90, 65, 1);
    g2.path = new Uint8Array(g2.w * g2.h);
    g2.path[185 * g2.w + 185] = 15;
    expect(tileSignature(g2, 3, 0.5, 4, 4)).not.toBe(base);
  });
});

describe('gulvlag', () => {
  it('på et gulv skæres planker til ved kanten; på grund er de hele og kan række ud over det malede', () => {
    const g = createGround(8, 8, 0);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (x >= 8 && x < 24 && y >= 8 && y < 24) g.data[y * g.w + x] = 17;
    const outside = (floor: boolean) => {
      const t = buf(120, 120);
      renderGroundTile(t, g, 4, 60, 60, 1, floor); // verdenspixels 60..180; det malede område er 100..300
      let n = 0;
      for (let i = 0; i < 120 * 120; i++) {
        const x = 60 + (i % 120), y = 60 + Math.floor(i / 120);
        if ((x < 96 || y < 96) && t.data[i * 4 + 3]! > 128) n++;
      }
      return n;
    };
    expect(outside(true)).toBe(0);
    expect(outside(false)).toBeGreaterThan(0);
  });

  it('fingeraftrykket afhænger af lagtypen', () => {
    const g = createGround(8, 8, 17);
    expect(tileSignature(g, 1, 0.5, 0, 0, true)).not.toBe(tileSignature(g, 1, 0.5, 0, 0, false));
  });
});
