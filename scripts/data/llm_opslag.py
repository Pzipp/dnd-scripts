"""Laver opslagsfilen `llm-karakter-opslag.md` til docs/llm-karakter-prompt.md.

Filen er et kompakt FAKTA-bilag (ikke regeltekst) til en LLM, der skal skrive en `character.yaml` uden adgang
til repoet eller 5etools: for hver XPHB-klasse hit die, saves, skill-valg, træning, spellcasting, tabelkolonner,
features pr. niveau og subclasses; arter (afstamninger), baggrunde, feats, våben/rustning, spells (navn, niveau,
klasser), sprog og skills. Alle navne er de engelske fra 5etools (XPHB), uden dansk overlay.

Indholdet er afledt af bogdata, så filen er ikke til at committe (den bør stå i .gitignore). Den kan genskabes når
som helst.

  python3 scripts/data/llm_opslag.py [--kilde STI/data] [--ud FIL.md] [--klasse Rogue,Wizard] [--uden-spells]
  python3 dnd.py llm-opslag                       (hvis dnd.py kender kommandoen)

Datamappen: --kilde, ellers miljøvariablen E5TOOLS_DATA, ellers /srv/dnd5etools/data (værten) eller /e5tools/data
(containeren).
"""
from __future__ import annotations

import argparse
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
UD = ROOT / "llm-karakter-opslag.md"
SOURCE = "XPHB"
SOURCES = {SOURCE}
ABIL = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]
CLASS_LETTER = {"Bard": "B", "Cleric": "C", "Druid": "D", "Paladin": "P", "Ranger": "R", "Sorcerer": "S", "Warlock": "L", "Wizard": "W"}
SCHOOLS = {"A": "Abjuration", "C": "Conjuration", "D": "Divination", "E": "Enchantment", "V": "Evocation", "I": "Illusion", "N": "Necromancy", "T": "Transmutation"}
SIZE = {"T": "Tiny", "S": "Small", "M": "Medium", "L": "Large"}
WEAPON_PROP = {"A": "Ammunition", "F": "Finesse", "H": "Heavy", "L": "Light", "LD": "Loading", "R": "Reach", "S": "Special", "T": "Thrown", "2H": "Two-Handed", "V": "Versatile"}
DMG = {"B": "Bludgeoning", "P": "Piercing", "S": "Slashing"}


def _data_dir(kilde: str | None) -> Path:
    if kilde:
        return Path(kilde)
    if os.environ.get("E5TOOLS_DATA"):
        return Path(os.environ["E5TOOLS_DATA"])
    for kandidat in ("/srv/dnd5etools/data", "/e5tools/data"):
        if Path(kandidat).is_dir():
            return Path(kandidat)
    raise SystemExit("Fandt ingen 5etools-data. Angiv --kilde STI eller sæt E5TOOLS_DATA.")


def _load_e5tools(data: Path):
    """Importér byggerens e5tools UDEN det danske overlay: navnene skal være 5etools' engelske."""
    os.environ["E5TOOLS_DATA"] = str(data)
    os.environ["DANSK_DATA"] = tempfile.mkdtemp(prefix="llm-opslag-tom-")
    sys.path.insert(0, str(ROOT))
    from webui.builder import e5tools, races, spell_grants  # noqa: E402
    if not e5tools.available():
        raise SystemExit(f"5etools-data ikke fundet i {data}.")
    return e5tools, races, spell_grants


# ---------------------------------------------------------------- små hjælpere
def runs(values: list, label_fmt=str) -> str:
    """[2,2,2,3,3] -> '1-3:2 4-5:3' (niveau-intervaller med samme værdi)."""
    out, start = [], 0
    for i in range(1, len(values) + 1):
        if i == len(values) or values[i] != values[start]:
            lo, hi = start + 1, i
            out.append(f"{lo if lo == hi else f'{lo}-{hi}'}:{label_fmt(values[start])}")
            start = i
    return " ".join(out)


def cell(e, value) -> str:
    if isinstance(value, dict):
        t = value.get("type")
        if t == "dice":
            return "+".join(f"{d.get('number', 1)}d{d['faces']}" for d in value.get("toRoll", []))
        if t == "bonus":
            return f"+{value['value']}"
        if t == "bonusSpeed":
            return f"+{value['value']}ft"
        return str(value.get("value", value))
    return e.clean_text(str(value))


