"""Karakterark-renderer for det NYE system: character.yaml + sheets.yaml -> HTML.

Engelsk port af scripts/karakterark/karakterark.py's rendering-motor (samme
funktioner, samme boks-registry-mønster, samme CSS) - men læser character.yaml/
sheets.yaml DIREKTE, uden en mellemliggende dansk oversættelse. Se
docs/character-yaml.md og docs/sheets-yaml.md for felt-formaterne.

scripts/karakterark/karakterark.py ændres ikke af dette og bruges stadig af
de 8 håndskrevne spillerkarakterer (karakter.yaml) - de to renderere er
bevidst uafhængige kopier under overgangen, se docs/karakterark-bygger-plan.md.

Dansk/engelsk-regel (se AGENTS.md's navnekonvention): kun teksten SPILLEREN
ser (overskrifter, labels) er dansk. Alt andet - funktions-/variabelnavne,
YAML-feltnavne på character/sheets - er engelsk.
"""
from __future__ import annotations

import os
import re

ABILITY_ROWS = [("STR", "Styrke", "str"), ("DEX", "Smidighed", "dex"), ("CON", "Udholdenhed", "con"),
                ("INT", "Intelligens", "int"), ("WIS", "Visdom", "wis"), ("CHA", "Karisma", "cha")]
SKILLS = {
    "STR": ["athletics"],
    "DEX": ["acrobatics", "sleight of hand", "stealth"],
    "CON": [],
    "INT": ["arcana", "history", "investigation", "nature", "religion"],
    "WIS": ["animal handling", "insight", "medicine", "perception", "survival"],
    "CHA": ["deception", "intimidation", "performance", "persuasion"],
}
SKILL_DISPLAY = {
    "athletics": "Athletics", "acrobatics": "Acrobatics", "sleight of hand": "Sleight of Hand", "stealth": "Stealth",
    "arcana": "Arcana", "history": "History", "investigation": "Investigation", "nature": "Nature", "religion": "Religion",
    "animal handling": "Animal Handling", "insight": "Insight", "medicine": "Medicine", "perception": "Perception", "survival": "Survival",
    "deception": "Deception", "intimidation": "Intimidation", "performance": "Performance", "persuasion": "Persuasion",
}
SKILL_ABILITY = {s: k for k, lst in SKILLS.items() for s in lst}

# character["can_use"]'s nøgler er interne engelske feltnavne (armor/weapons/
# tools) - til "Træning og valg" skal spilleren se de danske labels.
CAN_USE_DISPLAY = {"armor": "Rustning", "weapons": "Våben", "tools": "Værktøj"}

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

SKILL_CHECK_SITUATIONS = [
    ("Snige, gemme sig, skygge nogen", "stealth"), ("Lommetyveri, skjule en ting", "sleight of hand"),
    ("Balancere, lande blødt, vride sig fri", "acrobatics"), ("Klatre, svømme, springe, bryde fri", "athletics"),
    ("Opdage fjender, lyde, fælder (uden at lede)", "perception"), ("Lede efter fælder, skjulte døre, spor", "investigation"),
    ("Gennemskue en løgn, læse stemningen", "insight"), ("Spore, finde vej, finde mad og vand", "survival"),
    ("Lyve, bluffe, spille en rolle", "deception"), ("Overtale, forhandle, charmere", "persuasion"),
    ("True, presse", "intimidation"), ("Underholde, distrahere", "performance"),
    ("Stabilisere en døende (DC 10)", "medicine"), ("Berolige eller styre et dyr", "animal handling"),
    ("Magi, runer, magiske væsner", "arcana"), ("Historie, riger, gamle krige", "history"),
    ("Planter, dyr, vejr, terræn", "nature"), ("Guder, ritualer, udøde", "religion"),
]

