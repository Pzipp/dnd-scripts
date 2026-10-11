# D&D WebUI

Webui'en er hovedvejen til nye karakterer. `/` er en menu til to features, der deler serveren:

- **Karakterbygger** (`/builder`) - en trin-for-trin guide der bygger en karakter op ved at slå art, klasse, baggrund, feats og spells op i 5etools' egen regeldata (se "Kilder" i indstillingerne for hvilke kildebøger der er tilladt pr. karakter). Fanerne er **Karakter**, **Udstyr**, **Kort** og **Ark**. Valgene gemmes i `karakterer/<karakter>/choices.yaml`, de udregnede stats i `character.yaml`, arkets layout i `sheets.yaml` og kortbunken i `kort.yaml`. Se `builder/` for kode og data-lag og [docs/choices-yaml.md](../docs/choices-yaml.md), [docs/character-yaml.md](../docs/character-yaml.md), [docs/sheets-yaml.md](../docs/sheets-yaml.md) for formaterne.
- **YAML-editor** (`/editor`) - redigér de ældre `karakter.yaml`/`kort.yaml` direkte i browseren og generér derefter med `dnd.py`. Se [README-yaml-editor.md](README-yaml-editor.md). Dækker ikke `sheets.yaml`: layoutet redigeres kun i byggerens Ark-fane.

De to er ikke to versioner af samme ting. En karakter kan være lavet med den ene, den anden, begge (`valak`, `terrin`, `chukio` og `kvist`) eller ingen af dem (direkte i filsystemet). Den ældre kommandolinje (`dnd.py`) er stadig i brug til de karakterer, der ikke er konverteret.

## Kør

Fra projektets rod:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt -r webui/requirements.txt
playwright install chromium     # kun til PDF
python webui/app.py
```

`requirements.txt` i roden har PyYAML og Playwright, `webui/requirements.txt` har Flask, PyYAML og ruamel.yaml (til træk og slip, så kommentarer i `sheets.yaml` bevares). Åbn derefter:

```
http://localhost:8080
```

Alternativ port:

```bash
PORT=8081 python webui/app.py
```

**Uden Docker binder `app.py` til `0.0.0.0`**, så alle på netværket kan nå porten. **Webui'en har ingen login**, så alle der kan nå den, kan ændre karaktererne. Kør kun på et netværk, du stoler på.

Fonte (Google Fonts) og CodeMirror til YAML-editorerne (fra `esm.sh`) hentes fra internettet. Uden internet virker siden, men editoren og skrifttyperne gør ikke (PDF: se [../scripts/pdf/README.md](../scripts/pdf/README.md)).

## 5etools-data

Byggeren kræver 5etools' regeldata (JSON) mountet read-only på `/e5tools`, med `data/` som `/e5tools/data` (stien kan ændres med miljøvariablen `E5TOOLS_DATA`, se `builder/e5tools.py`). Uden den virker `/builder` ikke, men YAML-editoren er uafhængig af den. Homebrew lægges i `homebrew/` ved siden af `data/` og registreres i `homebrew/index.json` (5etools' egen konvention). Filerne i `vol/homebrew/` er gruppens eget indhold: de er gitignoreret, bortset fra `vol/homebrew/index.json`.

`update-e5tools.sh` kan opdatere 5etools-klonen med `git pull --ff-only` ved opstart, hvis `UPDATE_E5TOOLS=true` er sat i `.env`. Variablen står ikke i `.env.example`. Scriptet fejler aldrig hårdt; en manglende opdatering blokerer ikke siden.

## Kør i Docker

Repoet har en `Dockerfile` (Python 3.12, Flask, PyYAML, ruamel.yaml og Playwright med Chromium til PDF) og en `docker-compose.yml`. Imaget er stort (Chromium), så den første build tager et stykke tid. Containeren lytter internt på port 8080 (`PORT` i `Dockerfile`).

`docker-compose.yml` er tilpasset homelab-opsætningen: containeren `dnd-webui-dev`, det eksterne netværk `proxy`, 5etools-klonen mountet på `/e5tools` og `vol/homebrew` oven på `/e5tools/homebrew`. En tjeneste `5etools-updater` kører først og opdaterer 5etools-klonen, hvis `UPDATE_E5TOOLS=true`. Compose-filen publicerer porten som `${DND_BIND_IP:-127.0.0.1}:${DND_PORT:-8081}:8080`. Standardporten i compose er altså 8081; `.env.example` foreslår 8080. Fra projektets rod:

```bash
cp .env.example .env     # ret efter behov (se nedenfor)
docker compose up -d --build
```

Åbn derefter `http://localhost:<DND_PORT>`.

