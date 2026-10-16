# PDF-generator

`lav_pdf.py` laver en print-klar PDF (A4, margin 0) fra de HTML-filer, som karakterark- og kort-generatorerne laver. Den fungerer for både farve og sort/hvid.

## Brug

Normalt via `dnd.py`, som laver HTML og PDF i ét hug:

```bash
python3 dnd.py alt valak --pdf
```

Direkte på en HTML-fil:

```bash
python3 scripts/pdf/lav_pdf.py karakterer/valak/udskrifter/kort-farve.html [flere.html ...]
```

PDF'en lægges ved siden af HTML-filen. Print den i **faktisk størrelse (100 %)**, ikke "tilpas til side".

## Advarsel om tekst uden for kortets ramme

På kort-HTML måler `lav_pdf` på den færdige side (print-medie, efter skrifttyperne er indlæst) med `scripts/kort/maal_overflow.js`, om tekst løber uden for et korts ramme. Er det tilfældet, skrives en advarsel på dansk til terminalen (`ADVARSEL: 2 kort har tekst uden for rammen ...: Navn (forside, 108 % for meget)`). PDF'en laves stadig. `lav_pdf()` returnerer listen af overfyldte kort (`[{navn, side, px, procent}]`), og `tekst_uden_for()` laver de danske tekster; webui'en bruger begge til advarslen ved PDF-linket. Karakterark har ingen `.card` og giver aldrig advarsel.

## Tema og baggrund

PDF'en er en udskrift af den HTML, den får, så tema og baggrund skal ligge i HTML'en. Det gør de: webui'en bygger HTML'en med det valgte tema (kort: `kort-<tema>.html`, ark: `karakterark-<stil>.html`) og en `<style>`-regel med baggrunden, før `lav_pdf` kaldes. Baggrunden refererer billedet med en `file://`-adresse, som Chromium læser direkte, og `print_background=True` sørger for, at farver og billeder kommer med.

## Installation

```bash
pip install playwright
playwright install chromium
```

## Skrifttyper og internet

HTML-filerne henter IM Fell English og Crimson Pro fra Google Fonts. Uden internet (fx i en AI-assistents sandkasse) får PDF'en reserveskrifter, og tekst ombrydes anderledes, så kort og ark kan passe dårligt. Scriptet advarer, når det sker.

Løsning: installér skrifterne lokalt og peg på dem med `--skrifttyper`:

```bash
mkdir -p ~/skrifter && cd ~/skrifter
npm install @fontsource/im-fell-english @fontsource/im-fell-english-sc @fontsource/crimson-pro

python3 dnd.py alt valak --pdf --skrifttyper ~/skrifter
```

Mappen skal indeholde `node_modules/@fontsource/<pakke>/files/*.woff2`.

## Filer

| Fil | Indhold |
|---|---|
| `lav_pdf.py` | `lav_pdf(par, skrifttyper=None)` og kommandolinjen |
