"""Træk og slip af bokse i sheets.yaml: flyt, tilføj og fjern knuder i layout-træet.

Filen redigeres med ruamel.yaml (round-trip), så spillerens kommentarer og formatering bevares.
En sti er den samme som render.py lægger i data-path/data-stack, fx "0/layout/1/columns/0/content/2":
første led er sidens indeks, resten er nøgler og indeks ned gennem pages-listen.
"""
from __future__ import annotations

import io
from pathlib import Path

try:
    from ruamel.yaml import YAML
    from ruamel.yaml.comments import CommentedMap
except ImportError:  # kræver en ny image-bygning (webui/requirements.txt)
    YAML = None

from . import render
from . import sheets as sheets_module


class LayoutError(ValueError):
    pass


def _yaml():
    if YAML is None:
        raise LayoutError("ruamel.yaml mangler i containeren. Byg imaget forfra (docker compose build), så kommentarerne i sheets.yaml kan bevares.")
    y = YAML(typ="rt")
    y.preserve_quotes = True
    y.width = 10_000          # ingen automatisk ombrydning af lange linjer
    y.indent(mapping=2, sequence=2, offset=0)  # samme stil som skabelonen: "- " i samme indrykning som nøglen
    return y


def parse_path(text: str) -> list:
    if not isinstance(text, str) or not text:
        raise LayoutError("Tom sti.")
    return [int(tok) if tok.isdigit() else tok for tok in text.split("/")]


def _get(root, path: list):
    node = root
    for tok in path:
        try:
            node = node[tok]
        except (KeyError, IndexError, TypeError) as exc:
            raise LayoutError(f"Stien findes ikke (længere): {'/'.join(map(str, path))}") from exc
    return node


def _stack(root, path_text: str):
    stack = _get(root, parse_path(path_text))
    if not isinstance(stack, list):
        raise LayoutError("Målet er ikke en liste af bokse.")
    return stack


def move(root, src: str, dst_stack: str, index: int) -> None:
    src_path, dst_path = parse_path(src), parse_path(dst_stack)
    if dst_path[:len(src_path)] == src_path:
        raise LayoutError("En boks kan ikke lægges inde i sig selv.")
    parent = _get(root, src_path[:-1])
    i = src_path[-1]
    if not isinstance(parent, list) or not isinstance(i, int):
        raise LayoutError("Kun bokse i en liste kan flyttes.")
    dst = _stack(root, dst_stack)  # slås op FØR fjernelsen, så indeks i stien ikke forskydes
    node = parent[i]
    index = max(0, min(int(index), len(dst)))
    if dst is parent and i < index:
        index -= 1
    del parent[i]
    dst.insert(index, node)


def add(root, box_type: str, dst_stack: str, index: int) -> None:
    if box_type not in render.REGISTRY:
        raise LayoutError(f"Ukendt boks-type: {box_type!r}.")
    dst = _stack(root, dst_stack)
    node = CommentedMap()
    node["type"] = box_type
    dst.insert(max(0, min(int(index), len(dst))), node)


def remove(root, src: str) -> None:
    path = parse_path(src)
    parent = _get(root, path[:-1])
    if not isinstance(parent, list) or not isinstance(path[-1], int):
        raise LayoutError("Kun bokse i en liste kan fjernes.")
    del parent[path[-1]]


def apply(character_dir: Path, op: dict) -> None:
    """Udfører ét træk og gemmer sheets.yaml. Rejser LayoutError ved ugyldigt træk; filen røres da ikke."""
    yaml = _yaml()
    sheets_module.ensure_exists(character_dir)
    path = sheets_module.sheets_path(character_dir)
    data = yaml.load(path.read_text(encoding="utf-8"))
    root = data["pages"]
    kind = op.get("op")
    if kind == "move":
        move(root, op.get("path", ""), op.get("stack", ""), op.get("index", 0))
    elif kind == "add":
        add(root, op.get("type", ""), op.get("stack", ""), op.get("index", 0))
    elif kind == "remove":
        remove(root, op.get("path", ""))
    else:
        raise LayoutError("Ukendt handling.")
    out = io.StringIO()
    yaml.dump(data, out)
    path.write_text(out.getvalue(), encoding="utf-8")


def box_types() -> list[dict]:
    """Til paletten: type + læsbart navn (titel uden HTML, ellers typenavnet)."""
    import re
    out = []
    for name, reg in render.REGISTRY.items():
        title = re.sub(r"<[^>]+>", "", reg["title"] or "").strip() or name
        out.append({"type": name, "label": title if title != name else name})
    return out
