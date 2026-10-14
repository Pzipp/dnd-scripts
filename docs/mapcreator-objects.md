# Genstande i kortbyggeren: sådan laver og forbedrer man dem

Alle genstande tegnes proceduralt (Canvas 2D) af små funktioner. Der er ingen billedfiler. Registret ligger i `mapcreator/src/objects/`.

## Mapper

| Sti | Hvad |
|---|---|
| `registry.ts` | Typerne (`ObjectKind`, `Family`, `DrawInput`), `kind({...})`, `FAMILIES`, opslag |
| `tags.ts` | Tags-ordforrådet og tabellerne over familiernes og varianternes tags |
| `util.ts` | Fælles tegnehjælp: `rng`, `blob`, `smooth`, `roundRect`, `planks`, `softDot`, farver |
| `nature.ts`, `interior.ts`, `remains.ts`, `architecture.ts`, `effects.ts` | De oprindelige basisgenstande |
| `basics/` | Nye og flere basisgenstande (træer, buske, sten, bunddække …) |
| `extra/` | Pakke 1 (by, indretning, dungeon, lejr, natur) |
| `pack2/` | Pakke 2 |
| `index.ts` | Registrerer alt; nye mapper tilføjes her |

## En variant (`kind`)

```ts
kind({
  key: 'tree_oak',        // unik, snake_case, ændres ALDRIG (kort gemmer den)
  family: 'tree',         // en familie i FAMILIES
  name: 'Eg',             // dansk navn i vælgeren
  w: 5, h: 5,             // standardstørrelse i felter (1 felt = 5 ft = 50 px)
  keepAspect: true,       // hjørner skalerer med faste proportioner (uden Shift)
  randomRotation: true,   // roteres tilfældigt, når den sættes ud
  sizeJitter: 0.2,        // tilfældig størrelsesvariation ved udsætning (0..1)
  shadow: 36,             // skyggens afstand i px ved højde 0; 0 = ingen skygge
  bleed: 0.08,            // hvor langt tegningen må række uden for sin boks (andel pr. side)
  layers: ['objects', 'effects'],
  params: [ /* valg pr. udsat genstand: select | toggle | range */ ],
  tags: ['forest'],       // ekstra tags (familiens gælder altid)
  draw: (g, o) => { /* se nedenfor */ },
})
```

Alle felter undtagen `key`, `family`, `name`, `w`, `h` og `draw` har fornuftige standardværdier.

### Tegnefunktionen

`draw(g, o)` får en `CanvasRenderingContext2D` og `{ w, h, seed, params }` (størrelsen i verdenspixels). **Origo er midten**; tegn i `[-w/2..w/2] × [-h/2..h/2]` (må række `bleed` uden for). Funktionen kører **én gang** pr. genstand; resultatet caches (`render/sprites.ts`) og genbruges.

Regler:
- **Tilfældighed kun via `rng(o.seed)`**: samme seed giver samme udseende, forskellige seeds skal give tydeligt forskellige individer (form, antal klumper, nuance, ikke kun rotation).
- **Lys fra øverst til venstre**: highlights øverst til venstre, skygge nederst til højre. Mørk, varm kontur (`rgba(20,10,5,.65-.9)`).
- **Ingen tekst, intet grid, ingen DOM.**
- **Ydeevne**: genstande, der spredes (træer, buske, sten, planter), kan blive sat ud i hundredvis; tegn dem på højst ca. 12 ms. Alt andet højst ca. 30 ms. Brug stier og gradienter, ikke pixelløkker.
- **Parametre læses med `param(o, 'nøgle', standard)`**, så gamle kort uden et nyt parameter stadig tegnes. Tilføj gerne nye parametre (med standard); omdøb eller fjern aldrig eksisterende, og fjern ikke gyldige værdier.

## Familier og tags

En **familie** samler varianter (Træer, Borde, Tønder). Den har `category` (`nature | interior | remains | architecture | effects`) og `randomDefault` (vælges "Tilfældig" automatisk, når man klikker på familien i vælgeren; til natur, der skal spredes). Nye familier lægges i `FAMILIES` (grundfamilier) eller i `...Families` i den pakkes `index.ts`.

**Tags** (`tags.ts`) beskriver, hvor en genstand hører hjemme: `forest`, `swamp`, `desert`, `arctic`, `mountain`, `cave`, `village`, `city`, `tavern`, `house`, `dungeon`, `crypt`, `graveyard`, `ruin`, `rich`, `poor` m.fl. En variants tags er familiens (`FAMILY_TAGS`) + enkeltes ekstra (`KIND_TAGS`) + `tags` på varianten. Alle varianter skal have mindst ét tag; `tests/tags.test.ts` tjekker det. Det er tags og familier, en generator bygger på (`tagsOf`), så **nye og forbedrede genstande kommer med uden rettelser i generatoren**.

## Forbedre og udgå

- **Forbedr på stedet**: skift tegnefunktionen, behold `key`, `family` og `params`. Gamle kort bliver pænere ved næste åbning; størrelse og placering ændrer sig ikke.
- **Udgå**: slet aldrig en variant. Sæt `replacedBy: 'ny_nøgle'` på den; kort peger videre til afløseren, når de åbnes (`resolveKind`).
- Ukendte nøgler vises som en rød stiplet boks og slettes ikke.

## Galleriet

`/mapcreator?galleri=1` viser alle genstande med fire seeds og alle parametervalg. `&familie=<key>` viser én familie, `&size=360` viser dem dobbelt så store og skarpere (til nærstudie af detaljer). Se også genstandene på et kort med Spred-værktøjet (S): mal en skov, zoom ind, og tjek variation, overlap og skygger.

## Tjekliste før en commit

1. `mapcreator/build-docker.sh check` og `test` er grønne (røgtesten tegner alle genstande med alle parametervalg).
2. Galleriet viser genstanden uden fejl, ved flere seeds, med alle parametervalg.
3. Den læses straks oppefra ved 25-50 % zoom.
4. Tegnetiden er inden for grænsen (se ovenfor).
5. Alle nye varianter har tags; `key` og `params` på eksisterende er uændrede.
