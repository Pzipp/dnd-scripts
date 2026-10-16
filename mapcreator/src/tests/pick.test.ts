import { describe, expect, it } from 'vitest';
import { createDoc, createLayer } from '../model/doc';
import { pickAt } from '../model/pick';

describe('pickAt', () => {
  it('finder kun genstande på det valgte lag, når et lag er givet', () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const a = createLayer('objects', 'A');
    const b = createLayer('objects', 'B');
    const el = (id: string) => ({ id, kind: 'tree_broad', x: 100, y: 100, w: 80, h: 80, rot: 0, seed: 1, z: 0, params: {} });
    a.elements!.push(el('a1'));
    b.elements!.push(el('b1'));
    doc.layers.push(a, b);
    expect(pickAt(doc, 100, 100)?.layer.id).toBe(b.id);
    expect(pickAt(doc, 100, 100, 0, a.id)?.layer.id).toBe(a.id);
    expect(pickAt(doc, 100, 100, 0, doc.layers[0]!.id)).toBeNull();
  });
});
