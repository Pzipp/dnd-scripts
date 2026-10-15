import type { Family, ObjectKind } from '../registry';
import { shopKinds } from './shops';
import { craftKinds } from './crafts';
import { tortureKinds } from './torture';

/** Ekstra genstande (pack3): bygningsindretning. Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack3Families`. */
export const pack3Families: Family[] = [
  { key: 'shop', label: 'Butikker og markedsboder', category: 'interior', randomDefault: false },
  { key: 'craft', label: 'Værksteder og håndværk', category: 'interior', randomDefault: false },
  { key: 'torture', label: 'Tortur og henrettelse', category: 'interior', randomDefault: false },
];

export const pack3Kinds: ObjectKind[] = [...shopKinds, ...craftKinds, ...tortureKinds];
