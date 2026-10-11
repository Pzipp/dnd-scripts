# Ordliste og oversættelsesregler (D&D-bøger → dansk)

Gælder alle bøger i denne mappe. Udvid de faste termer, når en ny bog bringer nye begreber.

## Regler
- Kun tekstværdier oversættes. `{@...}`-tags er uændrede, byte for byte (også visningsteksten).
- Spilbegreber (stats, skills, conditions, skadetyper, handlinger, enheder) oversættes i løbende
  tekst som `dansk (English)`, fx `hastighed (Speed)`, `Dexterity`-> `Smidighed (Dexterity)`.
  Efter første forekomst i et afsnit/felt må den engelske parentes udelades hvis det bliver tungt,
  men aldrig i overskrifter og tabeller med regeltermer.
- Ord i selve tags (`{@condition Prone}`) røres ikke; omgivende tekst bøjes efter dansk grammatik.
- Spell-, item-, class-, monster- og feat-navne uden tag: behold engelsk navn.
- `feet` -> `fod (feet)`, `ft.` -> `ft.` (uændret). Terninger (`d20`) uændret.
- Overskrifter: dansk titel; regelbegreb som overskrift: `Dansk (English)`.
- Glossary-kategorier: `[Action]` -> `[Handling]`, `[Condition]` -> `[Tilstand]` osv.
- D&D, Dungeon Master (DM) beholdes. Brug "du" til spilleren.

## Faste termer
Strength Styrke · Dexterity Smidighed · Constitution Konstitution · Intelligence Intelligens ·
Wisdom Visdom · Charisma Karisma (alle med engelsk i parentes) · Ability Score egenskabsværdi ·
Ability modifier egenskabsmodifikator · Proficiency Bonus færdighedsbonus · Armor Class (AC) panserklasse ·
Hit Points (HP) hitpoints · Hit Point Dice hitpoint-terninger · Speed hastighed · Initiative initiativ ·
Saving Throw redningsslag · Attack Roll angrebsslag · Ability Check egenskabsprøve · Advantage/Disadvantage
fordel/ulempe · Long/Short Rest lang/kort hvile · Spell Slot besværgelsesplads · Cantrip cantrip ·
Concentration koncentration · Reaction reaktion · Bonus Action bonushandling · Action handling ·
Opportunity Attack lejlighedsangreb · Difficulty Class (DC) sværhedsgrad · Heroic Inspiration heroisk inspiration ·
Exhaustion udmattelse · Blinded blændet · Charmed charmeret · Deafened døv · Frightened bange ·
Grappled grebet · Incapacitated uduelig · Invisible usynlig · Paralyzed lammet · Petrified forstenet ·
Poisoned forgiftet · Prone liggende · Restrained fastholdt · Stunned bedøvet · Unconscious bevidstløs

## Besværgelser og species (opslagsfiler)
- Gælder `spells-*.json`, `races.json` og `feats.json`: Navnet på selve besværgelsen, species, subrace eller feat udtrækkes ikke og står på engelsk. Trækoverskrifter og valgmuligheder inde i teksten oversættes som almindelige overskrifter.
- Skade og redningsslag: `Acid-skade`, `Dexterity-redningsslag` (engelsk type + dansk grundord). Væsenstyper, størrelser og våbenkategorier (Beast, Large, Ranged) står på engelsk.
- Handlings-tags: `{@action Magic|XPHB}-handling`. Tilstande: `tilstanden {@condition Charmed|XPHB}`.
- "Using a Higher-Level Spell Slot" = `Brug af en højere besværgelsesplads`. "Cantrip Upgrade" = `Cantrip-opgradering`.
- Materialekomponenter oversættes som korte danske navneled (`en bid mad`); beløb skrives `1.000 GP`.
- `ft.`/`feet` i løbende tekst: `fod`; `miles` = `mile`, `inch` = `tomme`.
- Species-træk (overskrifter): `Dansk titel (English Name)`, så navnet kan genkendes mod bogen. Faste: `Alder (Age)`, `Størrelse (Size)`, `Sprog (Languages)`, `Væsenstype (Creature Type)`. Senses og regelord står alene: `Darkvision`, `Alignment`. Samme engelske træknavn oversættes ens overalt, fordi `_mod ... replace` slår navnet op.
- Ældre tekster uden tags: `proficient`/`proficiency` beholdes, `resistance mod Necrotic-skade`, `fordel (advantage)`, `lang hvile`, `bonushandling`, `færdighedsbonus`, `flyvehastighed`.
