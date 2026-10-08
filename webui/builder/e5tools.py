"""Opslag i 5etools' egen data (JSON), mountet read-only på E5TOOLS_DATA.

Vi rører aldrig filerne her - kun læser. Hvilke kilder (sourcebooks) der må
bruges styres af settings.py (standard: kun XPHB, Player's Handbook 2024).
Teksten fra 5etools er engelsk og bruges kun som facit for den, der bygger
karakter.yaml bagefter (menneske eller AI) - den vises aldrig direkte for en
spiller.

Klassefiler scannes fra class/-mappen (class-*.json) i stedet for en fast
liste, så en ny officiel klassefil dukker op uden kodeændring.

Homebrew følger 5etools' egen konvention: filer i homebrew/ (søskende til
data/), registreret i homebrew/index.json's "toImport"-liste - præcis
sådan 5etools' egen "Manage Homebrew"-side gemmer dem for en selv-hostet
kopi. Indholdet blandes ind i de samme opslag som den officielle data,
med sin egen 'source'-kode, så det automatisk dukker op i kilde-listen.
"""
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path

E5TOOLS_DATA = Path(os.environ.get("E5TOOLS_DATA", "/e5tools/data"))
E5TOOLS_HOMEBREW = E5TOOLS_DATA.parent / "homebrew"


class E5ToolsUnavailable(Exception):
    """/e5tools er ikke mountet, eller en datafil mangler."""


@lru_cache(maxsize=None)
def _load_from(base: Path, rel_path: str) -> dict:
    path = base / rel_path
    if not path.is_file():
        raise E5ToolsUnavailable(f"Mangler {path}. Er /e5tools mountet?")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _load(rel_path: str) -> dict:
    return _load_from(E5TOOLS_DATA, rel_path)


def available() -> bool:
    return E5TOOLS_DATA.is_dir()


@lru_cache(maxsize=None)
def _homebrew_files() -> tuple[str, ...]:
    """Filnavnene fra homebrew/index.json's "toImport" - tom hvis ingen er registreret."""
    try:
        data = _load_from(E5TOOLS_HOMEBREW, "index.json")
    except E5ToolsUnavailable:
        return ()
    return tuple(data.get("toImport", []))


def _homebrew_entries(key: str) -> list[dict]:
    """Alt under 'key' (fx 'race', 'feat', 'class') fra alle registrerede homebrew-filer."""
    out = []
    for filename in _homebrew_files():
        try:
            data = _load_from(E5TOOLS_HOMEBREW, filename)
        except E5ToolsUnavailable:
            continue
        out.extend(data.get(key, []))
    return out


# ── alle kilde-koder faktisk til stede i dataene (til indstillingssiden) ────
_SOURCE_FILES = ["races.json", "backgrounds.json", "feats.json"]


def _safe_load(base: Path, rel_path: str) -> dict:
    try:
        return _load_from(base, rel_path)
    except E5ToolsUnavailable:
        return {}


def all_sources() -> dict[str, str]:
    """{kode: bognavn}, fx {'XPHB': \"Player's Handbook (2024)\"}, for de kilder
    der rent faktisk findes i /e5tools/data og homebrew/ - ikke en gættet liste."""
    names = {b["id"]: b["name"] for b in _load("books.json").get("book", [])}
    names.update({b["id"]: b["name"] for b in _homebrew_entries("book") if b.get("id")})
    spell_files = [f"spells/{f}" for f in _safe_load(E5TOOLS_DATA, "spells/index.json").values()]
    datasets = [_safe_load(E5TOOLS_DATA, rel) for rel in _SOURCE_FILES + spell_files]
    datasets.append(_class_pool())
    datasets += [_safe_load(E5TOOLS_HOMEBREW, f) for f in _homebrew_files()]
    found: set[str] = set()
    for data in datasets:
        for key in ("class", "subclass", "classFeature", "subclassFeature",
                    "race", "background", "feat", "spell"):
            for entry in data.get(key, []):
                src = entry.get("source")
                if src:
                    found.add(src)
    return {code: names.get(code, code) for code in sorted(found)}


# ── 5etools' {@tag ...}-markup til læsbar tekst ──────────────────────────────
# Konventionen er: første |-segment er visningsteksten. Et par tags har andre
# regler (fx {@hit} er et tal, {@h} markerer "Hit:" i skadestekst).
_TAG = re.compile(r"\{@(\w+)([^}]*)\}")


def _replace_tag(m: re.Match) -> str:
    tag, rest = m.group(1), m.group(2)
    parts = rest.lstrip().split("|") if rest.strip() else [""]
    first = parts[0].strip()
    if tag in ("hit",):
        return first or "+0"
    if tag == "h":
        return "Hit:"
    if tag in ("dice", "damage", "d20", "scaledice"):
        return first
    return first


