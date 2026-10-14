import type { LayerType, ParamValue } from '../model/types';

export type CategoryKey = 'nature' | 'interior' | 'remains' | 'architecture' | 'effects';

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'nature', label: 'Natur' },
  { key: 'interior', label: 'Indretning' },
  { key: 'remains', label: 'Levn' },
  { key: 'architecture', label: 'Arkitektur' },
  { key: 'effects', label: 'Lys og effekter' },
];

/** En familie samler varianter af samme slags ting (Træer, Borde, Tønder …). */
export interface Family {
  key: string;
  label: string;
  category: CategoryKey;
  /** Vælges "Tilfældig" automatisk, når man klikker på familien (træer, sten …)? */
  randomDefault: boolean;
}

export const FAMILIES: Family[] = [
  { key: 'tree', label: 'Træer', category: 'nature', randomDefault: true },
  { key: 'rock', label: 'Sten', category: 'nature', randomDefault: true },
  { key: 'plant', label: 'Planter', category: 'nature', randomDefault: true },
  { key: 'wood', label: 'Træstammer', category: 'nature', randomDefault: false },
  { key: 'table', label: 'Borde', category: 'interior', randomDefault: false },
  { key: 'seat', label: 'Siddepladser', category: 'interior', randomDefault: false },
  { key: 'barrel', label: 'Tønder', category: 'interior', randomDefault: false },
  { key: 'crate', label: 'Kasser', category: 'interior', randomDefault: false },
  { key: 'chest', label: 'Kister', category: 'interior', randomDefault: false },
  { key: 'bed', label: 'Senge', category: 'interior', randomDefault: false },
  { key: 'corpse', label: 'Lig', category: 'remains', randomDefault: false },
  { key: 'blood', label: 'Blod', category: 'remains', randomDefault: false },
  { key: 'bones', label: 'Knogler', category: 'remains', randomDefault: true },
  { key: 'pillar', label: 'Piller', category: 'architecture', randomDefault: false },
  { key: 'stairs', label: 'Trapper', category: 'architecture', randomDefault: false },
  { key: 'rubble', label: 'Murbrokker', category: 'architecture', randomDefault: true },
  { key: 'light', label: 'Lys', category: 'effects', randomDefault: false },
  { key: 'fog', label: 'Tåge', category: 'effects', randomDefault: false },
];

export type ParamDef =
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; default: string }
  | { key: string; label: string; type: 'toggle'; default: boolean }
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number; default: number };

/** Det en tegnefunktion får: størrelsen (verdenspixels), seed og parametre. Tegnes med origo i midten. */
export interface DrawInput {
  w: number;
  h: number;
  seed: number;
  params: Record<string, ParamValue>;
}

export interface ObjectKind {
  key: string;
  /** Familien (se FAMILIES), fx 'tree'. */
  family: string;
  /** Navn på varianten, fx "Birk". */
  name: string;
  /** Standardstørrelse i felter. */
  w: number;
  h: number;
  /** Skaleres hjørnerne med faste proportioner (uden Shift)? */
  keepAspect: boolean;
  /** Får en tilfældig rotation, når den sættes ud (træer, sten). */
  randomRotation: boolean;
  /** 0..1: tilfældig størrelsesvariation ved udsætning. */
  sizeJitter: number;
  /** Skyggens afstand i verdenspixels ved højde 0. 0 = ingen skygge (lys, tåge, pletter). */
  shadow: number;
  /** Hvor langt tegningen må række uden for sin boks (andel af størrelsen pr. side). */
  bleed: number;
  /** Lag, den kan ligge på. */
  layers: LayerType[];
  params: ParamDef[];
  draw(g: CanvasRenderingContext2D, o: DrawInput): void;
}

type KindDef = Pick<ObjectKind, 'key' | 'family' | 'name' | 'w' | 'h' | 'draw'> & Partial<ObjectKind>;

/** Udfylder standardværdier, så en variant kun behøver at angive det, der er særligt. */
export function kind(def: KindDef): ObjectKind {
  return {
    keepAspect: true,
    randomRotation: false,
    sizeJitter: 0,
    shadow: 0,
    bleed: 0.04,
    layers: ['objects', 'effects'],
    params: [],
    ...def,
  };
}

const kinds = new Map<string, ObjectKind>();

export function registerKinds(list: ObjectKind[]): void {
  for (const k of list) {
    if (kinds.has(k.key)) throw new Error(`Genstanden ${k.key} er registreret to gange.`);
    if (!FAMILIES.some((f) => f.key === k.family)) throw new Error(`Ukendt familie ${k.family} for ${k.key}.`);
    kinds.set(k.key, k);
  }
}

export const getKind = (key: string): ObjectKind | undefined => kinds.get(key);
export const allKinds = (): ObjectKind[] => [...kinds.values()];
export const getFamily = (key: string): Family | undefined => FAMILIES.find((f) => f.key === key);
export const familyKinds = (family: string): ObjectKind[] => allKinds().filter((k) => k.family === family);
export const categoryOf = (k: ObjectKind): CategoryKey | undefined => getFamily(k.family)?.category;

export function defaultParams(k: ObjectKind): Record<string, ParamValue> {
  return Object.fromEntries(k.params.map((p) => [p.key, p.default]));
}

/** Parameterværdi med standard som reserve (gamle kort mangler nye parametre). */
export function param(o: DrawInput, key: string, fallback: string): string;
export function param(o: DrawInput, key: string, fallback: number): number;
export function param(o: DrawInput, key: string, fallback: boolean): boolean;
export function param(o: DrawInput, key: string, fallback: ParamValue): ParamValue {
  const v = o.params[key];
  return v === undefined ? fallback : v;
}
