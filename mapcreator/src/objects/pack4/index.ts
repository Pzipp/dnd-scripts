import type { Family, ObjectKind } from '../registry';
import { mountainKinds } from './mountains';
import { ravineKinds } from './ravines';

/** Ekstra genstande (pack4). Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack4Families`. */
export const pack4Families: Family[] = [
  { key: 'mountain', label: 'Bjerge og klipper', category: 'nature', randomDefault: false },
  { key: 'ravine', label: 'Kløfter og afgrunde', category: 'nature', randomDefault: false },
];

export const pack4Kinds: ObjectKind[] = [...mountainKinds, ...ravineKinds];
