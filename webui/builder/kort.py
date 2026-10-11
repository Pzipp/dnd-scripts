"""Kortbygger: spil-kort (pokerstørrelse, se docs/kort-yaml.md) ud fra 5etools-data.

Samme kortformat og samme generator som det gamle system (scripts/kort/spellkort.py),
men kortene udledes af 5etools i stedet for at være skrevet i hånden.

Opslagskæde for ét kort (entry = {name, source, kind}):
  1. Et håndkureret kort i bibliotek/*.yaml med samme navn (bruges uændret).
  2. Et kort bygget af 5etools-data: de MASKINLÆSBARE felter (grad, skole, tid, afstand,
     varighed, komponenter, koncentration, ritual, angreb/redningskast, skade, skala)
     udledes direkte af spellens strukturerede felter. Teksten er dansk, hvis den findes
     (descriptions.lookup / bibliotek/_cards.yaml), ellers den engelske regeltekst fra 5etools.

Valget af kort gemmes i karakterens kort.yaml (samme fil og format som det gamle system:
`titel`, `kort`, `egne`), så `python3 dnd.py kort <navn>` virker på byggerens karakterer.
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

import yaml

from . import cards as cards_module
from . import descriptions
from . import e5tools as e

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "scripts" / "kort"))
import faelles  # noqa: E402
import spellkort  # noqa: E402

DECK_FILE = "kort.yaml"

SCHOOLS = {
    "A": ("Abjuration", "Beskyttelse"), "C": ("Conjuration", "Tilkaldelse"),
    "D": ("Divination", "Spådom"), "E": ("Enchantment", "Fortryllelse"),
    "V": ("Evocation", "Fremkaldelse"), "I": ("Illusion", "Illusion"),
    "N": ("Necromancy", "Nekromanti"), "T": ("Transmutation", "Forvandling"),
}
UNITS_DA = {"minute": "minut", "hour": "time", "day": "dag", "round": "runde"}
UNITS_DA_PL = {"minute": "minutter", "hour": "timer", "day": "dage", "round": "runder"}
STATS = {"strength": "Strength", "dexterity": "Dexterity", "constitution": "Constitution",
         "intelligence": "Intelligence", "wisdom": "Wisdom", "charisma": "Charisma"}
SOURCE_NAMES = {"XPHB": "PHB 2024", "XDMG": "DMG 2024", "XMM": "MM 2025", "PHB": "PHB 2014", "TCE": "Tasha's", "XGE": "Xanathar's"}

MAX_BACK_CHARS = 900  # bagsiden klipper tekst ved kanten; længere tekst forkortes eksplicit
MAX_EFFECT_CHARS = 210       # forside uden terningboks
MAX_EFFECT_DICE_CHARS = 115  # forside med terningboks/skala: pladsen er mindre

_TAG = re.compile(r"\{@(\w+)([^}]*)\}")


def slug(name: str, source: str | None) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{base}-{(source or '').lower()}" if source else base


def _sources(entry: dict) -> set[str]:
    return {entry["source"]} if entry.get("source") else {"XPHB"}


def _plain(text: str) -> str:
    """5etools-markup væk, HTML-sikker (kortformatet tillader <b>/<i>)."""
    return html.escape(e.clean_text(text), quote=False)


def _truncate(text: str, limit: int) -> tuple[str, bool]:
    if len(text) <= limit:
        return text, False
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    cut = cut[:end + 1] if end > limit * 0.5 else cut.rsplit(" ", 1)[0] + "…"
    return cut, True


def _html(text: str) -> str:
    """Escape + **fed** (fra e5tools.render_text) som <b>."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(text, quote=False))


def _paragraphs(entries) -> list[str]:
    """Entries-træ som afsnit (strenge); lister bliver til ét afsnit pr. punkt."""
    return [line.strip() for line in e.render_text(entries).split("\n") if line.strip()]


# ── Spells ─────────────────────────────────────────────────────────────────
def _time(spell: dict) -> str:
    t = (spell.get("time") or [{}])[0]
    unit, num = t.get("unit", "action"), t.get("number", 1)
    if unit in ("action", "bonus", "reaction"):
        base = {"action": "Action", "bonus": "Bonus Action", "reaction": "Reaction"}[unit]
        return base if num == 1 else f"{num} {base}s"
    return f"{num} {UNITS_DA.get(unit, unit) if num == 1 else UNITS_DA_PL.get(unit, unit)}"


