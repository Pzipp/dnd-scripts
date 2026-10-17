#!/usr/bin/env python3
"""Lav en udgivelse: hæv VERSION, skriv CHANGELOG.md ud fra commits siden sidste udgivelse, commit og tag (vX.Y.Z).

  python3 scripts/release.py patch|minor|major|X.Y.Z [--preview] [--any-branch]

Kør den på `main`, efter dev er merget (se docs/versioner.md). Intet pushes: scriptet skriver kommandoerne, du skal køre.
Commit-beskeder grupperes efter præfikset før kolon (`mapcreator: ...`, `docs: ...`); uden præfiks kommer de under "Andet".
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from collections import OrderedDict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = ROOT / "VERSION"
CHANGELOG = ROOT / "CHANGELOG.md"
HEADER = """# Ændringslog

Hver udgivelse (`vX.Y.Z`, se [docs/versioner.md](docs/versioner.md)) med de ændringer, der kom med. Nyeste øverst.
Lav udgivelser med `python3 scripts/release.py`; skriv ikke i de udgivne afsnit i hånden.

## Ikke udgivet
"""
TITLES = {
    "mapcreator": "Kortbygger", "builder": "Karakterbygger", "bygger": "Karakterbygger", "simpelvtt": "Simpelt VTT",
    "docs": "Dokumentation", "dnd": "Kommandolinje", "webui": "Webui", "data": "Data", "docker": "Docker", "test": "Tests",
}


def git(*args: str, check: bool = True) -> str:
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if check and r.returncode:
        sys.exit(f"git {' '.join(args)} fejlede:\n{r.stderr.strip()}")
    return r.stdout.strip()


def last_tag() -> str:
    return git("describe", "--tags", "--abbrev=0", "--match", "v[0-9]*", check=False)


def bump(cur: str, how: str) -> str:
    if re.fullmatch(r"\d+\.\d+\.\d+", how):
        return how
    major, minor, patch = (int(x) for x in cur.split("."))
    if how == "major":
        return f"{major + 1}.0.0"
    if how == "minor":
        return f"{major}.{minor + 1}.0"
    if how == "patch":
        return f"{major}.{minor}.{patch + 1}"
    sys.exit("Angiv patch, minor, major eller et versionsnummer (X.Y.Z).")


def entries(since: str) -> "OrderedDict[str, list[str]]":
    rng = f"{since}..HEAD" if since else "HEAD"
    out = git("log", "--no-merges", "--format=%h\t%s", rng)
    groups: "OrderedDict[str, list[str]]" = OrderedDict()
    for line in out.splitlines():
        h, _, subject = line.partition("\t")
        if subject.startswith(("Merge ", "Udgivelse v")):
            continue
        m = re.match(r"([\w-]+):\s*(.+)", subject)
        title = TITLES.get(m.group(1).lower(), m.group(1).capitalize()) if m else "Andet"
        text = (m.group(2) if m else subject).strip()
        groups.setdefault(title, []).append(f"- {text} (`{h}`)")
    return groups


def render(new: str, groups, notes: str) -> str:
    parts = [f"## [{new}] – {date.today().isoformat()}\n"]
    if notes.strip():
        parts.append(notes.strip() + "\n")
    for title, items in groups.items():
        parts.append(f"### {title}\n\n" + "\n".join(items) + "\n")
    return "\n".join(parts)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("hvordan", help="patch, minor, major eller X.Y.Z")
    ap.add_argument("--preview", action="store_true", help="vis kun, hvad der ville blive skrevet")
    ap.add_argument("--any-branch", action="store_true", help="tillad udgivelse fra en anden gren end main")
    a = ap.parse_args()

    cur = VERSION.read_text(encoding="utf-8").strip()
    new = bump(cur, a.hvordan)
    since = last_tag()
    groups = entries(since)
    text = CHANGELOG.read_text(encoding="utf-8") if CHANGELOG.is_file() else HEADER
    m = re.search(r"^## Ikke udgivet\s*\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    notes = m.group(1) if m else ""
    section = render(new, groups, notes)

    print(f"{cur} -> {new}  (siden {since or 'begyndelsen'}: {sum(len(v) for v in groups.values())} commits)\n")
    print(section)
    if a.preview:
        return
    if git("status", "--porcelain", "--untracked-files=no"):
        sys.exit("Arbejdstræet har ucommittede ændringer. Commit dem først.")
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch != "main" and not a.any_branch:
        sys.exit(f"Du står på '{branch}'. Udgivelser laves på main (eller brug --any-branch).")
    if git("tag", "--list", f"v{new}"):
        sys.exit(f"Tagget v{new} findes allerede.")

    if not m:
        text = text.rstrip() + "\n\n## Ikke udgivet\n"
        m = re.search(r"^## Ikke udgivet\s*\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    text = text[: m.start()] + "## Ikke udgivet\n\n" + section.rstrip() + "\n\n" + text[m.end():].lstrip("\n")
    CHANGELOG.write_text(text.rstrip() + "\n", encoding="utf-8")
    VERSION.write_text(new + "\n", encoding="utf-8")
    git("add", "VERSION", "CHANGELOG.md")
    git("commit", "-m", f"Udgivelse v{new}")
    git("tag", "-a", f"v{new}", "-m", f"Udgivelse {new}")
    print(f"Lavet: commit og tag v{new}. Send dem afsted med:\n  git push && git push origin v{new}")


if __name__ == "__main__":
    main()
