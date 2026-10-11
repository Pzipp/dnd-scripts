from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import quote

import yaml
from flask import Blueprint, jsonify, redirect, render_template, request, send_file, send_from_directory

from . import baggrund, character_yaml, descriptions, e5tools, kort, layout_edit, llm_client, model, render, settings
from . import sheets as sheets_module

bp = Blueprint("builder", __name__)

ROOT = Path(__file__).resolve().parent.parent.parent
CHARACTERS = ROOT / "karakterer"
NAME_OK = re.compile(r"^[a-z0-9-]+$")

# Samme PDF-generator som det gamle system (scripts/pdf/), genbrugt uændret.
sys.path.insert(0, str(ROOT / "scripts" / "pdf"))
import lav_pdf  # noqa: E402
import faelles  # noqa: E402

PDF_STYLES = {"farve", *render.STYLE_FILES}
# Kort: grundstilene plus tema-overlays (se scripts/kort/spellkort.py); tema -> grundstil.
CARD_STYLES = {"farve": "farve", "sorthvid": "sorthvid", **{t: g for t, (g, _) in kort.spellkort.TEMAER.items()}}
CARD_THEME_LABELS = {
    "farve": "Farve (standard)", "skovland": "Skovland", "stormblaa": "Stormblå", "vinroed": "Vinrød",
    "sorthvid": "Sort/hvid (standard)", "gravure": "Gravure", "herbarium": "Herbarium",
}


@bp.app_context_processor
def _card_theme_options():
    return {"card_themes": [(k, CARD_THEME_LABELS.get(k, k)) for k in CARD_STYLES]}


def _med_baggrund(html: str, name: str | None, kind: str, pdf: bool = False) -> str:
    """Læg den valgte baggrund (fra webui/static/baggrunde/) på HTML'en. Til PDF læses filen direkte (file://),
    til forhåndsvisning hentes den fra /builder/background/. ValueError, hvis navnet ikke findes."""
    url = None if pdf else f"/builder/background/{quote(name or '', safe='')}"
    return baggrund.inject(html, baggrund.css(name, kind, url))


@bp.get("/api/builder/backgrounds")
def api_backgrounds():
    return jsonify({"files": baggrund.files()})


@bp.get("/builder/background/<name>")
def builder_background(name: str):
    try:
        path = baggrund.resolve(name)
    except ValueError:
        return jsonify({"error": "Ukendt baggrund."}), 404
    if path is None:
        return jsonify({"error": "Ukendt baggrund."}), 404
    resp = send_from_directory(baggrund.DIR, path.name, mimetype=baggrund.mimetype(path.name))
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Cache-Control"] = "no-cache"
    return resp


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


def _sheet_only(character_dir: Path) -> bool:
    """Karakter med character.yaml men uden choices.yaml: filen er skrevet i hånden eller af en LLM (se docs/character-yaml.md).
    Den er den primære fil, så alt, der gemmer choices.yaml (og dermed overskriver character.yaml), er spærret."""
    return character_yaml.character_path(character_dir).is_file() and not model.choices_path(character_dir).is_file()


def _sheet_only_characters() -> list[str]:
    if not CHARACTERS.is_dir():
        return []
    return sorted(
        p.name for p in CHARACTERS.iterdir()
        if p.is_dir() and not p.name.startswith(("_", ".")) and NAME_OK.match(p.name) and _sheet_only(p)
    )


def _reject_sheet_only(character_dir: Path):
    """None, eller et (svar, status), hvis karakteren kun har character.yaml (byggeren må ikke gemme valg for den)."""
    if _sheet_only(character_dir):
        return jsonify({"error": "Karakteren har kun character.yaml (ingen choices.yaml). Byggerens valg kan ikke gemmes uden at overskrive den; ret filen direkte."}), 409
    return None


@bp.get("/builder")
def builder_index():
    return render_template("builder_index.html", characters=_builder_characters(), sheet_only=_sheet_only_characters())


