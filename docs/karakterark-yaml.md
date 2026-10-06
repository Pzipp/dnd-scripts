# Karakterark: format for `karakter.yaml`

Én fil pr. karakter: `karakterer/<navn>/karakter.yaml`. Generatoren er `scripts/karakterark/karakterark.py`. Kommenteret skabelon: [`karakterer/_skabelon/karakter.yaml`](../karakterer/_skabelon/karakter.yaml). Kopiér den, i stedet for at skrive fra bunden.

```
python3 dnd.py karakterark <navn> [--stil farve|sorthvid|begge] [--pdf]
```

## Opbygning

```yaml
titel: Valak karakterark     # titel på HTML/PDF
faelles: {...}               # alle fælles felter: navn, evner, pb, ac, hp, skills, ...
sider:                       # én post pr. side, i udskriftsrækkefølge
- top: {...}                 # valgfri: sidehoved
  layout: [...]              # bokse, kolonner og rækker
  foot: '...'                # valgfri: sidefod
- layout: [...]
```

Hver side er en post under `sider:`. En side kan have hvad som helst af de bokse, der findes (se tabellen nedenfor). Der er ingen låsning til bestemte sider.

## Sidehoved (`top`)

| Felt | Standard | Betydning |
|---|---|---|
| `titel` | `faelles.navn` | Stor titel |
| `undertitel` | (tom) | Lille kursiv tekst ved titlen, fx `Hvad kan jeg gøre?` |
| `ident` | `faelles.ident` | Liste af `[etiket, værdi]`, højst 4. Brug `"…"` når værdien har komma: `[Fordel, "2 d20, tag højeste"]` |

`top: {}` giver et sidehoved med standardværdierne. Udelades `top`, er der intet sidehoved.

## Layout

Layoutet er et træ af tre slags noder:

| Node | Betydning |
|---|---|
| `type: <navn>` | En boks. Typen bestemmer indholdet (se tabellen) |
| `kolonner: [{bredde, indhold}, ...]` | Kolonner side om side. `bredde` er relativ: `1` og `2` giver 1/3 og 2/3 |
| `raekker: [...]` | Rækker, der stables lodret |

Kolonner kan indeholde rækker og omvendt. Hver boks får sin egen ramme med `data-type`, så CSS kan ramme den.

På smal skærm (fx en telefon) stables kolonnerne under hinanden i YAML-rækkefølge. Udskriften er altid side om side.

## Bokstyper

Typerne ligger i `REGISTRY` i `karakterark.py`. Tjek `python3 dnd.py tjek` fanger tastefejl og viser forslag.

| Type | Felter | Indhold |
|---|---|---|
| `stats` | `felter` (valgfri) | Stat-rækken. Uden `felter`: AC, Max HP, Hit Dice, Initiativ, Fart, Prof. bonus og Passiv Perception, udregnet ud fra `faelles` |
| `evner` | — | De seks evner med saves, skills og værktøj. Udregnes ud fra `faelles` |
| `passiv` | `titel`, `punkter: [[etiket, værdi]]` | Passive sanser |
| `sprog` | `titel`, `tekst` | Sprog |
| `angreb` | `titel`, `angreb: [[våben, ramme, skade, noter]]` | Angrebstabel |
| `regler` | `titel`, `undertitel`, `punkter: [tekst]` | Punktliste, fx Sneak Attack |
| `traek` | `titel`, `punkter: [{navn, tag, tekst}]` | Evner og træk. `tag` er en lille etiket |
| `bonus` | samme som `traek` | Bonus actions |
| `tur` | `titel`, `undertitel`, `punkter: [tekst]` | "Din tur"-plan |
| `handlinger` | `bonus: {Handling: Tag}` | Handlingstabellen. `bonus` sætter en Bonus Action-tag på handlingen |
| `ubevaebnet` | (titel) | Slag, Grapple og Shove, udregnet ud fra `faelles` |
| `bevaegelse` | (titel) | Fart, klatring, spring og fald |
| `ekstra` | `titel`, `punkter: [tekst]` | Egne punkter, fx racetræk |
| `livsredning` | (titel) | Death saves og hvil |
| `mastery` | (titel) | Valgte Weapon Mastery, hentet fra `masteries` |
| `nyttige` | (titel) | Nyttige ting (faste tekster) |
| `situationer` | (titel), `vaerktoej: [{navn, evne, brug, niveau}]` | Skill checks, med værktøj. `niveau`: `p` (trænet, standard) eller `e` (expertise) |
| `tilstande` | (titel) | Conditions |
| `penge` | (titel) | Møntfelter PP, GP, EP, SP, CP |
| `tekst` | `titel`, `afsnit: [tekst]`, `tomme` | Løbende tekst |
| `fakta` | `titel`, `felter: [[etiket, værdi]]` | Nøgle/værdi-felter |
| `liste` | `titel`, `punkter: [tekst]`, `tomme` | Punktliste med linjer til at skrive på. `tomme` er antal tomme linjer |
| `traening` | (titel), `punkter`, `tomme` | Træning og valg. Bygges automatisk ud fra `kan_bruge`, `sprog`, `skills`, `expertise`, `masteries` og `feats`. `punkter` tilføjes til sidst |