def lvl_label(spell_level: int) -> str:
    return "cantrip" if spell_level == 0 else f"level {spell_level}"


def spell_name(uid: str) -> str:
    """'faerie fire|xphb#c' -> 'Faerie Fire' (store forbogstaver; Title Case giver forkerte 's, så små ord rettes)."""
    name = uid.partition("|")[0].partition("#")[0]
    out = []
    for i, w in enumerate(name.split(" ")):
        out.append(w if (i and w in ("of", "the", "and", "from", "to", "in", "with")) else w[:1].upper() + w[1:])
    return " ".join(out).replace("'S", "'s")


def grants_text(spell_grants, blocks) -> str:
    """additionalSpells -> kompakt tekst: 'known@1: Light (cantrip); innate@3 daily 1: Faerie Fire'."""
    parts = []
    for block in blocks or []:
        head = []
        if block.get("name"):
            head.append(f"[{block['name']}]")
        ability = block.get("ability")
        if isinstance(ability, dict) and ability.get("choose"):
            head.append("ability: " + "/".join(a.upper() for a in ability["choose"]) + " (vælges)")
        elif isinstance(ability, str):
            head.append("ability: " + ("samme som feat'ets evne" if ability == "inherit" else ability.upper()))
        items = []
        fixed: dict[tuple, dict] = {}
        grouped: dict[tuple, list] = {}
        for it in spell_grants.walk(block):
            when = f"@{it['level']}" if it["level"] and it["level"] > 1 else ""
            if it.get("slot_level"):
                when = f"@slots-{it['slot_level']}"
            use = ""
            if it["recharge"]:
                use = f" {it['recharge']}" + (f" {it['uses']}" if it["uses"] else "")
            if it["kind"] == "fixed":
                uid = spell_grants.parse_uid(it["value"])
                fixed.setdefault((it["addition"], use), {}).setdefault(when or "@1", []).append(spell_name(it["value"]) + (" (cantrip)" if uid["cantrip"] else ""))
            elif it["kind"] == "choose" and "school=" in it["value"]:
                # Wizard-skole (Savant): samme filter gentaget ved flere niveauer, slås sammen
                filt = "|".join(x for x in it["value"].split("|") if not x.startswith("level="))
                grouped.setdefault((it["addition"], filt), []).append(it["level"] or 1)
            elif it["kind"] == "choose":
                items.append(f"{it['addition']}{when}{use}: VALG {it['count']}x {{{it['value']}}}")
            else:
                items.append(f"{it['addition']}{when}{use}: ALLE {{{it['value']}}}")
        for (addition, use), by_when in fixed.items():
            items.insert(0, f"{addition}{use} (fra karakterniveau): " + " | ".join(f"{w}: " + ", ".join(names) for w, names in by_when.items()))
        for (addition, filt), levels in grouped.items():
            items.append(f"{addition}: VALG 1 spell hver ved klasseniveau {','.join(str(l) for l in levels)} fra {{{filt}}} (spell-niveau højst det højeste du kan kaste; ligger i spellcasting.extra)")
        parts.append(" ".join(head + ["; ".join(items)]).strip())
    return " || ".join(parts)


def weapon_mastery_count(e, class_obj, level_feature_text: str) -> str | None:
    """Antal Weapon Mastery pr. niveau: tabelkolonne, ellers tallet i feature-teksten (som model._weapon_mastery_count)."""
    import re
    words = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}
    m = re.search(r"\b(one|two|three|four|five|six)\s+kinds? of\b", level_feature_text, re.I)
    return str(words[m.group(1).lower()]) if m else None


