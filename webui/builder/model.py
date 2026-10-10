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
from . import feat_rules
from . import races
from . import settings
from . import spell_grants

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
        "equipment": {"class_package": None, "background_package": None, "extra": [], "armor": {"name": None, "source": None}, "shield": False},
        "languages": {"known": []},  # PHB 2024 kap. 2: Common (fast) + 2 valgt/rullet fra Standard Languages-tabellen
        # Pr. karakter, ikke delt - to gruppemedlemmer kan have forskellige
        # tilladte kilder/husregler i gang samtidig.
        "settings": {"allowed_sources": list(settings.DEFAULT_SOURCES)},
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
    if path == "race.choices.lineage":
        # En anden afstamning har andre resistance-/spell-muligheder og -størrelse.
        stale = ("resist", "spell_ability", "size")
        return [f"race.choices.{k}" for k in (data.get("race", {}).get("choices") or {}) if k in stale or k.startswith(("spell_", "b0_", "b1_"))]
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
    sources = set(data.get("settings", {}).get("allowed_sources") or settings.DEFAULT_SOURCES)
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


def _meets_prerequisite(feat: dict, level: int, assigned: dict, has_spellcasting: bool, armor_profs: frozenset = frozenset()) -> bool:
    """prerequisite er en liste af ALTERNATIVER (opfyld én); inden i ét alternativ
    skal niveau, evt. spellcasting2020-krav (Spellcasting/Pact Magic feature),
    rustningstræning (`proficiency`, fx Heavily Armored kræver Medium) OG alle
    evne-krav være opfyldt. `feature` (Fighting Style) og `otherSummary` er
    allerede opfyldt, når feat'et tilbydes i det slot, der giver dem."""
    prereqs = feat.get("prerequisite")
    if not prereqs:
        return True
    for alt in prereqs:
        if alt.get("level", 0) > level:
            continue
        if alt.get("spellcasting2020") and not has_spellcasting:
            continue
        if any(a not in armor_profs for a in feat_rules.required_armor(alt)):
            continue
        if all(
            (assigned.get(ability.upper()) or 0) >= minimum
            for req in (alt.get("ability") or [])
            for ability, minimum in req.items()
        ):
            return True
    return False


def _armor_proficiencies(data: dict, sources: set[str]) -> frozenset:
    """Rustningstræning (light/medium/heavy/shield) fra karakterens klasser (primær = start-,
    øvrige = multiclass-træning) og fra valgte feats' faste armorProficiencies."""
    out: set[str] = set()
    primary = primary_class_id(data)
    for cid, entry in data.get("classes", {}).items():
        obj = e.get_class(entry.get("name"), {entry.get("source")} if entry.get("source") else sources) if entry.get("name") else None
        if not obj:
            continue
        prof = obj.get("startingProficiencies", {}) if cid == primary else obj.get("multiclassing", {}).get("proficienciesGained", {})
        out |= set(feat_rules._true_keys(prof.get("armorProficiencies")))
    for chosen in (data.get("feats") or {}).values():
        if chosen and chosen.get("name"):
            feat_obj = e.get_feat(chosen["name"], {chosen["source"]} if chosen.get("source") else sources)
            if feat_obj:
                out |= set(feat_rules.fixed_grants(feat_obj)["armor"])
    return frozenset(out)


def _class_has_spellcasting(entry: dict, sources: set[str]) -> bool:
    """Spellcasting/Pact Magic-featuren kan komme fra selve klassen (fuld/halv
    caster) eller fra en valgt subclass (fx Arcane Trickster, Eldritch Knight) -
    begge steder markeres det med "spellcastingAbility" i class-JSON'en."""
    name = entry.get("name")
    if not name:
        return False
    class_sources = {entry["source"]} if entry.get("source") else sources
    class_obj = e.get_class(name, class_sources)
    if not class_obj:
        return False
    if "spellcastingAbility" in class_obj:
        return True
    subclass_name = entry.get("subclass")
    if subclass_name:
        subclass_obj = next((s for s in e.subclasses(name, class_sources) if s.get("name") == subclass_name), None)
        if subclass_obj and "spellcastingAbility" in subclass_obj:
            return True
    return False


def _meets_ability_requirement(primary_ability: list | None, assigned: dict) -> bool:
    """primaryAbility er en liste af ALTERNATIVER (opfyld ét); inden i ét
    alternativ skal alle nævnte evner være 13+. Bruges til multiclass-kravet:
    'at least 13 in the primary ability of the new class and your current
    classes' - gælder altså hver involveret klasse for sig, ikke kun den nye."""
    if not primary_ability:
        return True
    for alt in primary_ability:
        if all((assigned.get(ability.upper()) or 0) >= 13 for ability in alt):
            return True
    return False


def _multiclass_class_options(data: dict, cid: str, assigned: dict, sources: set[str]) -> list[dict]:
    """Klasser der reelt kan vælges til et IKKE-primært klasse-slot: kræver
    13+ i den nye klasses primære evne, OG at alle allerede valgte klasser
    (den primære og evt. andre) stadig selv opfylder deres eget krav.

    Et allerede valgt navn på DETTE slot holdes altid med i listen, uanset
    evnekravet - ellers forsvinder det valgte navn fra <select>'en, så snart
    evnerne ikke (endnu) er udfyldt, og brugeren tror fejlagtigt at klassen
    skal vælges forfra (hvilket rydder dens skills/valg unødigt)."""
    current_name = data.get("classes", {}).get(cid, {}).get("name")
    requirement_met = True
    for other_cid, other_entry in data.get("classes", {}).items():
        if other_cid == cid or not other_entry.get("name"):
            continue
        other_sources = {other_entry["source"]} if other_entry.get("source") else sources
        other_obj = e.get_class(other_entry["name"], other_sources)
        if other_obj and not _meets_ability_requirement(other_obj.get("primaryAbility"), assigned):
            requirement_met = False
            break
    eligible = []
    if requirement_met:
        eligible = [{"name": c["name"], "source": c["source"]} for c in e.classes(sources)
                    if _meets_ability_requirement(c.get("primaryAbility"), assigned)]
    if current_name and not any(c["name"] == current_name for c in eligible):
        current_source = data.get("classes", {}).get(cid, {}).get("source") or "XPHB"
        eligible.append({"name": current_name, "source": current_source})
    return _label_options(eligible)


