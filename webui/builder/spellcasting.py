"""Klassers spellcasting, læst fra 5etools' egne felter (ingen fast tabel i koden).

Hvad dataene siger (XPHB):

* `spellcastingAbility`: klassen (eller subklassen: Eldritch Knight, Arcane Trickster) kaster spells.
* `cantripProgression[level-1]` / `preparedSpellsProgression[level-1]`: ANTAL cantrips og forberedte
  spells på klassens niveau. Altid-forberedte spells (`additionalSpells`) tæller ikke med i tallet.
* Klassetabellen `classTableGroups` (subklasser: `subclassTableGroups`) har spell slots pr. spell-niveau
  (`rowsSpellProgression`). Højeste spell-niveau man må vælge = højeste niveau med slots. Warlock har i
  stedet kolonnerne 'Spell Slots' og 'Slot Level' (Pact Magic).
* `spellsKnownProgressionFixed` (Wizard): antal spells, der tilføjes spellbogen pr. niveau (6, derefter 2).
  Forberedte spells vælges blandt spellbogens. `spellsKnownProgressionFixedByLevel` (Warlock): Mystic
  Arcanum, ét spell af niveau 6-9 på klasseniveau 11/13/15/17.
* `additionalSpells` (klasse og subklasse): `prepared` (altid forberedt), `known` (altid kendt), `innate`
  (uden slot), `expanded` (spells FØJET til listen, Bard/Eldritch Knight/Arcane Trickster). Niveau-nøgler
  er KLASSENS niveau. Flere NAVNGIVNE blokke er alternativer (Circle of the Land: terræn).
* `casterProgression`: full, 1/2, artificer (halvdelen rundet op: Paladin/Ranger), 1/3, pact. Bruges til
  multiclass-slots (Wizard-tabellen på samlet caster-niveau).

Spells vælges kun blandt dem, der faktisk kan vælges: klassens liste (eller `expanded`), de tilladte
kilder, spell-niveau højst det, klassen har slots til, og aldrig de altid-forberedte.
"""
from __future__ import annotations

from . import e5tools as e
from . import spell_grants

MULTICLASS_STEP = {"full": 1.0, "1/2": 0.5, "artificer": 0.5, "1/3": 1 / 3}


def casting_source(class_obj: dict | None, subclass_obj: dict | None) -> tuple[dict | None, str | None]:
    """(objektet med spell-felterne, 'class' | 'subclass')."""
    if class_obj and "spellcastingAbility" in class_obj:
        return class_obj, "class"
    if subclass_obj and "spellcastingAbility" in subclass_obj:
        return subclass_obj, "subclass"
    return None, None


def _at(table, level: int) -> int:
    if not isinstance(table, list) or level < 1:
        return 0
    return table[min(level, len(table)) - 1]


def slot_row(obj: dict, kind: str, level: int) -> list[int]:
    """[slots pr. spell-niveau 1..9] på klasseniveauet (tom liste hvis tabellen mangler)."""
    for group in obj.get("classTableGroups" if kind == "class" else "subclassTableGroups") or []:
        if "rowsSpellProgression" in group:
            return list(group["rowsSpellProgression"][min(level, len(group["rowsSpellProgression"])) - 1])
    return []


def pact(obj: dict, level: int) -> dict | None:
    """Warlock: {'slots': 2, 'level': 3} - antal pact-slots og deres niveau."""
    for group in obj.get("classTableGroups") or []:
        labels = group.get("colLabels") or []
        if "Spell Slots" in labels and "Slot Level" in labels and group.get("rows"):
            row = group["rows"][min(level, len(group["rows"])) - 1]
            return {"slots": int(row[labels.index("Spell Slots")]), "level": int(row[labels.index("Slot Level")])}
    return None


def max_spell_level(obj: dict, kind: str, level: int) -> int:
    if obj.get("casterProgression") == "pact":
        p = pact(obj, level)
        return p["level"] if p else 0
    row = slot_row(obj, kind, level)
    return max((i + 1 for i, n in enumerate(row) if n), default=0)


