import type { Material } from './materials';

/**
 * Materialer, der er et gentagende billede (`assets/mat/<key>.webp`, 768 × 768 px, 8 × 8 m). `scale` er verdenspixels pr. billedpixel
 * (billedet formindskes ved indlæsningen); `avg` er gennemsnitsfarven, der bruges, til billedet er læst ind. Id'erne må aldrig omnummereres.
 */
export interface ImageMaterial extends Material {
  scale: number;
  avg: [number, number, number];
}

export const IMAGE_MATERIALS: ImageMaterial[] = [
  { id: 22, key: 'planks_oak', name: 'Plankegulv, eg', swatch: '#7b5232', group: 'Veje og gulve', scale: 0.25, avg: [123, 82, 50], pathable: true },
  { id: 23, key: 'planks_broken', name: 'Plankegulv, grå, ødelagt', swatch: '#50473f', group: 'Veje og gulve', scale: 0.36, avg: [80, 71, 63], pathable: true },
  { id: 24, key: 'planks_grey', name: 'Plankegulv, grå', swatch: '#47413e', group: 'Veje og gulve', scale: 0.34, avg: [71, 65, 62], pathable: true },
  { id: 25, key: 'water_calm', name: 'Vand, stille (billede)', swatch: '#33b7d3', group: 'Vand', scale: 0.34, avg: [51, 183, 211] },
  { id: 26, key: 'grass_forest_img', name: 'Græs, skov (billede)', swatch: '#353b1e', group: 'Natur', scale: 0.34, avg: [53, 59, 30] },
  { id: 27, key: 'grass_dry_img', name: 'Græs, tørt (billede)', swatch: '#987545', group: 'Natur', scale: 0.34, avg: [152, 117, 69] },
  { id: 28, key: 'grass_meadow_img', name: 'Græs, mark (billede)', swatch: '#609530', group: 'Natur', scale: 0.34, avg: [96, 149, 48] },
  { id: 29, key: 'planks_oak_broken', name: 'Plankegulv, eg, ødelagt', swatch: '#684b34', group: 'Veje og gulve', scale: 0.36, avg: [104, 75, 52], pathable: true },
  { id: 30, key: 'water_deep', name: 'Vand, dybt (billede)', swatch: '#0e283f', group: 'Vand', scale: 0.34, avg: [14, 40, 63] },
  { id: 31, key: 'water_rough', name: 'Vand, uroligt (billede)', swatch: '#31697d', group: 'Vand', scale: 0.34, avg: [49, 105, 125] },
  { id: 32, key: 'burnt1', name: 'Brændt jord 1', swatch: '#2a2828', group: 'Natur', scale: 0.34, avg: [42, 40, 40] },
  { id: 33, key: 'burnt2', name: 'Brændt jord 2', swatch: '#282624', group: 'Natur', scale: 0.34, avg: [40, 38, 36] },
  { id: 34, key: 'cave_earth', name: 'Grotte, jord og grus', swatch: '#3b332a', group: 'Sand og sten', scale: 0.34, avg: [59, 51, 42] },
  { id: 35, key: 'cave_rough', name: 'Grotte, ru sten', swatch: '#5c544b', group: 'Sand og sten', scale: 0.34, avg: [92, 84, 75] },
  { id: 36, key: 'cave_wet', name: 'Grotte, våd sten', swatch: '#353530', group: 'Sand og sten', scale: 0.34, avg: [53, 53, 48] },
  { id: 37, key: 'rock_limestone', name: 'Klippe, kalksten med mos', swatch: '#5a5b4f', group: 'Sand og sten', scale: 0.34, avg: [90, 91, 79] },
  { id: 38, key: 'bricks1', name: 'Mursten 1', swatch: '#5b483b', group: 'Veje og gulve', scale: 0.34, avg: [91, 72, 59], pathable: true },
  { id: 39, key: 'bricks2', name: 'Mursten 2', swatch: '#634e41', group: 'Veje og gulve', scale: 0.34, avg: [99, 78, 65], pathable: true },
  { id: 40, key: 'rock_volcanic', name: 'Klippe, vulkansk', swatch: '#2b2c33', group: 'Sand og sten', scale: 0.34, avg: [43, 44, 51] },
  { id: 41, key: 'dungeon_ancient', name: 'Dungeon, gamle fliser', swatch: '#43463b', group: 'Veje og gulve', scale: 0.34, avg: [67, 70, 59], pathable: true },
  { id: 42, key: 'dungeon_blood1', name: 'Dungeon, blodigt 1', swatch: '#44413d', group: 'Veje og gulve', scale: 0.34, avg: [68, 65, 61], pathable: true },
  { id: 43, key: 'dungeon_blood2', name: 'Dungeon, blodigt 2', swatch: '#474441', group: 'Veje og gulve', scale: 0.34, avg: [71, 68, 65], pathable: true },
  { id: 44, key: 'dungeon_clean', name: 'Dungeon, stenfliser', swatch: '#6c6a66', group: 'Veje og gulve', scale: 0.34, avg: [108, 106, 102], pathable: true },
  { id: 45, key: 'snow_img', name: 'Sne (billede)', swatch: '#d1d9e7', group: 'Natur', scale: 0.34, avg: [209, 217, 231] },
  { id: 46, key: 'rock_frozen', name: 'Klippe, frossen', swatch: '#7790ae', group: 'Sand og sten', scale: 0.34, avg: [119, 144, 174] },
  { id: 47, key: 'ice', name: 'Is', swatch: '#97b9d0', group: 'Natur', scale: 0.34, avg: [151, 185, 208] },
  { id: 48, key: 'lava1', name: 'Lava 1', swatch: '#692210', group: 'Lava', scale: 0.34, avg: [105, 34, 16] },
  { id: 49, key: 'lava2', name: 'Lava 2', swatch: '#7a2a0f', group: 'Lava', scale: 0.34, avg: [122, 42, 15] },
  { id: 50, key: 'field', name: 'Pløjet mark', swatch: '#493423', group: 'Natur', scale: 0.34, avg: [73, 52, 35] },
  { id: 51, key: 'marble', name: 'Marmorgulv', swatch: '#948f84', group: 'Veje og gulve', scale: 0.34, avg: [148, 143, 132], pathable: true },
  { id: 52, key: 'red_sand1', name: 'Rødt sand (billede) 1', swatch: '#c25b29', group: 'Sand og sten', scale: 0.34, avg: [194, 91, 41] },
  { id: 53, key: 'red_sand2', name: 'Rødt sand (billede) 2', swatch: '#c35c2f', group: 'Sand og sten', scale: 0.34, avg: [195, 92, 47] },
  { id: 54, key: 'rock_canyon', name: 'Klippe, rød ørken', swatch: '#c56f44', group: 'Sand og sten', scale: 0.34, avg: [197, 111, 68] },
  { id: 55, key: 'sewer', name: 'Kloakgulv', swatch: '#353520', group: 'Veje og gulve', scale: 0.34, avg: [53, 53, 32], pathable: true },
  { id: 56, key: 'rock_grey', name: 'Klippe, grå', swatch: '#525353', group: 'Sand og sten', scale: 0.34, avg: [82, 83, 83] },
  { id: 57, key: 'rock_sandstone', name: 'Klippe, brun sandsten', swatch: '#785534', group: 'Sand og sten', scale: 0.34, avg: [120, 85, 52] },
  { id: 58, key: 'swamp_mud', name: 'Sumpmudder', swatch: '#413a21', group: 'Natur', scale: 0.34, avg: [65, 58, 33] },
];
