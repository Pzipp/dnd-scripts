import type { Family, ObjectKind } from '../registry';
import { roofsKinds } from './roofs';
import { doorBlockKinds } from './doors';
import { doorSpecialKinds } from './doors2';
import { mysteryKinds1 } from './mystery';
import { mysteryKinds2 } from './mystery2';
import { facadeKinds, signKindsList } from './facade';

/** Ekstra genstande (pack5). Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack5Families`. */
export const pack5Families: Family[] = [
  { key: 'roof', label: 'Tage', category: 'architecture', randomDefault: false },
  { key: 'mystery', label: 'Mystik og ukendte ting', category: 'effects', randomDefault: false },
  { key: 'facade', label: 'Facade og bygningsdele', category: 'architecture', randomDefault: false },
  { key: 'sign', label: 'Skilte', category: 'architecture', randomDefault: false },
  { key: 'door', label: 'Døre og porte', category: 'architecture', randomDefault: false },
];

export const pack5Kinds: ObjectKind[] = [...roofsKinds, ...doorBlockKinds, ...doorSpecialKinds, ...facadeKinds, ...signKindsList, ...mysteryKinds1, ...mysteryKinds2];
