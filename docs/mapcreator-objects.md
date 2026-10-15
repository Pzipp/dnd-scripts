# Genstande i kortbyggeren: sådan laver og forbedrer man dem

Der er to slags genstande, og begge er almindelige varianter i samme register (`mapcreator/src/objects/`), med familie, tags og skygge:

1. **Tegnede i kode** (Canvas 2D, små funktioner): næsten alle. Se resten af dokumentet.
2. **Malede billeder** (WebP med gennemsigtig baggrund) i `src/objects/designer/`: genstande lavet med en billedgenerator (Microsoft Designer) og friklippet med importværktøjet. Se [Malede genstande](#malede-genstande-billeder) nedenfor.

## Sådan ser en god genstand ud (gælder begge slags)

- **Set lige oppefra** (top-down), malet stil som resten af kortet, **ingen grid, ingen tekst, ingen kant af baggrund**.
- **Lys fra øverst til venstre**; mørk, varm kontur. **Ingen indbagt skygge**: skyggen kommer fra det fælles system (`shadow` på varianten, `0` på flade ting som tæpper og blod). En genstand med egen skygge får dobbelt skygge og kan ikke drejes.
- **Størrelse i felter** (1 felt = 5 ft): kiste 1 × 0,7, tønde 0,8, bord 2 × 1, seng 1 × 2, busk 1,5-2,5, træ 3-6, stor eg 6-8, vogn 2 × 4, telt 3-4, brønd 2, bålplads 1,5.
- **Fylder sin boks** (højst ca. 5 % tomt rundt); rund eller afrundet form til ting, der skal kunne drejes frit (`randomRotation`).
- **Variation**: en familie skal have mindst 3-5 varianter, så en skov ikke bliver ét træ gentaget. Naturlige ting drejes tilfældigt og får `sizeJitter`.
- **Hører til en familie** (`FAMILIES`) og har **tags** (`tags.ts`), så generatoren finder den. Mangler der en familie, så lav en (se nedenfor) i stedet for at proppe genstanden i en forkert.

## Malede genstande (billeder)

Et billedark fra Designer (5 × 5 genstande, set oppefra, ensfarvet baggrund) kan blive til færdige genstande uden kode:

1. **Lav arket.** Én *tematisk* ark pr. billede (fx kun træer, eller kun taverne-ting). Prompt, der virker: *"Top-down game asset sheet for a fantasy tabletop battle map, 25 separate objects in a 5x5 grid: <liste>. Painted illustration style, viewed straight from above, soft top-left lighting, NO cast shadows, NO ground, NO text, each object isolated with wide empty space around it, plain pure white background (#FFFFFF)."* Brug **hvid** eller magenta (`#FF00FF`) som baggrund, **ikke** "transparent" (Designer tegner det ternede mønster som rigtige pixels) og ikke grøn til planter eller hvid til lyse genstande. Tjek Microsofts vilkår for billederne.
2. **Importér og klip ud** i kortbyggeren: knappen *Egne genstande …*. Værktøjet fjerner baggrunden, finder genstandene, og man vælger familie, skygge, rotation, tags, navn og bredde i felter (se afsnittet *Egne genstande* i [mapcreator.md](mapcreator.md)). Genstandene ligger så i brugerens bibliotek (`vol/userdata/`, ikke i git).
3. **Tag dem med i bygget:** `python3 mapcreator/tools/export-own-objects.py` (se `--help`) kopierer billederne til `mapcreator/src/objects/designer/<nøgle>.webp` og tilføjer dem til `items.json` (nøgle = navnet med små bogstaver og `_`; ændres aldrig). Genstanden får nøglen `designer_<nøgle>`.
4. **Tilføj tags** hvis familiens ikke er nok: `tags` kan sættes pr. genstand i `items.json` (felter: `key`, `name`, `family`, `w`, `h`, `shadow`, `randomRotation`, evt. `tags`).
5. Kør `mapcreator/build-docker.sh check`, `test`, `build`, se genstandene i galleriet (`/mapcreator?galleri=1&familie=<familie>`), og commit `designer/`.

Skal et billede erstattes, så læg en ny fil med samme nøgle (filen overskrives). Slet aldrig en nøgle, kort kan bruge den: sæt i stedet `replacedBy` (se *Forbedre og udgå*). Billederne må højst være ca. 1024 px i længste led (importen sørger for det); hold dem små (ca. 30-60 KB hver).

## Mapper

| Sti | Hvad |
|---|---|
| `registry.ts` | Typerne (`ObjectKind`, `Family`, `DrawInput`), `kind({...})`, `FAMILIES`, opslag |
| `tags.ts` | Tags-ordforrådet og tabellerne over familiernes og varianternes tags |
| `util.ts` | Fælles tegnehjælp: `rng`, `blob`, `smooth`, `roundRect`, `planks`, `softDot`, farver |
| `nature.ts`, `interior.ts`, `remains.ts`, `architecture.ts`, `effects.ts` | De oprindelige basisgenstande |
| `dungeon/` | Dungeon- og grottedetaljer: gitre og døre (`gate`), nedfald (`rockfall`), udhuggede trapper, skakter, hul og broer (`carved`), vægdetaljer (`wallmount`: fakkel, lanterne, krystaller, lænker, spindelvæv, håndtag, rødder). Vægdetaljer tegnes med væggen i toppen af boksen: drej dem, så væggen vender rigtigt |
| `designer/` | Malede billeder (se nedenfor) |
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
