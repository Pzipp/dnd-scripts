"""Karakterbyggerens tilstandsmaskine: choices.yaml ind, beregnet state ud.

Alt regel-ansvar ligger her og i e5tools.py (server-side) - JS i browseren
tegner bare det, den får. "Andet / hjemmelavet" springer e5tools-opslag over
og gemmer kun fritekst, som Felis (Kvists race) allerede gør i dag.

Valg af race/klasse/baggrund gemmes som {name, source}, ikke bare et navn,
fordi indstillingssiden kan slå flere kildebøger til - så kan samme navn
findes i mere end én bog (settings.py styrer hvilke kilder der er tilladt).

classes er en dict keyed på et stabilt id (ikke en liste), så multiclass
understøttes: hver klasse har sit eget niveau, subclass og valg. Et dict
(ikke liste) betyder dot-path-felterne ("classes.<id>.level") virker med de
samme generiske _get_path/_set_path som alt andet, uden særlig listehåndtering.
Den først tilføjede klasse (indsættelsesrækkefølgen) er "primær" og giver
startudstyret, som i reglerne.
"""
from __future__ import annotations

import re
import uuid
from pathlib import Path

import yaml

from . import e5tools as e
from . import settings

OTHER = "Andet (hjemmelavet)"
ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]


# ── choices.yaml: indlæsning, gemning, tom skabelon ──────────────────────────
def empty_character() -> dict:
    return {
        "race": {"name": None, "source": None, "other_name": "", "choices": {}},
        "classes": {},  # {class_id: {name, source, level, subclass, choices}}
        "background": {"name": None, "source": None, "choices": {}},
        "abilities": {"method": None, "rolls": {}, "assigned": {}},
        "hp_rolls": {},
        "feats": {},  # {slot_key: {name, source, choices}} - slot_key er "<class_id>_<niveau>" for ASI, eller "race"/"background"
        "spells": {"known": []},  # kun hvilke spells karakteren kender - prepared/known pr. dag styres af de printede kort, ikke her
        "equipment": {"class_package": None, "background_package": None, "extra": []},
    }


def new_class_entry() -> dict:
    return {"name": None, "source": None, "level": 1, "subclass": None, "choices": {}}


def total_level(data: dict) -> int:
    return sum(c.get("level", 0) for c in data.get("classes", {}).values())


def primary_class_id(data: dict) -> str | None:
    """Den først tilføjede klasse (dict bevarer indsættelsesrækkefølge) - den der giver startudstyr."""
    return next(iter(data.get("classes", {})), None)


def choices_path(character_dir: Path) -> Path:
    return character_dir / "choices.yaml"


def load(character_dir: Path) -> dict:
    path = choices_path(character_dir)
    if not path.is_file():
        return empty_character()
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    template = empty_character()
    template.update(data)
    return template


def save(character_dir: Path, data: dict) -> None:
    choices_path(character_dir).write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )


def add_class(data: dict) -> str:
    class_id = uuid.uuid4().hex[:6]
    data.setdefault("classes", {})[class_id] = new_class_entry()
    return class_id


def remove_class(data: dict, class_id: str) -> None:
    data.get("classes", {}).pop(class_id, None)
    data["feats"] = {k: v for k, v in data.get("feats", {}).items() if not k.startswith(f"{class_id}_")}


# ── dot-path ind i choices-dict ───────────────────────────────────────────
def _get_path(data: dict, path: str):
    obj = data
    for part in path.split("."):
        if obj is None:
            return None
        obj = obj.get(part) if isinstance(obj, dict) else None
    return obj


def _set_path(data: dict, path: str, value) -> None:
    parts = path.split(".")
    obj = data
    for part in parts[:-1]:
        obj = obj.setdefault(part, {})
    obj[parts[-1]] = value


def _is_empty(value) -> bool:
    """Semantisk tom: {} og {"a": [], "b": {}} er begge 'intet at miste'."""
    if value in (None, "", [], {}):
        return True
    if isinstance(value, dict):
        return not any(not _is_empty(v) for v in value.values())
    if isinstance(value, list):
        return not any(not _is_empty(v) for v in value)
    return False


