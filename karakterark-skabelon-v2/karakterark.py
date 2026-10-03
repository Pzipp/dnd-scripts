#!/usr/bin/env python3
"""Karakterark-skabelon v2 (D&D 2024, dansk, A4-print).

Brug:  python3 karakterark.py <karakter.json> [ud.html] [--stil sorthvid]

Én HTML-fil med alle sider. Print de sider, du har brug for:
  side 1   Karakterark      (én pr. version i "versioner")
  side 2   Handlingsark     ("handlingsark", bruger den sidste version)
  side 3   Udstyrsark       ("udstyrsark")
  side 4   Baggrundsark     ("baggrundsark")

Stilark: side1.css (side 1) og karakterark.css (side 2–4) skal ligge ved siden af scriptet.
--stil sorthvid lægger side1-sorthvid.css og karakterark-sorthvid.css ovenpå.
Hver sides CSS gælder kun for den side (generatoren sætter et scope foran reglerne).

Små tegn i teksterne:
  []          -> afkrydsningsfelt
  {+UDTRYK}   -> regnes ud og vises med fortegn, fx {+DEX+PB} -> +5
  {UDTRYK}    -> regnes ud uden fortegn, fx {11+DEX} -> 14
  Udtryk kan bruge STR DEX CON INT WIS CHA (modifiers) og PB.
Formlen bag et tal vises automatisk i lille kursiv under tallet.
"""
import json, os, re, sys

ABIL = [("STR", "Styrke", "str"), ("DEX", "Smidighed", "dex"), ("CON", "Udholdenhed", "con"),
        ("INT", "Intelligens", "int"), ("WIS", "Visdom", "wis"), ("CHA", "Karisma", "cha")]
SKILLS = {
    "STR": ["Athletics"],
    "DEX": ["Acrobatics", "Sleight of Hand", "Stealth"],
    "CON": [],
    "INT": ["Arcana", "History", "Investigation", "Nature", "Religion"],
    "WIS": ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"],
    "CHA": ["Deception", "Intimidation", "Performance", "Persuasion"],
}
SKILL_ABIL = {s: k for k, lst in SKILLS.items() for s in lst}
SHORT = {"Animal Handling": "Animal H.", "Intimidation": "Intim.", "Performance": "Perf."}

# Weapon Mastery (PHB 2024 kap. 6). Teksten vises på handlingsarket for de valgte.
MASTERY = {
    "Cleave": "rammer du et væsen i nærkamp, kan du lave ét ekstra angreb mod et andet væsen inden for 5 ft af det første. Ingen ability modifier på skaden. Én gang pr. tur.",
    "Graze": "misser du, tager målet alligevel skade lig din ability modifier (samme skadetype).",
    "Nick": "ekstraangrebet fra <i>Light</i> laves som del af din <i>Attack</i>-handling i stedet for som Bonus Action. Kun én gang pr. tur.",
    "Push": "rammer du, kan du skubbe målet op til 10 ft væk (højst Large).",
    "Sap": "rammer du, har målet ulempe på sit næste angreb før din næste tur.",
    "Slow": "rammer du og gør skade, falder målets fart med 10 ft til starten af din næste tur.",
    "Topple": "rammer du, slår målet CON-save (DC 8 + ability modifier + PB), ellers bliver det <i>Prone</i>.",
    "Vex": "rammer du og gør skade, har du fordel på dit næste angreb mod samme mål inden slutningen af din næste tur.",
}

SITUATIONER = [
    ("Snige, gemme sig, skygge nogen", "Stealth"), ("Lommetyveri, skjule en ting", "Sleight of Hand"),
    ("Balancere, lande blødt, vride sig fri", "Acrobatics"), ("Klatre, svømme, springe, bryde fri", "Athletics"),
    ("Opdage fjender, lyde, fælder (uden at lede)", "Perception"), ("Lede efter fælder, skjulte døre, spor", "Investigation"),
    ("Gennemskue en løgn, læse stemningen", "Insight"), ("Spore, finde vej, finde mad og vand", "Survival"),
    ("Lyve, bluffe, spille en rolle", "Deception"), ("Overtale, forhandle, charmere", "Persuasion"),
    ("True, presse", "Intimidation"), ("Underholde, distrahere", "Performance"),
    ("Stabilisere en døende (DC 10)", "Medicine"), ("Berolige eller styre et dyr", "Animal Handling"),
    ("Magi, runer, magiske væsner", "Arcana"), ("Historie, riger, gamle krige", "History"),
    ("Planter, dyr, vejr, terræn", "Nature"), ("Guder, ritualer, udøde", "Religion"),
]

