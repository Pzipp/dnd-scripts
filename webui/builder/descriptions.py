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

from . import cards, effects, llm_client

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


def _has_curated_card(name: str) -> bool:
    """True hvis der findes et RIGTIGT, håndlavet kort i bibliotek/*.yaml -
    til at afgøre om et kort-udkast i cards.py ville være ren redundans
    (modsat lookup(), der også tæller en ren cachet beskrivelse uden kort)."""
    return any(card["navn"].lower() == name.lower() for card in _load_curated_cards())


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


def missing_effects_for(character: dict) -> list[dict]:
    """Entries, der ALDRIG har fået et effects-tjek (se effects.py) - uanset
    om de allerede har en beskrivelse (curated/cachet). Separat fra
    missing_for(), fordi Alert m.fl. typisk allerede har en håndkurateret
    beskrivelse, men aldrig har været igennem effects-udtræk."""
    cache = effects.load()
    return [e for e in _entries_from_character(character)
            if effects._slug(e["name"], e.get("source")) not in cache]


def entries_needing_llm(character: dict) -> list[dict]:
    """Union af missing_for() og missing_effects_for() (dedupliceret) - det
    EN knap/kald rent faktisk sender til LLM'en, se generate_missing()."""
    seen, out = set(), []
    for entry in missing_for(character) + missing_effects_for(character):
        key = (entry["name"], entry["source"], entry["kind"])
        if key not in seen:
            seen.add(key)
            out.append(entry)
    return out


def generate_missing(entries: list[dict]) -> list[dict]:
    """Kalder LLM'en i bidder af højst BATCH_SIZE (ikke ét kald pr. entry),
    gemmer resultaterne i den delte cache. Returnerer de entries, der
    STADIG mangler en beskrivelse. Fejler et bid (fx LLM-timeout), gemmes
    allerede-lykkedes bidder FØR fejlen videregives - en langsom/fejlende
    bid skal ikke kassere arbejde, tidligere bidder allerede har gjort
    færdigt (set i praksis: bid 2 af 3 timede ud efter 180s, og uden
    pr.-bid-gemning gik bid 1's resultat tabt sammen med fejlen).
    entries bør komme fra entries_needing_llm(), ikke kun missing_for() -
    ellers får en allerede-beskrevet entry (fx et håndkurateret feat) aldrig
    et effects-tjek.

    Samme svar bruges også til: et kort-udkast i bibliotek/_cards.yaml (se
    cards.update_cache()) og et effects-udtræk i bibliotek/_effects.yaml (se
    effects.update_cache()) - intet ekstra LLM-kald, ingen ekstra knap."""
    if not entries:
        return []
    cache = _load_cache()
    cards_cache = cards.load()
    effects_cache = effects.load()
    still_missing = []
    try:
        for i in range(0, len(entries), BATCH_SIZE):
            batch = entries[i : i + BATCH_SIZE]
            slugged = [{**entry, "id": _slug(entry["name"], entry["source"])} for entry in batch]
            described = llm_client.describe_batch(slugged)
            for entry, slugged_entry in zip(batch, slugged):
                # "or {}" (ikke "if not result: continue") - en entry, der
                # allerede HAR en beskrivelse (lookup() ovenfor) og bare
                # ventede på et effects-tjek, får ofte et TOMT svar her, fordi
                # den reelt ikke har nogen målbar effekt. Den skal stadig
                # markeres "tjekket" nedenfor (effects.update_cache()) - ellers
                # bliver den gensendt til LLM'en ved hvert fremtidigt knaptryk,
                # for evigt, selvom svaret aldrig ændrer sig.
                result = described.get(slugged_entry["id"]) or {}
                already_has_description = lookup(entry["name"], entry.get("source")) is not None
                if result.get("description_da") and not already_has_description:
                    cache[slugged_entry["id"]] = {
                        **entry,
                        **{k: result[k] for k in ("name_da", "description_da") if k in result},
                    }
                elif not result.get("description_da") and not already_has_description:
                    still_missing.append(entry)
                # Et kort-UDKAST er ren redundans, hvis der allerede findes et
                # rigtigt, håndlavet kort - _has_curated_card() (ikke lookup()) er
                # den rigtige afgørelse her.
                if not _has_curated_card(entry["name"]):
                    cards.update_cache(cards_cache, slugged_entry, result)
                effects.update_cache(effects_cache, slugged_entry, result)
    finally:
        _save_cache(cache)
        cards.save(cards_cache)
        effects.save(effects_cache)
    return still_missing
