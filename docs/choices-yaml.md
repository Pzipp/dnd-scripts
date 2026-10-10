# Karakterbygger: format for `choices.yaml`

Én fil pr. karakter bygget med karakterbyggeren (`/builder`):
`karakterer/<navn>/choices.yaml`. Modsat `karakter.yaml` (se
[karakterark-yaml.md](karakterark-yaml.md)) er dette IKKE en fil man
redigerer i hånden - den læses og skrives af `webui/builder/model.py`
(`load()`/`save()`), og dens felter giver kun mening sammen med 5etools'
egen regeldata (mountet på `/e5tools`, se `webui/builder/e5tools.py`).

En karakter har enten en `karakter.yaml` (den manuelle, ældre vej) eller en
`choices.yaml` (bygget via `/builder`), ikke nødvendigvis begge.

## To niveauer: rå valg vs. udregnet state

`choices.yaml` gemmer kun de RÅ VALG brugeren har truffet (hvilken race,
hvilket navn+kilde, hvilke knapper er klikket) - ikke navne, tekster,
proficiencies eller andet, der kan udledes fra 5etools' data. Alt det
udledte beregnes hver gang på ny af `model.state(data)`, som slår hvert
valgt navn op i 5etools (`e5tools.py`) og bygger et komplet, allerede
opslået svar (features, spell-lister, hvad der mangler osv.) - se
`model.py`s docstring og `state()`-funktionen for den fulde form. Intet
beregnet gemmes i `choices.yaml` selv.

En karakterark-bygger, der skal læse disse data, kan derfor vælge mellem:

- **Rå**: læse `choices.yaml` direkte og selv slå hvert `{name, source}`-par
  op i 5etools (samme fremgangsmåde som `model.state()`), eller
- **Udregnet**: kalde `model.state(data)` (eller en tilsvarende funktion)
  og læse det allerede opslåede resultat derfra.

Ingen af de to er gemt et fast sted i dag - `state()` beregnes kun i
hukommelsen, når `/api/builder/state` kaldes, og skrives ikke til disk.

## Hvordan filen indlæses

`load()` tager en tom skabelon (`empty_character()`, se nedenfor) og
merger den gemte YAML ovenpå med `template.update(data)` - kun på
TOP-niveau. Et felt, som IKKE findes i skabelonen, forsvinder altså ikke,
hvis det allerede står i filen, men bliver heller aldrig læst af nogen
nuværende kode. **Vigtigt for en ny bygger:** mindst to eksisterende
testkarakterer (`dev-two`, `dev-three`) har et efterladt top-niveau-felt
`level:` og `class:` (ental, ikke `classes:`) fra en meget tidligere
version af skemaet, før multiclass-dictet fandtes. De er døde data - ingen
kode læser dem, og en ny bygger bør IKKE bruge dem (brug `classes`-dictet
og summen af dets `level`-felter, se nedenfor).

## Opbygning

