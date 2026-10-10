"""Racer/species fra 5etools, som byggeren bruger dem.

Afstamninger (Elf: Drow/High Elf/Wood Elf, Tiefling: Legacy, Gnome, Goliath,
Dragonborn-farver) ligger som `_versions` på racen (se versions.py). Hver
version er en fuld race med de felter, afstamningen ændrer (Drow: Darkvision
120 og egne spells; Wood Elf: speed 35; Tiefling-Legacy: resist og spells;
Dragonborn: resist og Breath Weapon-skadetype). Valget af afstamning er derfor
valget af VERSION, og den valgte versions felter afløser racens.

Gemt valg: `race.choices.lineage` = versionens kortnavn (se lineage_label), fx
'Drow', 'Wood Elf', 'Abyssal', 'Forest Gnome', 'Cloud', 'Black'.
"""
from __future__ import annotations

import re

from . import versions

SIZE_NAMES = {"T": "Tiny", "S": "Small", "M": "Medium", "L": "Large", "H": "Huge", "G": "Gargantuan", "V": "Varies"}
_SUFFIX = re.compile(r"\s+(Lineage|Legacy|Ancestry)$")


def lineage_label(version_name: str) -> str:
    """'Elf; Drow Lineage' -> 'Drow', 'Dragonborn (Black)' -> 'Black', 'Tiefling; Abyssal Legacy' -> 'Abyssal'."""
    if ";" in version_name:
        part = version_name.split(";", 1)[1].strip()
    elif "(" in version_name and version_name.rstrip().endswith(")"):
        part = version_name[version_name.index("(") + 1:version_name.rindex(")")].strip()
    else:
        part = version_name
    return _SUFFIX.sub("", part)


def lineages(race: dict) -> list[tuple[str, dict]]:
    """[(kortnavn, fuld version-race)] - tom liste, hvis racen ingen afstamninger har."""
    return [(lineage_label(v["name"]), v) for v in versions.expand(race)]


def effective(race: dict, lineage: str | None) -> dict:
    """Den valgte afstamnings fulde race, ellers racen selv (uden valgt afstamning)."""
    for label, version in lineages(race):
        if lineage and label.lower() == str(lineage).lower():
            return version
    return race


def needs_lineage(race: dict, lineage: str | None) -> bool:
    return bool(race.get("_versions")) and effective(race, lineage) is race


def size_options(race: dict) -> list[str]:
    """Størrelser at vælge imellem (navne). En enkelt størrelse er fast."""
    return [SIZE_NAMES.get(s, s) for s in race.get("size") or []]


def speeds(race: dict) -> dict[str, int]:
    """{'walk': 30, 'fly': 30, ...} i ft. 5etools: tal, eller `true` = lig walk-farten."""
    raw = race.get("speed", 30)
    if not isinstance(raw, dict):
        return {"walk": raw or 30}
    walk = raw.get("walk") if isinstance(raw.get("walk"), int) else 30
    return {mode: (walk if value is True else value) for mode, value in raw.items() if value}


def fixed_senses(race: dict) -> dict[str, int]:
    out = {}
    for key in ("darkvision", "blindsight"):
        if isinstance(race.get(key), int):
            out[key] = race[key]
    return out


def fixed_resist(race: dict) -> list[str]:
    """Faste modstande ('necrotic'). Valg ({'choose': ...}) tælles ikke med."""
    return [r for r in race.get("resist") or [] if isinstance(r, str)]


def resist_choice(race: dict) -> dict | None:
    for r in race.get("resist") or []:
        if isinstance(r, dict) and r.get("choose", {}).get("from"):
            return r["choose"]
    return None


def fixed_other(race: dict) -> dict[str, list[str]]:
    """Faste immunities/vulnerabilities/condition immunities (strenge)."""
    return {key: [x for x in race.get(key) or [] if isinstance(x, str)] for key in ("immune", "vulnerable", "conditionImmune")}
