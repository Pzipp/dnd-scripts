import { describe, expect, it } from 'vitest';
import { addElements, removeElements, transformElement, updateElement } from '../model/commands';
import { createDoc, createLayer } from '../model/doc';
import { hitTest, handlePos, resizeBy, rotationTo, toLocal, toWorld } from '../model/geometry';
import { History } from '../model/history';
import type { MapElement } from '../model/types';
import { allKinds, defaultParams, FAMILIES, familyKinds, getFamily } from '../objects';

/** Et lærred, der bare tager imod alle kald (nok til at se, om tegnefunktionerne kører uden fejl). */
function fakeContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} };
  const target: Record<string, unknown> = {};
  return new Proxy(target, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => gradient;
      return () => undefined;
    },
    set(t, k: string, v) {
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const el = (over: Partial<MapElement> = {}): MapElement => ({ id: 'e1', kind: 'rock_small', x: 100, y: 100, w: 60, h: 40, rot: 0, seed: 1, z: 0, params: {}, ...over });

describe('genstandsregister', () => {
  it('har familier med mindst én variant, og alle varianter har en kendt familie', () => {
    for (const f of FAMILIES) expect(familyKinds(f.key).length, f.key).toBeGreaterThan(0);
    for (const k of allKinds()) expect(getFamily(k.family), k.key).toBeDefined();
  });

  it('har varianter af træer, sten, tønder og borde', () => {
    expect(familyKinds('tree').length).toBeGreaterThanOrEqual(5);
    expect(familyKinds('rock').length).toBeGreaterThanOrEqual(3);
    expect(familyKinds('barrel').map((k) => k.key)).toEqual(expect.arrayContaining(['barrel_upright', 'barrel_fallen', 'barrel_broken']));
    expect(familyKinds('table').length).toBeGreaterThanOrEqual(3);
  });

  it('alle varianter kan tegnes med forskellige seed og parametre', () => {
    const g = fakeContext();
    for (const k of allKinds()) {
      for (const seed of [1, 99, 123456]) {
        expect(() => k.draw(g, { w: k.w * 50, h: k.h * 50, seed, params: defaultParams(k) }), k.key).not.toThrow();
      }
      // alle valg for hver parameter
      for (const p of k.params) {
        const values = p.type === 'select' ? p.options.map((o) => o.value) : p.type === 'toggle' ? [true, false] : [p.min, p.max];
        for (const v of values) expect(() => k.draw(g, { w: k.w * 50, h: k.h * 50, seed: 5, params: { ...defaultParams(k), [p.key]: v } }), `${k.key}.${p.key}`).not.toThrow();
      }
    }
  });
});

describe('geometri', () => {
  it('toLocal og toWorld er hinandens omvendte, også med rotation', () => {
    const e = el({ rot: 0.7 });
    const [lx, ly] = toLocal(e, 130, 90);
    const [wx, wy] = toWorld(e, lx, ly);
    expect(wx).toBeCloseTo(130);
    expect(wy).toBeCloseTo(90);
  });

  it('hitTest følger den roterede boks', () => {
    const e = el({ w: 100, h: 20, rot: Math.PI / 2 }); // vandret boks drejet til lodret
    expect(hitTest(e, 100, 140)).toBe(true);
    expect(hitTest(e, 140, 100)).toBe(false);
  });

  it('skalering holder det modsatte hjørne stille', () => {
    const e = el({ x: 100, y: 100, w: 60, h: 40 });
    const r = resizeBy(e, 'se', 160, 140, false);
    expect(r.w).toBeCloseTo(90);
    expect(r.h).toBeCloseTo(60);
    expect(r.x - r.w / 2).toBeCloseTo(70); // venstre kant uændret
    expect(r.y - r.h / 2).toBeCloseTo(80); // øverste kant uændret
  });

  it('hjørneskalering kan låse proportionerne', () => {
    const e = el({ w: 60, h: 40 });
    const r = resizeBy(e, 'se', 400, 130, true);
    expect(r.w / r.h).toBeCloseTo(60 / 40);
  });

  it('skalering virker i den roterede genstands egne akser', () => {
    const e = el({ x: 0, y: 0, w: 100, h: 20, rot: Math.PI / 2 });
    const [hx, hy] = handlePos(e, 'e', 0); // højre kant er nu nederst
    const r = resizeBy(e, 'e', hx, hy + 50, false);
    expect(r.w).toBeCloseTo(150);
    expect(r.h).toBeCloseTo(20);
  });

  it('skalering kan ikke blive mindre end minimum', () => {
    const r = resizeBy(el(), 'e', -1000, 100, false, 8);
    expect(r.w).toBe(8);
  });

  it('rotation peger mod markøren og kan runde af', () => {
    const e = el({ x: 0, y: 0 });
    expect(rotationTo(e, 100, 0)).toBeCloseTo(Math.PI / 2);
    expect(rotationTo(e, 100, 5, Math.PI / 12)).toBeCloseTo(Math.PI / 2);
  });
});

describe('genstandskommandoer', () => {
  const setup = () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const layer = createLayer('objects', 'G');
    doc.layers.push(layer);
    return { doc, layer, h: new History() };
  };

  it('tilføj, slet og fortryd', () => {
    const { doc, layer, h } = setup();
    h.execute(doc, addElements(layer.id, [el({ id: 'a' }), el({ id: 'b' })]));
    expect(layer.elements).toHaveLength(2);
    h.execute(doc, removeElements(layer.id, ['a']));
    expect(layer.elements!.map((e) => e.id)).toEqual(['b']);
    h.undo(doc);
    expect(layer.elements!.map((e) => e.id)).toEqual(['a', 'b']);
    h.undo(doc);
    expect(layer.elements).toHaveLength(0);
  });

  it('en træk-handling bliver én fortryd, og den gamle position kommer tilbage', () => {
    const { doc, layer, h } = setup();
    const e = el({ id: 'a', x: 100, y: 100 });
    h.execute(doc, addElements(layer.id, [e]));
    e.x = 250; // trækket har allerede flyttet genstanden
    h.execute(doc, transformElement(layer.id, 'a', { x: 100 }, { x: 250 }));
    h.undo(doc);
    expect(e.x).toBe(100);
    h.redo(doc);
    expect(e.x).toBe(250);
  });

  it('ændring af variant og parametre kan fortrydes', () => {
    const { doc, layer, h } = setup();
    const e = el({ id: 'a', kind: 'barrel_upright', params: { x: 1 } });
    h.execute(doc, addElements(layer.id, [e]));
    h.execute(doc, updateElement(layer.id, 'a', { kind: 'barrel_broken', params: {} }));
    expect(e.kind).toBe('barrel_broken');
    h.undo(doc);
    expect(e.kind).toBe('barrel_upright');
    expect(e.params).toEqual({ x: 1 });
  });
});
