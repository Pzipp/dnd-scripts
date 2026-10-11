# Forberedelse af opslagsfiler til oversættelse

Opslagsfiler: `backgrounds`, `optionalfeatures`, `items`, `items-base`, `skills`, `actions` og klasserne (`class/class-*.json`). `oversaet_bog.py` er rettet til dem.

## Trin

1. Små filer (`skills`, `actions`, `items-base`, `optionalfeatures`) symlinkes uændret: `ln -s /srv/dnd5etools/data/<fil>.json data/books/<fil>.json`. Resultatet hedder `<id>-da.json`.
2. Store filer (`items`, `backgrounds`, `class-<navn>`) afgrænses med `python3 forbered_kilde.py <id>` (standard XPHB og XDMG; `--kilder XPHB,PHB` ændrer det). Det skriver `data/books/<id>.json`.
3. Derefter den sædvanlige arbejdsgang: `python3 oversaet_bog.py <id> udtraek`, `naeste`, skriv `dansk/NNN.json`, `tjek`, `saml`.
4. Flyt `data/books/<id>-da.json` til slutplaceringen: `data/<id>-da.json` (`data/spells/<id>-da.json` for spells, `data/class/class-<navn>-da.json` for klasser). Hele tabellen står i `CLAUDE.md` ("Slutplacering"). Filen i `data/books/` bruges ikke af builderen, og `data/*-da.json`, `data/spells/`, `data/class/` og batch-mapperne er gitignoreret, så tag selv sikkerhedskopi.

Rettelserne ændrer ikke udtrækket for `spells-xphb` og `races` (stier.json er identisk før og efter).

## Hvad rettelserne dækker

| Problem uden rettelsen | Følge | Rettelse |
|---|---|---|
| `name` under `class`, `subclass`, `consumes`, `subclasses`, `optionalfeatureProgression`, `featProgression` udtrækkes | Henvisninger som `prerequisite.class.name` og ressourcenavne ville blive oversat og knække opslag | `name` udtrækkes kun under `entries`, `entry`, `items`, `additionalEntries`, `entriesTemplate`, `entriesHigherLevel`, `sizeEntry` |
| `itemGroup.items` er en liste af `"Navn\|KILDE"`-henvisninger, men `items` er med i `STRENGE_I` | Henvisningerne ville blive udtrukket som tekst | Listen springes over |
| `{#itemEntry Navn\|KILDE}` indeholder bogstaver uden for `{@..}` | Skabelon-henvisninger (ca. 100 i items) ville blive udtrukket | Strenge der starter med `{#` springes over |
| `{{item.resist}}` i `itemEntry.entriesTemplate` | `tjek` ser ikke, hvis feltet ændres eller fjernes | `TAG` dækker også `{#..}` og `{{..}}`, så de skal stå uændrede |
| Nye lister mangler i `ENTITETER` | Navne på baggrunde, genstande, klasser osv. ville blive oversat | Lagt til: `background`, `optionalfeature`, `item`, `itemGroup`, `baseitem`, `itemProperty`, `itemType`, `itemEntry`, `itemTypeAdditionalEntries`, `itemMastery`, `skill`, `action`, `sense`, `class`, `subclass`, `classFeature`, `subclassFeature` |

Navne på klasse-features, genstande, skills og actions oversættes ikke: `classFeatures: ["Action Surge|Fighter||2"]` og `{@action Dash}` slår dem op på engelsk.

## Omfang med standardkilderne (XPHB, XDMG)

| Id | Poster | Tekster | Tegn | Batches |
|---|---|---|---|---|
| `backgrounds` | 16 | 120 | ca. 4.900 | 1 |
| `optionalfeatures` | 58 | 95 | ca. 17.900 | 2 |
| `items` | 707 + 34 grupper | 1.973 | ca. 326.000 | 37 |
| `items-base` | 103 + egenskaber, typer, mastery | 210 | ca. 16.700 | 2 |
| `skills` | 36 | 40 | ca. 6.600 | 1 |
| `actions` | 48 | 163 | ca. 30.900 | 4 |
| `class-<navn>` (12 filer) | 1 klasse, 4 subclasses pr. fil | 1.508 i alt | ca. 233.000 | 33 i alt |

Uden kildefilter er `items.json` ca. 1,6 mio. tegn (180 batches) og `backgrounds.json` ca. 289.000 tegn (33 batches; mest 2014-baggrunde med tabeller). Vælg bredere kilder med `--kilder`, hvis gruppen bruger andre bøger. `items` er den største opgave og kan deles op: `--kilder XPHB` giver kun de almindelige genstande, `--kilder XDMG` de magiske.

## Opmærksomhedspunkter

* `items-base`: én `_copy` peger på `SHP|XPHB`, som ligger uden for filen. Skal den med, så tag `--kilder XPHB,XDMG,<kilde>` eller se efter, om det er et skibsfelt, der ikke bruges.
* Felter uden for tekstnøglerne oversættes ikke og forbliver engelske: klassernes `startingProficiencies` og `multiclassing`, genstandes `reqAttune` og `rarity`, `startingEquipment` i baggrunde. De vises i builderen, så de skal evt. oversættes i selve visningen (rendereren) i stedet for her.
* Tabeller: række- og kolonnetekster oversættes. Ordenstal (`3rd`) bliver til `3.`, og rene tal/enheder kopieres uændret med `flet`.
* Navne på træk i klasser og baggrunde følger `Dansk titel (English Name)` fra `ordliste.md`. Afvigelser (Senses og regelord) står på engelsk alene.
* Terminologi: udvid `ordliste.md` med klasse- og genstandstermer ved første batch, så senere batches er konsistente.
