# AGENTS.md: instruktioner til AI-assistenter

Dette er den fælles instruktionsfil for alle AI-værktøjer i gruppen (Claude, Gemini, ChatGPT/Codex, Copilot m.fl.). `CLAUDE.md`, `GEMINI.md` og `.github/copilot-instructions.md` peger hertil. Ret kun denne fil.

## Hvad projektet er

Gruppens D&D 2024-værktøjer på dansk: generatorer, der laver print-klare **karakterark** og **spell-/evnekort** ud fra YAML-filer. Brugerne er spillere i en dansk gruppe. Sproget i filer og svar er **dansk**, reglerne er **D&D 2024 (Player's Handbook 2024, PHB)**.

## Kommandoer

```bash
python3 dnd.py liste                          # vis karakterer
python3 dnd.py karakterark <navn> [--stil farve|sorthvid|begge] [--pdf]
python3 dnd.py kort <navn>        [--stil farve|sorthvid|begge] [--pdf]
python3 dnd.py alt <navn> --pdf               # begge dele
python3 dnd.py alt --alle --pdf               # alle karakterer
python3 dnd.py tjek                           # byg alt; meld fejl i data. KØR FØR DU GEMMER
```

`pip install -r requirements.txt`. PDF kræver Playwright og Chromium. Uden internet: brug `--skrifttyper` (se `scripts/pdf/README.md`), ellers får PDF'en forkerte skrifttyper og kortene kan ombrydes anderledes.

## Mappekort

| Sti | Hvad |
|---|---|
| `dnd.py` | Indgangspunkt |
| `karakterer/<navn>/karakter.yaml` | Karakterarket. Format: `docs/karakterark-yaml.md` |
| `karakterer/<navn>/kort.yaml` | Kortbunke. Format: `docs/kort-yaml.md` |
| `karakterer/<navn>/udskrifter/` | **Genereret, ikke i git.** Redigér aldrig i hånden |
| `karakterer/_skabelon/` | Kommenteret skabelon til nye karakterer |
| `bibliotek/*.yaml` | Delte kort (id → kort) |
| `scripts/karakterark/`, `scripts/kort/`, `scripts/pdf/` | Generatorer og CSS. Hver mappe har en README |
| `scripts/faelles.py` | Fælles hjælpere (indlæsning, stile, stier) |
| `docs/` | Formater og navnekonvention |

## Sådan laver du en ny karakter (arbejdsgang)

1. Spørg, hvis du mangler det væsentlige: klasse og level, art (species), baggrund, evner, udstyr. Gæt ikke på tal.
2. `cp -r karakterer/_skabelon karakterer/<navn>` (navn med små bogstaver og bindestreg).
3. Udfyld `karakter.yaml` og `kort.yaml`. Udregn ikke modifiers i hånden: skriv `'{+DEX+PB}'`, og generatoren regner det ud.
4. Nye kort: se om de findes i `bibliotek/` først. Ellers læg dem i `bibliotek/` (kan genbruges) eller under `egne:` i `kort.yaml`.
5. `python3 dnd.py tjek`, derefter `python3 dnd.py alt <navn> --pdf`.
6. **Kig på resultatet** (HTML eller PDF-siderne). Tekst, der er for lang, klippes ved kanten af A4-siden eller kortet. Forkort, til den passer.

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

* Data er **YAML** (JSON kan også læses). Én karakter = én mappe.
* Tekst, der starter med `{` eller `[`, eller indeholder `: `, skal i citationstegn. `Ja`/`Nej` uden citationstegn bliver sandt/falsk.
* `[]` i tekst = afkrydsningsfelt. `{+DEX+PB}` = udregnet med fortegn. `{10+DEX}` = udregnet uden fortegn. Udtryk kan bruge `STR DEX CON INT WIS CHA PB`.
* HTML `<b> <i> <em>` er tilladt. Skriv `&` som `&amp;`.
* Fejlbeskeder fra `dnd.py` er på dansk og forklarer, hvad der er galt (fx ukendt kort-id med forslag).

## Må og må ikke

* **Redigér ikke** filer i `udskrifter/` i hånden. Generér dem igen.
* **Slet eller overskriv ikke** en anden spillers karakter uden at spørge. Hver spiller ejer sin mappe i `karakterer/`.
* Commit **ikke** genererede filer: hele `udskrifter/` (HTML og PDF) og `__pycache__` er i `.gitignore`. Der er ingen færdige PDF'er i repoet; de laves med `python3 dnd.py ... --pdf`.
* Foretræk at lave ændringer på en **gren** og lade en pull request gennemgå dem. Skriv ikke direkte til `main`, medmindre ejeren siger det.
* Ret ikke i `scripts/` for at løse et dataproblem i en enkelt karakter. Brug `egne:` eller karakterens egen fil.
* Læg ikke adgangskoder, nøgler eller personlige oplysninger i repoet. Repoet er offentligt.

## Når du ændrer generatorerne

* Layoutkode er skrøbelig: sider er præcis én A4. Efter en ændring skal du bygge alle karakterer og sammenligne med før (`python3 dnd.py tjek`, og kig på mindst ét ark og ét kort i hver stil).
* CSS: `sheets.css` er farve-stilen for karakterark (alle sider, delt med det nye systems `webui/builder/render.py`) og `sheets-bw.css` lægges ovenpå. `spellkort.css` er sort/hvid, og `spellkort-farve.css` lægges ovenpå. Skal begge stile ændres, så ret begge.
* Opdatér den README og det `docs/`-dokument, der beskriver det, du har ændret.
