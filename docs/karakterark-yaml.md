# Karakterark: format for `karakter.yaml`

Én fil pr. karakter: `karakterer/<navn>/karakter.yaml`. Generatoren er `scripts/karakterark/karakterark.py`. Kommenteret skabelon: [`karakterer/_skabelon/karakter.yaml`](../karakterer/_skabelon/karakter.yaml). Kopiér den, i stedet for at skrive fra bunden.

```
python3 dnd.py karakterark <navn> [--stil farve|sorthvid|begge] [--pdf]
```

## Sider i arket

| Side | Indhold | Nøgle i filen |
|---|---|---|
| 1 · Karakterark | Navn, klasse, art, baggrund, 8 tal, evner med saves/skills/værktøj, passive sanser, sprog, angreb, magi, regler, evner & træk, Bonus actions, turplaner | `versioner` (én side pr. version) |
| 2 · Handlingsark | Handlinger og hvad man slår, ubevæbnet (Grapple/Shove), bevægelse, livsredning og hvil, valgte Weapon Mastery, nyttige ting, skill-situationer, tilstande | `handlingsark` |
| 3 · Udstyrsark | Våben, udstyr, forbrug med afkrydsning, penge, særlige genstande, kampagne, steder, personer | `udstyrsark` |
| 4 · Baggrundsark | Udseende, historie, Træning og valg, personlighed, familie, fjender, mål, hemmeligheder | `baggrundsark` |

