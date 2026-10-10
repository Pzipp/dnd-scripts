"""Læser 5etools' `additionalSpells`-blokke til en flad liste af poster, brugt af
model.py (hvilke valg skal stilles) og character_yaml.py (hvilke spells giver
racen/feat'et karakteren).

Blokken er et træ. Nøglerne betyder:

* Øverste niveau: `known` (lært), `innate` (kan kastes uden slot), `prepared`
  (altid forberedt), `expanded` (føjes til listen). `ability`: spellcasting-evne
  (`"cha"`, `{"choose": ["int","wis","cha"]}` eller `"inherit"` = den evne,
  feat'et forhøjede). `name`: navn på et alternativ, når en race/feat har
  flere blokke at vælge imellem.
* Under en addition: et tal er KARAKTERNIVEAUET spellen låses op på (`"1"`,
  `"3"`), `"_"` = ingen niveaukrav. Er en værdi en liste, er det spells.
* Under `innate` sidder brugsformen: `daily` / `rest` / `restLong` / `weekly`
  / `will` / `ritual`, og her er tal ANTAL BRUG (`daily: {"1": [...]}` = 1 pr.
  dag for hele listen, `"1e"` = 1 pr. dag for HVER spell, `"pb"` = Proficiency
  Bonus gange).
* En post er enten et spell-id (`"light|xphb#c"`, `#c` = cantrip) eller
  `{"choose": "level=0|class=wizard", "count": 2}` (et filter).
"""
from __future__ import annotations

ADDITIONS = ("known", "innate", "prepared", "expanded")
RECHARGE_KEYS = {"daily", "rest", "restLong", "weekly", "monthly", "yearly", "will", "ritual", "resource", "limited", "charges"}


def walk(block: dict) -> list[dict]:
    """Poster i den rækkefølge, de står i dataene: {kind: 'fixed'|'choose', value,
    count, addition, level, recharge, uses}. `level` er det karakterniveau, spellen
    låses op på (1, hvis ingen niveaunøgle), `uses` er '1', '1e', 'pb' eller None."""
    out: list[dict] = []
    for addition, node in block.items():
        if addition in ADDITIONS:
            _walk(node, {"addition": addition, "level": None, "recharge": None, "uses": None}, out)
    return out


def _walk(node, ctx: dict, out: list[dict]) -> None:
    if isinstance(node, list):
        for item in node:
            _item(item, ctx, out)
    elif isinstance(node, dict):
        for key, value in node.items():
            sub = dict(ctx)
            if key == "_":
                pass
            elif key in RECHARGE_KEYS:
                sub["recharge"] = key
            elif ctx["recharge"] and (key.rstrip("e").isdigit() or key == "pb"):
                sub["uses"] = key
            elif key.isdigit():
                sub["level"] = int(key)
            else:
                continue
            _walk(value, sub, out)


def _item(item, ctx: dict, out: list[dict]) -> None:
    record = {**ctx, "level": ctx["level"] or 1}
    if isinstance(item, str):
        out.append({**record, "kind": "fixed", "value": item, "count": 1})
    elif isinstance(item, dict) and isinstance(item.get("choose"), str):
        out.append({**record, "kind": "choose", "value": item["choose"], "count": item.get("count", 1)})


def parse_uid(uid: str) -> dict:
    """'light|xphb#c' -> {'name': 'light', 'source': 'xphb', 'cantrip': True}."""
    main, _, flag = uid.partition("#")
    name, _, source = main.partition("|")
    return {"name": name.strip(), "source": source.strip() or None, "cantrip": flag == "c"}


def ability_choice(block: dict) -> list[str] | None:
    """Spellcasting-evner at vælge imellem (['INT','WIS','CHA']), ellers None."""
    ability = block.get("ability")
    if isinstance(ability, dict) and isinstance(ability.get("choose"), list):
        return [a.upper() for a in ability["choose"]]
    return None


def fixed_ability(block: dict) -> str | None:
    ability = block.get("ability")
    return ability.upper() if isinstance(ability, str) and ability != "inherit" else None
