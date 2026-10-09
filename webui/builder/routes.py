from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml
from flask import Blueprint, jsonify, render_template, request, send_from_directory

from . import character_yaml, descriptions, e5tools, llm_client, model, render, settings
from . import sheets as sheets_module

bp = Blueprint("builder", __name__)

ROOT = Path(__file__).resolve().parent.parent.parent
CHARACTERS = ROOT / "karakterer"
NAME_OK = re.compile(r"^[a-z0-9-]+$")

# Samme PDF-generator som det gamle system (scripts/pdf/), genbrugt uændret.
sys.path.insert(0, str(ROOT / "scripts" / "pdf"))
import lav_pdf  # noqa: E402

PDF_STYLES = {"farve", *render.STYLE_FILES}


def _character_dir(name: str) -> Path:
    if not NAME_OK.match(name):
        raise ValueError("Navn må kun have små bogstaver, tal og bindestreg.")
    return CHARACTERS / name


def _save_choices(character_dir: Path, data: dict) -> None:
    """Gem choices.yaml, og hold character.yaml i sync (se character_yaml.py).
    Brug denne i stedet for model.save() direkte, alle steder choices.yaml ændres."""
    model.save(character_dir, data)
    character_yaml.derive_and_save(character_dir, data)
    sheets_module.ensure_exists(character_dir)


def _builder_characters() -> list[str]:
    if not CHARACTERS.is_dir():
        return []
    return sorted(
        p.name for p in CHARACTERS.iterdir()
        if p.is_dir() and not p.name.startswith(("_", ".")) and model.choices_path(p).is_file()
    )


@bp.get("/builder")
def builder_index():
    return render_template("builder_index.html", characters=_builder_characters())


