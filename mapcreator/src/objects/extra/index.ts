import type { Family, ObjectKind } from '../registry';
import { natureExtraKinds } from './nature';
import { campExtraKinds } from './camp';
import { dungeonKinds } from './dungeon';
import { homeKinds } from './home';
import { townKinds } from './town';

/**
 * Ekstra genstande (pakke 1). Hver fil i denne mappe eksporterer en liste af varianter; samles her.
 * Nye familier lægges i `extraFamilies`, så registret ikke skal rettes.
 */
export const extraFamilies: Family[] = [
  { key: 'mushroom', label: 'Svampe', category: 'nature', randomDefault: true },
  { key: 'tallgrass', label: 'Høje græstotter', category: 'nature', randomDefault: true },
  { key: 'waterplant', label: 'Vandplanter og vadesten', category: 'nature', randomDefault: false },
  { key: 'groundcover', label: 'Blade, rødder og blomster', category: 'nature', randomDefault: false },
  { key: 'megalith', label: 'Stendysser og runesten', category: 'nature', randomDefault: false },
  { key: 'stall', label: 'Stande og diske', category: 'interior', randomDefault: false },
  { key: 'well', label: 'Brønde og springvand', category: 'architecture', randomDefault: false },
  { key: 'cart', label: 'Vogne', category: 'interior', randomDefault: false },
  { key: 'hearth', label: 'Ildsteder og smedje', category: 'interior', randomDefault: false },
  { key: 'rug', label: 'Tæpper', category: 'interior', randomDefault: false },
  { key: 'storage', label: 'Reoler og stativer', category: 'interior', randomDefault: false },
  { key: 'tomb', label: 'Sarkofager og altre', category: 'remains', randomDefault: false },
  { key: 'magic', label: 'Magiske cirkler', category: 'effects', randomDefault: false },
  { key: 'trap', label: 'Fælder, huller og grave', category: 'architecture', randomDefault: false },
  { key: 'treasure', label: 'Skat', category: 'interior', randomDefault: false },
  { key: 'statue', label: 'Statuer', category: 'architecture', randomDefault: false },
  { key: 'tent', label: 'Telte', category: 'interior', randomDefault: false },
  { key: 'camp', label: 'Lejrplads', category: 'interior', randomDefault: false },
  { key: 'goods', label: 'Høballer og sække', category: 'interior', randomDefault: false },
];

export const extraKinds: ObjectKind[] = [...natureExtraKinds, ...townKinds, ...homeKinds, ...dungeonKinds, ...campExtraKinds];
