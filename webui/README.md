# D&D WebUI

Et valgfrit web-interface til projektets D&D-scripts. `/` er en simpel menu
til to forskellige features, der deler denne server:

- **Karakterbygger** (`/builder`) - en trin-for-trin guide der bygger en karakter op ved at slå race/klasse/baggrund/feats/spells op i 5etools' egen regeldata (se "Kilder" i indstillingerne for hvilke kildebøger der er tilladt pr. karakter), og gemmer valgene i `karakterer/<karakter>/choices.yaml`. Se [webui/builder/](builder/) for selve kode/data-laget. Layoutet (`sheets.yaml`) redigeres direkte i en indbygget YAML-editor på byggerens Print-fane (samme CodeMirror-opsætning som nedenfor, mod `webui/builder/render.py` i stedet).
- **YAML-editor** (`/editor`, den oprindelige feature) - rediger `karakter.yaml`/`kort.yaml` direkte i browseren og generér derefter med `dnd.py`. Se [README-yaml-editor.md](README-yaml-editor.md) for detaljer. Dækker IKKE `sheets.yaml` (se Karakterbyggeren ovenfor) - to samtidige redigeringsflader mod samme fil var en dårlig idé.

De to er ikke to versioner af samme ting - en karakter kan være lavet med den ene eller den anden, eller slet ingen af dem (direkte i filsystemet). Karakterbyggeren producerer i dag kun `choices.yaml`; den bygger endnu ikke selve det printbare karakterark (se nedenfor).

## Kør

Fra projektets rod:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r webui/requirements.txt
python webui/app.py
```

Åbn derefter:

```
http://localhost:8080
```

Alternativ port:

```bash
PORT=8081 python webui/app.py
```

## Kør i Docker

Repoet har en `Dockerfile` (Python 3.12, Flask, PyYAML og Playwright med Chromium til PDF) og en `docker-compose.yml`. Imaget er stort (Chromium), så den første build tager et stykke tid. Fra projektets rod:

```bash
cp .env.example .env     # ret efter behov (se nedenfor)
docker compose up -d --build
```

Åbn derefter `http://localhost:<DND_PORT>` (standard `8080`).

**Vil du have andre på netværket til at åbne den**, så sæt `DND_BIND_IP=0.0.0.0` i `.env`, og åbn `http://<din-maskines-IP>:<DND_PORT>`. Standarden er `127.0.0.1`, så ingen på netværket kan nå den. **Webui'en har ingen login**, så alle der kan nå porten, kan ændre karakterne. Brug kun `0.0.0.0` på et netværk, du stoler på.

`.env` indeholder kun din lokale konfiguration (port, bind-adresse, UID/GID) og er gitignoreret. Standardværdierne virker uden `.env`.

Compose-filen bind-mounter hele repoet, så `karakterer/` og `udskrifter/` ligger på din maskine. `DND_UID`/`DND_GID` (standard 1000) sørger for, at genererede filer ejes af dig og ikke af root. Find dine værdier med `id -u` og `id -g`.

Karakterbyggeren kræver desuden 5etools' regeldata mountet read-only på `/e5tools` (se `E5TOOLS_DATA` i `webui/builder/e5tools.py`) - uden den virker `/builder` ikke, men YAML-editoren er uafhængig af det.

Uden compose kan du køre containeren direkte:

```bash
docker build -t dnd-webui .
docker run --rm -p 8080:8080 --user "$(id -u):$(id -g)" -v "$PWD":/app dnd-webui
```

På homelab-serveren ligger en tynd stack i `stacks/games/dnd/`, der inkluderer denne compose-fil og læser sin egen `.env`. Den bruges kun til lokal test; den udefra-adgang kommer via nginx.

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

## Planlagt: karakterark-bygger

