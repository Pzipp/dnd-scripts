"""Strukturerede data fra 5etools' Foundry VTT-filer (foundry-feats.json, foundry-races.json,
foundry-optionalfeatures.json, class/foundry.json): tal og regler, der kan regnes ud uden at læse
regelteksten.

Hvad filerne har, og hvad der bruges:

* `effects` (kun `transfer: true`, ikke slået fra, ikke enchantment = permanente): `key`/`mode`/`value`.
  Oversat i `_map_changes()`: HP, initiativ, fart (alle bevægelsesarter), sanser, resistenser/immuniteter,
  AC-bonus samt fordele og bonusser på skills, saves, angreb og skade (disse sidste som oplysninger).
* `system["uses.max"]` / `uses.recovery` og `activities[].uses`: ressourcer med antal og genopladning
  (`resources()`): Rage, Second Wind, Channel Divinity, Lucky ...
* `class/foundry.json` -> `class`/`subclass` -> `advancement` (`ScaleValue`): klassens niveau-tabeller
  (Sneak Attack-terninger, Rage Damage, Martial Arts Die, Unarmored Movement ...) (`scale_values()`).
* `activities[].activation.type` (`action`, `bonus`, `reaction`) og skade-/helbredelsesformler
  (`activations()`): hvilke features der bruges som hvad.

Formler skrives i Foundrys sprog og regnes ud mod en `Context`: `@prof`, `@abilities.wis.mod`,
`@classes.sorcerer.levels`, `@details.level`, `@scale.<klasse|subklasse>.<id>[.number|.faces]` og
`max()`/`min()`. Kan noget ikke regnes ud, regnes hele værdien som ukendt og bruges ikke.

Betingelser (Fast Movement: "aren't wearing Heavy armor") står kun i featurens tekst. De genkendes med få
faste vendinger i `_condition()`; kendes vendingen ikke, regnes effekten som ubetinget.

Resultatet af effekterne har samme grundform som LLM-effekterne i effects.py. En entry, hvor Foundry-dataene
giver HP eller initiativ, sendes ikke til LLM'en, og dens LLM-effekter ignoreres (strukturerede data vinder).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache

from . import e5tools as e

_FILES = {
    "feat": [("foundry-feats.json", "feat")],
    "class_feature": [("class/foundry.json", "classFeature"), ("class/foundry.json", "subclassFeature")],
    "race_trait": [("foundry-races.json", "raceFeature")],
    "optional_feature": [("foundry-optionalfeatures.json", "optionalfeature")],
}
_SAFE_EXPR = re.compile(r"^[0-9+\-*/(), ]*$")
_REF = re.compile(r"@([a-z0-9_.\-]+)")

SKILL_ABBREVIATIONS = {
    "acr": "Acrobatics", "ani": "Animal Handling", "arc": "Arcana", "ath": "Athletics", "dec": "Deception",
    "his": "History", "ins": "Insight", "itm": "Intimidation", "inv": "Investigation", "med": "Medicine",
    "nat": "Nature", "prc": "Perception", "prf": "Performance", "per": "Persuasion", "rel": "Religion",
    "slt": "Sleight of Hand", "ste": "Stealth", "sur": "Survival",
}
_MOVEMENT_MODES = ("walk", "fly", "swim", "climb", "burrow", "hover")
_ROLL_ATTACK_KEYS = {"mwak": "melee weapon", "rwak": "ranged weapon", "msak": "melee spell", "rsak": "ranged spell"}


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")


@dataclass
class Context:
    """Det formlerne regnes ud mod."""
    total_level: int = 1
    class_levels: dict[str, int] = field(default_factory=dict)  # {'Sorcerer': 5}
    abilities: dict[str, int] = field(default_factory=dict)  # slutscores {'STR': 10, ...}
    pb: int = 2
    scales: dict[str, dict] = field(default_factory=dict)  # se scale_values()
    armor_type: str | None = None  # 'LA' / 'MA' / 'HA' (items-base) eller None uden rustning
    shield: bool = False

    def mod(self, ability: str) -> int:
        return (self.abilities.get(ability.upper(), 10) - 10) // 2


# ---------------------------------------------------------------- opslag

@lru_cache(maxsize=None)
def _index() -> dict[tuple[str, str], list[dict]]:
    """{(kind, navn): [poster]}. Manglende filer giver et tomt opslag (så falder alt tilbage til LLM-effekterne)."""
    out: dict[tuple[str, str], list[dict]] = {}
    for kind, files in _FILES.items():
        for path, key in files:
            try:
                records = e._load(path).get(key, [])
            except e.E5ToolsUnavailable:
                continue
            for record in records:
                out.setdefault((kind, record["name"]), []).append(record)
    return out


def _record(entry: dict, any_lineage: bool = False) -> dict | None:
    candidates = _index().get((entry.get("kind"), entry.get("name")), [])
    if entry.get("source"):
        same_source = [r for r in candidates if r.get("source") == entry["source"]]
        candidates = same_source or candidates
    if entry["kind"] == "class_feature":
        candidates = [r for r in candidates if r.get("className") == entry.get("class")]
        exact = [r for r in candidates if r.get("level") == entry.get("level")]
        candidates = exact or candidates
    elif entry["kind"] == "race_trait":
        race, lineage = entry.get("race"), entry.get("lineage")
        wanted = {str(race).lower()} | ({f"{race} ({lineage})".lower()} if lineage else set())
        candidates = [r for r in candidates if str(r.get("raceName", "")).lower() in wanted
                      or (any_lineage and str(r.get("raceName", "")).lower().startswith(f"{str(race).lower()} ("))]
    elif entry["kind"] == "optional_feature":
        pass
    return candidates[0] if candidates else None


def _changes(record: dict):
    for effect in record.get("effects") or []:
        if effect.get("transfer") and not effect.get("disabled") and effect.get("type") != "enchantment":
            yield from effect.get("changes") or []


# ---------------------------------------------------------------- niveau-tabeller (ScaleValue)

@lru_cache(maxsize=None)
def _class_records() -> tuple[list[dict], list[dict]]:
    try:
        data = e._load("class/foundry.json")
    except e.E5ToolsUnavailable:
        return [], []
    return data.get("class", []), data.get("subclass", [])


def _scale_at(advancement: dict, level: int) -> dict | None:
    scale = (advancement.get("configuration") or {}).get("scale") or {}
    reached = [int(k) for k in scale if k.isdigit() and int(k) <= level]
    return scale[str(max(reached))] if reached else None


def scale_values(classes: list[dict]) -> dict[str, dict]:
    """Klassernes og subklassernes niveau-tabeller på karakterens niveauer:
    {'rogue.sneak-attack': {title, owner, type, number, faces, value, units}}.
    `classes`: [{name, source, level, subclass}]. Nøglen er '<klasse|subklasse>.<identifier>', som i
    Foundry-formlernes `@scale.<klasse>.<identifier>`."""
    class_recs, subclass_recs = _class_records()
    out: dict[str, dict] = {}

    def take(owner_slug: str, owner_name: str, record: dict, level: int):
        for adv in record.get("advancement") or []:
            if adv.get("type") != "ScaleValue":
                continue
            entry = _scale_at(adv, level)
            if entry is None:
                continue
            cfg = adv.get("configuration") or {}
            ident = cfg.get("identifier") or _slug(adv.get("title", ""))
            out[f"{owner_slug}.{ident}"] = {
                "title": adv.get("title", ident), "owner": owner_name, "type": cfg.get("type"),
                "units": (cfg.get("distance") or {}).get("units"), **entry,
            }

    for c in classes:
        if not c.get("name"):
            continue
        level = c.get("level") or 1
        recs = [r for r in class_recs if r.get("name") == c["name"]]
        rec = next((r for r in recs if r.get("source") == c.get("source")), recs[0] if recs else None)
        if rec:
            take(_slug(c["name"]), c["name"], rec, level)
        if c.get("subclass"):
            sub = next((r for r in subclass_recs if r.get("className") == c["name"]
                        and c["subclass"] in (r.get("name"), r.get("shortName"))), None)
            if sub:
                take(_slug(sub.get("shortName") or sub["name"]), c["subclass"], sub, level)
    return out


def scale_text(scale: dict) -> str:
    """'3d6', '+15 ft', '2' ..."""
    if scale.get("type") == "dice" or "faces" in scale:
        return f"{scale.get('number') or 1}d{scale['faces']}"
    if scale.get("type") == "distance":
        return f"{scale.get('value')} {scale.get('units') or 'ft'}"
    return str(scale.get("value", ""))


# ---------------------------------------------------------------- formler

def _substitute(ref: str, ctx: Context, allow_dice: bool) -> str | None:
    if ref in ("prof", "attributes.prof"):
        return str(ctx.pb)
    if ref == "details.level":
        return str(ctx.total_level)
    m = re.fullmatch(r"classes\.([a-z0-9\-]+)\.levels", ref)
    if m:
        levels = {_slug(name): lvl for name, lvl in ctx.class_levels.items()}
        return str(levels.get(m.group(1), 0))
    m = re.fullmatch(r"abilities\.(str|dex|con|int|wis|cha)\.mod", ref)
    if m:
        return str(ctx.mod(m.group(1)))
    m = re.fullmatch(r"scale\.([a-z0-9\-]+)\.([a-z0-9\-]+?)(?:\.(number|faces|value))?", ref)
    if m:
        scale = ctx.scales.get(f"{m.group(1)}.{m.group(2)}")
        if not scale:
            return None
        part = m.group(3)
        if part == "number":
            return str(scale.get("number") or 1)
        if part == "faces":
            return str(scale["faces"]) if "faces" in scale else None
        if part in (None, "value"):
            if "faces" in scale:
                return scale_text(scale) if allow_dice and part is None else None
            return str(scale["value"]) if "value" in scale else None
    return None


def _evaluate(value, ctx: Context) -> int | None:
    """Tal eller formel -> heltal; None hvis noget ikke kan regnes ud."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).lower()
    for ref in set(_REF.findall(text)):
        sub = _substitute(ref, ctx, allow_dice=False)
        if sub is None:
            return None
        text = text.replace(f"@{ref}", sub)
    text = text.strip().lstrip("+").strip()
    if not text or not _SAFE_EXPR.match(re.sub(r"\b(max|min)\b", "", text)):
        return None
    try:
        return int(eval(text, {"__builtins__": {}}, {"max": max, "min": min}))  # noqa: S307 - kun cifre, + - * / ( ) , max og min er lukket ind
    except (SyntaxError, ZeroDivisionError, TypeError):
        return None


