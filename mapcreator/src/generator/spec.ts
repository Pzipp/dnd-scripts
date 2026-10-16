import type { Tag } from '../objects/tags';
import type { OpeningKind, WallStyle } from '../model/types';

/**
 * Områdetemaer som data. Et tema siger, hvad der skal ligge hvor (terræn, vand, veje, bygninger, genstande); selve
 * udførelsen står i `generate.ts`. Genstande vælges ud fra familier og tags, så nye genstande kommer med af sig selv.
 */

/** Materialenøgle (se render/materials.ts). */
export type Mat = string;

export interface Patch {
  material: Mat;
  /** Pletternes størrelse i felter. */
  scale: number;
  /** Andel af kortet (0..1), der dækkes. */
  amount: number;
  /** Kun oven på disse materialer (standard: alle). */
  on?: Mat[];
}

export interface Water {
  /** Søer: antal (min, maks) og radius i felter (min, maks). */
  lakes?: { count: [number, number]; radius: [number, number] };
  /** Floder fra kant til kant: antal og bredde i felter. */
  rivers?: { count: [number, number]; width: [number, number]; meander: number };
  /** Materiale rundt om vandet og dets bredde i felter. */
  bank?: { material: Mat; width: number };
  material?: Mat;
}

export interface Road {
  material: Mat;
  /** 'path' lægges oven på terrænet (kant og terræn blandes), 'base' erstatter terrænet. */
  layer: 'path' | 'base';
  width: [number, number];
  count: [number, number];
  meander: number;
}

export interface Rule {
  families?: string[];
  /** Bestemte varianter (overstyrer familier og tags). */
  keys?: string[];
  tags?: Tag[];
  /** Antal pr. 100 felter. */
  density: number;
  layer?: 'objects' | 'trees' | 'effects';
  /** Samler genstandene i klumper: pletternes størrelse i felter og andelen af kortet, der er klump. */
  clump?: { scale: number; amount: number };
  /** Kun oven på disse materialer (standard: alt undtagen vand). */
  on?: Mat[];
  /** Må stå på veje og stier. */
  onRoad?: boolean;
  /** Stå helst tæt ved vand (bredden i felter). */
  nearWater?: number;
  /** Stå ved kanten af sten/fjeld (grotte). */
  nearRock?: boolean;
  /** Størrelsesfaktor ud over varianternes egen. */
  scale?: [number, number];
}

export interface Furnish {
  families?: string[];
  /** Bestemte varianter (overstyrer familier og tags). */
  keys?: string[];
  tags?: Tag[];
  count: [number, number];
  /** 'wall' langs væggene, 'center' midt i rummet, 'any' hvor som helst. */
  where: 'wall' | 'center' | 'any';
}

export interface Building {
  /** Størrelse i felter (min, maks). */
  w: [number, number];
  h: [number, number];
  count: [number, number];
  wall: WallStyle;
  floor: Mat;
  furnish: Furnish[];
  windows?: number;
  door?: OpeningKind;
  /** Hvor mange procent af væggen, der er revet ned (ruin). */
  ruined?: number;
}

export interface Dungeon {
  rooms: [number, number];
  roomSize: [number, number];
  floor: Mat;
  rock: Mat;
  wall: WallStyle;
  types: { weight: number; furnish: Furnish[] }[];
}

export interface Cave {
  floor: Mat;
  rock: Mat;
  /** Andel af kortet, der er hule (0..1). */
  open: number;
}

export interface Theme {
  key: string;
  name: string;
  hint: string;
  /** Anbefalet størrelse i felter. */
  size: [number, number];
  base: Mat;
  patches?: Patch[];
  water?: Water;
  roads?: Road[];
  buildings?: Building;
  /** Bygningen fylder hele kortet (kro): 1 felt margin udenfor. */
  interior?: boolean;
  dungeon?: Dungeon;
  cave?: Cave;
  rules: Rule[];
}
