"""Mapcreator (/mapcreator): kortbygger. Klienten (mapcreator/, TypeScript + Svelte, bygget til webui/static/mapcreator/)
ejer dokumentet og tegningen; serveren gemmer kortdokumenter som JSON og (senere) modtager færdige billeder.

Data ligger under $USERDATA/mapcreator/ (standard /userdata). Ingen login: kun til internt brug.
"""
from __future__ import annotations

import json
import os
import re
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, render_template, request

bp = Blueprint("mapcreator", __name__)

STATIC_DIST = Path(__file__).resolve().parent.parent / "static" / "mapcreator"
ID_RE = re.compile(r"^[a-z0-9-]{4,64}$")
DOC_VERSION = 1  # samme som DOC_VERSION i mapcreator/src/model/types.ts
MAX_CELLS = 300
MAX_LAYERS = 200
MAX_DOC_BYTES = 20 * 1024 * 1024
LOCK = threading.RLock()


class Fejl(Exception):
    def __init__(self, msg: str, code: int = 400):
        super().__init__(msg)
        self.msg, self.code = msg, code


@bp.errorhandler(Fejl)
def _fejl(e: Fejl):
    return jsonify({"error": e.msg}), e.code


def userdata() -> Path:
    return Path(os.environ.get("USERDATA", "/userdata"))


def maps_dir() -> Path:
    """Mappen med kortdokumenter. Selve USERDATA oprettes aldrig her (så Docker ikke laver en root-ejet mappe)."""
    root = userdata()
    if not root.is_dir():
        raise Fejl(f"Datamappen {root} findes ikke eller er ikke mountet (se docs/todo-sebastian.md).", 503)
    d = root / "mapcreator" / "maps"
    try:
        d.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise Fejl(f"Kan ikke skrive i {d}: {e.strerror}", 503)
    return d


def map_path(map_id: str) -> Path:
    if not ID_RE.match(map_id):
        raise Fejl("Ugyldigt kort-id.")
    return maps_dir() / f"{map_id}.json"


def validate_doc(doc, map_id: str) -> dict:
    """Skal-krav til et kortdokument; resten af indholdet er klientens ansvar."""
    if not isinstance(doc, dict):
        raise Fejl("Kortet skal være et JSON-objekt.")
    if doc.get("id") != map_id:
        raise Fejl("Kortets id passer ikke til adressen.")
    version = doc.get("version")
    if not isinstance(version, int) or isinstance(version, bool) or not 1 <= version <= DOC_VERSION:
        raise Fejl("Ukendt dokumentversion.")
    name = doc.get("name")
    if not isinstance(name, str) or not name.strip() or len(name) > 120:
        raise Fejl("Kortet skal have et navn på højst 120 tegn.")
    for key in ("widthCells", "heightCells"):
        v = doc.get(key)
        if not isinstance(v, int) or isinstance(v, bool) or not 1 <= v <= MAX_CELLS:
            raise Fejl(f"{key} skal være et helt tal mellem 1 og {MAX_CELLS}.")
    layers = doc.get("layers")
    if not isinstance(layers, list) or not 1 <= len(layers) <= MAX_LAYERS:
        raise Fejl(f"Kortet skal have 1 til {MAX_LAYERS} lag.")
    if not all(isinstance(l, dict) and isinstance(l.get("id"), str) for l in layers):
        raise Fejl("Hvert lag skal have et id.")
    return doc


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="seconds")


@bp.get("/mapcreator")
def page():
    app_js = STATIC_DIST / "app.js"
    built = app_js.is_file()
    return render_template("mapcreator.html", built=built, v=int(app_js.stat().st_mtime) if built else 0)


@bp.get("/api/mapcreator/maps")
def list_maps():
    out = []
    for p in maps_dir().glob("*.json"):
        if not ID_RE.match(p.stem):
            continue
        try:
            d = json.loads(p.read_text("utf-8"))
            out.append({
                "id": p.stem, "name": str(d.get("name", p.stem)),
                "widthCells": d.get("widthCells"), "heightCells": d.get("heightCells"),
                "modified": _iso(p.stat().st_mtime),
            })
        except (OSError, ValueError):
            continue  # ødelagt fil: vis den ikke, men slet den heller ikke
    out.sort(key=lambda m: m["modified"], reverse=True)
    return jsonify(out)


@bp.get("/api/mapcreator/maps/<map_id>")
def get_map(map_id: str):
    p = map_path(map_id)
    if not p.is_file():
        raise Fejl("Kortet findes ikke.", 404)
    return jsonify(json.loads(p.read_text("utf-8")))


@bp.put("/api/mapcreator/maps/<map_id>")
def put_map(map_id: str):
    p = map_path(map_id)
    if (request.content_length or 0) > MAX_DOC_BYTES:
        raise Fejl("Kortet er for stort.", 413)
    doc = validate_doc(request.get_json(silent=True), map_id)
    with LOCK:  # skriv atomisk: aldrig et halvt kort på disken
        fd, tmp = tempfile.mkstemp(dir=p.parent, prefix=".tmp-", suffix=".json")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
            os.replace(tmp, p)
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise
    return jsonify({"ok": True, "modified": _iso(p.stat().st_mtime)})


@bp.delete("/api/mapcreator/maps/<map_id>")
def delete_map(map_id: str):
    p = map_path(map_id)
    if not p.is_file():
        raise Fejl("Kortet findes ikke.", 404)
    p.unlink()
    return jsonify({"ok": True})
