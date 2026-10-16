import type { Family, ObjectKind } from '../registry';
import { ruinKinds } from './ruins';
import { shrineKinds } from './shrines';
import { campKinds } from './camps';
import { siegeKinds } from './siege';
import { fantasyKinds } from './fantasy';
import { sacredKinds } from './sacred';
import { wildKinds } from './wild';
import { campMoreKinds } from './campmore';

/** Ekstra genstande (pack6). Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack6Families`. */
export const pack6Families: Family[] = [
  { key: 'ruins', label: 'Ruiner', category: 'architecture', randomDefault: false },
  { key: 'shrines', label: 'Helligdomme og monumenter', category: 'architecture', randomDefault: false },
  { key: 'fieldcamp', label: 'Lejr og felt', category: 'interior', randomDefault: false },
  { key: 'siege', label: 'Belejringsmaskiner', category: 'architecture', randomDefault: false },
  { key: 'boats', label: 'Både og skibe', category: 'architecture', randomDefault: false },
  { key: 'fantasy', label: 'Fantasy og magi', category: 'effects', randomDefault: false },
  { key: 'sacred', label: 'Stenkredse og gravsteder', category: 'architecture', randomDefault: false },
  { key: 'dockside', label: 'Havn og kaj', category: 'interior', randomDefault: false },
];

export const pack6Kinds: ObjectKind[] = [...ruinKinds, ...shrineKinds, ...campKinds, ...siegeKinds, ...fantasyKinds, ...sacredKinds, ...wildKinds, ...campMoreKinds];
