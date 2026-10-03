# Karakterark-skabelon v2 (D&D 2024, dansk, A4)

Én generator, én JSON pr. karakter, én HTML-fil med alle sider. Print de sider, du har brug for.
Der skrives ikke på arkene (noter tages på papir ved siden af), så arkene har ingen skrivefelter ud over afkrydsningsfelter til ressourcer.

## Sider
| Side | Indhold | JSON |
|---|---|---|
| 1 · Karakterark | Header (navn, klasse, art, baggrund, spiller), 8 tal, evner med saves/skills/værktøj, passive sanser, sprog, angreb, magi, regler (fx Snigangreb), evner & træk, Bonus actions, turplaner | `versioner` (én side pr. version) |
| 2 · Handlingsark | Alle handlinger med hvad man slår, ubevæbnet (Grapple/Shove), bevægelse, race/klasse-ekstra, livsredning og hvil, valgte Weapon Mastery, nyttige ting (metalkugler, olie), skill-situationer, tilstande | `handlingsark` |
| 3 · Udstyrsark | Våben, udstyr, forbrug med afkrydsning, penge, særlige genstande, kampagne, steder, personer | `udstyrsark` |
| 4 · Baggrundsark | Udseende, historie, Træning og valg (rustning, våben, værktøj, sprog, skills, expertise, masteries, feats), personlighed, familie, fjender, mål, hemmeligheder | `baggrundsark` |

Ingen DC-tabel (DM'ens værktøj) og ingen "næste level"-info.

## Filer
| Fil | Indhold |
|---|---|
| `karakterark.py` | Generator |
| `side1.css`, `side1-sorthvid.css` | Stil til side 1 |
| `karakterark.css`, `karakterark-sorthvid.css` | Stil til side 2–4 |
| `kvist.json`, `terrin.json`, `valak.json`, `chukio.json` | Karakterer (Valak og Chukio har 2 versioner) |

## Brug
```
python3 karakterark.py kvist.json --stil sorthvid   # -> kvist-sorthvid.html
python3 karakterark.py kvist.json                   # farve -> kvist.html
```
Åbn HTML-filen og print til PDF (A4, margin 0, "Baggrundsgrafik" til). Hver side er præcis én A4-side.

## Design
- Sort/hvid er standard i gruppen nu. Farve: kør uden `--stil`.
- Kasser har runde hjørner (2 mm). Trænet = ● (sort prik), Expertise = ◆ (sort firkant på spidsen), utrænet = ○.
- Under hvert tal står formlen i lille kursiv, fx `d20 + DEX + PB`. Den regnes ud automatisk fra udtrykket.
- Dansk tekst, engelske regelbegreber i kursiv. Afstande i fod.

## JSON
`faelles` gælder alle versioner; hver version i `versioner` kan overskrive felter.

Karakterfelter (i `faelles` eller en version):
- `navn`, `ident` [[etiket, værdi]] (højst 4), `version` (lille tekst ved navnet, fx "Som skrevet på papir")
- `evner` {STR…CHA}: scores. `mod` {STR: 4}: tving en modifier (kun til "som skrevet"-versioner med papirets tal)
- `pb`, `fart`, `hit_die` (8, 10 …), `saves`, `skills`, `expertise`
- `vaerktoej` {"DEX": ["Thieves' Tools"]}: værktøj under evnen. ["navn", "e"] = expertise
- `sprog`, `kan_bruge` {"Rustning": …, "Våben": …, "Værktøj": …}, `masteries` [["Vex", "Shortbow"]], `feats` [...]
- `stats`: 8 kasser [etiket, værdi, (formel)]
- `passiv` [[etiket, værdi]], `angreb` [[våben, ramme, skade, noter]]
- `magi` {dc: [{navn, slag, dc}], slots, liste: [[overskrift, besværgelser]]}
- `regler` [{titel, undertitel, punkter}] (fuld bredde, fx Snigangreb eller Særlige kort)
- `traek` [{navn, tag, tekst}] → Evner & træk. `bonus` [{navn, tekst}] → Bonus actions
- `ture` [{undertitel, titel, punkter}] → Din tur-bokse. `fod`: sidefod

`handlingsark`: {bonus_handlinger: {"Hide": "Cunning Action"}, vaerktoej: [{navn, evne, niveau, brug}], ekstra: [{titel, punkter}]}.
Weapon Mastery-teksten hentes automatisk fra `masteries` (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex).

`udstyrsark` / `baggrundsark`: {ident, venstre: [sektioner], hoejre: [sektioner]}. Sektioner:
- {titel, punkter, tomme}: liste med linjer (tomme = antal tomme linjer)
- {titel, type: "penge"} · {titel, type: "fakta", felter: [[etiket, værdi]]} · {titel, type: "tekst", afsnit, tomme}
- {titel, type: "traening"}: Træning og valg, bygget automatisk fra karakterdata

## Tegn i teksterne
- `[]` → afkrydsningsfelt
- `{+DEX+PB}` → regnes ud med fortegn (+5). `{11+DEX}` → uden fortegn (14). Udtryk kan bruge STR, DEX, CON, INT, WIS, CHA og PB.
- HTML som `<b>`, `<i>`, `<em>` er tilladt.

## Pladsen
Bliver en side for lang, så forkort tekster eller fjern tomme linjer. Siderne klippes ved A4-kanten.
