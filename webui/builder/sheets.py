"""sheets.yaml: engelsk-nøglet sideopsætning (layout) for en choices.yaml-
karakter - samme rolle som den gamle karakter.yamls "sider:" (se
docs/sheets-yaml.md). Indholdet redigeres frit af spilleren og overskrives
ALDRIG automatisk (i modsat fald til character.yaml, se character_yaml.py) -
kun den første fil, hvis ingen findes endnu, kommer fra skabelonen.
"""
from __future__ import annotations

from pathlib import Path

import yaml

TEMPLATE_PATH = Path(__file__).resolve().parent.parent.parent / "karakterer" / "_skabelon" / "sheets.yaml"


def sheets_path(character_dir: Path) -> Path:
    return character_dir / "sheets.yaml"


def _template() -> dict:
    return yaml.safe_load(TEMPLATE_PATH.read_text(encoding="utf-8")) or {"pages": []}


def load(character_dir: Path) -> dict:
    path = sheets_path(character_dir)
    if not path.is_file():
        return _template()
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {"pages": []}


def save(character_dir: Path, data: dict) -> None:
    sheets_path(character_dir).write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )


def ensure_exists(character_dir: Path) -> None:
    """Kopiér skabelonen ind, hvis karakteren ikke har en sheets.yaml endnu."""
    if not sheets_path(character_dir).is_file():
        save(character_dir, _template())
