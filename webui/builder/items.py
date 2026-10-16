"""Udstyrskatalog til byggerens udstyrsvælger (fanen Udstyr) og til udregning af våben/inventar.

Kilden er 5etools' items-base.json (våben, rustning, værktøj ...) og items.json (eventyrudstyr, pakker ...),
begrænset til de tilladte kilder (XPHB som standard) og kun almindelige (ikke-magiske) ting. Homebrew
(`baseitem`/`item`) kommer med via e5tools. Navne er engelske regelnavne; kun UI-etiketterne er danske.
"""
from __future__ import annotations

from . import e5tools as e

# 5etools type-kode (før '|') -> (gruppe, dansk gruppenavn til filteret)
KINDS = {
    "weapon": "Våben", "armor": "Rustning", "shield": "Shield", "ammo": "Ammunition",
    "tool": "Værktøj og instrumenter", "focus": "Spellcasting Focus", "gear": "Eventyrudstyr", "other": "Andet (mounts, køretøjer, mad ...)",
}
_TYPE_KIND = {
    "M": "weapon", "R": "weapon", "LA": "armor", "MA": "armor", "HA": "armor", "S": "shield", "A": "ammo",
    "AT": "tool", "T": "tool", "GS": "tool", "INS": "tool", "SCF": "focus", "G": "gear",
}
_DAMAGE = {"S": "Slashing", "P": "Piercing", "B": "Bludgeoning"}
_PROPS = {"F": "Finesse", "L": "Light", "T": "Thrown", "V": "Versatile", "H": "Heavy", "R": "Reach", "2H": "Two-Handed",
          "A": "Ammunition", "LD": "Loading"}
# Danske navne til angrebstabellen (dansk øverst, engelsk under). Våben uden post vises kun med det engelske navn.
NAME_DA = {
    "Battleaxe": "Stridsøkse", "Blowgun": "Blæserør", "Club": "Kølle", "Dagger": "Dolk", "Dart": "Pil", "Flail": "Plejl",
    "Glaive": "Glavind", "Greataxe": "Tohåndsøkse", "Greatclub": "Stor kølle", "Greatsword": "Tohåndssværd",
    "Halberd": "Hellebard", "Hand Crossbow": "Håndarmbrøst", "Handaxe": "Håndøkse", "Heavy Crossbow": "Tung armbrøst",
    "Javelin": "Kastespyd", "Lance": "Lanse", "Light Crossbow": "Let armbrøst", "Light Hammer": "Let hammer",
    "Longbow": "Langbue", "Longsword": "Langsværd", "Mace": "Stridsklub", "Morningstar": "Morgenstjerne",
    "Pike": "Pike", "Quarterstaff": "Stav", "Rapier": "Rapir", "Scimitar": "Krumsabel", "Shortbow": "Kortbue",
    "Shortsword": "Kortsværd", "Sickle": "Segl", "Sling": "Slangebøsse", "Spear": "Spyd", "Trident": "Trefork",
    "War Pick": "Krigsspids", "Warhammer": "Krigshammer", "Whip": "Pisk",
}

# Pakke-valg ("equipmentType" i startingEquipment) -> filter på kataloget
PICK_FILTERS = {
    "weaponSimple": {"kind": "weapon", "category": "simple"},
    "weaponSimpleMelee": {"kind": "weapon", "category": "simple", "ranged": False},
    "weaponMartial": {"kind": "weapon", "category": "martial"},
    "weaponMartialMelee": {"kind": "weapon", "category": "martial", "ranged": False},
    "instrumentMusical": {"type": "INS"},
    "toolArtisan": {"type": "AT"},
    "setGaming": {"type": "GS"},
    "focusSpellcastingHoly": {"type": "SCF", "scf": "holy"},
    "focusSpellcastingArcane": {"type": "SCF", "scf": "arcane"},
    "focusSpellcastingDruidic": {"type": "SCF", "scf": "druid"},
}
PICK_LABELS = {
    "weaponSimple": "ét Simple-våben", "weaponSimpleMelee": "ét Simple Melee-våben", "weaponMartial": "ét Martial-våben",
    "weaponMartialMelee": "ét Martial Melee-våben", "instrumentMusical": "et Musical Instrument", "toolArtisan": "et Artisan's Tools",
    "setGaming": "et Gaming Set", "focusSpellcastingHoly": "et Holy Symbol", "focusSpellcastingArcane": "et Arcane Focus",
    "focusSpellcastingDruidic": "et Druidic Focus",
}