CONDITIONS = [
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

USEFUL_ITEMS = [
    "<b>Metalkugler</b> <i>Ball Bearings</i>: <i>Utilize</i>, strø dem ud på et felt på 10×10 ft inden for 10 ft. Første gang en skabning træder ind på feltet på en tur: DEX save DC 10, ellers <i>Prone</i>.",
    "<b>Olie</b> <i>Oil</i>: <i>Utilize</i>, hæld den over et mål. Tager målet ildskade, inden olien tørrer (1 min), får det +5 ild. Hældt ud på jorden og antændt brænder den i 2 runder.",
]


# ---------------------------------------------------------------- hjælpere
def mod(score: int) -> int:
    return (score - 10) // 2


def sign(n: int) -> str:
    return f"+{n}" if n >= 0 else f"−{abs(n)}"


def make_env(character: dict) -> dict:
    env = {k: mod(x) for k, x in character.get("abilities", {}).items()}
    env["PB"] = character.get("proficiency_bonus", 2)
    return env


def fmt(text, env, box='<span class="cbx"></span>'):
    if not isinstance(text, str):
        return text

    def rep(m):
        expr = m.group(1)
        signed = expr.startswith("+")
        val = eval(expr.lstrip("+"), {"__builtins__": {}}, env)
        return sign(val) if signed else str(val)
    return re.sub(r"\{([^{}]+)\}", rep, text).replace("[]", box)


def pretty(expr: str) -> str:
    e = expr.lstrip("+").replace("*", "×")
    e = re.sub(r"\s*\+\s*", " + ", e)
    e = re.sub(r"(?<=\w)\s*-\s*", " − ", e)
    return e


def formula(text, roll=None) -> str:
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


def dual_name(text, env, box='<span class="cbx"></span>'):
    """Dansk navn øverst, engelsk navn i lille skrift under. Engelsk navn skal stå lige efter det danske."""
    m = EN_SIDST.match(text)
    if not m:
        return fmt(text, env, box)
    space = "" if m.group(1).endswith("(") else " "  # ingen mellemrum efter en parentes: Shortsword (Vex)
    return (f'<span class="ge">{fmt(m.group(1), env, box)}{space}<small class="en">{m.group(2)}</small></span>'
            + fmt(m.group(3), env, box))


def gear_line(text, env, box):
    """Udstyrslinje: hvert punkt adskilt af ' · ' får sit eget dansk/engelsk-par."""
    return " · ".join(dual_name(d, env, box) for d in text.split(" · "))


def formula_cell(text, env, roll=None):
    f = formula(text, roll)
    return fmt(text, env) + (f'<small class="f">{f}</small>' if f else "")


def scope_css(css: str, scope: str) -> str:
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


def ident(rows) -> str:
    return '<dl class="ident">' + "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in rows) + "</dl>"


# ---------------------------------------------------------------- side 1: karakterark
def _skill_row(dot, label, val, bold=False, f=""):
    lab = f"<b>{label}</b>" if bold else label
    v = f"<b>{val}</b>" if bold else val
    fs = f'<span class="sf">{f}</span>' if f else ""
    return f'<li><span><span class="dot {dot}"></span>{lab}</span><span>{fs}{v}</span></li>'


def render_abilities(character: dict, env: dict) -> str:
    pb = env["PB"]
    saves = {s.upper() for s in character.get("saves", [])}
    prof = {s.lower() for s in character.get("skills", [])}
    expert = {s.lower() for s in character.get("expertise", [])}
    tools = character.get("tools", {})
    tools = tools if isinstance(tools, dict) else {}  # endnu ikke grupperet pr. evne, se docs/character-yaml.md
    o = []
    for k, dk, c in ABILITY_ROWS:
        m = env[k]
        rows = [f'<li class="save"><span><span class="dot{" p" if k in saves else ""}"></span>Redningskast <em>Save</em></span>'
                f'<span><span class="sf">{k}{"+PB" if k in saves else ""}</span>{sign(m + (pb if k in saves else 0))}</span></li>']
        run = []

        def flush():  # utrænede skills: én række pr. skill
            for s in run:
                rows.append(_skill_row("", SKILL_DISPLAY[s], sign(m), f=k))
            run.clear()
        for s in SKILLS[k]:
            if s in expert:
                flush(); rows.append(_skill_row("e", SKILL_DISPLAY[s], sign(m + 2 * pb), bold=True, f=f"{k}+2×PB"))
            elif s in prof:
                flush(); rows.append(_skill_row("p", SKILL_DISPLAY[s], sign(m + pb), f=f"{k}+PB"))
            else:
                run.append(s)
        flush()
        for t in tools.get(k, []):
            name, level = (t, "p") if isinstance(t, str) else t
            bonus = m + (2 * pb if level == "e" else pb if level == "p" else 0)
            rows.append(_skill_row(level if level in ("p", "e") else "", f"<em>{name}</em>", sign(bonus),
                                    f=k + ("+2×PB" if level == "e" else "+PB" if level == "p" else "")))
        o.append(f'<div class="ab {c}"><div class="row1"><span class="name">{dk} <em>{k}</em></span>'
                 f'<span class="score">{character["abilities"][k]}</span><span class="mod">{sign(m)}</span></div><ul>{"".join(rows)}</ul></div>')
    return "\n".join(o)


# ---------------------------------------------------------------- bokse
# Hver boks har en type. Typen slår op i REGISTRY (renderer, standardtitel, kort-ramme, lille tekst).
# Renderen returnerer kun indholdet. Den ydre ramme (<div class="box" data-type="...">) lægges af layout_node.

def skill_sets(character: dict) -> tuple[set, set]:
    return {s.lower() for s in character.get("skills", [])}, {s.lower() for s in character.get("expertise", [])}


def skill_bonus(character: dict, env: dict, skill: str) -> int:
    prof, expert = skill_sets(character)
    skill = skill.lower()
    pb = env["PB"]
    return env[SKILL_ABILITY[skill]] + (2 * pb if skill in expert else pb if skill in prof else 0)


def skill_tag(character: dict, env: dict, skill: str) -> str:
    prof, expert = skill_sets(character)
    mark = "◆" if skill.lower() in expert else "●" if skill.lower() in prof else ""
    return f'<span class="sk">{mark}{SKILL_DISPLAY.get(skill.lower(), skill)} <b>{sign(skill_bonus(character, env, skill))}</b></span>'


def box_abilities(node, character, env):
    legend = ('<div class="legend"><span class="dot p"></span>trænet <em>(proficient)</em> &nbsp; <span class="dot e"></span>&nbsp;<em>Expertise</em> (dobbelt bonus)'
              f'<br>Slag = <b>d20 + formlen</b>. Modifier = (score − 10) ÷ 2, rundet ned. PB = {sign(env["PB"])}.</div>')
    return f'<div class="abil">{render_abilities(character, env)}{legend}</div>'


def box_stats(node, character, env):
    """Stat-rækken øverst. Uden fields bruges standarden ud fra character (ac, hp, level, speed, hit_die, abilities, skills)."""
    fields = node.get("fields")
    if fields is None:
        hit_die = character.get("hit_die", 8)
        speed = character.get("speed", 30)
        prof, expert = skill_sets(character)
        perc = "+2*PB" if "perception" in expert else "+PB" if "perception" in prof else ""
        fields = [
            ["<em>AC</em>", character.get("ac", "{10+DEX}")],
            ["Max HP", str(character.get("hp", "?"))],
            ["<em>Hit Dice</em>", f"{character.get('level', 1)}d{hit_die}", f"1 d{hit_die} pr. level"],
            ["Initiativ", "{+DEX+PB}", "d20 + DEX + PB"],
            ["Fart · <em>Speed</em>", str(speed), f"Dash: {2 * speed}"],
            ["<em>Prof. bonus</em>", "{+PB}", "level 1–4"],
            ["Passiv <em>Perc.</em>", "{10+WIS" + perc + "}"],
        ]
    return '<div class="grid top">' + "".join(
        f'<div class="box stat"><div class="lbl">{field[0]}</div><div class="big">{fmt(field[1], env)}</div>'
        + (lambda fl: f'<small class="f">{fl}</small>' if fl else "")(field[2] if len(field) > 2 else formula(field[1]))
        + "</div>" for field in fields) + "</div>"


def box_passive(node, character, env):
    rows = []
    for a, b in node.get("items", []):
        fl = formula(b)
        flag = f' <small class="sf">{fl}</small>' if fl else ""
        rows.append(f"<span>{a}{flag}</span><b>{fmt(b, env)}</b>")
    return f'<h2>{node["title"]}</h2><div class="kv">{"".join(rows)}</div>'


def box_languages(node, character, env):
    return f'<h2>{node["title"]}</h2>{fmt(node["text"], env)}'


def box_attacks(node, character, env):
    o = [f'<h2>{node["title"]}</h2><table><tr><th>Våben</th><th>Ramme</th><th>Skade</th><th>Noter</th></tr>']
    for n, hit, dmg, note in node.get("attacks", []):
        o.append(f'<tr><td class="n">{dual_name(n, env)}</td><td>{formula_cell(hit, env, roll=True)}</td>'
                 f'<td class="nw">{formula_cell(dmg, env, roll=False)}</td><td>{fmt(note, env)}</td></tr>')
    o.append("</table>")
    return "".join(o)


def box_rules(node, character, env):
    h = f'<h2>{node["title"]}{" <em>· " + node["subtitle"] + "</em>" if node.get("subtitle") else ""}</h2>'
    return h + '<ul class="t">' + "".join(f"<li>{fmt(p, env)}</li>" for p in node.get("items", [])) + "</ul>"


def box_features(node, character, env):
    """Træk og bonus-handlinger: name, valgfri tag og text pr. item."""
    o = [f'<h2>{node["title"]}</h2>']
    items = node.get("items", [])
    for i, t in enumerate(items):
        last = ' style="margin:0"' if i == len(items) - 1 else ""
        tag = f'<span class="tag">{t["tag"]}</span>' if t.get("tag") else ""
        o.append(f'<p{last}><b>{fmt(t["name"], env)}</b>{tag}<br>{fmt(t["text"], env)}</p>')
    return "".join(o)


def box_turn(node, character, env):
    return (f'<h2>Din tur <em>· {node["subtitle"]}</em></h2><h3>{node["title"]}</h3><ol>'
            + "".join(f"<li>{fmt(p, env)}</li>" for p in node.get("items", [])) + "</ol>")


def box_actions(node, character, env):
    """Handlingstabellen (side 2). bonus: kobler Bonus Action-tags på handlingerne."""
    speed = character.get("speed", 30)
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
         f"{skill_tag(character, env, 'stealth')} mod DC 15"),
        ("Influence", "Påvirk", "Få en skabning til at hjælpe dig eller lade være. DC 15, eller dens INT, hvis den tøver.",
         " ".join(skill_tag(character, env, e) for e in ["deception", "persuasion", "intimidation", "performance", "animal handling"])),
        ("Magic", "Magi", "Kast en besværgelse eller brug en magisk genstand.", "—"),
        ("Ready", "Afvent", "Vælg en udløser og en handling. Når udløseren sker, bruger du din <i>Reaction</i>.", "—"),
        ("Search", "Søg", "Find noget skjult, eller læs en person eller situation.",
         " ".join(skill_tag(character, env, e) for e in ["perception", "insight", "survival", "medicine"])),
        ("Study", "Undersøg", "Regn noget ud eller husk viden.",
         " ".join(skill_tag(character, env, e) for e in ["investigation", "arcana", "history", "nature", "religion"])),
        ("Utilize", "Brug", "Brug en ikke-magisk genstand: åbn en dør, træk i et håndtag, strø metalkugler.", "—"),
    ]
    o = ['<h2>Handlinger <i>Actions</i> · én pr. tur</h2><table class="act"><thead><tr><th>Handling</th><th>Hvad sker der</th><th>Hvad slår du</th></tr></thead><tbody>']
    for en, da, what, roll in rows:
        o.append(f'<tr><td class="an"><b>{da}</b><i>{en}</i></td><td>{what}{tag(en)}</td><td class="ar">{roll}</td></tr>')
    o.append('<tr><td class="an"><b>Modangreb</b><i>Opportunity Attack</i></td><td><i>Reaction</i>: en fjende, du kan se, forlader din rækkevidde → ét nærkampsangreb.</td><td class="ar">d20 + angreb</td></tr>')
    o.append("</tbody></table>")
    return "".join(o)


