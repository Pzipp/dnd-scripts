/** Kortdokumentet: én JSON-fil pr. kort. Alt andet (billede, eksport) er afledt af den. */
export const DOC_VERSION = 1;
/** Pixels pr. felt (5 ft) i eksport og verdenskoordinater. */
export const CELL_PX = 50;
export const MAX_CELLS = 300;

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
}
