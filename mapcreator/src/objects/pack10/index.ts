import type { Family, ObjectKind } from '../registry';
import { shipKinds } from './ships';

/** Ekstra genstande (pack10): havn, skibe, bygader og fæstninger. Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack10Families`. */
export const pack10Families: Family[] = [
  { key: 'ships', label: 'Skibe og vrag', category: 'architecture', randomDefault: false },
];

export const pack10Kinds: ObjectKind[] = [...shipKinds];
