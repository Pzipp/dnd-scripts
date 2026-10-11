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

## LLM-vejen (`character.yaml` uden bygger)

- **Standard-`sheets.yaml` er tilpasset en Rogue** (Shortsword-angreb, Sneak Attack-regel, Cunning Action, Thieves' Tools) og har
  ingen `magic`-boks. Et ark af `dnd.py ark` uden egen `sheets.yaml` viser derfor pladsholdere og ingen spells for en caster.
  Overvej en neutral standard, eller at LLM'en også skriver `sheets.yaml` (angreb, spells, regler).
- **Kontrollen i layout-editoren:** `character_check.check_sheets_text()` kunne kobles på `/api/builder/sheets_check`, så Ark-fanens
  editor markerer ukendte bokstyper og nøgler (i dag kun YAML-syntaks).
- **`tjek-ark` på byggerens egne karakterer** (med `choices.yaml`) er ikke koblet på `dnd.py tjek`; kontrollen giver dog ingen fejl på dem.

## Andre kendte, åbne punkter

- **Browser-UI for HP/Hit Dice ikke visuelt testet** (commit `705e895`) -
  kun backend-logik er verificeret. Åbn builder-UI'en, tjek den nye
  pr.-klasse HP-sektion og det låste niveau-1-felt ser rigtigt ud.
- **Browser-UI for layout-editoren i Ark-fanen ikke visuelt testet**
  (commit `b930a9d`) - alle fire backend-endepunkter (sheets_yaml GET/POST,
  sheets_check, sheets_preview) er testet direkte via curl, men selve
  CodeMirror-editoren ("Rediger layout"-knappen, live-forhåndsvisning,
  Ctrl+S) er aldrig åbnet i en browser. Samme forbehold for den nye
  menu-side ("/").
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
- **Det gamle `karakterark.py`-system** (`karakter.yaml`, `dnd.py`) - bruges stadig af de karakterer, der ikke er konverteret
  (`valak`, `terrin`, `chukio` og `kvist` er konverteret, men beholder deres gamle filer); fjernelse er en erklæret fremtidig
  hensigt, ikke besluttet endnu.
- **Oversættelserne ligger kun på disken.** `data/*-da.json`, `data/spells/`, `data/class/` og `data/books/oversaettelse/*/` er
  gitignoreret (bogtekster er ophavsretligt materiale); tag selv sikkerhedskopi af dem.
- **Sidetemaer til webui'en** (`webui/static/theme-*.css`, fire filer) er ikke tilsluttet nogen vælger endnu.

## Fra gennemgangen af `races.json`

- **Datafejl i 5etools, meldes upstream (github):** `Tiefling; Abyssal Legacy`
  har `darkvision: 120`, men racens egen Darkvision-tekst og Fiendish
  Legacies-tabellen siger 60 ft for alle tre Legacies. Byggeren læser dataene
  uændret (en Abyssal Tiefling får derfor 120 ft) og har bevidst ingen
  omvej; fjernes, når 5etools er rettet. Afklar mod bogen, inden der meldes.
- **Ældre racer, bevidst ikke dækket:** `languageProficiencies` (sprog vælges i
  byggerens egen dialog efter 2024-reglen). `_copy` foldes ud (`copies.py`, efter de danske felter, så kopier arver dansk tekst). Tekster i
  `_copy._mod` (træk, kopien selv tilføjer, fx Flamekin) udtrækkes af oversættelsesværktøjet i egne batches
  (`forudfyld` genbruger færdige danske tekster). Tjek med `python3 oversaet_bog.py races status`, om alle batches er oversat;
  en uoversat `_mod`-tekst vises på engelsk. Subraces,
  racers `ability` (indstilling `race_ability`), armor-/weaponProficiencies,
  immune/vulnerable og Variant Humans feat er bygget.
- **Spell Mastery** (Wizard 18): står kun som tekst. Foundry-dataene har ingen valgregler for den. Valget (ét
  spell på niveau 1 og ét på niveau 2 fra spellbogen, casting time Action, altid forberedt) skal hardcodes.

## Foundry-data: tilgængeligt, men ikke brugt endnu

Brugt i dag (se [character-yaml.md](character-yaml.md#foundry-data)): effekter (HP, initiativ, fart, sanser,
resistenser, AC-bonus), `resources`, `class_numbers`, `activations`, `modifiers`. Resten ligger klar i
`/srv/dnd5etools/data` (`foundry-feats.json`, `foundry-races.json`, `foundry-optionalfeatures.json`,
`class/foundry.json`, `foundry-items.json`):

- **`entryData`** på class-/subclass-features (30 stk.): `expertise` (erstatter navnematch i
  `model._expertise_keys()`), `languageProficiencies` (lukker "klasse-tildelte sprog"-gabet: Thieves' Cant,
  Druidic), `skillProficiencies`/`toolProficiencies`/`armorProficiencies`/`weaponProficiencies`/
  `savingThrowProficiencies`, `resist`/`immune`/`conditionImmune`, `senses`, `additionalSpells`, `resources`.
- **`ac.calc`** (Unarmored Defense, Draconic Resilience: `unarmoredBard` m.fl.): AC uden rustning fra klassen.
- **Skill-/save-bonusser og `roll.mode`** (Thaumaturge, Aura of Protection, Danger Sense): vises kun i
  `modifiers`; kan regnes ind i skill- og save-tallene på arket.
- **`weaponProf.mastery.bonus`** (Tactical Master, Battering Roots): ekstra Mastery-egenskaber.
- **`activities`**: række, varighed, mål, redningskast og forbrug (hvilken ressource en feature bruger, fx
  Metamagic og Flurry of Blows) kan fylde kortenes `kicker`/`scaling` og beskrivelserne. Kun aktiveringstype og
  terningformel bruges i dag.
- **`foundry-items.json`**: effekter af magiske genstande, når der kommer en fuld udstyrsliste.
- Genopladning for SRD-features (Rage, Second Wind ...) mangler i dataene og læses af featurens tekst.

## Fra klasse-runden (spells og valgfrie features)

- **Ældre kilder (valgfrie features):** Elemental Disciplines, Infusions, Arcane Shots og runer bruger de samme
  felter og tilbydes, men er ikke testet; Pact Boons som `pact`-forudsætning er kun afprøvet på XPHB.
- **Spells fra valgfrie features** (Pact of the Tome) tæller ikke med i `spells_known`/kort, kun i `granted_spells`.
- **Prepared Spells ved multiclass:** højeste spell-niveau regnes pr. klasse (dens egen tabel), ikke efter de samlede slots.
- **Spellbog-kopiering** (Wizard: spells fundet i spil) er ikke modelleret ud over de 6 + 2 pr. niveau.

## Fra kommentarer i `karakterer/dev-wizzard/sheets.yaml`

Brugeren har noteret idéer direkte i sheets.yaml ved den relevante boks -
samlet herfra, kommentarerne i filen selv er urørt.

- **`skill_checks`/`tools`** (fx "Dirke en lås" for Thieves' Tools) bør
  kunne udfyldes automatisk fra karakterens valgte værktøjer/evner.
- **`appearance`-felterne** (Alder/Højde) har ingen plads i
  karakterbyggeren i dag - kræver en ny funktion dér til at indtaste dem.
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

- **Expertise:** Subclass-/species-features med Expertise opdages kun, hvis de hedder "Expertise", "Deft Explorer" eller "Scholar" (navnematch). Foundry-dataene har en generel regel (`entryData.expertise`), se Foundry-afsnittet. Feats' Expertise tæller med i "taget"; maks. antal afkortes, og Expertise på en skill uden træning ryddes ved normalisering.
- **Weapon Mastery, trænede våben:** Filteret ("with which you have
  proficiency") bruger klassernes våbentræning plus FASTE træninger fra race og feats.
  VALGTE træninger (fx Weapon Master) tælles ikke med. Klasser, hvis
  feature-tekst hverken siger "proficiency" eller "Melee", får alle
  Simple+Martial våben.
- **Weapon Mastery, skift:** Bytte våben ved Long Rest er ikke modelleret
  (kun ét aktuelt valg). Mastery-egenskabernes regeltekst vises ikke på
  arket, kun navnet.
- **Homebrew-våben** uden `mastery`-felt giver ingen par i `masteries`.
- **Ingen automatiske tests** af valgene; kun manuelt prøvet mod
  Rogue/Bard/Ranger/Wizard/Barbarian/Fighter/Paladin.