def box_unarmed(node, character, env):
    pb = env["PB"]
    dc_grab = 8 + env["STR"] + pb
    return (f'<h2>{node["title"]}</h2><ul class="t">'
            f'<li><b>Slag</b>: d20 + STR + PB = <b>{sign(env["STR"] + pb)}</b>. Skade 1 + STR = <b>{max(0, 1 + env["STR"])}</b> slag.</li>'
            f'<li><b>Grapple</b> (hold fast, kræver en fri hånd): mål inden for 5 ft, højst én størrelse større. STR- eller DEX-save mod <b>DC {dc_grab}</b> (8 + STR + PB), ellers <i>Grappled</i>.</li>'
            f'<li><b>Shove</b> (skub): samme DC {dc_grab}. Fejler den, skubber du den 5 ft væk, eller den bliver <i>Prone</i>.</li>'
            f'<li><b>Bliver du grebet</b>: brug din handling på Athletics <b>{sign(skill_bonus(character, env, "athletics"))}</b> eller Acrobatics <b>{sign(skill_bonus(character, env, "acrobatics"))}</b> mod den andens DC.</li>'
            "</ul>")


def box_movement(node, character, env):
    speed = character.get("speed", 30)
    long_j = character["abilities"]["STR"]
    high_j = max(0, 3 + env["STR"])
    return (f'<h2>{node["title"]}</h2><ul class="t">'
            f'<li><b>Fart</b> {speed} ft. Du kan dele bevægelsen før og efter din handling.</li>'
            '<li><b>Klatre, svømme, kravle, svært terræn</b>: hver ft koster 1 ekstra ft.</li>'
            f'<li><b>Rejse dig fra <i>Prone</i></b>: koster halv fart ({speed // 2} ft).</li>'
            f'<li><b>Længdespring</b>: {long_j} ft med 10 ft tilløb, {long_j // 2} ft uden. <b>Højdespring</b>: {high_j} ft med tilløb, {high_j // 2} ft uden. <b>Fald</b>: 1d6 pr. 10 ft, og du lander <i>Prone</i>.</li>'
            "</ul>")


