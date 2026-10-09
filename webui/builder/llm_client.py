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


def _entry_line(e: dict) -> str:
    """Én linje pr. entry til prompten. class/level/race tages med, når
    entry'en har dem (class_feature/race_trait, se descriptions.py) - ekstra
    kontekst modellen allerede havde adgang til via entry-dicten, men som
    IKKE blev sendt med før - fx Sorcerer-niveau 3 for Draconic Resilience,
    relevant for at vurdere om en effect skalerer med klasse- eller
    karakter-niveau (se docs/llm-effect-extraction-prompt.md)."""
    parts = [f"id={e['id']}", f"navn=\"{e['name']}\"", f"kilde={e.get('source') or '?'}",
             f"type={KIND_LABELS.get(e['kind'], e['kind'])}"]
    if e.get("class"):
        parts.append(f"klasse={e['class']}")
    if e.get("level"):
        parts.append(f"niveau={e['level']}")
    if e.get("race"):
        parts.append(f"art={e['race']}")
    return "- " + " ".join(parts)


# Et VIRKELIGT, verificeret eksempel pr. mønster (ikke opfundet - se
# docs/llm-effect-extraction-prompt.md): Alert viser det simple, rent
# permanente tilfælde; Draconic Resilience viser et PERMANENT + BETINGET
# effect i samme liste, OG en bevidst 'medium'-confidence, fordi HP-bonussen
# reelt skalerer med Sorcerer-niveau, ikke karakterniveau - en nuance
# target-listen ikke kan udtrykke præcist, så lavere confidence er det
# ærlige svar i stedet for en for skarp værdi.
_FEW_SHOT = """
Eksempel (kun til at vise FORMATET - svar ikke med disse to, medmindre de
faktisk står i den rigtige liste nedenfor):

Input:
- id=alert-xphb navn="Alert" kilde=XPHB type=feat
- id=draconic-resilience-xphb navn="Draconic Resilience" kilde=XPHB type=klassefeature klasse=Sorcerer niveau=3

Forventet svar:
alert-xphb:
  name_da: Årvågen
  description_da: Du lægger din Proficiency Bonus til initiativslag, og kan bytte initiativ med en villig allieret lige efter slaget.
  effect: Læg din Proficiency Bonus til Initiative. Byt dit Initiative-resultat med en villig allieret lige efter slaget.
  back_note: Byttet skal ske umiddelbart efter initiativslaget - ikke senere i runden.
  effects:
    - {target: initiative, type: add, value: PB, duration: permanent}
  confidence: high
draconic-resilience-xphb:
  name_da: Dragelig Modstandskraft
  description_da: Dit maksimale HP stiger, og uden rustning får du en alternativ AC baseret på DEX og CHA.
  effect: HP-maksimum stiger, når du får featuren, og yderligere for hvert Sorcerer-niveau. Uden rustning er AC = 10 + DEX + CHA.
  back_note: AC-bonussen gælder kun uden rustning - tager du rustning på, bruger du dens værdi i stedet.
  effects:
    - {target: hp_per_level, type: add, value: "1", duration: permanent}
    - {target: ac, type: set, value: "10+DEX+CHA", duration: conditional}
  confidence: medium
"""


def _prompt(entries: list[dict]) -> str:
    lines = [_entry_line(e) for e in entries]
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
        "udelades, hvis 'effects' er tom). Vælg 'medium'/'low' i stedet for "
        "'high', hvis effekten reelt afhænger af noget value-feltet ikke kan "
        "udtrykke præcist (fx at en bonus skalerer med KLASSE-niveau, ikke "
        "karakter-niveau, eller med en anden klasses niveau i et multiclass-"
        "tilfælde) - 'high' bruges automatisk af systemet, så en for skarp "
        "værdi her kan give et forkert tal på arket.\n\n"
        "VIGTIGT - navnekonvention: regelnavne/termer (Proficiency Bonus/PB, "
        "evnenavne STR/DEX/CON/INT/WIS/CHA, skadetyper som Fire/Slashing, "
        "tilstande som Incapacitated, osv.) oversættes ALDRIG til dansk, "
        "heller ikke inde i en dansk sætning - de forbliver altid på engelsk "
        "i name_da/description_da/effect/back_note, ligesom i bibliotek-"
        "kortenes egen stil. Skriv 'Proficiency Bonus', ikke 'øvelsesbonus'; "
        "'DEX', ikke 'behændighed'.\n"
        + _FEW_SHOT +
        "\nTarget-liste til effects (brug KUN disse - ingen andre værdier er "
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
        "Nu den RIGTIGE liste - svar kun for disse:\n"
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
        # Et bid på 10 entries × 6 felter målt til ~200s mod den lokale
        # claude-code-endpoint (langsom hardware) - backend'en NÅR at svare,
        # men en for stram timeout her lukker forbindelsen, FØR svaret
        # skrives, og smider et færdigt resultat væk (set i praksis:
        # BrokenPipeError i backend'ens log, selvom svaret var klart).
        with urllib.request.urlopen(request, timeout=300) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError) as exc:
        # En langsom READ (ikke selve connect) rejser en rå TimeoutError, IKKE
        # en URLError - fanges separat, ellers crasher kaldet uhåndteret
        # (set i praksis: langsomt batch-svar fra en lokal LLM-endpoint).
        raise LLMRequestFailed(f"LLM-kald fejlede: {exc}") from exc
    try:
        text = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMRequestFailed(f"Uventet svarformat fra LLM-endpointet: {body}") from exc
    return _parse(text, {e["id"] for e in entries})
