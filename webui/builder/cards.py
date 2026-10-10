"""bibliotek/_cards.yaml: udkast til spil-kort (se docs/kort-yaml.md) for
spells/feats/klassefeatures/race-traits, der endnu ikke har et håndlavet
kort i bibliotek/*.yaml.

Et udkast herfra er ALDRIG et færdigt kort - kun et udgangspunkt, en spiller
selv færdiggør, hvis det skal bruges som et rigtigt kort. De håndkuraterede
bibliotek/*.yaml-filer røres ikke af dette.

Et par felter udledes direkte af 5etools' STRUKTUREREDE data, ingen LLM
involveret:
  - kicker/type: klasse+level (klassefeature), art-navn (race-trait),
    feat-kategori (feat) - felter der allerede findes direkte på de
    pågældende objekter, ikke fri tekst. Spells har intet kicker/type i
    dette kortformat (se docs/kort-yaml.md - de bruger grad/skole i stedet).
  - scaling (kun klassefeatures): klassens egen classTableGroups-tabel, NÅR
    en kolonne matcher feature-navnet 1:1 (fx Sneak Attack). Findes ingen
    matchende kolonne, er feltet None - der gættes ikke.

Resten (name_da/description_da/effect/back_note) kommer fra DET SAMME
LLM-kald som allerede henter name_da/description_da til descriptions.py -
se update_cache(), kaldt fra descriptions.generate_missing() med samme svar,
ingen ekstra LLM-kald/knap.

BEVIDST UDENFOR dette udkast: felter/terningboks, og skala for features UDEN
en matchende tabel-kolonne. De kræver præcise mekaniske formler
(terning-notation, "d20 + spellangreb") - der er ingen sikker kilde at
udlede dem fra uden enten en håndlavet tabel eller et LLM, der risikerer at
opfinde en forkert formel. Ingen af dem bygges her.
"""
from __future__ import annotations

import re
from pathlib import Path

import yaml

from . import e5tools as e

ROOT = Path(__file__).resolve().parent.parent.parent
BIBLIOTEK = ROOT / "bibliotek"
CACHE_PATH = BIBLIOTEK / "_cards.yaml"

_FEAT_CATEGORY_LABELS = {
    "G": "General feat",
    "O": "Origin feat",
    "FS": "Fighting Style feat",
    "EB": "Epic Boon",
}
_TYPE_BY_KIND = {"class_feature": "klasse", "optional_feature": "klasse", "race_trait": "art", "feat": "feat"}


def _slug(name: str, source: str | None) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{base}-{(source or '').lower()}" if source else base


def derive_kicker(entry: dict) -> str | None:
    """None for spells (andet kortformat) og for feats uden en genkendt
    kategori (fx et homebrew-feat uden 'category'-felt)."""
    kind = entry["kind"]
    if kind == "class_feature" and entry.get("class") and entry.get("level"):
        return f"Klasseevne · {entry['class']} <i>level {entry['level']}</i>"
    if kind == "optional_feature" and entry.get("class"):
        return f"Valgfri klasseevne · {entry['class']}"
    if kind == "race_trait" and entry.get("race"):
        return f"Art · {entry['race']}"
    if kind == "feat":
        feat_obj = e.get_feat(entry["name"], {entry["source"]} if entry.get("source") else set())
        return _FEAT_CATEGORY_LABELS.get((feat_obj or {}).get("category"))
    return None


def derive_type(entry: dict) -> str | None:
    return _TYPE_BY_KIND.get(entry["kind"])


def derive_scaling(entry: dict) -> tuple[list[list], str] | None:
    """[[etiket, værdi], ...] + titel, udledt af klassens egen
    classTableGroups - KUN når en kolonne matcher feature-navnet 1:1, og kun
    når værdien reelt ændrer sig med level. Komprimeret til skiftepunkter
    (samme stil som de håndlavede kort, fx eldritch-blast's skala), ikke én
    række pr. niveau."""
    if entry["kind"] != "class_feature" or not entry.get("class"):
        return None
    class_obj = e.get_class(entry["class"], {entry["source"]} if entry.get("source") else set())
    if not class_obj:
        return None
    column = entry["name"]
    rows = [(lvl, v) for lvl in range(1, 21) if (v := e.class_table_value(class_obj, column, lvl)) is not None]
    if not rows:
        return None
    scaling: list[list] = []
    last_value = None
    for level, value in rows:
        if value != last_value:
            label = f"Level {level}" if not scaling else str(level)
            scaling.append([label, value])
            last_value = value
    if len(scaling) < 2:
        return None  # ingen reel skalering (samme værdi hele vejen) - intet at vise
    return scaling, f"{column} efter level"


def load() -> dict[str, dict]:
    if not CACHE_PATH.is_file():
        return {}
    return yaml.safe_load(CACHE_PATH.read_text(encoding="utf-8")) or {}


def save(cache: dict[str, dict]) -> None:
    CACHE_PATH.write_text(yaml.safe_dump(cache, allow_unicode=True, sort_keys=False), encoding="utf-8")


def update_cache(cache: dict[str, dict], entry: dict, llm_result: dict) -> None:
    """Bygger ét udkast-kort og lægger det i cache (muteres in-place). Kaldes
    fra descriptions.generate_missing() med samme LLM-svar den selv bruger
    til _descriptions.yaml."""
    card = {"name": entry["name"], "source": entry.get("source"), "kind": entry["kind"]}
    card_type = derive_type(entry)
    if card_type:
        card["type"] = card_type
    kicker = derive_kicker(entry)
    if kicker:
        card["kicker"] = kicker
    scaling = derive_scaling(entry)
    if scaling:
        card["scaling"], card["scaling_title"] = scaling
    for field in ("name_da", "description_da", "effect", "back_note"):
        if llm_result.get(field):
            card[field] = llm_result[field]
    cache[_slug(entry["name"], entry.get("source"))] = card
