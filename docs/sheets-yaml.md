# Karakterark (nyt system): format for `sheets.yaml`

Én fil pr. karakter med `character.yaml`: `karakterer/<navn>/sheets.yaml`. Spiller
den samme rolle som den gamle `karakter.yaml`s [`sider:`-sektion](karakterark-yaml.md#layout)
- samme layout-sprog (bokse, kolonner, rækker), bare med engelske nøgler.

Findes filen ikke, bruges [standardlayoutet](#standardlayout), som `webui/builder/default_layout.py` laver ud fra
`character.yaml`. Det følger karakteren (spells, våben, evner), og filen skrives ikke: `python3 dnd.py ark`, Ark-fanen og
`tjek-ark` læser standardlayoutet direkte. Den oprettes først (som kopi af standardlayoutet), når layoutet gemmes eller en boks
flyttes (`sheets.py`s `ensure_exists()`). `GET /api/builder/sheets_yaml?name=<navn>&default=1` giver altid standardlayoutet.
[`karakterer/_skabelon/sheets.yaml`](../karakterer/_skabelon/sheets.yaml) er en kommenteret eksempelfil (Rogue-agtig), der
bygges af `python3 dnd.py tjek`; den bruges ikke som standard mere. `python3 dnd.py tjek-ark <navn>` kontrollerer
`sheets.yaml` (boks-typer, nøgler, formler), se [character-yaml.md](character-yaml.md#hvad-tjek-ark-kontrollerer).

**Redigeres frit, overskrives aldrig automatisk** - i modsætning til
[`character.yaml`](character-yaml.md), som genberegnes ved hvert gem.
Fritekst-sektionerne (baggrund, kampagnenoter, egne træk) udfyldes i hånden,
ligesom i dag.

**Redigeres via en indbygget YAML-editor på byggerens Ark-fane**
("Rediger layout"-knappen) - CodeMirror med syntaksfarver, linjenumre,
fejlmarkering og live-forhåndsvisning, mod
`/api/builder/sheets_*`-endepunkterne og `render.py`.

**Eller ved at trække boksene** (knappen "Træk og slip" på Ark-fanen): man flytter en boks i
arket til en anden kolonne, række eller side, tilføjer en ny fra listen over bokstyper og fjerner en
med &times;. Ændringen skrives direkte i `sheets.yaml` med `ruamel.yaml` (round-trip), så
kommentarer og formatering bevares, og arket tegnes forfra. Kode: `webui/builder/layout_edit.py`
og `render.build(..., edit=True)`, der kun i forhåndsvisningen lægger `data-path`/`data-stack` på
boksene (HTML og PDF er uændrede). Står layout-editoren åben, opdateres den med det nye indhold.

## Standardlayout

Uden egen `sheets.yaml` bygger `default_layout.build(character)` sider ud fra hvad karakteren kan. Det er neutralt: ingen
klassespecifikke bokse (Sneak Attack, Rage ...). Klassens tal og ressourcer kommer fra de automatiske bokse.

| Side | Indhold | Kommer med, hvis |
|---|---|---|
| Karakterark | `stats`, `abilities`, `languages`, `passive`, `attacks` (`auto`), `resources`, `class_numbers`, `bonus_actions`, `reactions`, `modifiers` | altid (tomme automatiske bokse udelades) |
| Evner og træk | `features` med `auto` og `include` (klasseevner, artens træk, feats) | der er klassefeatures, race-traits eller feats |
| Magi | `magic` (`auto`), `cantrips` og `spells` side om side | spellcasting, tildelte spells eller kendte spells |
| Spellbog | `spells` med `list: spellbook` | en spellbog med spells ud over de forberedte (Wizard) |
| Handlinger | `actions`, `unarmed`, `movement`, `death_saves`, `mastery`, `useful`, `skill_checks`, `conditions` | altid |
| Udstyr | `weapons` (`auto`: rustning og våben), `gear`, `special`, `money`, `campaign`, `places`, `people` | altid |
| Baggrund | `appearance`, `traits`, `backstory`, `training`, personlighed m.m. | altid |

Er spells-listen for lang til en smal kolonne (over ca. 34 rækker inkl. level-overskrifter, `spellbox.row_estimate()`), står
`cantrips` øverst og `spells` under i fuld bredde med `split: 2` (to tabeller side om side). Har en lang spellbog ikke plads
på siden, skal den deles i hånden. Layoutet er kun rammen: alle bokse er `auto`, så de følger karakteren, når den ændres.

## Opbygning

```yaml
pages:
- margin: small
  top: {}                      # sidehoved med character.name + character.summary
  layout:
  - type: stats
  - columns:
    - width: 1
      content:
      - type: abilities
    - width: 2
      content:
      - type: features
        title: Evner &amp; træk
        items:
        - {name: Action Surge, tag: Niveau 2, text: Skriv teksten her.}
  footer: 'Kilde: PHB 2024'
```

`top.summary` udeladt helt (`top: {}` eller ingen `summary`-nøgle) viser
automatisk `character.yaml`s `summary` (Klasse/Art/Baggrund) - ingen
hånd-indtastning pr. side. Angives `top.summary` selv, bruges den i stedet
(fx side 2's Slag/Fordel/Ulempe-forklaring, der intet har med karakteren at
gøre). `top.extra_summary` lægges ALTID til bagefter, til felter uden en
datakilde i `choices.yaml` endnu (fx Holdning/alignment):

```yaml
top:
  extra_summary:
  - [Holdning, Neutral]
```

## Feats: manuel eller automatisk

`type: features` kan bygge sine `items` på to måder, pr. boks:

```yaml
# Manuel (standard) - items skrives i hånden, som ovenfor.
- type: features
  title: Evner &amp; træk
  items: [{name: Action Surge, tag: Niveau 2, text: Skriv teksten her.}]

# Automatisk - items bygges fra character.yamls feats-liste, navn + dansk
# beskrivelse slået op via samme kæde som "mangler beskrivelse"-banneret
# (håndkurateret kort -> delt cache -> mangler, se descriptions.lookup()).
- type: features
  title: Feats
  auto: true
  exclude: [Ability Score Improvement]   # valgfri - feat-navne der IKKE skal vises her
```

`include` vælger kilderne: `feats` (standard), `class_features` (med `Niveau N`-tag; uden Ability Score Improvement, Subclass
Feature, Epic Boon og Spellcasting) og `race_traits`. Titlen skrives selv.

`exclude` er til feats, du hellere vil beskrive i hånden et andet sted
(fx et avanceret feat, der fortjener sin egen boks). En feat uden
oversættelse endnu vises med sit engelske navn og tom tekst - ingen fejl,
ingen opfundet tekst. `type: features` dækker kun `feats`.

`type: bonus_actions` med `auto: true` henter i stedet de feats,
klassefeatures og race-traits, hvis danske beskrivelse nævner Bonus
Action/bonushandling (klassefeatures får et `Niveau N`-tag). `exclude`
virker som ovenfor. Entries uden beskrivelse endnu kan ikke genkendes og
udelades, til de er beskrevet. Spells vises af `spells` og `cantrips` (se [Spells og cantrips](#spells-og-cantrips)).

## Automatiske bokse fra Foundry-data

Disse bokse udfyldes selv ud fra `character.yaml` (se [character-yaml.md](character-yaml.md#foundry-data)) og
udelades helt, hvis der intet er at vise:

```yaml
- type: bonus_actions     # auto: true = features, der er Bonus Action (Foundry-data; ellers genkendt i beskrivelsen)
  auto: true
- type: reactions         # auto: true = features, der er Reaction
  auto: true
- type: action_features   # auto: true = features, der er en Action
  auto: true
- type: resources         # Rage, Second Wind, Channel Divinity ...: afkrydsningsfelter og genopladning
- type: class_numbers     # Sneak Attack 3d6, Rage Damage 2, Martial Arts Die d8 ...
- type: modifiers         # fordele/bonusser, fx Danger Sense, og inaktive fart-/AC-bonusser
```

`bonus_actions`, `reactions` og `action_features` viser den udregnede terningformel i tagget (Second Wind
`1d10+5`). `exclude` virker som ovenfor. Skabelonen har `bonus_actions`, `reactions` og `resources` på side 1 og
`class_numbers` og `modifiers` på side 2. En eksisterende `sheets.yaml` ændres ikke; tilføj boksene selv.

## Spells og cantrips

To bokstyper, der aldrig blandes i samme liste. Et cantrip (level 0) står kun i `cantrips`, alt andet kun i `spells`. De kan
stå side om side i en `columns`-gruppe, eller i samme kolonne (evt. `merged`) som én kombineret boks:

```yaml
- columns:
  - width: 1
    content:
    - type: cantrips
  - width: 1.6
    content:
    - type: spells
      list: prepared        # prepared (standard) | spellbook | all
      split: 2              # valgfri: to tabeller side om side (fuld bredde)
```

Begge læser `character.yaml`: `spellcasting[]` (cantrips, prepared, spellbook, extra, arcanum), `granted_spells` (race, feats,
klassens altid-forberedte) og `spells_known`. Samme spell fra flere kilder bliver én række med kilderne under navnet
(klassen ved multiclass, `altid forberedt`, `1 pr. Long Rest · WIS`). Level, casting time, range, varighed, Concentration,
Ritual og komponenter slås op i 5etools (`spellbox.py`, kræver `E5TOOLS_DATA`); uden data står spells under "Level ?" til sidst.

* `spells` har en overskrift pr. level (`Level 1`, `Level 2` ...) i levelrækkefølge, med spell slots som afkrydsningsfelter
  (`4 slots`) og Pact Magic-slots ved Warlock. Inden for et level er navnene alfabetiske. `list: prepared` viser forberedte, altid
  forberedte og tildelte spells; `spellbook` hele spellbogen (`●` forberedt, `○` kun i bogen); `all` begge.
* `cantrips` er én alfabetisk liste. Kolonner i begge: Navn (med `C` Concentration og `R` Ritual), Cast, Range, Duration, Comp.
* Ingen skrivefelter; tomt resultat giver ingen boks.

## Tildelte spells

`type: granted_spells` viser automatisk de spells, race/afstamning og feats giver
(`character.yaml`: `granted_spells`): navn, hvordan de bruges (`1 pr. Long Rest`,
`PB pr. Long Rest`, `kendt`, `altid forberedt`), spellcasting-evne og hvorfra.
Ingen `items` behøves, og boksen udelades, hvis karakteren ingen tildelte spells har.

```yaml
- type: granted_spells
  title: Tildelte spells   # valgfri, ellers "Tildelte spells Granted spells"
```

## Passive sanser

`type: passive` beregner som standard alle tre passive sanser (Perception,
Investigation, Insight: `10 + ability + PB` hvis trænet, `+2×PB` ved
Expertise, ellers ingen PB - samme regel som et almindeligt skill check)
ud fra `character.yaml`s `skills`/`expertise`. Ingen `items` behøves:

```yaml
- type: passive
  title: Passive sanser
```

`items` kan stadig angives (samme `[label, '{...}']`-par som andre bokse)
for at overstyre - fx en fjerde, situationsbestemt passiv sans.

## Sprog og AC

`type: languages` falder på samme måde tilbage til `character.yaml`s
`languages` (Common + de 2 valgt i byggeren, se
[choices-yaml.md](choices-yaml.md)), hvis `text` udelades:

```yaml
- type: languages
  title: Sprog
```

`text` kan stadig angives for at overstyre eller tilføje et klasse-/
feature-tildelt sprog (fx Thieves' Cant), som IKKE tælles med automatisk -
se [character-yaml.md](character-yaml.md#afledte-felter-med-et-kendt-gap).

AC (i `type: stats`-rækken) er på samme måde altid beregnet fra
`equipment.armor`/`equipment.shield`, ikke et felt i sheets.yaml selv - se
samme afsnit i character-yaml.md.

## Sider, kolonner og fælles felter

| Niveau | Felt | Betydning |
|---|---|---|
| Side (`pages:`-post) | `margin` | `small`: 198 mm bredde. `none`: hele A4-bredden og ingen margen oven for. Udeladt: standard |
| | `top` | Sidehoved, se ovenfor. `top: {}` giver titel = `character.name` og `character.summary`. Udelades `top`, er der intet sidehoved |
| | `top.title`, `top.subtitle` | Stor titel (standard `character.name`) og lille kursiv tekst ved titlen (fx `Hvad kan jeg gøre?`) |
| | `top.summary`, `top.extra_summary` | Se ovenfor |
| | `box_type: none` | Fjerner rammerne på alle bokse på siden |
| | `layout` | Liste af noder: bokse, `columns` eller `rows` |
| | `footer` | Tekst i sidefoden |
| Kolonne | `width` | Relativ bredde (standard 1) |
| | `merged` | `true` lægger boksene i kolonnen i én samlet ramme; `tight` gør det med mindre luft |
| Boks | `type` | Boks-typen, se nedenfor |
| | `title`, `subtitle` | Overskrift og undertitel. `title: false` fjerner overskriften. Udeladt: standardtitel fra typen |
| | `box_type: none` | Fjerner rammen om netop denne boks |
| | `blank_lines` | Antal tomme skrivelinjer efter punkterne (`list`-lignende bokse: `list`, `text`, `training` og kategoriboksene, og tekstboksen `backstory`, hvor linjerne kommer efter afsnittene). Bruges til at lade pladsen stå åben |

## Boks-typer

Alle typer står i `REGISTRY` i `webui/builder/render.py`; hver har en `box_*`-funktion med de felter, den forventer. En ukendt type giver en fejl med listen over kendte typer. Typer, der udfyldes ud fra `character.yaml` og udelades, hvis der intet er at vise, er beskrevet ovenfor (`features`, `bonus_actions`, `reactions`, `action_features`, `resources`, `class_numbers`, `modifiers`, `granted_spells`, `passive`, `languages`). Resten:

| Type | Felter | Indhold |
|---|---|---|
| `abilities`, `stats` | | De seks evner med saves og skills, og stat-rækken (AC, HP, Hit Dice, Initiative, Speed, PB, Passive Perception). Har selv ramme |
| `attacks` | `auto`, `attacks: [[navn, træf, skade, note]]` | Angrebstabel. Navnet skrives `Dansk <em>English</em>`. `auto: true` laver rækker af `character.yaml`s `weapons` (STR, DEX eller Finesse; PB, hvis trænet; Mastery i noten; uden våben Unarmed Strike), og `attacks` lægges til bagefter |
| `magic` | `auto`, `dc: [{name, roll, dc}]`, `lists: [[label, tekst]]`, `slots` | Spellcasting: DC-celler, spell-lister og slots (afkrydsning). `auto: true` laver DC-celler (spell attack og save DC med formel) pr. caster-klasse og tællere (Cantrips, Prepared, Spellbook); `dc`/`lists` lægges til. Tom, hvis intet er angivet |
| `cantrips`, `spells` | `list` (kun `spells`), `split` (kun `spells`) | Cantrips og spells fra `character.yaml`, se [Spells og cantrips](#spells-og-cantrips) |
| `rules` | `items` | Punktliste med korte regler (fx Sneak Attack) |
| `turn` | `title`, `subtitle`, `items` | Nummereret plan for en tur (`Din tur`) |
| `actions` | `bonus: {Handling: Kilde}` | Handlingstabellen (Attack, Dash, Disengage ...). `bonus` tilføjer et "også Bonus Action"-tag |
| `unarmed` | | Ubevæbnet angreb, Grapple og Shove, udregnet af STR og PB |
| `movement` | | Fart, spring og fald, udregnet af `speed` og STR |
| `extra` | `items` | Punktliste (formler med `{...}` regnes ud) |
| `death_saves` | | Death saves, Short Rest og Long Rest. Udregner Hit Die-bonus fra CON |
| `mastery` | | De valgte Weapon Mastery-egenskaber (`character.masteries`) med regelteksten. Tom, hvis ingen er valgt |
| `useful` | | Fast liste over nyttige ting, alle kan købe og bruge |
| `skill_checks` | `tools: [{use, name, ability, level}]` | "Hvad slår jeg?": situationer med den skill og det tal, karakteren bruger. `tools` tilføjer værktøj (`level`: `p` trænet, `e` Expertise) |
| `conditions` | | Fast tabel over tilstande (Conditions) |
| `training` | `items`, `blank_lines` | "Træning og valg": rustning, våben, værktøj, sprog, skills og Expertise fra `character.yaml`, plus egne `items` |
| `money` | | Møntfelter (PP, GP, EP, SP, CP) til at skrive i |
| `facts`, `appearance` | `fields: [[etiket, værdi]]` | Etiket/værdi-par |
| `backstory` | `paragraphs` | Fritekst-afsnit |
| `weapons` | `auto`, `items`, `blank_lines` | Som listeboksene; `auto: true` starter listen med rustningen (`ac_note`, AC) og våbnene fra `weapons` (skade, egenskaber, rækkevidde) |
| `gear` | `auto`, `items`, `blank_lines` | Som listeboksene; `auto: true` starter listen med `inventory` (det øvrige udstyr, `Backpack ×2`) |
| `list`, `text`, `gear`, `special`, `campaign`, `places`, `people`, `traits`, `personality`, `family`, `enemies`, `goals`, `secrets` | `items`, `blank_lines` | Punktliste. De navngivne typer har en dansk standardtitel; `list` og `text` har ingen og får titlen fra YAML. Afkrydsningsfelter skrives `[]` |

## Renderer

Ark-fanen bygger arket via `webui/builder/render.py` - en selvstændig,
engelsk-nøglet renderer, der læser `sheets.yaml`/`character.yaml` direkte
(ingen dansk mellemform, ingen oversættelses-adapter).

`render.py` er en bevidst uafhængig kopi af
`scripts/karakterark/karakterark.py`s rendering-logik (samme HTML/CSS,
samme boks-for-boks-opbygning), lavet fordi en oversættelses-adapter mellem
to parallelle sprog blev vurderet som en unødvendig, voksende
vedligeholdelsesbyrde. De to renderere deler CSS'en i
`scripts/karakterark/*.css` uændret. Migreringen af de håndskrevne
karakterer til `character.yaml`/`sheets.yaml` er i gang (`valak`, `terrin`,
`chukio` og `kvist` er konverteret); `karakterark.py` bruges stadig af de
øvrige og fjernes først, når alle er flyttet og ejeren har besluttet det - se
[`docs/karakterark-bygger-plan.md`](karakterark-bygger-plan.md).

### Temaer

Arket kan vises i `farve` (standard `sheets.css`), `sorthvid` og ni temaer, som lægges oven på `sheets.css`.
Temaerne er registreret i `STYLE_FILES` i `render.py` og vælges under Udseende på Ark-fanen; samme tema bruges i PDF'en
(`karakterark-<tema>.pdf`). En valgfri baggrund (`webui/static/baggrunde/`) vælges ved siden af. Se
[`scripts/karakterark/README.md`](../scripts/karakterark/README.md) for filerne.

## Afgrænsning

`feats`, klasseevner og artens træk kan vises automatisk (`include`), og `bonus_actions` henter også klassefeatures og
race-traits (se [Feats: manuel eller automatisk](#feats-manuel-eller-automatisk)). Spells og cantrips vises automatisk (se
[Spells og cantrips](#spells-og-cantrips)); spell-kort hører stadig til det separate kort-system (`kort.yaml`/`spellkort.py`).
Ikke automatisk: spell-beskrivelser på arket, en spells-liste
længere end én A4-side (deles i hånden), og klasse-tildelte sprog.
