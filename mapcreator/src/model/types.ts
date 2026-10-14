import type { GroundData } from './ground';

/** Kortdokumentet: én JSON-fil pr. kort. Alt andet (billede, eksport) er afledt af den. */
export const DOC_VERSION = 1;
/** Pixels pr. felt (5 ft) i eksport og verdenskoordinater. */
export const CELL_PX = 50;
export const MAX_CELLS = 300;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayerType = 'ground' | 'objects' | 'walls' | 'effects';

export const LAYER_TYPE_LABEL: Record<LayerType, string> = {
  ground: 'Grund',
  objects: 'Genstande',
  walls: 'Mure',
  effects: 'Effekter',
};

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  /** 0..1 */
  opacity: number;
  /** Lagets højde: styrer tegnerækkefølge og skyggelængde. */
  height: number;
  /** Kun grundlag: terrænmasken. */
  ground?: GroundData;
}

export type ExportFormat = 'png' | 'webp' | 'jpeg';

/** En navngiven udgave af kortet ("Skovsti - med lig"): hvilke lag der er med, og hvordan billedet laves. */
export interface ExportPreset {
  id: string;
  name: string;
  /** Lag, der udelades i denne udgave (nye lag er med som standard). */
  hiddenLayerIds: string[];
  format: ExportFormat;
  /** Pixels pr. felt (50 = standard). */
  pxPerCell: number;
  /** 0..1, kun webp og jpeg. */
  quality: number;
}

export interface MapDoc {
  version: number;
  id: string;
  name: string;
  widthCells: number;
  heightCells: number;
  seed: number;
  /** Retning lyset kommer fra, i grader (225 = øverst til venstre). */
  lightAngle: number;
  /** Nederst først: sidste lag tegnes øverst. */
  layers: Layer[];
  exports: ExportPreset[];
}
