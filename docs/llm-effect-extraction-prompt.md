# Eksempel: den samlede besked til LLM'et (effekt-udtræk + dansk beskrivelse)

**`name_da` + `description_da` (uden `effects`) er nu IMPLEMENTERET** i
`llm_client.py`/`descriptions.py` (ét separat commit) - `name_da` er en
dansk undertitel til det engelske navn, ligesom `bibliotek`-kortenes eget
`dansk`-felt, IKKE en oversættelse der erstatter navnet. `effects`
(struktureret tal-udtræk) er stadig KUN denne skitse, ikke bygget.

Resten af dette dokument er et konkret eksempel på selve beskeden,
til at vurdere om designet holder, før noget kodes. Ingen af teksterne
herunder er opfundet: begge er den FAKTISKE output af
`e5tools.render_text()` for `Alert` og `Tough` (XPHB), hentet direkte fra
`/srv/e5tools/data/feats.json` i en kørende container. Det er bevidst - en
LLM-prompt bygget på en forestillet tekst beviser ingenting om det rigtige
system.

## Forudgående skridt (ikke selve beskeden)

For hver entry i batchen slås `{name, source, kind}` op i 5etools-data
(`e.get_feat()`/`e.get_spell()`/klassefeature-opslag), og teksten renses med
den EKSISTERENDE `e5tools.render_text()` - samme funktion byggeren allerede
bruger til at vise rå regeltekst. Ingen ny tekst-rensning opfindes til dette.