# ---------------------------------------------------------------- sektioner
def sec_basics(e) -> list[str]:
    skills = {}
    for s in e._load("skills.json").get("skill", []):
        if s.get("source") == SOURCE:
            skills[s["name"]] = s["ability"].upper()
    langs = [l for l in e._load("languages.json").get("language", []) if l.get("source") == SOURCE and l["name"] != "Common"]
    std = ", ".join(sorted(l["name"] for l in langs if l.get("type") == "standard"))
    rare = ", ".join(sorted(l["name"] for l in langs if l.get("type") == "rare"))
    out = ["## Skills (navn i character.yaml står med små bogstaver) og evner", ""]
    for ab in ABIL:
        names = [n for n, a in skills.items() if a == ab]
        out.append(f"* {ab}: " + (", ".join(names) if names else "(ingen skills)"))
    out += ["", "## Sprog", "", f"* Common (altid). Standard Languages, de 2 valgfrie vælges herfra: {std}.", f"* Rare Languages: {rare}.", ""]
    out += [
        "## Skadetyper og tilstande (små bogstaver i resistances, immunities, condition_immunities)", "",
        "* Damage types: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder.",
        "* Conditions: blinded, charmed, deafened, exhaustion, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious.",
        "",
    ]
    return out


def _table_lines(e, class_obj) -> list[str]:
    out = []
    for group in class_obj.get("classTableGroups", []):
        if "rowsSpellProgression" in group:
            continue  # spell slots-tabellerne står i prompt-filen
        labels = [e.clean_text(c) for c in group["colLabels"]]
        for i, label in enumerate(labels):
            if label.lower() in ("cantrips", "prepared spells"):
                continue  # står allerede under Spellcasting
            col = [cell(e, row[i]) for row in group["rows"]]
            out.append(f"  * {label}: {runs(col)}")
    return out


