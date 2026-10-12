"""Spell-lister til arket: samler karakterens spells og cantrips og deler dem i to lister (boks-typerne
`cantrips` og `spells` i render.py). Typerne blandes aldrig: en spell med level 0 er et cantrip, alt andet er en spell.

Kilderne i character.yaml (se docs/character-yaml.md): `spellcasting[]` (cantrips, prepared, spellbook, extra,
arcanum), `granted_spells` (race, feats, klassens altid-forberedte) og `spells_known`. Level, casting time, range og
varighed slås op i 5etools (e5tools.get_spell); er dataene ikke mountet, bliver level ukendt, og spells står samlet
under "Level ?" til sidst. Et cantrip kendes også på `cantrip: true` på en tildelt spell.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import e5tools, spell_grants


@dataclass
class Entry:
    name: str
    source: str | None = None
    cantrip: bool | None = None               # None = ukendt (afgøres af level)
    kinds: set = field(default_factory=set)   # prepared | book | known
    origins: list = field(default_factory=list)  # korte tekster: "Wizard", "altid forberedt", "1 pr. Long Rest · WIS"
    info: dict | None = None

    @property
    def level(self) -> int | None:
        if self.info is not None and isinstance(self.info.get("level"), int):
            return self.info["level"]
        return 0 if self.cantrip else None

    @property
    def is_cantrip(self) -> bool:
        return self.level == 0


def _sources(character: dict) -> set[str]:
    src = {"XPHB"}
    for key in ("spells_known", "granted_spells"):
        src |= {s["source"] for s in character.get(key) or [] if isinstance(s, dict) and s.get("source")}
    return src


def _lookup(name: str, sources: set[str]) -> dict | None:
    try:
        return e5tools.get_spell(name, sources)
    except Exception:  # 5etools ikke mountet, eller en datafil mangler
        return None


def collect(character: dict) -> list[Entry]:
    """Alle spells og cantrips karakteren har, uden dubletter (samme spell fra flere kilder bliver én post)."""
    entries: dict[str, Entry] = {}
    multi = len(character.get("spellcasting") or []) > 1

    def add(name, kind, origin, source=None, cantrip=None):
        e = entries.setdefault(name.lower(), Entry(name=name, source=source))
        e.kinds.add(kind)
        if cantrip is not None:
            e.cantrip = cantrip
        if origin and origin not in e.origins:
            e.origins.append(origin)

    for block in character.get("spellcasting") or []:
        cls = block.get("class", "")
        own = cls if multi else ""
        for n in block.get("cantrips") or []:
            add(n, "known", own, cantrip=True)
        for n in block.get("prepared") or []:
            add(n, "prepared", own)
        for n in block.get("extra") or []:
            add(n, "prepared", "altid forberedt" + (f" · {cls}" if multi else ""))
        for lvl, names in (block.get("arcanum") or {}).items():
            for n in names:
                add(n, "prepared", "Mystic Arcanum · 1 pr. Long Rest")
        for n in block.get("spellbook") or []:
            add(n, "book", own)
    for g in character.get("granted_spells") or []:
        use = spell_grants.use_text(g.get("addition", ""), g.get("recharge"), g.get("uses"))
        origin = " · ".join(b for b in (use, g.get("ability") or "") if b)
        add(g["name"], "known" if g.get("addition") == "known" else "prepared", origin,
            source=g.get("source"), cantrip=True if g.get("cantrip") else None)
    for s in character.get("spells_known") or []:
        if s["name"].lower() not in entries:
            add(s["name"], "known", "", source=s.get("source"))
        elif not entries[s["name"].lower()].source:
            entries[s["name"].lower()].source = s.get("source")
    sources = _sources(character)
    for e in entries.values():
        e.info = _lookup(e.name, sources)
    return list(entries.values())


def has_spells(character: dict) -> bool:
    return bool(character.get("spellcasting") or character.get("granted_spells") or character.get("spells_known"))


# ---------------------------------------------------------------- formatering af 5etools' spelldata
def _cast(info: dict | None) -> str:
    if not info or not info.get("time"):
        return ""
    out = []
    for t in info["time"]:
        unit, n = t.get("unit", ""), t.get("number", 1)
        if unit == "action":
            out.append("Action")
        elif unit == "bonus":
            out.append("Bonus Action")
        elif unit == "reaction":
            out.append("Reaction")
        elif unit == "minute":
            out.append(f"{n} min")
        elif unit == "hour":
            out.append(f"{n} t")
        else:
            out.append(f"{n} {unit}")
    return " / ".join(out)


def _dist(d: dict | None) -> str:
    if not d:
        return ""
    t, a = d.get("type"), d.get("amount")
    if t == "feet":
        return f"{a} ft"
    if t == "miles":
        return f"{a} mile"
    return {"touch": "Touch", "self": "Self", "sight": "Sight", "unlimited": "Unlimited"}.get(t, str(t or ""))


def _range(info: dict | None) -> str:
    r = (info or {}).get("range")
    if not r:
        return ""
    t = r.get("type")
    if t == "point":
        return _dist(r.get("distance"))
    if t == "special":
        return "Special"
    if t in ("cone", "line", "cube", "sphere", "hemisphere", "radius", "cylinder", "emanation"):
        return f"Self ({_dist(r.get('distance'))} {t})"
    return t.capitalize() if isinstance(t, str) else ""


def _duration(info: dict | None) -> str:
    d = (info or {}).get("duration") or []
    if not d:
        return ""
    d = d[0]
    t = d.get("type")
    if t == "instant":
        return "Instant"
    if t == "permanent":
        return "Until dispelled"
    if t == "special":
        return "Special"
    if t == "timed":
        dur = d.get("duration", {})
        unit = {"minute": "min", "hour": "t", "round": "round", "day": "dage", "turn": "tur"}.get(dur.get("type"), dur.get("type", ""))
        amount = dur.get("amount", "")
        return f"{'Up to ' if d.get('concentration') else ''}{amount} {unit}".strip()
    return ""


def _concentration(info: dict | None) -> bool:
    return any(d.get("concentration") for d in (info or {}).get("duration") or [])


def _components(info: dict | None) -> str:
    c = (info or {}).get("components") or {}
    return " ".join(k.upper() for k in ("v", "s", "m") if c.get(k))


def _ritual(info: dict | None) -> bool:
    return bool(((info or {}).get("meta") or {}).get("ritual"))


# ---------------------------------------------------------------- HTML
CBX = '<span class="cbx"></span>'


def _slots_html(character: dict, level: int) -> str:
    out = ""
    slots = character.get("spell_slots") or []
    if 1 <= level <= len(slots) and slots[level - 1]:
        out += f'<span class="sl">{slots[level - 1]} {"slot" if slots[level - 1] == 1 else "slots"} {CBX * min(slots[level - 1], 9)}</span>'
    pact = character.get("pact_slots")
    if pact and pact.get("level") == level and pact.get("slots"):
        out += f'<span class="sl">Pact Magic {pact["slots"]} {"slot" if pact["slots"] == 1 else "slots"} {CBX * min(pact["slots"], 9)}</span>'
    return out


def _row(e: Entry, mark: str) -> str:
    flags = ("<span class=\"fl\">C</span>" if _concentration(e.info) else "") + ("<span class=\"fl\">R</span>" if _ritual(e.info) else "")
    origin = f"<small>{' · '.join(o for o in e.origins if o)}</small>" if any(e.origins) else ""
    pm = f'<span class="pm">{mark}</span>' if mark else ""
    return (f'<tr><td class="sn">{pm}{e.name}{flags}{origin}</td><td>{_cast(e.info)}</td><td>{_range(e.info)}</td>'
            f'<td>{_duration(e.info)}</td><td class="cp">{_components(e.info)}</td></tr>')


HEAD = '<thead><tr><th>Navn</th><th>Cast</th><th>Range</th><th>Duration</th><th>Comp.</th></tr></thead>'
LEGEND_CANTRIP = '<p class="legend"><span class="fl">C</span> Concentration · <span class="fl">R</span> Ritual · V S M = komponenter.</p>'


def cantrips_html(character: dict, node: dict, title_html: str) -> str:
    items = sorted((e for e in collect(character) if e.is_cantrip), key=lambda e: e.name.lower())
    if not items:
        return ""
    rows = "".join(_row(e, "") for e in items)
    return f'{title_html}<table class="spl">{HEAD}<tbody>{rows}</tbody></table>{LEGEND_CANTRIP}'


def spells_html(character: dict, node: dict, title_html: str) -> str:
    """node['list']: prepared (standard: forberedte + altid forberedte + tildelte), spellbook (hele spellbogen, forberedte
    markeret) eller all. Grupperet og sorteret efter level; cantrips er aldrig med."""
    which = node.get("list", "prepared")
    if which not in ("prepared", "spellbook", "all"):
        raise ValueError(f"list skal være prepared, spellbook eller all, ikke {which!r}.")
    items = [e for e in collect(character) if not e.is_cantrip]
    if which == "prepared":
        items = [e for e in items if e.kinds & {"prepared", "known"}]
    elif which == "spellbook":
        items = [e for e in items if "book" in e.kinds]
        if not items:
            return ""
    if not items:
        return ""
    by_level: dict = {}
    for e in items:
        by_level.setdefault(e.level if e.level is not None else 99, []).append(e)
    show_marks = which != "prepared" and any("book" in e.kinds for e in items)
    groups = []  # (level, [rækker]) i levelrækkefølge
    for lvl in sorted(by_level):
        label = f"Level {lvl}" if lvl != 99 else "Level ?"
        head = f'<tr class="lvl"><th colspan="5"><span class="ln">{label}</span>{_slots_html(character, lvl) if lvl != 99 else ""}</th></tr>'
        body = [_row(e, ("●" if e.kinds & {"prepared"} else "○") if show_marks else "") for e in sorted(by_level[lvl], key=lambda e: e.name.lower())]
        groups.append((lvl, [head, *body]))
    legend = LEGEND_CANTRIP
    if show_marks:
        legend = legend.replace("</p>", " · ● forberedt · ○ kun i spellbogen.</p>")
    if 99 in by_level:
        legend += '<p class="legend">Level ? = spellens data blev ikke fundet i 5etools.</p>'
    if int(node.get("split", 1)) == 2 and len(groups) > 1:
        # to tabeller side om side; en level-gruppe deles aldrig, og rækkerne fordeles så jævnt som muligt
        total, acc, cut = sum(len(g[1]) for g in groups), 0, len(groups)
        for i, (_, rows) in enumerate(groups):
            if acc + len(rows) / 2 > total / 2:
                cut = max(i, 1)
                break
            acc += len(rows)
        halves = [groups[:cut], groups[cut:]]
        tables = "".join(f'<table class="spl">{HEAD}<tbody>{"".join(r for _, rows in h for r in rows)}</tbody></table>' for h in halves if h)
        return f'{title_html}<div class="spl2">{tables}</div>{legend}'
    return f'{title_html}<table class="spl">{HEAD}<tbody>{"".join(r for _, rows in groups for r in rows)}</tbody></table>{legend}'


def magic_auto(character: dict) -> dict:
    """Felter til boksen `magic` med auto: true: DC-celler pr. caster-klasse (eller pr. evne for tildelte spells) og tællere."""
    dc, lists = [], []
    blocks = character.get("spellcasting") or []
    for b in blocks:
        ab = b.get("ability") or ""
        dc.append({"name": f"{b.get('class', '')} · {ab}".strip(" ·"), "roll": b.get("attack") or "{+PB}", "dc": b.get("save_dc") or "{8+PB}"})
    if not blocks:
        abilities = []
        for g in character.get("granted_spells") or []:
            if g.get("ability") and g["ability"] not in abilities:
                abilities.append(g["ability"])
        for ab in abilities:
            dc.append({"name": f"Granted spells · {ab}", "roll": "{+PB+%s}" % ab, "dc": "{8+PB+%s}" % ab})
    for b in blocks:
        n_c, n_p, n_b = len(b.get("cantrips") or []), len(b.get("prepared") or []), len(b.get("spellbook") or [])
        label = b.get("class", "") if len(blocks) > 1 else ""
        pre = f"{label}: " if label else ""
        if n_c:
            lists.append([f"{pre}Cantrips", str(n_c)])
        if n_p:
            lists.append([f"{pre}Prepared", str(n_p)])
        if n_b:
            lists.append([f"{pre}Spellbook", str(n_b)])
    return {"dc": dc, "lists": lists}


def row_estimate(character: dict, which: str = "prepared") -> int:
    """Omtrent antal tabelrækker for spells-listen (spells + level-overskrifter + kildelinjer), til valg af layout."""
    items = [e for e in collect(character) if not e.is_cantrip]
    if which == "prepared":
        items = [e for e in items if e.kinds & {"prepared", "known"}]
    return len(items) + len({e.level for e in items}) + sum(1 for e in items if any(e.origins)) // 2
