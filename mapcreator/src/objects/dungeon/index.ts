import type { ObjectKind } from '../registry';
import { gateKinds } from './gates';
import { rockfallKinds } from './rocks';
import { stairKinds } from './stairs';
import { wallmountKinds } from './wallmount';

/** Dungeon- og grottedetaljer: gitre og døre, nedfald, udhuggede trapper og broer, ting på væggen. */
export const dungeonKinds: ObjectKind[] = [...gateKinds, ...rockfallKinds, ...stairKinds, ...wallmountKinds];
