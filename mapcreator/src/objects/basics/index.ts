import type { Family, ObjectKind } from '../registry';
import { plantKinds } from './plants';
import { woodKinds } from './wood';
import { rockKinds } from './rocks';
import { treeKinds } from './trees';

/** Nye basisgenstande (træer, buske, sten …). Hver fil i mappen eksporterer en liste; samles her. Nye familier lægges i `basicsFamilies`. */
export const basicsFamilies: Family[] = [];

export const basicsKinds: ObjectKind[] = [...treeKinds, ...rockKinds, ...plantKinds, ...woodKinds];

