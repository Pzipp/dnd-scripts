import type { ObjectKind } from '../registry';
import { shipKinds } from './ships';

/** Ekstra genstande (pack10): havn, skibe, bygader og fæstninger. Hver fil i mappen eksporterer en liste af varianter; samles her. */
export const pack10Kinds: ObjectKind[] = [...shipKinds];
