"""Danske kort-beskrivelser til spells, feats, klassefeatures og race-traits -
samme koncept som bibliotek/evner.yaml og bibliotek/besvaergelser.yaml
(engelsk navn + en kort dansk gengivelse, IKKE en oversættelse af selve
regelnavnet, jf. AGENTS.md's navnekonvention), men for ALT en karakter
reelt har valgt - et langt større sæt end de kort gruppen har printet.

Opslagskæde for en entry {name, source, kind}:
  1. De eksisterende, håndkuraterede bibliotek/*.yaml-kort (samme navn).
  2. Den delte cache bibliotek/_beskrivelser.yaml (tidligere LLM-genereringer).
  3. Ellers: mangler - skal genereres (generate_missing()), kun ved et
     eksplicit knaptryk i UI'en, aldrig automatisk ved gem/build.
"""
from __future__ import annotations

import re
from pathlib import Path

import yaml

from . import llm_client

ROOT = Path(__file__).resolve().parent.parent.parent
BIBLIOTEK = ROOT / "bibliotek"
# Præfikset med "_": scripts/kort/spellkort.py's kortbibliotek springer
# filer med det præfiks over (samme konvention som "_skabelon/"), så denne
# cache ikke bliver indlæst som kort.
CACHE_PATH = BIBLIOTEK / "_beskrivelser.yaml"
ENDINGS = (".yaml", ".yml")
BATCH_SIZE = 10


def _slug(name: str, source: str | None) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{base}-{(source or '').lower()}" if source else base


def _load_curated_cards() -> list[dict]:
    """Alle kort i bibliotek/*.yaml (ikke beskrivelser.yaml selv)."""
    cards = []
    if not BIBLIOTEK.is_dir():
        return cards
    for path in sorted(BIBLIOTEK.iterdir()):
        if path.name.startswith(("_", ".")) or path.suffix not in ENDINGS or path == CACHE_PATH:
            continue
        for card in (yaml.safe_load(path.read_text(encoding="utf-8")) or {}).values():
            if isinstance(card, dict) and card.get("navn"):
                cards.append(card)
    return cards


def _load_cache() -> dict[str, dict]:
    if not CACHE_PATH.is_file():
        return {}
    return yaml.safe_load(CACHE_PATH.read_text(encoding="utf-8")) or {}


def _save_cache(cache: dict[str, dict]) -> None:
    CACHE_PATH.write_text(yaml.safe_dump(cache, allow_unicode=True, sort_keys=False), encoding="utf-8")


def lookup(name: str, source: str | None) -> str | None:
    """Kort dansk beskrivelse, hvis vi allerede har en - ellers None."""
    for card in _load_curated_cards():
        if card["navn"].lower() == name.lower():
            return card.get("dansk") or card.get("effekt") or card.get("tekst")
    cached = _load_cache().get(_slug(name, source))
    return cached.get("description_da") if cached else None


def _entries_from_character(character: dict) -> list[dict]:
    entries = []
    for f in character.get("feats", []):
        entries.append({"name": f["name"], "source": f.get("source"), "kind": "feat"})
    for s in character.get("spells_known", []):
        entries.append({"name": s["name"], "source": s.get("source"), "kind": "spell"})
    for f in character.get("class_features", []):
        entries.append({"name": f["name"], "source": f.get("source"), "kind": "class_feature"})
    for t in character.get("race_traits", []):
        entries.append({"name": t["name"], "source": t.get("source"), "kind": "race_trait"})
    # Dubletter (samme spell kendt af flere evner, samme feature nævnt flere gange) fjernes.
    seen, unique = set(), []
    for entry in entries:
        key = (entry["name"], entry["source"], entry["kind"])
        if key not in seen:
            seen.add(key)
            unique.append(entry)
    return unique


def missing_for(character: dict) -> list[dict]:
    return [e for e in _entries_from_character(character) if lookup(e["name"], e["source"]) is None]


def generate_missing(entries: list[dict]) -> list[dict]:
    """Kalder LLM'en i bidder af højst BATCH_SIZE (ikke ét kald pr. entry),
    gemmer resultaterne i den delte cache. Returnerer de entries, der
    STADIG mangler (en fejlet bid prøves ikke automatisk igen i mindre bidder -
    fejlen vises i UI'en, og brugeren kan trykke knappen igen)."""
    if not entries:
        return []
    cache = _load_cache()
    still_missing = []
    for i in range(0, len(entries), BATCH_SIZE):
        batch = entries[i : i + BATCH_SIZE]
        slugged = [{**entry, "id": _slug(entry["name"], entry["source"])} for entry in batch]
        described = llm_client.describe_batch(slugged)
        for entry, slugged_entry in zip(batch, slugged):
            description = described.get(slugged_entry["id"])
            if description:
                cache[slugged_entry["id"]] = {**entry, "description_da": description}
            else:
                still_missing.append(entry)
    _save_cache(cache)
    return still_missing
