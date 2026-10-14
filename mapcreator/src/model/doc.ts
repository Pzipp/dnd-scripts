import { newId, newSeed } from './ids';
import { DOC_VERSION, MAX_CELLS, type Layer, type LayerType, type MapDoc } from './types';

export function createLayer(type: LayerType, name: string): Layer {
  return { id: newId(), name, type, visible: true, locked: false, opacity: 1, height: 0 };
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
  return {
    version: DOC_VERSION,
    id: newId(),
    name: opts.name.trim() || 'Nyt kort',
    widthCells: clampCells(opts.widthCells),
    heightCells: clampCells(opts.heightCells),
    seed: newSeed(),
    lightAngle: 225,
    layers: [createLayer('ground', 'Grund')],
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
  return d as MapDoc;
}
