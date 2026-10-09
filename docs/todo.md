# Todo: karakterark-nyt-system

Kort, levende liste over åbne opgaver/undersøgelser til det nye
choices.yaml-baserede karakterarks-system, til brug på tværs af sessioner.
Se [karakterark-bygger-plan.md](karakterark-bygger-plan.md) for den
oprindelige designbeslutning, [llm-effect-extraction-prompt.md](llm-effect-extraction-prompt.md)
for effekt-udtræks-designet.

## Undersøgt - afventer en senere "smart bokse"-runde

- **`ac`/`save:*`/`skill:*`/resistances/`condition_immunity`/`darkvision`/
  `speed`-targets.** Udtrækkes og gemmes korrekt i `bibliotek/_effects.yaml`
  allerede. Fundet ved rigtige test-kald (Darkvision, Mobile, Fey Ancestry,
  Dwarven Resilience, Skilled):
  - `darkvision`/`speed` (type add/set): rene, flade, ubetingede tal -
    sikre at folde ind som tal, samme mønster som `initiative`/
    `hp_per_level`. IKKE bygget endnu.
  - `damage_resistance`/`immunity`/`vulnerability`/`condition_immunity`:
    kan ikke foldes ind som ET TAL, men SOM TEKST (fx "Resistens: Poison")
    - Dwarven Resilience beviste at den rene, permanente del udtrækkes
    pænt. IKKE bygget endnu.
  - `save:*`/`skill:*` (type advantage): kan IKKE beregnes som tal eller
    en ren liste - de er næsten altid afgrænset til en specifik trussel
    ("mod Poisoned", ikke "alle CON-saves"), og LLM'en udelader dem
    allerede korrekt fra `effects` i stedet for at gætte for bredt
    (bekræftet: Fey Ancestry/Dwarven Resilience/Skilled gav INGEN
    `save:*`/`skill:*`-effects overhovedet). Teksten findes allerede i
    `description_da`/`back_note` - problemet er at INGEN feat-/trait-/
    class_feature-beskrivelser vises på selve arket i dag (kun bare navne
    i "Træning og valg", `render.py` læser aldrig `class_features`/
    `spells_known`/`race_traits`).

  **Besluttet 2026-10-09:** ingen automatisk udfyldning bygges nu. Som det
  er: feats/traits vises via den eksisterende, HÅND-udfyldte Feats-sektion
  i `sheets.yaml` (box-typen `features`, se `render.py`s `box_features()`)
  - ingen auto-generering fra character.yaml, ingen nye "smarte" bokse til
  resistenser/darkvision/osv. Det venter til en senere runde.

## Andre kendte, åbne punkter

- **Browser-UI for HP/Hit Dice ikke visuelt testet** (commit `705e895`) -
  kun backend-logik er verificeret. Åbn builder-UI'en, tjek den nye
  pr.-klasse HP-sektion og det låste niveau-1-felt ser rigtigt ud.
- **Browser-UI for layout-editoren i Print-fanen ikke visuelt testet**
  (commit `b930a9d`) - alle fire backend-endepunkter (sheets_yaml GET/POST,
  sheets_check, sheets_preview) er testet direkte via curl, men selve
  CodeMirror-editoren ("Rediger layout"-knappen, live-forhåndsvisning,
  Ctrl+S) er aldrig åbnet i en browser. Samme forbehold for den nye
  menu-side ("/") og "/editor"-flytningen af den gamle YAML-editor.
- **Mistral-endpointet**: `429 Rate limit exceeded` - afventer undersøgelse
  af kontoens kvote/betaling på console.mistral.ai.
- **Git: `karakterark-nyt-system` vs. opdateret `main`.** `karakterbygger`
  er nu merget til `main` (PR #9) - og ER en ancestor af `origin/main`
  (almindelig merge, ikke squash), så en fremtidig merge/rebase af
  `karakterark-nyt-system` burde være ukompliceret. Husk at fast-forward
  lokal `main` først.
- **UI til `medium`/`low`-confidence-forslag** fra effects - findes ikke,
  vises ikke noget sted i dag.
- **Weapon Mastery pr. våben, værktøj grupperet efter evne** - stadig ikke
  udledt (ældre, kendte forenklinger, se [character-yaml.md](character-yaml.md)).
- **Det gamle `karakterark.py`-system** (8 rigtige spillere) - urørt;
  fjernelse er en erklæret fremtidig hensigt, ikke besluttet endnu.

## Fra kommentarer i `karakterer/dev-wizzard/sheets.yaml`

Brugeren har noteret idéer direkte i sheets.yaml ved den relevante boks -
samlet herfra, kommentarerne i filen selv er urørt.

- **`skill_checks`/`tools`** (fx "Dirke en lås" for Thieves' Tools) bør
  kunne udfyldes automatisk fra karakterens valgte værktøjer/evner.
- **`appearance`-felterne** (Alder/Højde) har ingen plads i
  karakterbyggeren i dag - kræver en ny funktion dér til at indtaste dem.
- **Bonus Action-boksen** - måske automatiserbar, ingen konkret idé endnu.
- **Angreb/Weapons/Gear/Special-boksene** rammer stadig den samme kendte,
  dybe mangel: der er ingen FULD udstyrs-/genstandsliste (hvilke våben/gear
  er udstyret/aktivt lige nu) - Armor-dropdownen (se character-yaml.md)
  løser kun rustningsdelen af dette, ikke våben/gear generelt, se
  [character-yaml.md](character-yaml.md#afledte-felter-med-et-kendt-gap).
- Bekræftet OK som manuelt felt, ikke en todo: Snigangreb-reglen
  (`rules`-boksen) og Money-boksen.
