import { architectureKinds } from './architecture';
import { effectKinds } from './effects';
import { interiorKinds } from './interior';
import { natureKinds } from './nature';
import { extraKinds } from './extra';
import { basicsKinds } from './basics';
import { dungeonKinds } from './dungeon';
import { designerKinds } from './designer';
import { pack2Kinds } from './pack2';
import { pack3Kinds } from './pack3';
import { pack4Kinds } from './pack4';
import { pack5Kinds } from './pack5';
import { pack6Kinds } from './pack6';
import { pack7Kinds } from './pack7';
import { pack8Kinds } from './pack8';
import { pack9Kinds } from './pack9';
import { pack10Kinds } from './pack10';
import { pack11Kinds } from './pack11';
import { FAMILIES, registerKinds } from './registry';
import { applyTaxonomy, FINAL_FAMILIES } from './taxonomy';
import { remainsKinds } from './remains';

FAMILIES.push(...FINAL_FAMILIES);
registerKinds(applyTaxonomy([...natureKinds, ...interiorKinds, ...remainsKinds, ...architectureKinds, ...effectKinds, ...extraKinds, ...pack2Kinds, ...pack3Kinds, ...pack4Kinds, ...pack5Kinds, ...pack6Kinds, ...pack7Kinds, ...pack8Kinds, ...pack9Kinds, ...pack10Kinds, ...pack11Kinds, ...basicsKinds, ...dungeonKinds, ...designerKinds]));

export * from './registry';
export * from './tags';
export { familyAlias } from './taxonomy';
export { loadDesignerImages } from './designer';