```yaml
race:
  name: Human            # engelsk navn, matcher et navn i 5etools' races.json
  source: XPHB           # sammen med name er det det stabile opslags-id (findes i flere bøger)
  other_name: ''          # kun udfyldt hvis name == "Andet (hjemmelavet)" (homebrew, intet e5tools-opslag)
  choices: {}             # race-specifikke undervalg, se "Undervalg" nedenfor

classes:                  # DICT, ikke liste - key er et tilfældigt 6-tegns hex-id (uuid4().hex[:6]), ikke klassens navn
  af4f76:
    name: Fighter
    source: XPHB
    level: 20
    subclass: Eldritch Knight    # eller null, hvis endnu ikke valgt/for lavt niveau
    choices: {}
  '664090': {...}         # flere entries = multiclass. DEN FØRST INDSATTE (dict bevarer indsættelsesrækkefølge) er "primær" og giver startudstyr

background:
  name: Sailor
  source: XPHB
  choices: {}

abilities:
  method: roll            # "roll" eller "standard" - rent UI-felt, påvirker ikke beregninger
  rolls: {}                # rå terningkast, hvis method er "roll" (ikke brugt af state())
  assigned:                # de RIGTIGE, brugte scores - det eneste abilities-felt der tæller
    STR: 18
    DEX: 18
    CON: 18
    INT: 18
    WIS: 18
    CHA: 18

hp_rolls:                  # {class_id: {niveau: hp-tilvækst DET niveau for DEN klasse}} - pr. klasse, ikke pr. samlet niveau
  af4f76:                  # PRIMÆRklassens niveau 1 er altid max/IKKE gemt (kun niveau 2+)
    '2': 5
    '3': 5
    ...
  '664090':                # en SEKUNDÆR klasses EGEN niveau 1 ER med her (ikke max - se character-yaml.md)
    '1': 4
    '2': 7
    ...

feats:                     # DICT - key er en "slot-key", se "Feat slot-keys" nedenfor
  race:
    name: Tavern Brawler
    source: XPHB
    choices: {}
  af4f76_4_abilityscoreimprovement:
    name: Ability Score Improvement
    source: XPHB
    choices:
      asi: {mode: '2', ability1: CHA}    # se "Undervalg"

spells:
  known: [Counterspell, Tongues, ...]    # FLAD liste af engelske spell-navne karakteren KENDER
                                          # - ikke hvilke der er "prepared i dag" (styres af de printede spell-kort, ikke her)

equipment:
  class_package: A         # bogstav-nøgle ind i 5etools' startingEquipment-valgsæt for den PRIMÆRE klasse
  background_package: A    # samme, for baggrunden
  extra: []                # fritekst, ekstra udstyr brugeren selv har tilføjet
  armor: {name: Chain Mail, source: XPHB}  # udstyret kropsrustning, eller {name: null, source: null} = ingen
  shield: false             # Shield (+2 AC) - separat fra armor, kan bæres sammen med enhver rustning

languages:
  known: [Draconic, Elvish]  # PRÆCIS 2, valgt fra Standard Languages-tabellen (PHB 2024 kap. 2) - Common er altid implicit, ikke med her

settings:                  # PR. KARAKTER, ikke delt mellem karakterer
  allowed_sources: [XPHB]  # hvilke 5etools-kildekoder der må slås op i for DENNE karakter
  half_feats: false        # husregel-switch, se model._feat_sub_choices
```

### Klassevalg: `skills`, `expertise_<niveau>`, `scholar`, `weapon_mastery`

Under `classes.<id>.choices`. Antal og muligheder læses fra den valgte klasse:

* `skills`: klassens start-skills.
* `expertise_<niveau>`: ét valg pr. feature, der giver Expertise, vist under featuren (Rogue `expertise_1` og `expertise_6`, Bard 2 og 9, Ranger `expertise_2` (Deft Explorer, 1 skill) og `expertise_9`). Antal fra featurens tekst. Muligheder: karakterens trænede skills, uden dem der allerede har Expertise i et andet valg. Valg for features, karakteren ikke har nået, ignoreres.
* `scholar`: Wizards `Scholar` (1 skill, kun Arcana, History, Investigation, Medicine, Nature, Religion).
* `weapon_mastery`: våbennavne. Antal fra klassens tabelkolonne, ellers fra feature-teksten. Muligheder efter teksten: "Melee" (Barbarian) = kun nærkamp, "proficiency" (Rogue, Paladin, Ranger) = våben klassernes træning dækker, ellers alle Simple og Martial (Fighter).

### Samlet niveau er ikke gemt

Der er intet `level`-felt for karakteren som helhed. Det regnes altid som
`sum(c["level"] for c in data["classes"].values())` (`model.total_level()`).

### Feat slot-keys

`feats` er et dict, ikke en liste, fordi en karakter kan have mange
feat-"slots", og hvert slot skal kunne genfindes stabilt, selv når
multiclass-niveauer ændres. Nøglen er en af:

| Nøgle | Hvornår |
|---|---|
| `race` | Feat-valget en race giver (fx Human i nogle udgaver) |
| `background` | Feat-valget en baggrund giver |
| `<class_id>_<niveau>_<feature-slug>` | Et feat givet af en klassefeature på et bestemt niveau, fx `af4f76_4_abilityscoreimprovement`. `<class_id>` er samme id som i `classes`-dictet. `<feature-slug>` er feature-navnet (fx "Ability Score Improvement", "Epic Boon") sænket til små bogstaver og renset for alt udover `a-z0-9` (`model._slug()`) |