@bp.post("/api/builder/create")
def api_create():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip().lower()
    try:
        character_dir = _character_dir(name)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    rejected = _reject_sheet_only(character_dir)
    if rejected:
        return rejected
    character_dir.mkdir(parents=True, exist_ok=True)
    path = model.choices_path(character_dir)
    if not path.is_file():
        _save_choices(character_dir, model.empty_character())
    return jsonify({"name": name})


def _is_sheet_only_name(name: str) -> bool:
    try:
        return _sheet_only(_character_dir(name))
    except ValueError:
        return False


@bp.get("/builder/<name>")
def builder_character(name: str):
    if _is_sheet_only_name(name):  # Karakter- og Udstyr-fanen kræver choices.yaml
        return redirect(f"/builder/{name}/print")
    return render_template("builder.html", name=name, page="character", sheet_only=False)


@bp.get("/builder/<name>/equipment")
def builder_equipment(name: str):
    if _is_sheet_only_name(name):
        return redirect(f"/builder/{name}/print")
    return render_template("builder.html", name=name, page="equipment", sheet_only=False)


@bp.get("/builder/<name>/print")
def builder_print(name: str):
    return render_template("builder.html", name=name, page="print", sheet_only=_is_sheet_only_name(name))


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
        html = render.build(character, sheets, stil, edit=request.args.get("edit") == "1")
        html = _med_baggrund(html, request.args.get("background"), "ark")
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
        html = _med_baggrund(html, payload.get("background"), "ark", pdf=True)
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


@bp.get("/builder/<name>/cards")
def builder_cards(name: str):
    return render_template("builder.html", name=name, page="cards", sheet_only=_is_sheet_only_name(name))


@bp.get("/builder/download/<name>/<filename>")
def builder_download(name: str, filename: str):
    try:
        character_dir = _character_dir(name)
    except ValueError:
        return jsonify({"error": "Ukendt karakter."}), 404
    if filename not in {f"karakterark-{s}.pdf" for s in PDF_STYLES} | {f"kort-{s}.pdf" for s in CARD_STYLES}:
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
    # Uden sheets.yaml vises standarden (skabelonen) uden at skrive filen; den oprettes først, når man gemmer eller flytter en boks.
    path = sheets_module.sheets_path(character_dir)
    return jsonify({"yaml": (path if path.is_file() else sheets_module.TEMPLATE_PATH).read_text(encoding="utf-8")})


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
        html = render.build(character, parsed, stil, edit=bool(payload.get("edit")))
        html = _med_baggrund(html, payload.get("background"), "ark")
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
    rejected = _reject_sheet_only(character_dir)
    if rejected:
        return rejected
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
    rejected = _reject_sheet_only(character_dir)
    if rejected:
        return rejected
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
    rejected = _reject_sheet_only(character_dir)
    if rejected:
        return rejected
    data = model.load(character_dir)
    model.remove_class(data, class_id)
    _save_choices(character_dir, data)
    return jsonify(model.state(data))


# ── Indstillinger: hvilke 5etools-kilder og husregler gælder for DENNE karakter ──
@bp.get("/builder/<name>/settings")
def builder_settings(name: str):
    if _is_sheet_only_name(name):  # indstillingerne gemmes i choices.yaml
        return redirect(f"/builder/{name}/print")
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
        "race_ability": char_settings.get("race_ability", settings.DEFAULT_RACE_ABILITY),
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
    rejected = _reject_sheet_only(character_dir)
    if rejected:
        return rejected
    data = model.load(character_dir)
    data["settings"] = {"allowed_sources": sorted(allowed), "race_ability": bool(payload.get("race_ability", False))}
    _save_choices(character_dir, data)
    return jsonify({"allowed": data["settings"]["allowed_sources"], "race_ability": data["settings"]["race_ability"]})


# ── Kort: spil-kort af 5etools-data (se kort.py) ──
def _card_style(style: str) -> tuple[str, str | None]:
    """Valgt stil -> (grundstil, tema). Tema er None for farve/sorthvid."""
    if style not in CARD_STYLES:
        raise ValueError("Ukendt stil.")
    return CARD_STYLES[style], (None if style in ("farve", "sorthvid") else style)


