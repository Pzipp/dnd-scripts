# Spell- og evnekort-generator (D&D 2024, dansk)

Generelle kort i pokerstørrelse (63 × 88 mm), så de passer i almindelige kortlommer. Kortene er **ikke karakterspecifikke**: de viser formlen (fx `d20 + spellangreb`, `2d8 + magi-mod`), ikke spillerens tal. Derfor ændrer de sig ikke ved level-stigning og kan deles mellem karakterer. Kortene kan laves i **farve** og **sort/hvid**.

Datafilernes felter: [`docs/kort-yaml.md`](../../docs/kort-yaml.md). Kortene ligger i [`bibliotek/`](../../bibliotek/). Skabelon til en bunke: [`karakterer/_skabelon/kort.yaml`](../../karakterer/_skabelon/kort.yaml).

## Brug

Fra roden af repoet (anbefalet):

```bash
python3 dnd.py kort valak                  # farve + sort/hvid, HTML
python3 dnd.py kort valak --stil sorthvid  # kun sort/hvid
python3 dnd.py kort valak --pdf            # også PDF
```

Direkte med scriptet:

```bash
python3 scripts/kort/spellkort.py valak [--stil farve|sorthvid|begge] [--ud MAPPE]
```

`valak` kan være et karakternavn, en mappe eller en sti til en `kort.yaml`. Output: `kort-farve.html` og `kort-sorthvid.html` i `karakterer/valak/udskrifter/` (eller `--ud`).

## Print

* 9 kort pr. A4. Arkene kommer i rækkefølgen: ark 1 forsider, ark 1 bagsider, ark 2 forsider …
* A4, margin 0, 100 %, **ikke** dobbeltsidet.
* Klip langs de stiplede linjer. Læg for- og bagside ryg mod ryg i samme kortlomme.

## Forside og bagside

* **Forside:** navn (engelsk) + dansk navn, segl (∞ = cantrip, tal = grad, § = regelkort), skole, tid/afstand/varighed/komponenter, mærker for koncentration (◐) og ritual (Ⓡ), kort effekt, terningboks og skala-tabel.
* **Bagside:** detaljer, "Godt at vide", materialer.
* **Regelkort** (`type: regel`) kan lægges i enhver bunke.

## Stile

### Grundstile

| Fil | Indhold |
|---|---|
| `spellkort.css` | Grundlayout og sort/hvid (kun sort blæk) |
| `spellkort-farve.css` | Farvegrundlag: lyst pergament og afdæmpet accentfarve pr. skole eller korttype |

Generatoren sætter `data-kat="<skole eller type>"` på hvert kort i farvestilen. Standardens skolefarver er i `spellkort-farve.css`.

### Fem ekstra, afdæmpede temaer

Disse CSS-filer er **alternative visuelle lag** oven på grundstilen. De ændrer ikke kortenes mål eller layout, og detaljerne holdes diskrete, så teksten stadig er let at læse.

| Fil | Type | Udtryk |
|---|---|---|
| [`stil-sorthvid-gravure.css`](stil-sorthvid-gravure.css) | Sort/hvid | Fine gravurelinjer, dobbelt understregning og skarp sort/hvid |
| [`stil-sorthvid-herbarium.css`](stil-sorthvid-herbarium.css) | Sort/hvid | Bløde, let uregelmæssige rammer og botanisk håndtegnet præg |
| [`stil-farve-skovland.css`](stil-farve-skovland.css) | Farve | Mosgrønne accenter og varmt, lyst pergament |
| [`stil-farve-stormblaa.css`](stil-farve-stormblaa.css) | Farve | Skiferblå detaljer på køligt, lyst papir |
| [`stil-farve-vinroed.css`](stil-farve-vinroed.css) | Farve | Støvet vinrød og elfenbensfarvet papir |

**Indlæsningsrækkefølge:** brug `spellkort.css` først. Til farvekort lægges `spellkort-farve.css` ovenpå, og derefter ét af de tre farvetemaer. Til sort/hvid lægges ét af de to sort/hvid-temaer efter `spellkort.css`. Temaerne er separate CSS-overlays; den nuværende generator vælger stadig kun mellem grundstilen sort/hvid og standardfarve automatisk.

## Filer

| Fil | Indhold |
|---|---|
| `spellkort.py` | Generatoren |
| `spellkort.css`, `spellkort-farve.css` | Grundlayout og standardstile |
| `stil-*.css` | Fem valgfrie tema-overlays |

Kortdata findes ikke her, men i `bibliotek/*.yaml`, og alle filer dér indlæses. Et id skal være unikt på tværs af filerne.

## Tjek før print

Generatoren tjekker ikke selv, om teksten passer. Dele, der ikke kan skrumpe (terningboks, skala), har forrang, og en for lang effekttekst bliver skåret af. Hold forsideteksten kort, og kig på kortet, før du printer.
