import { describe, expect, it } from 'vitest';
import { fillPaint, paintTiles } from '../model/commands';
import { createDoc } from '../model/doc';
import { serializeDoc, parseDoc } from '../model/doc';
import { encodeGround, createGround } from '../model/ground';
import { History } from '../model/history';
import {
  choosePpc, createPaint, decodePaintMeta, encodePaintMeta, ensureTile, isBlank, keyName, liveKeys, looksLikeWater, PAINT_TILE, pixelAt, putTile, tileKey,
  type PaintData,
} from '../model/paint';
import { PaintStroke, gridRect, type Brush } from '../render/paintBrush';
import { attachSource, fillSource } from '../render/paintSource';
import { materializeAll } from '../render/paintView';
import { STONE_STYLES, stone, stoneAt } from '../render/stones';
import type { MapDoc } from '../model/types';

const brush = (over: Partial<Brush> = {}): Brush => ({
  kind: 'round', size: 100, opacity: 1, hardness: 1, roughness: 0.5, material: 6, textureScale: 1, rotation: 0, wholeStones: true, erase: false, seed: 1, ...over,
});

const blank = (wc = 10, hc = 10): PaintData => createPaint(wc, hc);
/** Fylder hele laget med en ensfarvet dækkende farve. */
function solid(p: PaintData, rgb: [number, number, number]): void {
  for (let ty = 0; ty < Math.ceil(p.h / PAINT_TILE); ty++) {
    for (let tx = 0; tx < Math.ceil(p.w / PAINT_TILE); tx++) {
      const t = ensureTile(p, tx, ty)!;
      for (let i = 0; i < t.data.length; i += 4) { t.data[i] = rgb[0]; t.data[i + 1] = rgb[1]; t.data[i + 2] = rgb[2]; t.data[i + 3] = 255; }
    }
  }
}

describe('opløsning', () => {
  it('store kort får færre pixels pr. felt, og et felt er altid hele pixels', () => {
    expect(choosePpc(60, 40)).toBe(50);
    expect(choosePpc(120, 40)).toBe(25);
    expect(choosePpc(300, 300)).toBe(10);
    for (const w of [10, 80, 200, 300]) expect(Number.isInteger(choosePpc(w, w))).toBe(true);
  });
});

