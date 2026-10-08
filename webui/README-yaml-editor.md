# YAML-editor (det oprindelige WebUI-overlay)

Et lille valgfrit overlay til projektets eksisterende D&D-scripts: rediger
`karakter.yaml`/`kort.yaml` direkte i browseren og generér derefter med de
eksisterende scripts. Findes side om side med karakterbyggeren (`/builder`,
se [README.md](README.md)) - de er to forskellige måder at redigere en
karakters data, ikke to versioner af samme feature. Kør/stop-instrukser står
i [README.md](README.md), fælles for begge.

## Funktioner

- Vælg karakter.
- Vælg **Karakterark** eller **Kort**.
- Rediger den rigtige YAML-fil direkte i WebUI. Editoren har syntaksfarver, linjenumre, foldning, indrykningslinjer, søgning (Ctrl+F) og fortryd. Fejl markeres med rødt på linjen (YAML-syntaks og layout i karakterark, fra `/api/check`). **Ctrl+S** gemmer, og Tab indrykker.
- **Forhåndsvisning**: output-feltet opdateres, mens du skriver (ca. 0,6 sek. efter du stopper). Det viser også ugemte rettelser, og der skrives ingen filer. Er YAML'en ugyldig, vises fejlen øverst i output-feltet, og den sidste gyldige forhåndsvisning bliver stående. Går en boks ud over A4-siden, står der en advarsel i feltet øverst i output-panelet med boksens titel og hvor mange pixels den går ud.
- **Gem** skriver ændringerne tilbage til:
  - `karakterer/<karakter>/karakter.yaml`
  - `karakterer/<karakter>/kort.yaml`
- **Generer** bruger derefter det eksisterende `dnd.py`/generator-script.
- Output gemmes automatisk i karakterens eksisterende:
  - `karakterer/<karakter>/udskrifter/`
- Under vælgerne ligger links til den valgte karakters filer: `karakter.yaml` og `kort.yaml`, og de genererede filer i `udskrifter/`.
- Stil-vælgeren vælger mellem **Farve** og **Sort/hvid**, og det samme tema som `dnd.py --stil` bruger. Outputtet er `karakterark-<stil>.html` eller `kort-<stil>.html`.
- WebUI ændrer ikke de eksisterende generator-scripts.

## Overlay – ikke en separat parallel version

WebUI er kun et ekstra interface til de eksisterende filer og scripts. Det laver ikke en kopi af YAML-data eller output i `webui/`.

Det kører kun, når du starter det. Når WebUI ikke er startet, fungerer `dnd.py` og alle de eksisterende scripts præcis som før.

WebUI kan derfor bruges som et overlay, når det er praktisk, og ellers ignoreres.

## Arbejdsgang

1. Vælg karakter og side.
2. Rediger YAML.
3. Tryk **Gem**.
4. Tryk **Generer**. Med PDF afkrydset tager det typisk 15 sekunder eller mere.
5. Den eksisterende generator skriver HTML direkte til karakterens `udskrifter/`-mappe.

Forhåndsvisningen i step 2 bruger de samme generatorfunktioner som `Generer`, men gemmer intet.

WebUI tillader ikke generering med ugemte ændringer, så output altid bygger på den YAML, der faktisk er gemt i projektet.
