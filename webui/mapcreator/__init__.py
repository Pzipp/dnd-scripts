"""Mapcreator (/mapcreator): kortbygger. Klienten (mapcreator/, TypeScript + Svelte, bygget til webui/static/mapcreator/)
ejer dokumentet og tegningen; serveren gemmer kortdokumenter som JSON og (senere) modtager færdige billeder.

Data ligger under $USERDATA/mapcreator/ (standard /userdata). Ingen login: kun til internt brug.
"""
from __future__ import annotations

import json
import os
import io
import re
import secrets
import shutil
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, make_response, render_template, request, send_file
from PIL import Image, UnidentifiedImageError

bp = Blueprint("mapcreator", __name__)

STATIC_DIST = Path(__file__).resolve().parent.parent / "static" / "mapcreator"
ID_RE = re.compile(r"^[a-z0-9-]{4,64}$")
DOC_VERSION = 2  # samme som DOC_VERSION i mapcreator/src/model/types.ts
MAX_CELLS = 300
MAX_LAYERS = 200
MAX_DOC_BYTES = 20 * 1024 * 1024
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
MAX_SOURCE_PIXELS = 36_000_000  # afviser enorme billeder, før de dekodes
MAX_ASSET_SIDE = 1024
MAX_ASSETS = 2000
LAYER_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
TILE_RE = re.compile(r"^\d{1,3}_\d{1,3}$")
MAX_PAINT_BYTES = 96 * 1024 * 1024
MAX_PAINT_TILE = 4 * 1024 * 1024
MAX_PAINT_TILES = 4096
ASSET_ID_RE = re.compile(r"^[a-f0-9]{12}$")
SLUG_RE = re.compile(r"^[a-z0-9_]{1,40}$")
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
    _prune_paint(map_id, {l["id"] for l in doc["layers"]})
    return jsonify({"ok": True, "modified": _iso(p.stat().st_mtime)})


@bp.delete("/api/mapcreator/maps/<map_id>")
def delete_map(map_id: str):
    p = map_path(map_id)
    if not p.is_file():
        raise Fejl("Kortet findes ikke.", 404)
    p.unlink()
    shutil.rmtree(paint_dir(map_id), ignore_errors=True)
    return jsonify({"ok": True})


# ---- malede fliser (underlaget) ----
# Hvert grund- og gulvlag er et billede, som klienten (render/paintView.ts) deler i fliser på 256 × 256 pixels og gemmer her som PNG:
# $USERDATA/mapcreator/paint/<kort>/<lag>/<tx>_<ty>.png. Kortets JSON siger kun, hvilke fliser et lag har.


def paint_dir(map_id: str) -> Path:
    if not ID_RE.match(map_id):
        raise Fejl("Ugyldigt kort-id.")
    return userdata() / "mapcreator" / "paint" / map_id


def _prune_paint(map_id: str, layer_ids: set[str]) -> None:
    d = paint_dir(map_id)
    if not d.is_dir():
        return
    for sub in d.iterdir():
        if sub.is_dir() and sub.name not in layer_ids:
            shutil.rmtree(sub, ignore_errors=True)


def _layer_paint_dir(map_id: str, layer_id: str) -> Path:
    if not LAYER_RE.match(layer_id):
        raise Fejl("Ugyldigt lag-id.")
    return paint_dir(map_id) / layer_id


