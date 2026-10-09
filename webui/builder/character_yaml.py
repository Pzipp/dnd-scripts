"""character.yaml: beregnet, engelsk-nøglet sammenregning af en choices.yaml-
karakters stats, til brug for arket (Print-fanen).

Findes choices.yaml for karakteren, er character.yaml en AFLEDT fil - den
genberegnes og overskrives af derive_and_save() hver gang choices.yaml gemmes,
ligesom model.state() allerede genberegnes ved hvert API-kald. Kun
choices.yaml er kilden til sandhed i det tilfælde.

Findes choices.yaml IKKE, er character.yaml i stedet den primære fil -
skrevet direkte (af builder-UI'en uden choices.yaml, eller af et LLM) - og
røres aldrig herfra.

Et par felter kan ikke udledes SIKKERT af choices.yaml, fordi reglen kræver
data choices.yaml ikke tracker (AC: hvilken rustning er udstyret nu;
languages: hvilke sprog en valgfri tildeling gav) - de får kun en fornuftig
STANDARDFORMEL herfra og bevares bagefter fra en eksisterende character.yaml
i stedet for at blive overskrevet igen, se PRESERVED_FIELDS. Spilleren retter
dem i hånden.

`initiative` var tidligere i samme kategori (Alert-feat'ets "+PB til
initiativ" findes kun som fri engelsk prosa i 5etools' data, intet
struktureret felt) - det er den LLM-baserede effects-udtræk (se effects.py)
nu løser: _apply_effects() folder høj-konfidens, permanente effects (fundet
af samme LLM-kald som descriptions.py/cards.py bruger) ind i formlen hver
gang. initiative er derfor IKKE et PRESERVED_FIELD længere - den genberegnes
altid, og overskriver bevidst en evt. manuel rettelse, hvis en høj-konfidens
effect findes (aftalt med brugeren: enkelt og forudsigeligt, fremfor en
stille "kun hvis uændret"-regel).
"""
from __future__ import annotations

from pathlib import Path

import yaml

from . import e5tools as e
from . import effects
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

# Felter character.yaml kun giver en standardformel til, og ellers bevarer
# fra en eksisterende fil (se modul-docstring) - render.py skal ALDRIG
# selv regne eller feat-tjekke disse, kun læse dem som alle andre tal.
# initiative er IKKE med her - se modul-docstring: den genberegnes altid,
# inkl. effects.py's høj-konfidens permanente effects.
PRESERVED_FIELDS = ("ac", "languages")


def _hit_dice_pool(data: dict, sources: set[str]) -> list[dict]:
    """Hit Dice poolet efter terningtype, PHB 2024s multiclass-regel: "If the
    Hit Dice are the same die type, you can simply pool them together...
    If your classes give you Hit Dice of different types, keep track of
    them separately." Fx Fighter 5/Paladin 5 (begge d10) -> [{die: 10,
    count: 10}]; Paladin 5/Cleric 5 (d10+d8) -> [{die:10,count:5},{die:8,count:5}]."""
    pool: dict[int, int] = {}
    for entry in data.get("classes", {}).values():
        class_source = {entry["source"]} if entry.get("source") else sources
        class_obj = e.get_class(entry.get("name"), class_source) if entry.get("name") else None
        faces = (class_obj or {}).get("hd", {}).get("faces", 8)
        pool[faces] = pool.get(faces, 0) + entry.get("level", 0)
    return [{"die": faces, "count": count} for faces, count in sorted(pool.items(), reverse=True)]


def _hp(data: dict, primary_id: str | None, primary_hit_die: int, con_mod: int, total_level: int) -> int | None:
    """Summen af alle klassers hp_rolls (se model.py's state(): kun
    PRIMÆRklassens niveau 1 er implicit max/ikke gemt - en sekundær klasses
    EGEN niveau 1 ER med, fordi karakteren ikke er "a 1st-level character"
    når den multiclasses ind i den, PHB 2024) + CON-mod × total niveau.
    Sidste led (ikke kun × (total_level-1) som tidligere) gør selv en
    retroaktiv CON-ændring korrekt: "When your Constitution modifier
    increases by 1, your hit point maximum increases by 1 for each level
    you have attained" - alle niveauer regnes om, ikke kun fremtidige.
    None hvis et påkrævet niveau mangler et terningslag."""
    hp_rolls = data.get("hp_rolls", {})
    total = primary_hit_die
    for cid, entry in data.get("classes", {}).items():
        class_level = entry.get("level", 0)
        required_levels = range(2, class_level + 1) if cid == primary_id else range(1, class_level + 1)
        rolls = hp_rolls.get(cid, {})
        for lvl in required_levels:
            value = rolls.get(str(lvl))
            if value is None:
                return None
            total += value
    return total + con_mod * total_level


