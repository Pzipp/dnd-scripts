#!/usr/bin/env python3
"""Hjælper til at oversætte data/books/book-<bog>.json til book-<bog>-da.json i batches.

Brug: python3 oversaet_bog.py <id> <kommando>   (id fx xphb -> ../book-xphb.json, skills -> ../skills.json)

  udtraek   find alle oversættelige tekster og del dem i batches (engelsk/NNN.json)
  naeste    vis næste batch uden dansk fil (eller en given: naeste 7)
  tjek      kontrollér danske batches (id'er, {@...}-tags uændrede)
  saml      byg book-<bog>-da.json af alle gyldige danske batches (rest bliver engelsk)
  status    antal batches/tekster færdige
  forudfyld genbrug danske tekster fra færdige batches til identiske engelske tekster
            (fuldt dækkede -> dansk/, ellers delvis/NNN.json, som flet tager med)
  flet NNN FIL  flet delvis oversættelse FIL ind i dansk/NNN.json; rene tal+enhed
                (fx "2 lb.", "25 GP") der mangler, kopieres uændret
"""
import copy, json, re, sys
from collections import Counter
from pathlib import Path

ROD = Path(__file__).resolve().parent.parent  # data/books
BOG = sys.argv[1] if len(sys.argv) > 1 else ""
# Bøger hedder book-<id>.json; opslagsfiler beholder kildens navn (<id>.json). Målet får altid -da.
STAMME = BOG if (ROD / f"{BOG}.json").exists() else f"book-{BOG}"
KILDE = ROD / f"{STAMME}.json"
MAL = ROD / f"{STAMME}-da.json"
ARB = Path(__file__).resolve().parent / BOG
EN, DA = ARB / "engelsk", ARB / "dansk"
STIER = ARB / "stier.json"
BATCH_TEGN = 9000

# {@...}-tags, {#itemEntry ...}-henvisninger og {{item.x}}-skabelonfelter skal stå uændret
TAG = re.compile(r"\{@[^{}]*\}|\{#[^{}]*\}|\{\{[^{}]*\}\}")
# Opslagsfiler (spells-*.json, races.json, feats.json): kun poster i disse lister; navnet på selve
# posten (besværgelse, species, feat) står på engelsk og udtrækkes derfor ikke.
ENTITETER = {"spell", "race", "subrace", "feat", "background", "optionalfeature", "item", "itemGroup", "baseitem",
             "itemProperty", "itemType", "itemEntry", "itemTypeAdditionalEntries", "itemMastery", "skill", "action",
             "sense", "class", "subclass", "classFeature", "subclassFeature"}
# `name` er kun tekst under disse nøgler (træk, valgmuligheder, tabeller). Andre steder er `name` en
# henvisning (prerequisite.class.name, consumes.name, subclasses.name, optionalfeatureProgression.name).
TEKST_UNDER = {"entries", "entry", "items", "additionalEntries", "entriesTemplate", "entriesHigherLevel", "sizeEntry"}
STRENGE_I = {"entries", "entry", "items", "row", "rows", "footnotes", "colLabels", "colLabelRows", "cells", "caption", "title", "by"}


def oversaettelig(s):
    return bool(re.search(r"[A-Za-z]{2}", TAG.sub("", s)))


def find(node, sti=(), ctx=None, ude=None):
    """Giv (sti, tekst) for alle tekster der skal oversættes."""
    if isinstance(node, str):
        if ctx and oversaettelig(node) and not node.startswith("{#"):
            ude.append((sti, node))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            find(v, sti + (i,), ctx, ude)
    elif isinstance(node, dict):
        if node.get("type") == "statblock":
            return
        for k, v in node.items():
            if sti and sti[0] in ENTITETER and k == "name" and (len(sti) == 2 or (len(sti) == 4 and sti[2] == "_versions")):
                continue  # navn på posten eller på en variant (_versions)
            if sti and sti[0] in ENTITETER and k == "name" and not TEKST_UNDER.intersection(x for x in sti if isinstance(x, str)):
                continue
            if sti and sti[0] == "itemGroup" and k == "items" and len(sti) == 2:
                continue  # liste af "Navn|KILDE"-henvisninger
            if sti and sti[0] in ENTITETER and k in ("_copy", "_abstract", "additionalSpells"):
                continue  # henvisninger til andre poster/besværgelser
            if sti and sti[0] in ENTITETER and k == "components" and isinstance(v, dict) and "m" in v:
                m = v["m"]
                if isinstance(m, dict):
                    find(m.get("text"), sti + (k, "m", "text"), True, ude)
                else:
                    find(m, sti + (k, "m"), True, ude)
            elif sti and sti[0] in ENTITETER and k == "time":
                find(v, sti + (k,), False, ude)
            elif sti and sti[0] in ENTITETER and k == "condition" and isinstance(v, str):
                find(v, sti + (k,), True, ude)
            elif k == "name" and isinstance(v, str):
                find(v, sti + (k,), True, ude)
            elif k in STRENGE_I:
                find(v, sti + (k,), True, ude)
            elif isinstance(v, (list, dict)) and k not in ("href", "roll", "attributes", "colStyles"):
                find(v, sti + (k,), False, ude)
    return ude


