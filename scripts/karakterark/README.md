# Karakterark-generator (D&D 2024, dansk, A4)

Én generator, én YAML-fil pr. karakter, én HTML-fil med alle sider. Print de sider, du har brug for. Arket kan laves i **farve** og **sort/hvid**.

Datafilens felter: [`docs/karakterark-yaml.md`](../../docs/karakterark-yaml.md). Skabelon: [`karakterer/_skabelon/karakter.yaml`](../../karakterer/_skabelon/karakter.yaml).

## Brug

Fra roden af repoet (anbefalet):

```bash
python3 dnd.py karakterark valak                  # farve + sort/hvid, HTML
python3 dnd.py karakterark valak --stil sorthvid  # kun sort/hvid
python3 dnd.py karakterark valak --pdf            # også PDF
```

Direkte med scriptet:

```bash
python3 scripts/karakterark/karakterark.py valak [--stil farve|sorthvid|begge] [--ud MAPPE]
```

`valak` kan være et karakternavn, en mappe eller en sti til en `karakter.yaml` (eller en `.json` i samme format). Output: `karakterark-farve.html` og `karakterark-sorthvid.html` i `karakterer/valak/udskrifter/` (eller `--ud`).

Åbn HTML-filen i en browser og print til PDF (A4, margin 0, "Baggrundsgrafik" til, 100 %), eller brug `--pdf`. Hver side er præcis én A4-side.

## Sider

| Side | Indhold |
|---|---|
| 1 · Karakterark | Header, 8 tal, evner med saves/skills/værktøj, passive sanser, sprog, angreb, magi, regler, evner & træk, Bonus actions, turplaner. Én side pr. version |
| 2 · Handlingsark | Handlinger og hvad man slår, ubevæbnet, bevægelse, hvil, Weapon Mastery, nyttige ting, skill-situationer, tilstande |
| 3 · Udstyrsark | Våben, udstyr, forbrug med afkrydsning, penge, genstande, kampagne, steder, personer |
| 4 · Baggrundsark | Udseende, historie, Træning og valg, personlighed, familie, fjender, mål, hemmeligheder |

## Filer

| Fil | Indhold |
|---|---|
| `karakterark.py` | Generatoren |
| `side1.css` | Den fælles stil for alle sider. **Farve** |
| `side1-sorthvid.css` | Lægges oven på `side1.css` i sort/hvid |
| `tjek.py` | Fejlkontrol af YAML til webui'en (linje og kolonne). Bruger `REGISTRY` |

Alle sider bruger den samme stil. CSS'en scopes under `.s1`, så den kun gælder arket.

## Design

* Hver side er en post under `sider:`. Bokse vælges med `type` og placeres frit i `kolonner` og `raekker`. Se [`docs/karakterark-yaml.md`](../../docs/karakterark-yaml.md).
* Alle bokstyper ligger i `REGISTRY` i `karakterark.py`. Her står også standardtitel, og om boksen har ramme.

* Farve: pergament og en farve pr. evne (STR rød, DEX grøn, CON brun, INT blå, WIS lilla, CHA magenta). Sort/hvid: kun sort blæk, ingen farveflader. Layoutet er ens i begge.
* Kasser har runde hjørner (2 mm). Trænet = ● , Expertise = ◆, utrænet = ○.
* Under hvert tal står formlen i lille kursiv, fx `d20 + DEX + PB`. Den regnes ud automatisk fra udtrykket.
* Skrifttyper (IM Fell English og Crimson Pro) hentes fra Google Fonts. Til PDF uden internet: se [`../pdf/README.md`](../pdf/README.md).

## Ændrer du generatoren

Byg alle karakterer før og efter (`python3 dnd.py tjek`) og kig på mindst én side i begge stile. Skal begge stile ændres, så ret begge CSS-filer. Se `AGENTS.md`.
