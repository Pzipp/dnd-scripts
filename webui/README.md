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

## Arbejdsgang

1. Vælg karakter og side.
2. Rediger YAML.
3. Tryk **Gem**.
4. Tryk **Generer**.
5. Den eksisterende generator skriver HTML direkte til karakterens `udskrifter/`-mappe.

WebUI tillader ikke generering med ugemte ændringer, så output altid bygger på den YAML, der faktisk er gemt i projektet.
