#!/usr/bin/env python3
"""dnd.py: ét indgangspunkt til gruppens D&D-scripts (karakterark, spellkort/evnekort, PDF).

  python3 dnd.py liste                          vis karakterer
  python3 dnd.py karakterark valak              karakterark, farve + sort/hvid (HTML)
  python3 dnd.py kort valak --stil sorthvid     kort, kun sort/hvid
  python3 dnd.py alt valak --pdf                karakterark + kort, og lav PDF'er
  python3 dnd.py alt --alle --pdf               alle karakterer
  python3 dnd.py tjek                           byg alt i en midlertidig mappe og meld fejl i data

Output lægges i karakterer/<navn>/udskrifter/ som karakterark-farve|sorthvid og kort-farve|sorthvid
(.html, og .pdf med --pdf). Uden --stil laves begge stile.
Se README.md og docs/ for datafilernes format.
"""
import argparse, os, sys, tempfile, traceback
from pathlib import Path

HER = os.path.dirname(os.path.abspath(__file__))
for d in ("scripts", "scripts/karakterark", "scripts/kort", "scripts/pdf"):
    sys.path.insert(0, os.path.join(HER, d))

import faelles          # noqa: E402
import karakterark      # noqa: E402
import spellkort        # noqa: E402

TYPER = {"karakterark": [karakterark], "kort": [spellkort], "alt": [karakterark, spellkort]}


def kilder(a):
    if a.alle:
        navne = faelles.karakter_navne()
        if not navne:
            faelles.fejl("Ingen karakterer i karakterer/.")
        return navne
    if not a.kilde:
        faelles.fejl("Angiv en karakter (fx valak) eller brug --alle. Se: python3 dnd.py liste")
    return a.kilde


def liste():
    for n in faelles.karakter_navne():
        d = os.path.join(faelles.KARAKTERER, n)
        dele = [t for t in ("karakter", "kort") if faelles._i_mappe(d, t)]
        print(f"{n:<14} {', '.join(dele)}")


def tjek():
    """Byg alle karakterark og kort i en midlertidig mappe. Returnerer antal fejl."""
    fejl_antal = 0
    navne = faelles.karakter_navne()
    if os.path.isdir(os.path.join(faelles.KARAKTERER, "_skabelon")):
        navne.append("_skabelon")                 # skabelonen skal altid kunne bygges
    # Byggerens karakterer (choices.yaml + character.yaml + sheets.yaml) har ikke karakter.yaml/kort.yaml;
    # de tjekkes ved at rendere arket i alle stile (kun i hukommelsen).
    bygger = [n for n in navne if os.path.isfile(os.path.join(faelles.KARAKTERER, n, "choices.yaml"))]
    navne = [n for n in navne if n not in bygger]
    if bygger:
        sys.path.insert(0, HER)
        from webui.builder import character_yaml, render, sheets
    for navn in bygger:
        d = Path(faelles.KARAKTERER) / navn
        try:
            karakter, layout = character_yaml.load(d), sheets.load(d)
            for stil in (None, *render.STYLE_FILES):
                render.build(karakter, layout, stil)
            print(f"ok     {navn:<14} builder-karakterark")
        except Exception as e:
            fejl_antal += 1
            print(f"FEJL   {navn:<14} builder-karakterark: {type(e).__name__}: {e}")
            traceback.print_exc(limit=-2)
    with tempfile.TemporaryDirectory() as tmp:
        for navn in navne:
            for modul in (karakterark, spellkort):
                try:
                    modul.lav(navn, "begge", os.path.join(tmp, navn))
                    print(f"ok     {navn:<14} {modul.__name__}")
                except SystemExit as e:           # faelles.fejl() med forklarende tekst
                    fejl_antal += 1
                    print(f"FEJL   {navn:<14} {modul.__name__}: {e.code}")
                except Exception as e:            # fx manglende felt i data
                    fejl_antal += 1
                    print(f"FEJL   {navn:<14} {modul.__name__}: {type(e).__name__}: {e}")
                    traceback.print_exc(limit=-2)
    print("Alt ok." if not fejl_antal else f"{fejl_antal} fejl.")
    return fejl_antal


def main():
    ap = argparse.ArgumentParser(prog="dnd.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="kommando", required=True)
    sub.add_parser("liste", help="vis karakterer")
    sub.add_parser("tjek", help="byg alt og meld fejl i data")
    for navn, hjaelp in (("karakterark", "lav karakterark"), ("kort", "lav spellkort/evnekort"), ("alt", "lav både karakterark og kort")):
        p = sub.add_parser(navn, help=hjaelp)
        p.add_argument("kilde", nargs="*", help="karakternavn (fx valak), mappe eller filsti")
        p.add_argument("--alle", action="store_true", help="alle karakterer i karakterer/")
        p.add_argument("--stil", choices=["farve", "sorthvid", "begge"], default="begge")
        p.add_argument("--pdf", action="store_true", help="lav også print-klar PDF (kræver Playwright)")
        p.add_argument("--skrifttyper", help="mappe med @fontsource-pakker, hvis Google Fonts ikke kan nås")
        p.add_argument("--ud", help="mappe til outputfiler (standard: karakterer/<navn>/udskrifter/)")
    a = ap.parse_args()

    if a.kommando == "liste":
        return liste()
    if a.kommando == "tjek":
        sys.exit(1 if tjek() else 0)

    html = []
    for k in kilder(a):
        for modul in TYPER[a.kommando]:
            html += modul.lav(k, a.stil, a.ud)
    for h in html:
        print(h)
    if a.pdf:
        import lav_pdf
        lav_pdf.lav_pdf([(h, os.path.splitext(h)[0] + ".pdf") for h in html], a.skrifttyper)


if __name__ == "__main__":
    main()
