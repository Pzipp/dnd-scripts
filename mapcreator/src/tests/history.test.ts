import { describe, expect, it } from 'vitest';
import { addLayer, moveLayer, removeLayer, updateLayer } from '../model/commands';
import { createDoc, createLayer } from '../model/doc';
import { History } from '../model/history';

const mk = () => createDoc({ name: 't', widthCells: 10, heightCells: 10 });

describe('history og kommandoer', () => {
  it('tilføj, fortryd, gentag lag', () => {
    const doc = mk();
    const h = new History();
    const l = createLayer('objects', 'Træer');
    h.execute(doc, addLayer(l));
    expect(doc.layers.map((x) => x.name)).toEqual(['Grund', 'Træer']);
    h.undo(doc);
    expect(doc.layers).toHaveLength(1);
    h.redo(doc);
    expect(doc.layers).toHaveLength(2);
  });

  it('en ny handling rydder gentag-stakken', () => {
    const doc = mk();
    const h = new History();
    h.execute(doc, addLayer(createLayer('walls', 'A')));
    h.undo(doc);
    expect(h.canRedo).toBe(true);
    h.execute(doc, addLayer(createLayer('walls', 'B')));
    expect(h.canRedo).toBe(false);
  });

  it('slet lag kommer tilbage på samme plads', () => {
    const doc = mk();
    const h = new History();
    const a = createLayer('objects', 'A');
    const b = createLayer('objects', 'B');
    h.execute(doc, addLayer(a));
    h.execute(doc, addLayer(b));
    h.execute(doc, removeLayer(a.id));
    expect(doc.layers.map((x) => x.name)).toEqual(['Grund', 'B']);
    h.undo(doc);
    expect(doc.layers.map((x) => x.name)).toEqual(['Grund', 'A', 'B']);
  });

  it('skydertrin på samme felt samles til én fortryd', () => {
    const doc = mk();
    let t = 1000;
    const h = new History(() => t);
    const id = doc.layers[0]!.id;
    for (const v of [0.9, 0.8, 0.5]) {
      h.execute(doc, updateLayer(id, { opacity: v }));
      t += 100;
    }
    expect(doc.layers[0]!.opacity).toBe(0.5);
    h.undo(doc);
    expect(doc.layers[0]!.opacity).toBe(1);
    expect(h.canUndo).toBe(false);
    h.redo(doc);
    expect(doc.layers[0]!.opacity).toBe(0.5);
  });

  it('samler ikke ændringer af forskellige felter eller efter pause', () => {
    const doc = mk();
    let t = 0;
    const h = new History(() => t);
    const id = doc.layers[0]!.id;
    h.execute(doc, updateLayer(id, { opacity: 0.5 }));
    t += 50;
    h.execute(doc, updateLayer(id, { height: 3 }));
    t += 5000;
    h.execute(doc, updateLayer(id, { height: 4 }));
    h.undo(doc);
    expect(doc.layers[0]!.height).toBe(3);
    h.undo(doc);
    expect(doc.layers[0]!.height).toBe(0);
    expect(doc.layers[0]!.opacity).toBe(0.5);
  });

  it('flyt lag opad og fortryd', () => {
    const doc = mk();
    const h = new History();
    const a = createLayer('objects', 'A');
    h.execute(doc, addLayer(a));
    h.execute(doc, moveLayer(doc.layers[0]!.id, 1));
    expect(doc.layers.map((x) => x.name)).toEqual(['A', 'Grund']);
    h.undo(doc);
    expect(doc.layers.map((x) => x.name)).toEqual(['Grund', 'A']);
  });
});
