import type { LayerType, ParamValue } from '../model/types';

export type CategoryKey = 'nature' | 'animals' | 'interior' | 'architecture' | 'hazards' | 'remains' | 'effects' | 'own';

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'nature', label: 'Natur' },
  { key: 'animals', label: 'Dyr' },
  { key: 'interior', label: 'Indretning' },
  { key: 'architecture', label: 'Arkitektur' },
  { key: 'hazards', label: 'Fælder og farer' },
  { key: 'remains', label: 'Levn' },
  { key: 'effects', label: 'Lys og effekter' },
  { key: 'own', label: 'Egne' },
];

/** En familie samler varianter af samme slags ting (Træer, Borde, Tønder …). */
export interface Family {
  key: string;
  label: string;
  category: CategoryKey;
  /** Vælges "Tilfældig" automatisk, når man klikker på familien (træer, sten …)? */
  randomDefault: boolean;
}

/** Familierne i den rækkefølge, de vises i vælgeren (se `taxonomy.ts`). Egne genstande tilføjer deres egen. */
export const FAMILIES: Family[] = [];

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
  /** Den familie, genstanden blev lavet i, før den blev flyttet (se `taxonomy.ts`). Generatoren og tags bruger den. */
  origin?: string;
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
  /** Ekstra tags (se `tags.ts`); familiens tags gælder altid. */
  tags?: string[];
  /** Hvis varianten udgår: nøglen på den, der afløser den. Gamle kort peger så videre. Slet aldrig en variant uden at sætte denne. */
  replacedBy?: string;
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

const listeners = new Set<() => void>();
/** Kaldes, når genstande tilføjes eller fjernes efter start (egne genstande). Returnerer en funktion, der afmelder. */
export function onKindsChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const changed = () => listeners.forEach((fn) => fn());

/** Tilføjer en familie, hvis den ikke findes (egne genstande). */
export function registerFamily(f: Family): void {
  if (!FAMILIES.some((x) => x.key === f.key)) FAMILIES.push(f);
}

/** Erstatter alle varianter, hvis nøgle starter med `prefix` (egne genstande genindlæses ved ændringer). */
export function replaceKindsWithPrefix(prefix: string, list: ObjectKind[]): void {
  for (const key of [...kinds.keys()]) if (key.startsWith(prefix)) kinds.delete(key);
  for (const k of list) {
    if (!k.key.startsWith(prefix)) throw new Error(`Nøglen ${k.key} starter ikke med ${prefix}.`);
    if (!FAMILIES.some((f) => f.key === k.family)) throw new Error(`Ukendt familie ${k.family} for ${k.key}.`);
    kinds.set(k.key, k);
  }
  changed();
}

export const getKind = (key: string): ObjectKind | undefined => kinds.get(key);

/** Varianten for en nøgle; følger `replacedBy`, hvis varianten er udgået (højst fem led). */
export function resolveKind(key: string): ObjectKind | undefined {
  let k = kinds.get(key);
  for (let i = 0; i < 5 && k?.replacedBy; i++) k = kinds.get(k.replacedBy) ?? k;
  return k;
}
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