# ── hvad rydder et felt, hvis det ændres? ────────────────────────────────
def _dependent_fields(path: str, data: dict) -> list[str]:
    if path == "race.name":
        return ["race.other_name", "race.choices", "feats.race"]
    m = re.match(r"^classes\.([^.]+)\.name$", path)
    if m:
        cid = m.group(1)
        deps = [f"classes.{cid}.subclass", f"classes.{cid}.choices", "spells"]
        deps += [f"feats.{k}" for k in data.get("feats", {}) if k.startswith(f"{cid}_")]
        if cid == primary_class_id(data):
            deps.append("equipment.class_package")
        return deps
    if path == "background.name":
        return ["background.choices", "equipment.background_package", "feats.background"]
    if path.startswith("feats.") and path.endswith(".name"):
        return [path[: -len(".name")] + ".choices"]
    return []


def _subclass_level_for(class_entry: dict, sources: set[str]) -> int:
    name = class_entry.get("name")
    source = class_entry.get("source")
    if not name or not e.available():
        return 99
    for f in e.class_features(name, {source} if source else sources, 99):
        if "Subclass" in f.get("name", ""):
            return f.get("level", 99)
    return 99


def set_fields(data: dict, changes: dict, confirmed: bool = False) -> dict:
    """Sæt en eller flere felter atomisk. changes er {dot-path: værdi}.
    Returnerer {'ok': True} og ændrer data, eller {'ok': False, 'to_clear': [...],
    'message': ...} hvis et felt har afhængige valg, der ikke er bekræftet ryddet."""
    sources = settings.allowed_sources()
    to_clear: list[str] = []

    for path, value in changes.items():
        level_match = re.match(r"^classes\.([^.]+)\.level$", path)
        if level_match:
            # Niveau-sænkning på én klasse rydder kun DEN klasses subclass/ASI-slots,
            # aldrig ved forhøjelse (så valg ikke bliver spurgt om ved almindelig oprykning).
            cid = level_match.group(1)
            entry = data.get("classes", {}).get(cid, {})
            old_level, new_level = entry.get("level", 0), int(value)
            if new_level < old_level:
                if entry.get("subclass") and new_level < _subclass_level_for(entry, sources):
                    to_clear.append(f"classes.{cid}.subclass")
                to_clear += [
                    f"feats.{k}" for k in data.get("feats", {})
                    if k.startswith(f"{cid}_") and int(k.split("_")[-1]) > new_level
                ]
            continue
        if _get_path(data, path) == value:
            continue
        to_clear += _dependent_fields(path, data)

    to_clear = list(dict.fromkeys(f for f in to_clear if not _is_empty(_get_path(data, f))))
    if to_clear and not confirmed:
        return {"ok": False, "to_clear": to_clear,
                "message": f"Ændres dette, ryddes valg der afhænger af det nuværende svar ({', '.join(to_clear)})."}

    for path, value in changes.items():
        _set_path(data, path, value)
    blank = empty_character()
    for field in to_clear:
        # ".choices" på et dynamisk id (fx "classes.<id>.choices") findes ikke i
        # blank-skabelonen (kun statiske stier gør) - ryd til {} direkte i stedet.
        default = {} if field.endswith(".choices") else _get_path(blank, field)
        _set_path(data, field, default)
    return {"ok": True}


# ── beregnet state til frontend ──────────────────────────────────────────
def _label_options(entries: list[dict]) -> list[dict]:
    """[{name, source}] -> [{name, source, label}]. Suffiks med kilde kun hvis
    samme navn findes under mere end én tilladt kilde."""
    by_name: dict[str, int] = {}
    for entry in entries:
        by_name[entry["name"]] = by_name.get(entry["name"], 0) + 1
    out = []
    for entry in entries:
        label = entry["name"]
        if by_name[entry["name"]] > 1:
            label += f" ({entry['source']})"
        out.append({**entry, "label": label})
    return out