def clean_text(text: str) -> str:
    """Fjern 5etools-markup og efterlad almindelig engelsk tekst."""
    if not isinstance(text, str):
        return str(text)
    text = _TAG.sub(_replace_tag, text)
    text = text.replace("&amp;", "&")
    return text


def _flatten_entry(entry, indent: int = 0) -> list[str]:
    """Fold 5etools' entries-træ (strenge, lister, tabeller) til linjer tekst."""
    pre = "  " * indent
    if isinstance(entry, str):
        return [pre + clean_text(entry)]
    if isinstance(entry, list):
        out = []
        for e in entry:
            out.extend(_flatten_entry(e, indent))
        return out
    if isinstance(entry, dict):
        t = entry.get("type")
        out = []
        name = entry.get("name")
        if name:
            out.append(pre + f"**{clean_text(name)}**")
        if t == "list":
            for item in entry.get("items", []):
                if isinstance(item, dict) and item.get("type") == "item":
                    label = item.get("name")
                    line = (f"{label}: " if label else "") + clean_text(item.get("entry", "") or "")
                    out.append(pre + "- " + line)
                    for sub in item.get("entries", []) or []:
                        out.extend(_flatten_entry(sub, indent + 1))
                else:
                    out.append(pre + "- " + "\n".join(_flatten_entry(item, 0)))
        elif t == "table":
            out.append(pre + f"[tabel: {clean_text(entry.get('caption') or name or '')} - se PHB 2024]")
        elif "entries" in entry:
            for e in entry["entries"]:
                out.extend(_flatten_entry(e, indent + (1 if name else 0)))
        elif "entry" in entry:
            out.append(pre + clean_text(entry["entry"]))
        return out
    return [pre + str(entry)]


def render_text(entries) -> str:
    """Entries-listen fra en feature/trait/feat som sammenhængende, læsbar tekst."""
    return "\n".join(_flatten_entry(entries))


def raw_text(entries) -> str:
    """Som render_text, men UDEN at fjerne {@tag ...}-markup - til at lede efter
    maskinlæsbare signaler i teksten, fx {@filter X|feats|category=Y}."""
    if isinstance(entries, str):
        return entries
    if isinstance(entries, list):
        return " ".join(raw_text(e) for e in entries)
    if isinstance(entries, dict):
        parts = [entries.get("entry", "")]
        parts.append(raw_text(entries.get("entries", [])))
        parts.append(raw_text(entries.get("items", [])))
        return " ".join(p for p in parts if p)
    return ""


# ── Klasser ───────────────────────────────────────────────────────────────
# Klassefiler slås op ved at scanne class/ (class-*.json), ikke en fast liste -
# en ny officiel klassefil eller en homebrew-klasse dukker op uden kodeændring.
@lru_cache(maxsize=None)
def _class_pool() -> dict:
    pool = {"class": [], "subclass": [], "classFeature": [], "subclassFeature": []}
    class_dir = E5TOOLS_DATA / "class"
    if class_dir.is_dir():
        for path in sorted(class_dir.glob("class-*.json")):
            data = _load(f"class/{path.name}")
            for key in pool:
                pool[key].extend(data.get(key, []))
    for filename in _homebrew_files():
        data = _safe_load(E5TOOLS_HOMEBREW, filename)
        if "class" in data or "classFeature" in data:
            for key in pool:
                pool[key].extend(data.get(key, []))
    return pool


def class_names() -> list[str]:
    return sorted({c["name"] for c in _class_pool()["class"] if c.get("name")})


def classes(sources: set[str]) -> list[dict]:
    """Klasser der faktisk findes under en af de TILLADTE kilder - til
    klasse-dropdownen, som race/background-dropdownene allerede gør det.
    class_names() bruges stadig til prerequisite-opslag der selv tjekker
    kilde pr. kandidat (se _meets_prerequisite/_feature_feat_category)."""
    return [c for c in _class_pool()["class"] if c.get("source") in sources]


def get_class(name: str, sources: set[str]) -> dict | None:
    for c in _class_pool()["class"]:
        if c.get("name") == name and c.get("source") in sources:
            return c
    return None


def subclasses(class_name: str, sources: set[str]) -> list[dict]:
    return [s for s in _class_pool()["subclass"] if s.get("className") == class_name and s.get("source") in sources]


def class_features(class_name: str, sources: set[str], up_to_level: int) -> list[dict]:
    """Alle class-features (ikke subclass) op til og med niveau."""
    out = [f for f in _class_pool()["classFeature"]
           if f.get("className") == class_name and f.get("source") in sources and f.get("level", 99) <= up_to_level]
    out.sort(key=lambda f: f.get("level", 0))
    return out


