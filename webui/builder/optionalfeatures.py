"""Valgfrie klassefeatures fra 5etools (optionalfeatures.json): Eldritch Invocations, Metamagic,
Battle Master Maneuvers og ældre Pact Boons, Elemental Disciplines, Infusions ...

Hvad dataene siger:

* Klassen (og subklassen) siger, HVOR MANGE man har og af hvilken slags: `optionalfeatureProgression:
  [{name, featureType: ["MM"], progression}]`. `progression` er enten en liste pr. niveau (Warlock:
  Invocations) eller et dict {niveau: antal} (Sorcerer: Metamagic 2/4/6 på 2/10/17; Battle Master:
  Maneuvers 3/5/7/9 på 3/7/10/15). Antallet er det på det højeste niveau, der er nået.
* Hver feature har `featureType` (EI, MM, MV:B ...) og evt. `prerequisite` (en liste af ALTERNATIVER):
  `level` {class, level}, `optionalfeature` (andre features, man skal have valgt), `spell` (et kendt
  spell, eller `choose`-filter fx et Warlock-cantrip), `pact` (ældre: en bestemt Pact Boon), `item`.
* `additionalSpells` (Armor of Shadows: Mage Armor uden slot; Pact of the Tome: 3 cantrips + 2 rituals),
  `senses` (Devil's Sight), `consumes` (Sorcery Point, Superiority Die) og `featProgression` (Lessons of
  the First Ones giver et Origin feat).

Kun features, man faktisk kan vælge, tilbydes: de rette typer, de tilladte kilder, forudsætningerne opfyldt.
"""
from __future__ import annotations

import re

from . import e5tools as e
from . import spell_grants
from . import spellcasting

TYPE_LABELS = {
    "EI": "Eldritch Invocation", "MM": "Metamagic", "MV:B": "Battle Master Maneuver", "PB": "Pact Boon",
    "ED": "Elemental Discipline", "AI": "Artificer Infusion", "AS": "Arcane Shot", "RN": "Rune", "RP": "Psionic Discipline",
}


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _count(progression, level: int) -> int:
    if isinstance(progression, list):
        return progression[min(level, len(progression)) - 1] if level >= 1 and progression else 0
    if isinstance(progression, dict):
        reached = [int(k) for k in progression if k.isdigit() and int(k) <= level]
        return progression[str(max(reached))] if reached else 0
    return 0


def progressions(class_obj: dict, subclass_obj: dict | None, level: int) -> list[dict]:
    """[{id, title, types, count}] for klassens og subklassens valgfrie features på dette niveau (antal > 0)."""
    out = []
    for owner in (class_obj, subclass_obj or {}):
        for prog in owner.get("optionalfeatureProgression") or []:
            count = _count(prog.get("progression"), level)
            if count:
                out.append({"id": f"opt_{_slug(prog.get('name', 'features'))}", "title": prog.get("name", "Valgfrie features"),
                            "types": list(prog.get("featureType") or []), "count": count})
    return out


def _uid_name(uid: str) -> str:
    return uid.split("|")[0].strip().lower()


def meets_prerequisites(feature: dict, class_name: str, subclass_name: str | None, level: int, chosen: set[str], known_spells: set[str], sources: set[str]) -> bool:
    """Opfylder mindst ét af forudsætnings-alternativerne (ingen = altid opfyldt)?"""
    alternatives = feature.get("prerequisite")
    if not alternatives:
        return True
    for alt in alternatives:
        ok = True
        for key, value in alt.items():
            if key == "level":
                need = value.get("level", 0) if isinstance(value, dict) else int(value)
                klass = ((value.get("class") or {}).get("name") if isinstance(value, dict) else None)
                if (klass and klass.lower() != class_name.lower()) or level < need:
                    ok = False
            elif key == "optionalfeature":
                ok = ok and all(_uid_name(u) in chosen for u in value)
            elif key == "pact":
                ok = ok and f"pact of the {str(value).lower()}" in chosen
            elif key == "spell":
                satisfied = False
                for req in value:
                    if isinstance(req, str):
                        satisfied = satisfied or _uid_name(req) in {n.lower() for n in known_spells}
                    elif isinstance(req, dict) and isinstance(req.get("choose"), str):
                        parsed = spell_grants.parse_filter(req["choose"])
                        names = {s["name"].lower() for s in spell_grants.spells_for_filter(parsed, sources)} if parsed else set()
                        satisfied = satisfied or bool(names & {n.lower() for n in known_spells})
                ok = ok and satisfied
            # item / otherSummary / patron: kan ikke afgøres af valgene her og regnes som opfyldt
        if ok:
            return True
    return False


