import type { ObjectKind } from '../registry';
import { shopKinds } from './shops';
import { craftKinds } from './crafts';
import { tortureKinds } from './torture';
import { weaponKinds } from './weapons';
import { bodyKinds } from './bodies';

/** Ekstra genstande (pack3): bygningsindretning. Hver fil i mappen eksporterer en liste af varianter; samles her. */
export const pack3Kinds: ObjectKind[] = [...shopKinds, ...craftKinds, ...tortureKinds, ...weaponKinds, ...bodyKinds];