**Vil du have andre på netværket til at åbne den**, så sæt `DND_BIND_IP=0.0.0.0` i `.env`. Standarden er `127.0.0.1`. Uden login: brug kun `0.0.0.0` på et netværk, du stoler på.

`.env` indeholder kun lokal konfiguration og er gitignoreret; `.dockerignore` holder den ude af imaget. Standardværdierne virker uden `.env`.

| Variabel | Betydning |
|---|---|
| `DND_BIND_IP`, `DND_PORT` | Adresse og port på værten |
| `DND_UID`, `DND_GID` | Ejer af genererede filer (standard 1000). Find dine med `id -u` og `id -g` |
| `LLM_API_BASE`, `LLM_API_KEY`, `LLM_MODEL` | OpenAI-kompatibelt endpoint til korte danske beskrivelser og effekter (`builder/descriptions.py`). Uden dem fejler kun knappen "Generér beskrivelser"; i stedet kan prompten kopieres ind i en egen chat |
| `UPDATE_E5TOOLS` | `true` opdaterer 5etools-klonen ved start (kun i compose; ikke i `.env.example`) |
| `E5TOOLS_DATA`, `DANSK_DATA` | Sti til 5etools' `data/` og til de danske oversættelser (standard `/e5tools/data` og repoets `data/`) |

Compose-filen bind-mounter hele repoet, så `karakterer/` og `udskrifter/` ligger på din maskine.

Uden compose kan du køre containeren direkte (husk 5etools-data på `/e5tools`):

```bash
docker build -t dnd-webui .
docker run --rm -p 8080:8080 --user "$(id -u):$(id -g)" -v "$PWD":/app -v /sti/til/5etools:/e5tools:ro dnd-webui
```

## Stop

Serveren kører, til du stopper den. Den stopper ikke af sig selv, når du lukker browserfanen.

- **Kører den i en terminal:** tryk **Ctrl+C** i det terminalvindue, hvor du startede den.
- **Kører den i baggrunden** (eller du kan ikke finde terminalen):

  ```bash
  pkill -f webui/app.py
  ```

  Du kan også finde processen med `ps aux | grep app.py` og stoppe den med `kill <PID>`.
- **Kører den i en container:** `docker stop <navn>`. Navnet står i `docker ps`.

Tjek, at den er stoppet, ved at åbne `http://localhost:8080` (eller din egen port). Får du en fejl i browseren, kører den ikke mere.

## Ark-fanen (karakterark)

Fanen **Ark** (URL `/builder/<navn>/print`) bygger det printbare karakterark af `character.yaml` og `sheets.yaml` med `builder/render.py` og viser det i forhåndsvisningen.

* **Redigér layout** åbner en YAML-editor (CodeMirror) mod `sheets.yaml` med fejlmarkering og live-forhåndsvisning (Ctrl+S gemmer).
* **Træk og slip** (se nedenfor) flytter boksene direkte i arket.
* **Lav PDF** gemmer `karakterark-<tema>.pdf` i karakterens `udskrifter/` og viser linket **Hent PDF**.
* Mangler danske beskrivelser, står der en bjælke øverst med en knap til at generere dem (se `LLM_*` ovenfor).
* Arket rendes af `render.py`, ikke af `scripts/karakterark/karakterark.py`; de to deler kun CSS.

## Kort-fanen (kortbygger)

Fanen **Kort** laver spil-kort (63 × 88 mm, 9 pr. A4) ud fra 5etools-data. Den bruger samme kortformat og generator som kommandolinjen (`scripts/kort/spellkort.py`, format: [docs/kort-yaml.md](../docs/kort-yaml.md)), så kortene kan printes i begge stile.

