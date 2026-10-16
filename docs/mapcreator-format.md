# Kortbyggerens kortformat og API

Et kort er **én JSON-fil**: `$USERDATA/mapcreator/maps/<id>.json`. Alt andet (billedet, eksporten) udledes af den. Typerne står i `mapcreator/src/model/types.ts`; serveren validerer kun rammerne (`validate_doc` i `webui/mapcreator/__init__.py`), indholdet er klientens ansvar.

## Dokumentet

```jsonc
{
  "version": 1,
  "id": "a1b2c3d4e5f6a7b8",          // a-z0-9-, 4-64 tegn; samme som filnavnet
  "name": "Skovsti",
  "widthCells": 80, "heightCells": 55,  // 1 felt = 5 ft = 50 px; højst 300
  "seed": 123456789,                  // bruges af terrænets støj
  "lightAngle": 225,                  // retning lyset kommer fra, i grader (225 = øverst til venstre)
  "layers": [ /* nederst først */ ],
  "exports": [ /* udgaver, se nedenfor */ ]
}
```

### Lag

Fælles felter: `id`, `name`, `type` (`ground | floor | objects | walls | effects`), `visible`, `locked`, `opacity` (0..1), `height` (lagets højde: skyggelængde). Rækkefølgen i listen er tegnerækkefølgen (nederst først).

| Lagtype | Ekstra felt | Indhold |
|---|---|---|
| `ground` | `paint` | Malet underlag: `{ ppc, w, h, tiles, fill?, blank? }`. `ppc` = pixels pr. felt (50, 25, 10 eller 5), `w`/`h` = lagets størrelse i pixels, `tiles` = de fliser ("tx_ty", 256 × 256 pixels), serveren har som PNG, `fill` = baggrund `{ material, ox, oy }` (materiale-id, `render/materials.ts`, aldrig omnummereret) som fliser uden indhold tegnes ud fra, `blank` = fliser, der er malet helt væk. Billederne ligger ikke i JSON (se nedenfor) |
| `floor` | `paint` | Som `ground` (et malet lag oven på Grund; bruges til gulve i huse og rum). Ældre klienter, der ikke kender typen, viser ikke laget |
| `objects`, `effects` | `elements` | Liste af genstande (se nedenfor) |
| `walls` | `walls` | Liste af linjer og former (se nedenfor) |

**Malede fliser.** Flisernes billeder gemmes som PNG hos serveren (`$USERDATA/mapcreator/paint/<kort>/<lag>/<tx>_<ty>.png`, RGBA uden forhåndsmultiplikation); flisen `tx_ty` dækker pixels `[tx·256, tx·256+256) × [ty·256, ty·256+256)` i laget, og verdenspixel = lagpixel · 50 / `ppc`. Fliser uden indhold findes ikke. Dokumentversion 2.

**Ældre kort (version 1).** Et grundlag havde `ground: { res, w, h, rle, path? }`: `rle` er terrænmaskens materiale-id'er (4 × 4 celler pr. felt, 0 = tomt) og `path` (kun hvis der var stier) stierne oven på, begge kørselslængde-kodet (værdi-byte + varint-længde, base64). Klienten læser dem stadig og omdanner dem til et malet lag ved åbning; gemmes kortet, står det i det nye format.

### Genstande (`elements[]`)

```jsonc
{ "id": "…", "kind": "tree_oak", "x": 1200, "y": 800, "w": 250, "h": 250,
  "rot": 1.2,            // radianer
  "seed": 4242,          // samme seed = samme udseende
  "z": 0,                // højde oven på lagets højde (skygge, rækkefølge)
  "params": { "season": "autumn" } }
```

`kind` er en nøgle i genstandsregistret. Nøgler og parametre ændres aldrig (se [mapcreator-objects.md](mapcreator-objects.md)); en udgået nøgle erstattes ved indlæsning af den, der afløser den (`replacedBy`). En ukendt nøgle vises som en rød stiplet boks og slettes ikke.

### Linjer og former (`walls[]`)