def roll_text(formula, ctx: Context) -> str | None:
    """Terningformel til visning ('1d10+5', '3d6'), hvis alle referencer kan slås op; ellers None."""
    text = str(formula).lower()
    text = re.sub(r"\[[a-z ,]*\]", "", text)  # skadetype-mærker: '1d8[radiant]'
    for ref in set(_REF.findall(text)):
        sub = _substitute(ref, ctx, allow_dice=True)
        if sub is None:
            return None
        text = text.replace(f"@{ref}", sub)
    text = text.replace(" ", "")
    return text.lstrip("+") if re.fullmatch(r"[0-9d+\-*/()]+", text) else None


# ---------------------------------------------------------------- betingelser (kun i featurens tekst)

_COND_NOT_HEAVY = re.compile(r"(?:aren't|are not|isn't) wearing heavy armor", re.I)
_COND_UNARMORED = re.compile(r"(?:aren't|are not) wearing armor", re.I)
_COND_ARMORED = re.compile(r"(?:while|when) you(?:'re| are) wearing (?:light, medium, or heavy )?armor", re.I)


def _condition(text: str | None) -> str | None:
    if not text:
        return None
    if _COND_NOT_HEAVY.search(text):
        return "not_heavy"
    if _COND_UNARMORED.search(text):
        return "unarmored"
    if _COND_ARMORED.search(text):
        return "armored"
    return None


