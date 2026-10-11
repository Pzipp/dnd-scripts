#!/usr/bin/env python3
"""dnd.py: ét indgangspunkt til gruppens D&D-scripts (karakterark, spellkort/evnekort, PDF).

  python3 dnd.py liste                          vis karakterer
  python3 dnd.py karakterark valak              karakterark, farve + sort/hvid (HTML)
  python3 dnd.py kort valak --stil sorthvid     kort, kun sort/hvid
  python3 dnd.py alt valak --pdf                karakterark + kort, og lav PDF'er
  python3 dnd.py alt --alle --pdf               alle karakterer
  python3 dnd.py tjek                           byg alt i en midlertidig mappe og meld fejl i data
  python3 dnd.py tjek-ark <navn>                kontrollér character.yaml + sheets.yaml (linje og kolonne)
  python3 dnd.py ark <navn> [--stil alle] --pdf karakterark direkte fra character.yaml + sheets.yaml
  python3 dnd.py llm-opslag ...                 opslag i 5etools til en LLM (scripts/data/llm_opslag.py)

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


def _har(navn, filnavn):
    return os.path.isfile(os.path.join(faelles.KARAKTERER, navn, filnavn))


def _kun_ark(navn):
    """True for en karakter med character.yaml men uden choices.yaml: filen er skrevet i hånden eller af en LLM."""
    return _har(navn, "character.yaml") and not _har(navn, "choices.yaml")


def liste():
    for n in faelles.karakter_navne():
        d = os.path.join(faelles.KARAKTERER, n)
        dele = [t for t in ("karakter", "kort") if faelles._i_mappe(d, t)]
        dele += [f[:-5] for f in ("character.yaml", "choices.yaml", "sheets.yaml") if _har(n, f)]
        if _kun_ark(n):
            dele.append("(kun ark: dnd.py ark)")
        print(f"{n:<14} {', '.join(dele)}")


def _ark_import():
    sys.path.insert(0, HER)
    from webui.builder import character_check, character_yaml, render, sheets
    return character_check, character_yaml, render, sheets


def _lookup(character_check):
    lookup = character_check.Lookup()
    if not lookup.available:
        print("Note: 5etools-data findes ikke (E5TOOLS_DATA); opslag af race, klasse, feats m.m. springes over.")
    return lookup


def ark_kontrol(navn, lookup=None):
    """Kontrollér karakterens character.yaml + sheets.yaml. Skriver fund og returnerer (antal fejl, antal advarsler)."""
    character_check, *_ = _ark_import()
    mappe = Path(faelles.KARAKTERER) / navn
    if not (mappe / "character.yaml").is_file():
        faelles.fejl(f"karakterer/{navn}/character.yaml findes ikke. Se docs/character-yaml.md og docs/llm-karakter-prompt.md.")
    fund = character_check.check_dir(mappe, lookup or _lookup(character_check))
    for filnavn, issue in fund:
        print(character_check.format_issue(f"karakterer/{navn}/{filnavn}", issue))
    fejl = sum(1 for _, i in fund if i.level == "fejl")
    return fejl, len(fund) - fejl


def tjek_ark(navn):
    """dnd.py tjek-ark: returnerer antal fejl."""
    fejl, advarsler = ark_kontrol(navn)
    print(f"{navn}: {fejl} fejl, {advarsler} advarsler." if (fejl or advarsler) else f"{navn}: ingen fund.")
    return fejl


def ark(navn, stil, pdf, skrifttyper, ud):
    """dnd.py ark: kontrol, derefter HTML (og PDF) direkte fra character.yaml + sheets.yaml (eller standarden)."""
    character_check, character_yaml, render, sheets = _ark_import()
    fejl, _ = ark_kontrol(navn)
    if fejl:
        faelles.fejl(f"{fejl} fejl i karakterer/{navn}. Ret dem først (python3 dnd.py tjek-ark {navn}).")
    mappe = Path(faelles.KARAKTERER) / navn
    karakter, layout = character_yaml.load(mappe), sheets.load(mappe)
    stile = ["farve", *render.STYLE_FILES] if stil == "alle" else [stil]
    ud_mappe = Path(ud) if ud else mappe / "udskrifter"
    ud_mappe.mkdir(parents=True, exist_ok=True)
    par = []
    for s in stile:
        sti = ud_mappe / f"karakterark-{s}.html"      # samme navne som webuiens Ark-fane
        sti.write_text(render.build(karakter, layout, s), encoding="utf-8")
        par.append((str(sti), str(sti.with_suffix(".pdf"))))
        print(sti)
    if pdf:
        import lav_pdf
        lav_pdf.lav_pdf(par, skrifttyper)
        for _, p in par:
            print(p)


def llm_opslag(args):
    """dnd.py llm-opslag: kalder main() i scripts/data/llm_opslag.py med resten af kommandolinjen."""
    sti = os.path.join(HER, "scripts", "data", "llm_opslag.py")
    if not os.path.isfile(sti):
        faelles.fejl("scripts/data/llm_opslag.py findes ikke endnu, så 'llm-opslag' kan ikke køre.")
    import importlib.util
    spec = importlib.util.spec_from_file_location("llm_opslag", sti)
    modul = importlib.util.module_from_spec(spec)
    sys.path.insert(0, os.path.dirname(sti))
    spec.loader.exec_module(modul)
    if not hasattr(modul, "main"):
        faelles.fejl("scripts/data/llm_opslag.py har ingen main().")
    sys.argv = ["dnd.py llm-opslag", *args]
    return modul.main()


def tjek():
    """Byg alle karakterark og kort i en midlertidig mappe. Returnerer antal fejl."""
    fejl_antal = 0
    navne = faelles.karakter_navne()
    if os.path.isdir(os.path.join(faelles.KARAKTERER, "_skabelon")):
        navne.append("_skabelon")                 # skabelonen skal altid kunne bygges
    # Byggerens karakterer (choices.yaml + character.yaml + sheets.yaml) har ikke karakter.yaml/kort.yaml;
    # de tjekkes ved at rendere arket i alle stile (kun i hukommelsen).
    bygger = [n for n in navne if os.path.isfile(os.path.join(faelles.KARAKTERER, n, "choices.yaml"))]
    # Karakterer med character.yaml uden choices.yaml (skrevet i hånden eller af en LLM): kontrollen først, så arket i alle stile.
    kun_ark = [n for n in navne if n != "_skabelon" and n not in bygger and _kun_ark(n)]
    navne = [n for n in navne if n not in bygger]
    if bygger or kun_ark:
        sys.path.insert(0, HER)
        from webui.builder import character_yaml, render, sheets
    if kun_ark:
        character_check, *_ = _ark_import()
        lookup = _lookup(character_check)
    for navn in kun_ark:
        mappe = Path(faelles.KARAKTERER) / navn
        try:
            fund = character_check.check_dir(mappe, lookup)
            for filnavn, issue in fund:
                print(character_check.format_issue(f"karakterer/{navn}/{filnavn}", issue))
            if character_check.has_errors(fund):
                raise ValueError("se fejlene ovenfor")
            karakter, layout = character_yaml.load(mappe), sheets.load(mappe)
            for stil in (None, *render.STYLE_FILES):
                render.build(karakter, layout, stil)
            print(f"ok     {navn:<14} character.yaml-ark")
        except Exception as e:
            fejl_antal += 1
            print(f"FEJL   {navn:<14} character.yaml-ark: {type(e).__name__}: {e}")
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
            moduler = (karakterark, spellkort)
            if navn in kun_ark:                      # kun kort, hvis karakteren har et; arket er kontrolleret ovenfor
                moduler = (spellkort,) if faelles._i_mappe(os.path.join(faelles.KARAKTERER, navn), "kort") else ()
            for modul in moduler:
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
    if len(sys.argv) > 1 and sys.argv[1] == "llm-opslag":   # alle flag (også --help) går videre til scriptet
        sys.exit(llm_opslag(sys.argv[2:]) or 0)
    ap = argparse.ArgumentParser(prog="dnd.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="kommando", required=True)
    sub.add_parser("liste", help="vis karakterer")
    sub.add_parser("tjek", help="byg alt og meld fejl i data")
    p = sub.add_parser("tjek-ark", help="kontrollér character.yaml + sheets.yaml (exit 1 ved fejl)")
    p.add_argument("navn", help="karakternavn (mappen i karakterer/)")
    p = sub.add_parser("ark", help="lav karakterark direkte fra character.yaml + sheets.yaml (kontrol først)")
    p.add_argument("navn", help="karakternavn (mappen i karakterer/)")
    p.add_argument("--stil", default="farve", help="farve (standard), sorthvid, et af arkets temaer eller alle (se render.STYLE_FILES)")
    p.add_argument("--pdf", action="store_true", help="lav også print-klar PDF (kræver Playwright)")
    p.add_argument("--skrifttyper", help="mappe med @fontsource-pakker, hvis Google Fonts ikke kan nås")
    p.add_argument("--ud", help="mappe til outputfiler (standard: karakterer/<navn>/udskrifter/)")
    p = sub.add_parser("llm-opslag", help="opslag i 5etools til en LLM (scripts/data/llm_opslag.py)", add_help=False)
    p.add_argument("args", nargs=argparse.REMAINDER, help="gives videre til scripts/data/llm_opslag.py")
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
    if a.kommando == "tjek-ark":
        sys.exit(1 if tjek_ark(a.navn) else 0)
    if a.kommando == "ark":
        sys.path.insert(0, HER)
        from webui.builder import render
        if a.stil != "alle" and a.stil not in ("farve", *render.STYLE_FILES):
            faelles.fejl(f"Ukendt stil '{a.stil}'. Vælg farve, alle eller: {', '.join(render.STYLE_FILES)}.")
        return ark(a.navn, a.stil, a.pdf, a.skrifttyper, a.ud)

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
