#!/usr/bin/env python3
"""Fælles hjælpere til alle scripts i scripts/.

Bruges af karakterark.py, spellkort.py, lav-pdf.py og dnd.py.
Eneste eksterne krav er PyYAML (pip install pyyaml) til .yaml-filer.

Hvad modulet gør:
  indlaes(sti)             læs en .yaml/.yml/.json-fil
  find_fil(arg, filnavn)   find en datafil ud fra et karakternavn, en mappe eller en sti
  stile(valg)              "farve" | "sorthvid" | "begge" -> liste af stile
  ud_sti(...)              hvor en genereret fil skal ligge (karakterer/<navn>/udskrifter/)
"""
import json
import os
import sys

SCRIPTS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPTS)
KARAKTERER = os.path.join(ROOT, "karakterer")
BIBLIOTEK = os.path.join(ROOT, "bibliotek")
STILE = ("farve", "sorthvid")
ENDELSER = (".yaml", ".yml", ".json")


def fejl(tekst):
    """Stop med en forklarende fejl (ingen lang traceback til brugeren)."""
    sys.exit(f"FEJL: {tekst}")


def indlaes(sti):
    """Læs en datafil. YAML (anbefalet) eller JSON."""
    with open(sti, encoding="utf-8") as f:
        if sti.lower().endswith((".yaml", ".yml")):
            try:
                import yaml
            except ImportError:
                fejl("PyYAML mangler. Kør:  pip install pyyaml")
            try:
                return yaml.safe_load(f)
            except yaml.YAMLError as e:
                fejl(f"{sti} er ikke gyldig YAML:\n{e}")
        return json.load(f)


def karakter_navne():
    """Navne på alle karaktermapper (undtagen skabelonen _skabelon)."""
    if not os.path.isdir(KARAKTERER):
        return []
    return sorted(n for n in os.listdir(KARAKTERER)
                  if not n.startswith(("_", ".")) and os.path.isdir(os.path.join(KARAKTERER, n)))


def _i_mappe(mappe, filnavn):
    for e in ENDELSER:
        p = os.path.join(mappe, filnavn + e)
        if os.path.isfile(p):
            return p
    return None


def find_fil(arg, filnavn):
    """Find datafilen ud fra arg.

    arg kan være en sti til en fil, en mappe (der ligger <filnavn>.yaml i) eller et karakternavn
    (-> karakterer/<navn>/<filnavn>.yaml). filnavn er 'karakter' eller 'kort'.
    """
    if os.path.isfile(arg):
        return arg
    if os.path.isdir(arg):
        p = _i_mappe(arg, filnavn)
        if p:
            return p
        fejl(f"Mappen {arg} har ingen {filnavn}.yaml")
    p = _i_mappe(os.path.join(KARAKTERER, arg), filnavn)
    if p:
        return p
    navne = ", ".join(karakter_navne()) or "(ingen)"
    fejl(f"Kender ikke '{arg}'. Giv et karakternavn ({navne}), en mappe eller en filsti.")


def stile(valg):
    """'farve' | 'sorthvid' | 'begge' (eller None = begge) -> liste af stile."""
    if valg in (None, "begge"):
        return list(STILE)
    if valg in STILE:
        return [valg]
    fejl(f"Ukendt stil '{valg}'. Vælg farve, sorthvid eller begge.")


def ud_sti(inddata, type_, stil, endelse, ud_mappe=None):
    """Sti til en genereret fil, fx karakterer/valak/udskrifter/karakterark-sorthvid.html.

    Ligger inddata direkte i karakterer/<navn>/, havner filen i udskrifter/ dér.
    Ellers havner den ved siden af inddata. ud_mappe overstyrer begge dele.
    """
    mappe = os.path.dirname(os.path.abspath(inddata))
    if ud_mappe:
        mappe = os.path.abspath(ud_mappe)
    elif os.path.dirname(mappe) == KARAKTERER:
        mappe = os.path.join(mappe, "udskrifter")
    os.makedirs(mappe, exist_ok=True)
    return os.path.join(mappe, f"{type_}-{stil}{endelse}")
