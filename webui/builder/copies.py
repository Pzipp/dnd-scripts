"""Løser 5etools' `_copy` (med `_mod`) til fulde objekter - samme regler som 5etools'
egen kode (js/utils.js: DataUtil.generic._pMergeCopy), kun de dele data faktisk bruger.

En post med `_copy` arver alle felter fra en basispost (fundet på name+source; for subrace,
subclass og subclassFeature også race/klasse), og:
* postens EGNE felter erstatter basens helt (ingen dyb sammenfletning); `null` fjerner feltet;
* metafelter om basen selv (page, reprintedAs, hasFluff ...) arves kun, hvis `_copy._preserve`
  nævner dem (eller har `"*"`);
* `_copy._mod` retter derefter listerne (se versions._mod: appendArr, replaceArr, ...).

Kald `resolve` EFTER at de danske felter er lagt ovenpå (e5tools._overlay_dansk), så en kopi
arver dansk tekst fra sin base, og FØR versions.expand, så versioner arver fra en foldet post.
En manglende base eller en cyklus er en advarsel; posten beholdes uden `_copy`.
"""
from __future__ import annotations

import copy
import warnings

from . import versions

# Metafelter om basen selv: arves kun via `_copy._preserve`.
_PRESERVE_BASE = {"page", "otherSources", "referenceSources", "srd", "srd52", "basicRules", "basicRules2024",
                  "reprintedAs", "hasFluff", "hasFluffImages", "hasToken", "tokenCredit", "tokenCustom",
                  "foundryTokenScale", "altArt", "_versions"}


def _hash(prop: str, x: dict) -> tuple:
    def g(k):
        return str(x.get(k, "")).lower()
    if prop == "subclass":
        return (g("name"), g("shortName"), g("source"), g("className"), g("classSource"))
    if prop == "subclassFeature":
        return (g("name"), g("className"), g("classSource"), g("subclassShortName"), g("subclassSource"), str(x.get("level")))
    if prop == "subrace":
        return (g("name"), g("source"), g("raceName"), g("raceSource"))
    return (g("name"), g("source"))


def resolve(prop: str, entries: list[dict], pool: list[dict] | None = None) -> list[dict]:
    """entries med alle `_copy` foldet ud. pool = alle poster basen kan ligge i (standard: entries)."""
    if not any("_copy" in x for x in entries if isinstance(x, dict)):
        return entries
    pool = entries if pool is None else pool
    index = {_hash(prop, x): x for x in reversed(pool) if isinstance(x, dict)}  # tidligste post vinder
    done: dict = {}

    def fold(x: dict, stack: tuple = ()) -> dict:
        if "_copy" not in x:
            return x
        key = _hash(prop, x)
        if key in done:
            return done[key]
        base_key = _hash(prop, {**x, **x["_copy"]})
        if base_key == key or base_key in stack:
            warnings.warn(f"_copy: cyklus ved {key}")
            return {k: v for k, v in x.items() if k != "_copy"}
        base = index.get(base_key)
        if base is None:
            warnings.warn(f"_copy: basis mangler for {key}: {base_key}")
            return {k: v for k, v in x.items() if k != "_copy"}
        try:
            out = _apply(copy.deepcopy(fold(base, stack + (key,))), x)
        except ValueError as exc:  # en defekt kopi (ældre kilde) må ikke vælte resten
            warnings.warn(f"_copy: springer {key} over: {exc}")
            out = {k: v for k, v in x.items() if k != "_copy"}
        done[key] = out
        return out

    return [fold(x) if isinstance(x, dict) else x for x in entries]


def _apply(base: dict, x: dict) -> dict:
    meta = x["_copy"]
    preserve = meta.get("_preserve") or {}
    out = {k: copy.deepcopy(v) for k, v in x.items() if k != "_copy" and v is not None}  # null = fjern
    for key, value in base.items():
        if key in x:
            continue
        if key in _PRESERVE_BASE and not (preserve.get("*") or preserve.get(key)):
            continue
        out[key] = copy.deepcopy(value)
    for prop, ops in (meta.get("_mod") or {}).items():
        if prop in ("*", "_"):  # monster-specifikke; forekommer ikke i vores data
            continue
        for op in ops if isinstance(ops, list) else [ops]:
            versions._mod(out, prop, op)
    return out
