# Karakterark (nyt system): format for `character.yaml`

Én fil pr. choices.yaml-karakter: `karakterer/<navn>/character.yaml`. Engelsk-
nøglet, i modsætning til den gamle [`karakter.yaml`](karakterark-yaml.md).
Genereres af `webui/builder/character_yaml.py`.

Findes der en `choices.yaml` (se [choices-yaml.md](choices-yaml.md)) for
karakteren, er `character.yaml` en AFLEDT fil: den genberegnes og
overskrives, hver gang choices.yaml gemmes (`derive_and_save()`). Kun
`choices.yaml` er kilden til sandhed i det tilfælde - rediger ikke
`character.yaml` i hånden for en sådan karakter, det bliver overskrevet.

Findes der INGEN `choices.yaml`, er `character.yaml` i stedet den primære
fil - skrevet direkte, af builder-UI'en eller af et LLM. Denne vej er endnu
ikke bygget (kun formatet er klar til det).

## Opbygning

```yaml
name: Thorgrim
level: 5                      # total, sum af classes[].level
race: {name: Human, source: XPHB}
background: {name: Soldier, source: XPHB}
classes:
- {name: Fighter, source: XPHB, level: 5, subclass: Eldritch Knight}
abilities: {STR: 18, DEX: 14, CON: 16, INT: 10, WIS: 12, CHA: 8}
proficiency_bonus: 3           # opslået fast tabel (PHB 2024), ikke et valg
hp: 44                         # se "HP" nedenfor
ac: '{10+DEX}'                 # IKKE afledt - se "Manuelle felter"
initiative: '{+DEX}'           # IKKE afledt - se "Manuelle felter"
speed: 30                      # fra racens egen speed
hit_die: 10                    # primærklassens hit die (se "Multiclass-forenkling")
saves: [STR, CON]              # primærklassens save-proficiencies
skills: [athletics, intimidation]
expertise: []
tools: ["Smith's Tools"]       # flad liste - IKKE grupperet efter evne, se nedenfor
languages: Common              # IKKE afledt - se "Manuelle felter"
can_use: {armor: "light, medium, heavy, shields", weapons: "simple, martial"}
masteries: []                  # ikke udledt endnu, se nedenfor
feats: [{name: Tavern Brawler, source: XPHB}]
spells_known: [{name: Fire Bolt, source: XPHB}]
class_features: [{class: Fighter, name: Action Surge, source: XPHB, level: 2}]
race_traits: [{name: Darkvision, source: XPHB}]
extra_training: []
summary: [[Klasse, Fighter 5], [Art, Human], [Baggrund, Soldier]]
```

## Manuelle felter

`ac` og `languages` udregnes IKKE pålideligt af `derive_from_state()` - de
får kun en fornuftig standardformel (`{10+DEX}`, `Common`), og bevares
derefter fra en eksisterende `character.yaml` i stedet for at blive
overskrevet igen (se `PRESERVED_FIELDS` i `character_yaml.py`).
choices.yaml tracker ikke den nødvendige info (hvilken rustning er rent
faktisk udstyret? hvilke ekstra sprog gav en valgfri tildeling?) - samme
situation som i den gamle `karakter.yaml`, hvor begge felter også er
fritekst, spilleren selv sætter. Spilleren retter feltet i hånden,
informeret af feat-listen (som stadig vises i Træning og valg) - samme
afvejning de 8 håndskrevne karakterer allerede lever med for hele
stats-rækken.

`initiative` var tidligere i samme kategori (PB på initiativ kommer fra
enkelte feats, fx Alert XPHB, men 5etools' data har intet struktureret felt
for den slags mekanisk-effekt-tekst) - det er nu løst af et LLM-baseret
effects-udtræk i stedet (se `effects.py` og
[llm-effect-extraction-prompt.md](llm-effect-extraction-prompt.md)):
`character_yaml._apply_effects()` folder høj-konfidens, PERMANENTE effects
ind i formlen hver gang. `initiative` er derfor IKKE længere et
`PRESERVED_FIELDS`-felt - den genberegnes altid, og overskriver BEVIDST en
manuel rettelse, hvis en høj-konfidens effect findes. `render.py` læser den
stadig bare som tallet den er, ligesom alt andet - selve udregningen ligger
i `character_yaml.py`, aldrig i renderen.

## Kendte forenklinger

* **`tools` er en flad liste**, ikke grupperet efter evne som den gamle
  `vaerktoej: {DEX: [...]}`. 5etools' egne data har ikke en sikker,
  opslåelig "hvilken evne styrer dette værktøj"-regel, og Print-fanen viser
  derfor (endnu) ikke værktøj under evne-boksen.
* **`masteries` udledes ikke endnu.** At afgøre hvilken Weapon Mastery-
  egenskab et valgt våben faktisk har, kræver et opslag pr. våben i
  5etools' `items-base.json`, som ikke er bygget endnu.
* **HP bruger kun primærklassens hit die** (`hit_die + CON*level +
  sum(hp_rolls)`). Ægte multiclass-HP skal bruge HVER klasses egen hit die
  for de niveauer, DEN klasse blev taget på - men `choices.yaml`s
  `hp_rolls` gemmer kun et terningslag pr. SAMLET niveau, ikke pr. klasse
  (se [choices-yaml.md](choices-yaml.md)), så denne forenkling findes
  allerede i dataformatet, ikke kun i `character_yaml.py`.