def _describe_equipment_entry(entry: dict) -> str:
    if "value" in entry:
        gp = entry["value"] / 100
        return f"{gp:.0f} GP" if gp == int(gp) else f"{entry['value']} CP"
    if "item" in entry:
        item = e.get_item(entry["item"])
        name = item["name"] if item else entry["item"].split("|")[0].title()
        quantity = entry.get("quantity")
        return f"{quantity}x {name}" if quantity else name
    if "equipmentType" in entry:
        labels = {
            "setGaming": "a Gaming Set of your choice", "setArtisan": "an Artisan's Tools of your choice",
            "instrumentMusical": "a Musical Instrument of your choice",
        }
        return labels.get(entry["equipmentType"], entry["equipmentType"])
    return str(entry)


def _resolve_package(entries: list[dict]) -> list[str]:
    return [_describe_equipment_entry(item) for item in entries]


ALL_SKILLS = [
    "acrobatics", "animal handling", "arcana", "athletics", "deception", "history",
    "insight", "intimidation", "investigation", "medicine", "nature", "perception",
    "performance", "persuasion", "religion", "sleight of hand", "stealth", "survival",
]


def _skills_from_choose(block) -> tuple[list[str], int]:
    """startingProficiencies.skills / racers skillProficiencies - choose-wrapped,
    'any N' (frit blandt alle skills), eller en fast dict uden valg."""
    if not block:
        return [], 0
    if isinstance(block, list):
        block = block[0]
    if "choose" in block:
        c = block["choose"]
        return c.get("from", []), c.get("count", 1)
    if "any" in block:
        return ALL_SKILLS, block["any"]
    return [], 0


def _feat_grant(obj: dict | None) -> dict | None:
    """Første feat-tildeling fra en race/baggrund: enten en fast feat (ingen valg)
    eller et valg blandt en feat-kategori ({'anyFromCategory': {...}}, fx Human)."""
    if not obj:
        return None
    entries = obj.get("feats") or []
    if not entries:
        return None
    grant = entries[0]
    if "anyFromCategory" in grant:
        c = grant["anyFromCategory"]
        return {"type": "choice", "category": (c.get("category") or ["G"])[0], "count": c.get("count", 1)}
    feat_id = next(iter(grant), None)
    return {"type": "fixed", "id": feat_id} if feat_id else None


def _meets_prerequisite(feat: dict, level: int, assigned: dict) -> bool:
    """prerequisite er en liste af ALTERNATIVER (opfyld én); inden i ét alternativ
    skal niveau OG alle evne-krav være opfyldt."""
    prereqs = feat.get("prerequisite")
    if not prereqs:
        return True
    for alt in prereqs:
        if alt.get("level", 0) > level:
            continue
        if all(
            (assigned.get(ability.upper()) or 0) >= minimum
            for req in (alt.get("ability") or [])
            for ability, minimum in req.items()
        ):
            return True
    return False


def _sub_choice_complete(sc: dict, stored_value) -> bool:
    """ASI's undervalg er to felter (mode + 1-2 evner), ikke bare 'findes værdien'."""
    if sc.get("type") == "asi":
        if not isinstance(stored_value, dict) or not stored_value.get("mode"):
            return False
        if stored_value["mode"] == "2":
            return bool(stored_value.get("ability1"))
        return bool(stored_value.get("ability1")) and bool(stored_value.get("ability2"))
    return bool(stored_value)


