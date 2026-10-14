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

Dev-containeren (`dnd-webui-dev`, port 8082) har repoet bind-mountet, så en ny bygning er nok; genstart kun ved ændringer i Python eller compose. Kort gemmes i `$USERDATA/mapcreator/` (`/userdata` i containeren = `vol/userdata/` i arbejdsmappen). Produktionsimaget bygger klienten i et Node-trin i `Dockerfile`, og Node er ikke med i det endelige image.

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
    ground.ts     terrænmaske, penselstrøg, kørselslængdekodning
    geometry.ts   transformation, hit-test, skalering, rotation af genstande
    walls.ts      murgeometri (buelængde, stykker, huller)
    scatter.ts    scatter-algoritmen (afstand, vand, mure)
    pick.ts       hvad ligger under musen
  render/       tegning (Canvas 2D), bruges af både forhåndsvisning og eksport
    scene.ts      forhåndsvisningen (lag, grid, håndtag, ghosts)
    ground.ts, materials.ts, noise.ts, groundCache.ts   terræn
    sprites.ts    genstande (sprite-cache, skygge)
    walls.ts      mure og åbninger
    export.ts     eksport i fuld opløsning (fliser), filnavne
    camera.ts
  objects/      genstandsregistret og alle genstande (se docs/mapcreator-objects.md)
  ui/           paneler og dialoger (Svelte)
  tests/        vitest
```

Grundprincippet: **dokumentet er sandheden**, alt andet (billedet, eksporten) udledes af det. Alle ændringer går gennem `editor.run(command)`, så de kan fortrydes. Tegnekoden i `render/` kender ikke til brugerfladen, så den kan genbruges, fx i en generator eller en server-side rendering senere.

## Sådan tester man

`check` og `test` skal være grønne før en commit. Røgtesten (`tests/objects.test.ts`) tegner **alle** genstande med alle parametervalg på et lærred, der tager imod alle kald, og `tests/tags.test.ts` tjekker tags. Visuelt tjekkes genstande i galleriet (`/mapcreator?galleri=1`, se `docs/mapcreator-objects.md`), og hele flowet med Playwright i dev-containeren (`docker exec dnd-webui-dev python <script>`; skærmbilleder kan åbnes med Read-værktøjet).
