"""Udtrækker alle XPHB-feats fra 5etools' feats.json til data/feats-XPHB-da.yaml.

Filen har SAMME struktur og feltnavne som feats.json (`feat: [...]`, med `name`,
`source`, `entries`, `prerequisite` osv. uændret), så samme motor kan læse begge.
Vores egne felter er tilføjet efter originalfelterne, har engelske navne og
kolliderer ikke med 5etools' nøgler, så en 5etools-læser blot ignorerer dem.
Se docs/feats-xphb-da.md.

  * originalfelter - kopieres uændret fra 5etools og overskrives ved hver kørsel
  * egne felter - udfyldes i hånden/i batches og bevares ved genkørsel

Feats matches på (name, source). Feats der ikke længere findes i kilden meldes,
men slettes ikke.

  python3 scripts/data/feats_xphb.py [--kilde STI/feats.json] [--ud STI.yaml]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent.parent
KILDE = Path(os.environ.get("E5TOOLS_DATA", "/srv/e5tools/data")) / "feats.json"
UD = ROOT / "data" / "feats-XPHB-da.yaml"
SOURCE = "XPHB"


def egne_felter() -> dict:
    """Skabelon for vores egne felter. null/[]/{} = ikke udfyldt endnu."""
    return {
        "translationStatus": "notStarted",   # notStarted | draft | translated | reviewed
        "nameDa": None,
        "prerequisiteDa": None,
        "descriptionSheetDa": None,
        "descriptionShortDa": None,
        "card": {
            "front": {"title": None, "subtitle": None, "kicker": None, "text": None},
            "back": {"text": None, "note": None},
        },
        "sheet": {
            "section": None,        # features | bonus_actions | actions | reactions | magic | passive
            "show": True,
            "tag": None,
        },
        "grantsActions": [],        # [{type, name, short, uses, recharge, formula}]
        "modifiesActions": [],      # [{action, from, to, effect}]
        "statChanges": {},
        "trainingGranted": {},
        "sensesGranted": {},
        "resistancesGranted": {},
        "languagesGranted": [],
        "spellGrants": {},
        "resources": [],            # [{name, count, recharge}]
        "playerChoices": [],        # [{id, title, count, options}]
        "links": {"requires": [], "replaces": [], "duplicatesWith": []},
        "notes": None,
    }


def flet(gammel, ny):
    """Bevar udfyldte værdier; tilføj nye nøgler fra skabelonen rekursivt."""
    if isinstance(ny, dict) and isinstance(gammel, dict):
        return {**{k: flet(gammel.get(k), v) if k in gammel else v for k, v in ny.items()},
                **{k: v for k, v in gammel.items() if k not in ny}}
    return ny if gammel is None else gammel


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--kilde", type=Path, default=KILDE)
    ap.add_argument("--ud", type=Path, default=UD)
    a = ap.parse_args()
    if not a.kilde.is_file():
        sys.exit(f"Fejl: finder ikke {a.kilde}. Sæt --kilde eller E5TOOLS_DATA.")

    kilde = [f for f in json.loads(a.kilde.read_text(encoding="utf-8")).get("feat", []) if f.get("source") == SOURCE]
    gamle = {}
    if a.ud.is_file():
        for f in (yaml.safe_load(a.ud.read_text(encoding="utf-8")) or {}).get("feat", []):
            gamle[(f["name"], f["source"])] = f

    skabelon = egne_felter()
    resultat, nye = [], 0
    for f in kilde:
        gammel = gamle.pop((f["name"], f["source"]), None)
        nye += gammel is None
        # Egne felter = alt i den gamle post, som ikke er et originalfelt (så også felter
        # tilføjet i hånden bevares); flettes ind i den nuværende skabelon.
        egne = {k: v for k, v in (gammel or {}).items() if k not in f}
        resultat.append({**f, **flet(egne, skabelon), **{k: v for k, v in egne.items() if k not in skabelon}})
    resultat += list(gamle.values())

    a.ud.parent.mkdir(parents=True, exist_ok=True)
    tekst = "# Genereret af scripts/data/feats_xphb.py. Samme struktur som 5etools' feats.json; egne felter er beskrevet i docs/feats-xphb-da.md.\n"
    tekst += yaml.safe_dump({"feat": resultat}, allow_unicode=True, sort_keys=False, width=100)
    a.ud.write_text(tekst, encoding="utf-8")
    print(f"{len(kilde)} {SOURCE}-feats i kilden · {nye} nye · {a.ud}")
    if gamle:
        print("Findes ikke længere i kilden (beholdt): " + ", ".join(n for n, _ in gamle))


if __name__ == "__main__":
    main()
