# D&D WebUI

Webui'en er hovedvejen til nye karakterer. `/` er en menu med karakterbyggeren, det simple VTT og et link til 5etools:

- **Karakterbygger** (`/builder`) - en trin-for-trin guide der bygger en karakter op ved at slå art, klasse, baggrund, feats og spells op i 5etools' egen regeldata (se "Kilder" i indstillingerne for hvilke kildebøger der er tilladt pr. karakter). Fanerne er **Karakter**, **Udstyr**, **Kort** og **Ark**. Udstyr-fanen har startpakkerne (inkl. valg som "ét Simple-våben"), rustning/Shield og en søgbar **udstyrsvælger** (`builder/items.py`, `GET /api/builder/items`) med filtre, stats og antal; valgene gemmes i `equipment.items`/`picks` og flyder til `weapons` og `inventory` i `character.yaml` (se [docs/choices-yaml.md](../docs/choices-yaml.md)). Valgene gemmes i `karakterer/<karakter>/choices.yaml`, de udregnede stats i `character.yaml`, arkets layout i `sheets.yaml` og kortbunken i `kort.yaml`. Se `builder/` for kode og data-lag og [docs/choices-yaml.md](../docs/choices-yaml.md), [docs/character-yaml.md](../docs/character-yaml.md), [docs/sheets-yaml.md](../docs/sheets-yaml.md) for formaterne.

- **Simpelt VTT** (`/simpelvtt`) - kampagner og rooms med kort/billeder, en DM-skærm med tilstandene EDIT (al redigering af biblioteket) og PLAY (kun visning) og en spillerskærm (`/simpelvtt/vis`), der følger DM'ens valg, zoom/pan/rotation og grid via polling. Billeder og visninger ligger i `vol/simpelvtt/` (gitignoreret; i Docker følger det med repo-mounten). Upload op til 100 MB (`MAX_CONTENT_LENGTH` i `app.py`); miniaturer kræver Pillow (`webui/requirements.txt`, byg imaget forfra). **Ingen login.** **General Maps**: en sammenfoldet sektion i alle kampagner med to kilder: leverede kort i `webui/simpelvtt/general_maps/` (følger git/imaget, låst i UI'et) og egne i `vol/simpelvtt/general-maps/`. Pr. kort kan der slås **Nat** til (mørkt blåt overlay), og gridets cellestørrelse følger skærmen. Se [docs/simpelvtt.md](../docs/simpelvtt.md). Kode: `simpelvtt/`.

- **Kortbygger** (`/mapcreator`) - editor til slagkort med lag, terræn, genstande og mure; kortene gemmes i `$USERDATA/mapcreator/` (standard `/userdata`). Klienten er TypeScript + Svelte og bygges med Node (`mapcreator/build-docker.sh`). Se [docs/mapcreator.md](../docs/mapcreator.md) og [mapcreator/README.md](../mapcreator/README.md). Kode: klienten i `mapcreator/` og Flask-blueprintet i `webui/mapcreator/`.

En karakter kan være lavet med byggeren (`valak`, `terrin`, `chukio` og `kvist` har både nye og gamle filer) eller direkte i filsystemet. Den ældre kommandolinje (`dnd.py`) er stadig i brug til de karakterer, der ikke er konverteret.

**Kun ark.** En karakter med `character.yaml` men uden `choices.yaml` (skrevet i hånden eller af en LLM, se [docs/character-yaml.md](../docs/character-yaml.md) og [docs/llm-karakter-prompt.md](../docs/llm-karakter-prompt.md)) står i en separat liste, "Kun ark", på `/builder`. Den åbner på Ark-fanen (`/builder/<navn>/print`); Kort-fanen virker også. Karakter-, Udstyr- og Indstillinger-siderne kræver `choices.yaml`: de sender videre til Ark-fanen, og de API'er, der gemmer byggerens valg, svarer 409, så `character.yaml` aldrig overskrives. Har karakteren ingen `sheets.yaml` (det gælder også byggerens karakterer, til de redigerer layoutet), laver `builder/default_layout.py` et neutralt standardlayout ud fra `character.yaml` (spells og cantrips pr. level, angreb af våben, evner), uden at skrive filen; den oprettes først, når man gemmer layoutet eller flytter en boks. `GET /api/builder/sheets_yaml?name=<navn>&default=1` giver altid standardlayoutet (nulstil til standard). Samme ark laves fra kommandolinjen med `python3 dnd.py ark <navn>`.

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

Fonte (Google Fonts) og CodeMirror til layout-editoren (fra `esm.sh`) hentes fra internettet. Uden internet virker siden, men layout-editoren og skrifttyperne gør ikke (PDF: se [../scripts/pdf/README.md](../scripts/pdf/README.md)).

## 5etools-data

Byggeren kræver 5etools' regeldata (JSON) mountet read-only på `/e5tools`, med `data/` som `/e5tools/data` (stien kan ændres med miljøvariablen `E5TOOLS_DATA`, se `builder/e5tools.py`). Uden den virker `/builder` ikke. Homebrew lægges i `homebrew/` ved siden af `data/` og registreres i `homebrew/index.json` (5etools' egen konvention). Filerne i `vol/homebrew/` er gruppens eget indhold: de er gitignoreret, bortset fra `vol/homebrew/index.json`.

`update-e5tools.sh` kan opdatere 5etools-klonen med `git pull --ff-only` ved opstart, hvis `UPDATE_E5TOOLS=true` er sat i `.env`. Variablen står ikke i `.env.example`. Scriptet fejler aldrig hårdt; en manglende opdatering blokerer ikke siden.

### 5etools i browseren (`/5etools/`)

Webuien serverer selve 5etools-siden fra `/e5tools` på `/5etools/` (fx `http://localhost:8082/5etools/` på dev). Her kan gruppens homebrew ses i 5etools: `vol/homebrew` ligger som `/5etools/homebrew/`, og filerne i `index.json`s `toImport` indlæses via 5etools' egen "Manage Homebrew". Ruten (`e5tools_site` i `app.py`) er skrivebeskyttet, afviser stier der starter med `.` (fx `.git`) og `homebrew/kilder/` (arkiverede kilder). Der er ingen login, så den skal ikke eksponeres udadtil: 5etools' indhold er ophavsretligt beskyttet. Kræver genstart af containeren efter en kodeændring.

## Kør i Docker

Repoet har en `Dockerfile` (Python 3.12, Flask, PyYAML, ruamel.yaml og Playwright med Chromium til PDF) og en `docker-compose.yml`. Imaget er stort (Chromium), så den første build tager et stykke tid. Containeren lytter internt på port 8080 (`PORT` i `Dockerfile`).

`docker-compose.yml` er tilpasset homelab-opsætningen: containeren `dnd-webui-dev`, det eksterne netværk `proxy`, 5etools-klonen mountet på `/e5tools` og `vol/homebrew` oven på `/e5tools/homebrew`. En tjeneste `5etools-updater` kører først og opdaterer 5etools-klonen, hvis `UPDATE_E5TOOLS=true`. Compose-filen publicerer porten som `${DND_BIND_IP:-127.0.0.1}:${DND_PORT:-8081}:8080`. Porte på værten: **dev (`dnd-webui-dev`, denne mappe) kører på 8082, prod (`../dnd-scripts`) på 8081**; internt i containeren er det altid 8080. Hent aldrig porten fra gætværk; den står i `.env` (`DND_PORT`). Fra projektets rod:

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

* `app.py` - menu, `/5etools/` og blueprintet fra `builder/routes.py`.
* `builder/` - se mappen. `notes.md` har noter til data-laget.
