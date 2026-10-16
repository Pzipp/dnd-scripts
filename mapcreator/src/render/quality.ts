/**
 * Forhåndsvisningens kvalitet. Eksporten er altid i fuld kvalitet; kun det, man ser og arbejder i, kan gøres lettere.
 * Lav er mærkbart hurtigere og stadig pæn; Medium er standard; Høj er den fulde forhåndsvisning.
 */
export type Quality = 'low' | 'medium' | 'high';

export interface QualityProfile {
  /** Terrænets forhåndsvisning: pixels pr. verdenspixel (højst) og længste side i pixels (højst). */
  ground: number;
  groundEdge: number;
  /** Højeste pixeltæthed på lærredet (1 = ingen ekstra skarphed på skærme med høj opløsning). */
  dpr: number;
  /** Højeste opløsning af genstandenes tegninger (pixels pr. verdenspixel). */
  sprite: number;
  /** Skyggens sløring: 1 = fuld, 0 = hård skygge uden sløring (billigere). */
  shadow: number;
}

export const PROFILES: Record<Quality, QualityProfile> = {
  low: { ground: 0.2, groundEdge: 1100, dpr: 1, sprite: 0.5, shadow: 0 },
  medium: { ground: 0.35, groundEdge: 1700, dpr: 1.5, sprite: 1, shadow: 0.6 },
  high: { ground: 0.5, groundEdge: 2400, dpr: 4, sprite: 2, shadow: 1 },
};

/** Fuld kvalitet: bruges af eksporten. */
export const FULL_PROFILE: QualityProfile = { ground: 1, groundEdge: Infinity, dpr: Infinity, sprite: 2, shadow: 1 };

export const QUALITIES: Quality[] = ['low', 'medium', 'high'];

export const QUALITY_LABEL: Record<Quality, string> = { low: 'Lav', medium: 'Medium', high: 'Høj' };

const KEY = 'mapcreator.quality';

export function loadQuality(): Quality {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'low' || v === 'medium' || v === 'high') return v;
  } catch {
    /* ingen lager: brug standarden */
  }
  return 'medium';
}

export function saveQuality(q: Quality): void {
  try {
    localStorage.setItem(KEY, q);
  } catch {
    /* kun en bekvemmelighed */
  }
}

let current: Quality = 'medium';

/** Hent den gemte kvalitet og gør den gældende (kaldes ved start). */
export function initialQuality(): Quality {
  const q = loadQuality();
  current = q;
  return q;
}

export const setQualityMode = (q: Quality): void => { current = q; };
export const profile = (): QualityProfile => PROFILES[current];