def _range(spell: dict) -> str:
    r = spell.get("range") or {}
    kind, dist = r.get("type"), r.get("distance") or {}
    if kind == "point":
        t = dist.get("type")
        if t == "feet":
            return f"{dist['amount']} ft"
        if t == "miles":
            return f"{dist['amount']} mil"
        return {"touch": "Berøring", "self": "Dig selv", "sight": "Syn", "unlimited": "Ubegrænset"}.get(t, str(t))
    if kind in ("cone", "line", "cube", "sphere", "hemisphere", "radius", "cylinder"):
        shape = {"cone": "kegle", "line": "linje", "cube": "terning", "sphere": "kugle", "hemisphere": "halvkugle",
                 "radius": "radius", "cylinder": "cylinder"}[kind]
        return f"Dig selv ({dist.get('amount', '?')} ft {shape})"
    return "Dig selv"


def _duration(spell: dict) -> tuple[str, bool]:
    d = (spell.get("duration") or [{}])[0]
    conc = bool(d.get("concentration"))
    kind = d.get("type")
    if kind == "instant":
        return "Øjeblikkelig", False
    if kind == "permanent":
        return "Indtil den ophæves", False
    if kind == "special":
        return "Se teksten", False
    dur = d.get("duration") or {}
    amount, unit = dur.get("amount", 1), dur.get("type", "minute")
    word = UNITS_DA.get(unit, unit) if amount == 1 else UNITS_DA_PL.get(unit, unit)
    text = f"{amount} {word}"
    if d.get("duration", {}).get("upTo") or conc:
        text = ("Koncentration, op til " if conc else "Op til ") + text
    return text, conc


def _components(spell: dict) -> tuple[str, str | None]:
    c = spell.get("components") or {}
    parts = [k.upper() for k in ("v", "s") if c.get(k)]
    material = c.get("m")
    if material:
        parts.append("M")
    text = material.get("text") if isinstance(material, dict) else material
    return ", ".join(parts) or "–", text


def _dice_rows(spell: dict) -> list[list[str]]:
    raw = e.raw_text(spell.get("entries", []))
    rows = []
    attack = spell.get("spellAttack")
    if attack:
        rows.append(["Angreb", "d20 + spellangreb", "nærkamp" if attack == ["M"] else "afstand"])
    saves = spell.get("savingThrow")
    if saves:
        stat = STATS.get(saves[0], saves[0].title())
        rows.append(["Save", stat, "mod spell save DC"])
    dmg = re.search(r"\{@damage ([^}|]+)", raw)
    if dmg:
        types = ", ".join(t.title() for t in spell.get("damageInflict", [])) or "skade"
        rows.append(["Skade", dmg.group(1).strip(), types])
    else:
        heal = re.search(r"\{@dice ([^}|]+)\}[^.]*?(?:Hit Points|HP)", raw)
        if heal and "regain" in raw:
            rows.append(["Helbred", heal.group(1).strip(), "Hit Points"])
    return rows[:3]


def _scale(spell: dict) -> tuple[list[list[str]], str] | None:
    sld = spell.get("scalingLevelDice")
    if isinstance(sld, list):
        sld = sld[0] if sld else None
    if sld and sld.get("scaling"):
        rows = [[f"Level {lvl}" if i == 0 else str(lvl), val] for i, (lvl, val) in enumerate(sld["scaling"].items())]
        return rows, f"{sld.get('label', 'Skade').capitalize()} efter level"
    raw = e.raw_text(spell.get("entriesHigherLevel", []))
    m = re.search(r"\{@scale(?:damage|dice) ([^|}]+)\|(\d+)-(\d+)\|([^}|]+)", raw)
    if not m:
        return None
    base, low, high, inc = m.group(1).strip(), int(m.group(2)), int(m.group(3)), m.group(4).strip()
    bm, im = re.fullmatch(r"(\d+)d(\d+)", base), re.fullmatch(r"(\d+)d(\d+)", inc)
    if not (bm and im and bm.group(2) == im.group(2)):
        return None  # blandede terninger: ingen sikker udregning, ingen skala
    rows = []
    for lvl in range(low, min(high, low + 6) + 1):  # højst 7 kolonner, ellers bliver tabellen for bred til kortet
        n = int(bm.group(1)) + (lvl - low) * int(im.group(1))
        rows.append([f"Slot {lvl}" if lvl == low else str(lvl), f"{n}d{bm.group(2)}"])
    return rows, "Skade efter spell slot-level"


def _ref(entry: dict, obj: dict | None) -> str:
    src = SOURCE_NAMES.get(entry.get("source") or "", entry.get("source") or "")
    page = (obj or {}).get("page")
    return f"{src} s. {page}" if src and page else src


def _text_sections(obj: dict, key: str = "entries") -> list[dict]:
    """Bagsidens sektioner af en entries-liste: 'Sådan virker det' + evt. afsnit der har eget navn."""
    plain = [p for p in _paragraphs(obj.get(key, []))]
    text = "\n".join(plain)
    clipped, was_cut = _truncate(text, MAX_BACK_CHARS)
    parts = [p for p in clipped.split("\n") if p]
    if was_cut:
        parts.append("<i>(Forkortet. Se hele teksten i bogen.)</i>")
    return [{"titel": "Sådan virker det", "tekst": "<br>".join(p if p.startswith("<i>") else _html(p) for p in parts)}]