describe('penselstrøg', () => {
  it('en hård rund pensel maler en dækkende cirkel i materialets farver', () => {
    const p = blank();
    const s = new PaintStroke(p, brush());
    expect(s.dab(250, 250)).not.toBeNull();
    const mid = pixelAt(p, 250, 250)!;
    expect(mid[3]).toBe(255);
    expect(looksLikeWater(mid)).toBe(true);
    expect(pixelAt(p, 250 + 60, 250)?.[3] ?? 0).toBe(0); // uden for radius 50
    expect(pixelAt(p, 250 + 45, 250)![3]).toBe(255);
  });

  it('gennemsigtighed blander med det, der lå under, og overlappende stempler stakker ikke', () => {
    const p = blank();
    solid(p, [200, 180, 120]);
    const s = new PaintStroke(p, brush({ opacity: 0.4 }));
    s.line(150, 250, 350, 250);
    const once = pixelAt(p, 250, 250)!;
    const water = new PaintStroke(blank(), brush());
    water.dab(250, 250);
    const w = pixelAt(water.paint, 250, 250)!;
    expect(once[3]).toBe(255);
    for (let c = 0; c < 3; c++) {
      const expected = 0.6 * [200, 180, 120][c]! + 0.4 * w[c]!;
      expect(Math.abs(once[c]! - expected)).toBeLessThan(2);
    }
  });

  it('en blød pensel har en overgang fra dækkende til gennemsigtig', () => {
    const p = blank();
    new PaintStroke(p, brush({ hardness: 0, size: 200 })).dab(250, 250);
    const alphas = [0, 20, 40, 60, 80, 99].map((d) => pixelAt(p, 250 + d, 250)![3]);
    expect(alphas[0]).toBe(255);
    for (let i = 1; i < alphas.length; i++) expect(alphas[i]!).toBeLessThanOrEqual(alphas[i - 1]!);
    expect(alphas.some((a) => a > 10 && a < 245)).toBe(true);
  });

  it('kantpenslen giver en skarp, men ujævn kant', () => {
    const p = blank(20, 20);
    new PaintStroke(p, brush({ kind: 'edge', roughness: 1, size: 300, seed: 5 })).dab(500, 500);
    const radii: number[] = [];
    for (let a = 0; a < 360; a += 10) {
      let r = 0;
      for (; r < 260; r++) {
        const c = pixelAt(p, 500 + Math.cos((a * Math.PI) / 180) * r, 500 + Math.sin((a * Math.PI) / 180) * r);
        if (!c || c[3] < 128) break;
      }
      radii.push(r);
    }
    const spread = Math.max(...radii) - Math.min(...radii);
    expect(spread).toBeGreaterThan(8);
    // skarp: få pixels med delvis dækning
    let soft = 0, solid = 0;
    for (let y = 340; y < 660; y++) for (let x = 340; x < 660; x++) {
      const a = pixelAt(p, x, y)?.[3] ?? 0;
      if (a > 0 && a < 255) soft++;
      if (a === 255) solid++;
    }
    expect(soft).toBeLessThan(solid * 0.06);
  });

  it('gitterpenslen maler hele felter', () => {
    const p = blank();
    new PaintStroke(p, brush({ kind: 'grid', size: 100 })).dab(130, 80);
    const r = gridRect(130, 80, 100);
    expect(r).toEqual({ x: 100, y: 50, w: 100, h: 100 }); // 2 × 2 felter, hjørnet nærmest musen
    expect(pixelAt(p, 101, 51)![3]).toBe(255);
    expect(pixelAt(p, 199, 149)![3]).toBe(255);
    expect(pixelAt(p, 99, 100)?.[3] ?? 0).toBe(0);
    expect(pixelAt(p, 100, 151)?.[3] ?? 0).toBe(0);
  });

  it('viskelæderet fjerner maling, og gennemsigtighed fjerner kun en del', () => {
    const p = blank();
    solid(p, [10, 200, 10]);
    new PaintStroke(p, brush({ erase: true, size: 100 })).dab(250, 250);
    expect(pixelAt(p, 250, 250)![3]).toBe(0);
    expect(pixelAt(p, 400, 400)![3]).toBe(255);
    new PaintStroke(p, brush({ erase: true, size: 100, opacity: 0.5 })).dab(400, 400);
    const a = pixelAt(p, 400, 400)![3];
    expect(a).toBeGreaterThan(110);
    expect(a).toBeLessThan(145);
  });

  it('mønstrets størrelse og drejning ændrer billedet', () => {
    const a = blank(), b = blank();
    new PaintStroke(a, brush({ material: 3 })).dab(250, 250);
    new PaintStroke(b, brush({ material: 3, textureScale: 2, rotation: 45 })).dab(250, 250);
    expect(Array.from(a.tiles.get(0)!.data)).not.toEqual(Array.from(b.tiles.get(0)!.data));
  });

  it('hele sten: hver sten er enten helt malet eller urørt', () => {
    const p = blank(12, 12);
    const id = 14;
    new PaintStroke(p, brush({ material: id, size: 220, hardness: 1 })).line(250, 300, 350, 300);
    const st = STONE_STYLES[id]!;
    const seen = new Map<string, { inner: number; painted: number }>();
    for (let y = 150; y < 450; y += 2) {
      for (let x = 100; x < 520; x += 2) {
        stoneAt(id, x, y, 1);
        const lx = Math.abs(x - stone.cx), ly = Math.abs(y - stone.cy);
        if (lx > stone.hw - 3 || ly > stone.hh - 3) continue; // kun midten af stenen (ikke kant og fuge)
        const key = `${stone.row}:${stone.col}`;
        const rec = seen.get(key) ?? { inner: 0, painted: 0 };
        rec.inner++;
        if ((pixelAt(p, x, y)?.[3] ?? 0) > 200) rec.painted++;
        seen.set(key, rec);
      }
    }
    void st;
    let painted = 0;
    for (const r of seen.values()) {
      if (r.painted > 0) painted++;
      expect(r.painted === 0 || r.painted === r.inner).toBe(true);
    }
    expect(painted).toBeGreaterThan(5);
    expect(painted).toBeLessThan(seen.size);
  });

  it('uden hele sten skæres stenmønstret ved penselkanten', () => {
    const p = blank(12, 12);
    new PaintStroke(p, brush({ material: 14, wholeStones: false, size: 200 })).dab(300, 300);
    expect(pixelAt(p, 300, 300)![3]).toBeGreaterThan(0);
    expect(pixelAt(p, 300 + 130, 300)?.[3] ?? 0).toBe(0);
  });

  it('et strøg uden for kortet maler ikke og afbryder ikke', () => {
    const p = blank();
    const s = new PaintStroke(p, brush());
    expect(s.dab(-500, -500)).toBeNull();
    expect(s.finish()).toBeNull();
  });
});

