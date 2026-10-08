"""Danske navne-undertitler og korte beskrivelser til spells, feats,
klassefeatures og race-traits - samme koncept som bibliotek/evner.yaml og
bibliotek/besvaergelser.yaml (engelsk navn forbliver primært og synligt,
'dansk' er kun en undertitel, IKKE en oversættelse der erstatter navnet,
jf. AGENTS.md's navnekonvention), men for ALT en karakter reelt har valgt -
et langt større sæt end de kort gruppen har printet.

Opslagskæde for en entry {name, source, kind}:
  1. De eksisterende, håndkuraterede bibliotek/*.yaml-kort (samme navn).
  2. Den delte cache bibliotek/_descriptions.yaml (tidligere LLM-genereringer).
  3. Ellers: mangler - skal genereres (generate_missing()), kun ved et
     eksplicit knaptryk i UI'en, aldrig automatisk ved gem/build.

generate_missing() lægger samtidig et kort-udkast i bibliotek/_cards.yaml for
samme entries (se cards.py) - samme LLM-svar, intet ekstra kald."""
from __future__ import annotations

import re
from pathlib import Path

import yaml

from . import cards, llm_client

ROOT = Path(__file__).resolve().parent.parent.parent
BIBLIOTEK = ROOT / "bibliotek"
# Præfikset med "_": scripts/kort/spellkort.py's kortbibliotek springer
# filer med det præfiks over (samme konvention som "_skabelon/"), så denne
# cache ikke bliver indlæst som kort.
CACHE_PATH = BIBLIOTEK / "_descriptions.yaml"
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


def lookup(name: str, source: str | None) -> dict | None:
    """{'name_da', 'description_da'}, hvis vi allerede har en - ellers None.
    name_da er en undertitel til det engelske navn (jf. AGENTS.md's
    navnekonvention), IKKE en oversættelse der erstatter det - samme rolle
    som bibliotek-kortenes eget 'dansk'-felt allerede har."""
    for card in _load_curated_cards():
        if card["navn"].lower() == name.lower():
            return {"name_da": card.get("dansk"), "description_da": card.get("effekt") or card.get("tekst")}
    cached = _load_cache().get(_slug(name, source))
    if cached:
        return {"name_da": cached.get("name_da"), "description_da": cached.get("description_da")}
    return None


def _entries_from_character(character: dict) -> list[dict]:
    entries = []
    for f in character.get("feats", []):
        entries.append({"name": f["name"], "source": f.get("source"), "kind": "feat"})
    for s in character.get("spells_known", []):
        entries.append({"name": s["name"], "source": s.get("source"), "kind": "spell"})
    for f in character.get("class_features", []):
        # class/level tages med her (ikke kun til lookup/cache-brug), så
        # cards.derive_kicker()/derive_scaling() kan bruge dem direkte uden
        # at skulle slå karakteren op igen - se cards.py.
        entries.append({"name": f["name"], "source": f.get("source"), "kind": "class_feature",
                         "class": f.get("class"), "level": f.get("level")})
    race_name = character.get("race", {}).get("name")
    for t in character.get("race_traits", []):
        entries.append({"name": t["name"], "source": t.get("source"), "kind": "race_trait", "race": race_name})
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
    fejlen vises i UI'en, og brugeren kan trykke knappen igen).

    Samme svar bruges også til at lægge et kort-udkast i bibliotek/_cards.yaml
    (se cards.update_cache()) - intet ekstra LLM-kald, ingen ekstra knap."""
    if not entries:
        return []
    cache = _load_cache()
    cards_cache = cards.load()
    still_missing = []
    for i in range(0, len(entries), BATCH_SIZE):
        batch = entries[i : i + BATCH_SIZE]
        slugged = [{**entry, "id": _slug(entry["name"], entry["source"])} for entry in batch]
        described = llm_client.describe_batch(slugged)
        for entry, slugged_entry in zip(batch, slugged):
            result = described.get(slugged_entry["id"])
            if result and result.get("description_da"):
                cache[slugged_entry["id"]] = {
                    **entry,
                    **{k: result[k] for k in ("name_da", "description_da") if k in result},
                }
                cards.update_cache(cards_cache, slugged_entry, result)
            else:
                still_missing.append(entry)
    _save_cache(cache)
    cards.save(cards_cache)
    return still_missing
