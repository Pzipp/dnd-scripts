"""OpenAI-kompatibelt chat-completions-kald, til at generere en dansk
navne-undertitel (name_da), en kort dansk beskrivelse (description_da), og
til kort-udkastet i bibliotek/_cards.yaml en kort forsidetekst (effect) og
bagside-note (back_note) - for spells/feats/klassefeatures/race-traits (se
descriptions.py/cards.py). Samme ene kald leverer alle fire felter.

Ingen provider-specifik kode - skal virke uændret mod et claude-code
API-endpoint og mod en Mistral-endpoint, begge OpenAI-kompatible
/chat/completions. Ingen ekstern afhængighed udover yaml (allerede brugt i
hele webui'en), så intet nyt at installere i Dockerfilen.

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

import yaml

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
        "Du hjælper med et dansk D&D 2024 (Player's Handbook 2024)-karakterark "
        "og kortsæt. For hver regel nedenfor skal du give FIRE ting:\n\n"
        "1. name_da: et KORT, officielt dansk navn til at stå som undertitel "
        "under det engelske navn - samme princip som bibliotek/evner.yaml's "
        "'dansk'-felt (fx Sneak Attack -> Snigangreb). Det engelske navn "
        "forbliver ALTID det primære, synlige navn - den danske udgave er kun "
        "en undertitel, ikke en oversættelse der ERSTATTER det.\n"
        "2. description_da: en KORT dansk beskrivelse (1-2 sætninger, samme "
        "stil/længde som et regelkort).\n"
        "3. effect: kort forsidetekst til et spil-kort (2-4 linjer), samme "
        "stil som bibliotek-kortenes 'effekt'-felt - hvad reglen GØR, ikke "
        "en fuld gengivelse af hele regelteksten.\n"
        "4. back_note: ÉN kort note til kortets bagside (\"Godt at vide\"-stil) "
        "- ét nyttigt praktisk tip eller én vigtig detalje, ikke en "
        "gentagelse af description_da/effect.\n\n"
        "Brug den officielle PHB 2024-regel, gæt ikke hvis du er usikker - "
        "udelad feltet helt for den entry i stedet for at gætte. Opfind "
        "ALDRIG terningeslag, formler eller taltabeller - det bliver IKKE "
        "bedt om her, og skal ikke stå i noget af de fire felter.\n\n"
        + "\n".join(lines)
        + "\n\nSvar med PRÆCIS ét YAML-dokument, nøjagtigt i dette format, "
        "intet andet (ingen indledning, ingen afslutning, ingen markdown-"
        "kodeblok):\n\n"
        "<id>:\n"
        "  name_da: <dansk undertitel>\n"
        "  description_da: <kort dansk beskrivelse>\n"
        "  effect: <kort forsidetekst>\n"
        "  back_note: <kort bagside-note>\n"
    )


_FIELDS = ("name_da", "description_da", "effect", "back_note")


def _parse(text: str, ids: set[str]) -> dict[str, dict]:
    # Modellen følger ikke altid "ingen indledning/markdown"-instruktionen i
    # prompten (set i praksis: forklarende tekst FØR et ```yaml ...```-fence) -
    # led efter fence'et, uanset hvor i svaret det sidder, før vi falder
    # tilbage til at prøve at parse hele svaret som det er.
    match = re.search(r"```[a-zA-Z]*\n(.*?)```", text, re.DOTALL)
    cleaned = match.group(1) if match else text.strip()
    try:
        parsed = yaml.safe_load(cleaned)
    except yaml.YAMLError:
        return {}
    if not isinstance(parsed, dict):
        return {}
    out = {}
    for key, value in parsed.items():
        if key in ids and isinstance(value, dict):
            fields = {f: value[f].strip() for f in _FIELDS if isinstance(value.get(f), str) and value[f].strip()}
            if fields:
                out[key] = fields
    return out


def describe_batch(entries: list[dict]) -> dict[str, dict]:
    """entries: [{id, name, source, kind}, ...], højst ~10. Returnerer
    {id: {name_da?, description_da?, effect?, back_note?}} - kun de felter
    modellen reelt svarede på for den entry, i det forventede format (se
    _parse). Et id uden GYLDIGE felter overhovedet er ikke med i resultatet."""
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
        with urllib.request.urlopen(request, timeout=180) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        raise LLMRequestFailed(f"LLM-kald fejlede: {exc}") from exc
    try:
        text = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMRequestFailed(f"Uventet svarformat fra LLM-endpointet: {body}") from exc
    return _parse(text, {e["id"] for e in entries})