_CONDITION_LABELS = {"not_heavy": "kun uden Heavy armor", "unarmored": "kun uden rustning", "armored": "kun med rustning"}


def _condition_met(condition: str | None, ctx: Context) -> bool:
    if condition == "not_heavy":
        return ctx.armor_type != "HA"
    if condition == "unarmored":
        return ctx.armor_type is None and not ctx.shield
    if condition == "armored":
        return ctx.armor_type is not None
    return True


# ---------------------------------------------------------------- effekter

def _signed(n: int) -> str:
    return f"{n:+d}"


def _map_changes(record: dict, entry: dict, ctx: Context, text: str | None) -> list[dict]:
    cond = _condition(text)
    out: list[dict] = []
    for change in _changes(record):
        key, mode, value = change.get("key", ""), change.get("mode"), change.get("value")
        add = mode == "ADD"
        if key == "system.attributes.hp.bonuses.level" and add:
            amount = _evaluate(value, ctx)
            if amount is not None:
                out.append({"target": "hp_flat", "value": str(amount * ctx.total_level), "type": "add", "duration": "permanent"})
        elif key == "system.attributes.hp.bonuses.overall" and add:
            amount = _evaluate(value, ctx)
            if amount is not None:
                out.append({"target": "hp_flat", "value": str(amount), "type": "add", "duration": "permanent"})
        elif key == "system.attributes.init.bonus" and add:
            term = _initiative_term(value)
            if term:
                out.append({"target": "initiative", "value": term, "type": "add", "duration": "permanent"})
        elif key == "flags.dnd5e.initiativeAlert" and value is True:
            out.append({"target": "initiative", "value": "PB" if entry.get("source") == "XPHB" else "5", "type": "add", "duration": "permanent"})
        elif (m := re.fullmatch(r"system\.attributes\.movement\.(\w+)", key)) and m.group(1) in _MOVEMENT_MODES and add:
            amount = _evaluate(value, ctx)
            if amount:
                out.append({"target": "speed", "mode": m.group(1), "value": amount, "condition": cond, "active": _condition_met(cond, ctx)})
        elif (m := re.fullmatch(r"system\.attributes\.senses\.(\w+)", key)) and mode in ("ADD", "UPGRADE", "OVERRIDE"):
            amount = _evaluate(value, ctx)
            if amount:
                out.append({"target": "sense", "sense": m.group(1), "value": amount, "mode": mode})
        elif (m := re.fullmatch(r"system\.traits\.(dr|di|dv|ci)\.value", key)) and add and isinstance(value, str):
            kind = {"dr": "resist", "di": "immune", "dv": "vulnerable", "ci": "condition_immune"}[m.group(1)]
            out.append({"target": kind, "value": value})
        elif key == "system.attributes.ac.bonus" and add:
            amount = _evaluate(value, ctx)
            if amount:
                out.append({"target": "ac_bonus", "value": amount, "condition": cond, "active": _condition_met(cond, ctx)})
        else:
            info = _modifier(key, mode, value, ctx)
            if info:
                out.append({"target": "modifier", **info})
    return out


