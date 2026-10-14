import { describe, expect, it } from 'vitest';
import { createDoc, createLayer, parseDoc, serializeDoc } from '../model/doc';
import { allKinds, FAMILIES, FAMILY_TAGS, getKind, isTag, KIND_TAGS, kind, registerKinds, resolveKind, TAGS, tagsOf } from '../objects';
import { pack2Kinds } from '../objects/pack2';

const pack2 = new Set(pack2Kinds.map((k) => k.key));
const draw = () => {};

describe('tags', () => {
  it('tabellerne peger kun på familier og varianter, der findes', () => {
    for (const f of Object.keys(FAMILY_TAGS)) expect(FAMILIES.some((x) => x.key === f), `familie ${f}`).toBe(true);
    for (const k of Object.keys(KIND_TAGS)) expect(getKind(k), `variant ${k}`).toBeDefined();
  });

  it('alle tags er i ordforrådet', () => {
    for (const k of allKinds()) for (const t of tagsOf(k)) expect(isTag(t), `${k.key}: ${t}`).toBe(true);
    for (const t of Object.values(FAMILY_TAGS).flat()) expect(t in TAGS).toBe(true);
  });

  it('hver variant (uden pakke 2) har mindst ét tag, så en generator kan finde den', () => {
    const missing = allKinds().filter((k) => !pack2.has(k.key) && tagsOf(k).length === 0).map((k) => k.key);
    expect(missing).toEqual([]);
  });

  it('tags kan også sættes på selve varianten', () => {
    const k = kind({ key: 'test_tagged', family: 'tree', name: 'T', w: 1, h: 1, tags: ['desert'], draw });
    expect(tagsOf(k)).toEqual(expect.arrayContaining(['desert', 'forest']));
  });
});

describe('udgåede varianter', () => {
  registerKinds([
    kind({ key: 'test_new', family: 'rock', name: 'Ny', w: 1, h: 1, draw }),
    kind({ key: 'test_old', family: 'rock', name: 'Gammel', w: 1, h: 1, replacedBy: 'test_new', draw }),
  ]);

  it('resolveKind følger replacedBy', () => {
    expect(resolveKind('test_old')?.key).toBe('test_new');
    expect(resolveKind('test_new')?.key).toBe('test_new');
    expect(resolveKind('findes_ikke')).toBeUndefined();
  });

  it('et kort med en udgået variant åbnes med afløseren', () => {
    const doc = createDoc({ name: 't', widthCells: 10, heightCells: 10 });
    const layer = createLayer('objects', 'G');
    layer.elements = [{ id: 'a', kind: 'test_old', x: 1, y: 1, w: 50, h: 50, rot: 0, seed: 1, z: 0, params: {} }];
    doc.layers.push(layer);
    const back = parseDoc(JSON.parse(JSON.stringify(serializeDoc(doc))));
    expect(back.layers.at(-1)!.elements![0]!.kind).toBe('test_new');
  });
});