def spell_card(entry: dict, danish: dict | None, draft: dict | None) -> dict | None:
    spell = e.get_spell(entry["name"], _sources(entry))
    if not spell:
        return None
    eng_school, da_school = SCHOOLS.get(spell.get("school", ""), ("", ""))
    duration, conc = _duration(spell)
    comp, material = _components(spell)
    paragraphs = _paragraphs(spell.get("entries", []))
    dice = _dice_rows(spell)
    scale = _scale(spell)
    limit = MAX_EFFECT_DICE_CHARS if (dice or scale) else MAX_EFFECT_CHARS
    effect = (draft or {}).get("effect") or (danish or {}).get("description_da") or " ".join(paragraphs)
    effect = html.escape(_truncate(effect.replace("**", ""), limit)[0], quote=False)
    card = {
        "navn": spell["name"],
        "dansk": (danish or {}).get("name_da") or "",
        "grad": spell.get("level", 0),
        "skole": eng_school, "skole_da": da_school,
        "tid": _time(spell), "afstand": _range(spell), "varighed": duration, "komp": comp,
        "effekt": effect,
        "ref": _ref(entry, spell),
    }
    if conc:
        card["konc"] = True
    if (spell.get("meta") or {}).get("ritual"):
        card["ritual"] = True
    if dice:
        card["terningboks"] = dice
    if scale:
        card["skala"], card["skala_titel"] = scale
    bag = _text_sections(spell)
    higher = _paragraphs(spell.get("entriesHigherLevel", []))
    if higher:
        bag.append({"titel": "Højere level", "tekst": _html(" ".join(higher))})
    if material:
        bag.append({"titel": "Materialer", "tekst": html.escape(material, quote=False)})
    if (draft or {}).get("back_note"):
        bag.append({"titel": "Godt at vide", "tekst": draft["back_note"]})
    card["bag"] = bag
    return card


# ── Feats, klasseevner, art-træk ──────────────────────────────────────────
def _find_named(entries, name: str):
    if isinstance(entries, list):
        for item in entries:
            if (found := _find_named(item, name)) is not None:
                return found
    elif isinstance(entries, dict):
        if entries.get("name", "").lower() == name.lower() and "entries" in entries:
            return entries
        return _find_named(entries.get("entries", []), name)
    return None


def _source_object(entry: dict, character: dict) -> dict | None:
    kind, name, sources = entry["kind"], entry["name"], _sources(entry)
    if kind == "feat":
        return e.get_feat(name, sources)
    if kind in ("class_feature", "optional_feature"):
        for f in e._class_pool()["classFeature"]:
            if f.get("name") == name and f.get("source") in sources and (not entry.get("class") or f.get("className") == entry["class"]):
                return f
        for f in e.optional_features(sources):
            if f.get("name") == name:
                return f
        return None
    if kind == "race_trait":
        race_name = (character.get("race") or {}).get("name")
        race = e.get_race(race_name, sources) if race_name else None
        if race:
            return _find_named(race.get("entries", []), name) or _find_named(race.get("entries", []), name.split(" (")[0])
    return None


def feature_card(entry: dict, danish: dict | None, draft: dict | None, character: dict) -> dict:
    obj = _source_object(entry, character)
    kind = entry["kind"]
    draft = draft or {}
    kicker = draft.get("kicker") or cards_module.derive_kicker(entry) or ""
    ctype = draft.get("type") or cards_module.derive_type(entry) or "klasse"
    if kind == "feat":
        prereq = (obj or {}).get("prerequisite")
        req = "Se bogen" if prereq else "Ingen"
        felter = [["Type", "Feat"], ["Kategori", (kicker.split(" ")[0] or "–") if kicker else "–"], ["Krav", req], ["Kilde", SOURCE_NAMES.get(entry.get("source") or "", entry.get("source") or "–")]]
    elif kind == "race_trait":
        felter = [["Type", "Art-træk"], ["Art", entry.get("race") or "–"], ["Bruger", "Passiv"], ["Kilde", SOURCE_NAMES.get(entry.get("source") or "", entry.get("source") or "–")]]
    else:
        felter = [["Type", "Klasseevne"], ["Klasse", entry.get("class") or "–"], ["Level", str(entry.get("level") or "–")], ["Kilde", SOURCE_NAMES.get(entry.get("source") or "", entry.get("source") or "–")]]
    paragraphs = _paragraphs((obj or {}).get("entries", []))
    limit = MAX_EFFECT_DICE_CHARS + 40 if draft.get("scaling") else MAX_EFFECT_CHARS
    effect = draft.get("effect") or (danish or {}).get("description_da") or " ".join(paragraphs) or "Ingen tekst fundet i 5etools-data."
    effect = html.escape(_truncate(effect.replace("**", ""), limit)[0], quote=False)
    card = {
        "type": ctype, "navn": entry["name"],
        "dansk": draft.get("name_da") or (danish or {}).get("name_da") or "",
        "kicker": kicker or {"feat": "Feat", "race_trait": "Art-træk"}.get(kind, "Klasseevne"),
        "felter": felter, "effekt": effect, "ref": _ref(entry, obj),
    }
    if draft.get("scaling"):
        card["skala"], card["skala_titel"] = draft["scaling"], draft.get("scaling_title") or "Efter level"
    if obj:
        card["bag"] = _text_sections(obj)
    else:
        card["bag"] = [{"titel": "Sådan virker det", "tekst": effect}]
    if draft.get("back_note"):
        card["bag"].append({"titel": "Godt at vide", "tekst": draft["back_note"]})
    return card