def box_extra(node, character, env):
    return f'<h2>{node["title"]}</h2><ul class="t">' + "".join(f"<li>{fmt(p, env)}</li>" for p in node.get("items", [])) + "</ul>"


def box_death_saves(node, character, env):
    hd = character.get("hit_die", 8)
    return (f'<h2>{node["title"]}</h2><ul class="t">'
            '<li><b>0 HP</b>: bevidstløs. Hver tur: <i>death save</i>, d20 10+ = succes. 3 succeser: stabil · 3 fiaskoer: død. Nat. 20: 1 HP · nat. 1: to fiaskoer · skade: én fiasko.</li>'
            '<li><b>Stabilisere en anden</b>: Medicine DC 10. <b>Heroic Inspiration</b>: slå én d20 om.</li>'
            f'<li><b>Short Rest</b> (1 t): brug Hit Dice, 1d{hd}{sign(env["CON"])} HP pr. terning. <b>Long Rest</b> (8 t): alt HP og alle Hit Dice tilbage, −1 <i>Exhaustion</i>.</li>'
            "</ul>")


def box_mastery(node, character, env):
    ms = character.get("masteries", [])
    if not ms:
        return ""
    return (f'<h2>{node["title"]}</h2><ul class="t">'
            + "".join(f"<li><b>{m}</b> ({w}): {MASTERY.get(m, '')}</li>" for m, w in ms) + "</ul>")


