# dnd-scripts

Gruppens værktøjer til **D&D 2024** på dansk: print-klare **karakterark** og **spell-/evnekort** i farve og sort/hvid. Hovedvejen er en **webui med en karakterbygger**, der slår valg op i 5etools' regeldata og laver ark og kort. En ældre kommandolinje (`dnd.py`) bruger håndskrevne YAML-filer og virker stadig.

Bruges af både mennesker og AI-assistenter (Claude, Gemini, ChatGPT/Codex m.fl.). AI'er læser [`AGENTS.md`](AGENTS.md) først.

## Tre måder at arbejde på

| | Webui med karakterbygger (hovedvejen) | `character.yaml` uden bygger (LLM) | Kommandolinje (ældre) |
|---|---|---|---|
| Start | `python webui/app.py`, eller Docker | `python3 dnd.py tjek-ark` og `ark` | `python3 dnd.py ...` |
| Karakterens filer | `choices.yaml`, `character.yaml`, `sheets.yaml`, `kort.yaml` | `character.yaml` (+ `sheets.yaml`, ellers standarden) | `karakter.yaml`, `kort.yaml` |
| Passer til | Nye karakterer. Faner: Karakter, Udstyr, Kort, Ark | Nye karakterer, skrevet af en LLM ud fra en beskrivelse | Karakterer skrevet i hånden |
| Læs | [`webui/README.md`](webui/README.md) | [`docs/character-yaml.md`](docs/character-yaml.md), [`docs/llm-karakter-prompt.md`](docs/llm-karakter-prompt.md) | resten af denne fil |

En karakter kan have begge slags filer (`valak`, `terrin`, `chukio` og `kvist` er konverteret til det nye format og beholder deres gamle filer). Flere karakterer er ikke konverteret endnu og bruges kun med `dnd.py`.

## Webui og karakterbygger

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt -r webui/requirements.txt
playwright install chromium          # kun til PDF
python webui/app.py                  # http://localhost:8080
```

Byggeren kræver 5etools' regeldata (`E5TOOLS_DATA`, standard `/e5tools/data`). Alt står i [`webui/README.md`](webui/README.md): Docker, port, 5etools, danske oversættelser, kort-temaer, ark-temaer, baggrunde og PDF.

## Kom i gang med kommandolinjen

Arkene og kortene ligger ikke i repoet, men laves af scripts ud fra YAML-filerne. Vil du printe, så lav dem først:

```bash
pip install -r requirements.txt     # PyYAML og Playwright (Playwright er kun nødvendig til PDF)
playwright install chromium         # kun til PDF

python3 dnd.py liste                # vis karakterer
python3 dnd.py alt valak --pdf      # karakterark + kort for Valak, som HTML og PDF
python3 dnd.py tjek                 # byg alt og meld fejl i data (kør før du gemmer)
```

`dnd.py karakterark` bruger `karakter.yaml` og `kort.yaml`. `dnd.py kort` virker også for byggerens karakterer, fordi de har en `kort.yaml`. Karakterark af `character.yaml` laves med `dnd.py ark` (se nedenfor) eller i webui'en (fanen Ark).

Output lægges i `karakterer/<navn>/udskrifter/`:

| Fil | Indhold |
|---|---|
| `karakterark-farve` / `karakterark-sorthvid` | A4-sider efter karakterens `sider:`/`pages:`, typisk 4 (fx Karakterark, Handlinger, Udstyr, Baggrund) |
| `kort-farve` / `kort-sorthvid` | Spell-/evnekort, 63 × 88 mm, 9 pr. A4, forsider og bagsider |

Webui'en gemmer også ark-temaer (`karakterark-<tema>`) og kort-temaer (`kort-<tema>`) her. `.html` åbnes i en browser. `.pdf` er klar til print (A4, margin 0, 100 %). Alle printbare ting findes i både **farve** og **sort/hvid**. Med `dnd.py` vælges stil med `--stil farve`, `--stil sorthvid` eller (standard) `--stil begge`.

## Karakterark uden bygger (`character.yaml`)

En LLM skriver `karakterer/<navn>/character.yaml` ud fra prompten i [`docs/llm-karakter-prompt.md`](docs/llm-karakter-prompt.md) og din beskrivelse. Arket laves af den og `sheets.yaml`; mangler `sheets.yaml`, bruges standarden `karakterer/_skabelon/sheets.yaml`.

```bash
python3 dnd.py tjek-ark min-karakter                 # kontrol med linje og kolonne (exit 1 ved fejl)
python3 dnd.py ark min-karakter --pdf                # HTML og PDF i farve
python3 dnd.py ark min-karakter --stil alle --pdf    # alle ark-temaer (farve, sorthvid, moderne, skov, ...)
```

`ark` kører kontrollen først og stopper ved en fejl. Kontrollen (`webui/builder/character_check.py`) tjekker påkrævede felter, typer, evner, skills, level mod classes, proficiency bonus mod level, hit dice og formler, og slår race, baggrund, klasse, subclass, feats og spells op i 5etools, hvis `E5TOOLS_DATA` findes. Den er beskrevet i [`docs/character-yaml.md`](docs/character-yaml.md). I webui'en står karakteren under "Kun ark" på `/builder`. `python3 dnd.py llm-opslag` er opslagsværktøjet til LLM'en.

## Mapper

```
dnd.py                  kommandolinjen: liste · karakterark · kort · alt · tjek · tjek-ark · ark · llm-opslag
AGENTS.md               instruktioner til AI-assistenter (CLAUDE.md og GEMINI.md peger hertil)
webui/                  webui: menu, karakterbygger (/builder)
  builder/              byggerens kode: valg, udregning, ark, kort, 5etools-opslag
  static/ templates/    CSS/JS/billeder (baggrunde/ er egne baggrundsbilleder) og HTML
