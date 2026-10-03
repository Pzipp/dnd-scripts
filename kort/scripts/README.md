# Spell- og evnekort (D&D 2024, dansk, sort/hvid)

Generelle kort til besværgelser i pokerstørrelse (63 × 88 mm), så de passer i almindelige kortlommer. Kortene er **ikke karakterspecifikke**: de viser formlen (fx `d20 + spellangreb`, `2d8 + magi-mod`), ikke spillerens tal. Derfor ændrer de sig ikke ved level-stigning og kan deles mellem karakterer.

## Print
- 9 kort pr. A4. Arkene kommer i rækkefølgen: Ark 1 forsider, Ark 1 bagsider, Ark 2 forsider …
- Print i sort/hvid, A4, margin 0, **ikke** dobbeltsidet.
- Klip langs de stiplede linjer. Læg for- og bagside ryg mod ryg i samme kortlomme.

## Forside og bagside
- **Forside:** navn (engelsk) + dansk navn, grad-segl (∞ = cantrip, tal = grad, § = regelkort), skole, tid/afstand/varighed/komponenter, mærker for koncentration (◐) og ritual (Ⓡ), kort effekt, terningboks og skala-tabel (cantrips efter level, besværgelser efter spell slot).
- **Bagside:** detaljer, "Godt at vide", materialer.
- **Regelkort** (`type: "regel"`): "Cantrips og spell slots" og "Koncentration og ritualer". Kan lægges i enhver bunke.

## Filer
| Fil | Indhold |
|---|---|
| `spellkort.py` | Generator |
| `spellkort.css` | Design |
| `besvaergelser.json` | Besværgelser og regelkort om magi |
| `evner.json` | Klasseevner, Weapon Mastery, feats, art-træk og regelkort (To våben, Heroic Inspiration) |
| `udstyr.json` | Nyttigt udstyr: metalkugler, olie, Healer's Kit, tyveværktøj, lys, entrehage |
| `lav-pdf.py` | Laver print-klar A4-PDF fra HTML (kræver Playwright) |
| `valak-kort.json`, `kvist-kort.json`, `terrin-kort.json`, `chukio-kort.json`, `mighty-bird-kort.json` | Bunker pr. karakter |

## Brug
```
python3 spellkort.py valak-kort.json        # -> valak-kort.html
```
En bunke er `{"titel": "Valak spellkort", "kort": ["eldritch-blast", "hex", ...]}`.

## Korttyper
`type` styrer seglet: ingen = besværgelse (∞ eller grad), `regel` §, `klasse` ✦ evne, `mastery` ⚔, `feat` ★, `art` ◆, `udstyr` ⚒.
Evne- og udstyrskort bruger `felter` (4 × [etiket, værdi]) i stedet for tid/afstand/varighed/komponenter, og `kicker` til linjen under navnet. `kilde: "Hjemmelavet"` markerer homebrew (fx Felis).

Generatoren tjekker ikke selv, om teksten passer. Hold forsideteksten kort; dele, der ikke kan skrumpe (terningboks, skala), har forrang, og en for lang effekttekst bliver skåret af.

## Nyt kort i besvaergelser.json
```
"navn-id": {
  "navn", "dansk", "grad" (0 = cantrip), "skole", "skole_da",
  "tid", "afstand", "varighed", "komp", "konc": true, "ritual": true,
  "effekt": "kort tekst til forsiden",
  "slag": [[etiket, værdi, undertekst]],          // terningboksen, højst 3 rækker
  "skala": [["Level 1", "1d10"], ["5", "2d10"]],  // valgfri
  "skala_titel": "Varighed",                       // valgfri
  "bag": [{"titel", "tekst"} eller {"titel", "punkter": [...]}]
}
```
Regler: 2024-tekst (PHB 2024 kap. 7), afstande i fod, ingen karaktertal. Hold forsidens effekt på 2–4 linjer; detaljer går på bagsiden. Tjek, at teksten passer, før print.
