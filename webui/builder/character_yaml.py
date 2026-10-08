"""character.yaml: beregnet, engelsk-nøglet sammenregning af en choices.yaml-
karakters stats, til brug for arket (Print-fanen).

Findes choices.yaml for karakteren, er character.yaml en AFLEDT fil - den
genberegnes og overskrives af derive_and_save() hver gang choices.yaml gemmes,
ligesom model.state() allerede genberegnes ved hvert API-kald. Kun
choices.yaml er kilden til sandhed i det tilfælde.

Findes choices.yaml IKKE, er character.yaml i stedet den primære fil -
skrevet direkte (af builder-UI'en uden choices.yaml, eller af et LLM) - og
røres aldrig herfra.

Et par felter kan ikke udledes af choices.yaml uden at opfinde en regel, der
ikke findes nogen steder i 5etools' data eller i den eksisterende builder
(fx AC, som også i den gamle karakter.yaml er et frit felt spilleren selv
sætter ud fra sin rustning). De felter bevares derfor fra en eksisterende
character.yaml i stedet for at blive overskrevet - se PRESERVED_FIELDS.
"""
from __future__ import annotations

from pathlib import Path

import yaml

from . import e5tools as e
from . import model

# D&D 2024 (PHB)-reglens faste Proficiency Bonus pr. level - ikke noget nogen
# vælger, derfor sikkert at opslå som tabel i stedet for at bede spilleren om det.
PROFICIENCY_BONUS_BY_LEVEL = {
    **{lvl: 2 for lvl in range(1, 5)},
    **{lvl: 3 for lvl in range(5, 9)},
    **{lvl: 4 for lvl in range(9, 13)},
    **{lvl: 5 for lvl in range(13, 17)},
    **{lvl: 6 for lvl in range(17, 21)},
}

# Felter character.yaml IKKE udregner/overskriver, fordi der ikke findes en
# opslåelig regel for dem (se modul-docstring) - bevares fra en eksisterende fil.
PRESERVED_FIELDS = ("ac", "languages")


def empty_character_sheet() -> dict:
    return {
        "name": "",
        "level": 1,
        "race": {"name": None, "source": None},
        "background": {"name": None, "source": None},
        "classes": [],
        "abilities": {},
        "proficiency_bonus": 2,
        "hp": None,
        "ac": "{10+DEX}",
        "speed": 30,
        "hit_die": 8,
        "saves": [],
        "skills": [],
        "expertise": [],
        "tools": [],
        "languages": "Common",
        "can_use": {},
        "masteries": [],
        "feats": [],
        "spells_known": [],
        "class_features": [],
        "race_traits": [],
        "extra_training": [],
        "summary": [],
    }


def character_path(character_dir: Path) -> Path:
    return character_dir / "character.yaml"


def load(character_dir: Path) -> dict:
    path = character_path(character_dir)
    if not path.is_file():
        return empty_character_sheet()
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    template = empty_character_sheet()
    template.update(data)
    return template


def save(character_dir: Path, data: dict) -> None:
    character_path(character_dir).write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )


def _mod(score: int) -> int:
    return (score - 10) // 2


def _all_choice_blocks(data: dict) -> list[dict]:
    blocks = [data.get("race", {}).get("choices", {}), data.get("background", {}).get("choices", {})]
    blocks += [c.get("choices", {}) for c in data.get("classes", {}).values()]
    blocks += [f.get("choices", {}) for f in data.get("feats", {}).values() if f]
    return blocks


def _collect(data: dict, *keys: str) -> list[str]:
    """Samler en undervalg-nøgle (se docs/choices-yaml.md#undervalg) fra alle
    race/klasse/baggrund/feat-valg - fx alle 'skill'/'skills'/'skill_any'
    tilsammen, uanset hvor de kom fra."""
    out: list[str] = []
    for block in _all_choice_blocks(data):
        for key in keys:
            value = block.get(key)
            if isinstance(value, list):
                out.extend(v for v in value if v)
            elif value:
                out.append(value)
    return out