Standardtitlen står i `REGISTRY`. Den bruges, når boksen ikke har `titel`. Skriv `titel` for at ændre den.

Notetyperne (`vaaben`, `udstyr`, `sarlige`, `penge`, `kampagne`, `steder`, `personer`, `udseende`, `kendetegn`, `historie`, `traening`, `personlighed`, `familie`, `fjender`, `maal`, `hemmeligheder`) har hver en fast standardtitel og en fast form. De er registrerede, så de kan stå flere steder og CSS kan ramme dem. `liste`, `tekst` og `fakta` er frie typer, der bruges, når der ikke findes en passende.

## Fælles felter (`faelles`)

| Felt | Type | Betydning |
|---|---|---|
| `navn` | tekst | Karakterens navn |
| `ident` | liste af `[etiket, værdi]` | Standard-sidehoved |
| `evner` | `{STR: 16, DEX: 14, ...}` | De seks scores. Modifier regnes ud |
| `mod` | `{STR: 4}` | Tving en modifier, hvis papirets tal afviger |
| `pb` | tal | Proficiency Bonus (standard 2) |
| `level` | tal | Level (bruges til Hit Dice i stat-rækken) |
| `hp` | tal | Max HP |
| `ac` | tekst/formel | AC, fx `'{11+DEX}'` |
| `fart` | tal | Speed i ft (standard 30) |
| `hit_die` | tal | 8, 10, 12 … (standard 8) |
| `saves` | liste | Trænede saving throws, fx `[STR, CON]` |
| `skills` | liste | Trænede skills, engelske navne som i PHB |
| `expertise` | liste | Skills med dobbelt bonus (vises ◆) |
| `vaerktoej` | `{DEX: ["Thieves' Tools"]}` | Værktøj under evnen. `["navn", "e"]` = expertise |
| `sprog` | tekst | Sprog |
| `kan_bruge` | `{Rustning: …, Våben: …, Værktøj: …}` | Vises under Træning og valg |
| `masteries` | liste af `[mastery, våben]` | Weapon Mastery. Teksten hentes automatisk |
| `feats` | liste | Feats |
| `traening_ekstra` | liste | Ekstra linjer under Træning og valg |

## Tekstregler

| Skriv | Bliver til |
|---|---|
| `[]` | afkrydsningsfelt |
| `{+DEX+PB}` | udregnet med fortegn: `+5` |
| `{11+DEX}` | udregnet uden fortegn: `14` |
| `<b>`, `<i>`, `<em>` | fed og kursiv (HTML er tilladt). Skriv `&` som `&amp;` |

Udtryk kan bruge `STR DEX CON INT WIS CHA` (modifiers, regnet ud fra scoren) og `PB`. Formlen bag et tal vises automatisk i lille skrift under tallet, fx `d20 + DEX + PB`.

## Plads

Hver side er én A4-side, og alt, der går ud over siden, klippes af. I webui'en står der en advarsel i forhåndsvisningen, med boksens titel og hvor mange pixels den går ud over siden. Flyt boksen til en anden kolonne eller side, eller forkort teksten. Kig altid på siden, efter du har ændret meget.

## YAML-faldgruber

* En tekst, der starter med `{` eller `[`, skal i citationstegn: `'{+DEX+PB}'`.
* En tekst med `: ` (kolon og mellemrum) skal i citationstegn.
* En liste med komma i et element skal i citationstegn: `[Fordel, "2 d20, tag højeste"]`.
* `Ja`, `Nej`, `on`, `off` uden citationstegn bliver sandt/falsk.
* Indryk med mellemrum (ikke tabulator).
* Kør `python3 dnd.py tjek` efter hver ændring.

## Navne

Følg [navnekonventionen](navnekonvention.md): engelske regelnavne først, dansk i parentes.
