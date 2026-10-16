import type { ObjectKind } from '../registry';
import { natureExtraKinds } from './nature';
import { campExtraKinds } from './camp';
import { dungeonKinds } from './dungeon';
import { homeKinds } from './home';
import { townKinds } from './town';

/**
 * Ekstra genstande (pakke 1). Hver fil i denne mappe eksporterer en liste af varianter; samles her.
 */
export const extraKinds: ObjectKind[] = [...natureExtraKinds, ...townKinds, ...homeKinds, ...dungeonKinds, ...campExtraKinds];