def box_useful(node, character, env):
    return (f'<h2>{node["title"]}</h2><ul class="t">'
            + "".join(f"<li>{t}</li>" for t in USEFUL_ITEMS) + "</ul>")


def box_skill_checks(node, character, env):
    prof, expert = skill_sets(character)
    o = [f'<h2>{node["title"]}</h2><table class="sit"><tbody>']
    for txt, skill in SKILL_CHECK_SITUATIONS:
        mark = "◆" if skill in expert else "●" if skill in prof else "○"
        cls = ' class="p"' if (skill in prof or skill in expert) else ""
        o.append(f'<tr{cls}><td>{txt}</td><td class="se">{mark} {SKILL_DISPLAY[skill]}</td><td class="sv">{sign(skill_bonus(character, env, skill))}</td></tr>')
    for t in node.get("tools", []):
        k = t["ability"]
        level = t.get("level", "p")
        val = env[k] + (2 * env["PB"] if level == "e" else env["PB"] if level == "p" else 0)
        o.append(f'<tr class="p"><td>{t["use"]}</td><td class="se">{"◆" if level == "e" else "●"} {t["name"]}</td><td class="sv">{sign(val)}</td></tr>')
    o.append("</tbody></table>")
    o.append('<p class="legend">● trænet · ◆ <i>Expertise</i> · ○ utrænet. DM siger, hvilken skill du skal slå. Passiv værdi = 10 + tallet.</p>')
    return "".join(o)