def _code(item: dict) -> str:
    return (item.get("type") or "").split("|")[0]


def kind_of(item: dict) -> str:
    if item.get("weaponCategory") and _code(item) in ("M", "R"):
        return "weapon"
    return _TYPE_KIND.get(_code(item), "other")


def price(item: dict) -> str:
    v = item.get("value")
    if not v:
        return ""
    if v % 100 == 0:
        return f"{v // 100} GP"
    if v % 10 == 0:
        return f"{v // 10} SP"
    return f"{v} CP"


def _weight(item: dict) -> str:
    w = item.get("weight")
    if not w:
        return ""
    return f"{w:g} lb"


def _ref(x) -> str:
    """5etools-reference: 'F|XPHB' eller {'uid': 'F|XPHB', ...} -> kode."""
    return (x.get("uid") if isinstance(x, dict) else x or "").split("|")[0]


def properties(item: dict) -> list[str]:
    return [_PROPS.get(_ref(p), _ref(p)) for p in item.get("property") or []]


def _pool() -> list[dict]:
    return (e._load("items-base.json").get("baseitem", []) + e._load("items.json").get("item", [])
            + e._homebrew_entries("baseitem") + e._homebrew_entries("item"))


def _plain(item: dict) -> bool:
    """Almindelige ting: ikke magiske (rarity none/tom), ikke generiske varianter."""
    return item.get("rarity") in (None, "none", "unknown") and not item.get("reqAttune") and not item.get("bonusWeapon") \
        and not item.get("bonusAc") and not item.get("_copy") and item.get("name")


def entry(item: dict) -> dict:
    """Én kataloglinje: det UI'et behøver for at vise og filtrere, og byggeren for at regne."""
    kind = kind_of(item)
    code = _code(item)
    out = {
        "name": item["name"], "source": item.get("source"), "kind": kind, "type": code,
        "weight": _weight(item), "price": price(item),
    }
    if kind == "weapon":
        props = properties(item)
        mastery = [_ref(m) for m in item.get("mastery") or []]
        out.update({
            "category": item.get("weaponCategory"), "ranged": code == "R", "properties": props,
            "damage": f"{item['dmg1']} {_DAMAGE.get(item.get('dmgType'), item.get('dmgType') or '')}".strip() if item.get("dmg1") else "",
            "mastery": mastery[0] if mastery else "",
        })
        if item.get("dmg2") and "Versatile" in props:
            out["damage"] += f" ({item['dmg2']} Versatile)"
        if item.get("range"):
            out["range"] = item["range"]
    elif kind in ("armor", "shield"):
        out.update({"armor_type": {"LA": "Light", "MA": "Medium", "HA": "Heavy", "S": "Shield"}[code], "ac": item.get("ac"),
                    "stealth": bool(item.get("stealth")), "strength": item.get("strength")})
    elif kind == "focus":
        out["scf"] = item.get("scfType") or ""
    return out


def catalog(sources: set[str]) -> list[dict]:
    seen, out = set(), []
    for item in _pool():
        if item.get("source") not in sources or not _plain(item):
            continue
        key = (item["name"], item.get("source"))
        if key in seen:
            continue
        seen.add(key)
        out.append(entry(item))
    out.sort(key=lambda x: (list(KINDS).index(x["kind"]), x["name"]))
    return out


def lookup(name: str, source: str | None, sources: set[str]) -> dict | None:
    """Katalogposten for et navn (og evt. kilde); ellers første match i de tilladte kilder."""
    for item in _pool():
        if item.get("name") == name and (not source or item.get("source") == source) and item.get("source") in (sources | ({source} if source else set())):
            return item
    return None


def matches(item: dict, flt: dict) -> bool:
    """Passer en katalogpost (entry()) på et PICK_FILTERS-filter?"""
    if "kind" in flt and item["kind"] != flt["kind"]:
        return False
    if "type" in flt and item["type"] != flt["type"]:
        return False
    if "category" in flt and item.get("category") != flt["category"]:
        return False
    if "ranged" in flt and item.get("ranged") != flt["ranged"]:
        return False
    if "scf" in flt and item.get("scf") != flt["scf"]:
        return False
    return True
