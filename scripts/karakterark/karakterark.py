#!/usr/bin/env python3
"""Karakterark (D&D 2024, dansk, A4-print, farve eller sort/hvid).

Brug:  python3 karakterark.py <karakter|mappe|karakter.yaml> [--stil farve|sorthvid|begge] [--ud MAPPE]
  Uden --stil laves begge stile. Output: <ud>/karakterark-farve.html og karakterark-sorthvid.html
  (standard: karakterer/<navn>/udskrifter/). Datafilen er YAML (JSON virker også).

Dataformat: "faelles" holder de fælles felter (navn, evner, pb, ac, hp, ...). "sider" er en liste,
én post pr. side med valgfri "top" (titel, undertitel, ident), "layout" (kolonner, rækker og bokse)
og "foot". Hver boks har en "type", og typen slår op i REGISTRY. Typen bestemmer udseendet.

Stil: side1.css er den fælles stil (side1-sorthvid.css lægges ovenpå i sort/hvid).
Små tegn i teksterne:
  []          -> afkrydsningsfelt
  {+UDTRYK}   -> regnes ud og vises med fortegn, fx {+DEX+PB} -> +5
  {UDTRYK}    -> regnes ud uden fortegn, fx {11+DEX} -> 14
  Udtryk kan bruge STR DEX CON INT WIS CHA (modifiers) og PB.
Formlen bag et tal vises automatisk i lille kursiv under tallet.
"""
import argparse, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import faelles

