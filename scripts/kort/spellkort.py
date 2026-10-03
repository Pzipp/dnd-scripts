#!/usr/bin/env python3
"""Spellkort (D&D 2024, dansk, pokerstørrelse 63 x 88 mm, farve eller sort/hvid).

Brug:  python3 spellkort.py <karakter|mappe|kort.yaml> [--stil farve|sorthvid|begge] [--ud MAPPE]
  Bunken er en YAML-fil: {titel: "...", kort: [eldritch-blast, ...], egne: {...}}
  Kortdata hentes fra alle filer i bibliotek/ (.yaml/.yml/.json) plus bunkens egne kort.
  Uden --stil laves begge stile. Output: <ud>/kort-farve.html og kort-sorthvid.html
  (standard: karakterer/<navn>/udskrifter/).

Output: 9 kort pr. A4. Arkene kommer i rækkefølgen
Ark 1 forsider, Ark 1 bagsider, Ark 2 forsider, ... Print uden dobbeltsidet;
for- og bagside klippes ud hver for sig og lægges i samme kortlomme.

Stile: spellkort.css er sort/hvid (kun sort blæk). 'farve' lægger spellkort-farve.css ovenpå
(pergamentfarve og en accentfarve pr. skole/korttype). Layoutet er identisk.
"""
import argparse, difflib, os, sys, html

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import faelles

HERE = os.path.dirname(os.path.abspath(__file__))
PR_ARK = 9


def esc_attr(s):
    return html.escape(s, quote=True)


def stats(k):
    cells = k.get("felter") or [("Tid", k["tid"]), ("Afstand", k["afstand"]), ("Varighed", k["varighed"]), ("Komp.", k["komp"])]
    return '<dl class="stats">' + "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in cells) + "</dl>"


def tags(k):
    t = []
    if k.get("konc"):
        t.append('<span class="tag"><span class="ico-k"></span> Koncentration</span>')
    if k.get("ritual"):
        t.append('<span class="tag">Ⓡ Ritual</span>')
    return f'<div class="tags">{"".join(t)}</div>' if t else ""


def scale(k):
    rows = k.get("skala")
    if not rows:
        return ""
    title = k.get("skala_titel") or ("Skade efter level" if k.get("grad") == 0 else "Spell slot")
    if k.get("grad") == 0 and k.get("skala_titel") is None and rows[0][1].endswith("stråle"):
        title = "Stråler efter level"
    head = "".join(f"<th>{a}</th>" for a, _ in rows)
    body = "".join(f"<td>{b}</td>" for _, b in rows)
    return f'<div class="scale"><div class="scale-t">{title}</div><table><tr>{head}</tr><tr>{body}</tr></table></div>'


def dice(k):
    rows = "".join(
        f'<div class="drow"><span class="dl">{a}</span><span class="dv">{b}</span><span class="ds">{c}</span></div>'
        for a, b, c in k.get("slag", []))
    return f'<div class="dice">{rows}</div>' if rows else ""


def sections(secs):
    out = []
    for s in secs:
        out.append(f'<section><h4>{s["titel"]}</h4>')
        if s.get("tekst"):
            out.append(f'<p>{s["tekst"]}</p>')
        if s.get("punkter"):
            out.append("<ul>" + "".join(f"<li>{p}</li>" for p in s["punkter"]) + "</ul>")
        out.append("</section>")
    return "".join(out)


IKONER = {"klasse": ("✦", "evne"), "mastery": ("⚔", "mastery"), "feat": ("★", "feat"),
          "art": ("◆", "art"), "udstyr": ("⚒", "udstyr")}


def badge(k):
    if k.get("type") in IKONER:
        sym, lbl = IKONER[k["type"]]
        return f'<div class="badge"><b>{sym}</b><small>{lbl}</small></div>'
    if k.get("type") == "regel":
        return '<div class="badge rule"><b>§</b><small>regel</small></div>'
    if k["grad"] == 0:
        return '<div class="badge"><b>∞</b><small>cantrip</small></div>'
    return f'<div class="badge"><b>{k["grad"]}</b><small>grad</small></div>'


def kicker(k):
    if k.get("kicker"):
        return k["kicker"]
    if k.get("type") == "regel":
        return "Regler · <i>PHB 2024</i>"
    lvl = "Cantrip" if k["grad"] == 0 else f'{k["grad"]}. grad'
    return f'{lvl} · {k["skole_da"]} <i>{k["skole"]}</i>'


def kategori(k, farve):
    """Attribut til farve-stilen: skolens navn (besværgelser) eller korttypen. Tomt i sort/hvid."""
    if not farve:
        return ""
    return f' data-kat="{esc_attr(k.get("type") or k.get("skole") or "")}"'


def front(k, farve=False):
    head = f'''<header><div class="t"><h3>{k["navn"]}</h3><div class="da">{k["dansk"]}</div></div>{badge(k)}</header>
<div class="kicker">{kicker(k)}</div>'''
    if k.get("type") == "regel":
        body = f'<div class="rules">{sections(k["foran"])}</div>'
    else:
        body = f'''{stats(k)}{tags(k)}
<p class="eff">{k["effekt"]}</p>
{dice(k)}{scale(k)}'''
    return f'''<div class="card front"{kategori(k, farve)}><div class="frame">{head}{body}
<footer><span>Forside</span><span class="orn">✦</span><span>{"Hjemmelavet" if k.get("kilde") == "Hjemmelavet" else "D&amp;D 2024"}</span></footer></div></div>'''


