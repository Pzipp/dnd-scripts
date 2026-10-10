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

import copy
import re

from . import e5tools as e
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


def getSubraceName(race_name: str, sub_name: str | None) -> str:
    """5etools' navngivning af en sammenflettet subrace: 'Dwarf' + 'Hill' -> 'Dwarf (Hill)'."""
    if not sub_name:
        return race_name
    m = re.match(r"^(.*?)(\(.*?\))$", race_name or "")
    if not m:
        return f"{race_name} ({sub_name})"
    return f"{m.group(1)}({'; '.join([m.group(2)[1:-1], sub_name])})"


def merge_subrace(race: dict, sr: dict) -> dict:
    """Subrace lagt ovenpå racen, som 5etools gør det (js/render.js: _getMergedSubrace): evne-blokke
    flettes pr. position (eller erstattes ved overwrite.ability), entries lægges til (eller erstatter
    en entry via data.overwrite), traitTags/languageProficiencies lægges til (eller erstattes), skills
    flettes, og ALT andet (speed, darkvision, additionalSpells, weapon-/armorProficiencies, resist ...)
    erstattes af subracens egne felter. `null` på subracen fjerner feltet."""
    out = copy.deepcopy(race)
    sub = copy.deepcopy(sr)
    for key in ("_versions", "srd", "srd52", "basicRules", "basicRules2024", "hasFluff", "hasFluffImages", "reprintedAs", "subraces"):
        out.pop(key, None)
    overwrite = sub.pop("overwrite", None) or {}
    for key in ("raceName", "raceSource", "alias", "page", "otherSources", "hasFluff", "hasFluffImages", "reprintedAs", "srd", "basicRules"):
        sub.pop(key, None)
    if sub.get("name"):
        out["_subraceName"] = sub["name"]
        out["name"] = getSubraceName(out["name"], sub.pop("name"))
    else:
        sub.pop("name", None)
    if sub.get("ability"):
        if overwrite.get("ability") or not out.get("ability") or len(out["ability"]) != len(sub["ability"]):
            out["ability"] = [{} for _ in sub["ability"]]
        for i, block in enumerate(sub.pop("ability")):
            out["ability"][i].update(block)
    if sub.get("entries"):
        for ent in sub.pop("entries"):
            target = (ent.get("data") or {}).get("overwrite") if isinstance(ent, dict) else None
            index = next((i for i, it in enumerate(out.get("entries", [])) if target and isinstance(it, dict) and str(it.get("name", "")).strip().lower() == target.strip().lower()), -1)
            if index >= 0:
                out["entries"][index] = ent
            else:
                out.setdefault("entries", []).append(ent)
    for key in ("traitTags", "languageProficiencies"):
        if sub.get(key):
            out[key] = sub.pop(key) if overwrite.get(key) else (out.get(key) or []) + sub.pop(key)
    if sub.get("skillProficiencies"):
        theirs = sub.pop("skillProficiencies")
        mine = out.get("skillProficiencies")
        if not mine or overwrite.get("skillProficiencies") or len(theirs) != 1 or len(mine) != 1:
            out["skillProficiencies"] = theirs
        else:
            out["skillProficiencies"] = [{**mine[0], **theirs[0]}]
    out.update(sub)
    return {k: v for k, v in out.items() if v is not None}


def _subrace_label(sr: dict) -> str:
    return sr.get("name") or "Standard"


def lineages(race: dict, sources: set[str] | None = None) -> list[tuple[str, dict]]:
    """[(kortnavn, fuld race)] for afstamningerne: `_versions` (XPHB), ellers ældre kilders subraces.
    Subraces filtreres på de tilladte kilder (`sources`). Tom liste, hvis racen ingen har."""
    if race.get("_versions"):
        return [(lineage_label(v["name"]), v) for v in versions.expand(race)]
    return [(_subrace_label(sr), merge_subrace(race, sr)) for sr in e.subraces(race, sources)]


def effective(race: dict, lineage: str | None, sources: set[str] | None = None) -> dict:
    """Den valgte afstamnings fulde race, ellers racen selv (uden valgt afstamning)."""
    for label, version in lineages(race, sources):
        if lineage and label.lower() == str(lineage).lower():
            return version
    return race


def needs_lineage(race: dict, lineage: str | None, sources: set[str] | None = None) -> bool:
    return bool(lineages(race, sources)) and effective(race, lineage, sources) is race


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


# ── Racers egen evnebonus (ældre kilder; 2024 flyttede den til baggrunden) ───────────
ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")


def ability_alternatives(race: dict) -> list[dict]:
    """Racens evne-blokke (alternativer at vælge imellem). `lineage: "VRGR"` uden egen ability
    betyder frit +2/+1 eller +1/+1/+1 (5etools tilføjer det selv for ældre/klassiske racer)."""
    blocks = race.get("ability")
    if blocks:
        return blocks
    if race.get("lineage") == "VRGR" and race.get("edition") in (None, "classic"):
        every = list(ABILITY_KEYS)
        return [{"choose": {"weighted": {"from": every, "weights": [2, 1]}}}, {"choose": {"weighted": {"from": every, "weights": [1, 1, 1]}}}]
    return []


def ability_label(block: dict) -> str:
    """Kort tekst for en evne-blok, bruges som valgmulighed når der er flere blokke."""
    parts = [f"{'+' if v > 0 else ''}{v} {k.upper()}" for k, v in block.items() if k in ABILITY_KEYS]
    choose = block.get("choose") or {}
    if choose.get("weighted"):
        parts.append(", ".join(f"{'+' if w > 0 else ''}{w}" for w in choose["weighted"]["weights"]) + " (valgfri evner)")
    elif choose.get("from"):
        parts.append(f"+{choose.get('amount', 1)} til {choose.get('count', 1)} valgfri")
    return ", ".join(parts)


def ability_bonus(race: dict, stored: dict) -> dict[str, int]:
    """Evnebonus fra racen ud fra valgene: faste værdier + `ability_pick` (liste, +amount hver) +
    `ability_w<n>` (vægtet: n'te vægt til den valgte evne). Valgt blok = `ability_option` (første, hvis kun én)."""
    blocks = ability_alternatives(race)
    if not blocks:
        return {}
    if len(blocks) > 1:
        labels = [ability_label(b) for b in blocks]
        if stored.get("ability_option") not in labels:
            return {}
        block = blocks[labels.index(stored["ability_option"])]
    else:
        block = blocks[0]
    out = {k.upper(): v for k, v in block.items() if k in ABILITY_KEYS}
    choose = block.get("choose") or {}
    if choose.get("weighted"):
        for i, weight in enumerate(choose["weighted"]["weights"]):
            picked = stored.get(f"ability_w{i}")
            if isinstance(picked, str):
                out[picked.upper()] = out.get(picked.upper(), 0) + weight
    elif choose.get("from"):
        picks = stored.get("ability_pick")
        for picked in picks if isinstance(picks, list) else [picks]:
            if isinstance(picked, str):
                out[picked.upper()] = out.get(picked.upper(), 0) + choose.get("amount", 1)
    return out


def fixed_proficiencies(race: dict) -> dict[str, list[str]]:
    """Faste armor-/våbentræning (5etools: `true`-felter). Våbennavne som 'battleaxe|phb' gøres læsbare."""
    def true_keys(blocks):
        return [k for block in blocks or [] for k, v in block.items() if v is True]
    weapons = [k.split("|")[0] for k in true_keys(race.get("weaponProficiencies"))]
    return {"armor": true_keys(race.get("armorProficiencies")), "weapons": weapons}
