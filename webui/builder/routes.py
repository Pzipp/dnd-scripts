from __future__ import annotations

import re
from pathlib import Path

from flask import Blueprint, jsonify, render_template, request

from . import character_yaml, descriptions, e5tools, llm_client, model, render, settings
from . import sheets as sheets_module

bp = Blueprint("builder", __name__)

ROOT = Path(__file__).resolve().parent.parent.parent
CHARACTERS = ROOT / "karakterer"
NAME_OK = re.compile(r"^[a-z0-9-]+$")


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
    try:
        html = render.build(character, sheets, "farve")
    except Exception as exc:  # et dataproblem i character.yaml/sheets.yaml
        return jsonify({"error": f"Fejl i arket: {type(exc).__name__}: {exc}"}), 400
    return jsonify({"html": html, "missing_descriptions": descriptions.missing_for(character)})


@bp.post("/api/builder/translate")
def api_translate():
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    character = character_yaml.load(character_dir)
    try:
        still_missing = descriptions.generate_missing(descriptions.entries_needing_llm(character))
    except llm_client.LLMNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except llm_client.LLMRequestFailed as exc:
        return jsonify({"error": str(exc)}), 502
    # Et nyt effects-fund (fx Alert's +PB til initiativ) skal slå igennem på
    # character.yaml med det samme - uden dette ville det først ske ved næste
    # choices.yaml-gem, selvom effects jo blev fundet lige nu.
    character_yaml.derive_and_save(character_dir, model.load(character_dir))
    return jsonify({"missing_descriptions": still_missing})


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
