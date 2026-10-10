# `data/feats-XPHB-da.yaml`: danske XPHB-feats

Alle 77 XPHB-feats fra 5etools' `feats.json`. Filen har **samme struktur og feltnavne som
originalen** (`feat: [...]` med `name`, `source`, `page`, `category`, `prerequisite`,
`entries`, `ability` osv. uændret), så samme motor kan læse begge filer. Vores egne felter
står efter originalfelterne, har engelske navne og kolliderer ikke med 5etools' nøgler. En
5etools-læser ignorerer dem blot.

```bash
python3 scripts/data/feats_xphb.py [--kilde STI/feats.json] [--ud STI.yaml]
```

Ved genkørsel overskrives originalfelterne fra kilden, **egne felter bevares**, og nye feats
tilføjes. Feats der er forsvundet fra kilden meldes, men slettes ikke. Feats matches på
`name` + `source`. `null`/`[]`/`{}` betyder "ikke udfyldt".

## Egne felter

### Tekst

| Felt | Brug |
|---|---|
| `translationStatus` | `notStarted` → `draft` → `translated` → `reviewed`. Overblik pr. batch |
| `nameDa` | Dansk undertitel under det engelske navn (engelsk er primært, jf. navnekonventionen) |
| `prerequisiteDa` | Forudsætning som dansk tekst (`Level 4+, Charisma 13`) |
| `descriptionSheetDa` | Fuld dansk regeltekst til karakterarkets feats-sektion |
| `descriptionShortDa` | Én kort linje (ca. 120 tegn) til tætte steder: bonus-/handlingsbokse, oversigter |

### Spillekort (63 × 88 mm, forside og bagside er separate ark)

| Felt | Brug |
|---|---|
| `card.front.title` / `subtitle` / `kicker` / `text` | Navn, dansk navn, kategori/niveau-linje, kerneeffekten |
| `card.back.text` / `note` | Resten af reglen, evt. huskeregler. Ingen karaktertal, kun formler |

### Karakterark

| Felt | Brug |
|---|---|
| `sheet.section` | `features`, `bonus_actions`, `actions`, `reactions`, `magic`, `passive` |
| `sheet.show` | `false` for feats der kun giver et engangstal (fx Ability Score Improvement) |
| `sheet.tag` | Lille tag ved navnet (`1/lang pause`) |
| `grantsActions` | Nye handlinger. Liste af `{type, name, short, uses, recharge, formula}`. `type`: `action`, `bonus_action`, `reaction`, `free`, `passive`. `recharge`: `short_rest`, `long_rest`, `turn`, `initiative` |
| `modifiesActions` | Eksisterende handlinger der ændres. Liste af `{action, from, to, effect}`, fx Dash fra `action` til `bonus_action` |
| `statChanges` | Ændringer af karakterens tal, som formler i `{...}`-syntaks: `abilities`, `hp`, `hpPerLevel`, `ac`, `initiative`, `speed`, `passivePerception`, `attack`, `damage` |
| `trainingGranted` | `skills`, `expertise`, `tools`, `armor`, `weapons`, `saves` |
| `sensesGranted` | `darkvision`, `blindsight`, `tremorsense`, `truesight` i ft |
| `resistancesGranted` | `resistance`, `immunity`, `vulnerability`, `advantageOn`, `conditionImmunity` |
| `languagesGranted` | Sprog feat'en giver |
| `spellGrants` | `cantrips`, `spells`, `list`, `ability`, `noSlot`, `recharge`, `ritual` |
| `resources` | Afkrydsningsfelter: `{name, count, recharge}` |
| `playerChoices` | Valg spilleren skal træffe: `{id, title, count, options}` |
| `links` | `requires`, `replaces`, `duplicatesWith`: andre feats/features, så arket ikke viser samme regel to gange |
| `notes` | Frie redaktionsnoter. Vises ikke på noget print |

### Konventioner opfundet i batch 1

* `{choice: <id>}` som værdi peger på en post i `playerChoices` (fx `trainingGranted.tools`, `spellGrants.list`, `spellGrants.ability`). `playerChoices.id` navngives `<feat>-<valg>`.
* `playerChoices.options: []` betyder "slås op i en liste" (fx spell-listen), ikke "ingen muligheder".
* `spellGrants.alwaysPrepared: true`: spellen er altid forberedt. `noSlot` er antal gange pr. `recharge` uden spell slot.
* `statChanges.damage` er et objekt pr. angrebstype (`unarmedStrike: 1d4{+STR}`). Formler kan ikke udtrykke level eller en Hit Die; i så fald står de som tekst, og tallet ligger i `hpPerLevel` el.lign.
* `grantsActions.formula` er den ene formel, handlingen bruger. `uses` er antal anvendelser. Deler to handlinger samme pulje, bruges `resources` til puljen.
* Tekst-regler uden eget felt (Spell Change, Repeatable, rabatter) står kun i `descriptionSheetDa` og `notes`.
* Danske `nameDa` er forslag, indtil de er gennemgået (`translationStatus: reviewed`).

Værdier i felterne følger navnekonventionen: engelske regelnavne står alene (`Dash`,
`Stealth`, `Fire`), forklarende tekst er dansk.
