import type { Family, ObjectKind } from '../registry';
import { roofsKinds } from './roofs';
import { doorBlockKinds } from './doors';
import { doorSpecialKinds } from './doors2';

/** Ekstra genstande (pack5). Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack5Families`. */
export const pack5Families: Family[] = [
  { key: 'roof', label: 'Tage', category: 'architecture', randomDefault: false },
  { key: 'door', label: 'Døre og porte', category: 'architecture', randomDefault: false },
];

export const pack5Kinds: ObjectKind[] = [...roofsKinds, ...doorBlockKinds, ...doorSpecialKinds];
