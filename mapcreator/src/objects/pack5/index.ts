import type { ObjectKind } from '../registry';
import { roofsKinds } from './roofs';
import { doorBlockKinds } from './doors';
import { doorSpecialKinds } from './doors2';
import { mysteryKinds1 } from './mystery';
import { mysteryKinds2 } from './mystery2';
import { facadeKinds, signKindsList } from './facade';

/** Ekstra genstande (pack5). Hver fil i mappen eksporterer en liste af varianter; samles her. */
export const pack5Kinds: ObjectKind[] = [...roofsKinds, ...doorBlockKinds, ...doorSpecialKinds, ...facadeKinds, ...signKindsList, ...mysteryKinds1, ...mysteryKinds2];