def caster_level_share(progression: str | None, level: int) -> int:
    """Hvor meget klassen tæller i multiclass-casterniveauet (Warlock/pact tæller ikke)."""
    step = MULTICLASS_STEP.get(progression or "")
    if not step:
        return 0
    if progression in ("artificer",):  # halvdelen rundet OP (2024: Paladin, Ranger)
        return -(-level // 2)
    return int(level * step)


def combined_slots(casters: list[dict], sources: set[str]) -> list[int]:
    """Samlede spell slots for alle klasser, der kaster med slots. Én klasse: dens egen tabel. Flere:
    Multiclass Spellcaster-tabellen (= Wizards slot-række) på det samlede caster-niveau.
    casters: [{'progression', 'level', 'row'}]."""
    slotted = [c for c in casters if c.get("row")]
    if len(slotted) == 1:
        return slotted[0]["row"]
    total = sum(caster_level_share(c["progression"], c["level"]) for c in slotted)
    wizard = e.get_class("Wizard", sources) or e.get_class("Wizard", {"XPHB"})
    if total < 1 or not wizard:
        return []
    return slot_row(wizard, "class", min(total, 20))


def _label_pool(spells: list[dict]) -> list[dict]:
    return [{"name": s["name"], "level": s.get("level", 0), "school": s.get("school")} for s in spells]


def _filter_pool(filter_str: str, sources: set[str]) -> list[dict]:
    parsed = spell_grants.parse_filter(filter_str)
    return _label_pool(spell_grants.spells_for_filter(parsed, sources)) if parsed else []


def _merge(*pools: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for pool in pools:
        for spell in pool:
            seen.setdefault(spell["name"], spell)
    return sorted(seen.values(), key=lambda s: (s["level"], s["name"]))


def _uid_name(raw: str, sources: set[str]) -> dict:
    uid = spell_grants.parse_uid(raw)
    spell = e.get_spell(uid["name"], sources) or e.get_spell(uid["name"], {"XPHB"})
    return {"name": spell["name"] if spell else uid["name"].title(), "source": spell["source"] if spell else None, "cantrip": uid["cantrip"] or bool(spell and spell.get("level") == 0)}


def build(class_obj: dict, subclass_obj: dict | None, class_name: str, class_level: int, sources: set[str], stored: dict) -> dict | None:
    """Alt en klasse får og skal vælge af spells på dens niveau. None hvis klassen ikke kaster spells."""
    obj, kind = casting_source(class_obj, subclass_obj)
    if not obj:
        return None
    level = class_level
    max_level = max_spell_level(obj, kind, level)
    result = {
        "ability": str(obj["spellcastingAbility"]).upper(),
        "source": kind,
        "progression": obj.get("casterProgression"),
        "max_spell_level": max_level,
        "slots": slot_row(obj, kind, level),
        "pact": pact(obj, level) if obj.get("casterProgression") == "pact" else None,
        "prepare_change": obj.get("preparedSpellsChange"),
        "picks": [],
        "grants": [],
    }

    # additionalSpells: klassens og subklassens blokke. Flere navngivne blokke = alternativer (terræn).
    blocks = list(class_obj.get("additionalSpells") or [])
    sub_blocks = list((subclass_obj or {}).get("additionalSpells") or []) if subclass_obj else []
    if kind == "subclass":
        sub_blocks = [b for b in sub_blocks]
    variant = None
    if len(sub_blocks) > 1 and all(b.get("name") for b in sub_blocks):
        names = [b["name"] for b in sub_blocks]
        variant = {"id": "subclass_variant", "kind": "variant", "title": "Variant (bestemmer altid-forberedte spells)", "count": 1, "options": [{"name": n, "level": 0, "school": None} for n in names]}
        result["picks"].append(variant)
        chosen = stored.get("subclass_variant")
        sub_blocks = [b for b in sub_blocks if b["name"] == chosen]
    always_names: set[str] = set()
    expanded: list[dict] = []
    pick_no = 0
    for owner, group in (("klasse", blocks), ("subklasse", sub_blocks)):
        for block in group:
            for item in spell_grants.walk(block):
                if item["level"] > level or (item.get("slot_level") and max_level < item["slot_level"]):
                    continue
                if item["kind"] == "all":
                    expanded.append(item)
                elif item["kind"] == "fixed":
                    info = _uid_name(item["value"], sources)
                    result["grants"].append({**info, "addition": item["addition"], "recharge": item["recharge"], "uses": item["uses"], "level_req": item["level"], "from": owner})
                    always_names.add(info["name"])
                else:
                    pool = [s for s in _filter_pool(item["value"], sources)]
                    result["picks"].append({
                        "id": f"sub_spell_{pick_no}", "kind": "extra", "title": "Ekstra spell fra subklassen" if owner == "subklasse" else "Ekstra spell",
                        "count": item["count"], "options": _merge(pool), "addition": item["addition"],
                    })
                    pick_no += 1

    class_filter_base = f"class={class_name}"
    has_list = kind == "class"  # kun klasser har deres egen spell-liste; subklasse-casters bruger `expanded`
    expanded_pool = _merge(*[_filter_pool(item["value"], sources) for item in expanded])

    def listed(levels: str) -> list[dict]:
        base = _filter_pool(f"level={levels}|{class_filter_base}", sources) if has_list else []
        return _merge(base, [s for s in expanded_pool if str(s["level"]) in levels.split(";")])

    def not_always(pool: list[dict]) -> list[dict]:
        return [s for s in pool if s["name"] not in always_names]

    cantrips = _at(obj.get("cantripProgression"), level)
    if cantrips:
        result["picks"].append({"id": "cantrips", "kind": "cantrips", "title": "Cantrips", "count": cantrips, "options": not_always(listed("0"))})
    levels = ";".join(str(n) for n in range(1, max_level + 1))
    leveled = not_always(listed(levels)) if max_level else []
    prepared = _at(obj.get("preparedSpellsProgression"), level)
    book = class_obj.get("spellsKnownProgressionFixed") if kind == "class" else None
    if book:
        # Wizard: spellbogen vælges af klassens liste, og de forberedte spells vælges blandt spellbogens.
        result["picks"].append({"id": "spellbook", "kind": "spellbook", "title": "Spellbog (Spellbook)", "count": sum(book[:level]), "options": leveled})
        in_book = {*(stored.get("spellbook") or []), *[n for p in result["picks"] if p["kind"] == "extra" and p.get("addition") == "known" for n in (stored.get(p["id"]) or [])]}
        prepared_options = [s for s in leveled if s["name"] in in_book]
    else:
        prepared_options = leveled
    if prepared:
        result["picks"].append({"id": "prepared", "kind": "prepared", "title": "Forberedte spells (Prepared)", "count": prepared, "options": prepared_options})
    # Mystic Arcanum (Warlock): ét spell af niveau 6-9, når klassen når niveauet.
    for gained, per_level in sorted((class_obj.get("spellsKnownProgressionFixedByLevel") or {}).items(), key=lambda kv: int(kv[0])) if kind == "class" else []:
        if int(gained) <= level:
            for spell_level, n in per_level.items():
                result["picks"].append({"id": f"arcanum_{spell_level}", "kind": "arcanum", "title": f"Mystic Arcanum (niveau {spell_level})", "count": n,
                                        "options": not_always(_filter_pool(f"level={spell_level}|{class_filter_base}", sources))})
    return result


def stale(pick: dict, chosen) -> list[str]:
    """Valgte spells, der ikke (længere) er blandt mulighederne - fx efter et niveaufald eller et klasseskift."""
    allowed = {o["name"] for o in pick["options"]}
    return [n for n in (chosen or []) if n not in allowed]