def find_copy(node, ude):
    """Tekster i `_copy._mod`-operationernes `items` (træk en kopi selv tilføjer eller erstatter).
    Samles for sig og lægges sidst, så id'erne i de øvrige batches ikke flytter sig."""
    for liste in (k for k in node if k in ENTITETER and isinstance(node[k], list)):
        for i, post in enumerate(node[liste]):
            mods = (post.get("_copy") or {}).get("_mod") if isinstance(post, dict) else None
            for prop, ops in (mods or {}).items():
                if not isinstance(ops, (list, dict)):
                    continue
                for j, op in enumerate(ops if isinstance(ops, list) else [ops]):
                    if isinstance(op, dict) and "items" in op:
                        sti = (liste, i, "_copy", "_mod", prop) + ((j,) if isinstance(ops, list) else ()) + ("items",)
                        find(op["items"], sti, True, ude)
    return ude


def hent(rod, sti):
    for k in sti:
        rod = rod[k]
    return rod


def udtraek():
    d = json.load(open(KILDE))
    fund = find(d, (), False, [])
    antal_hoved = len(fund)
    fund = fund + find_copy(d, [])
    STIER.write_text(json.dumps([list(s) for s, _ in fund]))
    batches, nu, tegn = [], {}, 0
    for n, (_, t) in enumerate(fund):
        if n == antal_hoved and nu:  # _copy-tekster i egne batches, så de øvrige er uændrede
            batches.append(nu); nu, tegn = {}, 0
        if nu and tegn + len(t) > BATCH_TEGN:
            batches.append(nu); nu, tegn = {}, 0
        nu[str(n)] = t; tegn += len(t)
    if nu:
        batches.append(nu)
    for f in EN.glob("*.json"):
        f.unlink()
    for i, b in enumerate(batches, 1):
        (EN / f"{i:03d}.json").write_text(json.dumps(b, ensure_ascii=False, indent=0))
    print(f"{len(fund)} tekster, {sum(len(t) for _, t in fund)} tegn, {len(batches)} batches")


def laes(sti):
    return json.load(open(sti))


def fejl_i(navn):
    en, da = laes(EN / navn), laes(DA / navn)
    fejl = []
    if set(en) != set(da):
        fejl.append(f"id'er afviger: mangler {sorted(set(en)-set(da))[:5]}, ekstra {sorted(set(da)-set(en))[:5]}")
    for k in en.keys() & da.keys():
        if not isinstance(da[k], str) or not da[k].strip():
            fejl.append(f"{k}: tom/ikke tekst")
        elif Counter(TAG.findall(en[k])) != Counter(TAG.findall(da[k])):
            fejl.append(f"{k}: tags afviger\n   EN: {TAG.findall(en[k])}\n   DA: {TAG.findall(da[k])}")
    return fejl


def faerdige():
    return sorted(p.name for p in DA.glob("*.json"))


def tjek():
    ok = True
    for n in faerdige():
        for f in fejl_i(n):
            ok = False; print(n, f)
    print("alle danske batches er gyldige" if ok else "FEJL ovenfor")
    return ok


def status():
    alle = sorted(p.name for p in EN.glob("*.json"))
    print(f"{len(faerdige())}/{len(alle)} batches oversat")


def naeste(arg=None):
    alle = sorted(p.name for p in EN.glob("*.json"))
    navn = f"{int(arg):03d}.json" if arg else next((n for n in alle if not (DA / n).exists()), None)
    if not navn:
        print("ALLE BATCHES ER OVERSAT"); return
    print(f"# batch {navn} ({alle.index(navn)+1}/{len(alle)})  ->  skriv {DA/navn}")
    print((EN / navn).read_text())


ENHED = re.compile(r"^[\d.,/½¼¾ ]+(lb\.|GP|SP|CP|EP|PP|ft\.)?( [\d.,/½¼¾]+ (lb\.|GP|SP|CP|EP|PP))*$")