def subclass_features(class_name: str, subclass_name: str, sources: set[str], up_to_level: int) -> list[dict]:
    out = [f for f in _class_pool()["subclassFeature"]
           if f.get("className") == class_name and f.get("source") in sources
           and f.get("subclassShortName") == subclass_name and f.get("level", 99) <= up_to_level]
    out.sort(key=lambda f: f.get("level", 0))
    return out


# ── Racer/species ────────────────────────────────────────────────────────
def races(sources: set[str]) -> list[dict]:
    all_races = _load("races.json").get("race", []) + _homebrew_entries("race")
    return [r for r in all_races if r.get("source") in sources]


def get_race(name: str, sources: set[str]) -> dict | None:
    for r in races(sources):
        if r.get("name") == name:
            return r
    return None


# ── Baggrunde ────────────────────────────────────────────────────────────
def backgrounds(sources: set[str]) -> list[dict]:
    all_backgrounds = _load("backgrounds.json").get("background", []) + _homebrew_entries("background")
    return [b for b in all_backgrounds if b.get("source") in sources]


def get_background(name: str, sources: set[str]) -> dict | None:
    for b in backgrounds(sources):
        if b.get("name") == name:
            return b
    return None


# ── Feats ────────────────────────────────────────────────────────────────
def _all_feats() -> list[dict]:
    return _load("feats.json").get("feat", []) + _homebrew_entries("feat")


def get_feat(name: str, sources: set[str]) -> dict | None:
    for f in _all_feats():
        if f.get("source") in sources and f.get("name") == name:
            return f
    return None


def feats_by_category(category: str, sources: set[str]) -> list[dict]:
    """category: 'G' General, 'O' Origin, 'FS' Fighting Style, 'EB' Epic Boon."""
    return [f for f in _all_feats() if f.get("source") in sources and f.get("category") == category]


# ── Spells ───────────────────────────────────────────────────────────────
def _all_spells(sources: set[str]) -> list[dict]:
    """Spells fra alle spell-FILER hvis kilde er tilladt, ikke kun XPHB -
    spells/index.json kortlægger kilde-kode til filnavn (fx "TCE":
    "spells-tce.json"). En kilde uden sin egen spell-fil (fx RHW, LFL)
    introducerer ingen nye spells, kun referencer til spells fra andre
    bøger, og har derfor ingen fil at loade."""
    index = _load("spells/index.json")
    out = []
    for code, filename in index.items():
        if code in sources:
            out += _load(f"spells/{filename}").get("spell", [])
    return out + _homebrew_entries("spell")


def get_spell(name: str, sources: set[str]) -> dict | None:
    for s in _all_spells(sources):
        if s.get("source") in sources and s.get("name", "").lower() == name.lower():
            return s
    return None


def class_spells(class_names: str | set[str], sources: set[str], max_level: int | None = None) -> list[dict]:
    """Spells på en eller flere klassers spell-liste (fx et feat-filter som
    "class=Cleric;Wizard" - matcher enhver spell der står på MINDST én af
    dem). For officiel data ligger klasse/spell-sammenhænge i et separat
    opslagsværk (generated/gendata-spell-source-lookup.json), ikke i selve
    spell-objektet - homebrew-spells forventes i stedet at have et
    almindeligt classes.fromClassList-felt direkte på sig selv.

    Opslagsværket er opdelt i ét underafsnit PR. BOG (nøglen er bogens kilde-
    kode i små bogstaver, fx "efa") - et underafsnit indeholder kun de
    spells, DEN bog selv introducerer, så en spell slås op under sin EGEN
    kilde, ikke en fast "xphb". Hver spells egen "class"-felt er desuden selv
    opdelt pr. kildebog (fx Wizards Acid Splash, der OGSÅ står på Artificers
    liste via EFA, har class: {"XPHB": {...}, "EFA": {"Artificer": true}}) -
    der slås derfor op i alle TILLADTE kilder, så en Artificer-feat først
    giver resultater når EFA/TCE rent faktisk er slået til i indstillingerne."""
    names = {class_names} if isinstance(class_names, str) else set(class_names)
    lookup = _load("generated/gendata-spell-source-lookup.json")
    out = []
    for s in _all_spells(sources):
        spell_source = s.get("source")
        if spell_source not in sources:
            continue
        info = lookup.get(spell_source.lower(), {}).get(s.get("name", "").lower(), {})
        class_info = info.get("class") or {}
        classes = {c for src in sources for c in class_info.get(src, {})} | {
            c.get("name") for c in (s.get("classes") or {}).get("fromClassList", [])
        }
        if classes & names:
            if max_level is None or s.get("level", 0) <= max_level:
                out.append(s)
    out.sort(key=lambda s: (s.get("level", 0), s.get("name", "")))
    return out


