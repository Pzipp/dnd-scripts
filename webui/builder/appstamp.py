"""Adgang til scripts/appinfo.py (version og bygning), uanset om byggeren køres i webui'en eller fra dnd.py."""
import sys
from pathlib import Path

_SCRIPTS = str(Path(__file__).resolve().parents[2] / "scripts")
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)

import appinfo  # noqa: E402
import yaml  # noqa: E402


def previous_app(path: Path) -> dict | None:
    """`app`-mærket i en eksisterende YAML-fil (til at bevare `created`), ellers None."""
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return None
    app = data.get("app") if isinstance(data, dict) else None
    return app if isinstance(app, dict) else None


def stamped(path: Path, data: dict) -> dict:
    """`data` med `app`-mærket sat øverst (created fra filen på disken, saved = nu)."""
    out = {k: v for k, v in data.items() if k != "app"}
    return {"app": appinfo.stamp(previous_app(path)), **out}
