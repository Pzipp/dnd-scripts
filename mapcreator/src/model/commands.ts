import type { Command } from './history';
import type { CellChange } from './ground';
import type { Layer, MapDoc, MapElement } from './types';

function indexOf(doc: MapDoc, id: string): number {
  const i = doc.layers.findIndex((l) => l.id === id);
  if (i < 0) throw new Error(`Lag ${id} findes ikke.`);
  return i;
}

export function addLayer(layer: Layer, index?: number): Command {
  let at = 0;
  return {
    label: `Tilføj lag "${layer.name}"`,
    selectsLayer: layer.id,
    apply(doc) {
      at = index ?? doc.layers.length;
      doc.layers.splice(at, 0, layer);
    },
    revert(doc) {
      doc.layers.splice(indexOf(doc, layer.id), 1);
    },
  };
}

export function removeLayer(id: string): Command {
  let removed: Layer | undefined;
  let at = 0;
  return {
    label: 'Slet lag',
    apply(doc) {
      at = indexOf(doc, id);
      removed = doc.layers.splice(at, 1)[0];
    },
    revert(doc) {
      if (removed) doc.layers.splice(at, 0, removed);
    },
  };
}

type LayerPatch = Partial<Omit<Layer, 'id' | 'type'>>;

class UpdateLayer implements Command {
  label = 'Ret lag';
  private before: LayerPatch = {};

  constructor(
    readonly id: string,
    private after: LayerPatch,
  ) {}

  private get keys(): string {
    return Object.keys(this.after).sort().join(',');
  }

  apply(doc: MapDoc): void {
    const layer = doc.layers[indexOf(doc, this.id)]!;
    this.before = {};
    for (const k of Object.keys(this.after) as (keyof LayerPatch)[]) {
      (this.before as Record<string, unknown>)[k] = layer[k];
    }
    Object.assign(layer, this.after);
  }

  revert(doc: MapDoc): void {
    Object.assign(doc.layers[indexOf(doc, this.id)]!, this.before);
  }

  /** Samler fx skydertrin på samme felt(er) af samme lag til én fortryd-handling. */
  merge(next: Command): boolean {
    if (!(next instanceof UpdateLayer) || next.id !== this.id || next.keys !== this.keys) return false;
    this.after = { ...next.after };
    return true;
  }
}

export function updateLayer(id: string, patch: LayerPatch): Command {
  return new UpdateLayer(id, { ...patch });
}

/** Flytter et lag `delta` pladser i listen (positiv = opad, dvs. tegnes senere/øverst). */
export function moveLayer(id: string, delta: number): Command {
  let from = -1;
  let to = -1;
  return {
    label: 'Flyt lag',
    apply(doc) {
      from = indexOf(doc, id);
      to = Math.min(doc.layers.length - 1, Math.max(0, from + delta));
      const [l] = doc.layers.splice(from, 1);
      doc.layers.splice(to, 0, l!);
    },
    revert(doc) {
      const [l] = doc.layers.splice(to, 1);
      doc.layers.splice(from, 0, l!);
    },
  };
}

export function renameDoc(name: string): Command {
  let before = '';
  return {
    label: 'Omdøb kort',
    apply(doc) {
      before = doc.name;
      doc.name = name;
    },
    revert(doc) {
      doc.name = before;
    },
  };
}

/** Maler eller fylder celler i et grundlag. Selve strøget er allerede tegnet, når kommandoen køres første gang. */
export function paintCells(layerId: string, change: CellChange): Command {
  const write = (doc: MapDoc, values: Uint8Array) => {
    const g = doc.layers[indexOf(doc, layerId)]!.ground;
    if (!g) throw new Error('Laget har ingen terrænmaske.');
    const { indices } = change;
    for (let k = 0; k < indices.length; k++) g.data[indices[k]!] = values[k]!;
  };
  return {
    label: 'Mal terræn',
    touches: { layerId, rect: change.rect },
    apply: (doc) => write(doc, change.after),
    revert: (doc) => write(doc, change.before),
  };
}

function elementsOf(doc: MapDoc, layerId: string): MapElement[] {
  const layer = doc.layers[indexOf(doc, layerId)]!;
  return (layer.elements ??= []);
}

export function addElements(layerId: string, added: MapElement[]): Command {
  return {
    label: added.length > 1 ? 'Tilføj genstande' : 'Tilføj genstand',
    selectsElement: added.length === 1 ? added[0]!.id : undefined,
    apply(doc) {
      elementsOf(doc, layerId).push(...added);
    },
    revert(doc) {
      const ids = new Set(added.map((e) => e.id));
      const els = elementsOf(doc, layerId);
      for (let i = els.length - 1; i >= 0; i--) if (ids.has(els[i]!.id)) els.splice(i, 1);
    },
  };
}

export function removeElements(layerId: string, ids: string[]): Command {
  let removed: { el: MapElement; at: number }[] = [];
  return {
    label: 'Slet genstand',
    apply(doc) {
      const els = elementsOf(doc, layerId);
      removed = [];
      for (let i = els.length - 1; i >= 0; i--) {
        if (ids.includes(els[i]!.id)) removed.unshift({ el: els.splice(i, 1)[0]!, at: i });
      }
    },
    revert(doc) {
      const els = elementsOf(doc, layerId);
      for (const r of removed) els.splice(r.at, 0, r.el);
    },
  };
}

export type ElementPatch = Partial<Pick<MapElement, 'kind' | 'x' | 'y' | 'w' | 'h' | 'rot' | 'z' | 'params'>>;

class UpdateElement implements Command {
  label = 'Ret genstand';
  constructor(
    readonly layerId: string,
    readonly id: string,
    private after: ElementPatch,
    private before?: ElementPatch,
  ) {}

  private find(doc: MapDoc): MapElement {
    const el = elementsOf(doc, this.layerId).find((e) => e.id === this.id);
    if (!el) throw new Error(`Genstand ${this.id} findes ikke.`);
    return el;
  }

  private get keys(): string {
    return Object.keys(this.after).sort().join(',');
  }

  apply(doc: MapDoc): void {
    const el = this.find(doc);
    if (!this.before) {
      this.before = {};
      for (const k of Object.keys(this.after) as (keyof ElementPatch)[]) {
        (this.before as Record<string, unknown>)[k] = k === 'params' ? { ...el.params } : el[k];
      }
    }
    Object.assign(el, structuredClone(this.after));
  }

  revert(doc: MapDoc): void {
    Object.assign(this.find(doc), structuredClone(this.before));
  }

  merge(next: Command): boolean {
    if (!(next instanceof UpdateElement) || next.id !== this.id || next.keys !== this.keys) return false;
    this.after = { ...next.after };
    return true;
  }
}

/** Ret felter på en genstand (fx fra egenskabspanelet). Hurtige ændringer af samme felt samles. */
export function updateElement(layerId: string, id: string, patch: ElementPatch): Command {
  return new UpdateElement(layerId, id, patch);
}

/** Flyt/skalér/rotér, hvor "før" er kendt på forhånd (genstanden er allerede ændret under trækket). */
export function transformElement(layerId: string, id: string, before: ElementPatch, after: ElementPatch): Command {
  const c = new UpdateElement(layerId, id, after, before);
  c.label = 'Ændr genstand';
  return c;
}
