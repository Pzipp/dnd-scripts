# Kortbygger (`/mapcreator`)

Editor til slagkort (top-down, uden grid i selve billedet): lag med terræn, genstande, mure og effekter. Klienten (`mapcreator/`, TypeScript + Svelte) ejer dokumentet og tegningen, serveren (`webui/mapcreator/`) gemmer kortene og lægger senere færdige billeder i det simple VTT.

## Status

Færdigt: dokumentmodel, lag (tilføj, slet, flyt, skjul, lås, opacitet, højde), kamera (pan, zoom, knib), fortryd/gentag, gem og åbn, **terrænmaling** (pensel, viskelæder, fyld; 8 materialer) og **eksport som download** med navngivne udgaver. **genstande** (familier med varianter, vælger, flyt/skalér/rotér, skygger), **mure** med døre, porte og vinduer og et **scatter-værktøj** til skov og planter. Eksport til VTT og generator er næste trin.

## Terræn

Et grundlag (`type: ground`) har en maske med 4 × 4 celler pr. felt; hver celle er et materiale-id (`render/materials.ts`, id'er må aldrig omnummereres, 0 = tomt). Masken gemmes kørselslængde-kodet og base64 i kortets JSON. Ved tegning forvrænges koordinaterne med støj, og to materialer blandes blødt over en smal kant (`render/ground.ts`). Samme tegnekode bruges i forhåndsvisningen (i fliser og lavere opløsning, `render/groundCache.ts`) og i eksporten (fuld opløsning).

## Genstande

Genstande ligger i genstands- og effektlag (`elements[]`): `kind`, position, størrelse (verdenspixels), rotation, `seed`, `z` og `params`. De tegnes proceduralt af små funktioner i `mapcreator/src/objects/` (ét tegnestykke pr. variant; samme `seed` giver samme udseende).

**Familier og varianter.** Registret (`objects/registry.ts`) samler varianter i familier: Træer (løvtræ, eg, birk, gran, fyr, dødt træ), Sten, Planter, Borde, Tønder (stående, væltet, ødelagt) osv. I vælgeren folder et klik på en familie alle varianter ud, og **Tilfældig** trækker en ny variant ved hver udsætning (standard for natur). En udsat genstand kan senere skifte variant i egenskabspanelet. Ny variant = ét nyt `kind({...})` i den passende fil og, hvis familien er ny, en post i `FAMILIES`.

**Skygger og højde.** Skyggen følger kortets `lightAngle`; dens længde er varianten's `shadow` plus (lagets højde + genstandens `z`) × 6 px. Genstande tegnes i rækkefølgen lag, derefter `z`, derefter rækkefølgen i laget. Hver genstand tegnes én gang til et lille lærred (`render/sprites.ts`) og genbruges, så mange genstande kan tegnes hurtigt.

**Værktøjer.** *Vælg* (V): klik, træk for at flytte, håndtag til skalering (Shift låser/frigiver proportioner) og rotation (Shift runder til 15°), pile flytter, Delete sletter, Ctrl+D duplikerer. *Genstand* (G): sæt ud med forhåndsvisning; Esc går tilbage til Vælg. "Fastgør til halve felter" er valgfri.

## Mure

Et mur-lag (`type: walls`) har `walls[]`: en linje af punkter med `thickness`, `style` (sten, mursten, træ, hæk), `closed` og `openings[]`. Længde og form følger af punkterne (`model/walls.ts`); tegningen er vektor (`render/walls.ts`), så den er skarp ved enhver zoom.

*Mur* (M): klik for hvert hjørne; klik på sidste punkt eller Enter afslutter, klik på første punkt lukker, Shift låser vinklen til 15°, Backspace fjerner sidste punkt, Esc afbryder. *Vælg* (V) på en mur viser punkthåndtag: træk et firkantet punkt for at ændre form og længde, en rund prik midt på et stykke for at indsætte et punkt, dobbeltklik for at fjerne et punkt, træk i selve muren for at flytte den. Tykkelse og type rettes i panelet til højre.

*Dør* (D): klik på en mur for at sætte en åbning ind (åbning, dør, dobbeltdør, port eller vindue). Åbninger, dørene og portene skærer et hul i muren; vinduer sidder i den. Vælg en åbning for at åbne den, vende den eller trække den langs muren.

## Scatter

*Spred* (S) spreder den valgte familie eller variant over et område, mens man trækker. **Tilfældig** trækker en ny variant for hver genstand (en skov med flere slags træer). Indstillinger: penselstørrelse, tæthed (tæt = kroner overlapper), *Undgå vand* (kigger på terrænet under) og *Fjern i stedet for at spredes* (markerer genstande i cirklen med rødt og fjerner dem, når man slipper). Genstande lægges ikke oven i hinanden og ikke oven i mure; et strøg er én fortryd-handling (`model/scatter.ts`).

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
