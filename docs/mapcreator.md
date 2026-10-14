# Kortbygger (`/mapcreator`)

Editor til slagkort (top-down, uden grid i selve billedet): lag med terræn, genstande, mure og effekter. Klienten (`mapcreator/`, TypeScript + Svelte) ejer dokumentet og tegningen, serveren (`webui/mapcreator/`) gemmer kortene og lægger senere færdige billeder i det simple VTT.

## Status

Færdigt: dokumentmodel, lag (tilføj, slet, flyt, skjul, lås, opacitet, højde), kamera (pan, zoom, knib), fortryd/gentag, gem og åbn, **terrænmaling** (pensel, viskelæder, fyld; 8 materialer) og **eksport som download** med navngivne udgaver. Genstande, mure, eksport til VTT og generator er næste trin.

## Terræn

Et grundlag (`type: ground`) har en maske med 4 × 4 celler pr. felt; hver celle er et materiale-id (`render/materials.ts`, id'er må aldrig omnummereres, 0 = tomt). Masken gemmes kørselslængde-kodet og base64 i kortets JSON. Ved tegning forvrænges koordinaterne med støj, og to materialer blandes blødt over en smal kant (`render/ground.ts`). Samme tegnekode bruges i forhåndsvisningen (i fliser og lavere opløsning, `render/groundCache.ts`) og i eksporten (fuld opløsning).

## Eksport (udgaver)

Et kort har en liste af udgaver (`exports[]`): navn (bliver filnavnet), hvilke lag der udelades, format (PNG, WebP, JPEG), pixels pr. felt og kvalitet. Så kan samme kort give "Skovsti - ren" og "Skovsti - med lig". Billedet tegnes i browseren i fliser (grid og penselring er aldrig med) og hentes som fil. Grænse: højst 16384 px på den lange led og 120 mio. pixels.

## Data

Alt ligger i `$USERDATA/mapcreator/` (miljøvariabel `USERDATA`, standard `/userdata`; i dev/Docker er det `vol/userdata/` i arbejdsmappen, mountet som `/userdata`, så dataene også kan nås, når containeren ikke kører; ét sted at tage backup):

| Sti | Indhold |
|---|---|
| `maps/<id>.json` | Kortdokumenter |
| `assets/` | Egne genstande (senere) |
| `exports/` | Evt. færdige billeder (senere) |

Serveren opretter aldrig selve `/userdata`, kun undermapperne. Mangler den, svarer API'et 503 (opret `vol/userdata/` og mount den).

Dokumentet (`mapcreator/src/model/types.ts`): `version`, `id`, `name`, `widthCells`, `heightCells` (1 felt = 5 ft = 50 px), `seed`, `lightAngle`, `layers[]` (nederst først). Serveren validerer kun rammerne (`validate_doc`); indholdet er klientens ansvar.

## API (`/api/mapcreator/`)

`GET maps` (liste), `GET|PUT|DELETE maps/<id>`. Id'er er `a-z0-9-`, 4 til 64 tegn. Ingen login: kun til internt brug.

## Udvikling

Node er kun et byggeværktøj; det kører i en container:

```bash
mapcreator/build-docker.sh          # byg til webui/static/mapcreator/ (gitignoreret)
mapcreator/build-docker.sh dev      # byg løbende ved ændringer
mapcreator/build-docker.sh test     # vitest
mapcreator/build-docker.sh check    # svelte-check (typer)
```

Dockerfilen bygger klienten i et Node-trin, så produktionsimaget kun har resultatet. I dev bind-mountes repoet, så kør `build-docker.sh` efter ændringer i `mapcreator/src/` og genindlæs siden.
