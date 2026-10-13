"""Simpelt VTT (/simpelvtt): kampagner > rooms > kort, DM-skærm og spillerskærm (/simpelvtt/vis).

Runtime-data ligger under vol/simpelvtt/ (gitignoreret). Ingen login: kun til internt brug.
"""
from __future__ import annotations

import io
import json
import os
import re
import shutil
import threading
import time
from pathlib import Path

from flask import Blueprint, jsonify, render_template, request, send_file

try:  # miniaturer er valgfri; uden Pillow bruges originalen
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

bp = Blueprint("simpelvtt", __name__)

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = Path(os.environ.get("SIMPELVTT_DATA", ROOT / "vol" / "simpelvtt"))
CAMPAIGNS = DATA / "campaigns"
VIEWS_FILE = DATA / "views.json"
STATE_FILE = DATA / "state.json"
THUMBS = DATA / ".thumbs"
# General Maps: tilgængelig i alle kampagner. To kilder slået sammen: leveret med repoet (read-only) og brugerens egne.
GM_NAME = "General Maps"
GM_SHIPPED = Path(__file__).resolve().parent / "general_maps"
GM_USER = DATA / "general-maps"
EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAGIC = {".png": (b"\x89PNG",), ".jpg": (b"\xff\xd8",), ".jpeg": (b"\xff\xd8",), ".webp": (b"RIFF",), ".gif": (b"GIF8",)}
BAD_NAME = re.compile(r'[\x00-\x1f/\\:*?"<>|]')
LOCK = threading.RLock()


class Fejl(Exception):
    def __init__(self, msg: str, code: int = 400):
        super().__init__(msg)
        self.msg, self.code = msg, code


@bp.errorhandler(Fejl)
def _fejl(e: Fejl):
    return jsonify({"error": e.msg}), e.code


# ---------- navne og stier ----------

def clean_name(name) -> str:
    """Mappenavn: ingen skråstreger/kontroltegn, ikke tomt, ikke '.'-prefix, max 80 tegn."""
    name = BAD_NAME.sub("", str(name or "")).strip()
    if not name or name.startswith(".") or len(name) > 80 or Path(name).suffix.lower() in EXT:
        raise Fejl("Ugyldigt navn (ingen / \\ : * ? \" < > |, ikke tomt, ikke startende med punktum).")
    return name


def clean_filename(name: str) -> str:
    name = BAD_NAME.sub("_", Path(str(name or "")).name).strip().lstrip(".")
    if not name or Path(name).suffix.lower() not in EXT:
        raise Fejl("Kun png, jpg, webp og gif er tilladt.", 415)
    return name[:150]


def _inside(p: Path) -> Path:
    p = p.resolve()
    if not any(r.resolve() in p.parents for r in (CAMPAIGNS, GM_USER, GM_SHIPPED)):
        raise Fejl("Ugyldig sti.", 400)
    return p


def is_gm(camp) -> bool:
    return str(camp or "").strip().lower() == GM_NAME.lower()


def is_locked(p: Path) -> bool:
    return GM_SHIPPED.resolve() in p.resolve().parents


def campaign_dir(camp: str) -> Path:
    name = clean_name(camp)
    if is_gm(name):
        raise Fejl(f"'{GM_NAME}' er reserveret og kan ikke oprettes, omdøbes eller slettes som kampagne.", 403)
    return _inside(CAMPAIGNS / name)


def folder(camp: str, room: str | None = None, must_exist=True, create=False) -> Path:
    """Mappe til skrivning/læsning. For General Maps peger den altid på brugerens egen mappe (vol/)."""
    if is_gm(camp):
        base = GM_USER
        if create:
            base.mkdir(parents=True, exist_ok=True)
        p = base.resolve()
    else:
        p = campaign_dir(camp)
    if room:
        p = _inside(p / clean_name(room))
        if create and not p.exists() and is_gm(camp):
            p.mkdir(parents=True, exist_ok=True)
    if must_exist and not p.is_dir():
        raise Fejl("Mappen findes ikke.", 404)
    return p


