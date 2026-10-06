"""Tjek af karakter-YAML til editoren: fejl med linje og kolonne, uden at bygge arket.

Typerne kommer fra REGISTRY i karakterark.py, så tjekket og generatoren altid er enige.
"""
from __future__ import annotations

import difflib

import yaml
from yaml.nodes import MappingNode, ScalarNode, SequenceNode

from karakterark import REGISTRY


def _fejl(node, besked):
    return {"linje": node.start_mark.line + 1, "kolonne": node.start_mark.column + 1, "besked": besked}


def _felter(node):
    return {k.value: v for k, v in node.value if isinstance(k, ScalarNode)}


def _ukendt(value):
    forslag = difflib.get_close_matches(str(value), list(REGISTRY), n=1)
    hjælp = f" Mente du {forslag[0]!r}?" if forslag else ""
    return f"Ukendt boks-type {value!r}.{hjælp} Kendte typer: {', '.join(REGISTRY)}."


def _tjek_layout(seq):
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
                    out += _tjek_layout(kf["indhold"])
        elif "raekker" in f:
            out += _tjek_layout(f["raekker"])
        elif "type" in f:
            if f["type"].value not in REGISTRY:
                out.append(_fejl(f["type"], _ukendt(f["type"].value)))
        else:
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
    sider = _felter(root).get("sider")
    if sider is None:
        return []
    if not isinstance(sider, SequenceNode):
        return [_fejl(sider, "sider skal være en liste med én post pr. side.")]
    out = []
    for side in sider.value:
        if not isinstance(side, MappingNode):
            out.append(_fejl(side, "Hver side i sider skal være en mappe med top, layout og foot."))
            continue
        f = _felter(side)
        if "layout" in f:
            out += _tjek_layout(f["layout"])
    return out