def _sub_choice_complete(sc: dict, stored_value) -> bool:
    """ASI's undervalg er to felter (mode + 1-2 evner), ikke bare 'findes værdien'.
    Et "unknown"- eller "fixed"-valg (se _unknown_choice og
    _spell_choices_from_block) har ingen muligheder brugeren selv skal vælge
    mellem og skal derfor ikke stå som varigt "mangler" - det er en
    oplysning, ikke noget der skal udfyldes."""
    if sc.get("unknown") or sc.get("fixed"):
        return True
    if sc.get("type") == "asi":
        if not isinstance(stored_value, dict) or not stored_value.get("mode"):
            return False
        if stored_value["mode"] == "2":
            return bool(stored_value.get("ability1"))
        return bool(stored_value.get("ability1")) and bool(stored_value.get("ability2"))
    if sc.get("count", 1) > 1 and isinstance(stored_value, list):
        return len(stored_value) >= sc["count"]
    return bool(stored_value)


def _unknown_choice(id_: str, title: str) -> dict:
    """Et valg vi VED findes (der er et filter/choose-felt i data), men ikke
    kan udlede konkrete muligheder for - fx et filter-felt vi ikke genkender,
    eller et filter der (med nuværende kilder) ikke matcher noget. Vises i
    stedet for stiltiende at udelade valget helt, så det ikke ser ud som om
    feat'et ikke giver noget valg."""
    return {"id": id_, "title": title, "unknown": True, "options": [], "multiple": False}


_SPELL_FILTER_KEYS = {"level", "school", "class", "components & miscellaneous", "spell attack"}


def _parse_spell_filter(filter_str: str) -> dict | None:
    """'level=1|school=I;N' -> {'level': '1', 'school': 'I;N'}. None hvis
    filteret bruger et felt vi slet ikke genkender - så det bevidst
    springes over i stedet for at vise en forkert/tom liste."""
    parsed = {}
    for part in filter_str.split("|"):
        if "=" not in part:
            return None
        key, value = part.split("=", 1)
        key = key.strip()
        if key not in _SPELL_FILTER_KEYS:
            return None
        parsed[key] = value.strip()
    return parsed


def _spells_for_filter(parsed: dict, sources: set[str]) -> list[dict]:
    level = int(parsed["level"]) if "level" in parsed else None
    schools = set(parsed["school"].split(";")) if "school" in parsed else None
    class_names = {c.capitalize() for c in parsed["class"].split(";")} if "class" in parsed else None
    ritual = True if parsed.get("components & miscellaneous") == "ritual" else None
    spell_attack = set(parsed["spell attack"].split(";")) if "spell attack" in parsed else None
    spells = e.spells_by_filter(sources, level=level, schools=schools, class_name=class_names, ritual=ritual, spell_attack=spell_attack) or []
    # Flere tilladte kilder kan genoptrykke samme spell (fx PHB 2014 + XPHB
    # 2024) - de to udgaver er IKKE nødvendigvis identiske (se notes.md), så
    # ingen af dem fjernes. I stedet suffikses navnet med kilden, akkurat som
    # _label_options() allerede gør for racer/baggrunde/feats, og KUN når
    # navnet reelt er ambigut (findes under mere end én kandidat her).
    by_name: dict[str, int] = {}
    for s in spells:
        by_name[s["name"]] = by_name.get(s["name"], 0) + 1
    seen: set[tuple[str, str | None]] = set()
    out = []
    for s in spells:
        key = (s["name"], s.get("source"))
        if key in seen:
            continue
        seen.add(key)
        label = s["name"]
        if by_name[s["name"]] > 1:
            label = f"{label} ({s.get('source')})"
        out.append({**s, "name": label})
    return out


def _find_spell_filters(node, found: list, skip_keys: set = frozenset()) -> None:
    """Gennemsøger additionalSpells-træet rekursivt for {'choose': '<filter>'}.
    skip_keys springer en nøgle helt over (bruges til "prepared", som
    håndteres særskilt pga. dens niveau-trappede antal - se _tiered_spell_choice)."""
    if isinstance(node, dict):
        if isinstance(node.get("choose"), str):
            found.append((node["choose"], node.get("count", 1)))
        for k, v in node.items():
            if k not in skip_keys:
                _find_spell_filters(v, found, skip_keys)
    elif isinstance(node, list):
        for v in node:
            _find_spell_filters(v, found, skip_keys)


