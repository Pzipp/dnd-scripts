# Prompts til Microsoft Designer

Alle prompts til billeder, vi har lavet (eller vil lave) til kortbyggeren. `[x]` = billedet er lavet og lagt ind som materiale i `mapcreator/src/assets/mat/` (se `docs/mapcreator.md`, afsnittet Materialer); `[ ]` = ikke lavet endnu.

Regler for prompterne:

- Designer tillader højst **1000 tegn** pr. prompt. Alle prompts her er under.
- Teksturer er sømløse, kvadratiske og dækker **8 × 8 m** (ca. 5,25 felter). Mønstre med faste størrelser (fliser, marmor) bedes laves med et **lige** antal elementer, så de gentages uden søm; et helt antal felter pr. billede (fx 5 × 5) får dem til at falde sammen med gridden.
- Bed om 1024 × 1024 px eller mere. Billederne formindskes til 768 px (WebP) ved indlæsningen.
- Genstandsark: ensfarvet lysegrå baggrund, ingen kastede skygger (kortbyggeren lægger selv skygge på), 9 ting i et 3 × 3-gitter med god afstand, så *Egne genstande …* kan skære dem ud.

## Plankegulve

- [x] **Plankegulv, eg (intakt)** – materiale 22

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor; each plank is 27 cm (10.5 inches) wide and 1.3 to 2 m long. Ordinary wooden plank floor, warm medium-brown oak: 30 horizontal rows of narrow planks, 4-6 planks per row of clearly varying length, staggered joints, thin dark gaps, wood grain along each board, a few small knots and nail heads, noticeably varying plank tones. No single standout plank or mark. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Plankegulv, eg, ødelagt** – materiale 29

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor; each plank is 27 cm (10.5 inches) wide and 1.3 to 2 m long, holes are 20 to 60 cm. Old damaged wooden plank floor of a ruin, warm medium-brown oak: 30 horizontal rows of narrow planks, 4-6 planks per row of varying length, staggered joints. Cracked, splintered boards, a few broken or missing planks showing dark soil, dark rotten patches, nails, dusty dirt in the gaps. Damage small and evenly spread, no single large hole. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Plankegulv, grå (intakt)** – materiale 24

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor; each plank is 27 cm (10.5 inches) wide and 1.3 to 2 m long. Ordinary intact wooden plank floor, dark grey-brown weathered wood: 30 horizontal rows of narrow planks, 4-6 planks per row of varying length, staggered joints, thin dark gaps, wood grain along each board, a few small knots and nail heads, subtle varying plank tones. No cracks, holes or missing boards. No standout plank or mark. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Plankegulv, grå, ødelagt** – materiale 23

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor; each plank is 27 cm (10.5 inches) wide and 1.3 to 2 m long, holes are 20 to 60 cm. Old damaged wooden plank floor of a ruin: 30 horizontal rows of narrow grey-brown weathered planks, 4-6 planks per row of varying length, staggered joints. Cracked, warped, splintered boards, a few broken or missing planks showing dark gaps, rotten dark patches, nails, dusty dirt in the gaps. Damage small and evenly spread, no single large hole or standout mark. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```


## Vand

- [x] **Vand, stille** – materiale 25

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of water surface; ripples are 30 to 80 cm apart, light patches 1 to 2 m wide. Calm shallow water seen from above, clear turquoise-blue, very gentle soft ripples, faint light caustics, a slightly lighter and darker blue variation in large soft patches, no foam, no waves, no objects, no shoreline. Smooth and quiet, no single standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Vand, dybt** – materiale 30

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of water surface; swirls and darker patches are 1 to 3 m wide, tiny highlights 5 to 10 cm. Deep dark water seen from above, deep navy and teal blue, almost opaque, very subtle slow swirling currents, faint darker depths, tiny soft highlights, no foam, no visible bottom, no objects, no shoreline. Calm and mysterious, no single standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Vand, uroligt** – materiale 31

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of water surface; waves are 40 to 90 cm apart, foam streaks 20 to 60 cm long. Choppy turbulent water seen from above, medium blue-green, many small and medium waves with white foam crests and streaks, strong ripples running in varied directions, lively surface with sparkles. Evenly distributed, no single large wave or standout feature, no objects, no shoreline. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```


## Græs

