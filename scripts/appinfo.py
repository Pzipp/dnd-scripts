"""Version og bygning af dnd-tools: hvilken udgave koden er, og hvilke udgaver et kort eller en karakter er lavet og gemt med.

Udgaven (`VERSION`, SemVer) ændres kun ved en udgivelse (`scripts/release.py`). Bygningen er den commit, koden er bygget af: den læses
fra miljøvariablen `APP_COMMIT` (sættes ved Docker-bygning), ellers direkte fra `.git` (uden at kalde git). Se docs/versioner.md.
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def version() -> str:
    try:
        return (ROOT / "VERSION").read_text(encoding="utf-8").strip() or "0.0.0"
    except OSError:
        return "0.0.0"


def _git_dir() -> Path | None:
    g = ROOT / ".git"
    if g.is_dir():
        return g
    if g.is_file():  # worktree: "gitdir: <sti>"
        m = re.match(r"gitdir:\s*(.+)", g.read_text(encoding="utf-8").strip())
        if m:
            p = Path(m.group(1))
            return p if p.is_absolute() else (ROOT / p).resolve()
    return None


def commit() -> str:
    """Den korte commit-hash (7 tegn), eller '' hvis den ikke kan afgøres."""
    env = os.environ.get("APP_COMMIT", "").strip()
    if env:
        return env[:7]
    g = _git_dir()
    if not g:
        return ""
    try:
        head = (g / "HEAD").read_text(encoding="utf-8").strip()
        if not head.startswith("ref:"):
            return head[:7]
        ref = head.split(None, 1)[1]
        for base in (g, g / "..", ):  # worktrees deler refs med hovedmappen
            f = base / ref
            if f.is_file():
                return f.read_text(encoding="utf-8").strip()[:7]
        packed = g / "packed-refs"
        if not packed.is_file():
            common = g / "commondir"
            if common.is_file():
                packed = (g / common.read_text(encoding="utf-8").strip() / "packed-refs").resolve()
        if packed.is_file():
            for line in packed.read_text(encoding="utf-8").splitlines():
                if line.endswith(" " + ref):
                    return line.split()[0][:7]
    except OSError:
        pass
    return ""


def info() -> dict:
    """{'version': '0.1.0', 'build': '5af8728', 'label': '0.1.0 (5af8728)'}"""
    v, b = version(), commit()
    return {"version": v, "build": b, "label": f"{v} ({b})" if b else v}


def stamp(previous: dict | None = None) -> dict:
    """Mærket, der skrives i et kort eller en karakter ved gem: `created` bevares fra før (første gang = nu), `saved` er altid nu."""
    now = {"version": version(), "build": commit(), "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    created = previous.get("created") if isinstance(previous, dict) else None
    return {"created": created if isinstance(created, dict) and created.get("version") else dict(now), "saved": now}


def label(stamp_: dict | None, which: str = "saved") -> str:
    """Læsbar tekst for et mærke: '0.1.0 (5af8728)', eller 'før versionering', hvis filen er ældre end mærket."""
    s = (stamp_ or {}).get(which) if isinstance(stamp_, dict) else None
    if not isinstance(s, dict) or not s.get("version"):
        return "før versionering"
    return f"{s['version']} ({s['build']})" if s.get("build") else str(s["version"])


def older_than(stamp_: dict | None, than: str, which: str = "saved") -> bool:
    """Er filen gemt med en ældre udgave end `than` (eller før versionering)?"""
    s = (stamp_ or {}).get(which) if isinstance(stamp_, dict) else None
    if not isinstance(s, dict) or not s.get("version"):
        return True
    return _key(s["version"]) < _key(than)


def _key(v: str) -> tuple[int, ...]:
    return tuple(int(x) for x in re.findall(r"\d+", v.split("-")[0])[:3]) or (0,)