def sec_classes(e, spell_grants, only: set[str] | None = None) -> list[str]:
    out = ["## Klasser (XPHB)", "",
           "Niveau-intervaller står som `fra-til:værdi`. Features står med præcis det navn, de skal have i `class_features`.", ""]
    for cls in sorted(e.classes(SOURCES), key=lambda c: c["name"]):
        if cls["source"] != SOURCE or (only and cls["name"].lower() not in only):
            continue
        name = cls["name"]
        prof = cls.get("startingProficiencies", {})
        skills = ""
        for block in prof.get("skills", []):
            ch = block.get("choose")
            if ch:
                skills = f"vælg {ch['count']} af: " + ", ".join(ch["from"])
            elif block.get("any"):
                skills = f"vælg {block['any']} frie skills"
        multi = cls.get("multiclassing", {})
        gained = multi.get("proficienciesGained", {})
        req = multi.get("requirements")
        out.append(f"### {name}")
        out.append(f"* Hit die d{cls['hd']['faces']} · Saves {', '.join(s.upper() for s in cls['proficiency'])} · Primary ability: "
                   + " eller ".join("+".join(k.upper() for k in p) for p in cls.get("primaryAbility", [])))
        out.append(f"* Skills: {skills}")
        armor = ", ".join(e.clean_text(a) for a in prof.get("armor", [])) or "ingen"
        weapons = ", ".join(e.clean_text(w) for w in prof.get("weapons", [])) or "ingen"
        out.append(f"* can_use.armor = `{armor}` · can_use.weapons = `{weapons}`")
        tools = ", ".join(e.clean_text(t) for t in prof.get("tools", []))
        if tools:
            out.append(f"* Værktøj: {tools}")
        if req:
            out.append("* Multiclass-krav (evne mindst): " + (str(req).replace("'", "").replace("{", "").replace("}", "")))
        if gained:
            bits = []
            for key, label in (("armor", "armor"), ("weapons", "weapons"), ("tools", "tools")):
                if gained.get(key):
                    bits.append(f"{label}: " + ", ".join(e.clean_text(x) for x in gained[key]))
            if gained.get("skills"):
                ch = gained["skills"][0].get("choose") or {}
                frm = ch.get("from", [])
                bits.append(f"skills: vælg {ch.get('count', '?')} " + ("valgfri" if len(frm) > 12 else "af " + ", ".join(frm)))
            out.append("* Multiclass-træning (når klassen IKKE er den første): " + "; ".join(bits))
        if cls.get("spellcastingAbility"):
            prog = cls.get("casterProgression")
            kind = {"full": "full caster", "artificer": "half caster (rund op)", "pact": "Pact Magic", "1/2": "half caster", "1/3": "third caster"}.get(prog, prog)
            line = f"* Spellcasting: {cls['spellcastingAbility'].upper()} · {kind}"
            if cls.get("preparedSpellsChange"):
                line += f" · forberedte spells kan skiftes: {cls['preparedSpellsChange']}"
            out.append(line)
            if cls.get("cantripProgression"):
                out.append("  * Cantrips: " + runs(cls["cantripProgression"]))
            if cls.get("preparedSpellsProgression"):
                out.append("  * Prepared spells: " + runs(cls["preparedSpellsProgression"]))
            if cls.get("spellsKnownProgressionFixed"):
                out.append("  * Spellbook (Wizard): 6 spells på niveau 1, derefter 2 nye pr. Wizard-niveau (" + runs(cls["spellsKnownProgressionFixed"]) + ")")
            if cls.get("spellsKnownProgressionFixedByLevel"):
                arc = ", ".join(f"niveau {lv}: spell level {next(iter(v))}" for lv, v in cls["spellsKnownProgressionFixedByLevel"].items())
                out.append(f"  * Mystic Arcanum (1 spell pr. trin, ikke tæller som prepared): {arc}")
        always = [{k: v for k, v in b.items() if k != "expanded"} for b in cls.get("additionalSpells") or []]
        if any(always):
            out.append("* Altid forberedt/kendt (klassen; granted_spells, addition prepared): " + grants_text(spell_grants, always))
        for prog in cls.get("optionalfeatureProgression") or []:
            pv = prog["progression"]
            txt = runs(pv) if isinstance(pv, list) else ", ".join(f"{k}: {v}" for k, v in pv.items())
            out.append(f"* Valgfrie features {prog['name']} (featureType {'/'.join(prog['featureType'])}, antal i alt pr. niveau): {txt}. Navne står i afsnittet Valgfrie klassefeatures.")
        table = _table_lines(e, cls)
        if table:
            out.append("* Klassetabel (kolonner):")
            out += table
        eq = cls.get("startingEquipment", {}).get("defaultData", [{}])[0]
        if eq:
            out.append("* Startudstyr: " + " | ".join(f"{k}: {_equipment(eq[k])}" for k in sorted(eq)))
        # features pr. niveau
        feats = [f for f in e.class_features(name, SOURCES, 20) if f["source"] == SOURCE]
        by_level: dict[int, list[str]] = {}
        for f in feats:
            if f["name"] != "Subclass Feature":
                by_level.setdefault(f["level"], []).append(f["name"])
        out.append("* class_features (niveau: navne): " + "; ".join(f"{lv}: " + ", ".join(by_level[lv]) for lv in sorted(by_level)))
        mastery = next((f for f in feats if f["name"] == "Weapon Mastery"), None)
        if mastery:
            count = None
            if any("Weapon Mastery" in c for g in cls.get("classTableGroups", []) for c in g["colLabels"]):
                count = "se kolonnen Weapon Mastery ovenfor"
            else:
                count = weapon_mastery_count(e, cls, e.render_text(mastery.get("entries", [])))
                count = f"{count} våben" if count else "se klassen"
            pool = "kun nærkamps-våben (Simple/Martial Melee)" if "Melee" in e.render_text(mastery.get("entries", [])) else (
                "våben du har træning i" if "proficiency" in e.render_text(mastery.get("entries", [])) else "alle Simple og Martial")
            out.append(f"* Weapon Mastery: {count}; vælges blandt {pool}.")
        # subclasses
        subs = [s for s in e.subclasses(name, SOURCES) if s["source"] == SOURCE]
        out.append("* Subclasses (subclassens eget navn er selv første feature på subclass-niveauet og står ikke i listerne; niveau: navne):")
        for sub in sorted(subs, key=lambda s: s["name"]):
            sf = [f for f in e.subclass_features(name, sub.get("shortName", sub["name"]), SOURCES, 20) if f["source"] == SOURCE]
            lv: dict[int, list[str]] = {}
            for f in sf:
                lv.setdefault(f["level"], []).append(f["name"])
            line = f"  * **{sub['name']}**: " + "; ".join(f"{k}: " + ", ".join(x for x in v if x != sub["name"]) for k, v in sorted(lv.items()) if [x for x in v if x != sub["name"]])
            out.append(line)
            if sub.get("spellcastingAbility"):
                out.append(f"    * Spellcasting: {sub['spellcastingAbility'].upper()} · {sub.get('casterProgression')} caster · spells vælges fra Wizard-listen"
                           + ("" if sub.get("name") != "Arcane Trickster" else " (Mage Hand fås altid)"))
                out.append("    * Cantrips: " + runs(sub.get("cantripProgression", [])))
                out.append("    * Prepared spells: " + runs(sub.get("preparedSpellsProgression", [])))
                for g in sub.get("subclassTableGroups", []):
                    if "rowsSpellProgression" in g:
                        out.append("    * Spell slots pr. niveau [" + ",".join(f"L{i + 1}" for i in range(len(g["colLabels"]))) + "]: "
                                   + " ".join(f"{i + 1}:{'/'.join(str(x) for x in row)}" for i, row in enumerate(g["rowsSpellProgression"]) if any(row)))
            for prog in sub.get("optionalfeatureProgression") or []:
                pv = prog["progression"]
                out.append(f"    * Valgfrie features {prog['name']} (featureType {'/'.join(prog['featureType'])}, antal i alt pr. niveau): "
                           + (runs(pv) if isinstance(pv, list) else ", ".join(f"{k}: {v}" for k, v in pv.items())))
            if sub.get("spellcastingAbility"):
                pass
            elif sub.get("additionalSpells"):
                out.append("    * Altid forberedt/kendt: " + grants_text(spell_grants, sub["additionalSpells"]))
            for g in sub.get("subclassTableGroups", []):
                if "rows" in g and not sub.get("spellcastingAbility"):
                    for i, label in enumerate(g["colLabels"]):
                        out.append(f"    * {e.clean_text(label)}: " + runs([cell(e, r[i]) for r in g["rows"]]))
        out.append("")
    return out


