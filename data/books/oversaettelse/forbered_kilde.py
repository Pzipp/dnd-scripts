#!/usr/bin/env python3
"""Lav en afgrænset kildefil til oversættelse af en 5etools-opslagsfil.

Brug: python3 forbered_kilde.py <id> [--kilder XPHB,XDMG] [--fra /srv/dnd5etools/data] [--ud DIR]

  id: backgrounds | optionalfeatures | items | items-base | skills | actions | class-<navn>

Skriver <ud>/<id>.json (standard: data/books/) med kun poster fra de valgte kilder, så
oversaet_bog.py ikke skal tage hele 5etools-filen (items.json alene er ca. 1,6 mio. tegn).
`class-<navn>` afgrænser class/class-<navn>.json (en fil pr. klasse, samme form som kilden, så
builderen kan lægge <fil>-da.json oven på kilden). skills og actions tages uden kildefilter,
medmindre --kilder er angivet.
"""
import argparse, json, sys
from pathlib import Path

FILER = {
    "backgrounds": (["backgrounds.json"], ["background"]),
    "optionalfeatures": (["optionalfeatures.json"], ["optionalfeature"]),
    "items": (["items.json"], ["item", "itemGroup"]),
    "items-base": (["items-base.json"], ["baseitem", "itemProperty", "itemType", "itemEntry",
                                         "itemTypeAdditionalEntries", "itemMastery"]),
    "skills": (["skills.json"], ["skill"]),
    "actions": (["actions.json"], ["action"]),
}
KLASSE = ["class", "subclass", "classFeature", "subclassFeature"]
UDEN_FILTER = {"skills", "actions"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("id")
    ap.add_argument("--kilder", help="kommasepareret kildeliste (standard XPHB,XDMG)")
    ap.add_argument("--fra", default="/srv/dnd5etools/data")
    ap.add_argument("--ud", default=str(Path(__file__).resolve().parent.parent))
    a = ap.parse_args()
    kilder = set(a.kilder.split(",")) if a.kilder else (None if a.id in UDEN_FILTER else {"XPHB", "XDMG"})
    if a.id.startswith("class-"):
        mønstre, lister = [f"class/{a.id}.json"], KLASSE
    elif a.id in FILER:
        mønstre, lister = FILER[a.id]
    else:
        sys.exit(f"ukendt id {a.id}: {', '.join(FILER)} eller class-<navn>")
    ud = {l: [] for l in lister}
    for m in mønstre:
        for f in sorted(Path(a.fra).glob(m)):
            d = json.load(open(f))
            for l in lister:
                ud[l] += [x for x in d.get(l, []) if kilder is None or x.get("source") in kilder]
    # _copy-poster arver fra en anden post; den skal være med, ellers mangler teksten
    def nøgle(x):
        return (x.get("name") or x.get("abbreviation"), x.get("source"))
    navne = {nøgle(x) for l in ud.values() for x in l}
    mangler = {nøgle(x["_copy"]) for l in ud.values() for x in l if "_copy" in x} - navne
    if mangler:
        print(f"ADVARSEL: {len(mangler)} _copy-henvisninger peger uden for de valgte kilder, fx {sorted(mangler)[:5]}", file=sys.stderr)
    if not any(ud.values()):
        sys.exit(f"{a.id}: ingen poster fra {sorted(kilder) if kilder else 'alle kilder'} - ingen fil lavet")
    sti = Path(a.ud) / f"{a.id}.json"
    if sti.is_symlink():
        sti.unlink()
    sti.write_text(json.dumps(ud, ensure_ascii=False, indent=1) + "\n")
    print(sti, {l: len(v) for l, v in ud.items()})


if __name__ == "__main__":
    main()