@bp.get("/api/mapcreator/maps/<map_id>/paint/<layer_id>/<tile>.png")
def get_paint_tile(map_id: str, layer_id: str, tile: str):
    if not TILE_RE.match(tile):
        raise Fejl("Ugyldig flise.")
    f = _layer_paint_dir(map_id, layer_id) / f"{tile}.png"
    if not f.is_file():
        raise Fejl("Flisen findes ikke.", 404)
    resp = make_response(send_file(f, mimetype="image/png"))
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@bp.post("/api/mapcreator/maps/<map_id>/paint/<layer_id>")
def post_paint(map_id: str, layer_id: str):
    """Multipart: `keep` (JSON-liste af "tx_ty": alle fliser, laget har) og filer `t_<tx>_<ty>` for de fliser, der er nye eller ændrede."""
    if (request.content_length or 0) > MAX_PAINT_BYTES:
        raise Fejl("Fliserne er for store.", 413)
    try:
        keep = json.loads(request.form.get("keep", ""))
    except ValueError:
        raise Fejl("Listen over fliser er ikke gyldigt JSON.")
    if not isinstance(keep, list) or len(keep) > MAX_PAINT_TILES or not all(isinstance(k, str) and TILE_RE.match(k) for k in keep):
        raise Fejl("Ugyldig liste over fliser.")
    wanted = set(keep)
    d = _layer_paint_dir(map_id, layer_id)
    with LOCK:
        d.mkdir(parents=True, exist_ok=True)
        for name, fs in request.files.items():
            if not name.startswith("t_") or not TILE_RE.match(name[2:]) or name[2:] not in wanted:
                raise Fejl("Ugyldig flise i uploaden.")
            raw = fs.read(MAX_PAINT_TILE + 1)
            if len(raw) > MAX_PAINT_TILE or not raw.startswith(b"\x89PNG\r\n\x1a\n"):
                raise Fejl("Fliserne skal være PNG-billeder på højst 4 MB.")
            try:
                with Image.open(io.BytesIO(raw)) as im:
                    if im.width > 256 or im.height > 256:
                        raise Fejl("Fliserne må højst være 256 × 256 pixels.")
            except (UnidentifiedImageError, OSError):
                raise Fejl("Flisen er ikke et gyldigt billede.")
            fd, tmp = tempfile.mkstemp(dir=d, prefix=".tmp-")
            with os.fdopen(fd, "wb") as f:
                f.write(raw)
            os.replace(tmp, d / f"{name[2:]}.png")
        for f in d.glob("*.png"):
            if f.stem not in wanted:
                f.unlink(missing_ok=True)
    return jsonify({"ok": True, "tiles": len([k for k in wanted if (d / f"{k}.png").is_file()])})


# ---- egne genstande: billeder, der er skåret ud i klienten, og et bibliotek over dem ----

def assets_dir() -> Path:
    root = userdata()
    if not root.is_dir():
        raise Fejl(f"Datamappen {root} findes ikke eller er ikke mountet (se docs/todo-sebastian.md).", 503)
    d = root / "mapcreator" / "assets"
    try:
        d.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise Fejl(f"Kan ikke skrive i {d}: {e.strerror}", 503)
    return d


def _read_library() -> list[dict]:
    p = assets_dir() / "library.json"
    if not p.is_file():
        return []
    try:
        data = json.loads(p.read_text("utf-8"))
    except (OSError, ValueError):
        raise Fejl("Biblioteket over egne genstande kan ikke læses (library.json er ødelagt).", 500)
    items = data.get("items") if isinstance(data, dict) else None
    return [i for i in items if isinstance(i, dict)] if isinstance(items, list) else []


def _write_library(items: list[dict]) -> None:
    p = assets_dir() / "library.json"
    fd, tmp = tempfile.mkstemp(dir=p.parent, prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"version": 1, "items": items}, f, ensure_ascii=False, indent=1)
        os.replace(tmp, p)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def _number(v, lo: float, hi: float, what: str) -> float:
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not lo <= v <= hi:
        raise Fejl(f"{what} skal være et tal mellem {lo} og {hi}.")
    return round(float(v), 3)


def _clean_meta(meta, partial: bool) -> dict:
    """Skal-krav til en genstands data (navn, familie, mål i felter, skygge, tilfældig rotation, tags)."""
    if not isinstance(meta, dict):
        raise Fejl("Genstandens data skal være et JSON-objekt.")
    out: dict = {}
    if "name" in meta or not partial:
        name = meta.get("name")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 60:
            raise Fejl("Navnet skal være på 1 til 60 tegn.")
        out["name"] = name.strip()
    if "family" in meta or not partial:
        fam = meta.get("family")
        if not isinstance(fam, str) or not SLUG_RE.match(fam):
            raise Fejl("Ugyldig familie.")
        out["family"] = fam
    for key, label in (("w", "Bredden"), ("h", "Højden")):
        if key in meta or not partial:
            out[key] = _number(meta.get(key), 0.25, 40, label)
    for key in ("shadow", "randomRotation"):
        if key in meta or not partial:
            v = meta.get(key, False)
            if not isinstance(v, bool):
                raise Fejl(f"{key} skal være sand eller falsk.")
            out[key] = v
    if "tags" in meta or not partial:
        tags = meta.get("tags", [])
        if not isinstance(tags, list) or len(tags) > 30 or not all(isinstance(t, str) and SLUG_RE.match(t) for t in tags):
            raise Fejl("Ugyldige tags.")
        out["tags"] = sorted(set(tags))
    return out