karakterer/
  <navn>/               én mappe pr. karakter
    choices.yaml        byggerens rå valg (nyt system)
    character.yaml      udregnede stats, genberegnes ved hvert gem (nyt system); uden choices.yaml er den primær og skrives af en LLM
    sheets.yaml         arkets layout, redigeres frit (nyt system)
    kort.yaml           kortbunken (id'er fra bibliotek/, evt. egne kort)
    karakter.yaml       karakterarket i det ældre format (typisk 4 sider)
    udskrifter/         genererede HTML og PDF (ikke i git)
  _skabelon/            kommenterede skabeloner til nye karakterer
bibliotek/              kort, som gruppen deler, som YAML, og genererede caches (_*.yaml)
scripts/                generatorerne (se scripts/README.md)
  karakterark/  kort/  pdf/  data/
data/                   danske oversættelser af 5etools-data og værktøjet til dem
docs/                   formater, navnekonvention og todo
vol/                    runtime-data i Docker (ikke i git, bortset fra vol/homebrew/index.json)
```

## Lav en ny karakter

I webui'en: åbn `/builder`, opret en karakter, og vælg art, klasse, baggrund, evner, feats, spells og udstyr. Lav kort og ark på fanerne Kort og Ark.

Med en LLM i stedet for byggeren: giv den [`docs/llm-karakter-prompt.md`](docs/llm-karakter-prompt.md) og din beskrivelse, læg resultatet i `karakterer/<navn>/character.yaml`, og kør `python3 dnd.py tjek-ark <navn>` og `python3 dnd.py ark <navn> --pdf`.

Det ældre format (`karakter.yaml`):

```bash
cp -r karakterer/_skabelon karakterer/min-karakter
# ret karakterer/min-karakter/karakter.yaml og kort.yaml
python3 dnd.py tjek
python3 dnd.py alt min-karakter --pdf
```

Skabelonen har kommentarer ved hvert felt. Se også [`docs/karakterark-yaml.md`](docs/karakterark-yaml.md) og [`docs/kort-yaml.md`](docs/kort-yaml.md). Mangler et kort, så skriv det i `bibliotek/` (hvis andre kan bruge det) eller under `egne:` i din `kort.yaml`.

## Regler for indholdet

* **Engelske regelnavne oversættes ikke.** Stats, ting, evner og besværgelser står på engelsk alene: `Dexterity`, ikke `Smidighed` og ikke `Dexterity (Smidighed)`. Forklarende tekst er dansk. Se [`docs/navnekonvention.md`](docs/navnekonvention.md).
* Reglerne er D&D 2024 (Player's Handbook 2024). Teksterne er korte danske opsummeringer. Køb bogen for de fulde regler.
* Afstande i fod. Kort og ark viser formler (`d20 + DEX + PB`), så man kan se, hvordan et tal er regnet.
* Der skrives ikke på arkene. Noter tages på papir ved siden af.
* Alt printbart laves i både farve og sort/hvid.
* Bogtekster fra 5etools og deres danske oversættelser ligger ikke i repoet (ophavsretligt materiale); kun værktøjet til at oversætte dem.

## Hvis du bruger en AI

Giv den adgang til repoet og sig, hvad du vil ("lav et karakterark til min halfling rogue"). Den læser `AGENTS.md`. Til nye karakterer bruger du webui'en, eller den skriver `character.yaml` efter [`docs/llm-karakter-prompt.md`](docs/llm-karakter-prompt.md) og kontrollerer den med `python3 dnd.py tjek-ark`; til ældre karakterer kopierer den skabelonen, kører `python3 dnd.py tjek` og viser dig resultatet. Uden internet kan den stadig lave PDF: se [`scripts/pdf/README.md`](scripts/pdf/README.md).

## Bidrag

Lav ændringer på en gren, og kør `python3 dnd.py tjek`, før du gemmer. Læs [`AGENTS.md`](AGENTS.md) for de små regler (hvad man ikke må ændre, hvordan man navngiver).