def _find_fixed_spell_names(node, found: list, skip_keys: set = frozenset()) -> None:
    """Gennemsøger additionalSpells-træet rekursivt for FASTE spell-navne (rene
    strenge som "ray of frost|xphb#c", ikke et {'choose': ...}-valg) - fx
    Telekinetic/Telepathics automatiske cantrip, eller Shadow-Touched's faste
    Invisibility-del ud over selve spell-VALGET. Uden dette var sådan en fast
    tildeling helt usynlig (ingen valg at vise, men heller ingen tekst)."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k not in skip_keys:
                _find_fixed_spell_names(v, found, skip_keys)
    elif isinstance(node, list):
        for v in node:
            if isinstance(v, str):
                found.append(v.split("|")[0].split("#")[0].strip())
            else:
                _find_fixed_spell_names(v, found, skip_keys)


def _tiered_spell_choice(prepared: dict, sources: set[str], level: int, id_: str) -> dict | None:
    """additionalSpells' "prepared"-form (Ritual Caster) giver FLERE spells,
    hvor antallet vokser med karakterens niveau (nøglerne er de niveauer, hvor
    endnu et spell låses op - fx Ritual Casters Proficiency Bonus-trin 1/5/9/
    13/17) - lægges sammen for alle trin op til nuværende niveau, i stedet for
    ét fast "count" som alle andre additionalSpells-former."""
    if not isinstance(prepared, dict) or not all(str(k).isdigit() for k in prepared):
        return None
    total = 0
    filter_str = None
    for tier_level, entries in prepared.items():
        if int(tier_level) > level:
            continue
        for entry in entries:
            if isinstance(entry, dict) and isinstance(entry.get("choose"), str):
                filter_str = filter_str or entry["choose"]
                total += entry.get("count", 1)
    if not filter_str or not total:
        return None
    parsed = _parse_spell_filter(filter_str)
    if not parsed:
        return _unknown_choice(id_, f"Spell ({total})")
    spells = _spells_for_filter(parsed, sources)
    if not spells:
        return _unknown_choice(id_, f"Spell ({total})")
    return {"id": id_, "title": f"Spell ({total})", "options": [s["name"] for s in spells], "multiple": total > 1}


def _spell_choices_from_block(block: dict, sources: set[str], level: int, id_prefix: str = "", include_ability: bool = True) -> list[dict]:
    choices = []
    block_ability = block.get("ability")
    if include_ability and isinstance(block_ability, dict) and isinstance(block_ability.get("choose"), list):
        choices.append({"id": f"{id_prefix}ability", "title": "Spellcasting-evne", "options": [a.upper() for a in block_ability["choose"]], "multiple": False})
    tiered = _tiered_spell_choice(block.get("prepared"), sources, level, f"{id_prefix}spell_prepared")
    if tiered:
        choices.append(tiered)
    found: list = []
    _find_spell_filters(block, found, skip_keys={"prepared"})
    for i, (filter_str, count) in enumerate(found):
        title = f"Spell ({count})" if count > 1 else "Spell"
        parsed = _parse_spell_filter(filter_str)
        if not parsed:
            choices.append(_unknown_choice(f"{id_prefix}spell_{i}", title))
            continue
        spells = _spells_for_filter(parsed, sources)
        if not spells:
            choices.append(_unknown_choice(f"{id_prefix}spell_{i}", title))
            continue
        choices.append({
            "id": f"{id_prefix}spell_{i}", "title": title,
            "options": [s["name"] for s in spells], "multiple": count > 1,
        })
    fixed_names: list = []
    _find_fixed_spell_names(block, fixed_names, skip_keys={"prepared", "ability"})
    if fixed_names:
        resolved = []
        for raw in dict.fromkeys(fixed_names):  # dedupliker, bevar rækkefølge
            spell = e.get_spell(raw, sources) or e.get_spell(raw, {"XPHB"})
            resolved.append(spell["name"] if spell else raw.title())
        choices.append({"id": f"{id_prefix}spell_fixed", "title": "Spell (automatisk)", "fixed": True, "options": resolved, "multiple": len(resolved) > 1})
    return choices


def _additional_spell_choices(feat_obj: dict, sources: set[str], stored: dict, level: int, known_spells: set[str]) -> list[dict]:
    """Nogle feats giver 'vælg et spell der opfylder X' (Shadow-Touched,
    Fey-Touched, Blessed Warrior, Druidic Warrior, Ritual Caster m.fl.) via
    additionalSpells' strukturerede "choose"-filterstrenge - data-drevet,
    ikke navn-specialtilfælde.

    Feats med FLERE alternative, navngivne blokke (Magic Initiates "Cleric
    Spells"/"Druid Spells"/"Wizard Spells") kræver først et valg af HVILKEN
    blok, før resten af valgene giver mening - det bliver sit eget "origin"-
    valg, og de underliggende spell-valg beregnes først, når det er besvaret
    (læses fra stored, samme mønster som alle andre undervalg).

    Alle ANDRE former med flere blokke (ikke alle navngivne) betyder at man
    får ALT fra hver blok SAMTIDIG, ikke et valg mellem dem - derfor
    behandles hver blok for sig. Cold Caster er en undtagelse herfra, se
    dens eget tjek nedenfor: dens to blokke er IKKE additive, men et
    enten/eller betinget af om Ray of Frost allerede er kendt."""
    blocks = feat_obj.get("additionalSpells") or []
    if not blocks:
        return []
    if feat_obj.get("name") == "Cold Caster":
        # Egen tekst: "You learn the Ray of Frost cantrip. If you already
        # know it, you learn a different Wizard cantrip of your choice." -
        # det er IKKE begge dele samtidig (de to additionalSpells-blokke er
        # ikke additive her), men den ene ELLER den anden, betinget af om
        # Ray of Frost allerede står i spells.known. Evne-valget (hvilken
        # evne der bruges til spellcasting) er allerede dækket af feat'ets
        # EGNE ability-valg i _feat_sub_choices (samme felt som
        # ability-forbedringen - se den for hvorfor), så det udelades her.
        if "Ray of Frost" in known_spells:
            # "... en ANDEN Wizard-cantrip" - Ray of Frost kendes allerede,
            # så den giver ikke mening som mulighed i dette valg.
            choices = _spell_choices_from_block(blocks[1], sources, level, include_ability=False)
            for c in choices:
                if isinstance(c.get("options"), list):
                    c["options"] = [o for o in c["options"] if o != "Ray of Frost"]
            return choices
        return [{"id": "spell_fixed", "title": "Spell (automatisk)", "fixed": True, "options": ["Ray of Frost"], "multiple": False}]
    if len(blocks) > 1 and all(b.get("name") for b in blocks):
        origins = [b["name"].removesuffix(" Spells") for b in blocks]
        choices = [{"id": "origin", "title": "Oprindelse (spell-liste)", "options": origins, "multiple": False}]
        chosen_origin = stored.get("origin")
        block = next((b for b in blocks if b["name"].removesuffix(" Spells") == chosen_origin), None)
        if block:
            choices += _spell_choices_from_block(block, sources, level, id_prefix="origin_")
        return choices
    if len(blocks) == 1:
        return _spell_choices_from_block(blocks[0], sources, level)
    choices = []
    for i, block in enumerate(blocks):
        choices += _spell_choices_from_block(block, sources, level, id_prefix=f"b{i}_")
    return choices


# 5etools' tildelings-nøgler for "vælg et værktøj": hvilken gruppe, valgets id, titel og værktøjstyper.
_TOOL_CATEGORIES = {
    "anyMusicalInstrument": ("instrument", "Musikinstrument", {"INS"}),
    "anyArtisansTool": ("artisan_tool", "Artisan's Tool", {"AT"}),
    "anyGamingSet": ("gaming_set", "Gaming Set", {"GS"}),
    "anyTool": ("tool_any", "Tool", {"AT", "INS", "GS", "T"}),
    "any": ("tool_any", "Tool", {"AT", "INS", "GS", "T"}),
}
# Ord i `choose.from`, der betyder en hel gruppe i stedet for ét værktøj.
_TOOL_WORDS = {
    "musical instrument": "anyMusicalInstrument", "anyMusicalInstrument": "anyMusicalInstrument",
    "gaming set": "anyGamingSet", "anyGamingSet": "anyGamingSet",
    "anyArtisansTool": "anyArtisansTool", "artisan's tools": "anyArtisansTool",
    "anyTool": "anyTool",
}


def _tool_pool(types: set[str], sources: set[str]) -> list[str]:
    return sorted({t["name"] for t in e.tools(sources) if (t.get("type") or "").split("|")[0] in types})


def _tool_choices(blocks, sources: set[str]) -> list[dict]:
    """Værktøjsvalg fra et `toolProficiencies`-felt (feat, race, baggrund):
    * `anyGamingSet: 1` / `anyArtisansTool: 1` / `anyMusicalInstrument: 1` / `any: 1`: vælg N frit
      blandt gruppen. Hver gruppe har sit eget valg-id (gaming_set, artisan_tool, instrument, tool_any).
    * `choose: {from: [...], count}`: navngivne værktøjer og/eller grupper (ældre baggrunde)."""
    block = (blocks or [{}])[0]
    choices = []
    for key, (id_, label, types) in _TOOL_CATEGORIES.items():
        n = block.get(key)
        if isinstance(n, int) and not isinstance(n, bool) and n > 0:
            choices.append({"id": id_, "title": f"{label} ({n})" if n > 1 else label, "options": _tool_pool(types, sources), "multiple": n > 1, "count": n})
    choose = block.get("choose") or {}
    if choose.get("from"):
        n = choose.get("count", 1)
        by_lower = {t["name"].lower(): t["name"] for t in e.tools(sources)}
        options: list[str] = []
        for entry in choose["from"]:
            group = _TOOL_WORDS.get(entry)
            if group:
                options += _tool_pool(_TOOL_CATEGORIES[group][2], sources)
            else:
                options.append(by_lower.get(entry.lower(), entry[:1].upper() + entry[1:]))
        choices.append({"id": "tool", "title": f"Tool ({n})" if n > 1 else "Tool", "options": sorted(dict.fromkeys(options)), "multiple": n > 1, "count": n})
    return choices


def _feat_sub_choices(feat_obj: dict, sources: set[str], stored: dict, level: int, known_spells: set[str]) -> list[dict]:
    """Et valgt feats egne undervalg, læst fra 5etools' strukturerede felter
    (se feat_rules.py for deres betydning). Kun det, dataene ikke siger,
    har navne-undtagelser: Weapon Master og Elemental Adept (valget står kun
    i feat'ens tekst) og Ability Score Improvement (egen +2/+1-dialog)."""
    choices = []
    skills_from, count = _skills_from_choose(feat_obj.get("skillProficiencies"))
    if skills_from:
        choices.append({"id": "skill", "title": f"Skill ({count})", "options": skills_from, "multiple": count > 1})
    for block in (feat_obj.get("skillToolLanguageProficiencies") or [{}])[0].get("choose", []):
        from_ = block.get("from") or []
        n = block.get("count", 1)
        # "anySkill"+"anyTool" sammen (Skilled) er ÉT kombineret valg - samme
        # tæller dækker begge typer, ikke to separate puljer. Skills (små
        # bogstaver) og værktøjsnavne (stort forbogstav) er allerede visuelt
        # adskilte i listen uden behov for et ekstra præfiks.
        pool = []
        if "anySkill" in from_:
            pool += ALL_SKILLS
        if "anyTool" in from_:
            pool += sorted(t["name"] for t in e.tools(sources))
        if pool:
            label = "/".join(p[3:].capitalize() for p in from_ if p.startswith("any"))
            choices.append({"id": "skill_any", "title": f"{label} ({n}, blandt alle)", "options": pool, "multiple": n > 1})
    if feat_obj.get("name") == "Ability Score Improvement":
        choices.append({"id": "asi", "type": "asi", "title": "Evne-forbedring", "options": ABILITIES})
    if feat_obj.get("name") == "Weapon Master":
        weapon_names = sorted(w["name"] for w in e.weapons(sources))
        choices.append({"id": "weapon", "title": "Våben (Mastery Property)", "options": weapon_names, "multiple": False})
    if feat_obj.get("name") == "Elemental Adept":
        # Damage-typen her står kun som fritekst i entries, ikke som et
        # struktureret choose-felt (modsat fx Epic Boons' resist-valg) - ingen
        # systematisk måde at opdage det på, derfor specialhåndteret som Weapon Master.
        choices.append({"id": "damage_type", "title": "Skadetype (Energy Mastery)", "options": ["Acid", "Cold", "Fire", "Lightning", "Thunder"], "multiple": False})
    ability = feat_rules.ability_choice(feat_obj)
    if ability:
        # ÉT valg kan styre flere ting: +1 til evnen, og hvis feat'et siger det
        # (samme evne-liste i savingThrowProficiencies, eller additionalSpells.
        # ability == "inherit"), også saving throw-træning og spellcasting-evne.
        parts = [f"+{ability['amount']}"]
        if feat_rules.saves_linked_to_ability(feat_obj):
            parts.append("saving throw-træning")
        if feat_rules.spell_ability_from_choice(feat_obj):
            parts.append("spellcasting-evne")
        title = "Evne (" + " og ".join(parts) + (f", op til {ability['max']})" if ability["max"] != feat_rules.DEFAULT_ABILITY_MAX else ")")
        choices.append({"id": "ability", "title": title, "options": ability["from"], "multiple": False})
    save_from = feat_rules._choose_from(feat_obj.get("savingThrowProficiencies"))
    if save_from and not feat_rules.saves_linked_to_ability(feat_obj):
        choices.append({"id": "save", "title": "Saving throw-træning", "options": [a.upper() for a in save_from], "multiple": False})
    resist_choose = (feat_obj.get("resist") or [{}])[0].get("choose", {})
    if resist_choose.get("from"):
        n = resist_choose.get("count", 1)
        choices.append({"id": "resist", "title": f"Resistance ({n})", "options": [r.capitalize() for r in resist_choose["from"]], "multiple": n > 1})
    choices += _tool_choices(feat_obj.get("toolProficiencies"), sources)
    expertise = (feat_obj.get("expertise") or [{}])[0]
    if expertise.get("anyProficientSkill"):
        n = expertise["anyProficientSkill"]
        choices.append({"id": "expertise", "title": f"Expertise ({n}, blandt dine proficiencies)", "options": ALL_SKILLS, "multiple": n > 1})
    choices += _additional_spell_choices(feat_obj, sources, stored, level, known_spells)
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


def _proficient_skills(data: dict, background_obj: dict | None) -> list[str]:
    """Alle skills karakteren er trænet i (klasse-, race-, feat-valg + baggrundens
    faste) - de eneste, Expertise kan vælges blandt."""
    found: set[str] = set()
    blocks = [data.get("race", {}).get("choices", {}), data.get("background", {}).get("choices", {})]
    blocks += [c.get("choices", {}) for c in data.get("classes", {}).values()]
    blocks += [f.get("choices", {}) for f in data.get("feats", {}).values() if f]
    for block in blocks:
        for key in ("skill", "skills", "skill_any"):
            value = block.get(key)
            found.update(v.lower() for v in (value if isinstance(value, list) else [value]) if v)
    if background_obj:
        found.update(k for k, v in (background_obj.get("skillProficiencies") or [{}])[0].items() if v)
    return [s for s in ALL_SKILLS if s in found]


_SCHOLAR_SKILLS = ["arcana", "history", "investigation", "medicine", "nature", "religion"]


def _expertise_keys(class_name: str, feature: dict) -> str | None:
    """Choices-nøglen for en feature, der giver Expertise (ellers None):
    'expertise_<niveau>' for Expertise/Deft Explorer, 'scholar' for Wizards Scholar."""
    if feature["name"] in ("Expertise", "Deft Explorer"):
        return f"expertise_{feature['level']}"
    if class_name == "Wizard" and feature["name"] == "Scholar":
        return "scholar"
    return None


def _expertise_choice(data: dict, cid: str, class_name: str, feature: dict, text: str, proficient: list[str]) -> dict | None:
    """Ét Expertise-valg pr. feature (Rogue niv. 1 og 6, Bard 2 og 9, Ranger
    Deft Explorer 2 og Expertise 9, Wizard Scholar). Antal fra featurens tekst
    (Deft Explorer og Scholar: 1), Scholar kun 6 faste skills. En skill kan kun
    få Expertise én gang på tværs af alle valg og klasser."""
    key = _expertise_keys(class_name, feature)
    if not key:
        return None
    if key == "scholar" or feature["name"] == "Deft Explorer":
        count = 1
    else:
        m = re.search(r"\b(one|two|three)\b", text, re.I)
        count = _NUMBER_WORDS[m.group(1).lower()] if m else 2
    taken = set()
    for ocid, oentry in data.get("classes", {}).items():
        for okey, values in oentry.get("choices", {}).items():
            if (okey.startswith("expertise_") or okey == "scholar") and not (ocid == cid and okey == key):
                taken.update(values)
    pool = [s for s in proficient if s in _SCHOLAR_SKILLS] if key == "scholar" else proficient
    title = "Scholar (1 skill, kun Arcana, History, Investigation, Medicine, Nature, Religion)" if key == "scholar" \
        else f"Expertise ({count} skill{'s' if count > 1 else ''}, blandt dine proficiencies uden Expertise)"
    return {
        "id": key, "title": title, "options": [x for x in pool if x not in taken],
        "chosen": data["classes"][cid]["choices"].get(key, []), "count": count,
    }


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


_NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}


def _weapon_mastery_count(class_obj: dict, level: int, feature_text: str) -> int | None:
    """Antal våben: klassens egen tabelkolonne (Fighter, Barbarian...), ellers
    - for klasser uden kolonne, fx Rogue - tallet i feature-teksten
    ('mastery properties of two kinds of weapons')."""
    count = e.class_table_value(class_obj, "Weapon Mastery", level)
    if count:
        return count
    m = re.search(r"\b(one|two|three|four|five|six)\s+kinds? of\b", feature_text, re.I)
    return _NUMBER_WORDS[m.group(1).lower()] if m else None


_PROPERTY_CODES = {"light": "L", "finesse": "F", "heavy": "H", "reach": "R", "thrown": "T", "versatile": "V"}


def _weapon_prof_predicate(prof: dict):
    """Fra en klasses startingProficiencies (primær) / proficienciesGained
    (sekundær): (weapon_dict) -> bool. Forstår 'simple', 'martial' og
    weaponProficiencies' fromFilter ('type=martial weapon|property=light;finesse')."""
    rules = []  # (kategori, evt. mængde af property-koder)
    for entry in prof.get("weaponProficiencies") or []:
        if entry.get("simple"):
            rules.append(("simple", None))
        if entry.get("martial"):
            rules.append(("martial", None))
        filt = (entry.get("all") or {}).get("fromFilter", "")
        if filt:
            parts = dict(p.split("=", 1) for p in filt.split("|") if "=" in p)
            props = {_PROPERTY_CODES[x] for x in parts.get("property", "").split(";") if x in _PROPERTY_CODES}
            rules.append(("martial" if "martial" in parts.get("type", "") else "simple", props or None))
    if not rules:
        for w in prof.get("weapons") or []:
            low = str(w).lower()
            if low.startswith("simple"):
                rules.append(("simple", None))
            elif low.startswith("martial"):
                rules.append(("martial", None))

    def ok(weapon: dict) -> bool:
        codes = {(p if isinstance(p, str) else p.get("uid", "")).split("|")[0] for p in weapon.get("property", [])}
        return any(weapon.get("weaponCategory") == cat and (props is None or props & codes) for cat, props in rules)
    return ok


def _weapon_mastery_choice(class_obj: dict, level: int, sources: set[str], feature_text: str = "", proficient=None) -> dict | None:
    """Antal fra tabelkolonne/feature-tekst; mulige våben efter feature-teksten:
    'Simple or Martial Melee' = kun nærkamp, 'Simple or Martial' = alle,
    'with which you have proficiency' = kun våben karakteren er trænet i."""
    count = _weapon_mastery_count(class_obj, level, feature_text)
    if not count:
        return None
    pool = e.weapons(sources)
    if "proficiency" in feature_text and proficient:
        pool = [w for w in pool if proficient(w)]
    elif "Melee" in feature_text:
        pool = [w for w in pool if (w.get("type") or "").startswith("M")]
    weapon_names = sorted({w["name"] for w in pool})
    return {"id": "weapon_mastery", "title": f"Weapon Mastery ({count} våben)", "options": weapon_names, "multiple": True, "count": count}


def _character_weapon_predicate(data: dict, sources: set[str]):
    """Union af alle karakterens klassers våbentræning (primær = start-, øvrige = multiclass-træning)."""
    preds = []
    primary = primary_class_id(data)
    for cid, entry in data.get("classes", {}).items():
        obj = e.get_class(entry.get("name"), {entry.get("source")} if entry.get("source") else sources) if entry.get("name") else None
        if obj:
            prof = obj.get("startingProficiencies", {}) if cid == primary else obj.get("multiclassing", {}).get("proficienciesGained", {})
            preds.append(_weapon_prof_predicate(prof))
    return lambda w: any(p(w) for p in preds)


def _spell_use_text(item: dict) -> str:
    return spell_grants.use_text(item["addition"], item.get("recharge"), item.get("uses"))


def race_spell_blocks(eff: dict, stored: dict) -> list[dict]:
    """additionalSpells-blokkene, der gælder for den valgte race/afstamning. Flere NAVNGIVNE
    blokke (ældre kilder uden _versions) er alternativer: kun den valgte afstamnings blok gælder."""
    blocks = eff.get("additionalSpells") or []
    if len(blocks) > 1 and all(b.get("name") for b in blocks):
        chosen = str(stored.get("lineage") or "").lower()
        return [b for b in blocks if b["name"].lower() == chosen]
    return blocks


def _race_spell_choices(eff: dict, sources: set[str], stored: dict) -> list[dict]:
    """Valg og faste spells fra racens (afstamningens) additionalSpells. Spells låses op på et
    karakterniveau (cantrips på 1, større spells på 3 og 5); alle vises, med niveauet angivet."""
    choices = []
    blocks = race_spell_blocks(eff, stored)
    for b_index, block in enumerate(blocks):
        prefix = "" if len(blocks) == 1 else f"b{b_index}_"
        abilities = spell_grants.ability_choice(block)
        if abilities:
            choices.append({"id": f"{prefix}spell_ability", "title": "Spellcasting-evne", "options": abilities, "multiple": False})
        fixed_lines = []
        pick = 0
        for item in spell_grants.walk(block):
            if item["kind"] == "choose":
                parsed = _parse_spell_filter(item["value"])
                spells = _spells_for_filter(parsed, sources) if parsed else []
                title = f"Spell ({item['count']})" if item["count"] > 1 else "Spell"
                id_ = f"{prefix}spell_{pick}"
                pick += 1
                if not spells:
                    choices.append(_unknown_choice(id_, title))
                else:
                    choices.append({"id": id_, "title": title, "options": [sp["name"] for sp in spells], "multiple": item["count"] > 1, "count": item["count"]})
                continue
            uid = spell_grants.parse_uid(item["value"])
            spell = e.get_spell(uid["name"], sources) or e.get_spell(uid["name"], {"XPHB"})
            name = spell["name"] if spell else uid["name"].title()
            extra = [t for t in ("cantrip" if uid["cantrip"] else "", f"fra level {item['level']}" if item["level"] > 1 else "", _spell_use_text(item)) if t]
            fixed_lines.append(f"{name} ({', '.join(extra)})" if extra else name)
        if fixed_lines:
            choices.append({"id": f"{prefix}spell_fixed", "title": "Spells (automatisk)", "fixed": True, "options": fixed_lines, "multiple": len(fixed_lines) > 1})
    return choices


def _race_sub_choices(base: dict, eff: dict, stored: dict, sources: set[str]) -> list[dict]:
    """Alle valg en race giver, læst fra 5etools' felter (se races.py): skill, afstamning (= version),
    størrelse, resistance, værktøj og spells. Felter afstamningen ændrer læses fra den valgte version;
    så længe en race med afstamninger ikke har fået en valgt, vises kun afstamnings-valget først."""
    choices = []
    skills_from, count = _skills_from_choose(eff.get("skillProficiencies"))
    if skills_from:
        choices.append({"id": "skill", "title": f"Skill ({count})", "options": skills_from, "multiple": count > 1, "count": count})
    lineage_options = [label for label, _v in races.lineages(base)]
    if not lineage_options:
        # Ældre kilder: afstamningen er navnet på en additionalSpells-blok.
        named = [b["name"] for b in base.get("additionalSpells") or [] if b.get("name")]
        if named:
            lineage_options = named
    if lineage_options:
        choices.append({"id": "lineage", "title": "Afstamning (Lineage)", "options": lineage_options, "multiple": False})
    pending = bool(lineage_options) and not any(str(stored.get("lineage") or "").lower() == o.lower() for o in lineage_options)
    sizes = races.size_options(eff)
    if len(sizes) > 1:
        choices.append({"id": "size", "title": "Størrelse (Size)", "options": sizes, "multiple": False})
    resist = races.resist_choice(eff)
    if resist and not pending:
        n = resist.get("count", 1)
        choices.append({"id": "resist", "title": f"Resistance ({n})" if n > 1 else "Resistance", "options": [r.capitalize() for r in resist["from"]], "multiple": n > 1, "count": n})
    choices += _tool_choices(eff.get("toolProficiencies"), sources)
    if not pending:
        choices += _race_spell_choices(eff, sources, stored)
    return choices


def state(data: dict) -> dict:
    if not e.available():
        return {"choices": data, "e5tools_available": False, "missing": ["e5tools"]}

    char_settings = data.get("settings", {})
    sources = set(char_settings.get("allowed_sources") or settings.DEFAULT_SOURCES)
    missing = []
    level = total_level(data)
    assigned_abilities = data["abilities"].get("assigned", {})
    has_spellcasting = any(_class_has_spellcasting(entry, sources) for entry in data.get("classes", {}).values())
    known_spells = set(data.get("spells", {}).get("known") or [])
    armor_profs = _armor_proficiencies(data, sources)

    # race
    race_name = data["race"].get("name")
    race_source = data["race"].get("source")
    race_obj = e.get_race(race_name, {race_source} if race_source else sources) if (race_name and race_name != OTHER) else None
    race_options = _label_options([{"name": r["name"], "source": r["source"]} for r in e.races(sources)]) + [{"name": OTHER, "source": None, "label": OTHER}]
    race_sub_choices = []
    race_grant = _feat_grant(race_obj)
    race_traits = []
    if race_obj:
        race_stored = data["race"].get("choices") or {}
        race_eff = races.effective(race_obj, race_stored.get("lineage"))
        race_sub_choices = _race_sub_choices(race_obj, race_eff, race_stored, sources)
        for sc in race_sub_choices:
            if not _sub_choice_complete(sc, race_stored.get(sc["id"])):
                missing.append(f"race.choices.{sc['id']}")
        for trait in race_eff.get("entries", []) or []:
            if isinstance(trait, dict) and trait.get("name"):
                race_traits.append({"name": trait["name"], "text": e.render_text(trait.get("entries", []))})
    if not race_name:
        missing.append("race.name")

    def _add_feat_slot(key: str, label: str, category: str) -> dict:
        candidates = [ft for ft in e.feats_by_category(category, sources) if _meets_prerequisite(ft, level, assigned_abilities, has_spellcasting, armor_profs)]
        chosen = data["feats"].get(key)
        # Et allerede valgt feat holdes altid i options, selvom det ikke længere
        # ville kvalificere (fx niveau faldt, eller en skærpet forudsætning som
        # spellcasting2020 blev tilføjet senere) - ellers forsvinder valget fra
        # sin egen <select>, ser ud som uvalgt, og brugeren risikerer at rydde
        # det ved et uheld (samme fælde som multiclass-klassevælgeren havde).
        if chosen and not any(ft["name"] == chosen["name"] for ft in candidates):
            existing = e.get_feat(chosen["name"], {chosen["source"]})
            if existing:
                candidates = candidates + [existing]
        options = _label_options([{"name": ft["name"], "source": ft["source"]} for ft in candidates])
        slot = {"key": key, "label": label, "options": options, "chosen": chosen, "text": "", "sub_choices": []}
        if chosen:
            feat_obj = e.get_feat(chosen["name"], {chosen["source"]})
            if feat_obj:
                slot["text"] = e.render_text(feat_obj["entries"])
                # Faste (ikke-valgfrie) evne-forbedringer (fx Durable: altid +1 CON).
                fixed = feat_rules.fixed_ability(feat_obj)
                if fixed:
                    bumps = ", ".join(f"+{amount} {ab}" for ab, (amount, _cap) in fixed.items())
                    slot["text"] = f"Evne-forbedring: {bumps}.\n{slot['text']}"
                stored = chosen.get("choices", {})
                slot["sub_choices"] = _feat_sub_choices(feat_obj, sources, stored, level, known_spells)
                for sc in slot["sub_choices"]:
                    if not _sub_choice_complete(sc, stored.get(sc["id"])):
                        missing.append(f"feats.{key}.choices.{sc['id']}")
        else:
            missing.append(f"feats.{key}")
        return slot

    race_feat_slot = _add_feat_slot("race", f"Race ({race_name})", race_grant["category"]) if race_grant and race_grant["type"] == "choice" else None

    # classes (multiclass: hver klasse har sit eget niveau og sin egen progression)
    primary_id = primary_class_id(data)
    class_entries = [{"name": c["name"], "source": c["source"]} for c in e.classes(sources)]
    primary_entry = data.get("classes", {}).get(primary_id, {}) if primary_id else {}
    if primary_entry.get("name") and not any(c["name"] == primary_entry["name"] for c in class_entries):
        class_entries.append({"name": primary_entry["name"], "source": primary_entry.get("source") or "XPHB"})
    class_options = _label_options(class_entries)
    _bg_name, _bg_source = data["background"].get("name"), data["background"].get("source")
    _background_obj = e.get_background(_bg_name, {_bg_source} if _bg_source else sources) if _bg_name else None
    _weapon_proficient = _character_weapon_predicate(data, sources)
    _proficient = _proficient_skills(data, _background_obj)
    classes_state = []
    for cid, entry in data.get("classes", {}).items():
        class_name = entry.get("name")
        class_source = entry.get("source")
        class_level = entry.get("level", 1)
        class_obj = e.get_class(class_name, {class_source} if class_source else sources) if class_name else None
        is_primary_class = cid == primary_id
        skills_from, skills_count = ([], 0)
        subclass_options = []
        subclass_level = 99
        features = []
        is_caster = False
        spell_options = []
        extra_proficiencies = []
        if class_obj:
            # Multiclass (sekundær klasse) giver markant færre proficiencies end
            # at starte som den klasse - se class_obj["multiclassing"] mod
            # ["startingProficiencies"]. Kun den først tilføjede klasse ("primær",
            # giver startudstyr) bruger den fulde startliste.
            if is_primary_class:
                sp = class_obj.get("startingProficiencies", {})
            else:
                sp = class_obj.get("multiclassing", {}).get("proficienciesGained", {})
                for tool in sp.get("tools", []):
                    extra_proficiencies.append(e.clean_text(tool))
                for armor in sp.get("armor", []):
                    extra_proficiencies.append(f"{armor.capitalize()} armor")
            skills_from, skills_count = _skills_from_choose(sp.get("skills"))
            features = e.class_features(class_name, {class_source}, class_level)
            subclass_level = _subclass_level_for(entry, {class_source})
            if class_level >= subclass_level:
                subclass_options = _label_options([{"name": s["name"], "source": s["source"]} for s in e.subclasses(class_name, {class_source})])
            is_caster = _class_has_spellcasting(entry, sources)
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
                weapon_choice = _weapon_mastery_choice(class_obj, class_level, sources, e.render_text(f.get("entries", [])), _weapon_proficient)
                if weapon_choice:
                    stored = entry["choices"].get("weapon_mastery", [])
                    weapon_choice["chosen"] = stored
                    if len(stored) < weapon_choice["count"]:
                        missing.append(f"classes.{cid}.choices.weapon_mastery")
            f_text = e.render_text(f.get("entries", []))
            expertise_choice = _expertise_choice(data, cid, class_name, f, f_text, _proficient) if class_obj else None
            if expertise_choice and len(expertise_choice["chosen"]) < expertise_choice["count"]:
                missing.append(f"classes.{cid}.choices.{expertise_choice['id']}")
            features_out.append({
                "name": f["name"], "level": f["level"], "text": f_text,
                "feat_slot": feat_slot, "weapon_choice": weapon_choice, "expertise_choice": expertise_choice,
            })
        classes_state.append({
            "id": cid, "name": class_name, "source": class_source, "level": class_level,
            "is_primary": is_primary_class, "hit_die": (class_obj or {}).get("hd", {}).get("faces", 8),
            "options": class_options if is_primary_class else _multiclass_class_options(data, cid, assigned_abilities, sources),
            "skills_from": skills_from, "skills_count": skills_count,
            "extra_proficiencies": extra_proficiencies,
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
    background_sub_choices = []
    if background_obj:
        bg_stored = data["background"].get("choices") or {}
        bg_skills, bg_count = _skills_from_choose(background_obj.get("skillProficiencies"))
        if bg_skills:
            background_sub_choices.append({"id": "skill", "title": f"Skill ({bg_count})", "options": bg_skills, "multiple": bg_count > 1, "count": bg_count})
        background_sub_choices += _tool_choices(background_obj.get("toolProficiencies"), sources)
        for sc in background_sub_choices:
            if not _sub_choice_complete(sc, bg_stored.get(sc["id"])):
                missing.append(f"background.choices.{sc['id']}")
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

    # hp (pr. klasse - kun PRIMÆRklassens niveau 1 er implicit max/ikke gemt;
    # en sekundær klasses EGNE niveau 1 ER med her, fordi karakteren ikke er
    # "a 1st-level character" når den multiclasses ind i den, jf. PHB 2024's
    # multiclass-HP-regel - den får samme terningslag/CON-regel som alle
    # andre niveauer, ikke den specielle max-ved-niveau-1-bonus)
    hp_levels = [
        {
            "class_id": c["id"], "name": c["name"], "hit_die": c["hit_die"],
            "levels": list(range(1, c["level"] + 1)) if not c["is_primary"] else list(range(2, c["level"] + 1)),
        }
        for c in classes_state
    ]
    for group in hp_levels:
        stored = data.get("hp_rolls", {}).get(group["class_id"], {})
        for n in group["levels"]:
            if str(n) not in stored:
                missing.append(f"hp_rolls.{group['class_id']}.{n}")

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

    # Armor er valgfrit (ingen rustning er et gyldigt, bare svagere, valg) -
    # derfor ikke i missing. Shield holdes ude af selve dropdownen (type S),
    # den er en separat on/off (kan bæres sammen med enhver rustning).
    # name="" (ikke None) - optionList()/parseCombo() i builder.js forventer
    # tom streng for "intet valgt", samme konvention som race/baggrunds "Vælg..."-pladsholderen.
    armor_options = [{"name": "", "source": None, "label": "Ingen rustning"}] + _label_options(
        [{"name": a["name"], "source": a["source"]} for a in e.armors(sources) if (a.get("type") or "").split("|")[0] != "S"]
    )

    # Sprog: PHB 2024 kap. 2 ("Choose Languages") - Common er fast/implicit,
    # ikke en del af valget her. Ingen øvre grænse tjekkes (samme konvention
    # som klassers skills_count ovenfor - kun "under" flages som missing).
    language_options = _label_options([{"name": l["name"], "source": l["source"]} for l in e.standard_languages(sources)])
    if len(data.get("languages", {}).get("known", [])) < 2:
        missing.append("languages.known")

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
            "feat_slot": background_feat_slot, "sub_choices": background_sub_choices,
        },
        "hp_levels": hp_levels,
        "equipment": {"class_packages": class_packages, "background_packages": background_packages, "armor_options": armor_options},
        "language_options": language_options,
    }