- [x] **Græs, mark** – materiale 28

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of ground; show stylized grass clumps 20 to 30 cm wide, not single blades; color patches 1 to 2 m wide. Lush green meadow grass seen from above, medium fresh green, short dense blades, soft patches of lighter and darker green, a few tiny clover leaves and small wildflower dots. Evenly distributed, no path, rocks or large flowers, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Græs, tørt** – materiale 27

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of ground; show stylized grass clumps 20 to 30 cm wide, not single blades; bare patches 30 to 80 cm. Dry grassland seen from above, golden yellow and straw-green grass, long thin dry blades lying in different directions, bare brown earth patches here and there, a few dry stalks. Evenly distributed, no standout feature, no path, rocks or objects. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Græs, skov** – materiale 26

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of ground; show stylized clumps 20 to 30 cm wide, leaves 5 to 10 cm, moss patches 50 cm to 1 m. Dark forest floor grass seen from above, deep green with moss patches, short shaded blades, scattered fallen leaves, tiny twigs and small ferns. Evenly distributed, no large branch, stone or standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```


## Dungeon og grotte (gulve)

- [x] **Stenfliser, regelmæssige** – materiale 44

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor. Dungeon floor of large square grey stone flagstones, laid in a regular grid with thin dark grout lines, each slab 1 m wide (about 8 x 8 slabs), slightly varied grey tones, small chips, hairline cracks and light wear on some slabs. No single standout slab or mark. Perfectly tileable on all edges, square 1:1, even brightness, no shadows from walls, no border, text, objects or vignette.
```

- [x] **Gamle, slidte fliser** – materiale 41

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor. Ancient worn dungeon floor of irregular rectangular stone slabs 60 to 120 cm wide, dark grey-green, uneven edges, deep grout lines with dirt, moss in the cracks, scattered small stones and dust. Evenly distributed, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no shadows from walls, no border, text, objects or vignette.
```

- [x] **Mursten (sildeben)** – materiale 38 og 39

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor. Dungeon floor of small reddish-brown clay bricks (25 cm long) laid in a herringbone pattern, dark mortar lines, soot-darkened and worn, some bricks chipped or missing in small places. Evenly distributed, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no shadows from walls, no border, text, objects or vignette.
```

- [x] **Blodigt dungeon-gulv** – materiale 42 og 43

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor. Dungeon floor of dark grey stone slabs 1 m wide with old dried bloodstains, scratches, dirt, scattered bone fragments and dust. Stains small (10 to 40 cm) and evenly spread. No standout pool or large object. Perfectly tileable on all edges, square 1:1, even brightness, no shadows from walls, no border, text, objects or vignette.
```

- [x] **Grotte, jord og grus** – materiale 34

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor. Cave floor of packed dark brown earth and fine gravel, small pebbles, scattered stones 5 to 20 cm, damp darker patches 1 to 2 m wide, faint cracks. Evenly distributed, no standout rock or hole. Perfectly tileable on all edges, square 1:1, even brightness, no shadows from walls, no border, text, objects or vignette.
```

- [x] **Grotte, ru sten** – materiale 35

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor. Natural cave floor of rough grey-brown rock with uneven ridges and small cracks, patches of dust and tiny pebbles, a few damp dark spots 50 cm wide. Evenly distributed, no big boulder, no hole or standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no shadows from walls, no border, text, objects or vignette.
```

- [x] **Grotte, våd sten** – materiale 36

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of floor. Damp cave floor of dark wet stone and mud, shallow puddles 30 to 80 cm wide reflecting a little light, glistening wet rock, small stones and moss patches. Evenly distributed, no deep water, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no shadows from walls, no border, text, objects or vignette.
```


## Klippegrotter

