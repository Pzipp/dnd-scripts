# AGENTS.md: instruktioner til AI-assistenter

Dette er den fælles instruktionsfil for alle AI-værktøjer i gruppen (Claude, Gemini, ChatGPT/Codex, Copilot m.fl.). `CLAUDE.md`, `GEMINI.md` og `.github/copilot-instructions.md` peger hertil. Ret kun denne fil.

## Hvad projektet er

Gruppens D&D 2024-værktøjer på dansk: **webui'en med karakterbyggeren** (`/builder`) og en ældre kommandolinje. De laver print-klare **karakterark** og **spell-/evnekort** i farve og sort/hvid. Brugerne er spillere i en dansk gruppe. Sproget i filer og svar er **dansk**, reglerne er **D&D 2024 (Player's Handbook 2024, PHB)**.

Der findes to systemer, som deler CSS, kortgenerator og PDF-generator:

| | Nyt system (hovedvejen) | Ældre system (kommandolinjen) |
|---|---|---|
| Hvordan | Webui'en, fanerne Karakter, Udstyr, Kort, Ark | `python3 dnd.py ...` |
| Filer pr. karakter | `choices.yaml` (rå valg), `character.yaml` (udregnet), `sheets.yaml` (layout), `kort.yaml` | `karakter.yaml` (alt i én fil), `kort.yaml` |
| Ark laves af | `webui/builder/render.py` | `scripts/karakterark/karakterark.py` |
| Format | `docs/choices-yaml.md`, `docs/character-yaml.md`, `docs/sheets-yaml.md` | `docs/karakterark-yaml.md` |

Nye karakterer bygges i webui'en. Ældre karakterer (`karakter.yaml`) bruges stadig med `dnd.py` og fjernes ikke. En karakter kan have begge slags filer (`valak`, `terrin`, `chukio` og `kvist` er konverteret til det nye format, men beholder de gamle filer). Flere er ikke konverteret.

## Kommandoer

Porte i homelab: dev-containeren `dnd-webui-dev` svarer på `http://localhost:8082`, prod (`../dnd-scripts`) på 8081; 8080 er kun containerens interne port og standarden for `python webui/app.py`. Test mod 8082, aldrig 8081 (prod).

Webui'en (nyt system) køres fra roden: `python webui/app.py` (se `webui/README.md`) eller i Docker. Alle karakterbyggerens data kommer fra 5etools' regeldata, som skal være mountet på `/e5tools`.

Ældre kommandolinje (`karakter.yaml`; `kort.yaml` virker også for byggerens karakterer):

```bash
python3 dnd.py liste                          # vis karakterer
python3 dnd.py karakterark <navn> [--stil farve|sorthvid|begge] [--pdf]
python3 dnd.py kort <navn>        [--stil farve|sorthvid|begge] [--pdf]
python3 dnd.py alt <navn> --pdf               # begge dele
python3 dnd.py alt --alle --pdf               # alle karakterer
python3 dnd.py tjek                           # byg alt; meld fejl i data. KØR FØR DU GEMMER
python3 dnd.py tjek-ark <navn>                # kontrollér character.yaml + sheets.yaml (linje og kolonne)
python3 dnd.py ark <navn> [--stil <tema>|alle] [--pdf]   # ark direkte fra character.yaml + sheets.yaml
python3 dnd.py llm-opslag ...                 # opslag i 5etools til dig (scripts/data/llm_opslag.py)
```

`pip install -r requirements.txt` (PyYAML og Playwright; Chromium med `playwright install chromium`). Webui'en kræver desuden `pip install -r webui/requirements.txt` (Flask, ruamel.yaml). Uden internet: brug `--skrifttyper` (se `scripts/pdf/README.md`), ellers får PDF'en forkerte skrifttyper og kortene kan ombrydes anderledes.

## Mappekort

