# Navnekonvention: engelske regelnavne

Navne på regelbegreber skrives på engelsk, som de står i Player's Handbook 2024 (PHB). Dansk forklaring står rundt om navnet.

```
Dexterity            ikke: Smidighed
Saving Throw         ikke: Redningskast
Longsword            ikke: Langsværd
Opportunity Attack   ikke: Modangreb
Fire                 ikke: ild
Simple               ikke: enkle våben
```

Forklarende tekst, beskrivelser og sammenhæng er på **dansk**. Det engelske navn er det, man slår op i PHB.

## Hvad er et "navn"?

Alt, der har et navn i PHB 2024, og som man kan slå op:

| Gruppe | Eksempler |
|---|---|
| Evner og tal | Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma (STR, DEX, CON, INT, WIS, CHA) · Armor Class (AC) · Hit Points (HP) · Hit Dice · Initiative · Speed · Proficiency Bonus (PB) · Saving Throw · Passive Perception |
| Skills | Athletics, Acrobatics, Stealth, Perception, Insight … |
| Handlinger | Attack, Dash, Disengage, Dodge, Help, Hide, Influence, Magic, Ready, Search, Study, Utilize · Bonus Action · Reaction · Opportunity Attack |
| Tilstande | Charmed, Frightened, Grappled, Prone, Restrained … · Advantage / Disadvantage |
| Skadetyper | Bludgeoning, Piercing, Slashing, Fire, Cold, Lightning, Thunder, Acid, Poison, Necrotic, Radiant, Psychic, Force |
| Våbenkategorier og rustning | Simple, Martial · Light, Medium, Heavy, Shield |
| Ting | våben (Longsword, Handaxe, Scimitar), rustning (Chain Mail), udstyr (Thieves' Tools, Ball Bearings, Rope, Healer's Kit), værktøj, Weapon Mastery (Cleave, Vex, Nick, Graze, Slow …) |
| Evner og magi | klasseevner (Sneak Attack, Rage), feats (Tough, Lucky), art-træk (Darkvision), besværgelser (Eldritch Blast), skoler (Evocation), hvile (Short Rest, Long Rest) |

## Undtagelse i layoutet: angrebstabel og udstyrsliste

Her står det danske navn øverst og det engelske i lille skrift under. Dataen skrives som `Dolk <em>Dagger</em>`: dansk først, engelsk sidst. Generatoren laver den lille linje. Hvis navnet kun findes på dansk (homebrew), skrives `<i>Hjemmelavet</i>` i stedet for det engelske navn. Overskrifter som "Angreb · Attacks" står uændret. Udstyrslinjer deles op i punkter ved " · ", og hvert punkt får sit eget dansk/engelsk-par.

## Sådan skriver du det

1. **Det engelske navn står alene.** `Dexterity`, ikke `Dexterity (Smidighed)` og ikke `Smidighed`. Forkortelser bruges kun for evner og tal (STR, DEX, AC, HP, PB, DC). Skills og andre navne skrives fuldt ud, også når pladsen er lille: `Animal Handling`, ikke `Animal H.`.
2. **Dansk forklaring i en sætning.** En dansk sætning må gerne have den engelske term i parentes efter et dansk ord: `Halv skade fra slag, stik og hug (Bludgeoning, Piercing, Slashing)`.
3. **Forkortelser** (STR, DEX, AC, HP, PB, DC) er engelske og bruges som de er.
4. **Faste udtryk i løbende tekst** skrives på engelsk: "tag en *Short Rest*", "du får *Advantage*". Det gælder også *Disadvantage*, *Long Rest*, *Concentration* og *Ritual*. Reglen står sådan indtil videre og tages op igen senere.
5. **Skadetyper og våbenkategorier** er kun engelske, også i kort- og våbentekst.
6. **Danske etiketter og engelske navne.** Etiketter som Rustning, Våben, Værktøj, Træk og Udstyr står på dansk. Navnene inde i felterne står på engelsk, præcis som i PHB. Eksempel: `Rustning: Light, Medium, Heavy, Shield` og ikke `Rustning: let, tynd, mellem, tung, tyk`. Oversæt aldrig et engelsk navn til dansk, og ret ikke et engelsk navn, der allerede er korrekt, til en dansk variant.
7. **Måleenheder** er ft (foot), som i reglerne. Afstande skrives med ft, fx `25 ft` eller `120 ft`.
8. **Baggrundsarket (side 4)** er fritekst til rollespillet, fx personlighed, historie, familie og mål. Teksten er ikke regler, så den oversættes, rettes og tolkes ikke, og navne og udsagn må gentages som skrevet. Sektionen "Træning og valg" undtages ikke, fordi den er regelindhold.
9. **Homebrew** (egne ting uden engelsk regelnavn, fx Felis-artens træk) får ét dansk navn og markeres med `Hjemmelavet`. På kort står `kilde: Hjemmelavet`, og bagsiden viser `Hjemmelavet` nederst. På ark står `<i>Hjemmelavet</i>` lige under navnet i angrebstabel og udstyrsliste, fx `Orksværd <i>Hjemmelavet</i>`.

## I filerne

* I YAML: skriv det engelske navn i `navn`-felter. Den danske undertekst står i `dansk`-feltet på kort.
* På kort har `navn` altid det engelske navn, og `dansk` er den danske undertekst.
* Slå altid navnet op i PHB 2024. Gæt ikke på et "officielt" navn, og opfind ikke danske regelnavne.

## Afvigelser i de nuværende data

Generatoren og de eksisterende karakter- og bibliotekfiler følger reglen ikke endnu. Fjern punktet, når det er rettet.

* **Generatoren, side 1:** evnenavnene (`ABIL` i `scripts/karakterark/karakterark.py`: Styrke, Smidighed …), *Redningskast*, *Passive sanser*, *Fart*, *Initiativ*, *Prof. bonus* og *Passiv Perc.*. Legenden *trænet (proficient)*, *Expertise (dobbelt bonus)* og *Slag = d20 + formlen* er også danske. Afventer valg mellem *Dice* og *Terning*.
* **Generatoren, side 2 og spellkort:** handlingsnavnene (Angrib, Spurt, Undvig …) og skolenavnene, der står dansk først (*Fremkaldelse Evocation*).
* **Karakterfiler:** stats-etiketter (*Initiativ*, *Fart · Speed*, *Prof. bonus*), sektionstitler (afventer), traits med dansk navn (*Mørkesyn*, *Modstand mod gift*, *Raseri*, *Held*, *Modig*, *Naturligt snigende*, *Snigangreb*, *Pagtmagi*) og udstyr med dansk navn uden engelsk linje.
* **Bibliotek:** `navn` på tre kort er dansk: `To våben` (`light-to-vaaben`), `Cantrips og spell slots` (`regel-slots`) og `Koncentration og ritualer` (`regel-konc`).
* **Skabelonen** (`karakterer/_skabelon/`) bruger de samme danske mønstre, som ikke er rettet endnu.
