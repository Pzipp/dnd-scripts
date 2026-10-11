# Karakterark-bygger: designbeslutninger

Det printbare karakterark bygges direkte af karakterbyggerens data (`choices.yaml`, se [choices-yaml.md](choices-yaml.md)) i stedet for af en håndskrevet `karakter.yaml` (se [karakterark-yaml.md](karakterark-yaml.md)). Det endelige format står i [character-yaml.md](character-yaml.md) og [sheets-yaml.md](sheets-yaml.md). Denne fil forklarer, hvorfor det er bygget sådan.

## To filer: data og layout

* `character.yaml` indeholder de udregnede stats (engelsk), afledt af `choices.yaml` og 5etools-data. Den genberegnes ved hvert gem.
* `sheets.yaml` indeholder sideopsætningen (engelsk). Den redigeres frit og overskrives aldrig automatisk.

Dataen er altså udregnet og ligger i en separat fil, ikke rå i `choices.yaml` og ikke i samme fil som layoutet.

## Renderer og layout-sprog

Layout-sproget (sider, kolonner, rækker, bokse) er det samme som i det ældre system, bare med engelske nøgler. Arket bygges af `webui/builder/render.py`, en selvstændig renderer, der læser `character.yaml` og `sheets.yaml` direkte. Den deler CSS med den ældre `scripts/karakterark/karakterark.py`, men der er ingen oversættelses-adapter mellem de to systemer: en adapter mellem to parallelle sprog ville vokse for hver ny boks-type. Layoutet redigeres i en YAML-editor eller ved at trække boksene (Ark-fanen).

## Dansk tekst

Hvert valg i `choices.yaml` er et engelsk `{name, source}`-id. Den korte danske beskrivelse til arket findes i denne rækkefølge (`webui/builder/descriptions.py`):

1. Et håndlavet kort i `bibliotek/*.yaml`.
2. Den delte cache `bibliotek/_descriptions.yaml`.
3. Et LLM-kald (OpenAI-kompatibelt endpoint konfigureret i `.env`, se `webui/builder/llm_client.py`), kun ved et eksplicit knaptryk og i bidder af højst 10. Er der intet endpoint, kan prompten kopieres ind i en egen chat og svaret indsættes.

De fulde regeltekster i byggeren og kortudkastene bruger desuden de danske oversættelser af 5etools-data (`data/*-da.json`, lagt ovenpå af `webui/builder/e5tools.py`).

Det gælder spells, feats, klassefeatures og art-træk. Navnereglen fra [navnekonvention.md](navnekonvention.md) gælder: engelske regelnavne står alene, og den danske udgave er en kort gengivelse af reglen, ikke en oversættelse af navnet.

## Migrering af de håndskrevne karakterer

Migreringen af karakterer med `karakter.yaml` til det nye format er i gang: `valak`, `terrin`, `chukio` og `kvist` har `choices.yaml`, `character.yaml` og `sheets.yaml` og beholder deres gamle filer. De øvrige bruger stadig `dnd.py`. Det ældre system fjernes ikke, før alle er flyttet og ejeren har besluttet det.

## Afgrænsning

Se [sheets-yaml.md](sheets-yaml.md#afgrænsning) og [character-yaml.md](character-yaml.md#kendte-forenklinger) for hvad arket endnu ikke udleder automatisk, og [todo.md](todo.md) for åbne punkter.