def _modifier(key: str, mode, value, ctx: Context) -> dict | None:
    """Fordele og bonusser (vises som oplysninger, regnes ikke ind i arkets tal)."""
    adv = {1: "fordel", -1: "ulempe"}.get(value if isinstance(value, int) and not isinstance(value, bool) else None)
    if mode == "ADD" and (m := re.fullmatch(r"system\.skills\.(\w+)\.roll\.mode", key)) and adv:
        return {"what": f"{SKILL_ABBREVIATIONS.get(m.group(1), m.group(1))}-checks", "value": adv}
    if mode == "ADD" and (m := re.fullmatch(r"system\.abilities\.(\w+)\.(save|check)\.roll\.mode", key)) and adv:
        return {"what": f"{m.group(1).upper()} {'saves' if m.group(2) == 'save' else 'checks'}", "value": adv}
    if mode == "ADD" and (m := re.fullmatch(r"system\.attributes\.(concentration|death|init)\.roll\.mode", key)) and adv:
        return {"what": {"concentration": "Concentration-saves", "death": "Death saves", "init": "Initiative"}[m.group(1)], "value": adv}
    if mode == "ADD" and (m := re.fullmatch(r"system\.skills\.(\w+)\.bonuses\.check", key)):
        amount = _evaluate(value, ctx)
        return {"what": f"{SKILL_ABBREVIATIONS.get(m.group(1), m.group(1))}-checks", "value": _signed(amount)} if amount is not None else None
    if mode == "ADD" and (m := re.fullmatch(r"system\.abilities\.(\w+)\.bonuses\.(save|check)", key)):
        amount = _evaluate(value, ctx)
        return {"what": f"{m.group(1).upper()} {'saves' if m.group(2) == 'save' else 'checks'}", "value": _signed(amount)} if amount is not None else None
    if mode == "ADD" and key == "system.bonuses.abilities.save":
        amount = _evaluate(value, ctx)
        return {"what": "alle saves", "value": _signed(amount)} if amount is not None else None
    if mode == "ADD" and (m := re.fullmatch(r"system\.bonuses\.(mwak|rwak|msak|rsak)\.(attack|damage)", key)):
        amount = _evaluate(value, ctx)
        shown = _signed(amount) if amount is not None else roll_text(value, ctx)
        if shown:
            return {"what": f"{'angreb' if m.group(2) == 'attack' else 'skade'} ({_ROLL_ATTACK_KEYS[m.group(1)]})", "value": shown if shown[0] in "+-" else f"+{shown}"}
    if mode == "ADD" and (m := re.fullmatch(r"system\.traits\.dm\.amount\.(\w+)", key)):
        amount = _evaluate(value, ctx)
        if amount:
            return {"what": f"skade fra {m.group(1)}", "value": _signed(amount)}
    return None