def _cards_context(name: str):
    character_dir = _character_dir(name)
    if not character_dir.is_dir():
        raise ValueError("Ukendt karakter.")
    if not character_yaml.character_path(character_dir).is_file():
        raise ValueError("Ingen character.yaml endnu - gem noget på Karakter-fanen først.")
    return character_dir, character_yaml.load(character_dir)


@bp.get("/api/builder/cards")
def api_cards():
    try:
        character_dir, character = _cards_context(request.args.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    deck = kort.load_deck(character_dir)
    cands = [{k: v for k, v in c.items() if k != "entry"} for c in kort.candidates(character)]
    return jsonify({"candidates": cands, "selected": deck["kort"], "title": deck["titel"]})


@bp.post("/api/builder/cards/select")
def api_cards_select():
    payload = request.get_json(silent=True) or {}
    try:
        character_dir, character = _cards_context(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    deck = kort.save_selection(character_dir, character, [str(i) for i in payload.get("ids", [])])
    return jsonify({"selected": deck["kort"]})


@bp.post("/api/builder/cards/regenerate")
def api_cards_regenerate():
    payload = request.get_json(silent=True) or {}
    try:
        character_dir, character = _cards_context(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    kort.regenerate(character_dir, character, str(payload.get("id", "")))
    return jsonify({"ok": True})


@bp.get("/api/builder/cards/preview")
def api_cards_preview():
    try:
        character_dir, _ = _cards_context(request.args.get("name", ""))
        grund, tema = _card_style(request.args.get("style", "farve"))
        html = kort.build_html(character_dir, grund, tema)
        html = _med_baggrund(html, request.args.get("background"), "kort")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except SystemExit as exc:  # faelles.fejl() fra kortgeneratoren
        return jsonify({"error": str(exc.code)}), 400
    return jsonify({"html": html})


@bp.post("/api/builder/cards/pdf")
def api_cards_pdf():
    payload = request.get_json(silent=True) or {}
    stil = payload.get("style", "farve")
    try:
        grund, tema = _card_style(stil)
        character_dir, _ = _cards_context(payload.get("name", ""))
        html = kort.build_html(character_dir, grund, tema)
        html = _med_baggrund(html, payload.get("background"), "kort", pdf=True)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    out = character_dir / "udskrifter"
    out.mkdir(exist_ok=True)
    html_path, pdf_path = out / f"kort-{stil}.html", out / f"kort-{stil}.pdf"
    html_path.write_text(html, encoding="utf-8")
    try:
        maal = lav_pdf.lav_pdf([(str(html_path), str(pdf_path))])
    except SystemExit as exc:
        return jsonify({"error": str(exc.code)}), 500
    return jsonify({"pdf": f"/builder/download/{payload.get('name', '')}/{pdf_path.name}",
                    "warnings": lav_pdf.tekst_uden_for(maal)})


@bp.get("/builder/kort-maal.js")
def kort_maal_js():
    """Målingen af tekst uden for kortets ramme; samme fil som lav_pdf.py bruger."""
    return send_file(lav_pdf.MAAL_JS, mimetype="text/javascript", max_age=0)


# ── Træk og slip af bokse i sheets.yaml (se layout_edit.py) ──
@bp.get("/api/builder/layout_types")
def api_layout_types():
    return jsonify({"types": layout_edit.box_types()})


@bp.post("/api/builder/layout")
def api_layout():
    payload = request.get_json(silent=True) or {}
    try:
        character_dir = _character_dir(payload.get("name", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not character_dir.is_dir():
        return jsonify({"error": "Ukendt karakter."}), 404
    try:
        layout_edit.apply(character_dir, payload)
    except layout_edit.LayoutError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"yaml": sheets_module.sheets_path(character_dir).read_text(encoding="utf-8")})
