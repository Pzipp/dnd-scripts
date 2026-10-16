"""sheets.yaml: engelsk-nøglet sideopsætning (layout) for en choices.yaml-
karakter - samme rolle som den gamle karakter.yamls "sider:" (se
docs/sheets-yaml.md). Indholdet redigeres frit af spilleren og overskrives
ALDRIG automatisk (i modsat fald til character.yaml, se character_yaml.py) -
kun den første fil, hvis ingen findes endnu, kommer fra standardlayoutet (default_layout.py).
"""
from __future__ import annotations

from pathlib import Path

import yaml

TEMPLATE_PATH = Path(__file__).resolve().parent.parent.parent / "karakterer" / "_skabelon" / "sheets.yaml"


def sheets_path(character_dir: Path) -> Path:
    return character_dir / "sheets.yaml"


def _template() -> dict:
    return yaml.safe_load(TEMPLATE_PATH.read_text(encoding="utf-8")) or {"pages": []}


def default_for(character_dir: Path) -> dict:
    """Standardlayoutet ud fra karakterens character.yaml (default_layout.py). Uden character.yaml: den neutrale skabelon."""
    from . import character_yaml, default_layout
    if not character_yaml.character_path(character_dir).is_file():
        return _template()
    return default_layout.build(character_yaml.load(character_dir))


def default_text(character_dir: Path) -> str:
    """Samme som default_for(), som sheets.yaml-tekst (med forklarende kommentar)."""
    from . import character_yaml, default_layout
    if not character_yaml.character_path(character_dir).is_file():
        return TEMPLATE_PATH.read_text(encoding="utf-8")
    return default_layout.to_yaml(character_yaml.load(character_dir))


def load(character_dir: Path) -> dict:
    """Karakterens sheets.yaml, eller standardlayoutet ud fra character.yaml, hvis filen ikke findes (der skrives intet)."""
    path = sheets_path(character_dir)
    if not path.is_file():
        return default_for(character_dir)
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {"pages": []}


def save(character_dir: Path, data: dict) -> None:
    sheets_path(character_dir).write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )


def current_text(character_dir: Path) -> str:
    """sheets.yaml som tekst, eller standardlayoutet, hvis filen ikke findes (der skrives intet)."""
    path = sheets_path(character_dir)
    return path.read_text(encoding="utf-8") if path.is_file() else default_text(character_dir)


def ensure_exists(character_dir: Path) -> None:
    """Skriv standardlayoutet ind som sheets.yaml, hvis karakteren ikke har en endnu (kaldes, når layoutet redigeres)."""
    if not sheets_path(character_dir).is_file():
        sheets_path(character_dir).write_text(default_text(character_dir), encoding="utf-8")