* Listen viser alt karakteren har: spells, feats, klasseevner og art-træk. Et flueben lægger kortet i bunken, og kortene vises straks i arket til højre.
* Spells udledes af 5etools' strukturerede felter: grad, skole, tid, afstand, varighed, komponenter, koncentration, ritual, angreb/redningskast, skade og skala (cantrip-skala eller spell slot-skala). Teksten er dansk, hvis den danske 5etools-oversættelse, `descriptions`/`bibliotek/_cards.yaml` har den; ellers den engelske regeltekst fra 5etools, forkortet til kortets plads.
* Findes et håndlavet kort med samme navn i `bibliotek/`, bruges det uændret (mærket "bibliotek").
* Valget gemmes i karakterens `kort.yaml` (`titel`, `kort`, `egne`), samme format som i det ældre system. `egne` bevares, så en håndrettelse ikke overskrives; **Byg om** bygger ét kort forfra fra 5etools. `python3 dnd.py kort <navn>` virker dermed også på byggerens karakterer.
* **Tekst uden for rammen:** efter hver gengivelse og når skrifttyperne er indlæst (`document.fonts.ready`) måler forhåndsvisningen alle kort (`scripts/kort/maal_overflow.js`, serveret som `/builder/kort-maal.js`). Overfyldte kort får rød ramme og en rød bjælke med navnet, og over forhåndsvisningen står "N kort har tekst uden for rammen: ...". Samme måling kører i PDF-generering; svaret fra `/api/builder/cards/pdf` har `warnings` (liste af tekster), som vises ved siden af linket **Hent PDF**. PDF'en laves stadig.
* **Lav PDF** gemmer `kort-<tema>.pdf` i karakterens `udskrifter/` (`kort-farve.pdf`, `kort-sorthvid.pdf` eller et temas navn, fx `kort-vinroed.pdf`).

Kode: `builder/kort.py` (udledning, valg, bunke) og `/api/builder/cards*` i `builder/routes.py`.

## Udseende, baggrund og PDF (Ark- og Kort-fanen)

* **Udseende** (øverst over forhåndsvisningen) vælger tema. På Kort-fanen er listen kortenes egne temaer (`farve`, `sorthvid` og de fem `stil-*.css`-overlays, se [scripts/kort/README.md](../scripts/kort/README.md)); på Ark-fanen arkets temaer (`farve`, `sorthvid` og ni `sheets-*.css`-temaer, se `STYLE_FILES` i `builder/render.py` og [scripts/karakterark/README.md](../scripts/karakterark/README.md)). Valget huskes pr. fane-type i browseren, og samme tema bruges i PDF'en.
* **Baggrund** vælger et billede fra `webui/static/baggrunde/` (png/jpg/webp; se README dér). Mappen listes dynamisk (`/api/builder/backgrounds`), så nye filer dukker op efter genindlæsning uden kodeændring. "Ingen" er standard. Billedet hentes fra `/builder/background/<fil>`, som kun udleverer filer, der står i listen (ingen sti-traversal). Til PDF læser Chromium filen direkte. Kode: `builder/baggrund.py`.
* **Lav PDF** (Ark og Kort) viser et link, **Hent PDF**, i stedet for selv at åbne en download.
* `webui/static/theme-*.css` (fire filer) er tænkt som mulighed for at skifte tema på selve siden (ikke ark og kort). De er ikke tilsluttet nogen vælger endnu.

## Træk og slip af bokse (Ark-fanen)

Knappen **Træk og slip** gør arket til en layout-editor: træk en boks til en anden placering (også på en anden side), træk en ny boks ind fra listen, eller fjern en med &times;. Det ændrer karakterens `sheets.yaml` og bevarer kommentarerne (kræver `ruamel.yaml`, som står i `webui/requirements.txt`: byg imaget forfra efter en opdatering). Se [docs/sheets-yaml.md](../docs/sheets-yaml.md).

## Danske oversættelser og `_copy`

5etools-data er engelsk. `builder/e5tools.py` lægger danske felter ovenpå (`_overlay_dansk`), entry for entry, matchet på `name` + `source` (klasse-features og subclasses også på klasse og level). Felter uden dansk modstykke forbliver engelske. De danske filer er `data/<fil>-da.json`, `data/spells/<fil>-da.json` og `data/class/class-<navn>-da.json`; de er ikke i git (bogtekster er ophavsretligt materiale), bortset fra `data/feats-da.json`. Sådan laves de: [data/books/oversaettelse/CLAUDE.md](../data/books/oversaettelse/CLAUDE.md).

Mange racer og baggrunde er `_copy` af en anden post, og racer har `_versions`. `builder/copies.py` folder `_copy` (med `_mod`) ud efter oversættelsen, så en kopi arver dansk tekst; `builder/versions.py` folder `_versions` ud og deler `_mod`-operationerne med `copies.py`. Henvisninger i data er engelske (`_mod replace`, kolonnenavne), men overskrifter i oversat tekst hedder "Dansk titel (English Name)". `versions.name_matches` og `e5tools.label_index` finder derfor mål og kolonner med begge former.

## Kode

* `app.py` - menu, YAML-editor (`/editor`, `/api/yaml`, `/api/save`, `/api/check`, `/api/preview`, `/api/generate`) og blueprintet fra `builder/routes.py`.
* `builder/` - se mappen. `notes.md` har noter til data-laget.