Et slots `choices`-dict kan enten pege på et feat eller ikke være udfyldt
endnu (`name: null`). Bliver en klasse fjernet, ryddes alle dens
`<class_id>_*`-feat-slots automatisk (`model.remove_class()`).

### Undervalg (`choices` i race/classes/background/feats)

Formen af `choices` afhænger helt af HVAD der er valgt (racen/klassen/
feat'et), ikke af en fast skabelon. Nøglerne, der kan optræde (se
`model._feat_sub_choices()`/`_additional_spell_choices()` for den fulde,
autoritative liste):

| Nøgle | Form | Betydning |
|---|---|---|
| `skill` | tekst | Et enkelt skill-valg |
| `skills` | liste af tekst | Flere skill-valg (fx klassens startskills) |
| `skill_any` | tekst | Skill valgt fra en helt fri pulje (fx Skilled) |
| `lineage` | tekst | Race-givet spell-liste-valg (fx visse lineage/subrace-spells) - kun på `race.choices` |
| `ability` | `STR`\|`DEX`\|... | Et evne-valg |
| `asi` | `{mode: '1'|'2', ability1, ability2}` | Ability Score Improvement: `mode '2'` = +1 til to evner, `'1'` = +2 til én |
| `ability_split` | `{type: '2-1'|'1-1-1', plus2, plus1}` | Baggrundens evne-bonus-fordeling |
| `weapon` | tekst | Weapon Mastery-våbnet for Weapon Master-feat'et |
| `weapon_mastery` | liste af tekst | Klassens egne Weapon Mastery-valg |
| `damage_type` | tekst | Elemental Adepts skadetype |
| `resist` | tekst | Resistance-valg (fx Epic Boons) |
| `tool` | tekst | Tool-proficiency-valg |
| `instrument` | tekst | Musikinstrument-valg |
| `expertise` | tekst | Expertise-valg |
| `origin` | tekst | HVILKEN spell-liste et feat med flere alternativer bruger (fx Magic Initiate: Cleric/Druid/Wizard) - styrer hvilke `origin_*`-nøgler der derefter giver mening |
| `spell_<n>` / `origin_spell_<n>` / `spell_prepared` / `b<n>_spell_<n>` osv. | tekst eller liste | Valgte spells fra et feats strukturerede spell-filter. Det eksakte id afhænger af hvor i feat'ets data-struktur filteret sidder - se `model._spell_choices_from_block()` |

Et undervalg, hvor selve MULIGHEDERNE ikke kunne udledes (ukendt
filter-format, eller en fast/automatisk tildeling uden valg), vises i
UI'en, men gemmes ikke i `choices` - se `model._unknown_choice()` og den
`fixed`-markerede variant.

## Navneopslag: engelsk id + kilde, ikke en fast liste

Ethvert `{name, source}`-par (race, klasse, subklasse, baggrund, feat,
spell-navn) er et opslags-ID ind i 5etools' egen JSON, IKKE en fri
tekststreng. `name` er altid den ENGELSKE streng, 5etools selv bruger
(`e.get_race()`, `e.get_class()`, `e.get_feat()`, `e.get_spell()` m.fl. i
`e5tools.py` slår op på præcis dette par). `source` er nødvendig, fordi
samme navn kan findes i mere end én kildebog med forskelligt indhold (se
`webui/builder/notes.md` for et konkret eksempel: Fire Bolt i både PHB og
XPHB). Den eneste undtagelse er `race.other_name` ("Andet/hjemmelavet"),
som er fri dansk/engelsk fritekst uden noget e5tools-opslag.

En karakterark-bygger, der skal vise disse på dansk, må altså selv slå det
engelske navn op (direkte i 5etools' JSON, eller via `e5tools.py`s
funktioner) for at finde den fulde regeltekst, og derefter finde/generere
en dansk udgave af den - choices.yaml indeholder ALDRIG selve
regelteksten, kun hvilket navn+kilde der er valgt.