def _matches_spell_attack(spell: dict, wanted: set[str]) -> bool:
    """5etools' "Spell Attack"-filter (M/R/O - Melee/Ranged/Other-Unknown, se
    js/filter-spells.js i /srv/e5tools). spellAttack-feltet sættes kun til
    "M" og/eller "R" (automatisk udledt af spell-teksten ved data-generering,
    se converterutils-spell.js) - "O" findes ikke som en faktisk værdi, det
    er UI'ets bagkat for "intet attack-kast" (feltet tomt/mangler)."""
    actual = {t.upper() for t in (spell.get("spellAttack") or [])}
    wanted = {w.upper() for w in wanted}
    if "O" in wanted and not actual:
        return True
    return bool(actual & (wanted - {"O"}))


def spells_by_filter(sources: set[str], level: int | None = None, schools: set[str] | None = None, class_name: str | set[str] | None = None, ritual: bool | None = None, spell_attack: set[str] | None = None) -> list[dict] | None:
    """Løser 5etools' "choose": "level=X|school=Y;Z"-filterstrenge (bruges af
    feats som Shadow-Touched/Fey-Touched/Blessed Warrior til at give et valg
    blandt spells, der opfylder kriterierne). ritual=True matcher kun spells
    med meta.ritual (bruges af Ritual Caster). Returnerer None hvis intet
    kriterie er givet overhovedet (så en tom/ukendt filterstreng ikke stille
    returnerer "alle spells")."""
    if level is None and not schools and not class_name and ritual is None and not spell_attack:
        return None
    pool = class_spells(class_name, sources, None) if class_name else _all_spells(sources)
    out = [
        s for s in pool
        if s.get("source") in sources
        and (level is None or s.get("level") == level)
        and (not schools or s.get("school") in schools)
        and (ritual is None or bool((s.get("meta") or {}).get("ritual")) == ritual)
        and (not spell_attack or _matches_spell_attack(s, spell_attack))
    ]
    out.sort(key=lambda s: s.get("name", ""))
    return out


def class_table_value(class_obj: dict, column_label: str, level: int) -> int | str | None:
    """Slår en kolonne op i klassens egen tabel (classTableGroups), fx hvor mange
    våben Weapon Mastery giver, eller Sneak Attacks terningeskade, på et givet
    niveau - tabel-drevet, ikke en fast tal. Terning-celler (fx Sneak Attack,
    Rage-skade) er i 5etools' data et struktureret {type: dice, toRoll: [...]}-
    objekt, ikke et tal - de returneres som en terning-streng ("2d6"), flere
    terne i samme celle som "1d6+1d4"."""
    for group in class_obj.get("classTableGroups", []):
        labels = group.get("colLabels", [])
        if column_label in labels:
            idx = labels.index(column_label)
            rows = group.get("rows", [])
            if 0 < level <= len(rows):
                cell = rows[level - 1][idx]
                if isinstance(cell, dict) and cell.get("type") == "dice":
                    dice = [f"{d['number']}d{d['faces']}" for d in cell.get("toRoll", [])
                            if "number" in d and "faces" in d]
                    return "+".join(dice) if dice else None
                try:
                    return int(cell)
                except (ValueError, TypeError):
                    return None
    return None


def weapons(sources: set[str]) -> list[dict]:
    all_weapons = _load("items-base.json").get("baseitem", []) + _homebrew_entries("baseitem") + _homebrew_entries("item")
    return [i for i in all_weapons if i.get("source") in sources and i.get("weaponCategory")]


_TOOL_TYPES = {"AT", "INS", "T", "GS"}  # Artisan's Tools, Instruments, øvrige Tools, Gaming Sets


def tools(sources: set[str]) -> list[dict]:
    """Alle værktøjer (artisan's tools, instrumenter, tyveværktøj osv.) på tværs
    af items-base.json (AT/INS) og items.json (T/GS) - 5etools deler dem over
    to filer efter om de er "simple" baseitems eller har et fuldt item-opslag."""
    pool = (
        _load("items-base.json").get("baseitem", [])
        + _load("items.json").get("item", [])
        + _homebrew_entries("baseitem") + _homebrew_entries("item")
    )
    return [i for i in pool if i.get("source") in sources and (i.get("type") or "").split("|")[0] in _TOOL_TYPES]


# ── Udstyr ───────────────────────────────────────────────────────────────
def get_item(id_name: str) -> dict | None:
    """id_name er fx 'chain mail|xphb' (som i startingEquipment)."""
    name = id_name.split("|")[0]
    pool = (
        _load("items-base.json").get("baseitem", [])
        + _load("items.json").get("item", [])
        + _homebrew_entries("baseitem") + _homebrew_entries("item")
    )
    for i in pool:
        if i.get("name", "").lower() == name.lower():
            return i
    return None