def _feat_sub_choices(feat_obj: dict, sources: set[str]) -> list[dict]:
    """Et valgt feats egne undervalg. Feat-JSON'ens 'ability'-felt er IKKE
    pålideligt - det optræder på feats hvor selve teksten slet ikke giver en
    evne-forbedring (fx Weapon Master), så det bruges ikke generisk. De to
    kendte særtilfælde er specialhåndteret i stedet for gættet ud fra data."""
    choices = []
    skills_from, count = _skills_from_choose(feat_obj.get("skillProficiencies"))
    if skills_from:
        choices.append({"id": "skill", "title": f"Skill ({count})", "options": skills_from, "multiple": count > 1})
    for block in (feat_obj.get("skillToolLanguageProficiencies") or [{}])[0].get("choose", []):
        if "anySkill" in (block.get("from") or []):
            n = block.get("count", 1)
            choices.append({"id": "skill_any", "title": f"Skill ({n}, blandt alle)", "options": ALL_SKILLS, "multiple": n > 1})
    if feat_obj.get("name") == "Ability Score Improvement":
        choices.append({"id": "asi", "type": "asi", "title": "Evne-forbedring", "options": ABILITIES})
    if feat_obj.get("name") == "Weapon Master":
        weapon_names = sorted(w["name"] for w in e.weapons(sources))
        choices.append({"id": "weapon", "title": "Våben (Mastery Property)", "options": weapon_names, "multiple": False})
    return choices


# 5etools markerer features, der giver en feat, med {@filter ...feat|feats|category=XX}
# i selve teksten - det er et systematisk, maskinlæsbart signal, ikke et gæt.
# Ability Score Improvement er undtagelsen: den bruger {@feat ...} i stedet, så den
# kendes på navn. Features uden nogen af delene (fx "vælg 3 våben") har INGEN
# strukturerede data overhovedet og kan kun opdages ved selv at læse teksten -
# "Weapon Mastery" er håndteret eksplicit nedenfor, flere kan dukke op senere.
_FEAT_CATEGORY_TAG = re.compile(r"\{@filter[^}|]*\|feats\|category=(\w+)")


def _feature_feat_category(feature: dict) -> str | None:
    if feature.get("name") == "Ability Score Improvement":
        return "G"
    m = _FEAT_CATEGORY_TAG.search(e.raw_text(feature.get("entries", [])))
    return m.group(1) if m else None


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _weapon_mastery_choice(class_obj: dict, level: int, sources: set[str]) -> dict | None:
    count = e.class_table_value(class_obj, "Weapon Mastery", level)
    if not count:
        return None
    weapon_names = sorted(w["name"] for w in e.weapons(sources))
    return {"id": "weapon_mastery", "title": f"Weapon Mastery ({count} våben)", "options": weapon_names, "multiple": True, "count": count}