describe('fortryd og gentag', () => {
  function stroked(): { doc: MapDoc; p: PaintData; h: History } {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    return { doc, p: doc.layers[0]!.paint!, h: new History() };
  }

  it('et strøg kan fortrydes og gentages og giver nøjagtig de samme pixels', () => {
    const { doc, p, h } = stroked();
    ensureTile(p, 0, 0);
    const before = Uint8ClampedArray.from(p.tiles.get(0)!.data);
    const s = new PaintStroke(p, brush({ size: 160 }));
    s.line(100, 100, 400, 300);
    const painted = Uint8ClampedArray.from(p.tiles.get(0)!.data);
    expect(painted).not.toEqual(before);
    const done = s.finish()!;
    h.execute(doc, paintTiles(doc.layers[0]!.id, done.before, done.rect));
    expect(Array.from(p.tiles.get(0)!.data)).toEqual(Array.from(painted));
    h.undo(doc);
    expect(Array.from(p.tiles.get(0)!.data)).toEqual(Array.from(before));
    h.redo(doc);
    expect(Array.from(p.tiles.get(0)!.data)).toEqual(Array.from(painted));
    h.undo(doc);
    h.undo(doc);
    expect(Array.from(p.tiles.get(0)!.data)).toEqual(Array.from(before));
  });

  it('fortryd fjerner fliser, der kun fandtes på grund af strøget', () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const l = doc.layers[0]!;
    delete l.paint!.fill;
    delete l.paint!.lazy;
    const p = l.paint!;
    const s = new PaintStroke(p, brush());
    s.dab(100, 100);
    expect(p.tiles.size).toBe(1);
    const h = new History();
    const done = s.finish()!;
    h.execute(doc, paintTiles(l.id, done.before, done.rect));
    h.undo(doc);
    expect(p.tiles.size).toBe(0);
    h.redo(doc);
    expect(p.tiles.size).toBe(1);
    expect(pixelAt(p, 100, 100)![3]).toBe(255);
  });

  it('et afbrudt strøg lægger det gamle tilbage', () => {
    const p = blank();
    solid(p, [1, 2, 3]);
    const before = Uint8ClampedArray.from(p.tiles.get(0)!.data);
    const s = new PaintStroke(p, brush());
    s.dab(250, 250);
    s.cancel();
    expect(Array.from(p.tiles.get(0)!.data)).toEqual(Array.from(before));
  });

  it('fyld og ryd kan fortrydes', () => {
    const { doc, p, h } = stroked();
    const id = doc.layers[0]!.id;
    const make = (pp: PaintData, f: { material: number; ox: number; oy: number }) => fillSource(f.material, doc.seed, pp.ppc / 50, f.ox, f.oy);
    h.execute(doc, fillPaint(id, 0, make, 'Ryd'));
    expect(p.fill).toBeUndefined();
    expect(p.tiles.size).toBe(0);
    h.execute(doc, fillPaint(id, 3, make, 'Fyld'));
    expect(p.fill?.material).toBe(3);
    ensureTile(p, 0, 0);
    expect(pixelAt(p, 10, 10)![3]).toBe(255);
    h.undo(doc);
    expect(p.fill).toBeUndefined();
    h.undo(doc);
    expect(p.fill?.material).toBe(1);
  });

  it('historikken smider de ældste væk, når fliserne fylder for meget', () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const h = new History();
    const big = (n: number) => ({ label: String(n), apply() {}, revert() {}, bytes: 100 * 1024 * 1024 });
    for (let i = 0; i < 5; i++) h.execute(doc, big(i));
    let steps = 0;
    while (h.undo(doc)) steps++;
    expect(steps).toBe(3);
  });
});

