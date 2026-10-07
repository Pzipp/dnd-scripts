from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import yaml
from flask import Flask, jsonify, render_template, request, send_from_directory

ROOT = Path(__file__).resolve().parent.parent
WEBUI = Path(__file__).resolve().parent
CHARACTERS = ROOT / "karakterer"
DND = ROOT / "dnd.py"

# Samme importsti som dnd.py, så forhåndsvisningen kan kalde generatorerne direkte.
for _mappe in ("scripts", "scripts/karakterark", "scripts/kort"):
    sys.path.insert(0, str(ROOT / _mappe))
import karakterark  # noqa: E402
import spellkort  # noqa: E402
import tjek  # noqa: E402

app = Flask(__name__)

from builder.routes import bp as builder_bp  # noqa: E402

app.register_blueprint(builder_bp)


def character_dirs():
    if not CHARACTERS.is_dir():
        return []
    return sorted(
        p.name
        for p in CHARACTERS.iterdir()
        if p.is_dir() and not p.name.startswith(("_", "."))
    )


def data_path(character: str, kind: str) -> Path:
    if character not in character_dirs():
        raise ValueError("Ukendt karakter.")
    if kind not in {"karakterark", "kort"}:
        raise ValueError("Ukendt side.")
    filename = "karakter.yaml" if kind == "karakterark" else "kort.yaml"
    path = CHARACTERS / character / filename
    if not path.is_file():
        raise ValueError(f"{character} har ingen {filename}.")
    return path


def output_dir(character: str) -> Path:
    data_path(character, "karakterark")
    path = CHARACTERS / character / "udskrifter"
    path.mkdir(exist_ok=True)
    return path


def load_yaml(character: str, kind: str) -> str:
    return data_path(character, kind).read_text(encoding="utf-8")


def save_yaml(character: str, kind: str, yaml_text: str) -> None:
    path = data_path(character, kind)
    try:
        parsed = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        raise ValueError(f"YAML-fejl: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("YAML skal indeholde et objekt/mappe øverst.")

    # Gem den redigerede YAML tilbage til den rigtige karakterfil.
    path.write_text(yaml_text.rstrip() + "\n", encoding="utf-8")


STILE = {"farve", "sorthvid"}


def check_stil(stil: str) -> str:
    if stil not in STILE:
        raise ValueError("Ukendt stil. Vælg farve eller sorthvid.")
    return stil


def preview(character: str, kind: str, stil: str, yaml_text: str) -> str:
    """HTML ud fra den YAML, der står i editoren, også når den ikke er gemt. Skriver ingen filer."""
    check_stil(stil)
    data_path(character, kind)  # karakteren og siden skal findes, ellers er forhåndsvisningen løs
    try:
        parsed = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        raise ValueError(f"YAML-fejl: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("YAML skal indeholde et objekt/mappe øverst.")
    try:
        if kind == "karakterark":
            return karakterark.build(parsed, stil)
        return spellkort.build(parsed, stil)
    except SystemExit as exc:  # faelles.fejl() afslutter med en forklarende tekst
        raise ValueError(str(exc.code).removeprefix("FEJL: ")) from exc
    except Exception as exc:  # fx et manglende felt i data
        raise ValueError(f"Fejl i data: {type(exc).__name__}: {exc}") from exc


def generate(character: str, kind: str, stil: str, pdf: bool = False) -> dict:
    check_stil(stil)  # før generatoren kører, så en ugyldig stil ikke giver en halv fil
    source = data_path(character, kind)
    target = output_dir(character)

    command = [
        sys.executable, str(DND), kind, str(source),
        "--stil", stil, "--ud", str(target),
    ]
    if pdf:
        command.append("--pdf")
    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=600,  # PDF med Chromium er langsom på gammel hardware
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            (result.stderr or result.stdout or "Generatoren fejlede.").strip()
        )

    expected = target / (
        f"{'karakterark' if kind == 'karakterark' else 'kort'}-{stil}.html"
    )
    if not expected.is_file():
        raise RuntimeError(
            "Generatoren afsluttede uden at lave den forventede HTML-fil."
        )

    result_files = {"url": f"/output/{character}/{expected.name}", "pdf": None}
    if pdf:
        pdf_file = expected.with_suffix(".pdf")
        if not pdf_file.is_file():
            raise RuntimeError("PDF blev ikke lavet. Se serverens log for detaljer.")
        result_files["pdf"] = f"/download/{character}/udskrifter/{pdf_file.name}"
    return result_files


@app.get("/")
def index():
    return render_template("index.html", characters=character_dirs())


@app.get("/api/yaml")
def api_yaml():
    try:
        return jsonify({
            "yaml": load_yaml(
                request.args.get("character", ""),
                request.args.get("kind", ""),
            )
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/save")
def api_save():
    payload = request.get_json(silent=True) or {}
    try:
        save_yaml(
            payload.get("character", ""),
            payload.get("kind", ""),
            payload.get("yaml", ""),
        )
        return jsonify({"saved": True})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/check")
def api_check():
    """Fejl til editoren (linje og kolonne). Bygger ikke arket og skriver ingen filer."""
    payload = request.get_json(silent=True) or {}
    kind = payload.get("kind", "")
    try:
        data_path(payload.get("character", ""), kind)
        return jsonify({"fejl": tjek.tjek(payload.get("yaml", ""), layout=kind == "karakterark")})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/preview")
def api_preview():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify({"html": preview(
            payload.get("character", ""),
            payload.get("kind", ""),
            payload.get("stil", "farve"),
            payload.get("yaml", ""),
        )})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/generate")
def api_generate():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(generate(
            payload.get("character", ""),
            payload.get("kind", ""),
            payload.get("stil", "farve"),
            pdf=bool(payload.get("pdf", False)),
        ))
    except (ValueError, RuntimeError) as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/output/<character>/<filename>")
def output_file(character: str, filename: str):
    if character not in character_dirs():
        return jsonify({"error": "Ukendt karakter."}), 404
    directory = output_dir(character)
    return send_from_directory(directory, filename)


DATA_FILES = ("karakter.yaml", "kort.yaml")


@app.get("/api/files")
def api_files():
    character = request.args.get("character", "")
    if character not in character_dirs():
        return jsonify({"error": "Ukendt karakter."}), 400
    base = CHARACTERS / character
    files = [
        {"name": name, "group": "Data", "url": f"/download/{character}/{name}"}
        for name in DATA_FILES if (base / name).is_file()
    ]
    out = base / "udskrifter"
    if out.is_dir():
        files += [
            {"name": p.name, "group": "Udskrift", "url": f"/download/{character}/udskrifter/{p.name}"}
            for p in sorted(out.iterdir()) if p.is_file()
        ]
    return jsonify({"files": files})


@app.get("/download/<character>/<path:filename>")
def download(character: str, filename: str):
    if character not in character_dirs():
        return jsonify({"error": "Ukendt karakter."}), 404
    base = CHARACTERS / character
    if filename in DATA_FILES:
        return send_from_directory(base, filename, as_attachment=True)
    if filename.startswith("udskrifter/"):
        return send_from_directory(base / "udskrifter", filename.split("/", 1)[1], as_attachment=True)
    return jsonify({"error": "Ukendt fil."}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), debug=False)