```jsonc
{ "id": "…", "style": "stone",        // stone | brick | wood | hedge | cave | cave_dark | cave_ice (rigtige mure, kan have åbninger)
                                       // path_dirt | path_gravel | path_cobble | bridge_wood | bridge_stone | bridge_rope | cliff | ravine | fence
  "points": [[100,100],[500,100],[500,400]],   // verdenspixels; længde og form følger af punkterne
  "closed": false, "thickness": 20, "seed": 77,
  "flip": false,                      // valgfri: vend siden (klippekant, kløft, bro)
  "fill": { "material": 17 },         // valgfri: udfyldning (terrænmateriale-id) i en lukket linje = en form
  "stroke": true,                     // valgfri: false = ingen kant, kun udfyldning
  "shape": "line",                    // valgfri: line | rect | ellipse | free (hvad den blev tegnet som)
  "openings": [ { "id": "…", "kind": "door",   // opening | door | double_door | gate | window
                  "at": 150,        // afstand langs muren til åbningens midte
                  "width": 50, "open": false, "flip": false } ] }
```

### Udgaver (`exports[]`)

```jsonc
{ "id": "…", "name": "Skovsti - med lig",     // bliver filnavnet
  "hiddenLayerIds": ["…"],                    // lag, der udelades i denne udgave
  "format": "png",                            // png | webp | jpeg
  "pxPerCell": 50, "quality": 0.92,
  "target": { "kind": "vtt", "campaign": "General Maps", "room": "Skov" } }   // eller { "kind": "download" }
```

## Versionering

`version` er dokumentets formatversion (nu 1). Et kort fra en nyere version afvises af klienten med en forklaring. Nye valgfrie felter kræver ikke ny version; klienten udfylder manglende felter ved indlæsning (`parseDoc` i `model/doc.ts`), så ældre kort stadig kan åbnes.

## API

Alt under `/api/mapcreator/`, JSON, ingen login (kun til internt brug):

| Kald | Formål |
|---|---|
| `GET maps` | Liste: `[{ id, name, widthCells, heightCells, modified }]`, nyeste først |
| `GET maps/<id>` | Hele dokumentet |
| `PUT maps/<id>` | Gem (dokumentets `id` skal passe til adressen; atomisk skrivning; højst 20 MB) |
| `DELETE maps/<id>` | Slet |

### Egne genstande

| Kald | Formål |
|---|---|
| `GET assets` | Hele biblioteket: `[{ id, name, family, w, h, shadow, randomRotation, tags, pxW, pxH, created }]`. `w` og `h` er standardstørrelsen i felter |
| `POST assets` | Multipart: `file` (PNG, WebP eller JPEG) og `meta` (JSON med `name`, `family`, `w`, `h`, `shadow`, `randomRotation`, `tags`). Serveren genkoder billedet (ingen metadata), beskærer tomt, begrænser til 1024 px og gemmer som WebP. Højst 12 MB og ca. 36 megapixel. Svarer 201 med genstanden |
| `PATCH assets/<id>` | Ret `name`, `family`, `w`, `h`, `shadow`, `randomRotation`, `tags` (billedet ændres ikke) |
| `DELETE assets/<id>` | Slet genstand og billede |
| `GET assets/<id>.webp` | Billedet (uforanderligt, caches hårdt) |

Klienten registrerer hver genstand som varianten `custom-<id>` i familien `family` (findes familien ikke, bruges `own`, "Egne genstande"). Et kort gemmer kun nøglen `custom-<id>`, så billedet ændres ved at slette og importere igen, og kortet peger kun videre, hvis genstanden findes.

Fejl svarer `{ "error": "…" }` på dansk. Mangler `$USERDATA` (eller kan der ikke skrives), svarer API'et 503.

Eksport til VTT bruger **simpelvtts eget upload** (`POST /api/simpelvtt/upload`, multipart med `campaign`, `room` og `files`) og kampagnelisten `GET /api/simpelvtt/tree`; se [simpelvtt.md](simpelvtt.md). Der er ingen særskilt eksport-endpoint.