@bp.post("/api/builder/create")
def api_create():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip().lower()
    try:
        character_dir = _character_dir(name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    character_dir.mkdir(parents=True, exist_ok=True)
    path = model.choices_path(character_dir)
    if not path.is_file():
        _save_choices(character_dir, model.empty_character())
    return jsonify({"name": name})


@bp.get("/builder/<name>")
def builder_character(name: str):
    return render_template("builder.html", name=name, page="character")


@bp.get("/builder/<name>/equipment")
def builder_equipment(name: str):
    return render_template("builder.html", name=name, page="equipment")


@bp.get("/builder/<name>/print")
def builder_print(name: str):
    return render_template("builder.html", name=name, page="print")


# ── Print: character.yaml + sheets.yaml -> HTML via den native render.py ──
@bp.get("/api/builder/sheet")
def api_sheet():
    name = request.args.get("name", "")
    try:
        character_dir = _character_dir(name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    if not character_yaml.character_path(character_dir).is_file():
        return jsonify({"error": "Ingen character.yaml endnu - gem noget på Karakter-fanen først."}), 400
    character = character_yaml.load(character_dir)
    sheets = sheets_module.load(character_dir)
    stil = request.args.get("style", "farve")
    try:
        html = render.build(character, sheets, stil)
    except Exception as exc:  # et dataproblem i character.yaml/sheets.yaml
        return jsonify({"error": f"Fejl i arket: {type(exc).__name__}: {exc}"}), 400
    return jsonify({"html": html, "missing_descriptions": descriptions.missing_for(character)})


@bp.post("/api/builder/pdf")
def api_pdf():
    """Print-klar PDF af det GEMTE character.yaml + sheets.yaml, via samme
    Playwright-generator som det gamle system (scripts/pdf/lav_pdf.py).
    HTML og PDF lægges side om side i karakterens udskrifter/, som CLI'en."""
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    if not character_yaml.character_path(character_dir).is_file():
        return jsonify({"error": "Ingen character.yaml endnu - gem noget på Karakter-fanen først."}), 400
    stil = payload.get("style", "farve")
    if stil not in PDF_STYLES:
        return jsonify({"error": "Ukendt stil."}), 400
    character = character_yaml.load(character_dir)
    sheets = sheets_module.load(character_dir)
    try:
        html = render.build(character, sheets, stil)
    except Exception as exc:  # et dataproblem i character.yaml/sheets.yaml
        return jsonify({"error": f"Fejl i arket: {type(exc).__name__}: {exc}"}), 400
    out = character_dir / "udskrifter"
    out.mkdir(exist_ok=True)
    html_path = out / f"karakterark-{stil}.html"
    pdf_path = out / f"karakterark-{stil}.pdf"
    html_path.write_text(html, encoding="utf-8")
    try:
        lav_pdf.lav_pdf([(str(html_path), str(pdf_path))])
    except SystemExit as exc:  # faelles.fejl(), fx manglende Playwright/Chromium
        return jsonify({"error": str(exc.code)}), 500
    return jsonify({"pdf": f"/builder/download/{payload.get('name', '')}/{pdf_path.name}"})


@bp.get("/builder/download/<name>/<filename>")
def builder_download(name: str, filename: str):
    try:
        character_dir = _character_dir(name)
    except ValueError:
        return jsonify({"error": "Ukendt karakter."}), 404
    if filename not in {f"karakterark-{s}.pdf" for s in PDF_STYLES}:
        return jsonify({"error": "Ukendt fil."}), 404
    return send_from_directory(character_dir / "udskrifter", filename, as_attachment=True)


@bp.post("/api/builder/translate")
def api_translate():
    """Automatisk, hvis llm_client.is_configured() - ellers returneres en
    prompt til at kopiere ind i brugerens egen chat (manual: true), se
    /api/builder/translate/manual for vejen tilbage."""
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    character = character_yaml.load(character_dir)
    entries = descriptions.entries_needing_llm(character)
    if not llm_client.is_configured():
        return jsonify({"manual": True, "prompt": descriptions.manual_prompt(entries)})
    try:
        still_missing = descriptions.generate_missing(entries)
    except llm_client.LLMRequestFailed as exc:
        return jsonify({"error": str(exc)}), 502
    # Et nyt effects-fund (fx Alert's +PB til initiativ) skal slå igennem på
    # character.yaml med det samme - uden dette ville det først ske ved næste
    # choices.yaml-gem, selvom effects jo blev fundet lige nu.
    character_yaml.derive_and_save(character_dir, model.load(character_dir))
    return jsonify({"missing_descriptions": still_missing})


@bp.post("/api/builder/translate/manual")
def api_translate_manual():
    """Brugeren har selv kopieret prompten fra api_translate() ind i sin
    egen chat og indsætter nu svaret her - samme cache-opdatering og
    character.yaml-genafledning som den automatiske vej."""
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    response_text = payload.get("response", "")
    if not response_text.strip():
        return jsonify({"error": "Indsæt svaret fra chatten først."}), 400
    character = character_yaml.load(character_dir)
    entries = descriptions.entries_needing_llm(character)
    still_missing = descriptions.apply_manual_response(entries, response_text)
    character_yaml.derive_and_save(character_dir, model.load(character_dir))
    return jsonify({"missing_descriptions": still_missing})


def _parse_sheets_yaml(yaml_text: str) -> dict:
    """Fælles validering for sheets_yaml-save/preview - samme regler som den
    gamle YAML-editor (webui/app.py) brugte for karakter.yaml/kort.yaml."""
    try:
        parsed = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        raise ValueError(f"YAML-fejl: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("YAML skal indeholde et objekt/mappe øverst.")
    return parsed


@bp.get("/api/builder/sheets_yaml")
def api_sheets_yaml_get():
    try:
        character_dir = _character_dir(request.args.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    sheets_module.ensure_exists(character_dir)
    return jsonify({"yaml": sheets_module.sheets_path(character_dir).read_text(encoding="utf-8")})


@bp.post("/api/builder/sheets_yaml")
def api_sheets_yaml_save():
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    yaml_text = payload.get("yaml", "")
    try:
        _parse_sheets_yaml(yaml_text)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    # Rå tekst skrives direkte (ikke yaml.safe_dump af det parsede resultat) -
    # bevarer spillerens egen formatering/kommentarer, som sheets.yaml
    # eksplicit er beskrevet som "redigeres frit" i sheets.py's docstring.
    sheets_module.sheets_path(character_dir).write_text(yaml_text.rstrip() + "\n", encoding="utf-8")
    return jsonify({"saved": True})


@bp.post("/api/builder/sheets_check")
def api_sheets_check():
    """Kun YAML-syntaksfejl til editorens linje/kolonne-markering - ingen
    layout-specifik validering (det gamle systems tjek.tjek(layout=True)
    passer ikke på dette skema)."""
    payload = request.get_json(silent=True) or {}
    try:
        yaml.safe_load(payload.get("yaml", ""))
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        return jsonify({"fejl": [{
            "linje": mark.line + 1 if mark else 1,
            "kolonne": mark.column + 1 if mark else 1,
            "besked": f"YAML-fejl: {getattr(exc, 'problem', None) or exc}",
        }]})
    return jsonify({"fejl": []})


@bp.post("/api/builder/sheets_preview")
def api_sheets_preview():
    """Forhåndsvisning af UGEMT sheets-YAML fra editoren - character.yaml
    hentes uændret fra disk (det er ikke filen der redigeres her)."""
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    try:
        parsed = _parse_sheets_yaml(payload.get("yaml", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    character = character_yaml.load(character_dir)
    stil = payload.get("style", "farve")
    try:
        html = render.build(character, parsed, stil)
    except Exception as exc:  # et dataproblem i den (endnu ugemte) sheets-YAML
        return jsonify({"error": f"Fejl i arket: {type(exc).__name__}: {exc}"}), 400
    return jsonify({"html": html, "missing_descriptions": descriptions.missing_for(character)})


@bp.get("/api/builder/state")
def api_state():
    name = request.args.get("name", "")
    try:
        character_dir = _character_dir(name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    data = model.load(character_dir)
    return jsonify(model.state(data))


@bp.post("/api/builder/answer")
def api_answer():
    payload = request.get_json(silent=True) or {}
    name = payload.get("name", "")
    fields = payload.get("fields", {})
    confirmed = bool(payload.get("confirmed", False))
    try:
        character_dir = _character_dir(name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    if not isinstance(fields, dict) or not fields:
        return jsonify({"error": "Mangler fields."}), 400
    data = model.load(character_dir)
    try:
        result = model.set_fields(data, fields, confirmed)
    except Exception as exc:  # et ugyldigt felt-navn fra klienten
        return jsonify({"error": f"Kunne ikke sætte felt: {exc}"}), 400
    if not result["ok"]:
        return jsonify({"needs_confirmation": True, **result})
    _save_choices(character_dir, data)
    return jsonify(model.state(data))


@bp.post("/api/builder/class/add")
def api_class_add():
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    data = model.load(character_dir)
    model.add_class(data)
    _save_choices(character_dir, data)
    return jsonify(model.state(data))


@bp.post("/api/builder/class/remove")
def api_class_remove():
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    class_id = payload.get("class_id", "")
    if not class_id:
        return jsonify({"error": "Mangler class_id."}), 400
    data = model.load(character_dir)
    model.remove_class(data, class_id)
    _save_choices(character_dir, data)
    return jsonify(model.state(data))


# ── Indstillinger: hvilke 5etools-kilder og husregler gælder for DENNE karakter ──
@bp.get("/builder/<name>/settings")
def builder_settings(name: str):
    return render_template("builder_settings.html", name=name)


@bp.get("/api/builder/settings")
def api_settings():
    name = request.args.get("name", "")
    try:
        character_dir = _character_dir(name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    if not e5tools.available():
        return jsonify({"error": "/e5tools er ikke mountet."}), 503
    data = model.load(character_dir)
    char_settings = data.get("settings", {})
    return jsonify({
        "all": e5tools.all_sources(),
        "allowed": sorted(char_settings.get("allowed_sources") or settings.DEFAULT_SOURCES),
        "default": settings.DEFAULT_SOURCES,
        "half_feats": char_settings.get("half_feats", settings.DEFAULT_HALF_FEATS),
    })


@bp.post("/api/builder/settings")
def api_set_settings():
    payload = request.get_json(silent=True) or {}
    name = payload.get("name", "")
    try:
        character_dir = _character_dir(name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    allowed = payload.get("allowed")
    if not isinstance(allowed, list) or not allowed:
        return jsonify({"error": "Vælg mindst én kilde."}), 400
    data = model.load(character_dir)
    data["settings"] = {
        "allowed_sources": sorted(allowed),
        "half_feats": bool(payload.get("half_feats", False)),
    }
    _save_choices(character_dir, data)
    return jsonify({"allowed": data["settings"]["allowed_sources"], "half_feats": data["settings"]["half_feats"]})