def box_conditions(node, character, env):
    return (f'<h2>{node["title"]}</h2><dl class="cond">'
            + "".join(f"<dt>{a}</dt><dd>{b}</dd>" for a, b in CONDITIONS) + "</dl>")


# ---- sider 3-4: faste kategorier. Standardtitlen gælder, hvis boksen ikke selv angiver titel.
def training_lines(character: dict) -> list[str]:
    """Items til 'Træning og valg' på baggrundsarket, hentet fra karakterdata."""
    p = [f"<b>{CAN_USE_DISPLAY.get(k, k.capitalize())}</b>: {t}" for k, t in character.get("can_use", {}).items()]
    if character.get("languages"):
        p.append(f"<b>Sprog</b>: {character['languages']}")
    if character.get("skills"):
        p.append("<b>Skills</b>: " + " · ".join(SKILL_DISPLAY.get(s.lower(), s) for s in character["skills"]))
    if character.get("expertise"):
        p.append("<b>Expertise</b>: " + " · ".join(SKILL_DISPLAY.get(s.lower(), s) for s in character["expertise"]))
    if character.get("masteries"):
        p.append("<b>Weapon Mastery</b>: " + " · ".join(f"{w} (<i>{m}</i>)" for m, w in character["masteries"]) + ". Kan byttes ved Long Rest.")
    for f in character.get("feats", []):
        p.append(f"<b>Feat</b>: {f['name']}")
    return p + character.get("extra_training", [])


CBX = '<span class="cbx"></span>'


def _h2(node) -> str:
    """Overskrift med valgfri undertitel. title: false fjerner overskriften helt."""
    title = node.get("title")
    if title is False or not title:
        return ""
    sub = f' <em>· {node["subtitle"]}</em>' if node.get("subtitle") else ""
    return f'<h2>{title}{sub}</h2>'


def _list(items, blank_lines, env) -> str:
    rows = "".join(f"<li>{gear_line(p, env, CBX)}</li>" for p in items)
    rows += '<li class="blank"></li>' * blank_lines
    return f'<ul class="ruled">{rows}</ul>' if rows else ""


def box_list(node, character, env):
    return _h2(node) + _list(node.get("items", []), node.get("blank_lines", 0), env)


def box_training(node, character, env):
    return _h2(node) + _list(training_lines(character) + node.get("items", []), node.get("blank_lines", 0), env)


def box_money(node, character, env):
    return _h2(node) + '<div class="coins">' + "".join(f"<div><span>{c}</span><b></b></div>" for c in ["PP", "GP", "EP", "SP", "CP"]) + "</div>"


def box_text(node, character, env):
    return _h2(node) + '<div class="prose">' + "".join(f"<p>{fmt(p, env)}</p>" for p in node.get("paragraphs", [])) + "</div>"


def box_facts(node, character, env):
    return _h2(node) + ('<dl class="facts">' + "".join(
        f"<div><dt>{a}</dt><dd>{fmt(b, env) if b else '&nbsp;'}</dd></div>" for a, b in node.get("fields", [])) + "</dl>")


