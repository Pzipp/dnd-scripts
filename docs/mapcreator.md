# Kortbygger (`/mapcreator`)

Editor til slagkort (top-down, uden grid i selve billedet): lag med terræn, genstande, mure og effekter. Klienten (`mapcreator/`, TypeScript + Svelte) ejer dokumentet og tegningen, serveren (`webui/mapcreator/`) gemmer kortene og lægger senere færdige billeder i det simple VTT.

## Status

Færdigt: dokumentmodel og lag (tilføj, slet, flyt, skjul, lås, opacitet, højde), kamera (pan, zoom, knib), fortryd/gentag, gem og åbn, **terrænmaling** (pensel, viskelæder, fyld; 8 materialer), **genstande** (familier med varianter, vælger, flyt/skalér/rotér, skygger), **mure** med døre, porte og vinduer, et **scatter-værktøj** til skov og planter, og **eksport** med navngivne udgaver (download eller direkte i VTT'et). Mangler: generator (vælg et område og få en base), egne genstande (billedimport) og polering. Se [mapcreator-plan.md](mapcreator-plan.md).

Flere dokumenter: [mapcreator-format.md](mapcreator-format.md) (JSON-format og API), [mapcreator-objects.md](mapcreator-objects.md) (laver og forbedre genstande) og [`mapcreator/README.md`](../mapcreator/README.md) (kode og udvikling).

## Genveje

| Tast | Værktøj eller handling |
|---|---|
| H | Hånd (flyt kortet; hjul zoomer, to fingre knibes) |
| V | Vælg (genstande, mure, åbninger) |
| G | Genstand (sæt ud) |
| S | Spred (scatter) |
| M | Mur |
| D | Dør/åbning |
| B / E | Pensel / viskelæder (terræn) |
| Ctrl+Z / Ctrl+Y | Fortryd / gentag |
| Ctrl+S | Gem |
| Ctrl+D | Duplikér valgt genstand |
| Delete | Slet valgt (åbning, mur eller genstand) |
| Piltaster (Shift = stort skridt) | Flyt valgt genstand |
| Esc | Tilbage til Vælg / fravælg / afbryd mur |
| Shift under træk | Lås proportioner eller rund af til 15° / lås murens vinkel til 15° |

## Terræn

Et grundlag (`type: ground`) har en maske med 4 × 4 celler pr. felt; hver celle er et materiale-id (`render/materials.ts`, id'er må aldrig omnummereres, 0 = tomt). Masken gemmes kørselslængde-kodet og base64 i kortets JSON. Ved tegning forvrænges koordinaterne med støj, og to materialer blandes blødt over en smal kant (`render/ground.ts`). Samme tegnekode bruges i forhåndsvisningen (i fliser og lavere opløsning, `render/groundCache.ts`) og i eksporten (fuld opløsning).

## Genstande

Genstande ligger i genstands- og effektlag (`elements[]`): `kind`, position, størrelse (verdenspixels), rotation, `seed`, `z` og `params`. De tegnes proceduralt af små funktioner i `mapcreator/src/objects/` (ét tegnestykke pr. variant; samme `seed` giver samme udseende).

**Familier og varianter.** Registret (`objects/registry.ts`) samler varianter i familier: Træer (løvtræ, eg, birk, gran, fyr, dødt træ), Sten, Planter, Borde, Tønder (stående, væltet, ødelagt) osv. I vælgeren folder et klik på en familie alle varianter ud, og **Tilfældig** trækker en ny variant ved hver udsætning (standard for natur). En udsat genstand kan senere skifte variant i egenskabspanelet. Ny variant = ét nyt `kind({...})` i den passende fil og, hvis familien er ny, en post i `FAMILIES`.

**Tags.** Hver variant har tags (`objects/tags.ts`: sted og stemning, fx `forest`, `swamp`, `tavern`, `rich`): familiens tags, ekstra tags pr. variant (`KIND_TAGS`) og et valgfrit `tags` på selve varianten. En generator eller et filter kan dermed bede om "alt til en sump" i stedet for at nævne bestemte genstande, og nye varianter kommer med af sig selv. En test sikrer, at tabellerne kun peger på ting, der findes, og at hver variant har mindst ét tag.

**Forbedring og udgåede varianter.** En variants `key` og `params` ændres aldrig, for kort gemmer dem. En genstand forbedres **på stedet**: skift tegnefunktionen, behold nøglen (gamle kort bliver pænere ved næste åbning; størrelse og placering ændrer sig ikke). Skal en variant virkelig erstattes af en anden, sættes `replacedBy: 'ny_nøgle'` på den gamle, og kort peger videre til afløseren, når de åbnes (`resolveKind`). Slet aldrig en variant uden `replacedBy`; ukendte nøgler vises som en rød stiplet boks.

**Skygger og højde.** Skyggen følger kortets `lightAngle`; dens længde er varianten's `shadow` plus (lagets højde + genstandens `z`) × 6 px. Genstande tegnes i rækkefølgen lag, derefter `z`, derefter rækkefølgen i laget. Hver genstand tegnes én gang til et lille lærred (`render/sprites.ts`) og genbruges, så mange genstande kan tegnes hurtigt.

**Værktøjer.** *Vælg* (V): klik, træk for at flytte, håndtag til skalering (Shift låser/frigiver proportioner) og rotation (Shift runder til 15°), pile flytter, Delete sletter, Ctrl+D duplikerer. *Genstand* (G): sæt ud med forhåndsvisning; Esc går tilbage til Vælg. "Fastgør til halve felter" er valgfri.

## Mure

Et mur-lag (`type: walls`) har `walls[]`: en linje af punkter med `thickness`, `style` (sten, mursten, træ, hæk), `closed` og `openings[]`. Længde og form følger af punkterne (`model/walls.ts`); tegningen er vektor (`render/walls.ts`), så den er skarp ved enhver zoom.

*Mur* (M): klik for hvert hjørne; klik på sidste punkt eller Enter afslutter, klik på første punkt lukker, Shift låser vinklen til 15°, Backspace fjerner sidste punkt, Esc afbryder. *Vælg* (V) på en mur viser punkthåndtag: træk et firkantet punkt for at ændre form og længde, en rund prik midt på et stykke for at indsætte et punkt, dobbeltklik for at fjerne et punkt, træk i selve muren for at flytte den. Tykkelse og type rettes i panelet til højre.

*Dør* (D): klik på en mur for at sætte en åbning ind (åbning, dør, dobbeltdør, port eller vindue). Åbninger, dørene og portene skærer et hul i muren; vinduer sidder i den. Vælg en åbning for at åbne den, vende den eller trække den langs muren.

## Scatter

*Spred* (S) spreder den valgte familie eller variant over et område, mens man trækker. **Tilfældig** trækker en ny variant for hver genstand (en skov med flere slags træer). Indstillinger: penselstørrelse, tæthed (tæt = kroner overlapper), *Undgå vand* (kigger på terrænet under) og *Fjern i stedet for at spredes* (markerer genstande i cirklen med rødt og fjerner dem, når man slipper). Genstande lægges ikke oven i hinanden og ikke oven i mure; et strøg er én fortryd-handling (`model/scatter.ts`).

## Eksport (udgaver)

Et kort har en liste af udgaver (`exports[]`): navn (bliver filnavnet), hvilke lag der udelades, format (PNG, WebP, JPEG), pixels pr. felt og kvalitet. Så kan samme kort give "Skovsti - ren" og "Skovsti - med lig". Billedet tegnes i browseren i fliser (grid og penselring er aldrig med).

**Mål pr. udgave:** *Hent som fil*, eller **send til det simple VTT**: General Maps eller en kampagne, evt. i et room (rooms hentes fra `GET /api/simpelvtt/tree`). Billedet lægges med VTT'ets eget upload (`POST /api/simpelvtt/upload`), så navnerensning, filtjek og dublet-navne (` (2)`, ingen overskrivning) er de samme som ved almindelig upload. Målet gemmes i kortet, så "Skovsti - ren" hver gang går til samme sted. Rooms skal findes i forvejen (undtagen under General Maps, hvor et room oprettes). Grænse: højst 16384 px på den lange led og 120 mio. pixels.

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