# ── Kandidater, valg, bunke ───────────────────────────────────────────────
def candidates(character: dict) -> list[dict]:
    """Alt karakteren har, som kan blive til et kort. Grupperet af UI'en efter group/sort."""
    curated = {k["navn"].lower(): kid for kid, k in spellkort.bibliotek().items() if k.get("navn")}
    out, seen = [], set()
    for entry in descriptions._entries_from_character(character):
        found = descriptions.lookup(entry["name"], entry.get("source")) or {}
        spell_obj = e.get_spell(entry["name"], _sources(entry)) if entry["kind"] == "spell" else None
        level = spell_obj.get("level", 0) if spell_obj else None
        group = {"spell": "Spells", "feat": "Feats", "class_feature": "Klasseevner",
                 "optional_feature": "Klasseevner", "race_trait": "Art-træk"}[entry["kind"]]
        cid = curated.get(entry["name"].lower()) or slug(entry["name"], entry.get("source"))
        if cid in seen:  # samme navn som feat og klasseevne (fx Ability Score Improvement)
            cid = f"{cid}-{entry['kind'].replace('_', '-')}"
        seen.add(cid)
        out.append({"id": cid, "name": entry["name"], "name_da": found.get("name_da"), "source": entry.get("source"),
                    "kind": entry["kind"], "group": group, "level": level, "curated": entry["name"].lower() in curated,
                    "class": entry.get("class"), "entry": entry})
    return out


def deck_path(character_dir: Path) -> Path:
    return character_dir / DECK_FILE


def load_deck(character_dir: Path) -> dict:
    path = deck_path(character_dir)
    deck = (yaml.safe_load(path.read_text(encoding="utf-8")) if path.is_file() else None) or {}
    deck.setdefault("titel", f"{character_dir.name} kort")
    deck.setdefault("kort", [])
    return deck


def generate(entry: dict, character: dict) -> dict | None:
    found = descriptions.lookup(entry["name"], entry.get("source"))
    draft = cards_module.load().get(slug(entry["name"], entry.get("source")))
    if entry["kind"] == "spell":
        return spell_card(entry, found, draft)
    return feature_card(entry, found, draft, character)


def save_selection(character_dir: Path, character: dict, ids: list[str]) -> dict:
    """Gemmer kort.yaml: id-liste + `egne` for de valgte kort, der ikke er i bibliotek/.
    Egne kort, der allerede står i filen, bevares (en håndrettelse overskrives ikke);
    nye bygges af 5etools."""
    deck = load_deck(character_dir)
    library = spellkort.bibliotek()
    by_id = {c["id"]: c for c in candidates(character)}
    egne = dict(deck.get("egne") or {})
    keep = []
    for cid in ids:
        if cid in library:
            keep.append(cid)
            continue
        if cid not in egne:
            cand = by_id.get(cid)
            card = generate(cand["entry"], character) if cand else None
            if not card:
                continue
            egne[cid] = card
        keep.append(cid)
    deck["kort"] = keep
    deck["egne"] = {cid: egne[cid] for cid in keep if cid in egne}
    deck_path(character_dir).write_text(yaml.safe_dump(deck, allow_unicode=True, sort_keys=False, width=100), encoding="utf-8")
    return deck


def regenerate(character_dir: Path, character: dict, card_id: str) -> None:
    deck = load_deck(character_dir)
    cand = next((c for c in candidates(character) if c["id"] == card_id), None)
    card = generate(cand["entry"], character) if cand else None
    if card and card_id in (deck.get("egne") or {}):
        deck["egne"][card_id] = card
        deck_path(character_dir).write_text(yaml.safe_dump(deck, allow_unicode=True, sort_keys=False, width=100), encoding="utf-8")


def build_html(character_dir: Path, style: str, tema: str | None = None) -> str:
    deck = load_deck(character_dir)
    if not deck["kort"]:
        raise ValueError("Ingen kort valgt endnu.")
    return spellkort.build(deck, style, tema)
