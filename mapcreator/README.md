# Kortbygger (klienten)

Editor til D&D-slagkort (top-down, malet look, uden grid i billedet): lag med terræn, genstande, mure og effekter. Dette er **klienten** (TypeScript + Svelte + Vite). Serveren er Flask-blueprintet `webui/mapcreator/` i webui'en, og siden hedder `/mapcreator`.

Læs først [`docs/mapcreator.md`](../docs/mapcreator.md) (hvad den kan, og hvordan den bruges), derefter efter behov:

| Dokument | Indhold |
|---|---|
| [`docs/mapcreator.md`](../docs/mapcreator.md) | Funktioner, værktøjer, genveje, eksport |
| [`docs/mapcreator-format.md`](../docs/mapcreator-format.md) | Kortets JSON-format og API'et |
| [`docs/mapcreator-objects.md`](../docs/mapcreator-objects.md) | Sådan laver og forbedrer man genstande (registret, familier, tags, tegneregler) |
| [`docs/mapcreator-plan.md`](../docs/mapcreator-plan.md) | Mål, beslutninger og status; start her for at genoptage arbejdet |

## Kom i gang

Node behøver ikke være på værten; alt kører i en Node-container:

```bash
mapcreator/build-docker.sh          # byg til webui/static/mapcreator/ (gitignoreret)
mapcreator/build-docker.sh dev      # byg løbende ved ændringer
mapcreator/build-docker.sh check    # svelte-check (typer)
mapcreator/build-docker.sh test     # vitest
```

Dev-containeren (`dnd-tools-dev`, port 8082) har repoet bind-mountet, så en ny bygning er nok; genstart kun ved ændringer i Python eller compose. Kort gemmes i `$USERDATA/mapcreator/` (`/userdata` i containeren = `vol/userdata/` i arbejdsmappen). Produktionsimaget bygger klienten i et Node-trin i `Dockerfile`, og Node er ikke med i det endelige image.

`mapcreator/build-docker.sh` kan køre flere gange samtidig (hver container får et unikt navn).

## Opbygning

```
src/
  main.ts, App.svelte, app.css, api.ts
  model/        dokumentet og alt, der ændrer det
    types.ts      MapDoc, Layer, MapElement, Wall, Opening, ExportPreset …
    doc.ts        oprettelse, serialisering, indlæsning (inkl. udgåede genstande)
    commands.ts   alle ændringer som fortrydelige kommandoer
    history.ts    fortryd/gentag (og sammenlægning af skydertrin)
    store.svelte.ts  editorens tilstand (værktøj, valg, filer)
    paint.ts      malet underlag: fliser, fortryd-billeder, gem/indlæs, ændr størrelse
    ground.ts     den gamle terrænmaske (kun ældre kort, generatoren og formudfyldning)
    geometry.ts   transformation, hit-test, skalering, rotation af genstande
    walls.ts      murgeometri (buelængde, stykker, huller)
    shapes.ts     frihåndsforenkling, udjævning, firkant/ellipse, punkt i polygon
    scatter.ts    scatter-algoritmen (afstand, vand, mure)
    pick.ts       hvad ligger under musen
    resize.ts     ændr kortstørrelse (terræn, genstande og mure følger med; kan fortrydes)
  render/       tegning (Canvas 2D), bruges af både forhåndsvisning og eksport
    scene.ts      forhåndsvisningen (lag, grid, håndtag, ghosts)
    materials.ts, stones.ts, noise.ts, grassTexture.ts   materialer (farve pr. punkt)
    paintBrush.ts, paintTuft.ts, paintView.ts, paintSource.ts   pensler, tuftpensel, visning/lazy tegning af fliser, baggrund og ældre kort
    ground.ts     den gamle maske-tegning (ældre kort og formudfyldning)
    sprites.ts    genstande (sprite-cache, skygge)
    walls.ts      mure og åbninger
    export.ts     eksport i fuld opløsning (fliser), filnavne
    camera.ts
  objects/      genstandsregistret og alle genstande (se docs/mapcreator-objects.md); designer/ = malede billeder
tools/          export-own-objects.py: egne genstande ind i bygget
  generator/    områdetemaer som data (themes.ts, spec.ts) og motoren (generate.ts): laver et almindeligt kort ud fra tema, størrelse og frø
  assets/       egne genstande: cutout.ts (baggrund væk og udskæring, ren pixelregning), library.ts (bibliotek og registrering)
  ui/           paneler og dialoger (Svelte)
  tests/        vitest
```

Grundprincippet: **dokumentet er sandheden**, alt andet (billedet, eksporten) udledes af det. Alle ændringer går gennem `editor.run(command)`, så de kan fortrydes. Tegnekoden i `render/` kender ikke til brugerfladen, så den kan genbruges, fx i en generator eller en server-side rendering senere.

## Sådan tester man

`check` og `test` skal være grønne før en commit. Røgtesten (`tests/objects.test.ts`) tegner **alle** genstande med alle parametervalg på et lærred, der tager imod alle kald, og `tests/tags.test.ts` tjekker tags. Visuelt tjekkes genstande i galleriet (`/mapcreator?galleri=1`, se `docs/mapcreator-objects.md`), og hele flowet med Playwright i dev-containeren (`docker exec dnd-tools-dev python <script>`; skærmbilleder kan åbnes med Read-værktøjet).