def gm_room_shipped(room: str) -> bool:
    return (GM_SHIPPED / clean_name(room)).is_dir()


def image_path(ref: str) -> Path:
    """'kampagne/room/fil' eller 'kampagne/fil' -> fil på disken (kun hvis den findes)."""
    parts = str(ref or "").split("/")
    if len(parts) not in (2, 3) or any(not x or x.startswith(".") for x in parts):
        raise Fejl("Ugyldigt billede.", 400)
    clean = [clean_name(x) if i < len(parts) - 1 else clean_filename(x) for i, x in enumerate(parts)]
    if is_gm(clean[0]):
        if clean[0] != GM_NAME:
            raise Fejl("Ugyldigt billede.", 400)
        for root in (GM_SHIPPED, GM_USER):  # leveret fil vinder ved samme navn
            p = _inside(root.joinpath(*clean[1:]))
            if p.is_file():
                return p
        raise Fejl("Billedet findes ikke.", 404)
    p = _inside(CAMPAIGNS.joinpath(*clean))
    if not p.is_file():
        raise Fejl("Billedet findes ikke.", 404)
    return p


def image_path_rw(ref: str) -> Path:
    p = image_path(ref)
    if is_locked(p):
        raise Fejl("Billedet er leveret med appen og er låst.", 403)
    return p


def ref_of(p: Path) -> str:
    p = p.resolve()
    for root in (GM_SHIPPED, GM_USER):
        if root.resolve() in p.parents:
            return GM_NAME + "/" + p.relative_to(root.resolve()).as_posix()
    return p.relative_to(CAMPAIGNS.resolve()).as_posix()


def unique(dirp: Path, filename: str) -> Path:
    p = dirp / filename
    n = 2
    while p.exists():
        p = dirp / f"{Path(filename).stem} ({n}){Path(filename).suffix}"
        n += 1
    return p


# ---------- JSON-lager ----------

def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path)


def num(v, lo, hi, default):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return default
    return default if v != v else max(lo, min(hi, v))


# Grid: cellestørrelse og offset er i tusindedele af viewportens korteste side (vmin/10), uafhængigt af billedet.
GRID_SIZE = 60
GRID_COLOR = "#1D2026"


def default_view() -> dict:
    return {"img": {"zoom": 1, "x": 0, "y": 0, "rot": 0},
            "grid": {"on": False, "size": GRID_SIZE, "color": GRID_COLOR, "alpha": 0.4, "ox": 0, "oy": 0, "zoom": 1, "x": 0, "y": 0, "v": 2},
            "night": False}


