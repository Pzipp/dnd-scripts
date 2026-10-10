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

## Fra gennemgangen af `races.json`

- **Datafejl i 5etools, meldes upstream (github):** `Tiefling; Abyssal Legacy`
  har `darkvision: 120`, men racens egen Darkvision-tekst og Fiendish
  Legacies-tabellen siger 60 ft for alle tre Legacies. Byggeren læser dataene
  uændret (en Abyssal Tiefling får derfor 120 ft) og har bevidst ingen
  omvej; fjernes, når 5etools er rettet. Afklar mod bogen, inden der meldes.
- **Ældre racer, bevidst ikke dækket:** `languageProficiencies` (sprog vælges i
  byggerens egen dialog efter 2024-reglen) og de 17 racer med `_copy`. Subraces,
  racers `ability` (indstilling `race_ability`), armor-/weaponProficiencies,
  immune/vulnerable og Variant Humans feat er bygget.
- **Dwarven Toughness (+1 HP pr. level) mangler i HP.** Racen har intet
  struktureret felt for det; effekten står kun i trækkets tekst. Den findes
  hverken i `bibliotek/_effects.yaml` eller `_descriptions.yaml`, så
  `character_yaml._apply_effects()` kender den ikke (en Dwarf får altså for få
  HP). Effekt-udtrækket (`effects.py`, `hp_per_level` på `race_trait`) kan løse
  det, når Print-fanens "generér manglende beskrivelser" køres for en Dwarf.
  Afklar, om det skal være den vej, eller en fast håndskrevet regel. Gælder
  tilsvarende andre race-træk, der kun er tekst.
- **Feats' `additionalSpells`** giver valg i byggeren, men lægges ikke i
  `granted_spells` (det gør kun racer). Samme læser (`spell_grants.py`) kan
  bruges.

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

## Klassevalg: Expertise og Weapon Mastery - kendte huller

Bygget i `model._expertise_choices()` / `model._weapon_mastery_choice()`,
afledt i `character_yaml._masteries()` og `expertise`. Dækker Rogue, Bard,
Ranger (Deft Explorer + Expertise), Wizard (Scholar), Fighter, Barbarian,
Paladin. Hvad der kunne udbygges:

- **Expertise-antal:** maks. håndhæves ikke (kun "for få" meldes som `missing`). Valg for en feature, karakteren ikke har nået, ignoreres i stedet for at blive slettet.
- **Expertise vs. proficiencies:** Fjernes en skill-proficiency (eller
  skiftes baggrund), ryddes en valgt Expertise på den ikke automatisk.
- **Expertise fra andre kilder:** Feats med Expertise (fx Skill Expert)
  deduperes ikke mod klassernes Expertise. Subclass-/species-features med
  Expertise opdages kun, hvis de hedder "Expertise", "Deft Explorer" eller
  "Scholar" (navnematch, ingen generel regel i 5etools-data).
- **Weapon Mastery, trænede våben:** Filteret ("with which you have
  proficiency") bruger kun klassernes egen våbentræning. Træning fra race,
  baggrund eller feats (fx Weapon Master) tælles ikke med. Klasser, hvis
  feature-tekst hverken siger "proficiency" eller "Melee", får alle
  Simple+Martial våben.
- **Weapon Mastery, skift:** Bytte våben ved Long Rest er ikke modelleret
  (kun ét aktuelt valg). Mastery-egenskabernes regeltekst vises ikke på
  arket, kun navnet.
- **Homebrew-våben** uden `mastery`-felt giver ingen par i `masteries`.
- **Ingen automatiske tests** af valgene; kun manuelt prøvet mod
  Rogue/Bard/Ranger/Wizard/Barbarian/Fighter/Paladin.
- **Baggrunds-feat (fx Alert fra Criminal)** kommer stadig ikke med i
  `feats`/initiativ for baggrunde med et fast feat.
- `dnd.py tjek` kender ikke de nye (character/choices/sheets-)karakterer.