ABIL =[("STR", "Styrke", "str"), ("DEX", "Smidighed", "dex"), ("CON", "Udholdenhed", "con"),
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
    ("Exhaustion", "Pr. niveau: −2 på alle D20 Tests og −5 ft fart. Niveau 6: død. Long Rest fjerner ét."),
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


EN_SIDST = re.compile(r"^(.+?)\s*<(?:em|i)>([^<]*)</(?:em|i)>(.*)$")


def dansk_engelsk(tekst, env, box='<span class="cbx"></span>'):
    """Dansk navn øverst, engelsk navn i lille skrift under. Engelsk navn skal stå lige efter det danske."""
    m = EN_SIDST.match(tekst)
    if not m:
        return fmt(tekst, env, box)
    return (f'<span class="ge">{fmt(m.group(1), env, box)}<small class="en">{m.group(2)}</small></span>'
            + fmt(m.group(3), env, box))


def gear(tekst, env, box):
    """Udstyrslinje: hvert punkt adskilt af ' · ' får sit eget dansk/engelsk-par."""
    return " · ".join(dansk_engelsk(d, env, box) for d in tekst.split(" · "))


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

        def flush():                                 # utrænede skills: én række pr. skill
            for s in run:
                rows.append(s1_li("", s, sgn(m), f=k))
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



# ---------------------------------------------------------------- bokse
# Hver boks har en type. Typen slår op i REGISTRY (renderer, standardtitel, kort-ramme, lille tekst).
# Renderen returnerer kun indholdet. Den ydre ramme (<div class="box" data-type="...">) lægges af layout_node.

def skills_sets(v):
    return set(v.get("skills", [])), set(v.get("expertise", []))


def sk(v, env, e):
    prof, expert = skills_sets(v)
    pb = env["PB"]
    return env[SKILL_ABIL[e]] + (2 * pb if e in expert else pb if e in prof else 0)


def skt(v, env, e):
    prof, expert = skills_sets(v)
    mark = "◆" if e in expert else "●" if e in prof else ""
    return f'<span class="sk">{mark}{e} <b>{sgn(sk(v, env, e))}</b></span>'


def box_evner(node, v, env):
    legend = ('<div class="legend"><span class="dot p"></span>trænet <em>(proficient)</em> &nbsp; <span class="dot e"></span>&nbsp;<em>Expertise</em> (dobbelt bonus)'
              f'<br>Slag = <b>d20 + formlen</b>. Modifier = (score − 10) ÷ 2, rundet ned. PB = {sgn(env["PB"])}.</div>')
    return f'<div class="abil">{s1_abilities(v, env)}{legend}</div>'


STANDARD_STATS = ("AC", "Max HP", "Hit Dice", "Initiativ", "Fart", "Prof. bonus", "Passiv Perc.")


def box_stats(node, v, env):
    """Stat-rækken øverst. Uden felter bruges standarden ud fra faelles (ac, hp, level, fart, hit_die, evner, skills)."""
    felter = node.get("felter")
    if felter is None:
        hit_die = v.get("hit_die", 8)
        fart = v.get("fart", 30)
        prof, expert = skills_sets(v)
        perc = "+2*PB" if "Perception" in expert else "+PB" if "Perception" in prof else ""
        felter = [
            ["<em>AC</em>", v.get("ac", "{10+DEX}")],
            ["Max HP", str(v.get("hp", "?"))],
            ["<em>Hit Dice</em>", f"{v.get('level', 1)}d{hit_die}", f"1 d{hit_die} pr. level"],
            ["Initiativ", "{+DEX+PB}", "d20 + DEX + PB"],
            ["Fart · <em>Speed</em>", str(fart), f"Dash: {2 * fart}"],
            ["<em>Prof. bonus</em>", "{+PB}", "level 1–4"],
            ["Passiv <em>Perc.</em>", "{10+WIS" + perc + "}"],
        ]
    return '<div class="grid top">' + "".join(
        f'<div class="box stat"><div class="lbl">{st[0]}</div><div class="big">{fmt(st[1], env)}</div>'
        + (lambda fl: f'<small class="f">{fl}</small>' if fl else "")(st[2] if len(st) > 2 else formula(st[1]))
        + "</div>" for st in felter) + "</div>"


def box_passiv(node, v, env):
    rows = []
    for a, b in node.get("punkter", []):
        fl = formula(b)
        flag = f' <small class="sf">{fl}</small>' if fl else ""
        rows.append(f"<span>{a}{flag}</span><b>{fmt(b, env)}</b>")
    return f'<h2>{node["titel"]}</h2><div class="kv">{"".join(rows)}</div>'


def box_sprog(node, v, env):
    return f'<h2>{node["titel"]}</h2>{fmt(node["tekst"], env)}'


def box_angreb(node, v, env):
    o = [f'<h2>{node["titel"]}</h2><table><tr><th>Våben</th><th>Ramme</th><th>Skade</th><th>Noter</th></tr>']
    for n, hit, dmg, note in node.get("angreb", []):
        o.append(f'<tr><td class="n">{dansk_engelsk(n, env)}</td><td>{fcell(hit, env, roll=True)}</td>'
                 f'<td class="nw">{fcell(dmg, env, roll=False)}</td><td>{fmt(note, env)}</td></tr>')
    o.append("</table>")
    return "".join(o)


def box_regler(node, v, env):
    h = f'<h2>{node["titel"]}{" <em>· " + node["undertitel"] + "</em>" if node.get("undertitel") else ""}</h2>'
    return h + '<ul class="t">' + "".join(f"<li>{fmt(p, env)}</li>" for p in node.get("punkter", [])) + "</ul>"


def box_traek(node, v, env):
    """Træk og bonus-handlinger: navn, valgfri tag og tekst pr. punkt."""
    o = [f'<h2>{node["titel"]}</h2>']
    items = node.get("punkter", [])
    for i, t in enumerate(items):
        last = ' style="margin:0"' if i == len(items) - 1 else ""
        tag = f'<span class="tag">{t["tag"]}</span>' if t.get("tag") else ""
        o.append(f'<p{last}><b>{fmt(t["navn"], env)}</b>{tag}<br>{fmt(t["tekst"], env)}</p>')
    return "".join(o)


def box_tur(node, v, env):
    return (f'<h2>Din tur <em>· {node["undertitel"]}</em></h2><h3>{node["titel"]}</h3><ol>'
            + "".join(f"<li>{fmt(p, env)}</li>" for p in node.get("punkter", [])) + "</ol>")


def box_handlinger(node, v, env):
    """Handlingstabellen (side 2). bonus: kobler Bonus Action-tags på handlingerne."""
    speed = v.get("fart", 30)
    bonus = node.get("bonus", {})

    def tag(name):
        return f' <span class="tg">også Bonus Action · {bonus[name]}</span>' if name in bonus else ""
    rows = [
        ("Attack", "Angrib", "Angreb med våben eller ubevæbnet. Se <i>Angreb</i> på side 1.", "d20 + angreb"),
        ("Dash", "Spurt", f"Ekstra bevægelse lig din fart (+{speed} ft).", "—"),
        ("Disengage", "Træk dig", "Ingen <i>Opportunity Attacks</i> mod dig resten af turen.", "—"),
        ("Dodge", "Undvig", "Til din næste tur: angreb mod dig har ulempe, og du har fordel på DEX saves.", "—"),
        ("Help", "Hjælp", "En allieret får fordel på næste check med en skill/et værktøj, du er trænet i, eller på næste angreb mod en fjende inden for 5 ft af dig.", "—"),
        ("Hide", "Gem dig", "Kræver <i>Heavily Obscured</i> eller ¾ dækning og at du er ude af fjenders syn. Lykkes det: <i>Invisible</i>. Dit resultat bliver DC for at finde dig.",
         f"{skt(v, env, 'Stealth')} mod DC 15"),
        ("Influence", "Påvirk", "Få en skabning til at hjælpe dig eller lade være. DC 15, eller dens INT, hvis den tøver.",
         " ".join(skt(v, env, e) for e in ["Deception", "Persuasion", "Intimidation", "Performance", "Animal Handling"])),
        ("Magic", "Magi", "Kast en besværgelse eller brug en magisk genstand.", "—"),
        ("Ready", "Afvent", "Vælg en udløser og en handling. Når udløseren sker, bruger du din <i>Reaction</i>.", "—"),
        ("Search", "Søg", "Find noget skjult, eller læs en person eller situation.",
         " ".join(skt(v, env, e) for e in ["Perception", "Insight", "Survival", "Medicine"])),
        ("Study", "Undersøg", "Regn noget ud eller husk viden.",
         " ".join(skt(v, env, e) for e in ["Investigation", "Arcana", "History", "Nature", "Religion"])),
        ("Utilize", "Brug", "Brug en ikke-magisk genstand: åbn en dør, træk i et håndtag, strø metalkugler.", "—"),
    ]
    o = ['<h2>Handlinger <i>Actions</i> · én pr. tur</h2><table class="act"><thead><tr><th>Handling</th><th>Hvad sker der</th><th>Hvad slår du</th></tr></thead><tbody>']
    for en, da, what, roll in rows:
        o.append(f'<tr><td class="an"><b>{da}</b><i>{en}</i></td><td>{what}{tag(en)}</td><td class="ar">{roll}</td></tr>')
    o.append('<tr><td class="an"><b>Modangreb</b><i>Opportunity Attack</i></td><td><i>Reaction</i>: en fjende, du kan se, forlader din rækkevidde → ét nærkampsangreb.</td><td class="ar">d20 + angreb</td></tr>')
    o.append("</tbody></table>")
    return "".join(o)


def box_ubevaebnet(node, v, env):
    pb = env["PB"]
    dc_grab = 8 + env["STR"] + pb
    return (f'<h2>{node["titel"]}</h2><ul class="t">'
            f'<li><b>Slag</b>: d20 + STR + PB = <b>{sgn(env["STR"] + pb)}</b>. Skade 1 + STR = <b>{max(0, 1 + env["STR"])}</b> slag.</li>'
            f'<li><b>Grapple</b> (hold fast, kræver en fri hånd): mål inden for 5 ft, højst én størrelse større. STR- eller DEX-save mod <b>DC {dc_grab}</b> (8 + STR + PB), ellers <i>Grappled</i>.</li>'
            f'<li><b>Shove</b> (skub): samme DC {dc_grab}. Fejler den, skubber du den 5 ft væk, eller den bliver <i>Prone</i>.</li>'
            f'<li><b>Bliver du grebet</b>: brug din handling på Athletics <b>{sgn(sk(v, env, "Athletics"))}</b> eller Acrobatics <b>{sgn(sk(v, env, "Acrobatics"))}</b> mod den andens DC.</li>'
            "</ul>")


def box_bevaegelse(node, v, env):
    speed = v.get("fart", 30)
    long_j = v["evner"]["STR"]
    high_j = max(0, 3 + env["STR"])
    return (f'<h2>{node["titel"]}</h2><ul class="t">'
            f'<li><b>Fart</b> {speed} ft. Du kan dele bevægelsen før og efter din handling.</li>'
            '<li><b>Klatre, svømme, kravle, svært terræn</b>: hver ft koster 1 ekstra ft.</li>'
            f'<li><b>Rejse dig fra <i>Prone</i></b>: koster halv fart ({speed // 2} ft).</li>'
            f'<li><b>Længdespring</b>: {long_j} ft med 10 ft tilløb, {long_j // 2} ft uden. <b>Højdespring</b>: {high_j} ft med tilløb, {high_j // 2} ft uden. <b>Fald</b>: 1d6 pr. 10 ft, og du lander <i>Prone</i>.</li>'
            "</ul>")


def box_ekstra(node, v, env):
    return f'<h2>{node["titel"]}</h2><ul class="t">' + "".join(f"<li>{fmt(p, env)}</li>" for p in node.get("punkter", [])) + "</ul>"


def box_livsredning(node, v, env):
    hd = v.get("hit_die", 8)
    return (f'<h2>{node["titel"]}</h2><ul class="t">'
            '<li><b>0 HP</b>: bevidstløs. Hver tur: <i>death save</i>, d20 10+ = succes. 3 succeser: stabil · 3 fiaskoer: død. Nat. 20: 1 HP · nat. 1: to fiaskoer · skade: én fiasko.</li>'
            '<li><b>Stabilisere en anden</b>: Medicine DC 10. <b>Heroic Inspiration</b>: slå én d20 om.</li>'
            f'<li><b>Short Rest</b> (1 t): brug Hit Dice, 1d{hd}{sgn(env["CON"])} HP pr. terning. <b>Long Rest</b> (8 t): alt HP og alle Hit Dice tilbage, −1 <i>Exhaustion</i>.</li>'
            "</ul>")


def box_mastery(node, v, env):
    ms = v.get("masteries", [])
    if not ms:
        return ""
    return (f'<h2>{node["titel"]}</h2><ul class="t">'
            + "".join(f"<li><b>{m}</b> ({w}): {MASTERY.get(m, '')}</li>" for m, w in ms) + "</ul>")


def box_nyttige(node, v, env):
    return (f'<h2>{node["titel"]}</h2><ul class="t">'
            + "".join(f"<li>{t}</li>" for t in NYTTIGE_TING) + "</ul>")


def box_situationer(node, v, env):
    prof, expert = skills_sets(v)
    o = [f'<h2>{node["titel"]}</h2><table class="sit"><tbody>']
    for txt, e in SITUATIONER:
        mark = "◆" if e in expert else "●" if e in prof else "○"
        cls = ' class="p"' if (e in prof or e in expert) else ""
        o.append(f'<tr{cls}><td>{txt}</td><td class="se">{mark} {e}</td><td class="sv">{sgn(sk(v, env, e))}</td></tr>')
    for t in node.get("vaerktoej", []):
        k = t["evne"]
        niv = t.get("niveau", "p")
        val = env[k] + (2 * env["PB"] if niv == "e" else env["PB"] if niv == "p" else 0)
        o.append(f'<tr class="p"><td>{t["brug"]}</td><td class="se">{"◆" if niv == "e" else "●"} {t["navn"]}</td><td class="sv">{sgn(val)}</td></tr>')
    o.append("</tbody></table>")
    o.append('<p class="legend">● trænet · ◆ <i>Expertise</i> · ○ utrænet. DM siger, hvilken skill du skal slå. Passiv værdi = 10 + tallet.</p>')
    return "".join(o)


def box_tilstande(node, v, env):
    return (f'<h2>{node["titel"]}</h2><dl class="cond">'
            + "".join(f"<dt>{a}</dt><dd>{b}</dd>" for a, b in TILSTANDE) + "</dl>")


# ---- sider 3–4: faste kategorier. Standardtitlen gælder, hvis boksen ikke selv angiver titel.
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


CBX = '<span class="cbx"></span>'


def _h2(node):
    return f'<h2>{node["titel"]}</h2>' if node.get("titel") else ""


def _liste(punkter, tomme, env):
    items = "".join(f"<li>{gear(p, env, CBX)}</li>" for p in punkter)
    items += '<li class="blank"></li>' * tomme
    return f'<ul class="ruled">{items}</ul>' if items else ""


def box_liste(node, v, env):
    return _h2(node) + _liste(node.get("punkter", []), node.get("tomme", 0), env)


def box_traening(node, v, env):
    return _h2(node) + _liste(traening(v) + node.get("punkter", []), node.get("tomme", 0), env)


def box_penge(node, v, env):
    return _h2(node) + '<div class="coins">' + "".join(f"<div><span>{c}</span><b></b></div>" for c in ["PP", "GP", "EP", "SP", "CP"]) + "</div>"


def box_tekst(node, v, env):
    return _h2(node) + '<div class="prose">' + "".join(f"<p>{fmt(p, env)}</p>" for p in node.get("afsnit", [])) + "</div>"


def box_fakta(node, v, env):
    return _h2(node) + ('<dl class="facts">' + "".join(
        f"<div><dt>{a}</dt><dd>{fmt(b, env) if b else '&nbsp;'}</dd></div>" for a, b in node.get("felter", [])) + "</dl>")


def _reg(fn, titel=None, card=True, small=False):
    return {"fn": fn, "titel": titel, "card": card, "small": small}


# Alle typer. card=False: boksen har selv sin ramme (evner, stats) eller er en fuld-bredde tabel (handlinger).
# small=True: mindre skrift (som de smalle bokse på side 1).
REGISTRY = {
    # side 1
    "evner": _reg(box_evner, card=False),
    "stats": _reg(box_stats, card=False),
    "passiv": _reg(box_passiv),
    "sprog": _reg(box_sprog, small=True),
    "angreb": _reg(box_angreb),
    "regler": _reg(box_regler, small=True),
    "traek": _reg(box_traek, small=True),
    "bonus": _reg(box_traek, small=True),
    "tur": _reg(box_tur, small=True),
    # side 2
    "handlinger": _reg(box_handlinger, card=False),
    "ubevaebnet": _reg(box_ubevaebnet, "Ubevæbnet <i>Unarmed Strike</i>"),
    "bevaegelse": _reg(box_bevaegelse, "Bevægelse <i>Movement</i>"),
    "ekstra": _reg(box_ekstra),
    "livsredning": _reg(box_livsredning, "Livsredning og hvil"),
    "mastery": _reg(box_mastery, "Weapon Mastery <i>dine valg</i>"),
    "nyttige": _reg(box_nyttige, "Nyttige ting <i>alle kan købe og bruge</i>"),
    "situationer": _reg(box_situationer, "Hvad slår jeg? <i>Skill checks</i>"),
    "tilstande": _reg(box_tilstande, "Tilstande <i>Conditions</i>"),
    # sider 3–4: faste kategorier
    "vaaben": _reg(box_liste, "Våben og rustning"),
    "udstyr": _reg(box_liste, "Udstyr <i>Equipment</i>"),
    "sarlige": _reg(box_liste, "Særlige genstande"),
    "penge": _reg(box_penge, "Penge <i>Coins</i>"),
    "kampagne": _reg(box_liste, "Kampagne og mission"),
    "steder": _reg(box_liste, "Steder"),
    "personer": _reg(box_liste, "Personer og væsner"),
    "udseende": _reg(box_fakta, "Udseende <i>Appearance</i>"),
    "kendetegn": _reg(box_liste, "Kendetegn"),
    "historie": _reg(box_tekst, "Historie <i>Backstory</i>"),
    "traening": _reg(box_traening, "Træning og valg <i>Proficiencies</i>"),
    "personlighed": _reg(box_liste, "Personlighed"),
    "familie": _reg(box_liste, "Familie og venner"),
    "fjender": _reg(box_liste, "Fjender og rivaler"),
    "maal": _reg(box_liste, "Mål og drømme"),
    "hemmeligheder": _reg(box_liste, "Hemmeligheder"),
    # frie typer: titlen skrives i YAML
    "liste": _reg(box_liste),
    "tekst": _reg(box_tekst),
    "fakta": _reg(box_fakta),
}


def layout_node(node, v, env):
    """Én node i layout-træet: en kolonne-gruppe, en række-stak eller en boks."""
    if "kolonner" in node:
        cols = "".join(
            f'<div class="kol" style="--bredde:{k.get("bredde", 1)}">{layout_stack(k.get("indhold", []), v, env)}</div>'
            for k in node["kolonner"])
        return f'<div class="kolonner">{cols}</div>'
    if "raekker" in node:
        return f'<div class="raekker">{layout_stack(node["raekker"], v, env)}</div>'
    typ = node.get("type")
    if typ not in REGISTRY:
        raise ValueError(f"Ukendt boks-type i layout: {typ!r}. Kendte typer: {', '.join(REGISTRY)}.")
    reg = REGISTRY[typ]
    data = node if reg["titel"] is None else {"titel": reg["titel"], **node}
    inner = reg["fn"](data, v, env)
    if not inner or not reg["card"]:
        return inner
    cls = "box small" if reg["small"] else "box"
    return f'<div class="{cls}" data-type="{typ}">{inner}</div>'


def layout_stack(nodes, v, env):
    return "".join(layout_node(n, v, env) for n in nodes)


def page(p, v, env):
    """Én side: valgfri top (titel, undertitel, ident), layout og foot."""
    head = ""
    if "top" in p:
        top = p["top"] or {}
        head = (f'<header class="head"><div class="name"><h1>{top.get("titel", v["navn"])}</h1>'
                f'<span class="epithet">{top.get("undertitel", "")}</span></div>'
                f'{ident(top.get("ident", v.get("ident", [])))}</header>')
    body = f'<div class="layout">{layout_stack(p.get("layout", []), v, env)}</div>'
    foot = f'<div class="foot">{p.get("foot", "")}</div>' if p.get("foot") else ""
    return f'<section class="pg s1"><div class="page">{head}{body}{foot}</div></section>'


# ---------------------------------------------------------------- samlet fil
FRAME_CSS = """
*{box-sizing:border-box}
body{margin:0;background:#ddd}
.sheets{display:flex;flex-direction:column;align-items:center;gap:24px;padding:20px 16px}
section.pg{width:794px;height:1123px;overflow:hidden;flex:none;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.2)}
.s1 > .page{padding-top:34px}
@page{size:A4;margin:0}
@media screen and (max-width:820px){
  .sheets{padding:8px}
  section.pg{width:100%;height:auto;overflow:visible}
  .s1 > .page{width:auto;margin:0 auto}
}
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
    v = data["faelles"]
    env = make_env(v)
    pages = [page(p, v, env) for p in data.get("sider", [])]
    titel = data.get("titel", v["navn"])
    style = scope_css(css("side1"), "s1") + "\n" + FRAME_CSS
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


def lav(kilde, stil=None, ud_mappe=None):
    """Lav karakterark-HTML i de valgte stile. Returnerer listen af filer."""
    src = faelles.find_fil(kilde, "karakter")
    data = faelles.indlaes(src)
    filer = []
    for s in faelles.stile(stil):
        dst = faelles.ud_sti(src, "karakterark", s, ".html", ud_mappe)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(build(data, s))
        filer.append(dst)
    return filer


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Lav karakterark-HTML (A4, alle sider i én fil).")
    ap.add_argument("kilde", help="karakternavn (fx valak), mappe eller sti til karakter.yaml")
    ap.add_argument("--stil", choices=["farve", "sorthvid", "begge"], default="begge")
    ap.add_argument("--ud", help="mappe til outputfiler (standard: karakterer/<navn>/udskrifter/)")
    a = ap.parse_args()
    for f in lav(a.kilde, a.stil, a.ud):
        print(f)