| Sti | Hvad |
|---|---|
| `dnd.py` | Indgangspunkt for den ældre kommandolinje |
| `webui/` | Flask-webui: menu (`/`), karakterbygger (`/builder`) og simpelt VTT (`/simpelvtt`, kode i `webui/simpelvtt/`; leverede General Maps-kort i `webui/simpelvtt/general_maps/` (sporet, read-only i UI'et) og brugerens egne i `vol/userdata/simpelvtt/general-maps/` (ikke i git); se `docs/simpelvtt.md`). Se `webui/README.md` |
| `mapcreator/`, `webui/mapcreator/` | Kortbygger (`/mapcreator`): klienten i TypeScript + Svelte bygges med Node (`mapcreator/build-docker.sh`) til `webui/static/mapcreator/` (gitignoreret); Flask-blueprint gemmer kort i `$USERDATA/mapcreator/` (standard `/userdata`). Se `docs/mapcreator.md` |
| `webui/builder/` | Byggerens kode: `model.py` (valg og state), `character_yaml.py` (udregning), `render.py` (ark), `default_layout.py` (standardlayout, når `sheets.yaml` mangler), `spellbox.py` (spell- og cantrip-lister), `kort.py`/`cards.py` (kort), `e5tools.py` (opslag og dansk overlay), `copies.py`/`versions.py` (`_copy`, `_versions`), `descriptions.py`/`effects.py`/`llm_client.py` (danske beskrivelser og effekter), `baggrund.py`, `layout_edit.py`, `routes.py` |
| `webui/static/` | CSS/JS til webui'en, `baggrunde/` (billeder til ark og kort), `theme-*.css` (sidetemaer, endnu ikke tilsluttet) |
| `karakterer/<navn>/` | Én mappe pr. karakter, se tabellen ovenfor. Ældre: `karakter.yaml` (`docs/karakterark-yaml.md`) |
| `karakterer/<navn>/udskrifter/` | **Genereret, ikke i git.** Redigér aldrig i hånden |
| `karakterer/_skabelon/` | Kommenterede skabeloner til nye karakterer (`karakter.yaml`, `kort.yaml`, `sheets.yaml`) |
| `bibliotek/*.yaml` | Delte kort (id -> kort) |
| `bibliotek/_cards.yaml`, `_descriptions.yaml`, `_effects.yaml` | **Genererede caches** til det nye system: kortudkast, danske beskrivelser og udtrukne effekter. Se `bibliotek/README.md` |
| `scripts/karakterark/`, `scripts/kort/`, `scripts/pdf/` | Generatorer og CSS. Hver mappe har en README |
| `scripts/faelles.py` | Fælles hjælpere (indlæsning, stile, stier) |
| `data/*-da.json`, `data/spells/`, `data/class/` | Danske oversættelser af 5etools-data, lagt ovenpå af `e5tools.py`. **Ikke i git** (bortset fra `feats-da.json`). Se `data/books/oversaettelse/CLAUDE.md` |
| `data/books/` | Kilder og arbejdsfiler til oversættelse. Værktøjet i `data/books/oversaettelse/` er i git, resten ikke |
| `data/feats-XPHB-da.yaml` | Alle XPHB-feats med danske felter. Lav/opdatér med `scripts/data/feats_xphb.py`. Format: `docs/feats-xphb-da.md` |
| `vol/` | Runtime-data, ikke i git. `vol/userdata/` (mountet som `/userdata`) er brugerdata og det eneste sted at tage backup: `mapcreator/`, `simpelvtt/`, `homebrew/` |
| `docs/` | Formater, navnekonvention, todo |

## Sådan laver du en ny karakter med `character.yaml` (LLM-vejen, uden bygger)

Brugeren beskriver en karakter, og du skriver `karakterer/<navn>/character.yaml` (ikke `karakter.yaml`, og ingen `choices.yaml`).

1. Læs `docs/llm-karakter-prompt.md` (reglerne for dig) og `docs/character-yaml.md` (formatet). Spørg, hvis du mangler det væsentlige: klasse og level, art, baggrund, evner, udstyr. Gæt ikke på tal.
2. Slå regler op i stedet for at huske dem: `python3 dnd.py llm-opslag` (race, klasse, feats, spells fra 5etools).
3. `mkdir karakterer/<navn>` (små bogstaver og bindestreg) og skriv `character.yaml`. Tal som `proficiency_bonus`, `hit_dice` og saves følger levelet og klassen.
4. `python3 dnd.py tjek-ark <navn>` og ret hver FEJL (linje og kolonne står i beskeden) og hver ADVARSEL, du kan. Gentag, til der ingen fejl er.
5. `python3 dnd.py ark <navn> --pdf`, derefter **kig på resultatet** (HTML eller PDF-siderne; tekst, der er for lang, klippes ved kanten af A4-siden). Har karakteren ingen `sheets.yaml`, laver `webui/builder/default_layout.py` et neutralt standardlayout ud fra `character.yaml` (spells, cantrips, angreb, evner); ret layoutet kun i en egen `karakterer/<navn>/sheets.yaml` (se `docs/sheets-yaml.md`).

Kontrollen finder tastefejl, manglende felter og tal, der ikke passer sammen. Den kan ikke se, om reglerne er regnet rigtigt (HP, AC, valg fra klasse og baggrund), så tjek dem selv mod PHB 2024.

## Sådan laver du en ny karakter (ældre `karakter.yaml`, arbejdsgang)

Hovedvejen er webui'en: opret en karakter på `/builder`, vælg art, klasse, baggrund, evner, feats, spells og udstyr, vælg kort, og lav ark og PDF på fanerne Kort og Ark. Layoutet (`sheets.yaml`) redigeres i fanen Ark (YAML-editor eller træk og slip). `character.yaml` genberegnes ved hvert gem; ret valg i byggeren, ikke i den fil.

Ældre arbejdsgang (`karakter.yaml`):

1. Spørg, hvis du mangler det væsentlige: klasse og level, art (species), baggrund, evner, udstyr. Gæt ikke på tal.
2. `cp -r karakterer/_skabelon karakterer/<navn>` (navn med små bogstaver og bindestreg).
3. Udfyld `karakter.yaml` og `kort.yaml`. Udregn ikke modifiers i hånden: skriv `'{+DEX+PB}'`, og generatoren regner det ud.
4. Nye kort: se om de findes i `bibliotek/` først. Ellers læg dem i `bibliotek/` (kan genbruges) eller under `egne:` i `kort.yaml`.
5. `python3 dnd.py tjek`, derefter `python3 dnd.py alt <navn> --pdf`.
6. **Kig på resultatet** (HTML eller PDF-siderne). Tekst, der er for lang, klippes ved kanten af A4-siden eller kortet. Forkort, til den passer. I webui'en viser forhåndsvisningen og PDF-linket en advarsel om kort med tekst uden for rammen.

## Faste regler

* **Engelske regelnavne står alene.** Stats, ting, evner, besværgelser, handlinger, tilstande, skadetyper og våbenkategorier skrives kun på engelsk, uden dansk oversættelse i parentes (`Dexterity`, `Fire`, `Simple`, ikke `Smidighed`, `ild`, `Simple (enkle)`). Forklarende tekst er dansk, og den engelske term kan stå i parentes efter et dansk ord: `Halv skade fra slag, stik og hug (Bludgeoning, Piercing, Slashing)`. I angrebstabellen og udstyrslisten står det danske navn øverst og det engelske i lille skrift under (`Dolk <em>Dagger</em>` i data). Homebrew kan kun have dansk navn, og det markeres med `<i>Hjemmelavet</i>` under navnet. Overskrifter som "Angreb · Attacks" er uændrede. Baggrundsarket (side 4) er fritekst til rollespillet: noter, udsagn og gentagelser af navne oversættes, rettes eller tolkes ikke. Undtagelsen gælder kun fritekst. Sektionen "Træning og valg" er regler og følger navnereglerne. Se `docs/navnekonvention.md`.
* **Slå op, opfind ikke.** Regler og navne tages fra PHB 2024. Angiv kapitel (og side, hvis du kender den) i sidefoden (`fod`-feltet) eller på kortet (`ref:`). Er du usikker, så sig det i stedet for at gætte.
* **Farve og sort/hvid.** Alt printbart skal kunne laves i begge. Nye print-scripts skal have `--stil farve|sorthvid|begge` og bruge `faelles.stile()`.
* **Afstande i ft** (foot), som i reglerne.
* **Vis formlen.** Tal på arket har formlen under sig (`d20 + DEX + PB`). Det klarer generatoren, hvis du bruger `{...}`-udtryk.
* **Ingen skrivefelter** på ark. Gruppen skriver ikke på printet; noter tages på papir. Afkrydsningsfelter (`[]`) til ressourcer er i orden.
* **Ingen DC-tabel** og ingen "næste level"-info på karakterark.
* **Kort er generelle.** Ingen karaktertal på kort, kun formler (`d20 + spellangreb`). Så kan de deles og ændrer sig ikke ved level-stigning.
* **To-sidede ting** (kortenes for- og bagside) laves som separate ark og printes *ikke* dobbeltsidet. Forside og bagside lægges ryg mod ryg i samme kortlomme.
* **Tæt og funktionelt layout** frem for pynt.

## Dataformat i korte træk

* Data er **YAML** (JSON kan også læses). Én karakter = én mappe. Det nye systems filer har engelske nøgler (`character.yaml`, `sheets.yaml`), de ældre danske (`karakter.yaml`, `kort.yaml`).
* Tekst, der starter med `{` eller `[`, eller indeholder `: `, skal i citationstegn. `Ja`/`Nej` uden citationstegn bliver sandt/falsk.
* `[]` i tekst = afkrydsningsfelt. `{+DEX+PB}` = udregnet med fortegn. `{10+DEX}` = udregnet uden fortegn. Udtryk kan bruge `STR DEX CON INT WIS CHA PB`.
* HTML `<b> <i> <em>` er tilladt. Skriv `&` som `&amp;`.
* `choices.yaml`, `character.yaml` og `bibliotek/_*.yaml` skrives af webui'en. Ret dem ikke i hånden uden at vide, hvordan de genskrives (`docs/choices-yaml.md`, `docs/character-yaml.md`). `sheets.yaml` og `kort.yaml` redigeres frit og overskrives aldrig automatisk.
* Fejlbeskeder fra `dnd.py` er på dansk og forklarer, hvad der er galt (fx ukendt kort-id med forslag).

## Må og må ikke

* **Redigér ikke** filer i `udskrifter/` i hånden. Generér dem igen.
* **Slet eller overskriv ikke** en anden spillers karakter uden at spørge. Hver spiller ejer sin mappe i `karakterer/`.
* Commit **ikke** genererede filer: hele `udskrifter/` (HTML og PDF) og `__pycache__` er i `.gitignore`. Der er ingen færdige PDF'er i repoet; de laves i webui'en eller med `python3 dnd.py ... --pdf`.
* Commit ikke bogtekster og oversættelser af dem (`data/books/*.json`, `data/*-da.json`, `data/spells/`, `data/class/`; ophavsretligt materiale), `.env`, `vol/`. Se `.gitignore`.
* Foretræk at lave ændringer på en **gren** og lade en pull request gennemgå dem. Skriv ikke direkte til `main`, medmindre ejeren siger det.
* Ret ikke i `scripts/` for at løse et dataproblem i en enkelt karakter. Brug `egne:` eller karakterens egen fil.
* Læg ikke adgangskoder, nøgler, domænenavne eller personlige oplysninger i repoet. Repoet er offentligt. Lokal konfiguration (port, LLM-endpoint og -nøgle) står i `.env`, som ikke er i git.

## Når du ændrer generatorerne

* Layoutkode er skrøbelig: sider er præcis én A4. Efter en ændring skal du bygge alle karakterer og sammenligne med før (`python3 dnd.py tjek`, og kig på mindst ét ark og ét kort i hver stil).
* Der er to renderere for karakterark: `scripts/karakterark/karakterark.py` (ældre, `karakter.yaml`) og `webui/builder/render.py` (nyt, `character.yaml` + `sheets.yaml`). De er bevidst uafhængige og deler kun CSS. Ændrer du et boks-udseende, så tjek begge.
* CSS til karakterark: `sheets.css` er farve-stilen (alle sider). `sheets-bw.css` lægges ovenpå i sort/hvid. De ni temaer `sheets-*.css` (moderne, skov, mørk fantasy, kongelig, blod og stål, arkanum, blækornament, bladkrus, stjernelinje) lægges også ovenpå `sheets.css`. De er registreret i `STYLE_FILES` i `webui/builder/render.py`, og et nyt tema skal stå dér. CSS'en scopes under `.s1`.
* CSS til kort: `spellkort.css` er sort/hvid, og `spellkort-farve.css` lægges ovenpå. De fem `stil-*.css` er tema-overlays oven på en af dem (`TEMAER` i `spellkort.py`, valgt med `--tema`). Skal begge stile ændres, så ret begge.
* Kortenes måling af tekst uden for rammen ligger i `scripts/kort/maal_overflow.js` og bruges af både `scripts/pdf/lav_pdf.py` og webui'ens Kort-fane. Ændrer du kortets klasser (`.frame`, `.eff`, `.kicker`, `.dice`), så ret målingen.
* `webui/static/theme-*.css` er sidetemaer til webui'en selv, endnu ikke tilsluttet nogen vælger. Slet dem ikke.
* Opdatér den README og det `docs/`-dokument, der beskriver det, du har ændret.