- [x] **Klippe, grå** – materiale 56

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of rock. Solid grey cave rock seen from above, rough angular blocks and ridges 0.5 to 2 m wide, deep dark cracks between them, light chipped edges, small rubble and dust in the crevices. Evenly distributed, no cave opening, no standout boulder or crack. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Klippe, brun sandsten** – materiale 57

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of rock. Solid warm brown sandstone cave rock seen from above, layered angular slabs 0.5 to 2 m wide, dark cracks, lighter chipped edges, scattered pebbles and dust in the crevices. Evenly distributed, no cave opening, no standout boulder or crack. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Klippe, vulkansk** – materiale 40

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of rock. Dark black-grey volcanic rock seen from above, sharp jagged blocks 0.5 to 2 m wide, deep black cracks, faint lighter edges, tiny glassy glints and ash dust in the crevices. Evenly distributed, no lava, no cave opening, no standout boulder. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Klippe, rød ørken** – materiale 54

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of rock. Red-orange desert canyon rock seen from above, layered slabs and ridges 0.5 to 2 m wide, dark red cracks, pale dust and sand in the crevices, subtle bands of colour. Evenly distributed, no cave opening, no standout boulder or crack. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Klippe, kalksten med mos** – materiale 37

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of rock. Damp pale grey limestone cave rock seen from above, rounded and angular blocks 0.5 to 2 m wide, dark cracks, patches of green moss and wet dark streaks, small stones in the crevices. Evenly distributed, no water, no cave opening, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Klippe, frossen** – materiale 46

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet) of rock. Frozen cave rock seen from above, blue-grey angular stone blocks 0.5 to 2 m wide with frost, pale blue ice filling the cracks, white rime on the edges, small ice crystals. Evenly distributed, no standout ice block, no cave opening. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```


## Andre teksturer

- [x] **Lava** – materiale 48 og 49

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Flowing lava seen from above: glowing orange-yellow molten rock with a thin dark cooled crust broken into plates 30 to 100 cm wide, bright cracks between the plates, small bubbling spots, dark red edges. Evenly distributed, no standout feature, no rocks or splashes. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Rødt sand** – materiale 52 og 53

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Red desert sand seen from above: warm red-orange fine sand with soft wind ripples 10 to 30 cm apart, subtle darker and lighter patches 1 to 2 m wide, a few tiny pebbles. Evenly distributed, no footprints, no dunes, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Is** – materiale 47

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Frozen lake ice seen from above: pale blue-white ice with thin white cracks and frozen air bubbles, a few deeper blue patches 1 to 2 m wide, faint frost streaks. Evenly distributed, no holes, no snow cover, no standout crack. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Sne** – materiale 45

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Fresh snow seen from above: white and very pale blue snow with soft wind-blown drifts 1 to 2 m wide, faint sparkle, subtle shadows between drifts, a few tiny ice crystals. Evenly distributed, no footprints, no rocks, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Sumpmudder** – materiale 58

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Swamp mud seen from above: dark olive-brown wet mud with shallow murky puddles 20 to 60 cm wide, green algae films, tiny reeds and leaves pressed into the mud, glistening wet patches. Evenly distributed, no deep water, no standout puddle. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Pløjet mark** – materiale 50

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Ploughed farm field seen from above: dark brown earth in parallel furrows running horizontally, furrows 50 cm apart, clods of soil, a few small stones and straw bits. Evenly distributed, no plants, no tracks, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Kloak** – materiale 55

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Sewer floor seen from above: old dark green-grey stone slabs 60 to 100 cm wide covered in wet slime and moss, shallow dirty brown-green water in the cracks, small bits of debris. Evenly distributed, no deep water, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [x] **Aske / brændt jord** – materiale 32 og 33

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Burnt ground seen from above: dark grey and black ash and charred earth, scattered small glowing embers (few), cracks, soot patches 1 to 2 m wide, tiny charred twigs. Evenly distributed, no flames, no standout feature. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [ ] **Marmorgulv (10 × 10 plader, skal laves om)** – det nuværende (7 × 7) duer ikke; sæt `scale` i `imageMaterials.ts` til 250/768 ≈ 0,326, når billedet er klar (materiale 51)

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers exactly 5 x 5 grid squares, 10 x 10 marble slabs in a checker pattern (an even number, so it tiles seamlessly), each slab exactly half a grid square. Polished marble floor seen from above: cream white slabs with grey veins alternating with dark grey-green marble slabs, thin dark grout lines, soft glossy highlights, a few small chips. No standout slab or mark. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```

- [ ] **Brosten** – findes kun som udregnet materiale; billede mangler

```
Seamless tiling top-down texture, flat even lighting, hand-painted fantasy RPG battle map style, not photorealistic. Scale: the image covers 8 x 8 meters (26 x 26 feet). Cobblestone street seen from above: rounded grey-brown cobblestones 20 to 30 cm wide in staggered rows, dark dirt between the stones, slightly varied tones, worn smooth, a few weeds in the gaps. Evenly distributed, no standout stone. Perfectly tileable on all edges, square 1:1, even brightness, no border, text, objects or vignette.
```


## Genstandsark (3 × 3, til udskæring i Egne genstande)

- [ ] **Krystaller**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different beautiful crystals and crystal clusters: blue, violet, green, red, clear, amber, pink, teal and white, single points and clusters, 30 to 80 cm wide, glassy facets with bright highlights.
```

- [ ] **Knogler og skeletter**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different bone piles and skeleton remains: a full human skeleton lying down, a skull, ribcage, scattered arm and leg bones, a pile of skulls, a curled skeleton, an animal skeleton, a broken skeleton in rusty armor, a single large monster skull. Objects 40 cm to 2 m wide.
```

- [ ] **Skatte**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different treasure items: a pile of gold coins, an open chest full of jewels, a gem pile, a golden goblet and crown, a small sack of coins, a silver ingot stack, a jeweled sword on a cloth, a scattering of loose coins, a closed ornate treasure chest. 30 cm to 1 m wide.
```

- [ ] **Svampe**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different mushrooms and mushroom clusters: red fly agaric, brown cap, glowing blue cluster, giant purple mushroom, small white cluster, orange shelf fungus, green glowing mushrooms, a ring of tiny mushrooms, a tall pale mushroom. 10 cm to 1 m wide.
```

