"""Udfolder 5etools' `_versions` til fulde objekter - samme regler som
5etools' egen kode (js/utils.js: DataUtil.generic.getVersions og
copyApplier.getCopy), kun de dele data faktisk bruger.

En race/et feat kan have `_versions`: varianter af sig selv (Elf -> Drow/High
Elf/Wood Elf, Dragonborn -> 10 farver). To former:

* Basis: `{name, source, <felter>, _mod: {...}}`.
* Skabelon: `{_abstract: {name: "Dragonborn ({{color}})", _mod: ...},
  _implementations: [{_variables: {color: "Black"}, resist: [...]}, ...]}` -
  én version pr. implementation, hvor `{{variabel}}` i alle tekster i
  skabelonen erstattes, og implementationens øvrige felter lægges ovenpå.

En version er en kopi af forælderen, hvor:
* versionens EGNE felter erstatter forælderens helt (ingen dyb sammenfletning),
  og `null` på et felt fjerner det;
* `_mod` bagefter retter listerne i forælderens kopi - pr. felt (typisk
  `entries`) en liste af operationer med `mode`: replaceArr, removeArr,
  appendArr, prependArr, insertArr, replaceTxt.
"""
from __future__ import annotations

import copy
import re
import warnings

# Felter 5etools ikke arver til en version (metadata om forælderen selv).
_NOT_INHERITED = {"_versions", "hasToken", "hasFluff", "hasFluffImages", "otherSources", "additionalSources", "reprintedAs", "soundClip"}


def expand(entity: dict) -> list[dict]:
    """Alle versioner af entity som fulde, selvstændige objekter ([] hvis ingen)."""
    versions = []
    for ver in entity.get("_versions") or []:
        if ver.get("_abstract") and ver.get("_implementations"):
            versions += [_from_template(ver["_abstract"], impl) for impl in ver["_implementations"]]
        else:
            versions.append(copy.deepcopy(ver))
    out = []
    for ver in versions:
        try:
            out.append(_apply(entity, ver))
        except ValueError as exc:  # en enkelt defekt version (ældre kilder) må ikke vælte resten
            warnings.warn(f"Springer version over: {exc}")
    return out


def _from_template(abstract: dict, impl: dict) -> dict:
    template = copy.deepcopy(abstract)
    impl = copy.deepcopy(impl)
    variables = impl.pop("_variables", None)
    if variables:
        template = _substitute(template, variables)
    template.update(impl)
    return template


def _substitute(node, variables: dict):
    if isinstance(node, str):
        return re.sub(r"\{\{([^}]+)\}\}", lambda m: str(variables.get(m.group(1), m.group(0))), node)
    if isinstance(node, list):
        return [_substitute(x, variables) for x in node]
    if isinstance(node, dict):
        return {k: _substitute(v, variables) for k, v in node.items()}
    return node


def _apply(parent: dict, version: dict) -> dict:
    mods = version.pop("_mod", None)
    version.pop("_preserve", None)
    version.pop("_templates", None)
    for key, value in parent.items():
        if key in _NOT_INHERITED:
            continue
        if key in version and version[key] is None:
            del version[key]
        elif key not in version:
            version[key] = copy.deepcopy(value)
    for key in [k for k, v in version.items() if v is None]:
        del version[key]
    for prop, ops in (mods or {}).items():
        for op in ops if isinstance(ops, list) else [ops]:
            _mod(version, prop, op)
    version["_versionOf"] = {"name": parent.get("name"), "source": parent.get("source")}
    return version


def _as_list(value) -> list:
    return value if isinstance(value, list) else [value]


def _find(items: list, replace) -> int:
    """Indeks for replace-målet: navn, {index}, {regex} eller selve strengen."""
    if isinstance(replace, dict):
        if replace.get("index") is not None:
            return replace["index"]
        if replace.get("regex"):
            rx = re.compile(replace["regex"], re.I if "i" in replace.get("flags", "") else 0)
            return next((i for i, it in enumerate(items) if rx.search(it.get("name", "") if isinstance(it, dict) else str(it))), -1)
    return next((i for i, it in enumerate(items) if (it.get("name") == replace if isinstance(it, dict) else it == replace)), -1)


def _mod(entity: dict, prop: str, op) -> None:
    if op == "remove":
        entity.pop(prop, None)
        return
    mode = op.get("mode")
    current = entity.get(prop)
    if mode == "replaceTxt":
        rx = re.compile(op["replace"], re.I if "i" in op.get("flags", "") else 0)
        entity[prop] = _walk_strings(current, lambda s: rx.sub(op.get("with", ""), s))
        return
    items = _as_list(op.get("items", []))
    if mode == "appendArr":
        entity[prop] = (current or []) + items
    elif mode == "prependArr":
        entity[prop] = items + (current or [])
    elif mode == "insertArr":
        arr = list(current or [])
        index = op.get("index", -1)
        arr[len(arr) if index == -1 else index:len(arr) if index == -1 else index] = items
        entity[prop] = arr
    elif mode == "replaceArr":
        arr = list(current or [])
        index = _find(arr, op["replace"])
        if index < 0:
            raise ValueError(f"_mod replaceArr: finder ikke {op['replace']!r} i {entity.get('name')!r}.{prop}")
        arr[index:index + 1] = items
        entity[prop] = arr
    elif mode == "removeArr":
        arr = list(current or [])
        for name in _as_list(op.get("names") or op.get("items") or []):
            index = _find(arr, name)
            if index >= 0:
                del arr[index]
        entity[prop] = arr
    else:
        raise ValueError(f"_mod: ukendt mode {mode!r}")


def _walk_strings(node, fn):
    if isinstance(node, str):
        return fn(node)
    if isinstance(node, list):
        return [_walk_strings(x, fn) for x in node]
    if isinstance(node, dict):
        return {k: _walk_strings(v, fn) for k, v in node.items()}
    return node