def _equipment(entries: list) -> str:
    parts = []
    for it in entries:
        if "item" in it:
            nm = it.get("displayName") or spell_name(it["item"].split("|")[0])
            nm = nm if it.get("displayName") else it["item"].split("|")[0].title().replace("'S", "'s")
            parts.append(nm + (f" x{it['quantity']}" if it.get("quantity") else ""))
        elif "value" in it:
            parts.append(f"{it['value'] / 100:g} GP")
        elif "equipmentType" in it:
            parts.append("1 x " + {"instrumentMusical": "Musical Instrument", "toolArtisan": "Artisan's Tools", "setGaming": "Gaming Set", "weaponMartial": "Martial weapon", "weaponSimple": "Simple weapon"}.get(it["equipmentType"], it["equipmentType"]))
        elif "special" in it:
            parts.append(it["special"])
    return ", ".join(parts)


def sec_species(e, races, spell_grants) -> list[str]:
    out = ["## Arter (species, XPHB)", "",
           "2024-arter giver INGEN evnepoint (de kommer fra baggrunden). `race_traits` = trækkene herunder, med præcis disse navne og source XPHB. "
           "Afstamning (lineage) hører til arten: skriv arten som `race: {name: Elf, source: XPHB}`, og nævn afstamningen i `summary` (Art-feltet).", ""]
    for race in sorted(e.races(SOURCES), key=lambda r: r["name"]):
        if race["source"] != SOURCE:
            continue
        lineages = races.lineages(race, SOURCES)
        variants = lineages or [(None, race)]
        out.append(f"### {race['name']}")
        names = [[t["name"] for t in eff.get("entries", []) if isinstance(t, dict) and t.get("name")] for _label, eff in variants]
        common = [n for n in names[0] if all(n in other for other in names)] if len(variants) > 1 else []
        if len(variants) > 1:
            out.append("* race_traits fælles for alle afstamninger: " + ", ".join(common))
        for (label, eff), traits in zip(variants, names):
            sp = races.speeds(eff)
            speed = ", ".join(f"{k} {v}" for k, v in sp.items())
            senses = ", ".join(f"{k} {v}" for k, v in races.fixed_senses(eff).items()) or "ingen"
            sizes = "/".join(races.size_options(eff))
            resist = races.fixed_resist(eff)
            choose = races.resist_choice(eff)
            res = ", ".join(resist) or "ingen"
            if choose:
                res += (" + " if resist else "") + "VALG 1 af " + "/".join(choose["from"])
            head = f"**{label}**: " if label else ""
            own = [n for n in traits if n not in common]
            line = f"* {head}size {sizes}{' (vælges)' if len(eff.get('size') or []) > 1 else ''} · speed {speed} · darkvision/senses {senses} · resistances {res}"
            line += (" · egne race_traits: " if len(variants) > 1 else " · race_traits: ") + ", ".join(own)
            out.append(line)
            notes = []
            for blk in eff.get("skillProficiencies") or []:
                for k, v in blk.items():
                    if k == "any":
                        notes.append(f"{v} valgfri skill")
                    elif isinstance(v, dict):
                        notes.append(f"1 skill af {'/'.join(v.get('from', []))}" if "from" in v else "skill-valg")
                    elif v is True:
                        notes.append(f"skill {k}")
            for ft in eff.get("feats") or []:
                if isinstance(ft, dict) and ft.get("anyFromCategory"):
                    notes.append(f"1 valgfrit Origin feat (kategori {'/'.join(ft['anyFromCategory']['category'])})")
            if eff.get("immune") or eff.get("conditionImmune") or eff.get("vulnerable"):
                notes.append(f"immune {eff.get('immune')}, conditionImmune {eff.get('conditionImmune')}, vulnerable {eff.get('vulnerable')}")
            if eff.get("additionalSpells"):
                notes.append("granted_spells: " + grants_text(spell_grants, eff["additionalSpells"]))
            if notes:
                out.append("  * " + "; ".join(notes))
        out.append("")
    return out


