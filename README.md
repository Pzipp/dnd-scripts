# dnd-scripts

Gruppens værktøjer til **D&D 2024** på dansk: print-klare **karakterark** og **spell-/evnekort**. Én datafil pr. karakter (YAML), ét kommando, og ud kommer HTML og PDF i farve eller sort/hvid.

Bruges af både mennesker og AI-assistenter (Claude, Gemini, ChatGPT/Codex m.fl.). AI'er læser [`AGENTS.md`](AGENTS.md) først.

## Kom i gang

Arkene og kortene ligger ikke i repoet, men laves af scripts ud fra YAML-filerne. Vil du printe, så lav dem først:

```bash
pip install -r requirements.txt     # PyYAML. Playwright er kun nødvendig til PDF
playwright install chromium         # kun til PDF

python3 dnd.py liste                # vis karakterer
python3 dnd.py alt valak --pdf      # karakterark + kort for Valak, som HTML og PDF
python3 dnd.py tjek                 # byg alt og meld fejl i data (kør før du gemmer)
```

Output lægges i `karakterer/<navn>/udskrifter/`:

| Fil | Indhold |
|---|---|
| `karakterark-farve` / `karakterark-sorthvid` | 4 sider A4: Karakterark, Handlingsark, Udstyrsark, Baggrundsark |
| `kort-farve` / `kort-sorthvid` | Spell-/evnekort, 63 × 88 mm, 9 pr. A4, forsider og bagsider |

`.html` åbnes i en browser. `.pdf` laves med `--pdf` og er klar til print (A4, margin 0, 100 %). Alle printbare ting findes i både **farve** og **sort/hvid**. Vælg med `--stil farve`, `--stil sorthvid` eller (standard) `--stil begge`.

## Mapper

```
dnd.py                  indgangspunktet: liste · karakterark · kort · alt · tjek
AGENTS.md               instruktioner til AI-assistenter (CLAUDE.md og GEMINI.md peger hertil)
karakterer/
  <navn>/               én mappe pr. karakter
    karakter.yaml       karakterarket (4 sider)
    kort.yaml           kortbunken (id'er fra bibliotek/, evt. egne kort)
    udskrifter/         genererede HTML og PDF (ikke i git)
  _skabelon/            kommenteret skabelon: kopiér den til en ny karakter
bibliotek/              kort, som gruppen deler (besværgelser, evner, udstyr), som YAML
scripts/                generatorerne (se scripts/README.md)
  karakterark/  kort/  pdf/
docs/                   formater og regler for datafilerne
```

## Lav en ny karakter

```bash
cp -r karakterer/_skabelon karakterer/min-karakter
# ret karakterer/min-karakter/karakter.yaml og kort.yaml
python3 dnd.py tjek
python3 dnd.py alt min-karakter --pdf
```

Skabelonen har kommentarer ved hvert felt. Se også [`docs/karakterark-yaml.md`](docs/karakterark-yaml.md) og [`docs/kort-yaml.md`](docs/kort-yaml.md). Mangler et kort, så skriv det i `bibliotek/` (hvis andre kan bruge det) eller under `egne:` i din `kort.yaml`.

## Regler for indholdet

* **Engelske regelnavne oversættes ikke.** Stats, ting, evner og besværgelser står på engelsk, og en dansk oversættelse står evt. i parentes: `Dexterity (Smidighed)`. Se [`docs/navnekonvention.md`](docs/navnekonvention.md).
* Reglerne er D&D 2024 (Player's Handbook 2024). Teksterne er korte danske opsummeringer. Køb bogen for de fulde regler.
* Afstande i fod. Kort og ark viser formler (`d20 + DEX + PB`), så man kan se, hvordan et tal er regnet.
* Der skrives ikke på arkene. Noter tages på papir ved siden af.
* Alt printbart laves i både farve og sort/hvid.

## Hvis du bruger en AI

Giv den adgang til repoet og sig, hvad du vil ("lav et karakterark til min halfling rogue"). Den læser `AGENTS.md`, kopierer skabelonen, kører `python3 dnd.py tjek` og viser dig resultatet. Uden internet kan den stadig lave PDF: se [`scripts/pdf/README.md`](scripts/pdf/README.md).

## Bidrag

Lav ændringer på en gren, og kør `python3 dnd.py tjek`, før du gemmer. Læs [`AGENTS.md`](AGENTS.md) for de små regler (hvad man ikke må ændre, hvordan man navngiver).
