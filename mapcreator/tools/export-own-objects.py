#!/usr/bin/env python3
"""Flytter egne genstande (importeret i kortbyggeren) ind i selve bygget.

Læser biblioteket i $USERDATA/mapcreator/assets (standard ../vol/userdata/mapcreator/assets), kopierer billederne til
src/objects/designer/<key>.webp og lægger dem i src/objects/designer/items.json. Eksisterende nøgler springes over,
så scriptet kan køres igen. Nøglen er navnet i små bogstaver med _ (æ=ae, ø=oe, å=aa) og må aldrig ændres bagefter.

  python3 tools/export-own-objects.py                 # alle nye
  python3 tools/export-own-objects.py --only "Busk, rund" "Vogn"
  python3 tools/export-own-objects.py --delete        # slet dem fra brugerens bibliotek bagefter
"""
import argparse
import json
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
TRANSLIT = {"æ": "ae", "ø": "oe", "å": "aa"}


def slug(name: str) -> str:
    s = name.lower()
    for a, b in TRANSLIT.items():
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", default=str(HERE.parent / "vol/userdata/mapcreator/assets"))
    ap.add_argument("--only", nargs="*", help="kun disse navne")
    ap.add_argument("--delete", action="store_true", help="fjern de overførte fra biblioteket")
    args = ap.parse_args()

    lib = Path(args.library)
    meta = json.loads((lib / "library.json").read_text("utf-8"))
    out_dir = HERE / "src/objects/designer"
    items_file = out_dir / "items.json"
    items = json.loads(items_file.read_text("utf-8")) if items_file.exists() else []
    have = {i["key"] for i in items}
    moved = []
    for it in meta["items"]:
        if args.only and it["name"] not in args.only:
            continue
        key = slug(it["name"])
        if not key or key in have:
            print(f"springer over: {it['name']} ({key or 'tomt navn'})")
            continue
        shutil.copy(lib / f"{it['id']}.webp", out_dir / f"{key}.webp")
        items.append({"key": key, "name": it["name"], "family": it["family"], "w": it["w"], "h": it["h"], "shadow": it["shadow"], "randomRotation": it["randomRotation"]})
        have.add(key)
        moved.append(it["id"])
        print(f"overført: {it['name']} -> designer_{key}")
    items_file.write_text(json.dumps(items, ensure_ascii=False, indent=1) + "\n", "utf-8")
    if args.delete and moved:
        meta["items"] = [i for i in meta["items"] if i["id"] not in moved]
        (lib / "library.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), "utf-8")
        for i in moved:
            (lib / f"{i}.webp").unlink(missing_ok=True)
    print(f"{len(moved)} nye; husk tags, tests og commit (se docs/mapcreator-objects.md)")


if __name__ == "__main__":
    main()
