# Karakterark (nyt system): format for `character.yaml`

Én fil pr. karakter: `karakterer/<navn>/character.yaml`. Engelsk-nøglet, i
modsætning til den gamle [`karakter.yaml`](karakterark-yaml.md). Genereres af
`webui/builder/character_yaml.py` (når der er en `choices.yaml`) eller skrives
direkte (se [Uden byggeren](#uden-byggeren-characteryaml-som-primær-fil)).

Findes der en `choices.yaml` (se [choices-yaml.md](choices-yaml.md)) for
karakteren, er `character.yaml` en AFLEDT fil: den genberegnes og
overskrives, hver gang choices.yaml gemmes (`derive_and_save()`). Kun
`choices.yaml` er kilden til sandhed i det tilfælde - rediger ikke
`character.yaml` i hånden for en sådan karakter, det bliver overskrevet.

Findes der INGEN `choices.yaml`, er `character.yaml` i stedet den primære
fil, skrevet i hånden eller af en LLM. Så røres den aldrig af byggeren. Vejen
er beskrevet i næste afsnit.

## Uden byggeren: `character.yaml` som primær fil

En karakter kan laves uden den visuelle bygger:

1. En LLM får prompten i [llm-karakter-prompt.md](llm-karakter-prompt.md) og brugerens beskrivelse af karakteren
   og skriver `karakterer/<navn>/character.yaml` efter formatet nedenfor. Tal, navne og regler slås op i 5etools,
   ikke gættes; `python3 dnd.py llm-opslag` er værktøjet til opslagene.
2. `python3 dnd.py tjek-ark <navn>` kontrollerer filen og peger på hver fejl med linje og kolonne.
3. `python3 dnd.py ark <navn> [--stil <tema>|alle] [--pdf]` laver arket af `character.yaml` og `sheets.yaml`.
   Mangler `sheets.yaml`, bruges standardlayoutet fra `webui/builder/default_layout.py` (filen skrives ikke), se [sheets-yaml.md](sheets-yaml.md#standardlayout). Kontrollen
   kører først, og `ark` stopper ved en fejl. Temaerne er dem i `STYLE_FILES` i `webui/builder/render.py`
   (`farve`, `sorthvid`, `moderne`, `skov`, ...). Filerne lægges i `karakterer/<navn>/udskrifter/` som
   `karakterark-<tema>.html|pdf`, samme navne som webuiens Ark-fane.

Webui'en viser karakteren under "Kun ark" på `/builder` og åbner den på Ark-fanen (og Kort-fanen). Karakter- og
Udstyr-fanen kræver `choices.yaml` og er skjult; byggeren kan ikke gemme valg for en karakter uden
`choices.yaml`, da det ville overskrive `character.yaml`. `dnd.py liste` markerer den med "kun ark", og
`dnd.py tjek` kontrollerer og bygger den i alle temaer.

### Hvad `tjek-ark` kontrollerer

Kode: `webui/builder/character_check.py`. Intet netværk og ingen LLM. Hvert fund har linje og kolonne og er en
**FEJL** (arket kan ikke bygges, eller tallene bliver forkerte; `tjek-ark` slutter med exit 1) eller en **ADVARSEL**
(mistænkeligt, men arket bygges). Tastefejl får et forslag ("Mente du 'insight'?").

`character.yaml`:

* YAML-syntaks og dobbelte nøgler.
* **Påkrævede felter:** `name`, `level`, `race`, `background`, `classes`, `abilities`, `proficiency_bonus`, `hp`,
  `hit_dice`, `ac`, `speed`, `saves`, `skills`. Mangler `initiative`, `languages`, `can_use` eller `summary`, er det en
  advarsel (arket bruger en standard eller et tomt felt). Ukendte nøgler er en advarsel.
* **Typer og værdier:** `level` 1-20; `abilities` har præcis STR, DEX, CON, INT, WIS, CHA som hele tal (over 20 er en
  advarsel); `saves` er evner; `skills` er 5etools' skillnavne med små bogstaver (`sleight of hand`);
  `hit_dice` har `die` (6/8/10/12) og `count`; `speeds`, `senses`, `size`, `masteries` (de otte Weapon Mastery-navne),
  `resources`, `class_numbers`, `modifiers`, `activations`, `summary`, `spell_slots` og `pact_slots` har den form, `render.py` læser.
* **Sammenhæng:** `level` er summen af `classes[].level`; `proficiency_bonus` passer til level (2/3/4/5/6);
  `hit_dice` giver lige så mange terninger som level; `expertise` står også i `skills` (værktøj i `tools` er tilladt);
  `hp` er ikke under 1 (null er en advarsel) og ikke urimeligt højt eller lavt for levelet; `speeds.walk` er lig `speed`;
  subclass mangler på niveau 3 eller derover (advarsel); en klasse står ikke to gange.
* **Formler** i `{...}` (`ac`, `initiative`, `languages` og al anden tekst): kun tal, STR..CHA, PB og `+ - * /`, ellers FEJL. Kald og
  attributter afvises altid, fordi `render.fmt()` ellers ville køre dem.
* **5etools** (kun hvis `E5TOOLS_DATA` findes; ellers springes det over, og `tjek-ark` skriver en note): race, baggrund og klasse
  findes under den angivne `source` (FEJL, hvis kilden findes, men navnet ikke gør; en ukendt kilde er en advarsel, da den kan være
  homebrew); `subclass`, feats og spells findes (advarsel); `saves` indeholder primærklassens saves; `hit_dice` passer til
  klassernes terninger.

`sheets.yaml` (eller standarden): YAML-syntaks, `pages`, sidenøgler (`top`, `layout`, `footer`, `margin`, `box_type`), kolonner
(`width` er et positivt tal, `content`, `merged`), boks-typer (kendte typer er `REGISTRY` i `render.py`), nøgler, som boksen ikke bruger
(advarsel), og formler. Når `character.yaml` er uden fejl, renderes hver boks for sig mod karakteren (samme kode som arket), så fejl som
"Mangler feltet 'subtitle' i boksen 'turn'" peger på boksens linje.

### Hvad kontrollen ikke kan

* At race-, klasse- og feat-egenskaber er regnet rigtigt: `hp`, `ac`, `initiative`, `speed`, senses og resistances kontrolleres kun for
  form og groft rimelige grænser, ikke mod reglerne. `hp` kan ikke afgøres, fordi terningslag er spillerens valg.
* At skills, tools og sprog er dem, baggrunden og klassen giver, og at antallet af valg er rigtigt.
* At spells, `spell_slots` og `spellcasting` passer til klassens tabel (kun form og evne).
* At teksten i `sheets.yaml` er rigtig, eller at et ark ser pænt ud: kig på arket (A4-siderne klipper tekst, der er for lang).
* Homebrew uden for 5etools: kilder, der ikke findes, giver kun en advarsel.

## Opbygning

```yaml
name: Thorgrim
level: 5                      # total, sum af classes[].level
race: {name: Human, source: XPHB}
background: {name: Soldier, source: XPHB}
classes:
- {name: Fighter, source: XPHB, level: 5, subclass: Eldritch Knight}
abilities: {STR: 18, DEX: 14, CON: 16, INT: 10, WIS: 12, CHA: 8}
proficiency_bonus: 3           # opslået fast tabel (PHB 2024), ikke et valg
hp: 44                         # summen af ALLE klassers hp_rolls + CON-mod×level - se character_yaml._hp()
hit_dice: [{die: 10, count: 5}]  # poolet efter terningtype across klasser (PHB 2024 multiclass-regel) - se character_yaml._hit_dice_pool()
ac: 16                         # afledt af equipment.armor/shield - se character_yaml._ac()
ac_note: Chain Mail            # kort forklaring til AC-boksens fodnote, ikke en formel
initiative: '{+DEX}'           # standard + evt. høj-konfidens effects (fx Alert) - se "Afledte felter med et kendt gap"
speed: 30                      # fra racens egen speed
hit_die: 10                    # primærklassens hit die (bruges kun til level 1-HP'en, ikke resten - se hp/hit_dice)
saves: [STR, CON]              # primærklassens save-proficiencies
skills: [athletics, intimidation]
expertise: []
tools: ["Smith's Tools"]       # flad liste - IKKE grupperet efter evne, se nedenfor
languages: Common, Draconic, Elvish  # Common (fast) + languages.known - se character_yaml._languages()
can_use: {armor: "light, medium, heavy, shields", weapons: "simple, martial"}
size: Medium                   # racens størrelse, eller det valgte (race.choices.size)
speeds: {walk: 35}             # ft; også fly/swim/climb, hvis racen har dem
senses: {darkvision: 60, blindsight: 10}  # ft, fra race/afstamning og valgte feats - se character_yaml._feat_grants()
resistances: [cold, fire]      # fra race/afstamning (fast eller valgt) og valgte feats
immunities: []                 # race: immune / vulnerable / conditionImmune (faste, strenge)
vulnerabilities: []
condition_immunities: []
granted_spells:                # spells race/afstamning og feats giver på karakterens nuværende niveau
- {name: Faerie Fire, source: XPHB, cantrip: false, addition: innate, ability: WIS, recharge: long_rest, uses: '1', from: "race: Elf"}
resources:                     # features med begrænset antal brug (Foundry-data): navn, antal, genopladning
- {name: Second Wind, max: 3, recharge: long_rest, short_rest_regain: 1, from: Fighter}
class_numbers:                 # klassernes niveau-tabeller på dit niveau (Foundry-data, advancement/ScaleValue)
- {owner: Rogue, label: Sneak Attack, value: 3d6}
activations:                   # hvilke features der er action/bonus/reaction (Foundry-data), evt. med terningformel
- {name: Second Wind, source: XPHB, kind: class_feature, class: Fighter, level: 1, types: [bonus], roll: 1d10+5}
modifiers:                     # fordele/bonusser, der ikke er regnet ind i arkets tal (Foundry-data)
- {from: Danger Sense, what: DEX saves, value: fordel, note: '', active: true}
masteries: [[Vex, Shortsword]]  # [egenskab, våben] fra classes.*.choices.weapon_mastery - se character_yaml._masteries()
weapons:                       # valgfri: våben til angrebsboksen og udstyrslisten, se "Våben" nedenfor
- {name: Shortsword, source: XPHB, category: martial, ranged: false, damage: 1d6, damage_type: Piercing, properties: [Finesse, Light], mastery: Vex}
inventory: [{name: Backpack, source: XPHB, quantity: 1}]   # valgfri: det øvrige udstyr (ikke våben), se "Våben" nedenfor
feats: [{name: Tavern Brawler, source: XPHB}]
spells_known: [{name: Fire Bolt, source: XPHB}]   # spillerens egne valg: cantrips, forberedte, arcanum, ekstra (ikke spellbogen)
optional_features: [{name: Careful Spell, source: XPHB, types: [MM], class: Sorcerer}]   # valgte Metamagic/Invocations/Maneuvers
spellcasting:                  # pr. caster-klasse (se "Klassens spellcasting")
- {class: Wizard, subclass: Evoker, ability: INT, level: 5, save_dc: '{8+PB+INT}', attack: '{+PB+INT}', max_spell_level: 3,
   cantrips: [], spellbook: [], prepared: [], arcanum: {}, extra: [], variant: null, prepare_change: restLong}
spell_slots: [4, 3, 2]         # spell slots pr. spell-niveau, samlet for alle klasser (multiclass-tabellen)
pact_slots: null               # Warlock: {slots: 2, level: 3}
class_features: [{class: Fighter, name: Action Surge, source: XPHB, level: 2}]
race_traits: [{name: Darkvision, source: XPHB}]
extra_training: []
summary: [[Klasse, Fighter 5], [Art, Human], [Baggrund, Soldier]]
```

## Våben

`weapons` er en valgfri liste. Boksen `attacks` med `auto: true` laver én række pr. våben (træf `d20 + STR/DEX + PB`, skade, egenskaber, Mastery), og `weapons` med `auto: true` lister dem sammen med rustningen (`ac_note`). Byggeren udleder listen af startpakkerne for primærklassen og baggrunden (`equipment.class_package`/`background_package`), valg i pakkerne (`equipment.picks`, fx "ét Simple-våben"), udstyrsvælgeren (`equipment.items`) og navne i `equipment.extra` (`character_yaml._equipment()`). Samme ting nævnt flere gange lægges sammen (`quantity`, kun med hvis over 1). `name_da` er et dansk navn til angrebstabellen (`Dolk <em>Dagger</em>`; kun for våben, `items.NAME_DA` kender). `inventory` er alt det øvrige udstyr fra de samme kilder: `name`, `source`, `quantity` (ukendt fritekst har kun `name` og `quantity`). Boksen `gear` med `auto: true` lister `inventory`. Uden våben viser angrebsboksen Unarmed Strike. Felter: `name` (påkrævet), `category` (`simple`/`martial`, afgør PB ud fra `can_use.weapons`), `ranged` (true: DEX), `damage`, `damage_type`, `damage_versatile`, `properties` (Finesse, Light, Thrown, Versatile, Two-Handed, Ammunition ...), `range` (`20/60`), `mastery`.

## Klassens spellcasting

Læst fra klassens og subklassens egne felter (`webui/builder/spellcasting.py`), ikke fra en fast tabel:

* **Antal** på klassens niveau: `cantripProgression`, `preparedSpellsProgression`. **Højeste spell-niveau**: højeste niveau med slots i klassetabellen (Warlock: kolonnen `Slot Level`).
* **Spellbog** (Wizard): `spellsKnownProgressionFixed`; de forberedte vælges blandt spellbogen. **Mystic Arcanum** (Warlock): `spellsKnownProgressionFixedByLevel`.
* **Altid forberedt/kendt** (`additionalSpells` på klasse og subklasse: domæne-, oath-, circle-, patron-spells, Divine Smite, Hunter's Mark osv.) tæller ikke mod antallet og lægges i `granted_spells` med `from: "class: Cleric (Life Domain)"`. Niveau-nøgler er klassens niveau, `s6` betyder "når man har slots af 6. niveau". Flere navngivne blokke er alternativer (Circle of the Land: terræn, `subclass_variant`).
* **Subklasse-casters** (Eldritch Knight, Arcane Trickster) bruger deres egen tabel og vælger fra Wizard-listen (`expanded`). Bard udvider sin liste med Magical Secrets (`expanded`).
* **Slots:** én caster-klasse bruger sin egen tabel; flere bruger Multiclass Spellcaster-tabellen (Wizards række) på det samlede caster-niveau (full = niveau, Paladin/Ranger = halvdelen rundet op, Eldritch Knight/Arcane Trickster = en tredjedel rundet ned). Warlocks Pact Magic er separat (`pact_slots`).
* `save_dc` og `attack` er formler i `{...}`-syntaks, som arket regner ud.

## Hvad racen giver karakteren

Alt læses fra racens strukturerede 5etools-felter (`webui/builder/races.py`):

* **Afstamning = version.** Elf (Drow/High Elf/Wood Elf), Tiefling (Abyssal/Chthonic/Infernal), Gnome (Forest/Rock), Goliath (6 giganter) og Dragonborn (10 farver) har `_versions`. Hver version er en fuld race, der udfoldes efter 5etools' egne regler (`webui/builder/versions.py`: versionens felter afløser racens, `_mod` retter `entries`, skabeloner fyldes med `{{variabler}}`). Valget gemmes som `race.choices.lineage` (kortnavnet, fx `Drow`), og den valgte versions felter afløser racens: Darkvision 120 (Drow), speed 35 (Wood Elf), resistance og spells (Tiefling-Legacy), skadetype (Dragonborn). Indtil en afstamning er valgt, vises kun afstamnings-valget og racens fælles træk.
* `darkvision`/`blindsight` → `senses`. `speed` (tal, eller `{walk, fly, swim}` hvor `true` = lig walk) → `speeds`. `size` med flere bogstaver (`["S","M"]`) er et valg → `size`.
* `resist`: faste (`["necrotic"]`) og `{choose: {from}}` (valg, `race.choices.resist`) → `resistances`.
* `additionalSpells` → `granted_spells` (også for valgte feats, se nedenfor; `from` siger hvorfra, `addition` er `known`/`innate`/`prepared`), læst af `webui/builder/spell_grants.py`: `known`/`innate`/`prepared`, niveaunøgler (spellen låses op på karakterniveau 1/3/5), brugsnøgler (`daily: {"1": ...}` = 1 pr. Long Rest, `"1e"` = 1 pr. spell, `"pb"` = PB gange), `choose`-filtre (valg `spell_<n>`) og spellcasting-evne (`{choose: [int, wis, cha]}` → `race.choices.spell_ability`). Kun spells op til karakterens niveau tages med.
* `skillProficiencies` og `toolProficiencies` følger samme regler som for feats (`true` = fast, tal/`choose` = valg). `armorProficiencies`/`weaponProficiencies` (`true`) lægges i `can_use`. `immune`/`vulnerable`/`conditionImmune` → `immunities`/`vulnerabilities`/`condition_immunities`. `feats: [{any: 1}]` (Variant Human) giver ét valgfrit feat (ikke Epic Boon/Fighting Style).

### Ældre kilder (PHB 2014, MPMM, VGM m.fl.)

* **Subraces.** Ældre racer har deres afstamninger som `subrace`-poster (`raceName` + `raceSource`), filtreret på de tilladte kilder. De lægges ovenpå racen efter 5etools' regler (`races.merge_subrace`): `ability` flettes pr. position (eller erstattes ved `overwrite.ability`), `entries` lægges til, `traitTags`/`languageProficiencies` lægges til (eller erstattes), `skillProficiencies` flettes, og alt andet (speed, darkvision, additionalSpells, armor-/weaponProficiencies, resist) erstattes af subracens egne felter. En subrace uden navn hedder `Standard` (grundvarianten, fx Human: +1 på alt). Valget er det samme `race.choices.lineage` som for `_versions`.
* **Racers evnepoint** (`ability`: `{con: 2}`, negative tal, `choose: {from, count, amount}`, `weighted: [2, 1]`) tælles KUN med, når indstillingen pr. karakter `race_ability` er slået til (2024 flyttede dem til baggrunden, så de ville ellers tælle dobbelt). Valgene er `ability_option` (flere blokke), `ability_pick` (liste) og `ability_w<n>` (vægtet, n'te vægt). `lineage: "VRGR"` uden egen ability giver frit +2/+1 eller +1/+1/+1, som 5etools selv gør.
* **`_copy`.** Racer, subraces, baggrunde, subclasses og subclass-features, der er en `_copy` af en anden post, foldes ud i `copies.resolve` (efter de danske felter, før `_versions`), så de har basisens tekst og felter. `_copy._mod` tilføjer/erstatter træk (`replace` matcher også danske overskrifter som `Størrelse (Size)`). Kun den officielle data foldes; `_copy` i homebrew røres ikke.
* **Ikke dækket:** `languageProficiencies` på racer (sprog vælges i byggerens egen sprog-dialog efter 2024-reglen).

Baggrunde følger samme tool-regler: `anyGamingSet: 1` (Guard, Noble, Soldier), `anyArtisansTool` (Artisan) og `anyMusicalInstrument` (Entertainer) er VALG (`background.choices.gaming_set` / `artisan_tool` / `instrument`), ikke faste værktøjer.

## Baggrundens feat

Hver XPHB-baggrund giver ét fast feat (`feats: [{"skilled|xphb": true}]`). Det står som feat-slottet
`feats.background` i `choices.yaml` (udfyldes automatisk af `model.normalize()` og nulstilles, når baggrunden
skifter) og giver karakteren alt, et valgt feat giver: undervalg, tools, skills, spells, beskrivelser.
Skilled: tre valg blandt alle skills og værktøjer (`skill_any`, deles i `skills`/`tools` ud fra navnet).
Crafter og Musician: værktøj/instrument. Varianter som `magic initiate; cleric|xphb` er Magic Initiate med
spell-listen låst (valget `origin` vises fast); spellcasting-evne og spells vælges.

## Hvad feats giver karakteren

Alt læses fra feat'ens strukturerede 5etools-felter (betydning: `webui/builder/feat_rules.py`),
ikke fra teksten, og kommer fra den kilde (bog), feat'et er valgt fra:

* `ability` → evnescorer. Fast (`{con: 1}`) og valgt (`choose`, gemt som `choices.ability`). Loftet er 20; `max` på feat'et hæver det for den valgte evne (Epic Boons: 30). En grundscore over loftet røres ikke. Ability Score Improvement har sin egen +2/+1-dialog (`choices.asi`).
* `savingThrowProficiencies` → `saves`. Er `from`-listen den samme som `ability`'s (Resilient), styrer ét valg både +1 og save-træning.
* `skillProficiencies`, `toolProficiencies` → `skills`, `tools` (faste tildelinger + valgene `skill`, `skill_any`, `tool`, `instrument`). `expertise` → `expertise` (valget `expertise`).
* `armorProficiencies`, `weaponProficiencies` → tilføjes til `can_use`.
* `senses` → `senses`. `resist` (fast eller valgt) → `resistances`.
* `additionalSpells` → `granted_spells` med `from: "feat: <navn>"`: Magic Initiate (valgt blok `origin`), Fey-/Shadow-Touched, Telepathic, Telekinetic, Blessed/Druidic Warrior og Ritual Caster. Spellcasting-evnen er enten fast, valgt (`ability`/`origin_ability`) eller `inherit` = feat'ets egen evne-forhøjelse. Spells i `granted_spells` får beskrivelser og kort-udkast som `spells_known` (`descriptions._entries_from_character`) og kan vises på arket med boks-typen `granted_spells`.
* `prerequisite` afgør hvilke feats der tilbydes: `level`, `ability`, `spellcasting2020` og `proficiency` (rustningstræning fra klasserne og valgte feats). `feature` og `otherSummary` er opfyldt af det slot, der tilbyder feat'et.

Kun det, dataene ikke siger, har navne-undtagelser i `model._feat_sub_choices()`: Weapon Master og Elemental Adept (valget står kun i teksten).

## Afledte felter med et kendt gap

`PRESERVED_FIELDS` i `character_yaml.py` er i dag tom - `ac`, `initiative`
og `languages` var tidligere manuelle/preserverede felter, men er alle tre
nu RIGTIGT afledte af choices.yaml:

- `initiative`: PB på initiativ kommer fra enkelte feats (fx Alert XPHB),
  løst via et LLM-baseret effects-udtræk (se `effects.py` og
  [llm-effect-extraction-prompt.md](llm-effect-extraction-prompt.md)) -
  `character_yaml._apply_effects()` folder høj-konfidens, PERMANENTE
  effects ind i formlen hver gang.
  Strukturerede tal fra 5etools' Foundry-filer (`webui/builder/foundry.py`)
  går forud for LLM-effekterne og kræver hverken LLM eller tekstlæsning.

## Foundry-data

`foundry.py` læser `foundry-feats.json`, `foundry-races.json`, `foundry-optionalfeatures.json` og
`class/foundry.json` fra 5etools og regner formlerne ud mod karakteren (`@prof`, `@abilities.wis.mod`,
`@classes.sorcerer.levels`, `@scale.rogue.sneak-attack`, `max()`/`min()`). Hvad det giver:

* **Effekter** (kun permanente: `transfer`, ikke slået fra): HP pr. level/samlet (Dwarven Toughness, Tough,
  Draconic Resilience, Boon of Fortitude), initiativ (Alert, Dread Ambusher), fart i alle bevægelsesarter
  (Fast Movement, Unarmored Movement, Speedy ...), sanser (ADD/UPGRADE), resistenser/immuniteter/tilstands-
  immuniteter og AC-bonus (Defense). Det regnes ind i `hp`, `initiative`, `speed(s)`, `senses`, `resistances`,
  `immunities`, `vulnerabilities`, `condition_immunities` og `ac`.
* **Betingelser** står kun i featurens tekst: "aren't wearing Heavy armor" (Fast Movement, Roving, Speedy),
  "aren't wearing armor" (Unarmored Movement) og "while you're wearing armor" (Defense) genkendes og tjekkes
  mod den valgte rustning og skjold. Er betingelsen ikke opfyldt, står effekten som inaktiv i `modifiers`.
  En ukendt vending regnes som ubetinget.
* **`resources`**: features med antal og genopladning (Rage, Second Wind, Action Surge, Channel Divinity, Lucky,
  Lay on Hands ...). Genopladning kommer fra dataene; mangler den (SRD-features), læses den af featurens tekst
  ("Short or Long Rest", "Long Rest", "regain one expended use when you finish a Short Rest").
* **`class_numbers`**: klassernes og subklassernes niveau-tabeller (Sneak Attack, Rage Damage, Martial Arts Die,
  Unarmored Movement, Focus Points, Sorcery Points ...).
* **`activations`**: hvilke features der er Action, Bonus Action eller Reaction, og skade-/helbredelsesformler
  regnet ud (Second Wind 1d10+9). Bruges af de automatiske bokse `bonus_actions`, `reactions` og
  `action_features` (se [sheets-yaml.md](sheets-yaml.md)).
* **`modifiers`**: fordele og bonusser på checks, saves, angreb og skade (Danger Sense, Archery, Dueling,
  Aura of Protection ...). De regnes ikke ind i arkets tal, men kan vises med boksen `modifiers`.

Entries, hvor Foundry giver HP eller initiativ, sendes ikke til LLM-effekt-udtrækket.
- `ac`: løst ved at tracke udstyret rustning direkte i choices.yaml
  (`equipment.armor`/`equipment.shield`, se [choices-yaml.md](choices-yaml.md))
  - `character_yaml._ac()` følger PHB 2024 kap. 1 (Light = base + DEX,
  Medium = base + DEX maks. 2, Heavy = base uden DEX, Shield +2 uanset
  rustning). `ac_note` er en kort tekst-forklaring til AC-boksens fodnote
  (fx "Chain Mail + Shield") - render.py viser den som den er, regner intet
  selv.
- `languages`: løst ved at tracke PHB 2024 kap. 2's "Choose Languages"-regel
  direkte (`languages.known`, 2 sprog valgt fra Standard Languages-tabellen,
  se [choices-yaml.md](choices-yaml.md)) - `character_yaml._languages()`
  bygger `"Common, " + ", ".join(known)`. Dertil kommer sprog, en klassefeature med sprogets navn giver (Rogue: Thieves' Cant, Druid: Druidic; sprogene findes i 5etools' `languages.json` som type `rare`/`secret`), `character_yaml._class_languages()`. **Ikke med:** frit valgte ekstra sprog fra features (fx det ekstra sprog til Thieves' Cant, Ranger Deft Explorer).

Alle tre genberegnes altid og overskriver BEVIDST en manuel rettelse (samme
"enkelt og forudsigeligt"-aftale som resten af systemet). `render.py` læser
dem bare som værdierne de er, ligesom alt andet - selve udregningen ligger
altid i `character_yaml.py`, aldrig i renderen.

## Kendte forenklinger

* **`tools` er en flad liste**, ikke grupperet efter evne som den gamle
  `vaerktoej: {DEX: [...]}`. 5etools' egne data har ikke en sikker,
  opslåelig "hvilken evne styrer dette værktøj"-regel, og Ark-fanen viser
  derfor (endnu) ikke værktøj under evne-boksen.
* **`masteries`** udledes af de valgte Weapon Mastery-våben; egenskaben slås op i `mastery` på våbnet i 5etools' `items-base.json`. `expertise` kommer fra klassens `choices.expertise`.
* **HP/Hit Dice bruger nu HVER klasses egen hit die** (rettet - var tidligere
  kun primærklassens). `choices.yaml`s `hp_rolls` er pr. klasse (se
  [choices-yaml.md](choices-yaml.md)): PRIMÆRklassens niveau 1 er implicit
  max (ikke gemt, "you gain the 1st-level hit points for a class only when
  you are a 1st-level character"), en SEKUNDÆR klasses EGEN niveau 1 ER
  gemt (den får IKKE max, da karakteren ikke er 1st-level når den
  multiclasses ind i den). `hp = primærklassens maks.terning + sum(ALLE
  hp_rolls) + CON-mod × total_level` - sidste led bruger TOTAL niveau (ikke
  "total_level - 1"), så en retroaktiv CON-ændring korrekt regnes om for
  alle niveauer på én gang (PHB 2024: "When your Constitution modifier
  increases by 1, your hit point maximum increases by 1 for each level you
  have attained"). `hit_dice` pooles separat efter terningtype ("If the Hit
  Dice are the same die type, you can simply pool them together... If your
  classes give you Hit Dice of different types, keep track of them
  separately").