def sec_backgrounds(e) -> list[str]:
    out = ["## Baggrunde (XPHB)", "",
           "Hver baggrund giver: 3 evner at fordele +2/+1 eller +1/+1/+1 på, 2 fast skills, 1 værktøj (fast eller valg), 1 fast Origin feat, startudstyr A eller B (B = kun guld).", ""]
    for bg in sorted(e.backgrounds(SOURCES), key=lambda b: b["name"]):
        if bg["source"] != SOURCE:
            continue
        ab = bg["ability"][0]["choose"]["weighted"]["from"]
        skills = ", ".join(k for k, v in bg["skillProficiencies"][0].items() if v)
        tools = []
        for k, v in (bg.get("toolProficiencies") or [{}])[0].items():
            tools.append(k if v is True else f"VALG {v} x " + {"anyArtisansTool": "Artisan's Tools", "anyMusicalInstrument": "Musical Instrument", "anyGamingSet": "Gaming Set"}.get(k, k))
        feat = ""
        for ft in bg.get("feats", []):
            for key in ft:
                base, _, variant = key.partition(";")
                feat = " ".join(w.capitalize() for w in base.split("|")[0].split()) + (f" ({variant.split('|')[0].strip().capitalize()})" if variant else "")
        eq = bg.get("startingEquipment", [{}])[0]
        out.append(f"* **{bg['name']}**: evner {'/'.join(a.upper() for a in ab)} · skills {skills} · værktøj {', '.join(tools) or 'ingen'} · feat {feat}")
        if eq:
            out.append("  * Udstyr " + " | ".join(f"{k}: {_equipment(eq[k])}" for k in sorted(eq)))
    out.append("")
    return out