- [ ] **Dungeon-skrammel**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different piles of dungeon junk: broken barrels and planks, a heap of rusty chains and shackles, scattered crates and sacks, a pile of rubble and bones, torn rags and a broken lantern, a heap of old weapons and shields, a smashed table, a pile of broken pottery, a collapsed shelf with spilled items. 60 cm to 2 m wide.
```

- [ ] **Buske**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different bushes: round green bush, berry bush with red berries, flowering pink bush, thorny bramble, dry brown bush, small fern cluster, dark evergreen shrub, holly with berries, wild rose bush. 50 cm to 1.5 m wide, leafy and dense.
```

- [ ] **Drypsten og klippeformationer**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different cave formations seen from above: stalagmite cluster, a single tall spire, a broken stalagmite, a rock pillar, small rock outcrop, a pile of loose stones, a flat boulder, a mineral vein rock with glittering flecks, a crumbled rock slab. 40 cm to 2 m wide.
```

- [ ] **Våben og rustning på jorden**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different weapons and armour lying on the ground: a longsword, a battle axe, a shield, a bow and arrows, a helmet, a breastplate, a pair of crossed daggers, a mace, a broken spear. 40 cm to 1.5 m long.
```

- [ ] **Eliksirer, skriftruller og bøger**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different small props: a cluster of colorful potion bottles, a scroll, a stack of books, an open spellbook, a single glowing flask, an inkwell with quill, a rolled map, a pouch with herbs, a candle in a holder. 15 to 60 cm wide.
```

- [ ] **Blomster og urter**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different flower and herb patches: red poppies, white daisies, blue bellflowers, yellow buttercups, purple lavender, a mix of wildflowers, tall foxgloves, a herb patch, a small bed of tulips. 30 cm to 1 m wide.
```

- [ ] **Rituelle ting**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different ritual props: a circle of black candles, a skull on a stand, a bowl with a glowing liquid, a bloody sacrificial dagger on cloth, a small stone idol, a chalk pentagram with candles, a book on a lectern, a cauldron, a bundle of bones and feathers. 30 cm to 1.5 m wide.
```

## Totter (genstandsark, til Totter-penslen)

Hver tot skæres ud som en genstand i familien *Høje græstotter* og bruges af Totter-penslen. Totter er 40 cm til 1 m, bløde i kanten og uden omrids, så de blander sig, når mange ligger over hinanden.

- [ ] **Græstotter, grønne (eng)**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different tufts of lush green grass: short dense tuft, tall loose tuft, two-tone light and dark green tuft, tuft with a few seed heads, tuft with tiny clover leaves, wide flat tuft, sparse tuft, curved windswept tuft, thick clump of broad blades. Blades radiate outward from the center, soft feathered edges, no hard outline, each tuft 40 cm to 1 m wide, so they blend well when many overlap.
```

- [ ] **Græstotter, tørre og gyldne**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different tufts of dry golden grass: straw-yellow tuft, pale beige tuft, brown-gold tuft with seed heads, tall wispy tuft, flat dry tuft, tuft with some green at the base, thin brittle tuft, thick clump, windswept tuft. Warm yellow and tan tones. Blades radiate outward from the center, soft feathered edges, no hard outline, each tuft 40 cm to 1 m wide, so they blend well when many overlap.
```

- [ ] **Høje strå med aks (kornmark)**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different tufts of tall field grass and wild grain: wheat-like stalks with heavy ears, barley with long awns, oat panicles, tall green stalks with seed heads, ripe golden stalks, mixed green and gold, a bent-over clump, thin tall reeds-like grass, a dense stand of stalks seen from above. Blades radiate outward from the center, soft feathered edges, no hard outline, each tuft 40 cm to 1 m wide, so they blend well when many overlap.
```

- [ ] **Blomstrende græstotter**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different grass tufts with small wildflowers: with white daisies, with yellow buttercups, with blue cornflowers, with red poppies, with purple clover heads, with pink thrift, with tiny white flowers, with dandelions, with mixed wildflowers. Blades radiate outward from the center, soft feathered edges, no hard outline, each tuft 40 cm to 1 m wide, so they blend well when many overlap.
```

- [ ] **Skovens og sumpens totter**

```
Hand-painted fantasy RPG battle map asset sheet, top-down orthographic view straight from above, soft painted shading lit from the top-left, no cast shadows, plain flat uniform light-grey background, square 1:1, a 3 x 3 grid of 9 different objects, each fully visible, separated by wide empty gaps, nothing touching the image edges, no text, no labels, no frames. 9 different tufts for forest floor and wetland: dark green shaded grass, tuft with small ferns, tuft with moss, tall sedge, rush clump with brown tips, cattail leaves, tuft with fallen leaves, wet olive-green tuft, tuft with tiny mushrooms. Blades radiate outward from the center, soft feathered edges, no hard outline, each tuft 40 cm to 1 m wide, so they blend well when many overlap.
```