def clean_view(v) -> dict:
    d, v = default_view(), (v if isinstance(v, dict) else {})
    i, g = v.get("img") or {}, v.get("grid") or {}
    d["img"] = {"zoom": num(i.get("zoom"), 0.05, 40, 1), "x": num(i.get("x"), -50, 50, 0), "y": num(i.get("y"), -50, 50, 0),
                "rot": int(round(num(i.get("rot"), -1e6, 1e6, 0) / 90)) * 90 % 360}
    color = g.get("color")
    old = g.get("v") != 2  # ældre gemt grid var i billedpixel: størrelse/offset/standardfarve falder tilbage til standard
    ok = isinstance(color, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", color)
    d["grid"] = {"on": bool(g.get("on")), "size": GRID_SIZE if old else num(g.get("size"), 4, 1000, GRID_SIZE),
                 "color": color if ok and not (old and color.lower() == "#ffffff") else GRID_COLOR,
                 "alpha": num(g.get("alpha"), 0, 1, 0.4), "ox": 0 if old else num(g.get("ox"), -1000, 1000, 0), "oy": 0 if old else num(g.get("oy"), -1000, 1000, 0),
                 "zoom": num(g.get("zoom"), 0.05, 40, 1), "x": num(g.get("x"), -50, 50, 0), "y": num(g.get("y"), -50, 50, 0), "v": 2}
    d["night"] = bool(v.get("night"))
    return d


def get_state() -> dict:
    s = read_json(STATE_FILE, {})
    return {"rev": int(s.get("rev", 0)), "image": s.get("image") or None}


def bump(image="__keep__") -> dict:
    s = get_state()
    s["rev"] += 1
    if image != "__keep__":
        s["image"] = image
    write_json(STATE_FILE, s)
    return s


def remap_refs(old_prefix: str, new_prefix: str | None) -> None:
    """Flyt (eller slet, hvis new_prefix er None) gemte visninger og aktivt kort ved omdøbning/flytning."""
    def mapped(ref):
        if ref == old_prefix or ref.startswith(old_prefix + "/"):
            return None if new_prefix is None else new_prefix + ref[len(old_prefix):]
        return ref
    views = read_json(VIEWS_FILE, {})
    new = {}
    for k, v in views.items():
        m = mapped(k)
        if m:
            new[m] = v
    if new != views:
        write_json(VIEWS_FILE, new)
    s = get_state()
    if s["image"] and mapped(s["image"]) != s["image"]:
        bump(mapped(s["image"]))


# ---------- sider ----------

@bp.get("/simpelvtt")
@bp.get("/simpelvtt/")
def dm_page():
    return render_template("simpelvtt.html")


@bp.get("/simpelvtt/vis")
def viewer_page():
    return render_template("simpelvtt_vis.html")


# ---------- træ ----------

def list_images(d: Path) -> list[str]:
    if not d.is_dir():
        return []
    return sorted((f.name for f in d.iterdir() if f.is_file() and f.suffix.lower() in EXT), key=str.lower)


def _subdirs(d: Path) -> set[str]:
    return {x.name for x in d.iterdir() if x.is_dir() and not x.name.startswith(".")} if d.is_dir() else set()


def general_tree() -> dict:
    """General Maps: leveret mappe (låst) og brugerens mappe slået sammen. Samme room-navn = én room."""
    def merged(shipped: Path, user: Path) -> dict:
        s_img = list_images(shipped)
        u_img = [f for f in list_images(user) if f not in s_img]
        return {"images": sorted(s_img + u_img, key=str.lower), "locked": s_img}
    out = merged(GM_SHIPPED, GM_USER)
    out["name"] = GM_NAME
    out["rooms"] = [dict(name=r, shipped=(GM_SHIPPED / r).is_dir(), **merged(GM_SHIPPED / r, GM_USER / r))
                    for r in sorted(_subdirs(GM_SHIPPED) | _subdirs(GM_USER), key=str.lower)]
    return out


@bp.get("/api/simpelvtt/tree")
def tree():
    CAMPAIGNS.mkdir(parents=True, exist_ok=True)
    out = []
    for c in sorted((x for x in CAMPAIGNS.iterdir() if x.is_dir() and not x.name.startswith(".") and not is_gm(x.name)), key=lambda p: p.name.lower()):
        rooms = [{"name": r.name, "images": list_images(r)}
                 for r in sorted((x for x in c.iterdir() if x.is_dir() and not x.name.startswith(".")), key=lambda p: p.name.lower())]
        out.append({"name": c.name, "images": list_images(c), "rooms": rooms})
    return jsonify({"campaigns": out, "general": general_tree()})


@bp.post("/api/simpelvtt/campaign")
def campaign_new():
    name = clean_name((request.get_json(silent=True) or {}).get("name"))
    p = campaign_dir(name)
    if p.exists():
        raise Fejl("Findes allerede.", 409)
    p.mkdir(parents=True)
    return jsonify({"ok": True, "name": name})


@bp.post("/api/simpelvtt/room")
def room_new():
    d = request.get_json(silent=True) or {}
    base = folder(d.get("campaign"), create=True)
    p = _inside(base / clean_name(d.get("name")))
    if p.exists() or (is_gm(d.get("campaign")) and gm_room_shipped(d.get("name"))):
        raise Fejl("Findes allerede.", 409)
    p.mkdir()
    return jsonify({"ok": True})


def _rename(src: Path, dst: Path, old_ref: str, new_ref: str):
    with LOCK:
        if dst.exists():
            raise Fejl("Navnet er i brug.", 409)
        src.rename(dst)
        remap_refs(old_ref, new_ref)
    return jsonify({"ok": True})


@bp.patch("/api/simpelvtt/campaign")
def campaign_rename():
    d = request.get_json(silent=True) or {}
    src, new = folder(campaign_dir(d.get("name")).name), clean_name(d.get("to"))
    return _rename(src, campaign_dir(new), src.name, new)


@bp.patch("/api/simpelvtt/room")
def room_rename():
    d = request.get_json(silent=True) or {}
    gm = is_gm(d.get("campaign"))
    if gm and gm_room_shipped(d.get("name")):
        raise Fejl("Rummet er leveret med appen og er låst.", 403)
    src, new = folder(d.get("campaign"), d.get("name")), clean_name(d.get("to"))
    if gm and gm_room_shipped(new):
        raise Fejl("Navnet er i brug.", 409)
    cname = GM_NAME if gm else src.parent.name
    return _rename(src, _inside(src.parent / new), f"{cname}/{src.name}", f"{cname}/{new}")


@bp.delete("/api/simpelvtt/campaign")
def campaign_delete():
    d = request.get_json(silent=True) or {}
    with LOCK:
        p = folder(campaign_dir(d.get("name")).name)
        shutil.rmtree(p)
        remap_refs(p.name, None)
    return jsonify({"ok": True})


@bp.delete("/api/simpelvtt/room")
def room_delete():
    d = request.get_json(silent=True) or {}
    gm = is_gm(d.get("campaign"))
    if gm and gm_room_shipped(d.get("name")):
        raise Fejl("Rummet er leveret med appen og er låst.", 403)
    with LOCK:
        p = folder(d.get("campaign"), d.get("name"))
        shutil.rmtree(p)
        remap_refs(f"{GM_NAME if gm else p.parent.name}/{p.name}", None)
    return jsonify({"ok": True})


# ---------- billeder ----------

@bp.post("/api/simpelvtt/upload")
def upload():
    dest = folder(request.form.get("campaign"), request.form.get("room") or None, create=True)
    saved, errors = [], []
    for f in request.files.getlist("files"):
        try:
            name = clean_filename(f.filename)
            head = f.stream.read(16)
            f.stream.seek(0)
            if not any(head.startswith(m) for m in MAGIC[Path(name).suffix.lower()]):
                raise Fejl("Filindholdet passer ikke til filtypen.", 415)
            target = unique(dest, name)
            f.save(target)
            saved.append(ref_of(target))
        except Fejl as e:
            errors.append(f"{f.filename}: {e.msg}")
    return jsonify({"saved": saved, "errors": errors}), (200 if saved or not errors else 400)


@bp.post("/api/simpelvtt/move")
def move():
    d = request.get_json(silent=True) or {}
    with LOCK:
        src = image_path_rw(d.get("image"))
        dest = folder(d.get("campaign"), d.get("room") or None, create=True)
        if src.parent == dest:
            return jsonify({"ok": True, "image": ref_of(src)})
        target = unique(dest, src.name)
        old = ref_of(src)
        shutil.move(str(src), str(target))
        remap_refs(old, ref_of(target))
    return jsonify({"ok": True, "image": ref_of(target)})


@bp.patch("/api/simpelvtt/image")
def image_rename():
    """Omdøb billedets filnavn (endelsen bevares). Visning, aktivt kort og miniaturer følger med."""
    d = request.get_json(silent=True) or {}
    with LOCK:
        src = image_path_rw(d.get("image"))
        stem = BAD_NAME.sub("", str(d.get("to") or "")).strip()
        if Path(stem).suffix.lower() in EXT:
            stem = stem[:-len(Path(stem).suffix)]
        stem = stem.strip().lstrip(".")
        if not stem:
            raise Fejl("Ugyldigt navn.")
        new_name = clean_filename(stem[:140] + src.suffix)
        if new_name == src.name:
            return jsonify({"ok": True, "image": ref_of(src)})
        target = unique(src.parent, new_name)
        old = ref_of(src)
        src.rename(target)
        new = ref_of(target)
        prefix = re.sub(r"[^\w.-]", "_", old) + "_"
        for t in THUMBS.glob("*.jpg") if THUMBS.is_dir() else []:
            if t.name.startswith(prefix):
                t.unlink(missing_ok=True)
        remap_refs(old, new)
    return jsonify({"ok": True, "image": new})


@bp.delete("/api/simpelvtt/image")
def image_delete():
    d = request.get_json(silent=True) or {}
    with LOCK:
        p = image_path_rw(d.get("image"))
        ref = ref_of(p)
        p.unlink()
        remap_refs(ref, None)
    return jsonify({"ok": True})


@bp.get("/simpelvtt/img/<path:ref>")
def image_get(ref):
    p = image_path(ref)
    r = send_file(p, max_age=0, conditional=True)
    r.headers["Cache-Control"] = "no-cache"
    return r


@bp.get("/simpelvtt/thumb/<path:ref>")
def thumb_get(ref):
    p = image_path(ref)
    if Image is None:
        return send_file(p, conditional=True)
    st = p.stat()
    t = THUMBS / (re.sub(r"[^\w.-]", "_", ref) + f"_{int(st.st_mtime)}_{st.st_size}.jpg")
    if not t.exists():
        try:
            THUMBS.mkdir(parents=True, exist_ok=True)
            Image.MAX_IMAGE_PIXELS = None
            with Image.open(p) as im:
                im.draft("RGB", (600, 600))
                im = im.convert("RGB")
                im.thumbnail((320, 320))
                buf = io.BytesIO()
                im.save(buf, "JPEG", quality=78)
            t.write_bytes(buf.getvalue())
        except Exception:
            return send_file(p, conditional=True)
    return send_file(t, max_age=3600, conditional=True)


# ---------- visning og synk ----------

def view_of(ref):
    return clean_view(read_json(VIEWS_FILE, {}).get(ref)) if ref else default_view()


@bp.get("/api/simpelvtt/state")
def state_get():
    s = get_state()
    if request.args.get("rev", type=int) == s["rev"]:
        return jsonify({"rev": s["rev"], "unchanged": True})
    img = s["image"]
    try:
        image_path(img) if img else None
    except Fejl:
        img = None
    return jsonify({"rev": s["rev"], "image": img, "view": view_of(img)})


@bp.put("/api/simpelvtt/state")
def state_put():
    """DM vælger kort (image=null: tom skærm). Viser kortets gemte visning."""
    img = (request.get_json(silent=True) or {}).get("image")
    with LOCK:
        if img:
            img = ref_of(image_path(img))
        s = bump(img or None)
    return jsonify({"rev": s["rev"], "image": s["image"], "view": view_of(s["image"])})


@bp.get("/api/simpelvtt/view")
def view_get():
    return jsonify(view_of(ref_of(image_path(request.args.get("image")))))


@bp.put("/api/simpelvtt/view")
def view_put():
    d = request.get_json(silent=True) or {}
    with LOCK:
        ref = ref_of(image_path(d.get("image")))
        views = read_json(VIEWS_FILE, {})
        views[ref] = clean_view(d.get("view"))
        write_json(VIEWS_FILE, views)
        s = get_state()
        if s["image"] == ref:
            s = bump()
    return jsonify({"rev": s["rev"], "view": views[ref]})