def sec_feats(e, spell_grants) -> list[str]:
    out = ["## Feats (XPHB)", "",
           "Kategori: O = Origin, G = General (kræver level 4 og giver ofte +1 til en evne), FS = Fighting Style, EB = Epic Boon (level 19, evnen kan nå 30). "
           "`+ evne` = feat'et giver +1 til en evne (loft 20, EB 30). `ASI` = Ability Score Improvement (+2 til én evne eller +1 til to; loft 20).", ""]
    rows = []
    for ft in e._load("feats.json").get("feat", []):
        if ft.get("source") != SOURCE:
            continue
        cat = ft.get("category") or "?"
        pre = []
        for p in ft.get("prerequisite") or []:
            bits = []
            if p.get("level"):
                bits.append(f"lvl {p['level'] if isinstance(p['level'], int) else p['level'].get('level')}")
            for a in p.get("ability") or []:
                bits.append("/".join(f"{k.upper()}>={v}" for k, v in a.items()))
            if p.get("proficiency"):
                bits.append("trænet i " + "/".join(str(v) for d in p["proficiency"] for v in d.values()) + " armor")
            if p.get("spellcasting2020") or p.get("spellcasting"):
                bits.append("kan kaste spells")
            if p.get("feature"):
                bits.append("feature " + "/".join(p["feature"]))
            if p.get("otherSummary"):
                bits.append(p["otherSummary"]["entrySummary"])
            pre.append(" ".join(bits))
        pre_txt = " ELLER ".join(x for x in pre if x)
        ab = ""
        for a in ft.get("ability") or []:
            if a.get("hidden"):
                continue
            if a.get("choose"):
                ab = "+" + str(a["choose"].get("amount", 1)) + " " + "/".join(x.upper() for x in a["choose"]["from"])
            else:
                ab = ", ".join(f"+{v} {k.upper()}" for k, v in a.items() if k in ("str", "dex", "con", "int", "wis", "cha"))
        rep = " (kan tages flere gange)" if ft.get("repeatable") else ""
        line = f"{ft['name']} [{cat}]{(' ' + pre_txt) if pre_txt else ''}{(' ' + ab) if ab else ''}{rep}"
        if ft.get("additionalSpells"):
            line += " · spells: " + grants_text(spell_grants, ft["additionalSpells"])
        rows.append(line)
    out += [f"* {r}" for r in rows]
    out.append("")
    return out


def sec_optional(e) -> list[str]:
    out = ["## Valgfrie klassefeatures (optional_features: {name, source: XPHB, types: [kode], class})", "",
           "EI = Eldritch Invocation (Warlock), MM = Metamagic (Sorcerer), MV:B = Maneuver (Fighter: Battle Master). Krav i parentes.", ""]
    groups: dict[str, list[str]] = {}
    for f in e.optional_features(SOURCES):
        if f["source"] != SOURCE:
            continue
        pre = []
        for p in f.get("prerequisite") or []:
            lv = (p.get("level") or {})
            if lv.get("level"):
                pre.append(f"niveau {lv['level']}")
            for o in p.get("optionalfeature") or []:
                pre.append("kræver " + spell_name(o))
            for sp in p.get("spell") or []:
                pre.append("kendt " + sp.get("entrySummary", "spell"))
        groups.setdefault("/".join(f["featureType"]), []).append(f["name"] + (f" ({', '.join(pre)})" if pre else ""))
    for typ in sorted(groups):
        out.append(f"* {typ}: " + "; ".join(sorted(groups[typ])))
    out.append("")
    return out


def sec_equipment(e) -> list[str]:
    items = e._load("items-base.json").get("baseitem", [])
    out = ["## Rustning og skjold (XPHB)", "",
           "type: LA = Light (AC = base + DEX), MA = Medium (AC = base + DEX højst +2), HA = Heavy (AC = base, ingen DEX). Skjold: +2 AC ovenpå.", ""]
    for it in sorted(items, key=lambda i: (str(i.get("type")), i.get("ac") or 0)):
        if it.get("source") != SOURCE:
            continue
        t = (it.get("type") or "").split("|")[0]
        if t in ("LA", "MA", "HA"):
            extra = (f" · Str {it['strength']}" if it.get("strength") else "") + (" · Stealth: Disadvantage" if it.get("stealth") else "")
            out.append(f"* {it['name']} ({t}): AC {it['ac']}{extra}")
        elif t == "S":
            out.append(f"* {it['name']}: +{it['ac']} AC")
    out += ["", "## Våben (XPHB) og Mastery", "", "Navn · kategori (Simple/Martial, Melee/Ranged) · skade · egenskaber · Mastery-egenskab", ""]
    for it in sorted(items, key=lambda i: (i.get("weaponCategory") or "", i.get("type") or "", i["name"])):
        if it.get("source") != SOURCE or not it.get("weaponCategory"):
            continue
        t = (it.get("type") or "").split("|")[0]
        kind = "Melee" if t == "M" else "Ranged"
        props = ", ".join(WEAPON_PROP.get((p if isinstance(p, str) else p["uid"]).split("|")[0], str(p)) for p in it.get("property", []))
        if it.get("dmg2"):
            props = props.replace("Versatile", f"Versatile ({it['dmg2']})")
        mastery = ", ".join(m.split("|")[0] for m in it.get("mastery", []))
        out.append(f"* {it['name']} · {it['weaponCategory'].capitalize()} {kind} · {it.get('dmg1', '-')} {DMG.get(it.get('dmgType'), it.get('dmgType', ''))}"
                   f"{(' · ' + props) if props else ''} · Mastery: {mastery}")
    out.append("")
    return out


