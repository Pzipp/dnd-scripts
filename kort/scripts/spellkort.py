#!/usr/bin/env python3
"""Spellkort (D&D 2024, dansk, sort/hvid, pokerstørrelse 63 x 88 mm).

Brug:  python3 spellkort.py <bunke.json> [ud.html]
  bunke.json: {"titel": "...", "kort": ["eldritch-blast", ...]}
  Kortdata hentes fra besvaergelser.json, evner.json og udstyr.json (samme mappe).

Output: 9 kort pr. A4. Arkene kommer i rækkefølgen
Ark 1 forsider, Ark 1 bagsider, Ark 2 forsider, ... Print uden dobbeltsidet;
for- og bagside klippes ud hver for sig og lægges i samme kortlomme.
"""
import json, os, sys, html

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


def front(k):
    head = f'''<header><div class="t"><h3>{k["navn"]}</h3><div class="da">{k["dansk"]}</div></div>{badge(k)}</header>
<div class="kicker">{kicker(k)}</div>'''
    if k.get("type") == "regel":
        body = f'<div class="rules">{sections(k["foran"])}</div>'
    else:
        body = f'''{stats(k)}{tags(k)}
<p class="eff">{k["effekt"]}</p>
{dice(k)}{scale(k)}'''
    return f'''<div class="card front"><div class="frame">{head}{body}
<footer><span>Forside</span><span class="orn">✦</span><span>{"Hjemmelavet" if k.get("kilde") == "Hjemmelavet" else "D&amp;D 2024"}</span></footer></div></div>'''


def back(k):
    return f'''<div class="card back"><div class="frame">
<header class="bh"><h3>{k["navn"]}</h3>{badge(k)}</header>
<div class="rules">{sections(k.get("bag", []))}</div>
<footer><span>Bagside</span><span class="orn">✦</span><span>{k.get("kilde", "PHB 2024") if k.get("type") not in (None, "") and "skole" not in k else k["dansk"]}</span></footer></div></div>'''


def blank():
    return '<div class="card empty"></div>'


def build(deck):
    lib = {}
    for name in ("besvaergelser.json", "evner.json", "udstyr.json"):
        p = os.path.join(HERE, name)
        if os.path.exists(p):
            lib.update(json.load(open(p, encoding="utf-8")))
    css = open(os.path.join(HERE, "spellkort.css"), encoding="utf-8").read()
    cards = [lib[i] for i in deck["kort"]]
    sheets = []
    for n, start in enumerate(range(0, len(cards), PR_ARK), 1):
        chunk = cards[start:start + PR_ARK]
        pad = [blank()] * (PR_ARK - len(chunk))
        f = "".join(front(k) for k in chunk) + "".join(pad)
        b = "".join(back(k) for k in chunk) + "".join(pad)
        names = ", ".join(k["navn"] for k in chunk)
        sheets.append(f'<section class="sheet"><div class="sheet-l"><b>{deck["titel"]} · Ark {n} · forsider</b><span>{names}</span></div><div class="grid">{f}</div><div class="sheet-f">Klip langs de stiplede linjer · 63 × 88 mm · bagsiderne er på næste ark</div></section>')
        sheets.append(f'<section class="sheet"><div class="sheet-l"><b>{deck["titel"]} · Ark {n} · bagsider</b><span>Samme placering som forsiderne</span></div><div class="grid">{b}</div><div class="sheet-f">Læg for- og bagside ryg mod ryg i samme kortlomme</div></section>')
    return f'''<title>{deck["titel"]}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>
{css}
</style>
<main class="deck">
<div class="intro"><h1>{deck["titel"]}</h1><p>{len(cards)} kort i pokerstørrelse (63 × 88 mm), 9 pr. A4-ark. Print i sort/hvid, A4, margin 0, uden dobbeltsidet. Klip forsider og bagsider ud hver for sig, og læg dem ryg mod ryg i samme kortlomme.</p></div>
{"".join(sheets)}
</main>
'''


if __name__ == "__main__":
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(src)[0] + ".html"
    deck = json.load(open(src, encoding="utf-8"))
    open(dst, "w", encoding="utf-8").write(build(deck))
    print(dst)