def build(class_obj: dict, subclass_obj: dict | None, class_name: str, class_level: int, sources: set[str], stored: dict, known_spells: set[str]) -> list[dict]:
    """De valg en klasse har af valgfrie features: [{id, title, kind, count, options, group_label}], plus
    spell-valg for features, der selv giver spells (Pact of the Tome). Valgene i `stored`."""
    picks = progressions(class_obj, subclass_obj, class_level)
    result = []
    all_chosen = {_uid_name(n) for p in picks for n in (stored.get(p["id"]) or [])}
    pool = e.optional_features(sources)
    for prog in picks:
        wanted = set(prog["types"])
        features = [f for f in pool if wanted & set(f.get("featureType") or [])]
        names = {}
        for f in features:
            names[f["name"]] = names.get(f["name"], 0) + 1
        options = []
        for f in features:
            label = f"{f['name']} ({f['source']})" if names[f["name"]] > 1 else f["name"]
            chosen_here = label in (stored.get(prog["id"]) or [])
            meets = meets_prerequisites(f, class_name, (subclass_obj or {}).get("name"), class_level, all_chosen, known_spells, sources)
            if chosen_here or meets:
                text = e.render_text(f.get("entries", []))
                options.append({"name": label, "source": f["source"], "level": 0, "group": "", "text": text[:400],
                                "consumes": (f.get("consumes") or {}).get("name"), "feature": f["name"], "unmet": not meets})
        options.sort(key=lambda o: o["name"])
        result.append({"id": prog["id"], "kind": "optional", "title": f"{prog['title']} ({', '.join(TYPE_LABELS.get(t, t) for t in prog['types'])})",
                       "count": prog["count"], "options": options, "types": prog["types"]})
        # Features, der selv giver spells med et valg (Pact of the Tome: 3 cantrips og 2 rituals).
        for label in stored.get(prog["id"]) or []:
            feature = next((f for f in features if f["name"] == label or f"{f['name']} ({f['source']})" == label), None)
            for b_index, block in enumerate((feature or {}).get("additionalSpells") or []):
                pick_no = 0
                for item in spell_grants.walk(block):
                    if item["kind"] != "choose":
                        continue
                    result.append({
                        "id": f"ofs_{_slug(feature['name'])}_{b_index}_{pick_no}", "kind": "feature_spell",
                        "title": f"{feature['name']}: spell", "count": item["count"],
                        "options": spellcasting._merge(spellcasting._filter_pool(item["value"], sources)),
                    })
                    pick_no += 1
    return result


def granted(feature: dict, stored: dict, level: int, sources: set[str], origin: str, ability: str | None = None) -> list[dict]:
    """Spells en valgt feature giver (faste + valgte), i granted_spells' format."""
    out = []
    for b_index, block in enumerate(feature.get("additionalSpells") or []):
        pick_no = 0
        block_ability = spell_grants.fixed_ability(block) or ability
        for item in spell_grants.walk(block):
            if item["kind"] == "fixed":
                uid = spell_grants.parse_uid(item["value"])
                names, cantrip = [uid["name"]], uid["cantrip"]
            elif item["kind"] == "choose":
                raw = stored.get(f"ofs_{_slug(feature['name'])}_{b_index}_{pick_no}")
                pick_no += 1
                names = [raw] if isinstance(raw, str) else [r for r in (raw or []) if r]
                cantrip = "level=0" in item["value"]
            else:
                continue
            for name in names:
                spell = e.get_spell(name, sources) or e.get_spell(name, {"XPHB"})
                out.append({"name": spell["name"] if spell else name.title(), "source": spell["source"] if spell else None, "cantrip": cantrip,
                            "addition": item["addition"], "ability": block_ability, "recharge": item["recharge"], "uses": item["uses"], "from": origin})
    return out