Der er ingen DC-tabel (DM'ens værktøj), ingen "næste level"-info og ingen skrivefelter ud over afkrydsningsfelter.

## Øverste niveau

```yaml
titel: Valak karakterark      # sidetitel i HTML/PDF
faelles: {...}                # felter, der gælder alle versioner
versioner: [...]              # mindst én. Hver version er én side 1 og kan overskrive felter fra faelles
handlingsark: {...}           # valgfri
udstyrsark: {...}             # valgfri
baggrundsark: {...}           # valgfri
```

`faelles` flettes ind i hver version, og versionens egne felter vinder. Side 2–4 bruger den **sidste** version. Flere versioner bruges fx til "som skrevet på papir" og "optimeret".

## Tekstregler (gælder alle tekstfelter)

| Skriv | Bliver til |
|---|---|
| `[]` | afkrydsningsfelt |
| `{+DEX+PB}` | udregnet med fortegn: `+5` |
| `{11+DEX}` | udregnet uden fortegn: `14` |
| `<b>`, `<i>`, `<em>` | fed og kursiv (HTML er tilladt). Skriv `&` som `&amp;` |

Udtryk kan bruge `STR DEX CON INT WIS CHA` (modifiers, regnet ud fra scoren) og `PB`. Formlen bag et tal vises automatisk i lille skrift under tallet, fx `d20 + DEX + PB`.

## Karakterfelter (i `faelles` eller i en version)

| Felt | Type | Betydning |
|---|---|---|
| `navn` | tekst | Karakterens navn |
| `version` | tekst | Lille tekst ved navnet, fx `Version A · som skrevet` |
| `ident` | liste af `[etiket, værdi]` | Sidehoved, højst 4 par: Klasse, Art, Baggrund, Spiller |
| `evner` | `{STR: 16, DEX: 14, ...}` | De seks scores. Modifier regnes ud |
| `mod` | `{STR: 4}` | Tving en modifier (kun til "som skrevet"-versioner med papirets tal) |
| `pb` | tal | Proficiency Bonus (standard 2) |
| `fart` | tal | Speed i ft (standard 30) |
| `hit_die` | tal | 8, 10, 12 … (standard 8) |
| `saves` | liste | Trænede saving throws, fx `[STR, CON]` |
| `skills` | liste | Trænede skills, engelske navne som i PHB |
| `expertise` | liste | Skills med dobbelt bonus (vises ◆) |
| `vaerktoej` | `{DEX: ["Thieves' Tools"]}` | Værktøj under evnen. `["navn", "e"]` = expertise |
| `sprog` | tekst | Sprog |
| `kan_bruge` | `{Rustning: …, Våben: …, Værktøj: …}` | Vises under Træning og valg |
| `masteries` | liste af `[mastery, våben]` | Weapon Mastery. Teksten hentes automatisk (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) |
| `feats` | liste | Feats |
| `traening_ekstra` | liste | Ekstra linjer under Træning og valg |
| `stats` | 8 × `[etiket, værdi, (formel)]` | Øverste række. Udelades formlen, regnes den ud fra værdien |
| `passiv` | liste af `[etiket, værdi]` | Passive sanser |
| `angreb` | liste af `[våben, ramme, skade, noter]` | Angrebstabellen |
| `magi` | se nedenfor | Kun for kastere |
| `regler` | liste af `{titel, undertitel, punkter}` | Fulde bredde-bokse, fx Sneak Attack eller Rage |
| `traek` | liste af `{navn, tag, tekst}` | "Evner & træk". `tag` er en lille etiket, fx `Long Rest` |
| `bonus` | liste af `{navn, tekst}` | Bonus actions |
| `ture` | liste af `{undertitel, titel, punkter}` | "Din tur"-bokse, én kort plan pr. situation |
| `fod` | tekst | Sidefod (kilder) |

`magi`:

```yaml
magi:
  titel: "Magi <em>· Spellcasting</em>"      # valgfri
  dc:                                         # 1–2 bokse
    - {navn: Warlock-magi · CHA, slag: '{+CHA+PB}', dc: '{8+CHA+PB}'}
  slots: '<b>Spell slots</b> 1. grad [][]'
  liste:                                      # [overskrift, besværgelser]
    - [Cantrips, Eldritch Blast · Fire Bolt]
```

## `handlingsark`

```yaml
handlingsark:
  bonus_handlinger: {Hide: Cunning Action}    # markerer en handling som også Bonus Action
  vaerktoej:                                  # tilføjes under "Hvad slår jeg?"
    - {navn: Thieves' Tools, evne: DEX, niveau: p, brug: Dirke låse op}   # niveau: p (trænet, standard) | e (expertise)
  ekstra:                                     # egne bokse
    - {titel: Fighter, punkter: ['<b>Second Wind</b> [][]: …']}
  ident: [[Slag, d20 + tallet]]               # valgfri, overskriver sidehovedet
  fod: …                                      # valgfri
```

Handlinger, ubevæbnet, bevægelse, hvile, tilstande og skill-situationer bygges automatisk ud fra karakterens tal.

## `udstyrsark` og `baggrundsark`

```yaml
udstyrsark:
  ident: [[Klasse, Barbarian 1]]
  venstre: [sektion, ...]
  hoejre: [sektion, ...]
```

En sektion er en af:

| Form | Indhold |
|---|---|
| `{titel, punkter: [...], tomme: 5}` | Liste. `tomme` er antal tomme linjer efter punkterne |
| `{titel, type: penge}` | Møntfelter |
| `{titel, type: fakta, felter: [[etiket, værdi], ...]}` | Nøgle/værdi-liste, fx Udseende |
| `{titel, type: tekst, afsnit: [...], tomme: 3}` | Løbende tekst, fx Historie |
| `{titel, type: traening}` | Træning og valg, bygget automatisk af karakterdata |

Valgfrit: `navn`, `undertitel`, `fod`.

## Plads

Bliver en side for lang, klippes den ved A4-kanten. Forkort tekster, eller fjern tomme linjer (`tomme`). Kig altid på siden, efter du har ændret meget.

## YAML-faldgruber

* En tekst, der starter med `{` eller `[`, skal i citationstegn: `'{+DEX+PB}'`.
* En tekst med `: ` (kolon og mellemrum) skal i citationstegn.
* `Ja`, `Nej`, `on`, `off` uden citationstegn bliver sandt/falsk.
* Tal i `stats` kan være tekst eller tal. Skriv `'17'` hvis det skal stå som tekst.
* Indryk med mellemrum (ikke tabulator).
* Kør `python3 dnd.py tjek` efter hver ændring.

## Navne

Følg [navnekonventionen](navnekonvention.md): engelske regelnavne først, dansk i parentes.
