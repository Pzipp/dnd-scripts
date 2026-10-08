"""OpenAI-kompatibelt chat-completions-kald, til at generere en dansk
navne-undertitel (name_da), en kort dansk beskrivelse (description_da), til
kort-udkastet i bibliotek/_cards.yaml en kort forsidetekst (effect) og
bagside-note (back_note), og et struktureret udtræk af MÅLBARE, PERMANENTE
tal-ændringer (effects/confidence, se docs/llm-effect-extraction-prompt.md)
- for spells/feats/klassefeatures/race-traits (se descriptions.py/cards.py/
effects.py). Samme ene kald leverer alle felter.

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

# target-listen for effects (se docs/llm-effect-extraction-prompt.md) - KUN
# disse værdier er gyldige, resten af en "effects"-liste forkastes af
# _valid_effect() nedenfor. "skill:<navn>" er åben (skill-navnet selv
# valideres ikke mod en fast liste), "save:<EVNE>" er låst til de seks evner.
_FIXED_TARGETS = {
    "initiative", "ac", "hp_max", "hp_per_level", "speed",
    "damage_resistance", "damage_immunity", "damage_vulnerability",
    "condition_immunity", "darkvision",
}
_ABILITIES = {"STR", "DEX", "CON", "INT", "WIS", "CHA"}
_EFFECT_TYPES = {"add", "set", "resistance", "immunity", "vulnerability", "advantage"}
_DURATIONS = {"permanent", "conditional", "temporary"}


def _valid_target(target: str) -> bool:
    if target in _FIXED_TARGETS or target.startswith("skill:"):
        return True
    if target.startswith("save:"):
        return target.removeprefix("save:") in _ABILITIES
    return False


def _valid_effect(item) -> bool:
    return (
        isinstance(item, dict)
        and _valid_target(item.get("target", ""))
        and item.get("type") in _EFFECT_TYPES
        and item.get("value") not in (None, "")
        and item.get("duration") in _DURATIONS
    )


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
        "og kortsæt. For hver regel nedenfor skal du give disse ting:\n\n"
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
        "gentagelse af description_da/effect.\n"
        "5. effects: en liste af MÅLBARE, PERMANENTE tal-ændringer reglen "
        "giver til et af felterne i Target-listen nedenfor - KUN hvis reglen "
        "rent faktisk giver en af dem. En situationsbestemt handling (noget "
        "du kan VÆLGE at gøre, fx bytte et slag, eller noget der kun gælder "
        "under en bestemt tilstand) er IKKE en permanent effekt - lad den stå "
        "ude af 'effects' og beskriv den i description_da i stedet. Er du i "
        "tvivl, lad 'effects' være en tom liste - det er altid et sikkert svar.\n"
        "6. confidence: high, medium eller low - dit eget skøn på sikkerheden "
        "i 'effects' (tom liste behøver ikke et skøn, så confidence kan "
        "udelades, hvis 'effects' er tom).\n\n"
        "Target-liste til effects (brug KUN disse - ingen andre værdier er "
        "gyldige): initiative, ac, hp_max, hp_per_level, speed, "
        "save:STR, save:DEX, save:CON, save:INT, save:WIS, save:CHA, "
        "skill:<skillnavn i små bogstaver, fx skill:perception>, "
        "damage_resistance, damage_immunity, damage_vulnerability, "
        "condition_immunity, darkvision\n\n"
        "Hver effect har: target (fra listen ovenfor), type (add | set | "
        "resistance | immunity | vulnerability | advantage), value (fx 'PB', "
        "'2', 'ability:CON', eller en skadetype/tilstand), duration "
        "(permanent | conditional | temporary). Sæt duration til ALT ANDET "
        "end 'permanent', hvis effekten kun gælder under en betingelse "
        "(raging, koncentration, 'once per turn' osv.) - sådanne effects "
        "regnes ALDRIG automatisk ind i karakterens tal, uanset duration-"
        "værdi, så det er bedre at tage den med som 'conditional' end at "
        "udelade den helt.\n\n"
        "Brug den officielle PHB 2024-regel, gæt ikke hvis du er usikker - "
        "udelad feltet/effekten helt i stedet for at gætte. Opfind ALDRIG "
        "terningeslag, formler eller taltabeller i effect/back_note/"
        "description_da - det bliver IKKE bedt om i de felter.\n\n"
        + "\n".join(lines)
        + "\n\nSvar med PRÆCIS ét YAML-dokument, nøjagtigt i dette format, "
        "intet andet (ingen indledning, ingen afslutning, ingen markdown-"
        "kodeblok):\n\n"
        "<id>:\n"
        "  name_da: <dansk undertitel>\n"
        "  description_da: <kort dansk beskrivelse>\n"
        "  effect: <kort forsidetekst>\n"
        "  back_note: <kort bagside-note>\n"
        "  effects:\n"
        "    - {target: ..., type: ..., value: ..., duration: ...}\n"
        "  confidence: high | medium | low\n"
    )


_TEXT_FIELDS = ("name_da", "description_da", "effect", "back_note")


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
        if key not in ids or not isinstance(value, dict):
            continue
        fields = {f: value[f].strip() for f in _TEXT_FIELDS if isinstance(value.get(f), str) and value[f].strip()}
        effects = [e for e in (value.get("effects") or []) if _valid_effect(e)]
        if effects:
            fields["effects"] = effects
            if value.get("confidence") in ("high", "medium", "low"):
                fields["confidence"] = value["confidence"]
        if fields:
            out[key] = fields
    return out


def describe_batch(entries: list[dict]) -> dict[str, dict]:
    """entries: [{id, name, source, kind}, ...], højst ~10. Returnerer
    {id: {name_da?, description_da?, effect?, back_note?, effects?, confidence?}}
    - kun de felter modellen reelt svarede på for den entry, i det
    forventede/gyldige format (se _parse/_valid_effect). Et id uden GYLDIGE
    felter overhovedet er ikke med i resultatet."""
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
