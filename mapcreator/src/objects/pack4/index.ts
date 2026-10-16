import type { ObjectKind } from '../registry';
import { mountainKinds } from './mountains';
import { ravineKinds } from './ravines';
import { bridgeKinds } from './bridges';
import { towerKinds } from './towers';
import { trackKinds } from './tracks';

/** Ekstra genstande (pack4). Hver fil i mappen eksporterer en liste af varianter; samles her. */
export const pack4Kinds: ObjectKind[] = [...mountainKinds, ...ravineKinds, ...bridgeKinds, ...towerKinds, ...trackKinds];