def derive_from_state(data: dict, state: dict) -> dict:
    """Bygger character.yamls indhold ud fra choices.yaml (data) og det
    allerede beregnede model.state(data) (state) - ingen ny regelberegning,
    kun opslag af et par felter state() ikke selv eksponerer (PB, hit die,
    saves, rustnings-/vaabentræning) og omlægning af resten."""
    sources = set(data.get("settings", {}).get("allowed_sources") or {"XPHB"})
    total_level = model.total_level(data)
    primary_id = model.primary_class_id(data)
    primary_entry = data.get("classes", {}).get(primary_id, {}) if primary_id else {}
    primary_class_obj = (
        e.get_class(primary_entry.get("name"), {primary_entry.get("source")} if primary_entry.get("source") else sources)
        if primary_entry.get("name") else None
    )

    assigned = data.get("abilities", {}).get("assigned", {})
    con_mod = _mod(assigned.get("CON", 10))
    hit_die = (primary_class_obj or {}).get("hd", {}).get("faces", 8)
    hp_rolls = data.get("hp_rolls", {})
    hp = None
    if assigned.get("CON") is not None and len(hp_rolls) >= max(total_level - 1, 0):
        hp = hit_die + con_mod + sum(hp_rolls.values()) + con_mod * (total_level - 1)

    saves = [s.upper() for s in (primary_class_obj or {}).get("proficiency", [])]

    race_name, race_source = data["race"].get("name"), data["race"].get("source")
    background_name, background_source = data["background"].get("name"), data["background"].get("source")
    background_obj = e.get_background(background_name, {background_source} if background_source else sources) if background_name else None
    race_obj = e.get_race(race_name, {race_source} if race_source else sources) if (race_name and race_name != model.OTHER) else None
    race_speed = (race_obj or {}).get("speed", 30)
    speed = race_speed.get("walk", 30) if isinstance(race_speed, dict) else (race_speed or 30)

    fixed_skills = []
    fixed_tools = []
    if background_obj:
        fixed_skills = [k for k, v in (background_obj.get("skillProficiencies") or [{}])[0].items() if v]
        fixed_tools = [k for k, v in (background_obj.get("toolProficiencies") or [{}])[0].items() if v]

    skills = sorted({*(s.lower() for s in _collect(data, "skill", "skills", "skill_any")), *fixed_skills})
    tools = sorted({*_collect(data, "tool", "instrument"), *fixed_tools})
    expertise = sorted(set(_collect(data, "expertise")))

    classes_out = [
        {"name": c.get("name"), "source": c.get("source"), "level": c.get("level"), "subclass": c.get("subclass")}
        for c in data.get("classes", {}).values()
    ]

    can_use = {}
    if primary_class_obj:
        sp = primary_class_obj.get("startingProficiencies", {})
        if sp.get("armor"):
            can_use["armor"] = ", ".join(sp["armor"])
        if sp.get("weapons"):
            can_use["weapons"] = ", ".join(sp["weapons"])

    known_spell_names = data.get("spells", {}).get("known") or []
    spells_known = []
    for name in known_spell_names:
        spell = e.get_spell(name, sources)
        spells_known.append({"name": name, "source": spell["source"] if spell else None})

    feats = [
        {"name": f["name"], "source": f.get("source")}
        for f in data.get("feats", {}).values() if f and f.get("name")
    ]

    race_traits = [
        {"name": t["name"], "source": race_source}
        for t in (state.get("race", {}).get("traits") or [])
    ]
    class_features = [
        {"class": c["name"], "name": f["name"], "source": c["source"], "level": f["level"]}
        for c in state.get("classes", [])
        for f in c.get("features", [])
    ]

    summary = [
        [label, value] for label, value in [
            ("Klasse", ", ".join(f"{c['name']} {c['level']}" for c in classes_out if c["name"])),
            ("Art", race_name or ""),
            ("Baggrund", background_name or ""),
        ] if value
    ]

    return {
        "name": "",  # sættes af derive_and_save ud fra mappenavnet - choices.yaml har ikke selv et navnefelt
        "level": total_level,
        "race": {"name": race_name, "source": race_source},
        "background": {"name": background_name, "source": background_source},
        "classes": classes_out,
        "abilities": dict(assigned),
        "proficiency_bonus": PROFICIENCY_BONUS_BY_LEVEL.get(total_level, 2),
        "hp": hp,
        "ac": "{10+DEX}",  # overskrives af PRESERVED_FIELDS-bevaring i derive_and_save, ikke afledt (se modul-docstring)
        "speed": speed,
        "hit_die": hit_die,
        "saves": saves,
        "skills": skills,
        "expertise": expertise,
        "tools": tools,
        "languages": "Common",  # overskrives af PRESERVED_FIELDS-bevaring i derive_and_save, ikke afledt (se modul-docstring)
        "can_use": can_use,
        "masteries": [],  # se docs/character-yaml.md: ikke udledt endnu (mangler sikker opslagsvej til mastery pr. våben)
        "feats": feats,
        "spells_known": spells_known,
        "class_features": class_features,
        "race_traits": race_traits,
        "extra_training": [],
        "summary": summary,
    }


def derive_and_save(character_dir: Path, data: dict) -> dict | None:
    """Afleder og gemmer character.yaml, men kun hvis choices.yaml findes
    (model.choices_path) - en håndskrevet character.yaml uden choices.yaml
    røres ikke. Bevarer PRESERVED_FIELDS fra en evt. eksisterende fil."""
    if not model.choices_path(character_dir).is_file():
        return None
    state = model.state(data)
    if not state.get("e5tools_available", True):
        return None
    derived = derive_from_state(data, state)
    derived["name"] = character_dir.name.replace("-", " ").title()
    existing = load(character_dir)  # henter standardværdier for PRESERVED_FIELDS, selv uden en eksisterende fil
    for field in PRESERVED_FIELDS:
        derived[field] = existing.get(field, derived.get(field))
    save(character_dir, derived)
    return derived