def sec_spells(e) -> list[str]:
    spells = e._all_spells(SOURCES)
    by_class = {c: {s["name"] for s in e.class_spells(c, SOURCES)} for c in CLASS_LETTER}
    out = ["## Spells (XPHB)", "",
           "Klasselister: B = Bard, C = Cleric, D = Druid, P = Paladin, R = Ranger, S = Sorcerer, L = Warlock, W = Wizard. "
           "Eldritch Knight og Arcane Trickster vælger fra W. Spell-navnene er de præcise engelske navne.", ""]
    for lv in range(10):
        rows = []
        for s in sorted((s for s in spells if s.get("level") == lv and s["source"] == SOURCE), key=lambda s: s["name"]):
            letters = "".join(CLASS_LETTER[c] for c in CLASS_LETTER if s["name"] in by_class[c])
            flags = "*" if (s.get("meta") or {}).get("ritual") else ""
            rows.append(f"{s['name']}{flags} [{letters}]" if letters else f"{s['name']}{flags}")
        out.append(f"* {'Cantrips' if lv == 0 else f'Level {lv}'}: " + "; ".join(rows))
    out += ["", "`*` = Ritual.", ""]
    return out


# ---------------------------------------------------------------- hovedprogram
def build(data: Path, med_spells: bool = True, only: set[str] | None = None) -> str:
    e, races, spell_grants = _load_e5tools(data)
    parts = [
        "# Opslag til character.yaml (D&D 2024, XPHB)", "",
        "FAKTA fra 5etools-data, uden regeltekst. Bilag til `llm-karakter-prompt.md`. Navnene er de engelske, "
        "præcist som de skal stå i `character.yaml`. Er noget uklart her, så spørg brugeren i stedet for at gætte.", "",
    ]
    parts += sec_basics(e)
    parts += sec_classes(e, spell_grants, only)
    parts += sec_species(e, races, spell_grants)
    parts += sec_backgrounds(e)
    parts += sec_feats(e, spell_grants)
    parts += sec_optional(e)
    parts += sec_equipment(e)
    if med_spells:
        parts += sec_spells(e)
    return "\n".join(parts).rstrip() + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Lav llm-karakter-opslag.md ud fra 5etools-data (XPHB).")
    ap.add_argument("--kilde", help="5etools' data-mappe (ellers E5TOOLS_DATA, /srv/dnd5etools/data eller /e5tools/data)")
    ap.add_argument("--ud", default=str(UD), help=f"outputfil (standard {UD.name} i repoets rod)")
    ap.add_argument("--klasse", help="kun disse klasser, kommasepareret (fx Rogue,Wizard); spare plads, når klasserne er kendt på forhånd")
    ap.add_argument("--uden-spells", action="store_true", help="udelad spell-listen (sparer ca. 9.000 tegn)")
    args = ap.parse_args(argv)
    only = {k.strip().lower() for k in args.klasse.split(",") if k.strip()} if args.klasse else None
    text = build(_data_dir(args.kilde), med_spells=not args.uden_spells, only=only)
    Path(args.ud).write_text(text, encoding="utf-8")
    print(f"Skrev {args.ud}: {len(text):,} tegn, {text.count(chr(10)):,} linjer.".replace(",", "."))
    print("Husk: filen er afledt af bogindhold og hører til i .gitignore.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
