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
