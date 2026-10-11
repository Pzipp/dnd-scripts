#!/usr/bin/env python3
"""Hjælper til at oversætte data/books/book-xphb.json til book-xphb-da.json i batches.

  udtraek   find alle oversættelige tekster og del dem i batches (engelsk/NNN.json)
  naeste    vis næste batch uden dansk fil (eller en given: naeste 7)
  tjek      kontrollér danske batches (id'er, {@...}-tags uændrede)
  saml      byg book-xphb-da.json af alle gyldige danske batches (rest bliver engelsk)
  status    antal batches/tekster færdige
"""
import copy, json, re, sys
from collections import Counter
from pathlib import Path

ROD = Path(__file__).resolve().parents[2] / "data" / "books"
KILDE = ROD / "book-xphb.json"
MAL = ROD / "book-xphb-da.json"
ARB = ROD / "oversaettelse"
EN, DA = ARB / "engelsk", ARB / "dansk"
STIER = ARB / "stier.json"
BATCH_TEGN = 9000

TAG = re.compile(r"\{@[^{}]*\}")
STRENGE_I = {"entries", "entry", "items", "row", "rows", "footnotes", "colLabels", "colLabelRows", "cells", "caption", "title", "by"}


def oversaettelig(s):
    return bool(re.search(r"[A-Za-z]{2}", TAG.sub("", s)))


def find(node, sti=(), ctx=None, ude=None):
    """Giv (sti, tekst) for alle tekster der skal oversættes."""
    if isinstance(node, str):
        if ctx and oversaettelig(node):
            ude.append((sti, node))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            find(v, sti + (i,), ctx, ude)
    elif isinstance(node, dict):
        if node.get("type") == "statblock":
            return
        for k, v in node.items():
            if k == "name" and isinstance(v, str):
                find(v, sti + (k,), True, ude)
            elif k in STRENGE_I:
                find(v, sti + (k,), True, ude)
            elif isinstance(v, (list, dict)) and k not in ("href", "roll", "attributes", "colStyles"):
                find(v, sti + (k,), False, ude)
    return ude


def hent(rod, sti):
    for k in sti:
        rod = rod[k]
    return rod


def udtraek():
    d = json.load(open(KILDE))
    fund = find(d, (), False, [])
    STIER.write_text(json.dumps([list(s) for s, _ in fund]))
    batches, nu, tegn = [], {}, 0
    for n, (_, t) in enumerate(fund):
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
    MAL.write_text(json.dumps(ud, ensure_ascii=False, indent=2) + "\n")
    print(f"{antal} tekster oversat -> {MAL}")


if __name__ == "__main__":
    kmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    {"udtraek": udtraek, "naeste": lambda: naeste(*sys.argv[2:3]), "tjek": tjek, "saml": saml, "status": status}[kmd]()