**Vigtig observeret detalje, ikke rettet:** `render_text()` gør
`{@variantrule Proficiency|XPHB|Proficiency Bonus}` til blot **"Proficiency"**
(den tager altid første `|`-led, ignorerer det tredje, som her reelt er
5etools' egen foretrukne visningstekst "Proficiency Bonus"). Det betyder
LLM'et rent faktisk ser "add your Proficiency to the roll", ikke "...Proficiency
Bonus...". Hvis det skulle forveksle "Proficiency" (en træning/kategori) med
"Proficiency Bonus" (tallet), er det en reel fejlkilde i selve INPUT'en til
LLM'et - ikke noget LLM'et "opfinder". Værd at rette i `e5tools.py`, hvis
dette design bygges.

**Bemærk:** Den rigtige, implementerede prompt (`llm_client._prompt()`) er
pt. simplere end eksemplet nedenfor - den beder kun om `name_da`/`description_da`
i formatet `id: dansk navn :: beskrivelse`, ét svar pr. linje (ikke et YAML-
dokument, og ingen `effects`/`confidence`). Eksemplet nedenfor er den
FULDE, fremtidige besked, inklusive effekt-udtræk - til at vise hvor det
bærer hen, ikke hvad der kører i dag.

## Selve beskeden (ét samlet user-message, som i `llm_client.describe_batch()`)

```
Du hjælper med et dansk D&D 2024 (Player's Handbook 2024)-karakterark.

For hver regel nedenfor får du dens navn, kilde, type og den fulde engelske
regeltekst (hentet direkte fra PHB 2024's egne data). Du skal returnere TO
ting pr. regel:

1. "description_da": en kort, præcis dansk gengivelse (1-3 sætninger) af HELE
   reglens indhold - ikke kun den første del, hvis reglen har flere separate
   virkninger. Oversæt IKKE selve regelnavnet (det forbliver altid engelsk).
2. "effects": en liste af MÅLBARE, PERMANENTE tal-ændringer reglen giver til
   et af felterne i Target-listen nedenfor - KUN hvis reglen rent faktisk
   giver en af dem. En situationsbestemt handling (noget du kan VÆLGE at
   gøre, fx bytte et slag, eller noget der kun gælder under en bestemt
   tilstand) er IKKE en permanent effekt - lad den stå ude af "effects" og
   beskriv den i stedet i "description_da". Er du i tvivl, lad "effects"
   være tom - en tom liste er altid et sikkert svar, en forkert effekt er
   ikke.

Target-liste (brug KUN disse - ingen andre værdier er gyldige):
  initiative, ac, hp_max, hp_per_level, speed,
  save:STR, save:DEX, save:CON, save:INT, save:WIS, save:CHA,
  skill:<skillnavn i små bogstaver, fx skill:perception>,
  damage_resistance, damage_immunity, damage_vulnerability,
  condition_immunity, darkvision

Hver effect har: target (fra listen ovenfor), type (add | set | resistance |
immunity | vulnerability | advantage), value (fx "PB", "2", "ability:CON",
eller en skadetype/tilstand), duration (permanent | conditional | temporary).
Sæt duration til ALT ANDET end "permanent", hvis effekten kun gælder under en
betingelse (raging, koncentration, "once per turn" osv.) - sådanne effects
regnes ALDRIG automatisk ind i karakterens tal, uanset duration-værdi, så det
er bedre at tage den med som "conditional" end at udelade den helt.

Svar med ÉT YAML-dokument, nøjagtigt i dette format, intet andet:

<id>:
  name: <uændret engelsk navn>
  name_da: <kort dansk undertitel - IMPLEMENTERET>
  description_da: <tekst - IMPLEMENTERET>
  effects:
    - {target: ..., type: ..., value: ..., duration: ...}   # KUN skitse, ikke bygget
  confidence: high | medium | low   # dit eget skøn på sikkerheden i "effects"

Reglerne:

---
id: alert-xphb
name: Alert
source: XPHB
kind: feat
text: |
  You gain the following benefits.
  **Initiative Proficiency**
    When you roll Initiative, you can add your Proficiency to the roll.
  **Initiative Swap**
    Immediately after you roll Initiative, you can swap your Initiative with
    the Initiative of one willing ally in the same combat. You can't make
    this swap if you or the ally has the Incapacitated condition.
---
id: tough-xphb
name: Tough
source: XPHB
kind: feat
text: |
  Your Hit Points maximum increases by an amount equal to twice your
  character level when you gain this feat. Whenever you gain a character
  level thereafter, your Hit Points maximum increases by an additional 2
  Hit Points.
---
```

(En rigtig batch ville have op til 10 sådanne `---`-blokke, jf.
`descriptions.BATCH_SIZE`. Kun to her, fordi det er de to jeg faktisk har
efterprøvet den rå tekst for.)

## Forventet svar - og hvorfor Alert kun får ÉN effect, ikke to

```yaml
alert-xphb:
  name: Alert
  name_da: Opmærksom
  description_da: >
    Du kan ikke blive overrasket, og du kan lægge din Proficiency Bonus til
    dit initiativ-slag. Du kan desuden bytte dit initiativ-resultat med en
    villig allieret i samme kamp, så længe ingen af jer er Incapacitated.
  effects:
    - {target: initiative, type: add, value: PB, duration: permanent}
  confidence: high

tough-xphb:
  name: Tough
  name_da: Hårdfør
  description_da: >
    Dit maksimale HP stiger med det dobbelte af dit karakterniveau, når du
    får dette feat, og med yderligere 2 for hvert niveau du opnår derefter.
  effects:
    - {target: hp_per_level, type: add, value: "2", duration: permanent}
  confidence: high
```

**Initiative Swap er bevidst UDENFOR `effects`** - det er ikke en
tal-ændring, det er en valgfri handling (du kan vælge at bytte et
slagresultat). Den hører hjemme i `description_da` (hvor den nu faktisk
står, i modsætning til mit eget tidligere eksempel i chatten, som udelod den
helt) - ikke i et forsøg på at tvinge den ind i Target-listen, hvor den ikke
passer. Det er netop forskellen på de to felter: `effects` er kun de rene
tal-ændringer der er sikre at regne automatisk med; alt det situationsbestemte,
valgfrie eller fortællende bliver kun stående som tekst til spilleren.

## Hvad der stadig er ubesvaret (ikke en del af denne skitse)

* Hvad gør vi, når `confidence` er `medium`/`low`? (Forslag fra sidste
  skitse: foldes ikke automatisk ind i totalerne - vises som forslag, ikke
  autoritativt.)
* Skal effects for KLASSEFEATURES (ikke feats) også dækkes - de har ofte
  flere, niveau-afhængige dele (fx Barbarian Rage ændrer sig med niveau).
  Ikke undersøgt endnu.
* Selve integrationen i `character_yaml.py` (hvordan `effects` rent faktisk
  folder ind i `initiative`/`hp` osv.) er stadig kun skitseret i den
  tidligere besked, ikke designet i detaljer.
