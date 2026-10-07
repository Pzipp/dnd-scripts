"""Hvilke 5etools-kilder (sourcebooks) karakterbyggeren må slå op i.

Standard er kun XPHB (Player's Handbook 2024) - gruppens eget regelsæt.
Gemmes delt for hele byggeren (ikke pr. karakter) i settings.yaml.
"""
from __future__ import annotations

from pathlib import Path

import yaml

SETTINGS_FILE = Path(__file__).resolve().parent / "settings.yaml"
DEFAULT_SOURCES = ["XPHB"]


def allowed_sources() -> set[str]:
    if not SETTINGS_FILE.is_file():
        return set(DEFAULT_SOURCES)
    data = yaml.safe_load(SETTINGS_FILE.read_text(encoding="utf-8")) or {}
    sources = data.get("allowed_sources")
    return set(sources) if sources else set(DEFAULT_SOURCES)


def set_allowed_sources(sources: list[str]) -> None:
    SETTINGS_FILE.write_text(
        yaml.safe_dump({"allowed_sources": sorted(sources)}, allow_unicode=True),
        encoding="utf-8",
    )