En kommende feature læser `choices.yaml` (fra karakterbyggeren) og bygger
det printbare karakterark direkte, i stedet for den manuelle
`karakter.yaml`-vej. Ikke bygget endnu - se
[docs/karakterark-bygger-plan.md](../docs/karakterark-bygger-plan.md) for
hvad der er bedt om, og [docs/choices-yaml.md](../docs/choices-yaml.md)
for formatet den skal læse. Dette afsnit skrives om til en rigtig
beskrivelse, når featuren er bygget.

## Kort-fanen (kortbygger)

Fanen **Kort** i builderen laver spil-kort (63 × 88 mm, 9 pr. A4) ud fra 5etools-data. Den bruger samme kortformat og samme generator som det gamle system (`scripts/kort/spellkort.py`, format: [docs/kort-yaml.md](../docs/kort-yaml.md)), så kortene kan printes i begge stile.

* Listen viser alt karakteren har: spells, feats, klasseevner og art-træk. Et flueben lægger kortet i bunken, og kortene vises straks i arket til højre.
* Spells udledes af 5etools' strukturerede felter: grad, skole, tid, afstand, varighed, komponenter, koncentration, ritual, angreb/redningskast, skade og skala (cantrip-skala eller spell slot-skala). Teksten er dansk, hvis `descriptions`/`bibliotek/_cards.yaml` har den; ellers den engelske regeltekst fra 5etools, forkortet til kortets plads.
* Findes et håndlavet kort med samme navn i `bibliotek/`, bruges det uændret (mærket "bibliotek").
* Valget gemmes i karakterens `kort.yaml` (`titel`, `kort`, `egne`), samme format som i det gamle system. `egne` bevares, så en håndrettelse ikke overskrives; **Byg om** bygger ét kort forfra fra 5etools. `python3 dnd.py kort <navn>` virker dermed også på byggerens karakterer.
* **Tekst uden for rammen:** efter hver gengivelse og når skrifttyperne er indlæst (`document.fonts.ready`) måler forhåndsvisningen alle kort (`scripts/kort/maal_overflow.js`, serveret som `/builder/kort-maal.js`). Overfyldte kort får rød ramme og en rød bjælke med navnet, og over forhåndsvisningen står "N kort har tekst uden for rammen: ...". Samme måling kører i PDF-generering; svaret fra `/api/builder/cards/pdf` har `warnings` (liste af tekster), som vises ved siden af linket **Hent PDF**. PDF'en laves stadig.
* **Lav PDF** gemmer `kort-farve.pdf` eller `kort-sorthvid.pdf` i karakterens `udskrifter/`.

Kode: `builder/kort.py` (udledning, valg, bunke) og `/api/builder/cards*` i `builder/routes.py`.

## Udseende, baggrund og PDF (Ark- og Kort-fanen)

* **Udseende** (øverst over forhåndsvisningen) vælger tema. På Kort-fanen er listen kortenes egne temaer (`farve`, `sorthvid` og de fem `stil-*.css`-overlays, se [scripts/kort/README.md](../scripts/kort/README.md)); på de andre faner arkets temaer. Valget huskes pr. fane-type i browseren, og samme tema bruges i PDF'en.
* **Baggrund** vælger et billede fra `webui/static/baggrunde/` (png/jpg/webp; se README dér). Mappen listes dynamisk (`/api/builder/backgrounds`), så nye filer dukker op efter genindlæsning uden kodeændring. "Ingen" er standard. Billedet hentes fra `/builder/background/<fil>`, som kun udleverer filer, der står i listen (ingen sti-traversal). Til PDF læser Chromium filen direkte. Kode: `builder/baggrund.py`.
* **Lav PDF** (Ark og Kort) viser et link, **Hent PDF**, i stedet for selv at åbne en download.

## Træk og slip af bokse (Ark-fanen)

Knappen **Træk og slip** gør arket til en layout-editor: træk en boks til en anden placering (også på en anden side), træk en ny boks ind fra listen, eller fjern en med &times;. Det ændrer karakterens `sheets.yaml` og bevarer kommentarerne (kræver `ruamel.yaml`, som står i `requirements.txt`: byg imaget forfra efter en opdatering). Se [docs/sheets-yaml.md](../docs/sheets-yaml.md).
