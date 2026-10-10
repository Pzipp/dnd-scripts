# Karakterark (nyt system): format for `character.yaml`

Én fil pr. choices.yaml-karakter: `karakterer/<navn>/character.yaml`. Engelsk-
nøglet, i modsætning til den gamle [`karakter.yaml`](karakterark-yaml.md).
Genereres af `webui/builder/character_yaml.py`.

Findes der en `choices.yaml` (se [choices-yaml.md](choices-yaml.md)) for
karakteren, er `character.yaml` en AFLEDT fil: den genberegnes og
overskrives, hver gang choices.yaml gemmes (`derive_and_save()`). Kun
`choices.yaml` er kilden til sandhed i det tilfælde - rediger ikke
`character.yaml` i hånden for en sådan karakter, det bliver overskrevet.

Findes der INGEN `choices.yaml`, er `character.yaml` i stedet den primære
fil - skrevet direkte, af builder-UI'en eller af et LLM. Denne vej er endnu
ikke bygget (kun formatet er klar til det).

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
masteries: [[Vex, Shortsword]]  # [egenskab, våben] fra classes.*.choices.weapon_mastery - se character_yaml._masteries()
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
* **Ikke dækket:** `languageProficiencies` på racer (sprog vælges i byggerens egen sprog-dialog efter 2024-reglen), og racer med `_copy` (17 stk.).

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
  bygger `"Common, " + ", ".join(known)`. **Kendt, BEVIDST gap:** "Your
  class and other features might also give you languages" (fx Rogue får
  Thieves' Cant, Druid får Druidic) tælles IKKE med her - de vises kun som
  tekst i den feature, der giver dem (Træning og valg), ikke tilføjet til
  `languages`-linjen. Der er ingen generel, sikker regel i 5etools' data for
  at opdage ALLE den slags class-tildelte sprog automatisk.

Alle tre genberegnes altid og overskriver BEVIDST en manuel rettelse (samme
"enkelt og forudsigeligt"-aftale som resten af systemet). `render.py` læser
dem bare som værdierne de er, ligesom alt andet - selve udregningen ligger
altid i `character_yaml.py`, aldrig i renderen.

## Kendte forenklinger

* **`tools` er en flad liste**, ikke grupperet efter evne som den gamle
  `vaerktoej: {DEX: [...]}`. 5etools' egne data har ikke en sikker,
  opslåelig "hvilken evne styrer dette værktøj"-regel, og Print-fanen viser
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