def flet(nr, fil):
    navn = f"{int(nr):03d}.json"
    en, dele = laes(EN / navn), laes(fil)
    if (ARB / "delvis" / navn).exists():
        dele = {**laes(ARB / "delvis" / navn), **dele}
    ud = {}
    for k, t in en.items():
        if k in dele:
            ud[k] = dele[k]
        elif ENHED.match(t.strip()):
            ud[k] = t
    mangler = [k for k in en if k not in ud]
    if mangler:
        print("mangler stadig:", {k: en[k][:60] for k in mangler}); return
    (DA / navn).write_text(json.dumps(ud, ensure_ascii=False, indent=0))
    print("skrev", DA / navn)


def sti_er_opslag(d):
    return any(k in d for k in ENTITETER)


def ret_replace(ud, orig):
    """`_mod ... replace: "<trinavn>"` peger på et egenskabsnavn. Er navnet oversat, så følg med."""
    kort = {}
    def navne(a, b):
        if isinstance(a, dict) and isinstance(b, dict):
            if isinstance(a.get("name"), str) and isinstance(b.get("name"), str) and a["name"] != b["name"] and "entries" in a:
                kort.setdefault(a["name"], b["name"])
            for k in a:
                if k in b: navne(a[k], b[k])
        elif isinstance(a, list) and isinstance(b, list):
            for x, y in zip(a, b): navne(x, y)
    navne(orig, ud)
    uloest = set()
    def ret(n):
        if isinstance(n, dict):
            r = n.get("replace")
            if n.get("mode") in ("replaceArr", "replaceOrAppendArr", "removeArr") and isinstance(r, str):
                if r in kort: n["replace"] = kort[r]
                else: uloest.add(r)
            for v in n.values(): ret(v)
        elif isinstance(n, list):
            for v in n: ret(v)
    ret(ud)
    if uloest:
        print("replace uden oversat navn (uændret, tjek):", sorted(uloest)[:10], f"({len(uloest)})")


def forudfyld():
    """Oversættelseshukommelse: genbrug danske tekster for identiske engelske tekster i batches uden dansk
    fil. Fuldt dækkede batches skrives til dansk/, delvise til delvis/NNN.json (flet tager dem med)."""
    hukommelse, konflikt = {}, set()
    for n in faerdige():
        if fejl_i(n):
            continue
        en, da = laes(EN / n), laes(DA / n)
        for k, t in en.items():
            if hukommelse.setdefault(t, da[k]) != da[k]:
                konflikt.add(t)
    for t in konflikt:
        hukommelse.pop(t, None)
    (ARB / "delvis").mkdir(exist_ok=True)
    for n in sorted(p.name for p in EN.glob("*.json")):
        if (DA / n).exists():
            continue
        en = laes(EN / n)
        fundet = {k: hukommelse[t] for k, t in en.items() if t in hukommelse}
        if len(fundet) == len(en):
            (DA / n).write_text(json.dumps(fundet, ensure_ascii=False, indent=0))
            print(f"{n}: alle {len(en)} tekster genbrugt -> dansk/")
        elif fundet:
            (ARB / "delvis" / n).write_text(json.dumps(fundet, ensure_ascii=False, indent=0))
            print(f"{n}: {len(fundet)}/{len(en)} genbrugt -> delvis/, {len(en) - len(fundet)} mangler")
        else:
            print(f"{n}: intet genbrugt ({len(en)} tekster)")


def saml():
    d = json.load(open(KILDE))
    ud = copy.deepcopy(d)
    stier = json.load(open(STIER))
    antal = 0
    for n in faerdige():
        if fejl_i(n):
            print("springer over (fejl):", n); continue
        for k, t in laes(DA / n).items():
            sti = stier[int(k)]
            hent(ud, sti[:-1])[sti[-1]] = t; antal += 1
    if sti_er_opslag(ud):
        ret_replace(ud, d)
    MAL.write_text(json.dumps(ud, ensure_ascii=False, indent=2) + "\n")
    print(f"{antal} tekster oversat -> {MAL}")


if __name__ == "__main__":
    if len(sys.argv) < 3 or not KILDE.exists():
        sys.exit(__doc__ + f"\nBrug: oversaet_bog.py <bog-id> <kommando> [args]  (kilde: {KILDE})")
    EN.mkdir(parents=True, exist_ok=True)
    DA.mkdir(parents=True, exist_ok=True)
    kmd = sys.argv[2]
    {"udtraek": udtraek, "naeste": lambda: naeste(*sys.argv[3:4]), "tjek": tjek, "saml": saml, "status": status, "flet": lambda: flet(*sys.argv[3:5]), "forudfyld": forudfyld}[kmd]()