def _apply_effects(entries: list[dict], initiative_formula: str, hp: int | None, total_level: int) -> tuple[str, int | None]:
    """Folder høj-konfidens, PERMANENTE effects (se effects.py) ind i
    initiative-formlen og HP - de to eneste targets, der rent faktisk er
    bygget en anvendelse for (se docs/llm-effect-extraction-prompt.md).
    Andre targets (ac, saves, skills, resistances, darkvision, speed) er
    gemt i _effects.yaml, men IKKE foldet ind nogen steder endnu."""
    for eff in effects.high_confidence_effects(entries):
        target, kind, value = eff.get("target"), eff.get("type"), str(eff.get("value", ""))
        if target == "initiative" and kind == "add":
            term = value.removeprefix("ability:")
            if term and f"+{term}" not in initiative_formula:
                initiative_formula = initiative_formula[:-1] + f"+{term}" + "}"
        elif target == "hp_per_level" and kind == "add" and hp is not None:
            try:
                hp += int(value) * total_level
            except ValueError:
                pass
    return initiative_formula, hp


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
        "hit_dice": [],
        "ac": "{10+DEX}",
        "initiative": "{+DEX}",
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


def _ability_bonuses(data: dict, state: dict, sources: set[str]) -> dict[str, int]:
    """Evne-bonusser der IKKE er en del af grundscoren i abilities.assigned:
    baggrundens ability_split (2024-reglen flyttede racernes evne-bonus til
    baggrunden) og hver ASI-feats valgte +2/+1-fordeling (se
    docs/choices-yaml.md#undervalg). Inkluderer også feats' FASTE
    evne-forbedring (fx Durable: altid +1 CON), men kun når husreglen
    half_feats er slået til - samme betingelse som model.py's egen
    _add_feat_slot bruger til at vise den."""
    bonuses = {a: 0 for a in model.ABILITIES}

    split = (data.get("background", {}).get("choices") or {}).get("ability_split") or {}
    if split.get("type") == "2-1":
        if split.get("plus2"):
            bonuses[split["plus2"].upper()] += 2
        if split.get("plus1"):
            bonuses[split["plus1"].upper()] += 1
    elif split.get("type") == "1-1-1":
        for ability in state.get("background", {}).get("ability_options") or []:
            bonuses[ability.upper()] += 1

    half_feats = data.get("settings", {}).get("half_feats", False)
    for feat_entry in data.get("feats", {}).values():
        if not feat_entry or not feat_entry.get("name"):
            continue
        asi = (feat_entry.get("choices") or {}).get("asi")
        if asi:
            ability1, ability2 = (asi.get("ability1") or "").upper(), (asi.get("ability2") or "").upper()
            if asi.get("mode") == "2" and ability1 in bonuses:
                bonuses[ability1] += 2
            elif asi.get("mode") == "1-1":
                if ability1 in bonuses:
                    bonuses[ability1] += 1
                if ability2 in bonuses:
                    bonuses[ability2] += 1
        if half_feats:
            feat_source = {feat_entry["source"]} if feat_entry.get("source") else sources
            feat_obj = e.get_feat(feat_entry["name"], feat_source)
            fixed_ability = (feat_obj or {}).get("ability") or [{}]
            fixed_ability = fixed_ability[0]
            if fixed_ability and not fixed_ability.get("choose"):
                for ability, amount in fixed_ability.items():
                    if ability.upper() in bonuses:
                        bonuses[ability.upper()] += amount
    return bonuses


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
    # state() beregnes før vi kan kende ability_options for '1-1-1'-fordelingen,
    # men den afhænger kun af baggrund/feats, ikke af selve evnescoren - rækkefølgen er ok.
    bonuses = _ability_bonuses(data, state, sources)
    final_abilities = {a: assigned[a] + bonuses[a] for a in model.ABILITIES if a in assigned}
    con_mod = _mod(final_abilities.get("CON", 10))
    hit_die = (primary_class_obj or {}).get("hd", {}).get("faces", 8)
    hit_dice = _hit_dice_pool(data, sources)
    hp = _hp(data, primary_id, hit_die, con_mod, total_level) if assigned.get("CON") is not None else None

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
        # clean_text(): disse strenge kan indeholde rå 5etools-markup, fx
        # "{@filter Light|items|...}" - uden den bliver {...} fejlagtigt
        # tolket som en udregnet formel af karakterark.py's skabelon-motor.
        if sp.get("armor"):
            can_use["armor"] = ", ".join(e.clean_text(a) for a in sp["armor"])
        if sp.get("weapons"):
            can_use["weapons"] = ", ".join(e.clean_text(w) for w in sp["weapons"])

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

    initiative_formula, hp = _apply_effects(
        feats + spells_known + class_features + race_traits, "{+DEX}", hp, total_level
    )

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
        "abilities": final_abilities,
        "proficiency_bonus": PROFICIENCY_BONUS_BY_LEVEL.get(total_level, 2),
        "hp": hp,
        "hit_dice": hit_dice,  # poolet efter terningtype across klasser, se _hit_dice_pool()
        "ac": "{10+DEX}",  # overskrives af PRESERVED_FIELDS-bevaring i derive_and_save, ikke afledt (se modul-docstring)
        "initiative": initiative_formula,  # standard + evt. høj-konfidens effects (fx Alert) - se _apply_effects()
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