def state(data: dict) -> dict:
    if not e.available():
        return {"choices": data, "e5tools_available": False, "missing": ["e5tools"]}

    sources = settings.allowed_sources()
    missing = []
    level = total_level(data)
    assigned_abilities = data["abilities"].get("assigned", {})

    # race
    race_name = data["race"].get("name")
    race_source = data["race"].get("source")
    race_obj = e.get_race(race_name, {race_source} if race_source else sources) if (race_name and race_name != OTHER) else None
    race_options = _label_options([{"name": r["name"], "source": r["source"]} for r in e.races(sources)]) + [{"name": OTHER, "source": None, "label": OTHER}]
    race_sub_choices = []
    race_grant = _feat_grant(race_obj)
    race_traits = []
    if race_obj:
        skills_from, count = _skills_from_choose(race_obj.get("skillProficiencies"))
        if skills_from:
            race_sub_choices.append({"id": "skill", "title": f"Skill ({count})", "options": skills_from, "multiple": count > 1})
        for lineage in race_obj.get("additionalSpells", []) or []:
            if lineage.get("name"):
                race_sub_choices.append({"id": "lineage", "title": "Lineage", "options": [s["name"] for s in race_obj["additionalSpells"]]})
                break
        for trait in race_obj.get("entries", []) or []:
            if isinstance(trait, dict) and trait.get("name"):
                race_traits.append({"name": trait["name"], "text": e.render_text(trait.get("entries", []))})
    if not race_name:
        missing.append("race.name")

    def _add_feat_slot(key: str, label: str, category: str) -> dict:
        candidates = [ft for ft in e.feats_by_category(category, sources) if _meets_prerequisite(ft, level, assigned_abilities)]
        options = _label_options([{"name": ft["name"], "source": ft["source"]} for ft in candidates])
        chosen = data["feats"].get(key)
        slot = {"key": key, "label": label, "options": options, "chosen": chosen, "text": "", "sub_choices": []}
        if chosen:
            feat_obj = e.get_feat(chosen["name"], {chosen["source"]})
            if feat_obj:
                slot["text"] = e.render_text(feat_obj["entries"])
                slot["sub_choices"] = _feat_sub_choices(feat_obj, sources)
                stored = chosen.get("choices", {})
                for sc in slot["sub_choices"]:
                    if not _sub_choice_complete(sc, stored.get(sc["id"])):
                        missing.append(f"feats.{key}.choices.{sc['id']}")
        else:
            missing.append(f"feats.{key}")
        return slot

    race_feat_slot = _add_feat_slot("race", f"Race ({race_name})", race_grant["category"]) if race_grant and race_grant["type"] == "choice" else None

    # classes (multiclass: hver klasse har sit eget niveau og sin egen progression)
    class_options = _label_options([{"name": n, "source": "XPHB"} for n in e.class_names()]) if "XPHB" in sources else []
    classes_state = []
    primary_id = primary_class_id(data)
    for cid, entry in data.get("classes", {}).items():
        class_name = entry.get("name")
        class_source = entry.get("source")
        class_level = entry.get("level", 1)
        class_obj = e.get_class(class_name, {class_source} if class_source else sources) if class_name else None
        skills_from, skills_count = ([], 0)
        subclass_options = []
        subclass_level = 99
        features = []
        is_caster = False
        spell_options = []
        if class_obj:
            sp = class_obj.get("startingProficiencies", {})
            skills_from, skills_count = _skills_from_choose(sp.get("skills"))
            features = e.class_features(class_name, {class_source}, class_level)
            subclass_level = _subclass_level_for(entry, {class_source})
            if class_level >= subclass_level:
                subclass_options = _label_options([{"name": s["name"], "source": s["source"]} for s in e.subclasses(class_name, {class_source})])
            is_caster = "spellcastingAbility" in class_obj
            if entry.get("subclass"):
                subclass_obj = next((s for s in e.subclasses(class_name, {class_source}) if s.get("name") == entry["subclass"]), None)
                subclass_short = subclass_obj.get("shortName") if subclass_obj else entry["subclass"]
                subclass_feats_by_level = {}
                for sf in e.subclass_features(class_name, subclass_short, {class_source}, class_level):
                    subclass_feats_by_level.setdefault(sf["level"], []).append(sf)
                merged = []
                for f in features:
                    if f["name"].strip().lower() == "subclass feature" and f["level"] in subclass_feats_by_level:
                        merged += subclass_feats_by_level.pop(f["level"])
                    else:
                        merged.append(f)
                for leftover_level in sorted(subclass_feats_by_level):
                    merged += subclass_feats_by_level[leftover_level]
                merged.sort(key=lambda f: f["level"])
                features = merged
            if is_caster:
                spell_options = [s["name"] for s in e.class_spells(class_name, {class_source}, class_level)]
            if skills_count and len(entry["choices"].get("skills", [])) < skills_count:
                missing.append(f"classes.{cid}.choices.skills")
            if class_level >= subclass_level and not entry.get("subclass"):
                missing.append(f"classes.{cid}.subclass")
        if not class_name:
            missing.append(f"classes.{cid}.name")

        features_out = []
        for f in features:
            feat_slot = None
            weapon_choice = None
            category = _feature_feat_category(f)
            if category:
                feat_slot = _add_feat_slot(f"{cid}_{f['level']}_{_slug(f['name'])}", f"{class_name} niveau {f['level']}", category)
            if f["name"] == "Weapon Mastery" and class_obj:
                weapon_choice = _weapon_mastery_choice(class_obj, class_level, sources)
                if weapon_choice:
                    stored = entry["choices"].get("weapon_mastery", [])
                    weapon_choice["chosen"] = stored
                    if len(stored) < weapon_choice["count"]:
                        missing.append(f"classes.{cid}.choices.weapon_mastery")
            features_out.append({
                "name": f["name"], "level": f["level"], "text": e.render_text(f.get("entries", [])),
                "feat_slot": feat_slot, "weapon_choice": weapon_choice,
            })

        classes_state.append({
            "id": cid, "name": class_name, "source": class_source, "level": class_level,
            "is_primary": cid == primary_id,
            "options": class_options,
            "skills_from": skills_from, "skills_count": skills_count,
            "subclass_options": subclass_options, "subclass_level": subclass_level, "subclass": entry.get("subclass"),
            "features": features_out,
            "is_caster": is_caster, "spell_options": spell_options,
        })
    if not data.get("classes"):
        missing.append("classes")

    # background
    background_name = data["background"].get("name")
    background_source = data["background"].get("source")
    background_obj = e.get_background(background_name, {background_source} if background_source else sources) if background_name else None
    background_options = _label_options([{"name": b["name"], "source": b["source"]} for b in e.backgrounds(sources)])
    background_feat = None
    background_abilities = []
    background_grant = _feat_grant(background_obj)
    if background_obj:
        if background_grant and background_grant["type"] == "fixed":
            feat_obj = e.get_feat(background_grant["id"].split("|")[0].title(), sources)
            background_feat = {
                "name": feat_obj["name"] if feat_obj else background_grant["id"],
                "text": e.render_text(feat_obj["entries"]) if feat_obj else "",
            }
        ability = background_obj.get("ability") or []
        if len(ability) == 2:
            background_abilities = ability[0]["choose"]["weighted"]["from"]
        if not data["background"]["choices"].get("ability_split"):
            missing.append("background.choices.ability_split")
    if not background_name:
        missing.append("background.name")

    background_feat_slot = _add_feat_slot("background", f"Baggrund ({background_name})", background_grant["category"]) if background_grant and background_grant["type"] == "choice" else None

    # abilities
    method = data["abilities"].get("method")
    if not method:
        missing.append("abilities.method")
    elif len(data["abilities"].get("assigned", {})) < 6:
        missing.append("abilities.assigned")

    # hp (fra niveau 2, samlet karakterniveau på tværs af alle klasser)
    hp_levels = list(range(2, level + 1))
    for n in hp_levels:
        if str(n) not in data.get("hp_rolls", {}):
            missing.append(f"hp_rolls.{n}")

    # udstyr: kun den primære (først valgte) klasse giver startudstyr, som i reglerne
    primary_entry = data.get("classes", {}).get(primary_id, {}) if primary_id else {}
    primary_class_obj = e.get_class(primary_entry.get("name"), {primary_entry.get("source")}) if primary_entry.get("name") else None
    class_equipment_raw = (primary_class_obj or {}).get("startingEquipment", {}).get("defaultData", [{}])[0]
    background_equipment_raw = (background_obj or {}).get("startingEquipment", [{}])[0]
    class_packages = {k: _resolve_package(v) for k, v in sorted(class_equipment_raw.items())}
    background_packages = {k: _resolve_package(v) for k, v in sorted(background_equipment_raw.items())}
    if class_packages and not data["equipment"].get("class_package"):
        missing.append("equipment.class_package")
    if background_packages and not data["equipment"].get("background_package"):
        missing.append("equipment.background_package")

    return {
        "choices": data,
        "e5tools_available": True,
        "missing": missing,
        "total_level": level,
        "race": {
            "options": race_options, "sub_choices": race_sub_choices, "is_other": race_name == OTHER,
            "traits": race_traits, "feat_slot": race_feat_slot,
        },
        "class_options": class_options,
        "classes": classes_state,
        "background": {
            "options": background_options, "feat": background_feat, "ability_options": background_abilities,
            "feat_slot": background_feat_slot,
        },
        "hp_levels": hp_levels,
        "equipment": {"class_packages": class_packages, "background_packages": background_packages},
    }
