import type { GroundData } from './ground';
import type { PaintData } from './paint';

/** Kortdokumentet: én JSON-fil pr. kort. Alt andet (billede, eksport) er afledt af den. */
export const DOC_VERSION = 2;
/** Pixels pr. felt (5 ft) i eksport og verdenskoordinater. */
export const CELL_PX = 50;
export const MAX_CELLS = 300;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ParamValue = string | number | boolean;

/** En genstand på et kort (træ, kiste, lig, lyspøl …). Mål og position i verdenspixels (50 px = ét felt). */
export interface MapElement {
  id: string;
  /** Nøgle i genstandsregistret (objects/registry.ts). */
  kind: string;
  /** Midtpunkt. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rotation i radianer. */
  rot: number;
  seed: number;
  /** Højde over lagets højde (påvirker skyggen og rækkefølgen). */
  z: number;
  params: Record<string, ParamValue>;
}

export type WallStyle =
  | 'stone' | 'brick' | 'wood' | 'hedge' | 'cave' | 'cave_dark' | 'cave_ice'
  // linjer uden åbninger: stier, broer, kløfter og hegn (se render/lines.ts)
  | 'path_dirt' | 'path_gravel' | 'path_cobble' | 'bridge_wood' | 'bridge_stone' | 'bridge_rope' | 'cliff' | 'ravine' | 'cave_rim' | 'cave_rim_purple' | 'cave_rim_ice' | 'fence';
export type OpeningKind = 'opening' | 'door' | 'double_door' | 'gate' | 'window';

/** Noget i en mur: en åbning, en dør, en port eller et vindue. Placeret ved buelængden `at` fra murens start. */
export interface Opening {
  id: string;
  kind: OpeningKind;
  /** Midtpunktets afstand langs muren (verdenspixels). */
  at: number;
  /** Bredde langs muren (verdenspixels). */
  width: number;
  /** Åben dør/port (svinger ud til den ene side). */
  open: boolean;
  /** Hvilken side døren svinger til, og hvilken ende hængslerne sidder i. */
  flip: boolean;
}

/** En mur: en linje af punkter (verdenspixels) med tykkelse. Længde og form følger af punkterne. */
export interface Wall {
  id: string;
  style: WallStyle;
  points: [number, number][];
  /** Lukket mur (sidste punkt forbindes med første). */
  closed: boolean;
  /** Tykkelse i verdenspixels. */
  thickness: number;
  seed: number;
  openings: Opening[];
  /** Udfyldning (kun former): terrænmateriale inde i linjen. En lukket linje med `fill` er en form. */
  fill?: { material: number };
  /** Vend linjen: stilarter med forskellig inder- og yderside (klippekant, kløft, bro) vender den anden vej. */
  flip?: boolean;
  /** `false` = ingen kant, kun udfyldning (former). Standard: kant. */
  stroke?: boolean;
  /** Hvad den blev tegnet som (til navne og værktøjer); selve formen er altid punkterne. */
  shape?: 'line' | 'rect' | 'ellipse' | 'free';
}

export type LayerType = 'ground' | 'floor' | 'objects' | 'walls' | 'effects';

/** Lag med malet underlag: Grund og Gulv. */
export const hasGround = (type: LayerType): boolean => type === 'ground' || type === 'floor';

export const LAYER_TYPE_LABEL: Record<LayerType, string> = {
  ground: 'Grund',
  floor: 'Gulv',
  objects: 'Genstande',
  walls: 'Linjer og former',
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
  /** Kun grund- og gulvlag: det malede underlag (et fladt billede i fliser). */
  paint?: PaintData;
  /** Kun kort fra før det malede underlag: terrænmasken, indtil laget er omdannet (se `adoptLegacy`). */
  ground?: GroundData;
  /** Kun genstands- og effektlag. */
  elements?: MapElement[];
  /** Kun mur-lag. */
  walls?: Wall[];
}

/** Hvor en udgave sendes hen: hentes som fil, eller lægges i det simple VTT (kampagne eller General Maps, evt. i et room). */
export type ExportTarget = { kind: 'download' } | { kind: 'vtt'; campaign: string; room: string };

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
  /** Mål for udgaven (standard: hentes som fil). */
  target?: ExportTarget;
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
