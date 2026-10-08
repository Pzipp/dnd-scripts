"""OpenAI-kompatibelt chat-completions-kald, til at generere en dansk
navne-undertitel (name_da) og en kort dansk beskrivelse (description_da) af
spells/feats/klassefeatures/race-traits (se descriptions.py).

Ingen provider-specifik kode - skal virke uændret mod et claude-code
API-endpoint og mod en Mistral-endpoint, begge OpenAI-kompatible
/chat/completions. Ingen ekstern afhængighed (kun stdlib urllib), så intet
nyt at installere i Dockerfilen for sådan et simpelt kald.

Miljøvariabler (sættes i .env, se .env.example - ALDRIG en nøgle i sporet kode):
  LLM_API_BASE   fx https://api.anthropic.com/v1 eller en Mistral-endpoint
  LLM_API_KEY
  LLM_MODEL
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

KIND_LABELS = {
    "feat": "feat", "spell": "besværgelse (spell)",
    "class_feature": "klassefeature", "race_trait": "race-trait",
}


class LLMNotConfigured(Exception):
    pass


class LLMRequestFailed(Exception):
    pass


def _config() -> tuple[str, str, str]:
    base = os.environ.get("LLM_API_BASE")
    key = os.environ.get("LLM_API_KEY")
    model = os.environ.get("LLM_MODEL")
    if not base or not key or not model:
        raise LLMNotConfigured("LLM_API_BASE, LLM_API_KEY og LLM_MODEL skal sættes i .env.")
    return base.rstrip("/"), key, model


def _prompt(entries: list[dict]) -> str:
    lines = [
        f"- id={e['id']} navn=\"{e['name']}\" kilde={e.get('source') or '?'} type={KIND_LABELS.get(e['kind'], e['kind'])}"
        for e in entries
    ]
    return (
        "Du hjælper med et dansk D&D 2024 (Player's Handbook 2024)-karakterark. "
        "For hver regel nedenfor skal du give TO ting: "
        "(1) et KORT, officielt dansk navn til at stå som undertitel under det "
        "engelske navn på arket - samme princip som bibliotek/evner.yaml's "
        "'dansk'-felt (fx Sneak Attack -> Snigangreb). Det engelske navn "
        "forbliver ALTID det primære, synlige navn - den danske udgave er kun "
        "en undertitel, ikke en oversættelse der ERSTATTER det. "
        "(2) en KORT dansk beskrivelse (1-2 sætninger, samme stil/længde som "
        "et regelkort). Brug den officielle PHB 2024-regel, gæt ikke hvis du "
        "er usikker - udelad linjen helt for den entry i stedet for at gætte.\n\n"
        + "\n".join(lines)
        + "\n\nSvar med PRÆCIS én linje pr. regel i formatet:\n"
        "id: dansk navn :: kort dansk beskrivelse\n"
        "Ingen indledning, ingen afslutning, ingen markdown."
    )


def _parse(text: str, ids: set[str]) -> dict[str, dict]:
    out = {}
    for line in text.splitlines():
        match = re.match(r"^\s*([a-z0-9-]+)\s*:\s*(.+?)\s*::\s*(.+)$", line.strip())
        if match and match.group(1) in ids:
            out[match.group(1)] = {"name_da": match.group(2).strip(), "description_da": match.group(3).strip()}
    return out


def describe_batch(entries: list[dict]) -> dict[str, dict]:
    """entries: [{id, name, source, kind}, ...], højst ~10. Returnerer
    {id: {name_da, description_da}} - kun for de id'er modellen reelt svarede på
    i det forventede format (se _parse)."""
    base, key, model = _config()
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": _prompt(entries)}],
        "temperature": 0.2,
    }
    request = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        raise LLMRequestFailed(f"LLM-kald fejlede: {exc}") from exc
    try:
        text = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMRequestFailed(f"Uventet svarformat fra LLM-endpointet: {body}") from exc
    return _parse(text, {e["id"] for e in entries})
