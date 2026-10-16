"""Standardlayout (sheets.yaml-struktur) ud fra character.yaml, når en karakter ikke har sin egen sheets.yaml.

Neutralt: ingen klassespecifikke bokse. Hvilke bokse og sider der kommer med, afgøres af hvad karakteren kan:

* spells/cantrips/magi: kun hvis karakteren har spellcasting, tildelte spells eller kendte spells
* angreb og udstyr: bokse med `auto: true`, der læser våben og rustning fra character.yaml
* evner og træk: en side, hvis der er klassefeatures, race-traits eller feats
* ressourcer, bonus actions, reactions, klasse-tal og fordele: bokse der udelades selv, hvis de er tomme

Boksene er `auto: true`, så de følger karakteren, når den ændres; layoutet er kun rammen. Sider uden indhold udelades.
Formatet står i docs/sheets-yaml.md.
"""
from __future__ import annotations

import yaml

from . import spellbox

def _page(layout: list, top: dict | None = None, footer: str | None = None) -> dict:
    page: dict = {"margin": "small", "top": top if top is not None else {}, "layout": layout}
    if footer:
        page["footer"] = footer
    return page


def _character_page(character: dict) -> dict:
    right = [
        {"type": "attacks", "title": "Angreb <em>· Attacks</em>", "auto": True},
        {"columns": [
            {"width": 1, "content": [{"type": "resources"}, {"type": "class_numbers"}]},
            {"width": 1, "content": [
                {"type": "bonus_actions", "title": "Bonus actions", "auto": True},
                {"type": "reactions", "title": "Reactions", "auto": True},
                {"type": "modifiers"},
            ]},
        ]},
    ]
    return _page([
        {"type": "stats"},
        {"columns": [
            {"width": 1, "content": [
                {"type": "abilities"},
                {"type": "languages", "title": "Sprog"},
                {"type": "passive", "title": "Passive sanser"},
            ]},
            {"width": 2, "content": right},
        ]},
    ], footer="Kilde: PHB 2024")


def _features_page(character: dict) -> dict | None:
    left, right = [], []
    if character.get("class_features"):
        left.append({"type": "features", "title": "Klasseevner <em>Class features</em>", "auto": True, "include": ["class_features"]})
    if character.get("race_traits"):
        right.append({"type": "features", "title": "Artens træk <em>Species traits</em>", "auto": True, "include": ["race_traits"]})
    if character.get("feats"):
        right.append({"type": "features", "title": "Feats", "auto": True, "include": ["feats"]})
    if not (left or right):
        return None
    cols = [{"width": 1, "content": left}, {"width": 1, "content": right}] if left and right else [{"width": 1, "content": left or right}]
    return _page([{"columns": cols}], top={"subtitle": "Evner og træk"}, footer="Kilde: PHB 2024")


# Over så mange tabelrækker passer spells ikke i én smal kolonne ved siden af cantrips (se spellbox.row_estimate)
WIDE_ROWS = 34