def back(k, farve=False):
    return f'''<div class="card back"{kategori(k, farve)}><div class="frame">
<header class="bh"><h3>{k["navn"]}</h3>{badge(k)}</header>
<div class="rules">{sections(k.get("bag", []))}</div>
<footer><span>Bagside</span><span class="orn">✦</span><span>{k.get("kilde", "PHB 2024") if k.get("type") not in (None, "") and "skole" not in k else k["dansk"]}</span></footer></div></div>'''


def blank():
    return '<div class="card empty"></div>'


def bibliotek():
    """Alle kort i bibliotek/ som {id: kort}. Et id må kun findes én gang."""
    lib, kilde = {}, {}
    if not os.path.isdir(faelles.BIBLIOTEK):
        faelles.fejl(f"Mappen {faelles.BIBLIOTEK} findes ikke.")
    for navn in sorted(os.listdir(faelles.BIBLIOTEK)):
        if not navn.lower().endswith(faelles.ENDELSER) or navn.startswith(("_", ".")):
            continue
        for kid, kort in (faelles.indlaes(os.path.join(faelles.BIBLIOTEK, navn)) or {}).items():
            if kid in lib:
                faelles.fejl(f"Kort-id '{kid}' findes både i {kilde[kid]} og {navn}. Id'er skal være unikke.")
            lib[kid], kilde[kid] = kort, navn
    return lib


def build(deck, stil="sorthvid"):
    if stil not in faelles.STILE:
        faelles.fejl(f"Ukendt stil '{stil}'.")
    farve = stil == "farve"
    lib = bibliotek()
    for kid, kort in (deck.get("egne") or {}).items():
        if kid in lib:
            faelles.fejl(f"Eget kort '{kid}' har samme id som et kort i bibliotek/. Vælg et andet id.")
        lib[kid] = kort
    ukendte = [i for i in deck["kort"] if i not in lib]
    if ukendte:
        tip = "; ".join(f"{i}" + (f" (mente du {', '.join(difflib.get_close_matches(i, lib, 2))}?)" if difflib.get_close_matches(i, lib, 2) else "")
                        for i in ukendte)
        faelles.fejl(f"Ukendte kort-id'er i bunken '{deck.get('titel', '')}': {tip}")
    css = open(os.path.join(HERE, "spellkort.css"), encoding="utf-8").read()
    if farve:
        css += "\n" + open(os.path.join(HERE, "spellkort-farve.css"), encoding="utf-8").read()
    cards = [lib[i] for i in deck["kort"]]
    sheets = []
    for n, start in enumerate(range(0, len(cards), PR_ARK), 1):
        chunk = cards[start:start + PR_ARK]
        pad = [blank()] * (PR_ARK - len(chunk))
        f = "".join(front(k, farve) for k in chunk) + "".join(pad)
        b = "".join(back(k, farve) for k in chunk) + "".join(pad)
        names = ", ".join(k["navn"] for k in chunk)
        sheets.append(f'<section class="sheet"><div class="sheet-l"><b>{deck["titel"]} · Ark {n} · forsider</b><span>{names}</span></div><div class="grid">{f}</div><div class="sheet-f">Klip langs de stiplede linjer · 63 × 88 mm · bagsiderne er på næste ark</div></section>')
        sheets.append(f'<section class="sheet"><div class="sheet-l"><b>{deck["titel"]} · Ark {n} · bagsider</b><span>Samme placering som forsiderne</span></div><div class="grid">{b}</div><div class="sheet-f">Læg for- og bagside ryg mod ryg i samme kortlomme</div></section>')
    titel = deck["titel"] + (" (farve)" if farve else "")
    print_i = "farve" if farve else "sort/hvid"
    return f'''<title>{titel}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>
{css}
</style>
<main class="deck">
<div class="intro"><h1>{deck["titel"]}</h1><p>{len(cards)} kort i pokerstørrelse (63 × 88 mm), 9 pr. A4-ark. Print i {print_i}, A4, margin 0, uden dobbeltsidet. Klip forsider og bagsider ud hver for sig, og læg dem ryg mod ryg i samme kortlomme.</p></div>
{"".join(sheets)}
</main>
'''


def lav(kilde, stil=None, ud_mappe=None):
    """Lav kort-HTML i de valgte stile. Returnerer listen af filer."""
    src = faelles.find_fil(kilde, "kort")
    deck = faelles.indlaes(src)
    filer = []
    for s in faelles.stile(stil):
        dst = faelles.ud_sti(src, "kort", s, ".html", ud_mappe)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(build(deck, s))
        filer.append(dst)
    return filer


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Lav spellkort-HTML (63 x 88 mm, 9 pr. A4).")
    ap.add_argument("kilde", help="karakternavn (fx valak), mappe eller sti til kort.yaml")
    ap.add_argument("--stil", choices=["farve", "sorthvid", "begge"], default="begge")
    ap.add_argument("--ud", help="mappe til outputfiler (standard: karakterer/<navn>/udskrifter/)")
    a = ap.parse_args()
    for f in lav(a.kilde, a.stil, a.ud):
        print(f)
