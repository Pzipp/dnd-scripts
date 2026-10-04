# D&D WebUI

Et lille valgfrit overlay til projektets eksisterende D&D-scripts.

## Funktioner

- Vælg karakter.
- Vælg **Karakterark** eller **Kort**.
- Rediger den rigtige YAML-fil direkte i WebUI.
- **Gem** skriver ændringerne tilbage til:
  - `karakterer/<karakter>/karakter.yaml`
  - `karakterer/<karakter>/kort.yaml`
- **Generer** bruger derefter det eksisterende `dnd.py`/generator-script.
- Output gemmes automatisk i karakterens eksisterende:
  - `karakterer/<karakter>/udskrifter/`
- Farvevælgeren ændrer accentfarven i det genererede HTML.
- WebUI ændrer ikke de eksisterende generator-scripts.

## Overlay – ikke en separat parallel version

WebUI er kun et ekstra interface til de eksisterende filer og scripts. Det laver ikke en kopi af YAML-data eller output i `webui/`.

Det kører kun, når du starter det. Når WebUI ikke er startet, fungerer `dnd.py` og alle de eksisterende scripts præcis som før.

WebUI kan derfor bruges som et overlay, når det er praktisk, og ellers ignoreres.

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

Repoet har en `Dockerfile` (Python 3.12, kun Flask og PyYAML, uden PDF) og en `docker-compose.yml`. Fra projektets rod:

```bash
cp .env.example .env     # ret efter behov (se nedenfor)
docker compose up -d --build
```

Åbn derefter `http://localhost:<DND_PORT>` (standard `8080`).

**Vil du have andre på netværket til at åbne den**, så sæt `DND_BIND_IP=0.0.0.0` i `.env`, og åbn `http://<din-maskines-IP>:<DND_PORT>`. Standarden er `127.0.0.1`, så ingen på netværket kan nå den. **Webui'en har ingen login**, så alle der kan nå porten, kan ændre karakterne. Brug kun `0.0.0.0` på et netværk, du stoler på.

`.env` indeholder kun din lokale konfiguration (port, bind-adresse, UID/GID) og er gitignoreret. Standardværdierne virker uden `.env`.

Compose-filen bind-mounter hele repoet, så `karakterer/` og `udskrifter/` ligger på din maskine. `DND_UID`/`DND_GID` (standard 1000) sørger for, at genererede filer ejes af dig og ikke af root. Find dine værdier med `id -u` og `id -g`.

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

Det du allerede har trykket **Gem** på, ligger i YAML-filerne og er i behold. Ændringer, du ikke har gemt, går tabt, når siden lukkes.

## Arbejdsgang

1. Vælg karakter og side.
2. Rediger YAML.
3. Tryk **Gem**.
4. Tryk **Generer**.
5. Den eksisterende generator skriver HTML direkte til karakterens `udskrifter/`-mappe.

WebUI tillader ikke generering med ugemte ændringer, så output altid bygger på den YAML, der faktisk er gemt i projektet.
