"""Kontrol af en håndskrevet (eller LLM-skrevet) character.yaml og sheets.yaml.

Ingen LLM og intet netværk. Findes 5etools-data (E5TOOLS_DATA), slås race, baggrund, klasse, subclass, feats og
spells op; ellers springes de opslag over. Hver fund har linje og kolonne i filen og er enten

  * FEJL: arket kan ikke bygges, eller tallene på det bliver forkerte, eller
  * ADVARSEL: mistænkeligt, men arket kan bygges.

Kontrollen kender de samme tabeller som render.py (skills, boks-typer, mastery), så de to er enige.
Formatet står i docs/character-yaml.md og docs/sheets-yaml.md.
"""
from __future__ import annotations

import ast
import difflib
import re
from pathlib import Path
from typing import NamedTuple

import yaml
from yaml.nodes import MappingNode, ScalarNode, SequenceNode

from . import character_yaml, default_layout, render

ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]
SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]
HIT_DIE_FACES = [6, 8, 10, 12]
SPEED_KINDS = ["walk", "fly", "swim", "climb", "burrow"]
RECHARGES = ["long_rest", "short_rest", "dawn", "dusk", "turn", "round", "none"]
DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison",
                "psychic", "radiant", "slashing", "thunder"]
CONDITION_NAMES = ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated",
                   "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"]
SENSES = ["darkvision", "blindsight", "tremorsense", "truesight"]
CAN_USE_KEYS = list(render.CAN_USE_DISPLAY)
# Nøgler, character.yaml kan have: de afledte felter (character_yaml.empty_character_sheet) plus ac_note.
KNOWN_KEYS = list(character_yaml.empty_character_sheet()) + ["ac_note"]
# Mangler disse, kan arket ikke bygges, eller tallene bliver forkerte (en stille standard ville gætte).
REQUIRED = ["name", "level", "race", "background", "classes", "abilities", "proficiency_bonus", "hp",
            "hit_dice", "ac", "speed", "saves", "skills"]
# Mangler disse, bygges arket, men med en tom eller generisk standard.
RECOMMENDED = {
    "initiative": "standarden {+DEX} bruges",
    "languages": "standarden 'Common' bruges",
    "can_use": "Træning og valg viser ingen rustning eller våben",
    "summary": "sidehovedet viser ingen Klasse/Art/Baggrund",
}
FORMULA_FIELDS = ("ac", "initiative", "languages")
_FORMULA = re.compile(r"\{([^{}]+)\}")
_ENV = {**{a: 0 for a in ABILITIES}, "PB": 2}
_OKAY_NODES = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant, ast.Name, ast.Load,
               ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.USub, ast.UAdd)


class Issue(NamedTuple):
    level: str      # "fejl" eller "advarsel"
    line: int
    col: int
    message: str


