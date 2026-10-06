"""Tjek af karakter-YAML til editoren: fejl med linje og kolonne, uden at bygge arket.

Layoutets bokse tjekkes mod de samme navne, som karakterark.py bruger (BOKSE for side 1).
Side 2-typerne ligger lokalt i side2() og er derfor listet her; hold dem i takt med side2().
"""
from __future__ import annotations

import difflib

import yaml
from yaml.nodes import MappingNode, ScalarNode, SequenceNode

from karakterark import BOKSE

SIDE1_TYPER = tuple(BOKSE)
SIDE2_TYPER = ("ubevaebnet", "bevaegelse", "ekstra", "livsredning", "mastery", "nyttige", "situationer", "tilstande")


def _fejl(node, besked):
    return {"linje": node.start_mark.line + 1, "kolonne": node.start_mark.column + 1, "besked": besked}


def _felter(node):
    return {k.value: v for k, v in node.value if isinstance(k, ScalarNode)}


def _ukendt(value, typer):
    forslag = difflib.get_close_matches(str(value), typer, n=1)
    hjælp = f" Mente du {forslag[0]!r}?" if forslag else ""
    return f"Ukendt boks-type {value!r}.{hjælp} Kendte typer: {', '.join(typer)}."


def _tjek_layout(seq, typer):
    """typer=None betyder notesider (side 3–4), hvor boksene ikke har type."""
    if not isinstance(seq, SequenceNode):
        return [_fejl(seq, "layout skal være en liste.")]
    out = []
    for item in seq.value:
        if not isinstance(item, MappingNode):
            out.append(_fejl(item, "Hver post i layout skal være en mappe (type, kolonner eller raekker)."))
            continue
        f = _felter(item)
        if "kolonner" in f:
            kol = f["kolonner"]
            if not isinstance(kol, SequenceNode):
                out.append(_fejl(kol, "kolonner skal være en liste."))
                continue
            for k in kol.value:
                if not isinstance(k, MappingNode):
                    out.append(_fejl(k, "En kolonne skal være en mappe med bredde og indhold."))
                    continue
                kf = _felter(k)
                if "bredde" not in kf:
                    out.append(_fejl(k, "Kolonnen mangler bredde."))
                else:
                    try:
                        float(kf["bredde"].value)
                    except ValueError:
                        out.append(_fejl(kf["bredde"], "bredde skal være et tal, fx 1 eller 1.25."))
                if "indhold" in kf:
                    out += _tjek_layout(kf["indhold"], typer)
        elif "raekker" in f:
            out += _tjek_layout(f["raekker"], typer)
        elif "type" in f:
            if typer is not None and f["type"].value not in typer:
                out.append(_fejl(f["type"], _ukendt(f["type"].value, typer)))
        elif typer is not None:
            out.append(_fejl(item, "Boksen mangler type (eller kolonner/raekker)."))
    return out


def tjek(text, layout=True):
    """Liste af fejl. Tom liste betyder, at teksten er ren. layout=False tjekker kun YAML-syntaksen (kort)."""
    try:
        root = yaml.compose(text, Loader=yaml.SafeLoader)
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        return [{
            "linje": mark.line + 1 if mark else 1,
            "kolonne": mark.column + 1 if mark else 1,
            "besked": f"YAML-fejl: {getattr(exc, 'problem', None) or exc}",
        }]
    if not isinstance(root, MappingNode):
        return [{"linje": 1, "kolonne": 1, "besked": "YAML skal indeholde et objekt/mappe øverst."}]
    if not layout:
        return []
    out = []
    for navn, typer in (("karakterark", SIDE1_TYPER), ("handlingsark", SIDE2_TYPER),
                        ("baggrundsark", None), ("udstyrsark", None)):
        sek = _felter(root).get(navn)
        if not isinstance(sek, MappingNode) or "layout" not in _felter(sek):
            continue
        out += _tjek_layout(_felter(sek)["layout"], typer)
    return out
