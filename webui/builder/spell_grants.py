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
* `expanded` (Bard, Eldritch Knight, Arcane Trickster) er spells, der FØJES til klassens liste;
  `s6` betyder "når man har spell slots af 6. niveau". `{"all": filter}` = alle spells, der matcher.
* En post er enten et spell-id (`"light|xphb#c"`, `#c` = cantrip) eller
  `{"choose": "level=0|class=wizard", "count": 2}` (et filter).
"""
from __future__ import annotations

from . import e5tools as e

ADDITIONS = ("known", "innate", "prepared", "expanded")
ABILITY_USES = {"str", "dex", "con", "int", "wis", "cha"}
RECHARGE_KEYS = {"daily", "rest", "restLong", "weekly", "monthly", "yearly", "will", "ritual", "resource", "limited", "charges"}


def walk(block: dict) -> list[dict]:
    """Poster i den rækkefølge, de står i dataene: {kind: 'fixed'|'choose', value,
    count, addition, level, recharge, uses}. `level` er det karakterniveau, spellen
    låses op på (1, hvis ingen niveaunøgle), `uses` er '1', '1e', 'pb' eller None."""
    out: list[dict] = []
    for addition, node in block.items():
        if addition in ADDITIONS:
            _walk(node, {"addition": addition, "level": None, "recharge": None, "uses": None, "slot_level": None}, out)
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
            elif ctx["recharge"] and (key.rstrip("e").isdigit() or key == "pb" or key in ABILITY_USES):
                sub["uses"] = key  # '1', '1e', 'pb', eller en evne ('cha' = Charisma-modifier gange)
            elif key.isdigit():
                sub["level"] = int(key)
            elif len(key) == 2 and key[0] == "s" and key[1].isdigit():
                sub["slot_level"] = int(key[1])  # 's6': først når man har spell slots af 6. niveau
            else:
                continue
            _walk(value, sub, out)


def _item(item, ctx: dict, out: list[dict]) -> None:
    record = {**ctx, "level": ctx["level"] or 1}
    if isinstance(item, str):
        out.append({**record, "kind": "fixed", "value": item, "count": 1})
    elif isinstance(item, dict) and isinstance(item.get("choose"), str):
        out.append({**record, "kind": "choose", "value": item["choose"], "count": item.get("count", 1)})
    elif isinstance(item, dict) and isinstance(item.get("all"), str):
        out.append({**record, "kind": "all", "value": item["all"], "count": 0})  # alle spells, der matcher filteret


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


_RECHARGE_TEXT = {
    "daily": "pr. Long Rest", "restLong": "pr. Long Rest", "long_rest": "pr. Long Rest",
    "rest": "pr. Short Rest", "short_rest": "pr. Short Rest",
    "weekly": "pr. uge", "will": "efter ønske", "ritual": "som ritual",
}


def use_text(addition: str, recharge: str | None, uses: str | None) -> str:
    """Kort dansk tekst for hvordan en tildelt spell bruges, fx '1 pr. Long Rest', 'PB pr. Long Rest',
    'kendt' eller 'altid forberedt'. `recharge` kan være 5etools' nøgle (daily) eller den normaliserede (long_rest)."""
    if not recharge:
        return {"known": "kendt", "prepared": "altid forberedt"}.get(addition, "")
    when = _RECHARGE_TEXT.get(recharge, recharge)
    if recharge in ("will", "ritual") or not uses:
        return when
    if uses in ABILITY_USES:  # Archfey: Charisma-modifier gange
        return f"{uses.upper()}-modifier gange {when}"
    count = "PB" if uses == "pb" else uses.rstrip("e")
    return f"{count} {when}" + (" hver" if uses.endswith("e") else "")


# ── Spell-filtre: {"choose": "level=0;1|class=Wizard|school=A"} ─────────────────────────
FILTER_KEYS = {"level", "school", "class", "components & miscellaneous", "spell attack"}


def parse_filter(filter_str: str) -> dict | None:
    """'level=1|school=I;N' -> {'level': '1', 'school': 'I;N'}. None hvis filteret bruger et felt vi
    slet ikke genkender - så det bevidst springes over i stedet for at vise en forkert/tom liste."""
    parsed = {}
    for part in filter_str.split("|"):
        if "=" not in part:
            return None
        key, value = part.split("=", 1)
        key = key.strip()
        if key not in FILTER_KEYS:
            return None
        parsed[key] = value.strip()
    return parsed


def spells_for_filter(parsed: dict, sources: set[str]) -> list[dict]:
    """Spells, der matcher et parset filter, i de tilladte kilder. Flere tilladte kilder kan genoptrykke
    samme spell (PHB 2014 + XPHB), og udgaverne er ikke nødvendigvis ens: ingen fjernes, men navnet
    suffikses med kilden, når det er tvetydigt."""
    level = {int(x) for x in parsed["level"].split(";") if x.strip().isdigit()} if "level" in parsed else None
    schools = set(parsed["school"].split(";")) if "school" in parsed else None
    class_names = {c.capitalize() for c in parsed["class"].split(";")} if "class" in parsed else None
    ritual = True if parsed.get("components & miscellaneous") == "ritual" else None
    spell_attack = set(parsed["spell attack"].split(";")) if "spell attack" in parsed else None
    spells = e.spells_by_filter(sources, level=level, schools=schools, class_name=class_names, ritual=ritual, spell_attack=spell_attack) or []
    by_name: dict[str, int] = {}
    for sp in spells:
        by_name[sp["name"]] = by_name.get(sp["name"], 0) + 1
    seen: set[tuple[str, str | None]] = set()
    out = []
    for sp in spells:
        key = (sp["name"], sp.get("source"))
        if key in seen:
            continue
        seen.add(key)
        label = f"{sp['name']} ({sp.get('source')})" if by_name[sp["name"]] > 1 else sp["name"]
        out.append({**sp, "name": label})
    return out