TILSTANDE = [
    ("Charmed", "Kan ikke angribe den, der charmer dig. Den har fordel på sociale checks mod dig."),
    ("Frightened", "Ulempe på checks og angreb, mens du kan se kilden. Du kan ikke gå tættere på den."),
    ("Grappled", "Fart 0. Ulempe på angreb mod andre end den, der holder dig."),
    ("Incapacitated", "Ingen handlinger, Bonus Actions eller Reactions. Kan ikke tale."),
    ("Invisible", "Fordel på initiativ og på dine angreb. Angreb mod dig har ulempe."),
    ("Poisoned", "Ulempe på angreb og ability checks."),
    ("Prone", "Kun kravle, eller rejs dig for halv fart. Ulempe på dine angreb. Angreb mod dig: fordel inden for 5 ft, ellers ulempe."),
    ("Restrained", "Fart 0. Ulempe på dine angreb og DEX saves. Angreb mod dig har fordel."),
    ("Unconscious", "Prone og Incapacitated. Angreb mod dig har fordel; træf inden for 5 ft er kritiske. Fejler STR/DEX saves."),
    ("Exhaustion", "Pr. niveau: −2 på alle d20-slag og −5 ft fart. Niveau 6: død. Long Rest fjerner ét."),
]

NYTTIGE_TING = [
    "<b>Metalkugler</b> <i>Ball Bearings</i>: <i>Utilize</i>, strø dem ud på et felt på 10×10 ft inden for 10 ft. Første gang en skabning træder ind på feltet på en tur: DEX save DC 10, ellers <i>Prone</i>.",
    "<b>Olie</b> <i>Oil</i>: <i>Utilize</i>, hæld den over et mål. Tager målet ildskade, inden olien tørrer (1 min), får det +5 ild. Hældt ud på jorden og antændt brænder den i 2 runder.",
]


# ---------------------------------------------------------------- hjælpere
def mod(score):
    return (score - 10) // 2


def sgn(n):
    return f"+{n}" if n >= 0 else f"−{abs(n)}"


def make_env(v):
    env = {k: mod(x) for k, x in v["evner"].items()}
    env.update(v.get("mod", {}))          # papirets egne modifiers, hvis de afviger
    env["PB"] = v.get("pb", 2)
    return env


def fmt(text, env, box='<span class="cbx"></span>'):
    if not isinstance(text, str):
        return text
    def rep(m):
        expr = m.group(1)
        signed = expr.startswith("+")
        val = eval(expr.lstrip("+"), {"__builtins__": {}}, env)
        return sgn(val) if signed else str(val)
    return re.sub(r"\{([^{}]+)\}", rep, text).replace("[]", box)


def pretty(expr):
    e = expr.lstrip("+").replace("*", "×")
    e = re.sub(r"\s*\+\s*", " + ", e)
    e = re.sub(r"(?<=\w)\s*-\s*", " − ", e)
    return e


def formula(text, roll=None):
    """'{+DEX+PB}' -> 'd20 + DEX + PB' · '{11+DEX}' -> '11 + DEX' · '1d6{+DEX} stik' -> '1d6 + DEX'."""
    if not isinstance(text, str) or "{" not in text:
        return ""
    whole = re.fullmatch(r"\{([^{}]+)\}", text.strip())
    if whole:
        expr = whole.group(1)
        is_roll = roll if roll is not None else (expr.startswith("+") and expr.lstrip("+") != "PB")
        return ("d20 + " if is_roll else "") + pretty(expr)
    out = re.sub(r"\{([^{}]+)\}", lambda m: (" + " if m.group(1).startswith("+") else "") + pretty(m.group(1)), text)
    return re.sub(r"\s+(stik|slag|hug|skade|ild|gift|kraft|lyn|kulde|nekrotisk)\b.*$", "", out).strip()


