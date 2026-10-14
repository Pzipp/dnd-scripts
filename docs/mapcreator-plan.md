# Kortbygger: plan og status

Planen for `/mapcreator` (se [mapcreator.md](mapcreator.md) for det, der findes). Filen er til at genoptage arbejdet: den siger, hvad målet er, hvilke beslutninger der er truffet, hvad der er færdigt, og hvad der mangler.

## Mål

Et værktøj til at lave alle slags D&D-kort (top-down, malet stil, uden grid i billedet) til billeder i et VTT. Man bygger kortet af **lag**; hvert lag har mange elementer (terræn, træer, mure, kister, lig, effekter). Klienten ejer tegningen og regner alt; serveren gemmer kort og lægger færdige billeder i det simple VTT.

## Beslutninger

- **Node.js er med**, kun som byggeværktøj: Vite + Svelte 5 + TypeScript i `mapcreator/`. Bygges med `mapcreator/build-docker.sh` (Node i en container), og Dockerfile har et Node-trin. Intet Node kører i produktion.
- **Svelte** til brugerfladen (paneler, dialoger); selve kortet tegnes på Canvas 2D uden for rammen.
- **Alt er proceduralt tegnet** (ingen AI-billeder). De gamle kortgeneratorer (grotte, mose, skov/ørken) genbruges **ikke** som kode, kun som visuelt mål og til metoderne (distancefelt, biom-overgange, bløde skygger).
- **Data** ligger i `$USERDATA/mapcreator/` (`/userdata` i containeren = `vol/userdata/` i arbejdsmappen). Alle systemer skal på sigt flyttes dertil, så der kun er én mappe at tage backup af.
- **Kortet er ét JSON-dokument** (`docs/mapcreator.md`). Eksport er billeder (PNG, WebP, JPEG) af dokumentet.
- **Udgaver:** et kort har navngivne eksport-udgaver ("Skovsti - ren", "Skovsti - med lig", "City - no roof") med hver sin lagvisning, format og opløsning.
- **Genstande forbedres på stedet** (samme `key`, ny tegning) og har tags (`objects/tags.ts`); generatoren bygger på familier og tags, ikke på enkelte genstande, så nye og bedre genstande kommer med uden rettelser.
- **Genstande er familier med varianter** (Træer, Sten, Tønder …) og en "Tilfældig"-valgmulighed, så en skov ikke bliver ét træ gentaget.
- **Egne genstande** (importerede billeder) skal skaleres ned i klienten (ca. 1024 px længste led, ca. 2 MB som WebP) og kontrolleres på serveren (filtype, magic bytes, mål, størrelse; evt. genkodning med Pillow).
- Eksport til VTT: vælg kampagne og room, eller **General Maps**, eller download. Filnavn = udgavens navn.

## Status

- [x] 1. Skelet: Node-trin, Vite/Svelte, blueprint, `/userdata`, dokumentmodel, kamera, fortryd/gentag, gem/åbn.
- [x] 2. Terræn (pensel, viskelæder, fyld, 8 materialer) og eksport som download med navngivne udgaver.
- [x] 3. Genstande: register med familier/varianter, vælger med Tilfældig, flyt/skalér/rotér, skygger, lagets højde.
- [x] 4. **Mure**: stilarter (sten, mursten, træ, hæk), tegning punkt for punkt, redigering af punkter/tykkelse/længde, åbninger (åbning, dør, dobbeltdør, port, vindue) med åben/lukket og vend, fortryd, eksport.
- [x] 5. **Scatter-værktøj**: spred familie/variant med tæthed, undgår vand, mure og andre genstande, fjern-tilstand, ét strøg = én fortryd.
- [x] 6. **Eksport til VTT**: dialog med kampagne/room/General Maps; udgaven sendes via simpelvtts eksisterende upload (ingen ny server-endpoint).
- [ ] 7. **Generator**: vælg områdetema (skov, mose, grotte, ørken, by, kro, ruin, flodbred, bjergsti), generér en base som et almindeligt, redigerbart dokument (lag + elementer); eller start tomt. Layout som data adskilt fra tegning; udgange ved kanterne, så kort kan sættes sammen.
- [ ] 8. **Egne genstande** (billedimport, se Beslutninger).
- [ ] 9. **Polering**: flere typer græs og vand; bløde terrænkanter og strand/vådt ved vand; blødere vandbølger; flere og pænere genstande pr. familie; by- og kro-genstande (brolægning, tage, gulve, møbler, trapper, døre); eksporthastighed (Web Worker); kortstørrelse kan ændres; flytte data fra de andre systemer til `/userdata`.

## Kendte svagheder

- Eksport af 4000 × 2750 px tager ca. 20 sekunder (terrænet regnes pr. pixel); siden fryser ikke, men det er langsomt.
- Terrænets kanter er lidt savtakkede (grov maske), og vand er plettet.
- Håndtagene til skalering og rotation af genstande er kun testet som enhedstests, ikke med mus i en browser.
- Mure: ingen automatisk samling af to mure, der mødes (hjørner mellem to mure er to overlappende stregstykker); ingen rum-/gulvfyld inde i lukkede mure endnu (gulve bygges med terræn-penslen).
- `npm audit` melder 3 sårbarheder i `vitest` (kun udviklingsværktøj).

## Sådan genoptager du

```bash
cd stacks/games/dnd-scripts-dev
mapcreator/build-docker.sh test    # enhedstests
mapcreator/build-docker.sh check   # typer
mapcreator/build-docker.sh build   # bygger til webui/static/mapcreator/
```

Siden er på `http://localhost:8082/mapcreator` (dev-containeren `dnd-webui-dev`; koden er bind-mountet, så en ny bygning er nok, genstart er kun nødvendig ved ændringer i Python eller compose). Test mod 8082, aldrig prod (8081). Tegn og tjek visuelt med Playwright i containeren (se tidligere tests: `docker exec dnd-webui-dev python <script>`).

Arbejdsregler: commit færdige ændringer løbende; rør ikke andres `karakterer/`-ændringer; `docs/mapcreator.md` opdateres, når noget ændres.
