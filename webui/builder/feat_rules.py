"""Læser feats' STRUKTUREREDE felter fra 5etools (ability, *Proficiencies,
senses, resist, prerequisite) - ét sted, brugt både af model.py (hvilke valg
skal stilles) og character_yaml.py (hvad giver de valgte feats karakteren).

Betydningen af felterne (fra 5etools' egen kode og data):

* ability: liste af blokke. `{dex: 1}` = fast +1. `{choose: {from, amount}}` =
  vælg en evne (amount er 1, hvis det ikke står der). `max` på blokken hæver
  loftet (Epic Boons: 30), ellers er loftet 20. `hidden: true` = feltet er kun
  til maskinbrug (Ability Score Improvement, som har sin egen +2/+1-dialog).
  `choose.entry` er kun en visningstekst.
* skill-/tool-/armor-/weaponProficiencies, savingThrowProficiencies: `true` =
  fast tildeling, `choose` = vælg, `any`/`anyMusicalInstrument`/
  `anyProficientSkill` = vælg frit blandt alle.
* senses: faste sanser med rækkevidde i ft. resist: faste eller valgte
  skadetyper.
* prerequisite: liste af ALTERNATIVER (opfyld ét). Nøgler: level, ability,
  proficiency, feature, spellcasting2020, otherSummary (kun tekst).

Hvad dataene IKKE siger, men feat'ens tekst gør: at Resilients valg af evne
styrer både +1 og saving throw-træningen (samme `from`-liste i begge felter)
- det genkendes her ved at de to lister er ens.
"""
from __future__ import annotations

DEFAULT_ABILITY_MAX = 20
ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")


def ability_blocks(feat: dict) -> list[dict]:
    """Synlige ability-blokke (uden `hidden`)."""
    return [b for b in (feat.get("ability") or []) if not b.get("hidden")]


def ability_choice(feat: dict) -> dict | None:
    """{'from': ['STR',...], 'amount': n, 'max': m} for det ene evne-valg, ellers None."""
    for block in ability_blocks(feat):
        choose = block.get("choose")
        if choose and choose.get("from"):
            return {
                "from": [a.upper() for a in choose["from"]],
                "amount": choose.get("amount", 1),
                "max": block.get("max", DEFAULT_ABILITY_MAX),
            }
    return None


def fixed_ability(feat: dict) -> dict[str, tuple[int, int]]:
    """{'CON': (1, 20)}: faste evne-forbedringer (beløb, loft)."""
    out: dict[str, tuple[int, int]] = {}
    for block in ability_blocks(feat):
        if block.get("choose"):
            continue
        cap = block.get("max", DEFAULT_ABILITY_MAX)
        for key, amount in block.items():
            if key in ABILITY_KEYS and isinstance(amount, int):
                out[key.upper()] = (amount, cap)
    return out


def saves_linked_to_ability(feat: dict) -> bool:
    """Resilient: samme evne giver både +1 og saving throw-træning."""
    ability = ability_choice(feat)
    saves = _choose_from(feat.get("savingThrowProficiencies"))
    return bool(ability and saves and sorted(a.upper() for a in saves) == sorted(ability["from"]))


def spell_ability_from_choice(feat: dict) -> bool:
    """Spellcasting-evnen er 'den evne, feat'et forhøjede' (additionalSpells.ability == 'inherit')."""
    return any(b.get("ability") == "inherit" for b in (feat.get("additionalSpells") or []))


def _choose_from(blocks) -> list[str]:
    block = (blocks or [{}])[0]
    return (block.get("choose") or {}).get("from") or []


def _true_keys(blocks) -> list[str]:
    """Faste tildelinger: nøgler med værdien true (ikke choose/any*)."""
    out = []
    for block in blocks or []:
        out += [k for k, v in block.items() if v is True]
    return out


def fixed_grants(feat: dict) -> dict:
    """Det feat'et giver UDEN valg, som 5etools skriver det."""
    senses = {}
    for block in feat.get("senses") or []:
        senses.update({k: v for k, v in block.items() if isinstance(v, int)})
    resist = []
    for block in feat.get("resist") or []:
        resist += [k for k, v in block.items() if v is True]
        resist += [x for x in block.get("fixed", []) if isinstance(x, str)] if isinstance(block.get("fixed"), list) else []
    return {
        "skills": _true_keys(feat.get("skillProficiencies")),
        "tools": _true_keys(feat.get("toolProficiencies")),
        "armor": _true_keys(feat.get("armorProficiencies")),
        "weapons": _true_keys(feat.get("weaponProficiencies")),
        "saves": _true_keys(feat.get("savingThrowProficiencies")),
        "senses": senses,
        "resist": resist,
    }


def armor_text(keys: list[str]) -> list[str]:
    """Samme råord som klassernes startingProficiencies.armor bruger (light, medium, heavy, shield)."""
    return list(keys)


def weapon_text(keys: list[str]) -> list[str]:
    """Samme råord som klassernes startingProficiencies.weapons bruger (simple, martial), plus fx improvised."""
    return list(keys)


def required_armor(prerequisite_alt: dict) -> list[str]:
    """Rustningskrav i ét forudsætnings-alternativ: [{'proficiency': [{'armor': 'medium'}]}] -> ['medium']."""
    return [p["armor"] for p in (prerequisite_alt.get("proficiency") or []) if p.get("armor")]
