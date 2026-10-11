"""Baggrundsbilleder til karakterark og kort.

Billeder ligger i webui/static/baggrunde/ (følger repoet, se README dér). Mappen listes
dynamisk, og et valgt navn slås ALTID op i listen - aldrig sat direkte sammen til en sti.
"""
from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import quote

DIR = Path(__file__).resolve().parent.parent / "static" / "baggrunde"
TYPER = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


def files() -> list[str]:
    """Filnavne i mappen med en tilladt endelse, sorteret. Ingen skjulte filer, mapper eller symlinks ud af mappen."""
    if not DIR.is_dir():
        return []
    root = DIR.resolve()
    out = []
    for p in DIR.iterdir():
        if p.name.startswith(".") or p.suffix.lower() not in TYPER:
            continue
        try:
            if p.is_file() and p.resolve().parent == root:
                out.append(p.name)
        except OSError:
            continue
    return sorted(out, key=str.lower)


def resolve(name: str | None) -> Path | None:
    """Sti til en baggrund, eller None for "ingen". Rejser ValueError, hvis navnet ikke findes i mappen."""
    if not name or name == "ingen":
        return None
    if name not in files():  # navnet skal være et af de listede filnavne (afviser ../, skråstreger m.m.)
        raise ValueError("Ukendt baggrund.")
    return DIR.resolve() / name


def mimetype(name: str) -> str:
    return TYPER.get(Path(name).suffix.lower(), "application/octet-stream")


def css(name: str | None, kind: str, url: str | None = None) -> str:
    """CSS-regel, der lægger baggrunden på ark ('ark') eller kort ('kort').

    url: adresse billedet hentes fra. Uden url bruges file://-adressen (til PDF, hvor Chromium læser filen direkte).
    """
    path = resolve(name)
    if path is None:
        return ""
    src = url or path.as_uri()
    src = re.sub(r"[\"'()\\\s]", lambda m: quote(m.group(0)), src)
    img = f'url("{src}") center/cover no-repeat'
    if kind == "kort":
        return f".card:not(.empty){{background:{img} !important}}\n"
    return f"section.pg{{background:#fff {img}}}\n"


def inject(html: str, extra_css: str) -> str:
    """Læg CSS efter alt andet i HTML'ens (første) <style>-blok, så den vinder over temaerne."""
    if not extra_css:
        return html
    i = html.find("</style>")
    if i < 0:
        return f"<style>{extra_css}</style>" + html
    return html[:i] + extra_css + html[i:]