def _initiative_term(value) -> str | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(int(value))
    text = str(value).strip().lstrip("+").strip()
    ability = re.fullmatch(r"@abilities\.(str|dex|con|int|wis|cha)\.mod", text)
    if ability:
        return f"ability:{ability.group(1).upper()}"
    if text in ("@prof", "@attributes.prof"):
        return "PB"
    return None


def resolve(entry: dict, ctx: Context, any_lineage: bool = False) -> list[dict] | None:
    """Permanente effekter for entry'en fra Foundry-dataene, eller None hvis dataene ikke giver nogen.
    `entry`: {name, source, kind, class?, level?, race?, lineage?, text?} (`text`: featurens tekst, til betingelser)."""
    record = _record(entry, any_lineage) if entry.get("kind") in _FILES else None
    if not record:
        return None
    return _map_changes(record, entry, ctx, entry.get("text")) or None


def covers(entry: dict) -> bool:
    """Giver Foundry-dataene HP eller initiativ for entry'en (så LLM-udtræk er overflødigt)?"""
    mapped = resolve(entry, Context(), any_lineage=True) or []
    return any(m["target"] in ("hp_flat", "initiative") for m in mapped)


def collect(entries: list[dict], ctx: Context) -> list[tuple[dict, dict]]:
    """Alle Foundry-effekter for entries som (entry, effekt)-par."""
    out = []
    for entry in entries:
        out += [(entry, eff) for eff in resolve(entry, ctx) or []]
    return out


# ---------------------------------------------------------------- ressourcer

_PERIODS_LONG = {"lr", "day", "dawn", "dusk"}
_PER_TURN = {"turn", "round", "initiative", "turnStart", "turnEnd"}


def _uses(record: dict) -> tuple[object, list[dict]]:
    """(max, recovery) fra featurens system-felt, ellers fra den første aktivitet med brug."""
    system = record.get("system") or {}
    if system.get("uses.max") not in (None, ""):
        return system["uses.max"], system.get("uses.recovery") or []
    for activity in record.get("activities") or []:
        uses = activity.get("uses") or {}
        if uses.get("max") in (None, ""):
            continue
        recovery = uses.get("recovery") or []
        if recovery and all(r.get("period") in _PER_TURN for r in recovery):
            continue  # fornyes hver tur (Sneak Attack): ikke en ressource at krydse af
        return uses["max"], recovery
    return None, []


def _pool_name(feature_name: str, maximum, ctx: Context) -> str:
    """Navnet på ressourcen: featurens eget, men er antallet bare en niveau-tabel med et andet navn
    (Step of the Wind bruger tabellen 'Focus Points'), så er det tabellens navn."""
    m = re.fullmatch(r"@scale\.([a-z0-9\-]+\.[a-z0-9\-]+)", str(maximum).strip().lower())
    title = (ctx.scales.get(m.group(1)) or {}).get("title") if m else None
    return title if title and not title.lower().startswith(feature_name.lower()) else feature_name


