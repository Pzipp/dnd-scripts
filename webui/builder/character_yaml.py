"""character.yaml: beregnet, engelsk-nøglet sammenregning af en choices.yaml-
karakters stats, til brug for arket (Print-fanen).

Findes choices.yaml for karakteren, er character.yaml en AFLEDT fil - den
genberegnes og overskrives af derive_and_save() hver gang choices.yaml gemmes,
ligesom model.state() allerede genberegnes ved hvert API-kald. Kun
choices.yaml er kilden til sandhed i det tilfælde.

Findes choices.yaml IKKE, er character.yaml i stedet den primære fil -
skrevet direkte (af builder-UI'en uden choices.yaml, eller af et LLM) - og
røres aldrig herfra.

PRESERVED_FIELDS er i dag tom - de to felter, der tidligere stod der (ac,
languages), er begge blevet rigtigt afledte i stedet, se nedenfor. Et NYT
felt lægges her, hvis en fremtidig regel igen afhænger af data choices.yaml
ikke tracker endnu (samme mønster: standardformel + bevaring af en
eksisterende character.yaml, i stedet for at blive overskrevet).

`languages` var tidligere i samme kategori (choices.yaml trackede intet
sprogvalg) - PHB 2024 kap. 2's "Choose Languages"-regel (Common + 2 valgt
fra Standard Languages-tabellen, se languages.known i choices.yaml) er nu
modelleret direkte, og `_languages()` bygger den fulde streng. KENDT,
BEVIDST gap: "Your class and other features might also give you languages"
(fx Rogue/Thieves' Cant, Druid/Druidic) er IKKE talt med her - de vises kun
som tekst i den feature, der giver dem (Træning og valg), ikke tilføjet til
languages-linjen. Se "Kendte forenklinger" i docs/character-yaml.md.

`ac` var tidligere i samme kategori (ingen udstyrs-tilstand i choices.yaml),
men udstyret rustning tracked nu direkte (equipment.armor/shield) - `_ac()`
beregner den rigtige AC (PHB 2024: Light/Medium/Heavy har hver sin DEX-regel,
Shield lægger +2 til uanset rustning). Ligesom `initiative` er `ac` derfor
IKKE et PRESERVED_FIELD længere - den genberegnes altid og overskriver
bevidst en evt. manuel rettelse, samme "enkelt og forudsigeligt"-aftale.

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
from . import feat_rules
from . import model
from . import optionalfeatures
from . import races
from . import settings
from . import spell_grants
from . import spellcasting

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
# fra en eksisterende fil (se modul-docstring) - render.py skal ALDRIG selv
# regne eller feat-tjekke disse, kun læse dem som alle andre tal. Tom i dag
# - initiative/ac/languages er alle rigtigt afledte nu, se modul-docstring.
PRESERVED_FIELDS = ()


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


def _languages(data: dict) -> str:
    """Common (fast) + languages.known (PHB 2024 kap. 2's 2-sprogs valg fra
    Standard Languages-tabellen, se e5tools.standard_languages()). Tæller
    IKKE klasse-/feature-tildelte ekstra sprog (fx Thieves' Cant) med - se
    modul-docstringens note om det kendte, bevidste gap."""
    known = data.get("languages", {}).get("known") or []
    return ", ".join(["Common", *known])


def _ac(data: dict, sources: set[str], dex_mod: int) -> tuple[int, str]:
    """(ac, note) - PHB 2024 kap. 1 (Armor Training): Light = base + DEX,
    Medium = base + DEX (maks. +2), Heavy = base (ingen DEX). Uden rustning:
    10 + DEX. Shield (+2) lægges altid til, uanset rustning - vælges separat
    fra equipment.armor, fordi det kan bæres sammen med enhver rustning."""
    choice = data.get("equipment", {}).get("armor") or {}
    armor_sources = {choice["source"]} if choice.get("source") else sources
    armor_obj = e.get_armor(choice["name"], armor_sources) if choice.get("name") else None
    if armor_obj:
        base = armor_obj.get("ac", 10)
        armor_type = (armor_obj.get("type") or "").split("|")[0]
        if armor_type == "HA":
            ac, note = base, armor_obj["name"]
        elif armor_type == "MA":
            ac, note = base + min(dex_mod, 2), f"{armor_obj['name']} + DEX (maks 2)"
        else:
            ac, note = base + dex_mod, f"{armor_obj['name']} + DEX"
    else:
        ac, note = 10 + dex_mod, "10 + DEX (ingen rustning)"
    if data.get("equipment", {}).get("shield"):
        ac += 2
        note += " + Shield"
    return ac, note


def _apply_effects(
    entries: list[dict], initiative_formula: str, hp: int | None, total_level: int, class_levels: dict[str, int]
) -> tuple[str, int | None]:
    """Folder høj-konfidens, PERMANENTE effects (se effects.py) ind i
    initiative-formlen og HP - de to eneste targets, der rent faktisk er
    bygget en anvendelse for (se docs/llm-effect-extraction-prompt.md).
    Andre targets (ac, saves, skills, resistances, darkvision, speed) er
    gemt i _effects.yaml, men IKKE foldet ind nogen steder endnu.

    hp_per_level skalerer med KARAKTERniveau for feats (fx Tough: "twice
    your character level"), men med DEN GRANTENDE KLASSES EGEN niveau for
    class_features (fx Draconic Resilience: skalerer med Sorcerer-niveau,
    ikke total niveau - en multiclass Sorcerer 3/Fighter 5 får stadig kun
    Sorcerer-niveauets andel, ikke 8). class_levels er {klassenavn: niveau},
    fra samme classes_out derive_from_state() allerede bygger."""
    for entry, eff in effects.high_confidence_effects(entries):
        target, kind, value = eff.get("target"), eff.get("type"), str(eff.get("value", ""))
        if target == "initiative" and kind == "add":
            term = value.removeprefix("ability:")
            if term and f"+{term}" not in initiative_formula:
                initiative_formula = initiative_formula[:-1] + f"+{term}" + "}"
        elif target == "hp_per_level" and kind == "add" and hp is not None:
            multiplier = class_levels.get(entry.get("class"), total_level) if entry["kind"] == "class_feature" else total_level
            try:
                hp += int(value) * multiplier
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
        "size": None,
        "speeds": {"walk": 30},
        "senses": {},
        "resistances": [],
        "immunities": [],
        "vulnerabilities": [],
        "condition_immunities": [],
        "granted_spells": [],
        "masteries": [],
        "feats": [],
        "spells_known": [],
        "optional_features": [],
        "spellcasting": [],
        "spell_slots": [],
        "pact_slots": None,
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


def _chosen_feats(data: dict, sources: set[str]):
    """(slot-post, 5etools-feat) for hvert valgt feat; kilden er den, der er gemt på valget."""
    for entry in (data.get("feats") or {}).values():
        if not entry or not entry.get("name"):
            continue
        obj = e.get_feat(entry["name"], {entry["source"]} if entry.get("source") else sources)
        if obj:
            yield entry, obj


def _ability_caps(data: dict, sources: set[str]) -> dict[str, int]:
    """Loft pr. evne: 20, men et feat kan hæve det (Epic Boons: 30) for den evne, det giver bonus til."""
    caps = {a: feat_rules.DEFAULT_ABILITY_MAX for a in model.ABILITIES}
    for entry, obj in _chosen_feats(data, sources):
        for ability, (_amount, cap) in feat_rules.fixed_ability(obj).items():
            caps[ability] = max(caps.get(ability, 0), cap)
        choice = feat_rules.ability_choice(obj)
        picked = (entry.get("choices") or {}).get("ability")
        if choice and isinstance(picked, str) and picked.upper() in caps:
            caps[picked.upper()] = max(caps[picked.upper()], choice["max"])
    return caps


def _feat_grants(data: dict, sources: set[str]) -> dict:
    """Det de valgte feats giver karakteren: faste tildelinger (5etools' `true`-felter, senses,
    resist) + de valg spilleren har truffet. Samlet pr. kategori."""
    out = {"skills": [], "tools": [], "armor": [], "weapons": [], "saves": [], "senses": {}, "resist": [], "expertise": []}
    for entry, obj in _chosen_feats(data, sources):
        fixed = feat_rules.fixed_grants(obj)
        for key in ("skills", "tools", "armor", "weapons", "saves", "resist"):
            out[key] += fixed[key]
        out["senses"].update(fixed["senses"])
        chosen = entry.get("choices") or {}
        if feat_rules.saves_linked_to_ability(obj) and isinstance(chosen.get("ability"), str):
            out["saves"].append(chosen["ability"].lower())
        if isinstance(chosen.get("save"), str):
            out["saves"].append(chosen["save"].lower())
        for key in ("resist", "expertise"):
            value = chosen.get(key)
            out[key] += [v for v in (value if isinstance(value, list) else [value]) if v]
    return out


def _ability_bonuses(data: dict, state: dict, sources: set[str]) -> dict[str, int]:
    """Evne-bonusser der IKKE er en del af grundscoren i abilities.assigned:
    baggrundens ability_split (2024-reglen flyttede racernes evne-bonus til
    baggrunden) og hver ASI-feats valgte +2/+1-fordeling (se
    docs/choices-yaml.md#undervalg). Inkluderer feats' FASTE evne-forbedring
    (fx Durable: altid +1 CON) og det valgte evne-valg (fx Athlete, Resilient,
    Epic Boons), læst fra feat'ets `ability`-felt (se feat_rules.py)."""
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

    if data.get("settings", {}).get("race_ability", settings.DEFAULT_RACE_ABILITY):
        race_name, race_source = data["race"].get("name"), data["race"].get("source")
        race_obj = e.get_race(race_name, {race_source} if race_source else sources) if (race_name and race_name != model.OTHER) else None
        stored = data["race"].get("choices") or {}
        if race_obj and not races.needs_lineage(race_obj, stored.get("lineage"), sources):
            for ability, amount in races.ability_bonus(races.effective(race_obj, stored.get("lineage"), sources), stored).items():
                if ability in bonuses:
                    bonuses[ability] += amount

    for feat_entry, feat_obj in _chosen_feats(data, sources):
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
        for ability, (amount, _cap) in feat_rules.fixed_ability(feat_obj).items():
            if ability in bonuses:
                bonuses[ability] += amount
        picked = (feat_entry.get("choices") or {}).get("ability")
        choice = feat_rules.ability_choice(feat_obj)
        if choice and isinstance(picked, str) and picked.upper() in bonuses:
            bonuses[picked.upper()] += choice["amount"]
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


def _masteries(data: dict, sources: set[str]) -> list[list[str]]:
    """[[mastery-egenskab, våben], ...] ud fra hver klasses valgte Weapon
    Mastery-våben; egenskaben slås op på våbnet i items-base ('Vex|XPHB' -> Vex)."""
    weapons = {w["name"]: w for w in e.weapons(sources)}
    out = []
    for entry in data.get("classes", {}).values():
        for name in entry.get("choices", {}).get("weapon_mastery", []):
            for prop in (weapons.get(name) or {}).get("mastery", []):
                pair = [prop.split("|")[0], name]
                if pair not in out:
                    out.append(pair)
    return out


_RECHARGE_KEYS = {"daily": "long_rest", "restLong": "long_rest", "rest": "short_rest"}


def _size(race_eff: dict, stored: dict) -> str | None:
    """Karakterens størrelse: racens eneste, eller det valgte (race.choices.size)."""
    options = races.size_options(race_eff)
    if len(options) == 1:
        return options[0]
    return stored.get("size") if stored.get("size") in options else None


def _class_optional_features(data: dict, sources: set[str]) -> tuple[list[dict], list[dict], dict[str, int]]:
    """Valgte valgfrie klassefeatures (Metamagic, Invocations, Maneuvers ...): ([{name, source, types, class}],
    spells de giver, sanser de giver). Kun gyldige valg tages med."""
    features: list[dict] = []
    granted: list[dict] = []
    senses: dict[str, int] = {}
    known = model.class_spell_names(data)
    for entry in (data.get("classes") or {}).values():
        class_name = entry.get("name")
        class_obj = e.get_class(class_name, {entry["source"]} if entry.get("source") else sources) if class_name else None
        if not class_obj:
            continue
        subclass_obj = next((x for x in e.subclasses(class_name, {class_obj["source"]}) if x.get("name") == entry.get("subclass")), None) if entry.get("subclass") else None
        stored = entry.get("choices") or {}
        for pick in optionalfeatures.build(class_obj, subclass_obj, class_name, entry.get("level", 1), sources, stored, known):
            if pick["kind"] != "optional":
                continue
            options = {o["name"]: o for o in pick["options"]}
            for label in stored.get(pick["id"]) or []:
                option = options.get(label)
                if not option or option.get("unmet"):
                    continue
                feature = next((f for f in e.optional_features(sources) if f["name"] == option["feature"] and f["source"] == option["source"]), None)
                if not feature:
                    continue
                features.append({"name": feature["name"], "source": feature["source"], "types": list(feature.get("featureType") or []), "class": class_name})
                ability = ((model._spellcasting_for(entry, sources) or {}).get("ability"))
                granted += optionalfeatures.granted(feature, stored, entry.get("level", 1), sources, f"class: {class_name} ({feature['name']})", ability)
                for block in feature.get("senses") or []:
                    for sense, rng in block.items():
                        if isinstance(rng, int):
                            senses[sense] = max(senses.get(sense, 0), rng)
    return features, granted, senses


def _class_spellcasting(data: dict, sources: set[str]) -> tuple[list[dict], list[dict], list[int], dict | None]:
    """Spellcasting pr. klasse ud fra valgene: ([{class, ability, cantrips, prepared, spellbook, arcanum, extra, ...}],
    tildelte spells fra klasse/subklasse, samlede slots, pact-slots). Se spellcasting.py for reglerne."""
    blocks: list[dict] = []
    granted: list[dict] = []
    casters: list[dict] = []
    pact_slots = None
    for entry in (data.get("classes") or {}).values():
        if not entry.get("name"):
            continue
        built = model._spellcasting_for(entry, sources)
        if not built:
            continue
        stored = entry.get("choices") or {}
        level = entry.get("level", 1)
        label = f"class: {entry['name']}" + (f" ({entry['subclass']})" if entry.get("subclass") else "")

        def picked(pick_id: str) -> list[str]:
            raw = stored.get(pick_id)
            return [raw] if isinstance(raw, str) and raw else [r for r in (raw or []) if r]

        pick_ids = [p["id"] for p in built["picks"]]
        valid = {p["id"]: [n for n in picked(p["id"]) if n not in spellcasting.stale(p, picked(p["id"]))] for p in built["picks"]}
        arcanum = {pid.split("_", 1)[1]: valid[pid] for pid in pick_ids if pid.startswith("arcanum_") and valid[pid]}
        extra = [n for pid in pick_ids if pid.startswith("sub_spell_") for n in valid[pid]]
        blocks.append({
            "class": entry["name"], "subclass": entry.get("subclass"), "ability": built["ability"], "level": level,
            "save_dc": "{8+PB+%s}" % built["ability"], "attack": "{+PB+%s}" % built["ability"],
            "cantrips": valid.get("cantrips", []), "spellbook": valid.get("spellbook", []), "prepared": valid.get("prepared", []),
            "arcanum": arcanum, "extra": extra, "variant": stored.get("subclass_variant"),
            "max_spell_level": built["max_spell_level"], "prepare_change": built["prepare_change"],
        })
        for g in built["grants"]:
            granted.append({"name": g["name"], "source": g["source"], "cantrip": g["cantrip"], "addition": g["addition"], "ability": built["ability"],
                            "recharge": _RECHARGE_KEYS.get(g["recharge"], g["recharge"]), "uses": g["uses"], "from": label})
        if built.get("pact"):
            pact_slots = built["pact"]
        casters.append({"progression": built["progression"], "level": level, "row": built["slots"]})
    slots = spellcasting.combined_slots(casters, sources)
    while slots and slots[-1] == 0:
        slots = slots[:-1]
    return blocks, granted, slots, pact_slots


def _spells_from_block(block: dict, ability: str | None, picked, level: int, sources: set[str], origin: str) -> list[dict]:
    """Poster for én additionalSpells-blok: faste spells og de valgte. `picked(i)` giver den
    gemte værdi for valg nr. i (ikke-prepared), `picked("prepared")` den samlede liste for
    prepared-trinene (Ritual Caster). Spells, der låses op på et højere niveau end karakterens,
    udelades. Poster: {name, source, cantrip, addition, ability, recharge, uses, from}."""
    out = []
    pick = 0
    prepared_done = False
    for item in spell_grants.walk(block):
        if item["kind"] == "fixed":
            uid = spell_grants.parse_uid(item["value"])
            names, cantrip = [uid["name"]], uid["cantrip"]
        elif item["addition"] == "prepared":
            if prepared_done or item["level"] > level:
                continue
            prepared_done = True
            value = picked("prepared")
            names, cantrip = [v for v in (value if isinstance(value, list) else [value]) if v], False
        else:
            value = picked(pick)
            pick += 1
            names = [v for v in (value if isinstance(value, list) else [value]) if v]
            cantrip = "level=0" in item["value"]
        if item["level"] > level:
            continue
        for name in names:
            spell = e.get_spell(name, sources) or e.get_spell(name, {"XPHB"})
            out.append({
                "name": spell["name"] if spell else name.title(),
                "source": spell["source"] if spell else None,
                "cantrip": cantrip,
                "addition": item["addition"],
                "ability": ability,
                "recharge": _RECHARGE_KEYS.get(item["recharge"], item["recharge"]),
                "uses": item["uses"],
                "from": origin,
            })
    return out


def _race_granted_spells(race_eff: dict, stored: dict, level: int, sources: set[str], race_name: str) -> list[dict]:
    """De spells racen (den valgte afstamning) giver KARAKTEREN på det nuværende niveau: faste
    spells og de valgte (race.choices.spell_<n>)."""
    out = []
    blocks = model.race_spell_blocks(race_eff, stored)
    for b_index, block in enumerate(blocks):
        prefix = "" if len(blocks) == 1 else f"b{b_index}_"
        picked_ability = stored.get(f"{prefix}spell_ability")
        ability = spell_grants.fixed_ability(block) or (picked_ability.upper() if isinstance(picked_ability, str) else None)
        out += _spells_from_block(block, ability, lambda i, p=prefix: stored.get(f"{p}spell_{i}"), level, sources, f"race: {race_name}")
    return out


def _feat_granted_spells(entry: dict, feat_obj: dict, level: int, sources: set[str], known_spells: set[str]) -> list[dict]:
    """Det valgte feats additionalSpells giver (samme valg-id'er som model._additional_spell_choices:
    `origin` + `origin_`-præfiks for Magic Initiates navngivne blokke, `b<n>_` for flere ikke-navngivne
    blokke, `spell_<n>`, `spell_prepared`, og `ability` / `<præfiks>ability` for spellcasting-evnen)."""
    blocks = feat_obj.get("additionalSpells") or []
    if not blocks:
        return []
    stored = entry.get("choices") or {}
    origin = f"feat: {feat_obj['name']}"
    if feat_obj.get("name") == "Cold Caster":
        # Enten Ray of Frost, eller - hvis den allerede er kendt - en anden Wizard-cantrip.
        blocks = [blocks[1] if "Ray of Frost" in known_spells else blocks[0]]
    pairs: list[tuple[dict, str]]
    if len(blocks) > 1 and all(b.get("name") for b in blocks):
        chosen = stored.get("origin")
        pairs = [(b, "origin_") for b in blocks if b["name"].removesuffix(" Spells") == chosen]
    elif len(blocks) == 1:
        pairs = [(blocks[0], "")]
    else:
        pairs = [(b, f"b{i}_") for i, b in enumerate(blocks)]
    out = []
    for block, prefix in pairs:
        raw = block.get("ability")
        if raw == "inherit":  # den evne, feat'et forhøjede
            picked = stored.get("ability")
        elif spell_grants.ability_choice(block):
            picked = stored.get(f"{prefix}ability")
        else:
            picked = spell_grants.fixed_ability(block)
        ability = picked.upper() if isinstance(picked, str) else None
        out += _spells_from_block(block, ability, lambda i, p=prefix: stored.get(f"{p}spell_prepared" if i == "prepared" else f"{p}spell_{i}"), level, sources, origin)
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
    caps = _ability_caps(data, sources)
    # Loftet (20, eller 30 for en Epic Boon) begrænser kun bonusserne; en grundscore over loftet røres ikke.
    final_abilities = {a: max(assigned[a], min(assigned[a] + bonuses[a], caps[a])) for a in model.ABILITIES if a in assigned}
    con_mod = _mod(final_abilities.get("CON", 10))
    ac, ac_note = _ac(data, sources, _mod(final_abilities.get("DEX", 10)))
    hit_die = (primary_class_obj or {}).get("hd", {}).get("faces", 8)
    hit_dice = _hit_dice_pool(data, sources)
    hp = _hp(data, primary_id, hit_die, con_mod, total_level) if assigned.get("CON") is not None else None

    feat_grants = _feat_grants(data, sources)
    saves = [s.upper() for s in (primary_class_obj or {}).get("proficiency", [])]
    saves += [s.upper() for s in feat_grants["saves"] if s.upper() not in saves]

    race_name, race_source = data["race"].get("name"), data["race"].get("source")
    background_name, background_source = data["background"].get("name"), data["background"].get("source")
    background_obj = e.get_background(background_name, {background_source} if background_source else sources) if background_name else None
    race_obj = e.get_race(race_name, {race_source} if race_source else sources) if (race_name and race_name != model.OTHER) else None
    race_stored = data["race"].get("choices") or {}
    race_eff = races.effective(race_obj, race_stored.get("lineage"), sources) if race_obj else {}
    speeds = races.speeds(race_eff) if race_obj else {"walk": 30}
    speed = speeds["walk"]

    fixed_skills = []
    fixed_tools = []
    if background_obj:
        # Kun `true` er en fast tildeling; et tal (anyGamingSet: 1) er et VALG og står i choices.
        fixed_skills = [k for k, v in (background_obj.get("skillProficiencies") or [{}])[0].items() if v is True]
        fixed_tools = [k for k, v in (background_obj.get("toolProficiencies") or [{}])[0].items() if v is True]
    fixed_skills += feat_rules._true_keys(race_eff.get("skillProficiencies"))
    fixed_tools += feat_rules._true_keys(race_eff.get("toolProficiencies"))

    # `skill_any` (Skilled) er ét valg blandt skills OG værktøjer: skills er de små bogstaver-navne i ALL_SKILLS.
    picked_any = _collect(data, "skill_any")
    skill_any_skills = [p.lower() for p in picked_any if p.lower() in model.ALL_SKILLS]
    skill_any_tools = [p for p in picked_any if p.lower() not in model.ALL_SKILLS]
    skills = sorted({*(s.lower() for s in _collect(data, "skill", "skills")), *skill_any_skills, *fixed_skills, *feat_grants["skills"]})
    tools = sorted({*_collect(data, "tool", "instrument", "gaming_set", "artisan_tool", "tool_any"), *skill_any_tools, *fixed_tools, *feat_grants["tools"]})
    expertise = sorted({
        skill for c in state.get("classes", []) for f in c.get("features", [])
        if f.get("expertise_choice") for skill in f["expertise_choice"]["chosen"]
    } | {s.lower() for s in feat_grants["expertise"]})

    senses = dict(races.fixed_senses(race_eff))
    for sense, rng in feat_grants["senses"].items():
        senses[sense] = max(senses.get(sense, 0), rng)
    race_resist = races.fixed_resist(race_eff)
    chosen_resist = race_stored.get("resist")
    race_resist += [r for r in (chosen_resist if isinstance(chosen_resist, list) else [chosen_resist]) if r]
    resistances = sorted({r.lower() for r in [*race_resist, *feat_grants["resist"]]})

    known_spell_set = model.class_spell_names(data)
    granted_spells = _race_granted_spells(race_eff, race_stored, total_level, sources, race_name) if race_obj else []
    for feat_entry, feat_obj in _chosen_feats(data, sources):
        granted_spells += _feat_granted_spells(feat_entry, feat_obj, total_level, sources, known_spell_set)

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
    race_prof = races.fixed_proficiencies(race_eff)
    for key, extra in (("armor", feat_rules.armor_text([*race_prof["armor"], *feat_grants["armor"]])), ("weapons", feat_rules.weapon_text([*race_prof["weapons"], *feat_grants["weapons"]]))):
        if extra:
            can_use[key] = ", ".join(dict.fromkeys([*filter(None, [can_use.get(key)]), *extra]))

    spellcasting_blocks, class_granted, spell_slots, pact_slots = _class_spellcasting(data, sources)
    granted_spells += class_granted
    optional_features, optional_granted, optional_senses = _class_optional_features(data, sources)
    granted_spells += [{**g, "recharge": _RECHARGE_KEYS.get(g["recharge"], g["recharge"])} for g in optional_granted]
    for sense, rng in optional_senses.items():
        senses[sense] = max(senses.get(sense, 0), rng)
    # Spells spilleren selv har valgt (cantrips, forberedte, arcanum, ekstra). Spellbogen er en liste at vælge fra,
    # ikke noget, der skal have kort eller beskrivelse, og er derfor ikke med her.
    known_names = list(dict.fromkeys(n for b in spellcasting_blocks for n in [*b["cantrips"], *b["prepared"], *[x for v in b["arcanum"].values() for x in v], *b["extra"]]))
    spells_known = []
    for name in known_names:
        spell = e.get_spell(name, sources) or e.get_spell(name, {"XPHB"})
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

    # "kind" tilføjes KUN til denne ephemere kopi til effects-opslag, ikke
    # til feats/spells_known/class_features/race_traits selv - det ville
    # være redundant støj i den gemte character.yaml (hvilken liste en
    # entry står i, siger allerede dens "kind").
    effect_entries = (
        [{**f, "kind": "feat"} for f in feats]
        + [{**s, "kind": "spell"} for s in spells_known]
        + [{**c, "kind": "class_feature"} for c in class_features]
        + [{**t, "kind": "race_trait"} for t in race_traits]
    )
    class_levels = {c["name"]: c["level"] for c in classes_out}
    initiative_formula, hp = _apply_effects(effect_entries, "{+DEX}", hp, total_level, class_levels)

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
        "ac": ac,  # se _ac() - afledt af equipment.armor/shield, ikke et PRESERVED_FIELD længere
        "ac_note": ac_note,  # kort forklaring til AC-boksens fodnote i render.py (box_stats), ikke en formel
        "initiative": initiative_formula,  # standard + evt. høj-konfidens effects (fx Alert) - se _apply_effects()
        "speed": speed,
        "hit_die": hit_die,
        "saves": saves,
        "skills": skills,
        "expertise": expertise,
        "tools": tools,
        "languages": _languages(data),  # se _languages() - klasse-/feature-tildelte ekstra sprog er IKKE talt med, kendt gap
        "can_use": can_use,
        "size": _size(race_eff, race_stored),
        "speeds": speeds,  # {'walk': 30, 'fly': 30, ...} i ft
        "senses": senses,  # {'darkvision': 60, 'blindsight': 10, ...} i ft, fra race/afstamning og feats
        "resistances": resistances,  # fra race/afstamning og feats
        "immunities": races.fixed_other(race_eff)["immune"],
        "vulnerabilities": races.fixed_other(race_eff)["vulnerable"],
        "condition_immunities": races.fixed_other(race_eff)["conditionImmune"],
        "granted_spells": granted_spells,
        "masteries": _masteries(data, sources),
        "feats": feats,
        "spells_known": spells_known,
        "optional_features": optional_features,  # valgte Metamagic/Invocations/Maneuvers ...: {name, source, types, class}
        "spellcasting": spellcasting_blocks,  # pr. caster-klasse: evne, DC/angreb (formler), cantrips, spellbog, forberedte, arcanum
        "spell_slots": spell_slots,  # [slots pr. spell-niveau 1..] - samlet for alle klasser (multiclass-tabellen)
        "pact_slots": pact_slots,  # Warlock: {slots, level}
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
