from __future__ import annotations

import html
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

app = Flask(__name__)


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


def inject_color(source_html: str, color: str) -> str:
    if not isinstance(color, str) or not color.startswith("#") or len(color) not in (4, 7):
        raise ValueError("Ugyldig farve.")
    safe = html.escape(color, quote=True)
    override = (
        "<style id=\"webui-color\">"
        f":root{{--accent:{safe}!important;--accent-color:{safe}!important;}}"
        f".s1,.sx,.card{{--accent:{safe}!important;--acc:{safe}!important;}}"
        "</style>"
    )
    return source_html.replace("</head>", override + "</head>", 1)


def generate(character: str, kind: str, color: str) -> str:
    source = data_path(character, kind)
    target = output_dir(character)

    command = [
        sys.executable, str(DND), kind, str(source),
        "--stil", "farve", "--ud", str(target),
    ]
    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            (result.stderr or result.stdout or "Generatoren fejlede.").strip()
        )

    expected = target / (
        "karakterark-farve.html" if kind == "karakterark" else "kort-farve.html"
    )
    if not expected.is_file():
        raise RuntimeError(
            "Generatoren afsluttede uden at lave den forventede HTML-fil."
        )

    content = expected.read_text(encoding="utf-8")
    expected.write_text(inject_color(content, color), encoding="utf-8")
    return f"/output/{character}/{expected.name}"


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


@app.post("/api/generate")
def api_generate():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify({
            "url": generate(
                payload.get("character", ""),
                payload.get("kind", ""),
                payload.get("color", "#6e2a12"),
            )
        })
    except (ValueError, RuntimeError) as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/output/<character>/<filename>")
def output_file(character: str, filename: str):
    if character not in character_dirs():
        return jsonify({"error": "Ukendt karakter."}), 404
    directory = output_dir(character)
    return send_from_directory(directory, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), debug=False)
