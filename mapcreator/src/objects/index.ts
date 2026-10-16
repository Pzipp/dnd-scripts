import { architectureKinds } from './architecture';
import { effectKinds } from './effects';
import { interiorKinds } from './interior';
import { natureKinds } from './nature';
import { extraFamilies, extraKinds } from './extra';
import { basicsFamilies, basicsKinds } from './basics';
import { dungeonFamilies, dungeonKinds } from './dungeon';
import { designerKinds } from './designer';
import { pack2Families, pack2Kinds } from './pack2';
import { pack3Families, pack3Kinds } from './pack3';
import { pack4Families, pack4Kinds } from './pack4';
import { pack5Families, pack5Kinds } from './pack5';
import { pack6Families, pack6Kinds } from './pack6';
import { pack7Families, pack7Kinds } from './pack7';
import { pack8Families, pack8Kinds } from './pack8';
import { pack9Families, pack9Kinds } from './pack9';
import { FAMILIES, registerKinds } from './registry';
import { remainsKinds } from './remains';

FAMILIES.push(...extraFamilies, ...pack2Families, ...pack3Families, ...pack4Families, ...pack5Families, ...pack6Families, ...pack7Families, ...pack8Families, ...pack9Families, ...basicsFamilies, ...dungeonFamilies);
registerKinds([...natureKinds, ...interiorKinds, ...remainsKinds, ...architectureKinds, ...effectKinds, ...extraKinds, ...pack2Kinds, ...pack3Kinds, ...pack4Kinds, ...pack5Kinds, ...pack6Kinds, ...pack7Kinds, ...pack8Kinds, ...pack9Kinds, ...basicsKinds, ...dungeonKinds, ...designerKinds]);

export * from './registry';
export * from './tags';
export { loadDesignerImages } from './designer';