def box_magic(node, character, env):
    """Besværgelser: DC-celler, besværgelseslister (label og text) og slots (afkrydsning)."""
    dc = "".join(
        f'<div class="stat magi-celle"><div class="lbl">{c.get("name", "")}</div>'
        f'<div class="big">{fmt(c.get("roll", ""), env)}</div>'
        f'<small class="f">{formula(c.get("roll", ""), roll=True)} · DC {fmt(c.get("dc", ""), env)} = {formula(c.get("dc", ""), roll=False)}</small></div>'
        for c in node.get("dc", []))
    lists = "".join(f"<div><dt>{a}</dt><dd>{fmt(b, env)}</dd></div>" for a, b in node.get("lists", []))
    slots = fmt(node["slots"], env) if node.get("slots") else ""
    if not (dc or lists or slots):
        return ""
    o = _h2(node)
    if dc:
        o += f'<div class="magi-dc">{dc}</div>'
    if lists:
        o += f'<dl class="magi-liste">{lists}</dl>'
    if slots:
        o += f'<p class="magi-slots">{slots}</p>'
    return o


def _box(fn, title=None, card=True, small=False) -> dict:
    return {"fn": fn, "title": title, "card": card, "small": small}


# Alle typer. card=False: boksen har selv sin ramme (abilities, stats).
# small=True: mindre skrift (som de smalle bokse på side 1).
REGISTRY = {
    # side 1
    "abilities": _box(box_abilities, card=False),
    "stats": _box(box_stats, card=False),
    "passive": _box(box_passive),
    "languages": _box(box_languages, small=True),
    "magic": _box(box_magic, "Magi <i>Spellcasting</i>"),
    "attacks": _box(box_attacks),
    "rules": _box(box_rules, small=True),
    "features": _box(box_features, small=True),
    "bonus_actions": _box(box_features, small=True),
    "turn": _box(box_turn, small=True),
    # side 2
    "actions": _box(box_actions),
    "unarmed": _box(box_unarmed, "Ubevæbnet <i>Unarmed Strike</i>"),
    "movement": _box(box_movement, "Bevægelse <i>Movement</i>"),
    "extra": _box(box_extra),
    "death_saves": _box(box_death_saves, "Livsredning og hvil"),
    "mastery": _box(box_mastery, "Weapon Mastery <i>dine valg</i>"),
    "useful": _box(box_useful, "Nyttige ting <i>alle kan købe og bruge</i>"),
    "skill_checks": _box(box_skill_checks, "Hvad slår jeg? <i>Skill checks</i>"),
    "conditions": _box(box_conditions, "Tilstande <i>Conditions</i>"),
    # sider 3-4: faste kategorier
    "weapons": _box(box_list, "Våben og rustning"),
    "gear": _box(box_list, "Udstyr <i>Equipment</i>"),
    "special": _box(box_list, "Særlige genstande"),
    "money": _box(box_money, "Penge <i>Coins</i>"),
    "campaign": _box(box_list, "Kampagne og mission"),
    "places": _box(box_list, "Steder"),
    "people": _box(box_list, "Personer og væsner"),
    "appearance": _box(box_facts, "Udseende <i>Appearance</i>"),
    "traits": _box(box_list, "Kendetegn"),
    "backstory": _box(box_text, "Historie <i>Backstory</i>"),
    "training": _box(box_training, "Træning og valg <i>Proficiencies</i>"),
    "personality": _box(box_list, "Personlighed"),
    "family": _box(box_list, "Familie og venner"),
    "enemies": _box(box_list, "Fjender og rivaler"),
    "goals": _box(box_list, "Mål og drømme"),
    "secrets": _box(box_list, "Hemmeligheder"),
    # frie typer: titlen skrives i YAML
    "list": _box(box_list),
    "text": _box(box_list),  # synonym for list, uden standardtitel og undertitel
    "facts": _box(box_facts),
}


def _box_error(typ, exc) -> str:
    if isinstance(exc, KeyError):
        return f"Mangler feltet {exc.args[0]!r} i boksen {typ!r}."
    return f"Fejl i boksen {typ!r}: {type(exc).__name__}: {exc}"


