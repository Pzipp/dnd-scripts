import type { Family, ObjectKind } from '../registry';
import { ruinKinds } from './ruins';
import { shrineKinds } from './shrines';
import { campKinds } from './camps';
import { siegeKinds } from './siege';

/** Ekstra genstande (pack8). Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack8Families`. */
export const pack8Families: Family[] = [
  { key: 'ruins', label: 'Ruiner', category: 'architecture', randomDefault: false },
  { key: 'shrines', label: 'Helligdomme og monumenter', category: 'architecture', randomDefault: false },
  { key: 'fieldcamp', label: 'Lejr og felt', category: 'interior', randomDefault: false },
  { key: 'siege', label: 'Belejringsmaskiner', category: 'architecture', randomDefault: false },
  { key: 'boats', label: 'Både og skibe', category: 'architecture', randomDefault: false },
  { key: 'dockside', label: 'Havn og kaj', category: 'interior', randomDefault: false },
];

export const pack8Kinds: ObjectKind[] = [...ruinKinds, ...shrineKinds, ...campKinds, ...siegeKinds];