def _prepare_image(raw: bytes) -> tuple[bytes, int, int]:
    """Dekoder og genkoder uploaden (fjerner metadata og alt, der ikke er pixels), beskærer tomt og begrænser størrelsen."""
    try:
        im = Image.open(io.BytesIO(raw))
        if im.format not in ("PNG", "WEBP", "JPEG"):
            raise Fejl("Kun PNG, WebP og JPEG kan bruges.")
        if im.width * im.height > MAX_SOURCE_PIXELS:
            raise Fejl("Billedet er for stort (højst ca. 36 megapixel).")
        im.load()
    except Fejl:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise Fejl("Filen er ikke et gyldigt billede.")
    im = im.convert("RGBA")
    box = im.getchannel("A").point(lambda a: 255 if a >= 8 else 0).getbbox()
    if box is None:
        raise Fejl("Billedet er helt gennemsigtigt.")
    im = im.crop(box)
    if max(im.size) > MAX_ASSET_SIDE:
        k = MAX_ASSET_SIDE / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=92, method=4)
    return buf.getvalue(), im.width, im.height


@bp.get("/api/mapcreator/assets")
def list_assets():
    return jsonify(_read_library())


@bp.post("/api/mapcreator/assets")
def add_asset():
    if (request.content_length or 0) > MAX_UPLOAD_BYTES:
        raise Fejl("Billedet er for stort (højst 12 MB).", 413)
    f = request.files.get("file")
    if f is None:
        raise Fejl("Der mangler en billedfil.")
    try:
        meta = _clean_meta(json.loads(request.form.get("meta", "")), partial=False)
    except ValueError:
        raise Fejl("Genstandens data mangler eller er ikke JSON.")
    data, pw, ph = _prepare_image(f.read(MAX_UPLOAD_BYTES + 1))
    with LOCK:
        d = assets_dir()
        items = _read_library()
        if len(items) >= MAX_ASSETS:
            raise Fejl("Biblioteket er fuldt.", 409)
        used = {i.get("id") for i in items}
        asset_id = secrets.token_hex(6)
        while asset_id in used:
            asset_id = secrets.token_hex(6)
        (d / f"{asset_id}.webp").write_bytes(data)
        item = {"id": asset_id, **meta, "pxW": pw, "pxH": ph, "created": _iso(datetime.now(timezone.utc).timestamp())}
        items.append(item)
        try:
            _write_library(items)
        except BaseException:
            (d / f"{asset_id}.webp").unlink(missing_ok=True)
            raise
    return jsonify(item), 201


def _asset_id(asset_id: str) -> str:
    if not ASSET_ID_RE.match(asset_id):
        raise Fejl("Ugyldigt id.")
    return asset_id


@bp.patch("/api/mapcreator/assets/<asset_id>")
def patch_asset(asset_id: str):
    _asset_id(asset_id)
    changes = _clean_meta(request.get_json(silent=True), partial=True)
    with LOCK:
        items = _read_library()
        for item in items:
            if item.get("id") == asset_id:
                item.update(changes)
                _write_library(items)
                return jsonify(item)
    raise Fejl("Genstanden findes ikke.", 404)


@bp.delete("/api/mapcreator/assets/<asset_id>")
def delete_asset(asset_id: str):
    _asset_id(asset_id)
    with LOCK:
        items = _read_library()
        rest = [i for i in items if i.get("id") != asset_id]
        if len(rest) == len(items):
            raise Fejl("Genstanden findes ikke.", 404)
        _write_library(rest)
        (assets_dir() / f"{asset_id}.webp").unlink(missing_ok=True)
    return jsonify({"ok": True})


@bp.get("/api/mapcreator/assets/<asset_id>.webp")
def get_asset_image(asset_id: str):
    p = assets_dir() / f"{_asset_id(asset_id)}.webp"
    if not p.is_file():
        raise Fejl("Billedet findes ikke.", 404)
    resp = make_response(send_file(p, mimetype="image/webp"))
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"  # et billede ændres aldrig; id'et er nyt ved nyt billede
    return resp