def layout_node(node, character, env, flat=False) -> str:
    """Én node i layout-træet: en kolonne-gruppe, en række-stak eller en boks.

    flat=True: boksene får ingen egen ramme (de ligger i en samlet kasse, se "merged" under columns).
    """
    if "columns" in node:
        cols = []
        for k in node["columns"]:
            merged = bool(k.get("merged"))
            inner = layout_stack(k.get("content", []), character, env, flat or merged)
            if merged:
                tight = " taet" if k.get("merged") == "tight" else ""
                frame = "" if flat else " box"  # uden ramme (box_type: none) beholdes skriftindstillingen
                inner = f'<div class="samlet{frame}{tight}" data-type="merged">{inner}</div>'
            cols.append(f'<div class="kol" style="--bredde:{k.get("width", 1)}">{inner}</div>')
        return f'<div class="kolonner">{"".join(cols)}</div>'
    if "rows" in node:
        return f'<div class="raekker">{layout_stack(node["rows"], character, env, flat)}</div>'
    typ = node.get("type")
    if typ not in REGISTRY:
        raise ValueError(f"Ukendt boks-type i layout: {typ!r}. Kendte typer: {', '.join(REGISTRY)}.")
    reg = REGISTRY[typ]
    data = node if reg["title"] is None else {"title": reg["title"], **node}
    try:
        inner = reg["fn"](data, character, env)
    except (KeyError, TypeError, ValueError, IndexError, AttributeError) as exc:
        raise ValueError(_box_error(typ, exc)) from exc
    if not inner or flat or node.get("box_type") == "none" or not reg["card"]:
        return inner
    cls = "box small" if reg["small"] else "box"
    return f'<div class="{cls}" data-type="{typ}">{inner}</div>'


def layout_stack(nodes, character, env, flat=False) -> str:
    return "".join(layout_node(n, character, env, flat) for n in nodes)


def page(p, character, env) -> str:
    """Én side: valgfri top (title, subtitle, summary), layout og footer."""
    head = ""
    if "top" in p:
        top = p["top"] or {}
        head = (f'<header class="head"><div class="name"><h1>{top.get("title", character["name"])}</h1>'
                f'<span class="epithet">{top.get("subtitle", "")}</span></div>'
                f'{ident(top.get("summary", character.get("summary", [])))}</header>')
    no_frame = p.get("box_type") == "none"  # box_type: none på en side fjerner rammerne på alle bokse på siden
    body = f'<div class="layout">{layout_stack(p.get("layout", []), character, env, no_frame)}</div>'
    foot = f'<div class="foot">{p.get("footer", "")}</div>' if p.get("footer") else ""
    marg = {"small": " margin-small", "none": " margin-none"}.get(p.get("margin"), "")
    return f'<section class="pg s1{marg}"><div class="page">{head}{body}{foot}</div></section>'


# ---------------------------------------------------------------- samlet fil
FRAME_CSS = """
*{box-sizing:border-box}
body{margin:0;background:#ddd}
.sheets{display:flex;flex-direction:column;align-items:center;gap:24px;padding:20px 16px}
section.pg{width:794px;height:1123px;overflow:hidden;flex:none;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.2)}
.s1 > .page{padding-top:34px}
@page{size:A4;margin:0}
section.pg.margin-small > .page{width:198mm;padding-top:23px}
section.pg.margin-none > .page{width:210mm;padding-top:0}
@media screen and (max-width:820px){
  .sheets{padding:8px}
  section.pg{width:100%;height:auto;overflow:visible}
  .s1 > .page, section.pg.margin-small > .page, section.pg.margin-none > .page{width:auto;margin:0 auto}
}
@media print{
  body{background:#fff}
  .sheets{display:block;padding:0}
  section.pg{box-shadow:none;page-break-after:always;break-after:page}
  section.pg:last-child{page-break-after:auto;break-after:auto}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
"""

CSS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "scripts", "karakterark")


def _css(name: str, stil: str | None) -> str:
    """Genbruger scripts/karakterark/*.css uændret - se docs/sheets-yaml.md."""
    s = open(os.path.join(CSS_DIR, f"{name}.css"), encoding="utf-8").read()
    if stil and stil != "farve":
        s += "\n" + open(os.path.join(CSS_DIR, f"{name}-{stil}.css"), encoding="utf-8").read()
    return s


def build(character: dict, sheets: dict, stil: str | None = None) -> str:
    env = make_env(character)
    pages = [page(p, character, env) for p in sheets.get("pages", [])]
    title = character.get("name") or "Karakterark"
    style = scope_css(_css("side1", stil), "s1") + "\n" + FRAME_CSS
    return f'''<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
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
