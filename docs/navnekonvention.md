# Navnekonvention: engelske regelnavne oversættes ikke

**Reglen (besluttet efter spilaftenen i oktober 2026):** navne på stats og ting må **ikke** oversættes fra engelsk. Står der kun et dansk navn, ved man ikke, hvad man skal lede efter i regelbogen, og man er i tvivl om, hvad det er oversat fra. Er en oversættelse nyttig, står den **i parentes efter** det engelske navn.

```
Dexterity (Smidighed)         ikke: Smidighed
Saving Throw (redningskast)   ikke: Redningskast
Longsword (langsværd)         ikke: Langsværd
Opportunity Attack (modangreb)
```

Forklarende tekst, beskrivelser og sammenhæng er stadig på **dansk**. Kun *navnet* på regelbegrebet er engelsk.

## Hvad er et "navn"?

Alt, der har et navn i Player's Handbook 2024 (PHB), og som man kan slå op:

| Gruppe | Eksempler |
|---|---|
| Evner og tal | Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma (STR, DEX, CON, INT, WIS, CHA) · Armor Class (AC) · Hit Points (HP) · Hit Dice · Initiative · Speed · Proficiency Bonus (PB) · Saving Throw · Passive Perception |
| Skills | Athletics, Acrobatics, Stealth, Perception, Insight … (står allerede på engelsk) |
| Handlinger | Attack, Dash, Disengage, Dodge, Help, Hide, Influence, Magic, Ready, Search, Study, Utilize · Bonus Action · Reaction · Opportunity Attack |
| Tilstande | Charmed, Frightened, Grappled, Prone, Restrained … · Advantage / Disadvantage |
| Ting | våben (Longsword, Handaxe), rustning (Chain Mail), udstyr (Thieves' Tools, Ball Bearings), værktøj, Weapon Mastery (Cleave, Vex, Sap …) |
| Evner og magi | klasseevner (Sneak Attack, Rage), feats (Tough, Lucky), art-træk (Darkvision), besværgelser (Eldritch Blast), skoler (Evocation), hvile (Short Rest, Long Rest) |

## Sådan skriver du det

1. **Engelsk først, dansk i parentes:** `Dexterity (Smidighed)`. Er pladsen lille, så brug kun det engelske navn eller forkortelsen: `DEX`.
2. **Kursiv er ikke nok.** Før stod den engelske term i kursiv ved siden af en dansk hovedtekst (`Smidighed <em>DEX</em>`). Nu er det engelske navn hovedteksten.
3. **Forkortelser** (STR, DEX, AC, HP, PB, DC) er engelske og bruges som de er.
4. **Faste udtryk i løbende tekst:** skriv det engelske navn, fx "tag en *Short Rest*", "du får *Advantage*".
5. **Måleenheder** er fod (ft), som i reglerne.
6. **Egne ting og homebrew** (fx Felis-artens træk) har ikke et engelsk regelnavn. Giv dem ét navn, og skriv `kilde: Hjemmelavet`.

## I filerne

* I YAML: skriv det engelske navn i `navn`-felter, og oversættelsen i parentes eller i `dansk`-feltet på kort.
* På kort har `navn` altid det engelske navn, og `dansk` er den danske undertekst. Det er allerede i orden.
* Slå altid navnet op i PHB 2024. Gæt ikke på et "officielt" navn, og opfind ikke danske regelnavne.

## Kendte afvigelser, der skal rettes

Generatoren og de nuværende data blev lavet *før* reglen og følger den ikke endnu:

* **Evner på side 1** skrives `Styrke STR`, `Smidighed DEX` … (se `ABIL` i `scripts/karakterark/karakterark.py`). Skal være `Strength (Styrke)` osv.
* **Faste ord i generatoren:** `Redningskast`, `Fart`, `Initiativ`, `Prof. bonus`, `Angreb`, `Våben`, `Ubevæbnet`, `Bevægelse`, `Penge` og lignende.
* **Handlingsarket** viser danske handlingsnavne med engelsk i kursiv: `Angrib`, `Spurt`, `Træk dig`, `Undvig`, `Hjælp`, `Gem dig`, `Påvirk`, `Magi`, `Afvent`, `Søg`, `Undersøg`, `Brug`, `Modangreb`.
* **Karakterfiler** har danske stats-etiketter: `Initiativ`, `Fart · Speed`, `Raseri Rage`, `Våben Weapons`, `Udstyr Equipment` og lignende.

Ret dem ved at vende rækkefølgen (engelsk først, dansk i parentes), og kontrollér med `python3 dnd.py tjek` og et kig på siden, at teksten stadig kan være på A4-siden.