def fcell(text, env, roll=None):
    f = formula(text, roll)
    return fmt(text, env) + (f'<small class="f">{f}</small>' if f else "")


def scope_css(css, scope):
    """Sæt '.scope ' foran alle selektorer, så en sides CSS kun gælder den side."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"@page\s*\{[^}]*\}", "", css)
    out, i = [], 0
    while i < len(css):
        j = css.find("{", i)
        if j < 0:
            break
        sel = css[i:j].strip()
        if sel.startswith("@media"):
            depth, k = 1, j + 1
            while depth:
                depth += {"{": 1, "}": -1}.get(css[k], 0)
                k += 1
            out.append(sel + "{" + scope_css(css[j + 1:k - 1], scope) + "}")
            i = k
            continue
        k = css.find("}", j)
        body = css[j + 1:k]
        sels = []
        for s in sel.split(","):
            s = s.strip()
            if s in (":root", "body", "html"):
                sels.append(f".{scope}")
            elif s == "*":
                sels.append(f".{scope}, .{scope} *")
            elif s.startswith(":root"):
                sels.append(f".{scope}{s[5:]}")
            else:
                sels.append(f".{scope} {s}")
        out.append(", ".join(sels) + "{" + body + "}")
        i = k + 1
    return "\n".join(out)


def ident(rows):
    return '<dl class="ident">' + "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in rows) + "</dl>"


# ---------------------------------------------------------------- side 1: karakterark
def s1_li(dot, label, val, bold=False, f=""):
    lab = f"<b>{label}</b>" if bold else label
    v = f"<b>{val}</b>" if bold else val
    fs = f'<span class="sf">{f}</span>' if f else ""
    return f'<li><span><span class="dot {dot}"></span>{lab}</span><span>{fs}{v}</span></li>'


def s1_abilities(v, env):
    pb = env["PB"]
    saves, prof, expert = set(v.get("saves", [])), set(v.get("skills", [])), set(v.get("expertise", []))
    tools = v.get("vaerktoej", {})
    o = []
    for k, dk, c in ABIL:
        m = env[k]
        rows = [f'<li class="save"><span><span class="dot{" p" if k in saves else ""}"></span>Redningskast <em>Save</em></span>'
                f'<span><span class="sf">{k}{"+PB" if k in saves else ""}</span>{sgn(m + (pb if k in saves else 0))}</span></li>']
        run = []

        def flush():
            grp = []                                 # utrænede skills slås sammen, så længe linjen er kort
            for s in run + [None]:
                if s is not None and (not grp or len(" · ".join(SHORT.get(x, x) for x in grp + [s])) <= 22):
                    grp.append(s)
                    continue
                if grp:
                    rows.append(s1_li("", " · ".join(SHORT.get(x, x) if len(grp) > 1 else x for x in grp), sgn(m), f=k))
                grp = [s] if s is not None else []
            run.clear()
        for s in SKILLS[k]:
            if s in expert:
                flush(); rows.append(s1_li("e", s, sgn(m + 2 * pb), bold=True, f=f"{k}+2×PB"))
            elif s in prof:
                flush(); rows.append(s1_li("p", s, sgn(m + pb), f=f"{k}+PB"))
            else:
                run.append(s)
        flush()
        for t in tools.get(k, []):
            navn, niv = (t, "p") if isinstance(t, str) else t
            bonus = m + (2 * pb if niv == "e" else pb if niv == "p" else 0)
            rows.append(s1_li(niv if niv in ("p", "e") else "", f"<em>{navn}</em>", sgn(bonus),
                              f=k + ("+2×PB" if niv == "e" else "+PB" if niv == "p" else "")))
        o.append(f'<div class="ab {c}"><div class="row1"><span class="name">{dk} <em>{k}</em></span>'
                 f'<span class="score">{v["evner"][k]}</span><span class="mod">{sgn(m)}</span></div><ul>{"".join(rows)}</ul></div>')
    return "\n".join(o)


def s1_box(sec, env, cls="small"):
    h = f'<h2>{sec["titel"]}{" <em>· " + sec["undertitel"] + "</em>" if sec.get("undertitel") else ""}</h2>'
    body = '<ul class="t">' + "".join(f"<li>{fmt(p, env)}</li>" for p in sec.get("punkter", [])) + "</ul>"
    return f'<div class="box {cls}">{h}{body}</div>'


def s1_feats(title, items, env):
    o = [f'<div class="box feat small"><h2>{title}</h2>']
    for i, t in enumerate(items):
        last = ' style="margin:0"' if i == len(items) - 1 else ""
        tag = f'<span class="tag">{t["tag"]}</span>' if t.get("tag") else ""
        o.append(f'<p{last}><b>{fmt(t["navn"], env)}</b>{tag}<br>{fmt(t["tekst"], env)}</p>')
    o.append("</div>")
    return "".join(o)


def side1(v):
    env = make_env(v)
    o = ['<section class="pg s1"><div class="page">']
    o.append(f'<header class="head"><div class="name"><h1>{v["navn"]}</h1><span class="epithet">{v.get("version", "")}</span></div>'
             f'{ident(v.get("ident", []))}</header>')
    o.append('<div class="grid top">' + "".join(
        f'<div class="box stat"><div class="lbl">{st[0]}</div><div class="big">{fmt(st[1], env)}</div>'
        + (lambda fl: f'<small class="f">{fl}</small>' if fl else "")(st[2] if len(st) > 2 else formula(st[1]))
        + "</div>" for st in v["stats"]) + "</div>")
    o.append('<div class="grid main"><div>')
    o.append(s1_abilities(v, env))
    o.append(f'<div class="legend"><span class="dot p"></span>trænet <em>(proficient)</em> &nbsp; <span class="dot e"></span>&nbsp;<em>Expertise</em> (dobbelt bonus)'
             f'<br>Slag = <b>d20 + formlen</b>. Modifier = (score − 10) ÷ 2, rundet ned. PB = {sgn(env["PB"])}.</div>')
    if v.get("passiv"):
        o.append('<div class="box"><h2>Passive sanser</h2><div class="kv">' + "".join(
            f"<span>{a}{(lambda fl: f' <small class=\"sf\">{fl}</small>' if fl else '')(formula(b))}</span><b>{fmt(b, env)}</b>"
            for a, b in v["passiv"]) + "</div></div>")
    if v.get("sprog"):
        o.append(f'<div class="box small" style="margin-top:2mm"><h2>Sprog <em>Languages</em></h2>{v["sprog"]}</div>')
    o.append('</div><div class="grid" style="align-content:start">')
    o.append('<div class="box"><h2>Angreb <em>· Attacks</em></h2><table><tr><th>Våben</th><th>Ramme</th><th>Skade</th><th>Noter</th></tr>')
    for n, hit, dmg, note in v.get("angreb", []):
        o.append(f'<tr><td class="n">{fmt(n, env)}</td><td>{fcell(hit, env, roll=True)}</td>'
                 f'<td class="nw">{fcell(dmg, env, roll=False)}</td><td>{fmt(note, env)}</td></tr>')
    o.append("</table></div>")
    mg = v.get("magi")
    if mg:
        o.append(f'<div class="box small"><h2>{mg.get("titel", "Magi <em>· Spellcasting</em>")}</h2><div class="dcs">')
        for d in mg.get("dc", []):
            wide = " wide" if len(mg["dc"]) == 1 else ""
            o.append(f'<div class="dc{wide}"><span>{d["navn"]}</span><b>{fmt(d["slag"], env)}</b> slag · <b>DC {fmt(d["dc"], env)}</b>'
                     f'<small class="f">{formula(d["slag"], roll=True)} · DC = {formula(d["dc"], roll=False)}</small></div>')
        o.append("</div>")
        if mg.get("slots"):
            o.append(f'<div class="slots">{fmt(mg["slots"], env)}</div>')
        o.append('<dl class="spells">' + "".join(f"<dt>{fmt(a, env)}</dt><dd>{fmt(b, env)}</dd>" for a, b in mg.get("liste", [])) + "</dl></div>")
    for r in v.get("regler", []):
        o.append(s1_box(r, env))
    stack = []
    if v.get("bonus"):
        stack.append(s1_feats("Bonus actions", v["bonus"], env))
    for t in v.get("ture", []):
        stack.append(f'<div class="box turn small"><h2>Din tur <em>· {t["undertitel"]}</em></h2><h3>{t["titel"]}</h3><ol>'
                     + "".join(f"<li>{fmt(p, env)}</li>" for p in t["punkter"]) + "</ol></div>")
    feats = s1_feats("Evner &amp; træk <em>· Features</em>", v.get("traek", []), env)
    if stack:
        o.append(f'<div class="grid two">{feats}<div class="grid" style="align-content:start">{"".join(stack)}</div></div>')
    else:
        o.append(feats)
    o.append("</div></div>")
    o.append(f'<div class="foot">{v.get("fod", "")}</div></div></section>')
    return "\n".join(o)


# ---------------------------------------------------------------- side 2: handlingsark
def side2(v, h):
    env = make_env(v)
    sc = v["evner"]
    pb = env["PB"]
    prof, expert = set(v.get("skills", [])), set(v.get("expertise", []))
    speed = v.get("fart", 30)
    hd = v.get("hit_die", 8)
    bonus = h.get("bonus_handlinger", {})
    box = '<span class="box"></span>'

    def sk(e):
        return env[SKILL_ABIL[e]] + (2 * pb if e in expert else pb if e in prof else 0)

    def skt(e):
        mark = "◆" if e in expert else "●" if e in prof else ""
        return f'<span class="sk">{mark}{SHORT.get(e, e) if e == "Animal Handling" else e} <b>{sgn(sk(e))}</b></span>'

    def tag(name):
        return f' <span class="tg">også Bonus Action · {bonus[name]}</span>' if name in bonus else ""

    dc_grab = 8 + env["STR"] + pb
    rows = [
        ("Attack", "Angrib", "Angreb med våben eller ubevæbnet. Se <i>Angreb</i> på side 1.", "d20 + angreb"),
        ("Dash", "Spurt", f"Ekstra bevægelse lig din fart (+{speed} ft).", "—"),
        ("Disengage", "Træk dig", "Ingen <i>Opportunity Attacks</i> mod dig resten af turen.", "—"),
        ("Dodge", "Undvig", "Til din næste tur: angreb mod dig har ulempe, og du har fordel på DEX saves.", "—"),
        ("Help", "Hjælp", "En allieret får fordel på næste check med en skill/et værktøj, du er trænet i, eller på næste angreb mod en fjende inden for 5 ft af dig.", "—"),
        ("Hide", "Gem dig", "Kræver <i>Heavily Obscured</i> eller ¾ dækning og at du er ude af fjenders syn. Lykkes det: <i>Invisible</i>. Dit resultat bliver DC for at finde dig.",
         f"{skt('Stealth')} mod DC 15"),
        ("Influence", "Påvirk", "Få en skabning til at hjælpe dig eller lade være. DC 15, eller dens INT, hvis den tøver.",
         " ".join(skt(e) for e in ["Deception", "Persuasion", "Intimidation", "Performance", "Animal Handling"])),
        ("Magic", "Magi", "Kast en besværgelse eller brug en magisk genstand.", "—"),
        ("Ready", "Afvent", "Vælg en udløser og en handling. Når udløseren sker, bruger du din <i>Reaction</i>.", "—"),
        ("Search", "Søg", "Find noget skjult, eller læs en person eller situation.",
         " ".join(skt(e) for e in ["Perception", "Insight", "Survival", "Medicine"])),
        ("Study", "Undersøg", "Regn noget ud eller husk viden.",
         " ".join(skt(e) for e in ["Investigation", "Arcana", "History", "Nature", "Religion"])),
        ("Utilize", "Brug", "Brug en ikke-magisk genstand: åbn en dør, træk i et håndtag, strø metalkugler.", "—"),
    ]
    o = ['<section class="pg sx"><div class="page">']
    o.append('<header class="head">'
             f'<div class="name"><h1>{v["navn"]}</h1><span class="epithet">Hvad kan jeg gøre?</span></div>'
             + ident(h.get("ident", [["Slag", "d20 + tallet"], ["Fordel", "2 d20, tag højeste"], ["Ulempe", "2 d20, tag laveste"]]))
             + "</header>")
    o.append('<h2>Handlinger <i>Actions</i> · én pr. tur</h2><table class="act"><thead><tr><th>Handling</th><th>Hvad sker der</th><th>Hvad slår du</th></tr></thead><tbody>')
    for en, da, what, roll in rows:
        o.append(f'<tr><td class="an"><b>{da}</b><i>{en}</i></td><td>{what}{tag(en)}</td><td class="ar">{roll}</td></tr>')
    o.append('<tr><td class="an"><b>Modangreb</b><i>Opportunity Attack</i></td><td><i>Reaction</i>: en fjende, du kan se, forlader din rækkevidde → ét nærkampsangreb.</td><td class="ar">d20 + angreb</td></tr>')
    o.append("</tbody></table>")
    o.append('<div class="cols even act-cols"><div class="col">')
    o.append('<h2>Ubevæbnet <i>Unarmed Strike</i></h2><ul class="feat">'
             f'<li><b>Slag</b>: d20 + STR + PB = <b>{sgn(env["STR"] + pb)}</b>. Skade 1 + STR = <b>{max(0, 1 + env["STR"])}</b> slag.</li>'
             f'<li><b>Grapple</b> (hold fast, kræver en fri hånd): mål inden for 5 ft, højst én størrelse større. STR- eller DEX-save mod <b>DC {dc_grab}</b> (8 + STR + PB), ellers <i>Grappled</i>.</li>'
             f'<li><b>Shove</b> (skub): samme DC {dc_grab}. Fejler den, skubber du den 5 ft væk, eller den bliver <i>Prone</i>.</li>'
             f'<li><b>Bliver du grebet</b>: brug din handling på Athletics <b>{sgn(sk("Athletics"))}</b> eller Acrobatics <b>{sgn(sk("Acrobatics"))}</b> mod den andens DC.</li>'
             "</ul>")
    long_j = sc["STR"]
    high_j = max(0, 3 + env["STR"])
    o.append('<h2>Bevægelse <i>Movement</i></h2><ul class="feat">'
             f'<li><b>Fart</b> {speed} ft. Du kan dele bevægelsen før og efter din handling.</li>'
             '<li><b>Klatre, svømme, kravle, svært terræn</b>: hver fod koster 1 ekstra fod.</li>'
             f'<li><b>Rejse dig fra <i>Prone</i></b>: koster halv fart ({speed // 2} ft).</li>'
             f'<li><b>Længdespring</b>: {long_j} ft med 10 ft tilløb, {long_j // 2} ft uden. <b>Højdespring</b>: {high_j} ft med tilløb, {high_j // 2} ft uden. <b>Fald</b>: 1d6 pr. 10 ft, og du lander <i>Prone</i>.</li>'
             "</ul>")
    for ex in h.get("ekstra", []):
        o.append(f'<h2>{ex["titel"]}</h2><ul class="feat">' + "".join(f"<li>{fmt(p, env, box)}</li>" for p in ex["punkter"]) + "</ul>")
    o.append('<h2>Livsredning og hvil</h2><ul class="feat">'
             '<li><b>0 HP</b>: bevidstløs. Hver tur: <i>death save</i>, d20 10+ = succes. 3 succeser: stabil · 3 fiaskoer: død. Nat. 20: 1 HP · nat. 1: to fiaskoer · skade: én fiasko.</li>'
             '<li><b>Stabilisere en anden</b>: Medicine DC 10. <b>Heroic Inspiration</b>: slå én d20 om.</li>'
             f'<li><b>Short Rest</b> (1 t): brug Hit Dice, 1d{hd}{sgn(env["CON"])} HP pr. terning. <b>Long Rest</b> (8 t): alt HP og alle Hit Dice tilbage, −1 <i>Exhaustion</i>.</li>'
             "</ul>")
    ms = v.get("masteries", [])
    if ms:
        o.append('<h2>Weapon Mastery <i>dine valg</i></h2><ul class="feat">'
                 + "".join(f"<li><b>{m}</b> ({w}): {MASTERY.get(m, '')}</li>" for m, w in ms) + "</ul>")
    o.append('<h2>Nyttige ting <i>alle kan købe og bruge</i></h2><ul class="feat">' + "".join(f"<li>{t}</li>" for t in NYTTIGE_TING) + "</ul>")
    o.append('</div><div class="col">')
    o.append('<h2>Hvad slår jeg? <i>Skill checks</i></h2><table class="sit"><tbody>')
    for txt, e in SITUATIONER:
        mark = "◆" if e in expert else "●" if e in prof else "○"
        cls = ' class="p"' if (e in prof or e in expert) else ""
        o.append(f'<tr{cls}><td>{txt}</td><td class="se">{mark} {e}</td><td class="sv">{sgn(sk(e))}</td></tr>')
    for t in h.get("vaerktoej", []):
        k = t["evne"]
        niv = t.get("niveau", "p")
        val = env[k] + (2 * pb if niv == "e" else pb if niv == "p" else 0)
        o.append(f'<tr class="p"><td>{t["brug"]}</td><td class="se">{"◆" if niv == "e" else "●"} {t["navn"]}</td><td class="sv">{sgn(val)}</td></tr>')
    o.append("</tbody></table>")
    o.append('<p class="legend">● trænet · ◆ <i>Expertise</i> · ○ utrænet. DM siger, hvilken skill du skal slå. Passiv værdi = 10 + tallet.</p>')
    o.append('<h2>Tilstande <i>Conditions</i></h2><dl class="cond">' + "".join(f"<dt>{a}</dt><dd>{b}</dd>" for a, b in TILSTANDE) + "</dl>")
    o.append("</div></div>")
    fod = h.get("fod", "Kilde: Player's Handbook 2024 · kap. 1 (handlinger), kap. 6 (Weapon Mastery) og Rules Glossary")
    o.append(f'<footer class="foot"><span>{v["navn"]} · Handlinger og slag</span><span>{fod}</span></footer></div></section>')
    return "\n".join(o)


# ---------------------------------------------------------------- side 3 og 4: udstyr og baggrund
def sections(secs, env):
    out = []
    box = '<span class="box"></span>'
    for sec in secs:
        out.append(f'<h2>{sec["titel"]}</h2>')
        typ = sec.get("type")
        if typ == "penge":
            out.append('<div class="coins">' + "".join(f"<div><span>{c}</span><b></b></div>" for c in ["PP", "GP", "EP", "SP", "CP"]) + "</div>")
            continue
        if typ == "tekst":
            out.append('<div class="prose">' + "".join(f"<p>{fmt(p, env, box)}</p>" for p in sec.get("afsnit", [])) + "</div>")
        elif typ == "fakta":
            out.append('<dl class="facts">' + "".join(
                f"<div><dt>{a}</dt><dd>{fmt(b, env, box) if b else '&nbsp;'}</dd></div>" for a, b in sec.get("felter", [])) + "</dl>")
            continue
        items = "".join(f"<li>{fmt(p, env, box)}</li>" for p in sec.get("punkter", []))
        items += '<li class="blank"></li>' * sec.get("tomme", 0)
        if items:
            out.append(f'<ul class="gear ruled">{items}</ul>')
    return "\n".join(out)


def traening(v):
    """Punkter til 'Træning og valg' på baggrundsarket, hentet fra karakterdata."""
    p = [f"<b>{k}</b>: {t}" for k, t in v.get("kan_bruge", {}).items()]
    if v.get("sprog"):
        p.append(f"<b>Sprog</b>: {v['sprog']}")
    if v.get("skills"):
        p.append("<b>Skills</b>: " + " · ".join(v["skills"]))
    if v.get("expertise"):
        p.append("<b>Expertise</b>: " + " · ".join(v["expertise"]))
    if v.get("masteries"):
        p.append("<b>Weapon Mastery</b>: " + " · ".join(f"{w} (<i>{m}</i>)" for m, w in v["masteries"]) + ". Kan byttes ved Long Rest.")
    for f in v.get("feats", []):
        p.append(f"<b>Feat</b>: {f}")
    return p + v.get("traening_ekstra", [])


def notes_page(g, v, std):
    env = make_env(v)
    g = {"undertitel": std, **g}
    for side in ("venstre", "hoejre"):
        for sec in g.get(side, []):
            if sec.get("type") == "traening":
                sec["punkter"] = traening(v) + sec.get("punkter", [])
                sec["type"] = None
    return f'''<section class="pg sx"><div class="page">
<header class="head"><div class="name"><h1>{g.get("navn", v["navn"])}</h1><span class="epithet">{g["undertitel"]}</span></div>{ident(g.get("ident", []))}</header>
<div class="cols even">
<div class="col">{sections(g.get("venstre", []), env)}</div>
<div class="col">{sections(g.get("hoejre", []), env)}</div>
</div>
<footer class="foot"><span>{g.get("navn", v["navn"])} · {g["undertitel"]}</span><span>{g.get("fod", "")}</span></footer>
</div></section>'''


# ---------------------------------------------------------------- samlet fil
FRAME_CSS = """
*{box-sizing:border-box}
body{margin:0;background:#ddd}
.sheets{display:flex;flex-direction:column;align-items:center;gap:24px;padding:20px 16px}
section.pg{width:794px;height:1123px;overflow:hidden;flex:none;box-shadow:0 1px 6px rgba(0,0,0,.2)}
section.pg.s1,section.pg.sx{background:#fff}
.s1 > .page{padding-top:34px}
.sx > .page{max-width:none;width:923px;height:1306px;zoom:.86;border:0;border-radius:0;box-shadow:none;margin:0}
@page{size:A4;margin:0}
@media print{
  body{background:#fff}
  .sheets{display:block;padding:0}
  section.pg{box-shadow:none;page-break-after:always;break-after:page}
  section.pg:last-child{page-break-after:auto;break-after:auto}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
"""


def build(data, stil=None):
    here = os.path.dirname(os.path.abspath(__file__))

    def css(name):
        s = open(os.path.join(here, f"{name}.css"), encoding="utf-8").read()
        if stil and stil != "farve":
            s += "\n" + open(os.path.join(here, f"{name}-{stil}.css"), encoding="utf-8").read()
        return s
    stil = stil or data.get("stil")
    base = data.get("faelles", {})
    vers = [{**base, **v} for v in data["versioner"]]
    last = vers[-1]
    pages = [side1(v) for v in vers]
    if "handlingsark" in data:
        pages.append(side2(last, data["handlingsark"]))
    if data.get("udstyrsark"):
        pages.append(notes_page(data["udstyrsark"], last, "Udstyr"))
    if data.get("baggrundsark"):
        pages.append(notes_page(data["baggrundsark"], last, "Baggrund og personlighed"))
    titel = data["titel"] + (" sort/hvid" if stil == "sorthvid" else "")
    style = scope_css(css("side1"), "s1") + "\n" + scope_css(css("karakterark"), "sx") + "\n" + FRAME_CSS
    return f'''<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titel}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>
{style}
</style>
</head>
<body>
<main class="sheets">
{chr(10).join(pages)}
</main>
</body>
</html>
'''


if __name__ == "__main__":
    args = sys.argv[1:]
    stil = None
    if "--stil" in args:
        i = args.index("--stil"); stil = args[i + 1]; del args[i:i + 2]
    src = args[0]
    dst = args[1] if len(args) > 1 else os.path.splitext(src)[0] + (f"-{stil}" if stil else "") + ".html"
    data = json.load(open(src, encoding="utf-8"))
    open(dst, "w", encoding="utf-8").write(build(data, stil))
    print(dst)