def _magic_pages(character: dict) -> list[dict]:
    """Magi-side: DC-celler øverst, derunder cantrips og spells side om side (aldrig i samme liste).
    En spellbog (Wizard) større end de forberedte får en side for sig. Er listen for lang, deles den på flere sider."""
    if not spellbox.has_spells(character):
        return []
    entries = spellbox.collect(character)
    has_cantrips = any(e.is_cantrip for e in entries)
    has_spells = any(not e.is_cantrip for e in entries)
    pages = []
    layout: list = [{"type": "magic", "auto": True}]
    if spellbox.row_estimate(character) > WIDE_ROWS:
        # for mange rækker til én smal kolonne: cantrips øverst, spells i fuld bredde i to tabeller
        if has_cantrips:
            layout.append({"type": "cantrips"})
        if has_spells:
            layout.append({"type": "spells", "list": "prepared", "split": 2})
    else:
        cols = []
        if has_cantrips:
            cols.append({"width": 1, "content": [{"type": "cantrips"}]})
        if has_spells:
            cols.append({"width": 1.6, "content": [{"type": "spells", "list": "prepared"}]})
        if cols:
            layout.append({"columns": cols})
    pages.append(_page(layout, top={"subtitle": "Magi"}, footer="Kilde: PHB 2024 · kap. 7 (spellcasting)"))
    # Spellbogen: kun hvis den indeholder spells ud over de forberedte
    book = [e for e in entries if "book" in e.kinds and not e.is_cantrip]
    if book and any("prepared" not in e.kinds for e in book):
        pages.append(_page([{"columns": [{"width": 1, "content": [{"type": "spells", "list": "spellbook", "title": "Spellbog <em>Spellbook</em>", "split": 2 if len(book) > 36 else 1}]}]}],
                           top={"subtitle": "Spellbog"}, footer="Kilde: PHB 2024 · kap. 4 (Wizard)"))
    return pages


def _actions_page(character: dict) -> dict:
    return _page([
        {"type": "actions"},
        {"columns": [
            {"width": 1, "merged": "tight", "content": [
                {"type": "unarmed"}, {"type": "movement"}, {"type": "death_saves"}, {"type": "mastery"}, {"type": "useful"},
            ]},
            {"width": 1.25, "merged": "tight", "content": [{"type": "skill_checks"}, {"type": "conditions"}]},
        ]},
    ], top={
        "subtitle": "Hvad kan jeg gøre?",
        "summary": [["Slag", "d20 + tallet"], ["Fordel", "2 d20, tag højeste"], ["Ulempe", "2 d20, tag laveste"]],
    }, footer="Kilde: Player's Handbook 2024 · kap. 1 (handlinger)")


def _equipment_page(character: dict) -> dict:
    return _page([{"columns": [
        {"width": 1, "content": [
            {"type": "weapons", "auto": True, "items": [], "blank_lines": 2},
            {"type": "gear", "auto": True, "items": [], "blank_lines": 6},
            {"type": "special", "items": [], "blank_lines": 2},
            {"type": "money"},
        ]},
        {"width": 1, "content": [
            {"type": "campaign", "items": [], "blank_lines": 10},
            {"type": "places", "items": [], "blank_lines": 6},
            {"type": "people", "items": [], "blank_lines": 6},
        ]},
    ]}])


def _background_page(character: dict) -> dict:
    return _page([{"columns": [
        {"width": 1, "content": [
            {"type": "appearance", "fields": [["Alder", ""], ["Højde", ""]]},
            {"type": "traits", "items": [], "blank_lines": 3},
            {"type": "backstory", "paragraphs": [], "blank_lines": 8},
            {"type": "training"},
        ]},
        {"width": 1, "content": [
            {"type": "personality", "items": [], "blank_lines": 4},
            {"type": "family", "items": [], "blank_lines": 4},
            {"type": "enemies", "items": [], "blank_lines": 4},
            {"type": "goals", "items": [], "blank_lines": 4},
            {"type": "secrets", "items": [], "blank_lines": 4},
        ]},
    ]}])


def build(character: dict) -> dict:
    """sheets.yaml-strukturen ({'pages': [...]}) for denne karakter."""
    pages = [_character_page(character), _features_page(character), *_magic_pages(character),
             _actions_page(character), _equipment_page(character), _background_page(character)]
    return {"pages": [p for p in pages if p]}


HEADER = """# Standardlayout lavet ud fra character.yaml (webui/builder/default_layout.py). Redigér frit: filen overskrives aldrig.
# Bokse med `auto: true` (og spells, cantrips, magic) læser selv deres indhold fra character.yaml.
# Format: docs/sheets-yaml.md
"""


def to_yaml(character: dict) -> str:
    return HEADER + yaml.safe_dump(build(character), allow_unicode=True, sort_keys=False, width=10_000)
