# Karakterark-generator (D&D 2024, dansk, A4)

Ældre generator til `karakter.yaml`: én YAML-fil pr. karakter, én HTML-fil med alle sider. Print de sider, du har brug for. Arket kan laves i **farve** og **sort/hvid**.

Det nye system (`character.yaml` + `sheets.yaml`, webui'ens Ark-fane) bruger i stedet `webui/builder/render.py`, en uafhængig renderer, der deler CSS-filerne i denne mappe. Se [`docs/sheets-yaml.md`](../../docs/sheets-yaml.md).

Datafilens felter: [`docs/karakterark-yaml.md`](../../docs/karakterark-yaml.md). Skabelon: [`karakterer/_skabelon/karakter.yaml`](../../karakterer/_skabelon/karakter.yaml).

## Tema og baggrund i webui'en

De ni temaer `sheets-*.css` (og `sheets-bw.css`) vælges i webui'en (Udseende) via `STYLE_FILES` i `webui/builder/render.py` og gælder både forhåndsvisning og PDF. `karakterark.py` bruger kun `farve` og `sorthvid`. En valgfri baggrund lægges som en ekstra CSS-regel på hver side (`section.pg`); se `webui/static/baggrunde/README.md`.

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

Sider og bokse bestemmes af YAML-filen (`sider:`), ikke af generatoren. Der er ingen fast opdeling i Karakterark, Handlingsark osv. Hvilke bokse der findes, står i `REGISTRY` i `karakterark.py`, og hvordan de vises, står i [`docs/karakterark-yaml.md`](../../docs/karakterark-yaml.md).

Et typisk ark har fire sider: karakterark, handlinger, udstyr og baggrund (og i nogle karakterer regler/ting).

## Filer

| Fil | Indhold |
|---|---|
| `karakterark.py` | Generatoren |
| `sheets.css` | Den fælles stil for alle sider. **Farve**. Deles uændret med det nye systems `webui/builder/render.py` |
| `sheets-bw.css` | Lægges oven på `sheets.css` i sort/hvid |
| `sheets-modern.css` | Tema `moderne`: lægges oven på `sheets.css` (kun webui'en) |
| `sheets-forest.css` | Tema `skov` |
| `sheets-dark.css` | Tema `mork-fantasy` |
| `sheets-royal.css` | Tema `kongelig` |
| `sheets-blood-steel.css` | Tema `blod-stal` |
| `sheets-arcane.css` | Tema `arkanum` |
| `sheets-ink-ornament.css` | Tema `blaekornament` |
| `sheets-leaf-scroll.css` | Tema `bladkrus` |
| `sheets-starline.css` | Tema `stjernelinje` |
| `tjek.py` | Fejlkontrol af YAML til webui'en (linje og kolonne). Bruger `REGISTRY` |

Alle sider i et ark bruger det samme tema. CSS'en scopes under `.s1`, så den kun gælder arket. Et nyt tema skal tilføjes i `STYLE_FILES` i `webui/builder/render.py`.

## Design

* Hver side er en post under `sider:`. Bokse vælges med `type` og placeres frit i `kolonner` og `raekker`. Se [`docs/karakterark-yaml.md`](../../docs/karakterark-yaml.md).
* Alle bokstyper ligger i `REGISTRY` i `karakterark.py`. Her står også standardtitel, og om boksen har ramme.

* Farve: pergament og en farve pr. evne (STR rød, DEX grøn, CON brun, INT blå, WIS lilla, CHA magenta). Sort/hvid: kun sort blæk, ingen farveflader. Layoutet er ens i begge.
* Kasser har runde hjørner (2 mm). Trænet = ● , Expertise = ◆, utrænet = ○.
* Under hvert tal står formlen i lille kursiv, fx `d20 + DEX + PB`. Den regnes ud automatisk fra udtrykket.
* Skrifttyper (IM Fell English og Crimson Pro) hentes fra Google Fonts. Til PDF uden internet: se [`../pdf/README.md`](../pdf/README.md).

## Ændrer du generatoren

Byg alle karakterer før og efter (`python3 dnd.py tjek`) og kig på mindst én side i begge stile. Skal begge stile ændres, så ret begge CSS-filer; ændringer i `sheets.css` rammer også de ni temaer og det nye system. Se `AGENTS.md`.
