import { kind, type ObjectKind } from './registry';
import { drawPillar, drawRubble, drawStairs } from './basics/remains';

const P = { shadow: 14, bleed: 0.4 };

export const architectureKinds: ObjectKind[] = [
  kind({ key: 'pillar_round', family: 'pillar', name: 'Rund', w: 1, h: 1, randomRotation: true, shadow: P.shadow, bleed: 0.02, draw: (g, o) => drawPillar(g, o, 'round') }),
  kind({ key: 'pillar_square', family: 'pillar', name: 'Firkantet', w: 1, h: 1, shadow: P.shadow, bleed: 0.02, draw: (g, o) => drawPillar(g, o, 'square') }),
  kind({ key: 'pillar_broken', family: 'pillar', name: 'Brækket', w: 1, h: 1, randomRotation: true, shadow: 6, bleed: P.bleed, draw: (g, o) => drawPillar(g, o, 'broken') }),
  kind({ key: 'stairs_stone', family: 'stairs', name: 'Stentrappe', w: 2, h: 2, keepAspect: false, bleed: 0.02, draw: (g, o) => drawStairs(g, o, false) }),
  kind({ key: 'stairs_wood', family: 'stairs', name: 'Trætrappe', w: 1.5, h: 2, keepAspect: false, bleed: 0.02, draw: (g, o) => drawStairs(g, o, true) }),
  kind({ key: 'rubble', family: 'rubble', name: 'Murbrokker', w: 1.5, h: 1.5, randomRotation: true, sizeJitter: 0.3, shadow: 3, bleed: 0.05, draw: drawRubble }),
];
