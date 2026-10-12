from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, render_template, send_from_directory

ROOT = Path(__file__).resolve().parent.parent
WEBUI = Path(__file__).resolve().parent

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # store kort til /simpelvtt

from builder.routes import bp as builder_bp  # noqa: E402

app.register_blueprint(builder_bp)

from simpelvtt import bp as simpelvtt_bp  # noqa: E402

app.register_blueprint(simpelvtt_bp)


@app.get("/")
def index():
    return render_template("menu.html")


@app.get("/5etools/", defaults={"path": "index.html"})
@app.get("/5etools/<path:path>")
def e5tools_site(path: str):
    """5etools' egen hjemmeside (statiske filer fra /e5tools), så man kan se officielt indhold og homebrew
    (/e5tools/homebrew = vol/homebrew) i 5etools selv. Ingen login: kun til lokal brug, se webui/README.md."""
    from builder import e5tools
    root = e5tools.E5TOOLS_DATA.parent
    if not root.is_dir():
        return jsonify({"error": "5etools er ikke mountet."}), 404
    parts = Path(path).parts
    if any(part.startswith(".") for part in parts) or parts[:2] == ("homebrew", "kilder"):  # .git m.fl. og arkiverede kilder
        return jsonify({"error": "Ikke fundet."}), 404
    return send_from_directory(root, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), debug=False)
