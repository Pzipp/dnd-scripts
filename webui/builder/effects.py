"""bibliotek/_effects.yaml: LLM-udtrukne, MÅLBARE, PERMANENTE tal-ændringer
for feats/klassefeatures/race-traits/spells (se
docs/llm-effect-extraction-prompt.md for selve designet/prompten og
target-listen). Samme ene LLM-kald som descriptions.py/cards.py allerede
bruger - se update_cache(), kaldt fra descriptions.generate_missing() med
samme svar.

En entry gemmes ALTID her, når den er sendt til LLM'en - også med en tom
effects-liste, hvis intet blev fundet. Det er forskellen på "undersøgt,
intet permanent fundet" og "aldrig undersøgt" (se
descriptions.missing_effects_for()), så vi ikke spørger om samme regel igen
og igen.

Kun confidence: high anvendes automatisk (se character_yaml._apply_effects())
- aftalt med brugeren 2026-10-08: foldes altid ind ved high confidence, også
selvom det kan overskrive en manuel rettelse af et PRESERVED_FIELDS-felt.
medium/low gemmes stadig her, men bruges ikke automatisk nogen steder endnu.
"""
from __future__ import annotations

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent.parent
BIBLIOTEK = ROOT / "bibliotek"
CACHE_PATH = BIBLIOTEK / "_effects.yaml"


def _slug(name: str, source: str | None) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{base}-{(source or '').lower()}" if source else base


def load() -> dict[str, dict]:
    if not CACHE_PATH.is_file():
        return {}
    return yaml.safe_load(CACHE_PATH.read_text(encoding="utf-8")) or {}


def save(cache: dict[str, dict]) -> None:
    CACHE_PATH.write_text(yaml.safe_dump(cache, allow_unicode=True, sort_keys=False), encoding="utf-8")


def update_cache(cache: dict[str, dict], entry: dict, llm_result: dict) -> None:
    cache[_slug(entry["name"], entry.get("source"))] = {
        "name": entry["name"],
        "source": entry.get("source"),
        "kind": entry["kind"],
        "effects": llm_result.get("effects") or [],
        "confidence": llm_result.get("confidence"),
    }


def high_confidence_effects(entries: list[dict]) -> list[tuple[dict, dict]]:
    """Alle permanente effects med confidence: high for de givne entries (fx
    en karakters fulde feats+class_features+race_traits+spells_known), som
    (entry, effect)-par - IKKE kun effecten alene. character_yaml._apply_
    effects() skal vide hvilken entry en hp_per_level-effect kom fra (feat
    eller class_feature) for at vide om den skal ganges med karakterens
    TOTALE niveau (feats, fx Tough: "twice your character level") eller med
    DEN GRANTENDE KLASSES EGEN niveau (class_features, fx Draconic
    Resilience: skalerer med Sorcerer-niveau, ikke karakterniveau)."""
    cache = load()
    out = []
    for entry in entries:
        cached = cache.get(_slug(entry["name"], entry.get("source")))
        if not cached or cached.get("confidence") != "high":
            continue
        out.extend((entry, eff) for eff in cached.get("effects", []) if eff.get("duration") == "permanent")
    return out