def is_int(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _suggest(value, options) -> str:
    near = difflib.get_close_matches(str(value).lower(), [str(o).lower() for o in options], n=1, cutoff=0.6)
    if not near:
        return ""
    real = next(o for o in options if str(o).lower() == near[0])
    return f" Mente du {real!r}?"


def _quote(options) -> str:
    return ", ".join(str(o) for o in options)


# ---------------------------------------------------------------- formler
def formula_problem(expr: str) -> str | None:
    """None, hvis udtrykket i {...} kan regnes ud af render.fmt(); ellers en dansk forklaring."""
    body = expr.strip().lstrip("+").strip()
    try:
        tree = ast.parse(body, mode="eval")
    except SyntaxError:
        return f"formlen {{{expr}}} er ikke et gyldigt regnestykke. Brug STR DEX CON INT WIS CHA PB, tal og + - * (fx '{{+DEX+PB}}')"
    for node in ast.walk(tree):
        if not isinstance(node, _OKAY_NODES):
            return f"formlen {{{expr}}} må kun have tal, STR DEX CON INT WIS CHA PB og + - * / (ikke {type(node).__name__})"
        if isinstance(node, ast.Name) and node.id not in _ENV:
            return f"ukendt navn {node.id!r} i formlen {{{expr}}}.{_suggest(node.id.upper(), _ENV)} Kendte: {_quote(_ENV)}"
        if isinstance(node, ast.Constant) and not (is_int(node.value) or isinstance(node.value, float)):
            return f"formlen {{{expr}}} må kun have tal"
    try:
        eval(compile(tree, "<formel>", "eval"), {"__builtins__": {}}, dict(_ENV))
    except Exception as exc:
        return f"formlen {{{expr}}} kan ikke regnes ud: {exc}"
    return None


def _unsafe(expr: str) -> bool:
    """Udtryk, der aldrig må nå render.fmt() (som kører eval): kald, attributter og lignende."""
    try:
        tree = ast.parse(expr.strip().lstrip("+").strip(), mode="eval")
    except SyntaxError:
        return False
    return any(not isinstance(n, _OKAY_NODES) and not isinstance(n, ast.Name) for n in ast.walk(tree))


# ---------------------------------------------------------------- YAML med positioner
class Doc:
    """Teksten som YAML-nodes (til linje og kolonne) og som data. Fundene samles i .issues."""

    def __init__(self, text: str):
        self.issues: list[Issue] = []
        self.root = None
        self.data = None
        try:
            self.root = yaml.compose(text, Loader=yaml.SafeLoader)
            self.data = yaml.safe_load(text)
        except yaml.YAMLError as exc:
            mark = getattr(exc, "problem_mark", None)
            self.issues.append(Issue("fejl", mark.line + 1 if mark else 1, mark.column + 1 if mark else 1,
                                     f"YAML-fejl: {getattr(exc, 'problem', None) or exc}"))
            return
        if self.root is None or not isinstance(self.root, MappingNode) or not isinstance(self.data, dict):
            self.issues.append(Issue("fejl", 1, 1, "Filen skal være en YAML-mappe (nøgle: værdi) øverst."))
            self.data = None
            return
        self._duplicates(self.root)

    def _duplicates(self, node):
        if isinstance(node, MappingNode):
            seen = set()
            for k, v in node.value:
                if isinstance(k, ScalarNode):
                    if k.value in seen:
                        self.add("fejl", k, f"Nøglen {k.value!r} står to gange i samme mappe. YAML beholder kun den sidste.")
                    seen.add(k.value)
                self._duplicates(v)
        elif isinstance(node, SequenceNode):
            for v in node.value:
                self._duplicates(v)

    def node(self, path=(), key=False):
        """Noden for en sti. Findes stien ikke (fx en manglende nøgle), returneres den sidste node, der findes.
        key=True giver nøglens node i stedet for værdiens (til ukendte nøgler)."""
        cur = self.root
        for i, step in enumerate(path):
            nxt = None
            if isinstance(cur, MappingNode):
                for k, v in cur.value:
                    if isinstance(k, ScalarNode) and k.value == step:
                        nxt = k if (key and i == len(path) - 1) else v
                        break
            elif isinstance(cur, SequenceNode) and is_int(step) and 0 <= step < len(cur.value):
                nxt = cur.value[step]
            if nxt is None:
                return cur
            cur = nxt
        return cur

    def add(self, level, node, message):
        mark = node.start_mark if node is not None else None
        self.issues.append(Issue(level, mark.line + 1 if mark else 1, mark.column + 1 if mark else 1, message))

    def err(self, path, message, key=False):
        self.add("fejl", self.node(path, key), message)

    def warn(self, path, message, key=False):
        self.add("advarsel", self.node(path, key), message)

    def sorted_issues(self) -> list[Issue]:
        return sorted(self.issues, key=lambda i: (i.line, i.col, i.level != "fejl"))


# ---------------------------------------------------------------- 5etools (valgfrit)
class Lookup:
    """Opslag i 5etools. available=False, hvis dataene ikke findes; så springes alle opslag over."""

    def __init__(self):
        self.available = False
        self.sources: set[str] = set()
        try:
            from . import e5tools
            if e5tools.available():
                self.e = e5tools
                self.sources = set(e5tools.all_sources())
                self.available = bool(self.sources)
        except Exception:
            self.available = False

    def _src(self, source):
        return {source} if source else self.sources

    def race(self, name, source):
        return self.e.get_race(name, self._src(source))

    def background(self, name, source):
        return self.e.get_background(name, self._src(source))

    def cls(self, name, source):
        return self.e.get_class(name, self._src(source))

    def names(self, kind, source):
        pool = {"race": self.e.races, "background": self.e.backgrounds, "class": self.e.classes}[kind](self._src(source))
        return sorted({x["name"] for x in pool if x.get("name")})


# ---------------------------------------------------------------- character.yaml
class CharacterCheck:
    def __init__(self, doc: Doc, lookup: Lookup | None):
        self.d = doc
        self.c = doc.data
        self.lookup = lookup if (lookup and lookup.available) else None

    # --- små hjælpere
    def need_type(self, path, value, kind, label=None) -> bool:
        ok = {"str": isinstance(value, str), "int": is_int(value), "list": isinstance(value, list), "map": isinstance(value, dict),
              "bool": isinstance(value, bool)}[kind]
        if not ok:
            word = {"str": "tekst", "int": "et helt tal", "list": "en liste", "map": "en mappe (nøgle: værdi)", "bool": "ja/nej"}[kind]
            self.d.err(path, f"{label or '.'.join(map(str, path))} skal være {word}, men er {_describe(value)}.")
        return ok

    def str_list(self, key, optional_values=None, label=None):
        v = self.c.get(key)
        if v is None:
            return []
        if not self.need_type((key,), v, "list", key):
            return []
        out = []
        for i, item in enumerate(v):
            if not isinstance(item, str):
                self.d.err((key, i), f"{key}[{i}] skal være tekst, men er {_describe(item)}.")
            else:
                out.append(item)
        return out

    def named_list(self, key, required=("name",), types=None):
        """Liste af mapper, hver med påkrævede nøgler. Returnerer de gyldige mapper med deres indeks."""
        v = self.c.get(key)
        if v is None:
            return []
        if not self.need_type((key,), v, "list", key):
            return []
        out = []
        for i, item in enumerate(v):
            if not isinstance(item, dict):
                self.d.err((key, i), f"{key}[{i}] skal være en mappe med {_quote(required)}, men er {_describe(item)}.")
                continue
            ok = True
            for r in required:
                if item.get(r) in (None, ""):
                    self.d.err((key, i), f"{key}[{i}] mangler '{r}'.")
                    ok = False
            for field, kind in (types or {}).items():
                if item.get(field) is not None and not _is_kind(item[field], kind):
                    self.d.err((key, i, field), f"{key}[{i}].{field} skal være {_KIND_WORD[kind]}, men er {_describe(item[field])}.")
                    ok = False
            if ok:
                out.append((i, item))
        return out

    # --- hele kontrollen
    def run(self):
        c, d = self.c, self.d
        for key in c:
            if key not in KNOWN_KEYS:
                d.warn((key,), f"Ukendt nøgle {key!r}; render.py bruger den ikke.{_suggest(key, KNOWN_KEYS)}", key=True)
        for key in REQUIRED:
            if key not in c:
                d.err((), f"Mangler {key!r} (påkrævet).{self._required_hint(key)}")
        for key, why in RECOMMENDED.items():
            if key not in c:
                d.warn((), f"Mangler {key!r}: {why}.")

        self.name()
        level = self.level()
        classes = self.classes(level)
        self.abilities()
        self.proficiency_bonus(level)
        self.hp_and_dice(level, classes)
        self.speed()
        self.ac_and_formulas()
        saves = self.saves(classes)
        skills = self.skills()
        self.expertise(skills)
        self.simple_fields()
        self.race_background()
        self.feats_and_spells()
        self.spellcasting(classes)
        self.lists_used_by_render()
        self.formulas_everywhere()
        if self.lookup:
            self.lookups(classes, saves)

    @staticmethod
    def _required_hint(key):
        return {"hp": " Tallet står på arket (Max HP).", "proficiency_bonus": " Tabel: level 1-4: 2, 5-8: 3, 9-12: 4, 13-16: 5, 17-20: 6.",
                "hit_dice": " Fx [{die: 8, count: 3}] for 3 hit dice af d8.", "classes": " Fx [{name: Fighter, source: XPHB, level: 3, subclass: Champion}].",
                "abilities": " Alle seks: STR, DEX, CON, INT, WIS, CHA.", "saves": " Fx [STR, CON].",
                "skills": " Små bogstaver, fx [athletics, perception]. Tom liste er [].", "ac": " Et tal, fx 16, eller en formel, fx '{10+DEX}'.",
                "speed": " Fart i ft, fx 30."}.get(key, "")

    def name(self):
        v = self.c.get("name")
        if "name" in self.c and (not isinstance(v, str) or not v.strip()):
            self.d.err(("name",), "name skal være karakterens navn som tekst.")

    def level(self):
        v = self.c.get("level")
        if v is None:
            return None
        if not self.need_type(("level",), v, "int", "level"):
            return None
        if not 1 <= v <= 20:
            self.d.err(("level",), f"level er {v}, men skal være mellem 1 og 20.")
            return None
        return v

    def classes(self, level):
        v = self.c.get("classes")
        out = []
        if v is None:
            return out
        if not self.need_type(("classes",), v, "list", "classes"):
            return out
        if not v:
            self.d.err(("classes",), "classes er tom; mindst én klasse er påkrævet.")
        total = 0
        names = []
        for i, k in enumerate(v):
            if not isinstance(k, dict):
                self.d.err(("classes", i), f"classes[{i}] skal være en mappe med name, source, level og subclass.")
                continue
            if not isinstance(k.get("name"), str) or not k.get("name"):
                self.d.err(("classes", i), f"classes[{i}] mangler 'name'.")
            if not k.get("source"):
                self.d.warn(("classes", i), f"classes[{i}] mangler 'source' (fx XPHB); så kan klassen ikke slås op.")
            lv = k.get("level")
            if not is_int(lv) or not 1 <= lv <= 20:
                self.d.err(("classes", i, "level") if "level" in k else ("classes", i), f"classes[{i}].level skal være et helt tal fra 1 til 20, men er {_describe(lv)}.")
                lv = 0
            total += lv
            if k.get("subclass") is not None and not isinstance(k["subclass"], str):
                self.d.err(("classes", i, "subclass"), f"classes[{i}].subclass skal være tekst eller null.")
            elif not k.get("subclass") and lv >= 3 and "subclass" in k:
                self.d.warn(("classes", i, "subclass"), f"{k.get('name')} niveau {lv} har ingen subclass; i 2024-reglerne vælges den på niveau 3.")
            elif "subclass" not in k and lv >= 3:
                self.d.warn(("classes", i), f"{k.get('name')} niveau {lv} har ingen 'subclass'-nøgle; i 2024-reglerne vælges den på niveau 3 (skriv subclass: null, hvis der ingen er).")
            if k.get("name") in names:
                self.d.warn(("classes", i), f"{k.get('name')} står to gange i classes; saml niveauerne i én post.")
            names.append(k.get("name"))
            out.append(k)
        if level is not None and v and total != level:
            parts = ", ".join(f"{k.get('name')} {k.get('level')}" for k in out)
            self.d.err(("level",), f"level er {level}, men niveauerne i classes giver {total} ({parts}). Level skal være summen.")
        return out

    def abilities(self):
        v = self.c.get("abilities")
        if v is None or not self.need_type(("abilities",), v, "map", "abilities"):
            return
        for k in v:
            if k not in ABILITIES:
                self.d.err(("abilities", k), f"Ukendt evne {k!r} i abilities.{_suggest(k, ABILITIES)} Kendte: {_quote(ABILITIES)} (store bogstaver).", key=True)
        for a in ABILITIES:
            if a not in v:
                if not any(isinstance(k, str) and k.upper() == a for k in v):   # en forkert skrevet nøgle er meldt ovenfor
                    self.d.err(("abilities",), f"abilities mangler {a}.")
            elif not is_int(v[a]):
                self.d.err(("abilities", a), f"abilities.{a} skal være et helt tal, men er {_describe(v[a])}.")
            elif not 1 <= v[a] <= 30:
                self.d.err(("abilities", a), f"abilities.{a} er {v[a]}, men en evnescore er mellem 1 og 30.")
            elif v[a] > 20:
                self.d.warn(("abilities", a), f"abilities.{a} er {v[a]}; over 20 kræver fx en Epic Boon eller et magisk item.")

    def proficiency_bonus(self, level):
        v = self.c.get("proficiency_bonus")
        if v is None:
            return
        if not self.need_type(("proficiency_bonus",), v, "int", "proficiency_bonus"):
            return
        if level is not None:
            want = character_yaml.PROFICIENCY_BONUS_BY_LEVEL[level]
            if v != want:
                self.d.err(("proficiency_bonus",), f"proficiency_bonus er {v}, men level {level} giver {want} (level 1-4: 2, 5-8: 3, 9-12: 4, 13-16: 5, 17-20: 6).")

    def hp_and_dice(self, level, classes):
        c, d = self.c, self.d
        hp = c.get("hp")
        if "hp" in c:
            if hp is None:
                d.warn(("hp",), "hp er null; arket viser '?' som Max HP.")
            elif not is_int(hp):
                d.err(("hp",), f"hp skal være et helt tal, men er {_describe(hp)}.")
            elif hp < 1:
                d.err(("hp",), f"hp er {hp}; en karakter har mindst 1 hit point.")
            else:
                dice = c.get("hit_dice")
                con = c.get("abilities", {}).get("CON") if isinstance(c.get("abilities"), dict) else None
                if level and isinstance(dice, list) and is_int(con):
                    try:
                        top = sum(x["die"] * x["count"] for x in dice) + level * ((con - 10) // 2) + 2 * level
                    except (KeyError, TypeError):
                        top = None
                    if hp < level:
                        d.warn(("hp",), f"hp er {hp}, mindre end level {level}; hver level giver mindst 1 hit point.")
                    elif top is not None and hp > top:
                        d.warn(("hp",), f"hp er {hp}, mere end der er plads til ved level {level} (højeste værdi på hver hit die + CON + Tough = {top}). Er hp regnet rigtigt?")
        dice = c.get("hit_dice")
        if dice is None:
            return
        if not self.need_type(("hit_dice",), dice, "list", "hit_dice"):
            return
        count = 0
        for i, x in enumerate(dice):
            if not isinstance(x, dict) or not is_int(x.get("die")) or not is_int(x.get("count")):
                d.err(("hit_dice", i), f"hit_dice[{i}] skal være {{die: 8, count: 3}} (terningens sider og antal).")
                continue
            if x["die"] not in HIT_DIE_FACES:
                d.err(("hit_dice", i, "die"), f"hit_dice[{i}].die er {x['die']}; en hit die er d6, d8, d10 eller d12.")
            if x["count"] < 1:
                d.err(("hit_dice", i, "count"), f"hit_dice[{i}].count er {x['count']}; skal være mindst 1.")
            count += x["count"]
        if level and dice and count != level:
            d.err(("hit_dice",), f"hit_dice giver {count} terninger, men level er {level}. Antal hit dice er lig level.")
        hd = c.get("hit_die")
        if hd is not None and hd not in HIT_DIE_FACES:
            d.err(("hit_die",), f"hit_die er {hd!r}; skal være 6, 8, 10 eller 12.")

    def speed(self):
        c, d = self.c, self.d
        sp = c.get("speed")
        if sp is not None and (not is_int(sp) or sp < 0):
            d.err(("speed",), f"speed skal være et helt tal i ft (fx 30), men er {_describe(sp)}.")
        speeds = c.get("speeds")
        if speeds is not None and self.need_type(("speeds",), speeds, "map", "speeds"):
            for k, val in speeds.items():
                if k not in SPEED_KINDS:
                    d.warn(("speeds", k), f"Ukendt bevægelsesart {k!r}.{_suggest(k, SPEED_KINDS)} Kendte: {_quote(SPEED_KINDS)}.", key=True)
                elif not is_int(val) or val < 0:
                    d.err(("speeds", k), f"speeds.{k} skal være et helt tal i ft, men er {_describe(val)}.")
            if is_int(sp) and is_int(speeds.get("walk")) and speeds["walk"] != sp:
                d.warn(("speeds", "walk"), f"speeds.walk er {speeds['walk']}, men speed er {sp}; arket viser speed.")

    def ac_and_formulas(self):
        c, d = self.c, self.d
        ac = c.get("ac")
        if ac is not None and not (is_int(ac) or isinstance(ac, str)):
            d.err(("ac",), f"ac skal være et tal eller en formel som '{{10+DEX}}', men er {_describe(ac)}.")
        elif is_int(ac) and not 1 <= ac <= 40:
            d.warn(("ac",), f"ac er {ac}, hvilket er usædvanligt.")
        elif isinstance(ac, str) and "{" not in ac and not ac.strip().isdigit():
            d.err(("ac",), f"ac {ac!r} er hverken et tal eller en formel med {{...}}.")
        ini = c.get("initiative")
        if ini is not None and not isinstance(ini, str):
            d.err(("initiative",), f"initiative skal være en formel som '{{+DEX}}' (i citationstegn), men er {_describe(ini)}.")
        note = c.get("ac_note")
        if note is not None and not isinstance(note, str):
            d.err(("ac_note",), "ac_note skal være tekst.")

    def saves(self, classes):
        v = self.c.get("saves")
        if v is None:
            return []
        if not self.need_type(("saves",), v, "list", "saves"):
            return []
        out = []
        for i, s in enumerate(v):
            if not isinstance(s, str) or s.upper() not in ABILITIES:
                self.d.err(("saves", i), f"Ukendt save {s!r}.{_suggest(s, ABILITIES) if isinstance(s, str) else ''} Kendte: {_quote(ABILITIES)}.")
            else:
                if s != s.upper():
                    self.d.warn(("saves", i), f"Skriv {s.upper()!r} med store bogstaver i saves.")
                if s.upper() in out:
                    self.d.warn(("saves", i), f"{s.upper()} står to gange i saves.")
                out.append(s.upper())
        if not v:
            self.d.warn(("saves",), "saves er tom; en klasse giver altid to saves.")
        return out

    def skills(self):
        v = self.c.get("skills")
        if v is None:
            return []
        if not self.need_type(("skills",), v, "list", "skills"):
            return []
        known = list(render.SKILL_ABILITY)
        out = []
        for i, s in enumerate(v):
            if not isinstance(s, str):
                self.d.err(("skills", i), f"skills[{i}] skal være tekst, men er {_describe(s)}.")
                continue
            norm = s.lower().replace("_", " ").replace("-", " ").strip()
            if norm not in known:
                self.d.err(("skills", i), f"Ukendt skill {s!r}.{_suggest(norm, known)} Kendte (små bogstaver): {_quote(known)}.")
                continue
            if s != norm:
                self.d.warn(("skills", i), f"Skriv skillen som {norm!r} (små bogstaver, mellemrum).")
            if norm in out:
                self.d.warn(("skills", i), f"{norm} står to gange i skills.")
            out.append(norm)
        return out

    def expertise(self, skills):
        v = self.c.get("expertise")
        if v is None:
            return
        if not self.need_type(("expertise",), v, "list", "expertise"):
            return
        tools = self.c.get("tools") if isinstance(self.c.get("tools"), list) else []
        tool_names = {t.lower() for t in tools if isinstance(t, str)}
        known = list(render.SKILL_ABILITY)
        for i, s in enumerate(v):
            if not isinstance(s, str):
                self.d.err(("expertise", i), f"expertise[{i}] skal være tekst, men er {_describe(s)}.")
                continue
            norm = s.lower().replace("_", " ").replace("-", " ").strip()
            if norm in known:
                if norm not in skills:
                    self.d.err(("expertise", i), f"{norm} står i expertise, men ikke i skills. Expertise kræver, at man er trænet i skillen.")
            elif s.lower() not in tool_names:
                near = _suggest(norm, known)
                if near:
                    self.d.err(("expertise", i), f"Ukendt skill {s!r} i expertise.{near}")
                else:
                    self.d.warn(("expertise", i), f"{s!r} i expertise er hverken en skill eller et værktøj i tools.")

    def simple_fields(self):
        c, d = self.c, self.d
        if c.get("languages") is not None and not isinstance(c["languages"], str):
            d.err(("languages",), f"languages skal være tekst (fx 'Common, Elvish'), men er {_describe(c['languages'])}.")
        tools = c.get("tools")
        if tools is not None:
            if isinstance(tools, dict):
                for k in tools:
                    if k not in ABILITIES:
                        d.warn(("tools", k), f"Ukendt evne {k!r} i tools.", key=True)
            elif isinstance(tools, list):
                for i, t in enumerate(tools):
                    if not isinstance(t, str):
                        d.err(("tools", i), f"tools[{i}] skal være tekst, men er {_describe(t)}.")
            else:
                d.err(("tools",), f"tools skal være en liste (eller evne: liste), men er {_describe(tools)}.")
        cu = c.get("can_use")
        if cu is not None and self.need_type(("can_use",), cu, "map", "can_use"):
            for k, val in cu.items():
                if k not in CAN_USE_KEYS:
                    d.warn(("can_use", k), f"Ukendt nøgle {k!r} i can_use.{_suggest(k, CAN_USE_KEYS)} Kendte: {_quote(CAN_USE_KEYS)}.", key=True)
                elif not isinstance(val, str):
                    d.err(("can_use", k), f"can_use.{k} skal være tekst, men er {_describe(val)}.")
        size = c.get("size")
        if size is not None and size not in SIZES:
            d.warn(("size",), f"size {size!r} er ikke en kendt størrelse.{_suggest(size, SIZES) if isinstance(size, str) else ''} Kendte: {_quote(SIZES)}.")
        senses = c.get("senses")
        if senses is not None and self.need_type(("senses",), senses, "map", "senses"):
            for k, val in senses.items():
                if not is_int(val) or val < 0:
                    d.err(("senses", k), f"senses.{k} skal være et helt tal i ft, men er {_describe(val)}.")
                elif k not in SENSES:
                    d.warn(("senses", k), f"Ukendt sans {k!r}.{_suggest(k, SENSES)} Kendte: {_quote(SENSES)}.", key=True)
        for key, options in (("resistances", DAMAGE_TYPES), ("immunities", DAMAGE_TYPES), ("vulnerabilities", DAMAGE_TYPES),
                             ("condition_immunities", CONDITION_NAMES)):
            for i, s in enumerate(self.str_list(key)):
                if s.lower() not in options:
                    d.warn((key, i), f"{s!r} i {key} er ikke en kendt {'tilstand' if key == 'condition_immunities' else 'skadetype'}.{_suggest(s, options)}")
        extra = c.get("extra_training")
        if extra is not None:
            self.str_list("extra_training")
        if "masteries" in c and c["masteries"] is not None:
            m = c["masteries"]
            if self.need_type(("masteries",), m, "list", "masteries"):
                for i, pair in enumerate(m):
                    if not (isinstance(pair, list) and len(pair) == 2 and all(isinstance(x, str) for x in pair)):
                        d.err(("masteries", i), f"masteries[{i}] skal være [egenskab, våben], fx [Vex, Shortsword].")
                    elif pair[0] not in render.MASTERY:
                        d.err(("masteries", i), f"Ukendt Weapon Mastery {pair[0]!r}.{_suggest(pair[0], render.MASTERY)} Kendte: {_quote(render.MASTERY)}.")
        summary = c.get("summary")
        if summary is not None and self.need_type(("summary",), summary, "list", "summary"):
            for i, pair in enumerate(summary):
                if not (isinstance(pair, list) and len(pair) == 2):
                    d.err(("summary", i), f"summary[{i}] skal være [etiket, værdi], fx [Klasse, Fighter 3].")

    def race_background(self):
        for key in ("race", "background"):
            v = self.c.get(key)
            if v is None:
                continue
            if not isinstance(v, dict):
                self.d.err((key,), f"{key} skal være {{name: ..., source: ...}}, men er {_describe(v)}.")
                continue
            if not isinstance(v.get("name"), str) or not v["name"].strip():
                self.d.err((key,), f"{key} mangler 'name'.")
            if not v.get("source"):
                self.d.warn((key,), f"{key} mangler 'source' (fx XPHB); så kan {key} ikke slås op i 5etools.")

    def feats_and_spells(self):
        self.feat_list("feats", ("name",))
        self.feat_list("spells_known", ("name",))
        self.feat_list("race_traits", ("name",))
        self.feat_list("optional_features", ("name",))
        self.named_list("class_features", ("name", "class"), {"level": "int"})
        self.named_list("granted_spells", ("name",))
        self.named_list("weapons", ("name",), {"quantity": "int"})
        self.named_list("inventory", ("name",), {"quantity": "int"})

    def feat_list(self, key, required):
        self.named_list(key, required)

    def spellcasting(self, classes):
        c, d = self.c, self.d
        sc = c.get("spellcasting")
        if sc is None:
            return
        if not self.need_type(("spellcasting",), sc, "list", "spellcasting"):
            return
        class_names = {k.get("name") for k in classes}
        for i, block in enumerate(sc):
            if not isinstance(block, dict):
                d.err(("spellcasting", i), f"spellcasting[{i}] skal være en mappe med class, ability, save_dc og attack.")
                continue
            if block.get("class") not in class_names:
                d.warn(("spellcasting", i), f"spellcasting[{i}].class {block.get('class')!r} står ikke i classes.{_suggest(block.get('class'), class_names) if block.get('class') else ''}")
            ab = block.get("ability")
            if ab is not None and ab not in ABILITIES:
                d.err(("spellcasting", i, "ability"), f"spellcasting[{i}].ability {ab!r} er ikke en evne.{_suggest(ab, ABILITIES)} Kendte: {_quote(ABILITIES)}.")
            for f in ("cantrips", "spellbook", "prepared", "extra"):
                v = block.get(f)
                if v is not None and not (isinstance(v, list) and all(isinstance(x, str) for x in v)):
                    d.err(("spellcasting", i, f), f"spellcasting[{i}].{f} skal være en liste af spell-navne.")
        slots = c.get("spell_slots")
        if slots is not None:
            if not (isinstance(slots, list) and all(is_int(x) and x >= 0 for x in slots)) or (isinstance(slots, list) and len(slots) > 9):
                d.err(("spell_slots",), "spell_slots skal være en liste af højst 9 hele tal (antal slots pr. spell-niveau), fx [4, 3, 2].")
            elif slots and not sc and not c.get("pact_slots"):
                d.warn(("spell_slots",), "spell_slots er udfyldt, men spellcasting er tom.")
        pact = c.get("pact_slots")
        if pact is not None and not (isinstance(pact, dict) and is_int(pact.get("slots")) and is_int(pact.get("level"))):
            d.err(("pact_slots",), "pact_slots skal være null eller {slots: 2, level: 1}.")

    def lists_used_by_render(self):
        """Felter, render.py slår nøgler op i; en manglende nøgle giver en fejl i boksen."""
        c = self.c
        for i, r in self.named_list("resources", ("name", "max"), {"max": "int"}):
            if r.get("recharge") is not None and r["recharge"] not in RECHARGES:
                self.d.warn(("resources", i, "recharge"), f"Ukendt recharge {r['recharge']!r}.{_suggest(r['recharge'], RECHARGES)} Kendte: {_quote(RECHARGES)}.")
            if is_int(r.get("max")) and r["max"] < 1:
                self.d.err(("resources", i, "max"), f"resources[{i}].max er {r['max']}; skal være mindst 1.")
        self.named_list("class_numbers", ("owner", "label", "value"))
        self.named_list("modifiers", ("from", "what", "value"))
        for i, a in self.named_list("activations", ("name", "types")):
            if not isinstance(a["types"], list):
                self.d.err(("activations", i, "types"), f"activations[{i}].types skal være en liste: bonus, reaction eller action.")

    def formulas_everywhere(self):
        """Tekst med {...} sendes gennem render.fmt(), som regner den ud. Kontrollér alle strenge."""
        def walk(value, path):
            if isinstance(value, str):
                self.formula_string(value, path)
            elif isinstance(value, dict):
                for k, v in value.items():
                    walk(v, path + (k,))
            elif isinstance(value, list):
                for i, v in enumerate(value):
                    walk(v, path + (i,))
        walk(self.c, ())

    def formula_string(self, text, path):
        for m in _FORMULA.finditer(text):
            expr = m.group(1)
            if expr.startswith("@"):
                continue                               # 5etools-markup, ikke en formel
            problem = formula_problem(expr)
            if problem is None:
                continue
            if _unsafe(expr) or (path and path[0] in FORMULA_FIELDS):
                self.d.err(path, f"{'.'.join(map(str, path))}: {problem}.")
            else:
                self.d.warn(path, f"{'.'.join(map(str, path))}: {problem}. Står den i et felt, arket skriver ud, giver den en fejl.")

    # --- 5etools
    def lookups(self, classes, saves):
        L, d = self.lookup, self.d
        for key, getter in (("race", L.race), ("background", L.background)):
            v = self.c.get(key)
            if not isinstance(v, dict) or not isinstance(v.get("name"), str):
                continue
            name, source = v["name"], v.get("source")
            if source and source not in L.sources:
                d.warn((key, "source"), f"Kilden {source!r} findes ikke i 5etools. Er {key} hjemmelavet, er det i orden.", )
            elif getter(name, source) is None:
                options = L.names(key, source)
                d.err((key, "name"), f"{key} {name!r} findes ikke i 5etools{f' under kilden {source}' if source else ''}.{_suggest(name, options)}")
        for i, k in enumerate(classes):
            name, source = k.get("name"), k.get("source")
            if not isinstance(name, str):
                continue
            if source and source not in L.sources:
                d.warn(("classes", i, "source"), f"Kilden {source!r} findes ikke i 5etools. Er klassen hjemmelavet, er det i orden.")
                continue
            obj = L.cls(name, source)
            if obj is None:
                d.err(("classes", i, "name"), f"Klassen {name!r} findes ikke i 5etools{f' under kilden {source}' if source else ''}.{_suggest(name, L.names('class', source))}")
                continue
            sub = k.get("subclass")
            if isinstance(sub, str) and sub:
                subs = L.e.subclasses(name, L.sources)
                wanted = sub.lower()
                if not any(wanted in (str(s.get("name", "")).lower(), str(s.get("shortName", "")).lower()) for s in subs):
                    options = sorted({n for s in subs for n in (s.get("name"), s.get("shortName")) if n})
                    d.warn(("classes", i, "subclass"), f"Subclassen {sub!r} findes ikke for {name} i 5etools.{_suggest(sub, options)} Er den hjemmelavet, er det i orden.")
            if i == 0:
                want = {s.upper() for s in obj.get("proficiency", [])}
                if want and saves and not want <= set(saves):
                    d.warn(("saves",), f"{name} (primærklassen) giver saves {', '.join(sorted(want))}, men saves er {', '.join(saves)}.")
        # Hit dice efter klassernes egne terninger
        dice = self.c.get("hit_dice")
        if isinstance(dice, list) and classes:
            expected: dict[int, int] = {}
            for k in classes:
                obj = L.cls(k.get("name"), k.get("source")) if isinstance(k.get("name"), str) else None
                if obj is None or not is_int(k.get("level")):
                    expected = {}
                    break
                faces = obj.get("hd", {}).get("faces")
                expected[faces] = expected.get(faces, 0) + k["level"]
            have = {x["die"]: x["count"] for x in dice if isinstance(x, dict) and is_int(x.get("die")) and is_int(x.get("count"))}
            if expected and have != expected:
                d.warn(("hit_dice",), "hit_dice passer ikke til klassernes terninger: forventet " + ", ".join(f"{n}d{f}" for f, n in sorted(expected.items(), reverse=True)) + ".")
        for key, lookup in (("feats", lambda n, s: L.e.get_feat(n, L._src(s))), ("spells_known", lambda n, s: L.e.get_spell(n, L._src(s)))):
            for i, x in enumerate(self.c.get(key) or []):
                if isinstance(x, dict) and isinstance(x.get("name"), str):
                    if x.get("source") and x["source"] not in L.sources:
                        continue
                    if lookup(x["name"], x.get("source")) is None:
                        where = f" under kilden {x['source']}" if x.get("source") else ""
                        d.warn((key, i, "name"), f"{x['name']!r} findes ikke i 5etools{where}. Tastefejl?")


_KIND_WORD = {"int": "et helt tal", "str": "tekst", "list": "en liste", "map": "en mappe"}


def _is_kind(v, kind):
    return {"int": is_int(v), "str": isinstance(v, str), "list": isinstance(v, list), "map": isinstance(v, dict)}[kind]


def _describe(v) -> str:
    if v is None:
        return "tom (null)"
    return {"str": f"tekst ({v!r})", "int": f"tallet {v}", "bool": f"{'ja' if v else 'nej'} (sandt/falsk)",
            "list": "en liste", "dict": "en mappe", "float": f"kommatallet {v}"}.get(type(v).__name__, type(v).__name__)


# ---------------------------------------------------------------- sheets.yaml
PAGE_KEYS = ["top", "layout", "footer", "margin", "box_type"]
TOP_KEYS = ["title", "subtitle", "summary", "extra_summary"]
COMMON_BOX_KEYS = ["type", "title", "subtitle", "box_type", "width"]
COLUMN_KEYS = ["width", "content", "merged"]
_LIST_BOXES = {"weapons", "gear", "special", "campaign", "places", "people", "traits", "personality", "family", "enemies",
               "goals", "secrets", "list", "text", "training"}
EXTRA_BOX_KEYS = {
    "stats": ["fields"], "passive": ["items"], "languages": ["text"], "magic": ["auto", "dc", "lists", "slots"],
    "cantrips": [], "spells": ["list", "split"],
    "attacks": ["attacks", "auto"], "rules": ["items"], "extra": ["items"], "turn": ["items"],
    "features": ["items", "auto", "exclude", "include"], "bonus_actions": ["items", "auto", "exclude"],
    "reactions": ["items", "auto", "exclude"], "action_features": ["items", "auto", "exclude"],
    "actions": ["bonus"], "skill_checks": ["tools"], "backstory": ["paragraphs", "blank_lines"],
    "facts": ["fields"], "appearance": ["fields"], "money": [],
    **{t: ["items", "blank_lines"] for t in _LIST_BOXES},
}
EXTRA_BOX_KEYS["weapons"] = ["items", "blank_lines", "auto"]
EXTRA_BOX_KEYS["gear"] = ["items", "blank_lines", "auto"]
MARGINS = ["small", "none"]


class SheetsCheck:
    def __init__(self, doc: Doc):
        self.d = doc
        self.leaves: list[tuple[tuple, dict]] = []

    def run(self):
        d, data = self.d, self.d.data
        for k in data:
            if k != "pages":
                d.warn((k,), f"Ukendt nøgle {k!r} i sheets.yaml; kun 'pages' bruges.{_suggest(k, ['pages'])}", key=True)
        pages = data.get("pages")
        if pages is None:
            d.err((), "sheets.yaml mangler 'pages' (listen af sider).")
            return
        if not isinstance(pages, list):
            d.err(("pages",), "pages skal være en liste med én post pr. side.")
            return
        if not pages:
            d.warn(("pages",), "pages er tom; arket får ingen sider.")
        for i, p in enumerate(pages):
            self.page(("pages", i), p, i)

    def page(self, path, p, i):
        d = self.d
        if not isinstance(p, dict):
            d.err(path, f"Side {i + 1} skal være en mappe med top, layout og footer.")
            return
        for k in p:
            if k not in PAGE_KEYS:
                d.warn(path + (k,), f"Ukendt nøgle {k!r} på side {i + 1}.{_suggest(k, PAGE_KEYS)} Kendte: {_quote(PAGE_KEYS)}.", key=True)
        if p.get("margin") is not None and p["margin"] not in MARGINS:
            d.err(path + ("margin",), f"margin {p['margin']!r} er ukendt.{_suggest(p['margin'], MARGINS)} Kendte: {_quote(MARGINS)}.")
        if p.get("box_type") not in (None, "none"):
            d.warn(path + ("box_type",), f"box_type {p['box_type']!r} bruges ikke; kun 'none' (ingen rammer) har en virkning.")
        if "top" in p:
            top = p["top"]
            if top is not None and not isinstance(top, dict):
                d.err(path + ("top",), "top skal være en mappe (eller {} for standardhovedet).")
            elif isinstance(top, dict):
                for k in top:
                    if k not in TOP_KEYS:
                        d.warn(path + ("top", k), f"Ukendt nøgle {k!r} i top.{_suggest(k, TOP_KEYS)} Kendte: {_quote(TOP_KEYS)}.", key=True)
        layout = p.get("layout", [])
        if not isinstance(layout, list):
            d.err(path + ("layout",), "layout skal være en liste af bokse, kolonner og rækker.")
            return
        self.stack(path + ("layout",), layout)

    def stack(self, path, nodes):
        for i, n in enumerate(nodes):
            self.node(path + (i,), n)

    def node(self, path, n):
        d = self.d
        if not isinstance(n, dict):
            d.err(path, "Hver post i layout skal være en mappe (type, columns eller rows).")
            return
        if "columns" in n:
            cols = n["columns"]
            if not isinstance(cols, list):
                d.err(path + ("columns",), "columns skal være en liste af kolonner.")
                return
            for j, col in enumerate(cols):
                cp = path + ("columns", j)
                if not isinstance(col, dict):
                    d.err(cp, "En kolonne skal være en mappe med width og content.")
                    continue
                for k in col:
                    if k not in COLUMN_KEYS:
                        d.warn(cp + (k,), f"Ukendt nøgle {k!r} i en kolonne.{_suggest(k, COLUMN_KEYS)} Kendte: {_quote(COLUMN_KEYS)}.", key=True)
                w = col.get("width", 1)
                if isinstance(w, bool) or not isinstance(w, (int, float)) or w <= 0:
                    d.err(cp + ("width",), f"width skal være et positivt tal, fx 1 eller 1.25, men er {_describe(w)}.")
                if col.get("merged") not in (None, False, True, "tight"):
                    d.err(cp + ("merged",), f"merged skal være ja/nej eller 'tight', men er {col['merged']!r}.")
                content = col.get("content", [])
                if not isinstance(content, list):
                    d.err(cp + ("content",), "content skal være en liste af bokse.")
                else:
                    self.stack(cp + ("content",), content)
            return
        if "rows" in n:
            rows = n["rows"]
            if not isinstance(rows, list):
                d.err(path + ("rows",), "rows skal være en liste af bokse.")
            else:
                self.stack(path + ("rows",), rows)
            return
        typ = n.get("type")
        if typ is None:
            d.err(path, "Boksen mangler 'type' (eller columns/rows).")
            return
        if typ not in render.REGISTRY:
            d.err(path + ("type",), f"Ukendt boks-type {typ!r}.{_suggest(typ, render.REGISTRY) if isinstance(typ, str) else ''} Kendte typer: {_quote(render.REGISTRY)}.")
            return
        allowed = COMMON_BOX_KEYS + EXTRA_BOX_KEYS.get(typ, [])
        for k in n:
            if k not in allowed:
                d.warn(path + (k,), f"Boksen '{typ}' bruger ikke nøglen {k!r}.{_suggest(k, allowed)} Kendte: {_quote(allowed)}.", key=True)
        self.leaves.append((path, n))
        self.formulas(path, n)

    def formulas(self, path, value):
        if isinstance(value, str):
            for m in _FORMULA.finditer(value):
                if m.group(1).startswith("@"):
                    continue
                problem = formula_problem(m.group(1))
                if problem:
                    self.d.err(path, f"{problem}.")
        elif isinstance(value, dict):
            for k, v in value.items():
                self.formulas(path + (k,), v)
        elif isinstance(value, list):
            for i, v in enumerate(value):
                self.formulas(path + (i,), v)

    def dry_render(self, character: dict):
        """Render hver boks for sig mod karakteren; fejlene peges på boksen. Samme kode som arket bruger."""
        try:
            env = render.make_env(character)
        except Exception:
            return
        for path, node in self.leaves:
            try:
                render.layout_node(node, character, env)
            except ValueError as exc:
                self.d.err(path, str(exc))
            except Exception as exc:
                self.d.err(path, f"Fejl i boksen {node.get('type')!r}: {type(exc).__name__}: {exc}")


# ---------------------------------------------------------------- offentlige funktioner
def check_character_text(text: str, lookup: Lookup | None = None) -> list[Issue]:
    doc = Doc(text)
    if doc.data is not None:
        CharacterCheck(doc, lookup if lookup is not None else Lookup()).run()
    return doc.sorted_issues()


def check_sheets_text(text: str, character: dict | None = None) -> list[Issue]:
    doc = Doc(text)
    if doc.data is not None:
        check = SheetsCheck(doc)
        check.run()
        if character is not None and not any(i.level == "fejl" for i in doc.issues):
            check.dry_render(character)
    return doc.sorted_issues()


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def check_dir(character_dir: Path, lookup: Lookup | None = None) -> list[tuple[str, Issue]]:
    """Kontrollér character.yaml og sheets.yaml (eller skabelonens sheets.yaml) for én karakter.
    Returnerer [(filnavn, fund)] sorteret med fejl først i hver fil."""
    from . import sheets as sheets_module
    out: list[tuple[str, Issue]] = []
    cpath = character_yaml.character_path(character_dir)
    if not cpath.is_file():
        return [("character.yaml", Issue("fejl", 1, 1, f"Mangler {cpath}. Se docs/character-yaml.md og docs/llm-karakter-prompt.md."))]
    ctext = _read(cpath)
    cissues = check_character_text(ctext, lookup)
    out += [("character.yaml", i) for i in cissues]
    character = None
    if not any(i.level == "fejl" for i in cissues):
        character = character_yaml.load(character_dir)
    spath = sheets_module.sheets_path(character_dir)
    if spath.is_file():
        out += [("sheets.yaml", i) for i in check_sheets_text(_read(spath), character)]
    elif character is not None:
        # Uden sheets.yaml bruges standardlayoutet, som default_layout laver ud fra character.yaml
        import yaml as _yaml
        text = _yaml.safe_dump(default_layout.build(character), allow_unicode=True, sort_keys=False)
        out += [("(standardlayout)", i) for i in check_sheets_text(text, character) if i.level == "fejl"]
    return out


def has_errors(found) -> bool:
    return any((f[1] if isinstance(f, tuple) else f).level == "fejl" for f in found)


def format_issue(filename: str, issue: Issue) -> str:
    return f"{'FEJL' if issue.level == 'fejl' else 'ADVARSEL':<8} {filename}:{issue.line}:{issue.col}  {issue.message}"