describe('baggrund og ældre kort', () => {
  it('fliser tegnes først ved behov og er dækkende (græs)', () => {
    const doc = createDoc({ name: 't', widthCells: 20, heightCells: 20 });
    const p = doc.layers[0]!.paint!;
    expect(p.tiles.size).toBe(0);
    ensureTile(p, 1, 1);
    expect(p.tiles.size).toBe(1);
    expect(isBlank(p.tiles.get(tileKey(1, 1))!.data)).toBe(false);
    expect(pixelAt(p, 300, 300)![1]).toBeGreaterThan(pixelAt(p, 300, 300)![2]); // grønt
  });

  it('baggrunden er stadig den samme, når mønstret forskydes med kortet', () => {
    const a = createPaint(10, 10, 1);
    attachSource(a, 7);
    const b = createPaint(10, 10, 1);
    b.fill = { material: 1, ox: 100, oy: 50 };
    attachSource(b, 7);
    ensureTile(a, 0, 0);
    ensureTile(b, 0, 0);
    // pixel (110, 70) i b svarer til (10, 20) i a
    const pa = pixelAt(a, 10, 20)!;
    const pb = pixelAt(b, 110, 70)!;
    expect(Array.from(pb)).toEqual(Array.from(pa));
  });

  it('et ældre kort (terrænmaske) tegnes med den gamle tegning og skal tegnes færdigt, før det gemmes', async () => {
    const g = createGround(6, 6, 3);
    const doc = createDoc({ name: 't', widthCells: 6, heightCells: 6 });
    const raw = JSON.parse(JSON.stringify(serializeDoc(doc))) as { layers: Record<string, unknown>[] };
    delete raw.layers[0]!.paint;
    raw.layers[0]!.ground = encodeGround(g);
    const old = parseDoc(raw);
    const p = old.layers[0]!.paint!;
    expect(old.layers[0]!.ground).toBeUndefined();
    expect(p.lazy?.legacy).toBe(true);
    expect(p.tiles.size).toBe(0);
    await materializeAll(old, { onlyLegacy: true });
    expect(p.lazy).toBeUndefined();
    expect(p.tiles.size).toBe(Math.ceil(p.w / PAINT_TILE) * Math.ceil(p.h / PAINT_TILE));
    const c = pixelAt(p, 100, 100)!;
    expect(c[3]).toBe(255);
    expect(c[0]).toBeGreaterThan(c[2]); // sand
  });
});

describe('gem og åbn', () => {
  it('oplysningerne om lag og fliser gemmes uden billeder og kan læses igen', () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const p = doc.layers[0]!.paint!;
    new PaintStroke(p, brush()).dab(100, 100);
    const json = JSON.parse(JSON.stringify(serializeDoc(doc)));
    expect(JSON.stringify(json).length).toBeLessThan(3000);
    expect(json.layers[0].paint.tiles).toEqual(['0_0']);
    const back = parseDoc(json);
    const q = back.layers[0]!.paint!;
    expect(q.fill?.material).toBe(1);
    expect([...q.remote]).toEqual([0]);
    expect(q.ppc).toBe(p.ppc);
  });

  it('en tile, der er malet helt væk på en baggrund, tegnes ikke tilbage fra baggrunden', () => {
    const p = createPaint(10, 10, 1);
    attachSource(p, 3);
    ensureTile(p, 0, 0);
    p.tiles.get(0)!.data.fill(0);
    const meta = encodePaintMeta(p);
    expect(meta.tiles).toEqual([]);
    expect(meta.blank).toEqual(['0_0']);
    const back = decodePaintMeta(JSON.parse(JSON.stringify(meta)), 10, 10);
    attachSource(back, 3);
    expect(back.tiles.has(0)).toBe(true);
    expect(isBlank(back.tiles.get(0)!.data)).toBe(true);
    expect(ensureTile(back, 0, 0)).toBe(back.tiles.get(0));
  });

  it('flisenøgler og tomme fliser', () => {
    const p = blank();
    putTile(p, tileKey(1, 2), new Uint8ClampedArray(PAINT_TILE * PAINT_TILE * 4));
    expect(keyName(tileKey(1, 2))).toBe('1_2');
    expect(liveKeys(p)).toEqual([]);
  });

  it('ugyldige oplysninger afvises', () => {
    expect(() => decodePaintMeta({ ppc: 7, w: 70, h: 70, tiles: [] }, 10, 10)).toThrow();
    expect(() => decodePaintMeta({ ppc: 50, w: 500, h: 500, tiles: ['../x'] }, 10, 10)).toThrow();
    expect(() => decodePaintMeta({ ppc: 50, w: 400, h: 500, tiles: [] }, 10, 10)).toThrow();
  });
});
