from __future__ import annotations

import re
from pathlib import Path

from flask import Blueprint, jsonify, render_template, request

from . import e5tools, model, settings

bp = Blueprint("builder", __name__)

ROOT = Path(__file__).resolve().parent.parent.parent
CHARACTERS = ROOT / "karakterer"
NAME_OK = re.compile(r"^[a-z0-9-]+$")


def _character_dir(name: str) -> Path:
    if not NAME_OK.match(name):
        raise ValueError("Navn må kun have små bogstaver, tal og bindestreg.")
    return CHARACTERS / name


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
        model.save(character_dir, model.empty_character())
    return jsonify({"name": name})


@bp.get("/builder/<name>")
def builder_character(name: str):
    return render_template("builder.html", name=name, page="character")


@bp.get("/builder/<name>/equipment")
def builder_equipment(name: str):
    return render_template("builder.html", name=name, page="equipment")


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
    model.save(character_dir, data)
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
    model.save(character_dir, data)
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
    model.save(character_dir, data)
    return jsonify(model.state(data))


# ── Indstillinger: hvilke 5etools-kilder må byggeren slå op i ─────────────
@bp.get("/builder/settings")
def builder_settings():
    return render_template("builder_settings.html")


@bp.get("/api/builder/sources")
def api_sources():
    if not e5tools.available():
        return jsonify({"error": "/e5tools er ikke mountet."}), 503
    return jsonify({
        "all": e5tools.all_sources(),
        "allowed": sorted(settings.allowed_sources()),
        "default": settings.DEFAULT_SOURCES,
    })


@bp.post("/api/builder/sources")
def api_set_sources():
    payload = request.get_json(silent=True) or {}
    allowed = payload.get("allowed")
    if not isinstance(allowed, list) or not allowed:
        return jsonify({"error": "Vælg mindst én kilde."}), 400
    settings.set_allowed_sources(allowed)
    return jsonify({"allowed": sorted(settings.allowed_sources())})
