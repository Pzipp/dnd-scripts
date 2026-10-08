# D&D WebUI

Et valgfrit web-interface til projektets D&D-scripts. To forskellige features deler denne server:

- **Karakterbygger** (`/builder`) - en trin-for-trin guide der bygger en karakter op ved at slå race/klasse/baggrund/feats/spells op i 5etools' egen regeldata (se "Kilder" i indstillingerne for hvilke kildebøger der er tilladt pr. karakter), og gemmer valgene i `karakterer/<karakter>/choices.yaml`. Se [webui/builder/](builder/) for selve kode/data-laget.
- **YAML-editor** (den oprindelige feature) - rediger `karakter.yaml`/`kort.yaml` direkte i browseren og generér derefter med `dnd.py`. Se [README-yaml-editor.md](README-yaml-editor.md) for detaljer.

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
`karakter.yaml`-vej. Ikke bygget endnu - beskrives her, når den er.
