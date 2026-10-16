import { decodeGround, type EncodedGround } from './ground';
import { createPaint, decodePaintMeta, encodePaintMeta } from './paint';
import { adoptLegacy, attachSource } from '../render/paintSource';
import { newId, newSeed } from './ids';
import { DOC_VERSION, hasGround, MAX_CELLS, type ExportPreset, type Layer, type LayerType, type MapDoc } from './types';
import { MATERIAL_GRASS } from '../render/materials';
import { resolveKind } from '../objects';

export function createLayer(type: LayerType, name: string, doc?: Pick<MapDoc, 'widthCells' | 'heightCells'> & { seed?: number }, fill = 0): Layer {
  const layer: Layer = { id: newId(), name, type, visible: true, locked: false, opacity: 1, height: 0 };
  if (hasGround(type) && doc) {
    layer.paint = createPaint(doc.widthCells, doc.heightCells, fill);
    attachSource(layer.paint, doc.seed ?? 0);
  }
  if (type === 'objects' || type === 'effects') layer.elements = [];
  if (type === 'walls') layer.walls = [];
  return layer;
}

export function createPreset(name: string): ExportPreset {
  return { id: newId(), name, hiddenLayerIds: [], format: 'png', pxPerCell: 50, quality: 0.92 };
}

export interface NewDocOptions {
  name: string;
  widthCells: number;
  heightCells: number;
}

export function clampCells(n: number): number {
  return Math.min(MAX_CELLS, Math.max(1, Math.round(n) || 1));
}

export function createDoc(opts: NewDocOptions): MapDoc {
  const name = opts.name.trim() || 'Nyt kort';
  const dims = { widthCells: clampCells(opts.widthCells), heightCells: clampCells(opts.heightCells) };
  const seed = newSeed();
  return {
    version: DOC_VERSION,
    id: newId(),
    name,
    ...dims,
    seed,
    lightAngle: 225,
    layers: [createLayer('ground', 'Grund', { ...dims, seed }, MATERIAL_GRASS)],
    exports: [createPreset(name)],
  };
}

/**
 * Dokumentet som ren JSON. Malede lag står kun med oplysninger (opløsning og hvilke fliser der findes); selve billederne
 * gemmes som fliser hos serveren (se `api.savePaint`). Lag fra ældre kort skal være tegnet færdige først (`materializeAll`).
 */
export function serializeDoc(doc: MapDoc, keys?: Map<string, number[]>): unknown {
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      const { ground: _ground, paint, ...rest } = l;
      return paint ? { ...rest, paint: encodePaintMeta(paint, keys?.get(l.id)) } : rest;
    }),
    exports: doc.exports.map((e) => ({ ...e, hiddenLayerIds: [...e.hiddenLayerIds] })),
  };
}

/** Tjekker et indlæst dokument (fra serveren) og kaster en dansk fejl, hvis det er ødelagt eller for nyt. */
export function parseDoc(raw: unknown): MapDoc {
  const d = raw as Partial<MapDoc> | null;
  if (!d || typeof d !== 'object' || !Array.isArray(d.layers) || typeof d.id !== 'string') {
    throw new Error('Kortfilen er ikke et gyldigt kort.');
  }
  if (typeof d.version !== 'number' || d.version > DOC_VERSION) {
    throw new Error('Kortet er gemt af en nyere version af kortbyggeren.');
  }
  const doc = d as MapDoc;
  for (const l of doc.layers) {
    const g = l.ground as unknown as { rle?: string } | undefined;
    const meta = (l as unknown as { paint?: unknown }).paint;
    if (l.type === 'objects' || l.type === 'effects') {
      l.elements ??= [];
      // udgåede varianter peger videre til deres afløser
      for (const el of l.elements) el.kind = resolveKind(el.kind)?.key ?? el.kind;
    }
    if (l.type === 'walls') l.walls ??= [];
    if (hasGround(l.type)) {
      if (meta) {
        l.paint = decodePaintMeta(meta, doc.widthCells, doc.heightCells);
        attachSource(l.paint, doc.seed ?? 0);
        delete l.ground;
      } else if (g?.rle !== undefined) l.ground = decodeGround(g as EncodedGround);
      else {
        l.paint = createPaint(doc.widthCells, doc.heightCells);
        delete l.ground;
      }
    }
  }
  adoptLegacy(doc);
  if (!Array.isArray(doc.exports)) doc.exports = [createPreset(doc.name)];
  return doc;
}