def _recharge_from_text(text: str | None) -> dict:
    """Genopladning, når Foundry-dataene ikke har den (SRD-features): stedet i featurens tekst, der siger
    hvornår brugene kommer tilbage. 'Short or Long Rest' (i begge rækkefølger) = begge hviler; ellers Long Rest (evt. med 1 tilbage
    ved Short Rest); ellers kun Short Rest. Ingen genkendt vending giver ukendt (None)."""
    if not text:
        return {}
    if re.search(r"Short or Long Rest|Short Rest or Long Rest|Long or Short Rest|Long Rest or Short Rest", text):
        return {"recharge": "short_rest"}
    if re.search(r"Long Rest", text):
        out = {"recharge": "long_rest"}
        if re.search(r"regain one expended use when you finish a Short Rest", text):
            out["short_rest_regain"] = 1
        return out
    if re.search(r"Short Rest", text):
        return {"recharge": "short_rest"}
    return {}


def resources(entries: list[dict], ctx: Context) -> list[dict]:
    """Features med et begrænset antal brug: [{name, max, recharge, short_rest_regain?, from}].
    recharge: 'long_rest' / 'short_rest' / None (ukendt i dataene)."""
    out, seen = [], set()
    for entry in entries:
        record = _record(entry) if entry.get("kind") in _FILES else None
        if not record or entry["name"] in seen:
            continue
        maximum, recovery = _uses(record)
        count = _evaluate(maximum, ctx) if maximum not in (None, "") else None
        if not count or count <= 0:
            continue
        periods = {r.get("period") for r in recovery}
        item = {"name": _pool_name(entry["name"], maximum, ctx), "max": count, "recharge": None,
                "from": entry.get("class") or entry.get("race") or entry["kind"]}
        if periods & _PERIODS_LONG:
            item["recharge"] = "long_rest"
            for r in recovery:
                if r.get("period") == "sr" and r.get("type") == "formula":
                    regain = _evaluate(r.get("formula"), ctx)
                    if regain:
                        item["short_rest_regain"] = regain
        elif "sr" in periods:
            item["recharge"] = "short_rest"
        else:
            item.update(_recharge_from_text(entry.get("text")))
        seen.add(entry["name"])
        out.append(item)
    return out


# ---------------------------------------------------------------- aktivering og formler

def _activity_roll(activity: dict, ctx: Context) -> str | None:
    healing = activity.get("healing")
    if healing and healing.get("denomination"):
        base = f"{healing.get('number') or 1}d{healing['denomination']}"
        bonus = healing.get("bonus")
        if bonus:
            amount = _evaluate(bonus, ctx)
            if amount is None:
                return None
            base += f"+{amount}" if amount >= 0 else str(amount)
        return base
    for part in (activity.get("damage") or {}).get("parts") or []:
        custom = part.get("custom") or {}
        if custom.get("enabled") and custom.get("formula"):
            return roll_text(custom["formula"], ctx)
        if part.get("denomination"):
            base = f"{part.get('number') or 1}d{part['denomination']}"
            if part.get("bonus"):
                amount = _evaluate(part["bonus"], ctx)
                if amount is None:
                    return None
                base += f"+{amount}" if amount >= 0 else str(amount)
            return base
    formula = (activity.get("roll") or {}).get("formula")
    return roll_text(formula, ctx) if formula else None


def activation(entry: dict, ctx: Context) -> dict | None:
    """{types: ['bonus', ...], roll: '1d10+5'|None} for en feature Foundry kender; None hvis ukendt.
    types er tom, hvis featuren hverken er en Action, Bonus Action eller Reaction (passiv, special)."""
    record = _record(entry) if entry.get("kind") in _FILES else None
    if not record:
        return None
    types, roll = [], None
    for act in record.get("activities") or []:
        kind = (act.get("activation") or {}).get("type")
        if kind in ("action", "bonus", "reaction") and kind not in types:
            types.append(kind)
        roll = roll or _activity_roll(act, ctx)
    return {"types": types, "roll": roll}
