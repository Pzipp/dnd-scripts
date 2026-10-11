"""Strukturerede effekter fra 5etools' Foundry VTT-filer (foundry-feats.json, foundry-races.json,
class/foundry.json): tal, der kan regnes ud uden at læse regelteksten.

Hver post har `effects: [{transfer, changes: [{key, mode, value}]}]`, hvor `key` er et Foundry-felt
(`system.attributes.hp.bonuses.level`) og `value` et tal eller en formel (`@classes.sorcerer.levels`).
Kun `transfer: true`-effekter, der ikke er slået fra, er permanente og tæller her; resten er
aktiverbare (Rage, Ambusher's Leap) eller enchantments (Spell Mastery).

Oversat i dag (flere nøgler kan tilføjes i `_map_change`):

* `hp.bonuses.level` (Dwarven Toughness, Tough): N pr. karakterniveau -> `hp_flat`
* `hp.bonuses.overall` (Draconic Resilience, Boon of Fortitude, Tough PHB): tal eller formel -> `hp_flat`
* `init.bonus` (Dread Ambusher) og `flags.dnd5e.initiativeAlert` (Alert) -> `initiative`

Resultatet har samme form som LLM-effekterne i effects.py (`target`, `type`, `value`, `duration`), så
character_yaml._apply_effects() bruger dem ens. En entry, Foundry-dataene dækker, sendes ikke til LLM'en
og dens LLM-effekter ignoreres (strukturerede data vinder).

Formler: `@classes.<klasse>.levels` er niveauet i den klasse, `@details.level` karakterniveauet. Alt andet
(`@scale...`, `@abilities...` i HP-formler) kan ikke regnes ud, og så regnes effekten som ikke dækket.
"""
from __future__ import annotations

import re
from functools import lru_cache

from . import e5tools as e

_FILES = {
    "feat": [("foundry-feats.json", "feat")],
    "class_feature": [("class/foundry.json", "classFeature"), ("class/foundry.json", "subclassFeature")],
    "race_trait": [("foundry-races.json", "raceFeature")],
}
_SAFE_EXPR = re.compile(r"^[0-9+\-*/(). ]+$")


@lru_cache(maxsize=None)
def _index() -> dict[tuple[str, str], list[dict]]:
    """{(kind, navn): [poster]}. Manglende filer giver et tomt opslag (så falder alt tilbage til LLM-effekterne)."""
    out: dict[tuple[str, str], list[dict]] = {}
    for kind, files in _FILES.items():
        for path, key in files:
            try:
                records = e._load(path).get(key, [])
            except e.E5ToolsUnavailable:
                continue
            for record in records:
                out.setdefault((kind, record["name"]), []).append(record)
    return out


def _record(entry: dict, any_lineage: bool = False) -> dict | None:
    candidates = _index().get((entry.get("kind"), entry.get("name")), [])
    if entry.get("source"):
        same_source = [r for r in candidates if r.get("source") == entry["source"]]
        candidates = same_source or candidates
    if entry["kind"] == "class_feature":
        candidates = [r for r in candidates if r.get("className") == entry.get("class")]
        exact = [r for r in candidates if r.get("level") == entry.get("level")]
        candidates = exact or candidates
    elif entry["kind"] == "race_trait":
        race, lineage = entry.get("race"), entry.get("lineage")
        wanted = {str(race).lower()} | ({f"{race} ({lineage})".lower()} if lineage else set())
        candidates = [r for r in candidates if str(r.get("raceName", "")).lower() in wanted
                      or (any_lineage and str(r.get("raceName", "")).lower().startswith(f"{str(race).lower()} ("))]
    return candidates[0] if candidates else None


def _changes(record: dict):
    for effect in record.get("effects") or []:
        if effect.get("transfer") and not effect.get("disabled") and effect.get("type") != "enchantment":
            yield from effect.get("changes") or []


def _evaluate(value, total_level: int, class_levels: dict[str, int]) -> int | None:
    """Tal eller formel -> heltal; None hvis noget ikke kan regnes ud."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    levels = {name.lower(): lvl for name, lvl in class_levels.items()}
    text = re.sub(r"@classes\.([a-z]+)\.levels", lambda m: str(levels.get(m.group(1), 0)), str(value).lower())
    text = text.replace("@details.level", str(total_level)).strip().lstrip("+")
    if not text or not _SAFE_EXPR.match(text):
        return None
    try:
        return int(eval(text, {"__builtins__": {}}, {}))  # noqa: S307 - kun cifre og + - * / ( ) er lukket ind ovenfor
    except (SyntaxError, ZeroDivisionError):
        return None


def _initiative_term(value) -> str | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(int(value))
    text = str(value).strip().lstrip("+").strip()
    ability = re.fullmatch(r"@abilities\.(str|dex|con|int|wis|cha)\.mod", text)
    if ability:
        return f"ability:{ability.group(1).upper()}"
    if text in ("@prof", "@attributes.prof"):
        return "PB"
    return None


def _map_change(change: dict, entry: dict, total_level: int, class_levels: dict[str, int]) -> dict | None:
    key, mode, value = change.get("key", ""), change.get("mode"), change.get("value")
    out = None
    if key == "system.attributes.hp.bonuses.level" and mode == "ADD":
        amount = _evaluate(value, total_level, class_levels)
        out = {"target": "hp_flat", "value": str(amount * total_level)} if amount is not None else None
    elif key == "system.attributes.hp.bonuses.overall" and mode == "ADD":
        amount = _evaluate(value, total_level, class_levels)
        out = {"target": "hp_flat", "value": str(amount)} if amount is not None else None
    elif key == "system.attributes.init.bonus" and mode == "ADD":
        term = _initiative_term(value)
        out = {"target": "initiative", "value": term} if term else None
    elif key == "flags.dnd5e.initiativeAlert" and value is True:
        out = {"target": "initiative", "value": "PB" if entry.get("source") == "XPHB" else "5"}  # 2024: +PB, 2014: +5
    return {**out, "type": "add", "duration": "permanent"} if out else None


def resolve(entry: dict, total_level: int, class_levels: dict[str, int], any_lineage: bool = False) -> list[dict] | None:
    """Permanente effekter for entry'en fra Foundry-dataene (LLM-effektens form), eller None hvis dataene
    ikke dækker den. `entry`: {name, source, kind, class?, level?, race?, lineage?}."""
    record = _record(entry, any_lineage) if entry.get("kind") in _FILES else None
    if not record:
        return None
    mapped = [m for c in _changes(record) if (m := _map_change(c, entry, total_level, class_levels))]
    return mapped or None


def covers(entry: dict) -> bool:
    """Dækker Foundry-dataene entry'en (så den ikke behøver LLM-udtræk)? Formler regnes ikke ud her."""
    return resolve(entry, 1, {}, any_lineage=True) is not None
