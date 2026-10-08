"""Oversætter character.yaml + sheets.yaml (engelsk-nøglet, NYT system) til
den dict-form scripts/karakterark/karakterark.py allerede forstår (dansk-
nøglet {"titel", "faelles", "sider"}, se docs/karakterark-yaml.md).

karakterark.py ændres IKKE af dette - de 8 eksisterende, håndskrevne
karakterer bruger den uændret, direkte på deres egen karakter.yaml. Denne
oversættelse er kun til Print-fanen for choices.yaml-karakterer, så den
~700 linjer store layout-/boks-kode kan genbruges 1:1 i stedet for duplikeres.
"""
from __future__ import annotations

# Bokstyper: engelsk (sheets.yaml) -> dansk (karakterark.py's REGISTRY).
BOX_TYPES = {
    "stats": "stats", "abilities": "evner", "passive": "passiv", "languages": "sprog",
    "attacks": "angreb", "rules": "regler", "features": "traek", "bonus_actions": "bonus",
    "turn": "tur", "actions": "handlinger", "unarmed": "ubevaebnet", "movement": "bevaegelse",
    "extra": "ekstra", "death_saves": "livsredning", "mastery": "mastery", "useful": "nyttige",
    "skill_checks": "situationer", "conditions": "tilstande", "magic": "magi", "money": "penge",
    "text": "tekst", "facts": "fakta", "list": "liste", "training": "traening",
    "weapons": "vaaben", "gear": "udstyr", "special": "sarlige", "campaign": "kampagne",
    "places": "steder", "people": "personer", "appearance": "udseende", "traits": "kendetegn",
    "backstory": "historie", "personality": "personlighed", "family": "familie",
    "enemies": "fjender", "goals": "maal", "secrets": "hemmeligheder",
}

# Felt-nøgler inde i et layout-træ (top/kolonner/rækker/bokse): engelsk -> dansk.
NODE_KEY_MAP = {
    "columns": "kolonner", "rows": "raekker", "width": "bredde", "content": "indhold",
    "merged": "samlet", "title": "titel", "subtitle": "undertitel", "footer": "foot",
    "box_type": "bokstype", "summary": "ident", "items": "punkter", "blank_lines": "tomme",
    "fields": "felter", "paragraphs": "afsnit", "name": "navn", "text": "tekst",
    "tools": "vaerktoej", "ability": "evne", "use": "brug", "level": "niveau",
    "attacks": "angreb", "lists": "liste",
}

# character.yaml-felt -> faelles-felt (dansk). Felter uden for denne liste
# (race, background, classes, spells_known, class_features, race_traits, tools)
# har ingen direkte faelles-modpart og bruges ikke her - se docs/character-yaml.md.
CHARACTER_FIELD_MAP = {
    "name": "navn", "summary": "ident", "abilities": "evner", "proficiency_bonus": "pb",
    "level": "level", "hp": "hp", "ac": "ac", "speed": "fart", "hit_die": "hit_die",
    "saves": "saves", "skills": "skills", "expertise": "expertise", "languages": "sprog",
    "masteries": "masteries", "extra_training": "traening_ekstra",
}

CAN_USE_MAP = {"armor": "Rustning", "weapons": "Våben", "tools": "Værktøj"}


def _translate_node(node):
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            new_key = NODE_KEY_MAP.get(key, key)
            if key == "type" and isinstance(value, str):
                out[new_key] = BOX_TYPES.get(value, value)
            else:
                out[new_key] = _translate_node(value)
        return out
    if isinstance(node, list):
        return [_translate_node(v) for v in node]
    return node


def _faelles(character: dict) -> dict:
    faelles = {CHARACTER_FIELD_MAP[k]: v for k, v in character.items() if k in CHARACTER_FIELD_MAP}
    faelles["feats"] = [f["name"] for f in character.get("feats", []) if f.get("name")]
    faelles["kan_bruge"] = {CAN_USE_MAP.get(k, k): v for k, v in (character.get("can_use") or {}).items()}
    faelles.setdefault("vaerktoej", {})
    return faelles


def to_legacy(character: dict, sheets: dict) -> dict:
    return {
        "titel": character.get("name") or "Karakterark",
        "faelles": _faelles(character),
        "sider": [_translate_node(page) for page in sheets.get("pages", [])],
    }
