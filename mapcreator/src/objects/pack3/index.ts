import type { Family, ObjectKind } from '../registry';
import { shopKinds } from './shops';

/** Ekstra genstande (pack3): bygningsindretning. Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack3Families`. */
export const pack3Families: Family[] = [
  { key: 'shop', label: 'Butikker og markedsboder', category: 'interior', randomDefault: false },
];

export const pack3Kinds: ObjectKind[] = [...shopKinds];
