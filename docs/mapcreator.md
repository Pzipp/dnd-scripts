# Kortbygger (`/mapcreator`)

Editor til slagkort (top-down, uden grid i selve billedet): lag med terræn, genstande, mure og effekter. Klienten (`mapcreator/`, TypeScript + Svelte) ejer dokumentet og tegningen, serveren (`webui/mapcreator/`) gemmer kortene og lægger senere færdige billeder i det simple VTT.

## Status

Færdigt: dokumentmodel og lag (tilføj, slet, flyt, skjul, lås, opacitet, højde), kamera (pan, zoom, knib), fortryd/gentag, gem og åbn, **terrænmaling** (flad, malet underlag med pensler: rund, kant, gitter og totter; gennemsigtighed, hårdhed og mønster), **genstande** (familier med varianter, vælger, flyt/skalér/rotér, skygger), **linjer og former** (mure, stier, broer, kløfter, bygninger) med døre, porte og vinduer, en **objektliste**, et **scatter-værktøj** til skov og planter, og **eksport** med navngivne udgaver (download eller direkte i VTT'et). **Egne genstande** (billedimport med automatisk fjernelse af baggrund) er også med. En **generator** laver en base ud fra et områdetema, og kortets **størrelse** kan ændres bagefter. Mangler: polering. Se [mapcreator-plan.md](mapcreator-plan.md).

Flere dokumenter: [mapcreator-format.md](mapcreator-format.md) (JSON-format og API), [mapcreator-objects.md](mapcreator-objects.md) (laver og forbedre genstande) og [`mapcreator/README.md`](../mapcreator/README.md) (kode og udvikling).

## Genveje

| Tast | Værktøj eller handling |
|---|---|
| H | Hånd (flyt kortet; hjul zoomer, to fingre knibes) |
| V | Vælg (genstande, mure, åbninger) |
| G | Genstand (sæt ud) |
| S | Spred (scatter) |
| L | Linje (også M) |
| F | Form |
| D | Dør/åbning |
| B / E | Pensel / viskelæder (terræn); `[` og `]` ændrer størrelsen |
| Ctrl+Z / Ctrl+Y | Fortryd / gentag |
| Ctrl+S | Gem |
| Ctrl+D | Duplikér valgt genstand |
| Delete | Slet valgt (åbning, mur eller genstand) |
| Piltaster (Shift = stort skridt) | Flyt valgt genstand |
| Esc | Tilbage til Vælg / fravælg / afbryd mur |
| Shift under træk | Lås proportioner eller rund af til 15° / lås murens vinkel til 15° |

## Terræn (malet underlag)

Et grund- eller gulvlag (`type: ground | floor`) er et **fladt billede**, som i et almindeligt tegneprogram: laget husker ikke, hvordan noget er malet, kun pixels. Man vælger en pensel og et materiale og maler; fortryd virker stadig. Intet regnes om bagefter, og kun de fliser, man har rørt, gemmes igen.

**Penslen** (B; viskelæder E). Valgene står i panelet til venstre:

- **Rund**: rund pensel med *hårdhed* (høj = skarp kant, lav = blød kant, til sløring og bløde overgange).
- **Kant**: skarp, men *ujævn* kant (strand, klippekant, jordpletter). Ujævnheden følger verdenen (støj i verdenskoordinater), så flere stempler giver én sammenhængende, uregelmæssig kant.
- **Gitter**: maler hele felter ad gangen (størrelsen rundes til hele felter).
- **Totter**: sætter græstotter (genstandene *Høj græstot* og *Tæt græs*, med farve) ud med en vis **afstand**, **størrelse** og **tæthed**. Tottene bliver til pixels i laget; hver plads i et skævt net afgøres højst én gang pr. strøg, så man kan male frem og tilbage uden at de hober sig op. Nettet forskydes for hvert strøg.
- **Størrelse** (`[` og `]` ændrer den), **gennemsigtighed** (gælder hele strøget, så overlappende stempler ikke stakker: sæt den til 40 % og mal vand op i sandet for en blød strand), **mønsterstørrelse** og **drejning** af materialets mønster, en række **seneste materialer**, og *Fyld hele laget* / *Ryd hele laget*.
- Brosten, fliser og trægulv males som **hele sten** (afgjort ved stenens midte), så kanten af en plet består af hele sten; slå *Hele sten* fra for at skære dem til ved penselkanten (fx et gulv, der skal ende nøjagtigt ved en væg). Fugerne er gennemsigtige, så det, der ligger under, skinner igennem.

**Materialer** (`render/materials.ts`; id'er må aldrig omnummereres, nye får nyt id bagerst). Natur: tre slags græs (mark, skov, tørt), jord, mudder, sne. Sand og sten: fire slags sand, ørken, sten, mørkt fjeld. Vand. Veje og gulve: brosten, grus, fliser, trægulv. Hvert materiale er en lille funktion af position (`shade`); penslen læser den pixel for pixel i verdenskoordinater, så to strøg med samme materiale passer sammen. Græsset får sine strå fra en lille tekstur (`render/grassTexture.ts`). De tre sorte *Tomrum*-materialer findes ikke i paletten mere; brug Linje-værktøjets *Kløft* og *Klippekant*.

**Lag.** *Fyld hele laget* gør materialet til lagets **baggrund**: fliser, der ikke er malet i, tegnes først, når de ses, gemmes eller eksporteres (et nyt kort starter med græs som baggrund på Grund-laget). Gulv-lag er ellers helt almindelige malede lag oven på Grund. Lag fra før det malede underlag (en terrænmaske med 4 × 4 celler pr. felt) omdannes, når kortet åbnes: fliserne tegnes én gang med den gamle tegning (`render/ground.ts`, `adoptLegacy` i `render/paintSource.ts`), og først når man gemmer, er laget helt malet (Gem tegner de sidste fliser færdige). Generatoren tegner stadig en maske, som omdannes på samme måde.

**Lagring.** Lagets billede deles i fliser på 256 × 256 pixels (RGBA, `model/paint.ts`); fliser uden indhold findes ikke. Opløsningen er et helt antal pixels pr. felt (50, 25, 10 eller 5), valgt efter kortets størrelse, så længste side højst er 4096 pixels (små og mellemstore kort har fuld opløsning, 50 px pr. felt). Selve billederne gemmes hos serveren som PNG (`$USERDATA/mapcreator/paint/<kort>/<lag>/<tx>_<ty>.png`); kortets JSON nævner kun opløsning, hvilke fliser der findes og evt. baggrunden. Ved Gem sendes kun nye og ændrede fliser. Fortryd gemmer fliserne, som de var før strøget (op til ca. 300 MB, så de ældste trin glemmes).

**Kvalitet.** Knappen *Kvalitet* i topbjælken vælger forhåndsvisningens kvalitet: **Lav**, **Medium** (standard) eller **Høj**. Valget gemmes i browseren (`localStorage`) og ændrer lærredets pixeltæthed på skærme med høj opløsning, genstandenes tegneopløsning og skyggens sløring (`render/quality.ts`). Det malede underlag vises altid i sin egen opløsning. **Eksporten** tegner lagene i den valgte opløsning (er den højere end lagets, skaleres billedet op).

## Genstande

Genstande ligger i genstands- og effektlag (`elements[]`): `kind`, position, størrelse (verdenspixels), rotation, `seed`, `z` og `params`. De tegnes proceduralt af små funktioner i `mapcreator/src/objects/` (ét tegnestykke pr. variant; samme `seed` giver samme udseende).

**Familier og varianter.** Registret (`objects/registry.ts`) samler varianter i familier: Træer (løvtræ, eg, birk, gran, fyr, dødt træ), Sten, Planter, Borde, Tønder (stående, væltet, ødelagt) osv. I vælgeren folder et klik på en familie alle varianter ud, og **Tilfældig** trækker en ny variant ved hver udsætning (standard for natur). En udsat genstand kan senere skifte variant i egenskabspanelet. Ny variant = ét nyt `kind({...})` i den passende fil og, hvis familien er ny, en post i `FAMILIES`.

**Tags.** Hver variant har tags (`objects/tags.ts`: sted og stemning, fx `forest`, `swamp`, `tavern`, `rich`): familiens tags, ekstra tags pr. variant (`KIND_TAGS`) og et valgfrit `tags` på selve varianten. En generator eller et filter kan dermed bede om "alt til en sump" i stedet for at nævne bestemte genstande, og nye varianter kommer med af sig selv. En test sikrer, at tabellerne kun peger på ting, der findes, og at hver variant har mindst ét tag.

**Forbedring og udgåede varianter.** En variants `key` og `params` ændres aldrig, for kort gemmer dem. En genstand forbedres **på stedet**: skift tegnefunktionen, behold nøglen (gamle kort bliver pænere ved næste åbning; størrelse og placering ændrer sig ikke). Skal en variant virkelig erstattes af en anden, sættes `replacedBy: 'ny_nøgle'` på den gamle, og kort peger videre til afløseren, når de åbnes (`resolveKind`). Slet aldrig en variant uden `replacedBy`; ukendte nøgler vises som en rød stiplet boks.

**Skygger og højde.** Skyggen følger kortets `lightAngle`; dens længde er varianten's `shadow` plus (lagets højde + genstandens `z`) × 6 px. Genstande tegnes i rækkefølgen lag, derefter `z`, derefter rækkefølgen i laget. Hver genstand tegnes én gang til et lille lærred (`render/sprites.ts`) og genbruges, så mange genstande kan tegnes hurtigt.

**Værktøjer.** *Vælg* (V): klik, træk for at flytte, håndtag til skalering (Shift låser/frigiver proportioner) og rotation (Shift runder til 15°), pile flytter, Delete sletter, Ctrl+D duplikerer. *Genstand* (G): sæt ud med forhåndsvisning; Esc går tilbage til Vælg. "Fastgør til halve felter" er valgfri.

## Nyt kort og generator

**Nyt** åbner en dialog: vælg *Tomt kort* eller et tema (Skov, Mose, Ørken, Snelandskab, Grotte, Flodbred, Bjergsti, Landsby, Kro, Ruin, Dungeon), en størrelse (Rum, Lille, Mellem, Stort, By, Region, eller egne mål) og evt. et frø. **Ny variant** giver et nyt frø; samme tema, størrelse og frø giver altid samme kort. Resultatet er et helt almindeligt kort (lag med terræn, mure, genstande, træer og effekter), som kan redigeres frit; veje og floder løber fra kant til kant, så kort kan sættes sammen.

Temaerne er data i `mapcreator/src/generator/themes.ts` (terrænpletter, vand, veje, bygninger, dungeon/grotte, regler for genstande efter familie og tags); motoren står i `generate.ts`. Genstande vælges ud fra familier og tags, så nye genstande kommer med af sig selv. Se `generator/spec.ts` for alle felter.

## Grottevægge og kløfter

Linje-værktøjet har tre grottevægge (*Grottevæg, brun / mørk / is*) af overlappende sten til frie vægge og afgrænsninger samt *Kløft* og *Klippekant* til afgrunde. Grotte-temaet i generatoren bruger dem sammen med et mørkt fjeldmateriale.

## Kortstørrelse

**Størrelse …** øverst ændrer et eksisterende kort (felter i bredde og højde, de samme standardstørrelser som ved Nyt). Vælg, hvor det nuværende kort placeres (9 felter): resten udvides eller beskæres derfra. Det malede underlag flyttes med; nyt område er tomt (eller følger lagets baggrund, hvis det har en); genstande og mure flyttes med, og genstande, hvis midte havner uden for kortet, fjernes. Det kan fortrydes.

## Egne genstande (billedimport)

Knappen **Egne genstande …** øverst åbner importen. Vælg (eller træk ind) et billede: enten ét billede af en genstand eller et ark med mange, fx 5 × 5 genstande fra en billedgenerator. Billedet skal vise genstandene **set oppefra** på en **ensfarvet** (hvid, magenta …) eller **ternet** baggrund, uden skygge og med luft imellem.

1. Baggrunden findes ud fra billedets kant. Er den forkert, så klik på baggrunden i billedet. **Tolerance** styrer, hvor stor forskel fra baggrundsfarven der stadig er baggrund.
2. Baggrunden fjernes kun, hvor den hænger sammen med kanten, så hvidt i en genstand (sne, knogler) bliver stående. Vil du også fjerne baggrund inde i en genstand (huller), så sæt flueben i "Fjern også baggrund inde i genstande". Kanten blødgøres, så der ikke er en lys kant rundt om genstanden.
3. Hver genstand skæres ud for sig. Dele, der ligger tættere end **Saml dele** (pixels), regnes for én genstand (en vogn med hjul i to stykker). Hver genstand vises på et ternet felt, så du kan se, om baggrunden virkelig er væk.
4. Vælg familie (fx Træer, Borde eller **Egne genstande**), skygge, tilfældig rotation og evt. tags. Giv hver genstand et navn og en bredde i felter (den midterste genstand får "Midterste genstand = N felter", resten følger forholdet). Fjern flueben ved dem, du ikke vil have.
5. **Gem** lægger genstandene i vælgeren, hvor de optræder som almindelige varianter i deres familie. Den første er valgt til udsætning.

Fanen **Mine genstande** viser alle importerede genstande og lader dig omdøbe, flytte til en anden familie, ændre størrelsen, slå skygge og rotation til og fra og slette. Kort, der bruger en slettet genstand, viser en rød stiplet boks.

Klienten skærer billedet ud og skalerer hver genstand til højst 512 px. Serveren genkoder alt (kun PNG, WebP og JPEG; højst ca. 36 megapixel; ingen metadata) og gemmer genstanden som WebP med gennemsigtighed. En genstand, der er næsten helt hvid eller lignende baggrunden, kan få hul i sig; brug i så fald magenta som baggrund i billedet.

## Linjer og former

Et lag af typen *Linjer og former* (`type: walls`, ældre navn *Mure*) har `walls[]`: en linje af punkter med `thickness`, `style`, `closed` og `openings[]`. Længde og form følger af punkterne (`model/walls.ts`); tegningen er vektor (`render/walls.ts`, `render/lines.ts`), så den er skarp ved enhver zoom. Både linjer og former er den samme slags objekt: en form er en lukket linje med `fill` (et terrænmateriale) og `shape` (`rect | ellipse | free`).

*Linje* (L, M) tegner mure, stier, broer, kløfter og hegn. Vælg **Punkter** (klik for hvert punkt; klik på sidste punkt eller Enter afslutter, klik på første punkt lukker, Shift låser vinklen til 15°, Backspace fjerner sidste punkt, Esc afbryder) eller **Frihånd** (træk; linjen forenkles til få punkter og udjævnes, så den kan redigeres bagefter). Typer: *Mure* (sten, mursten, træ), *Grotte* (tre grottevægge), *Hæk og hegn*, *Stier* (jord, grus, brosten), *Broer* (træ, sten, reb) og *Kløft og klippe* (klippekant med dybde til den ene side, og en kløft med dybde på begge sider). Kun rigtige mure kan have døre og vinduer. **Vend** vender den side, en klippekant, kløft eller bro har sin yderside på.

*Form* (F) tegner **Firkant** (træk fra hjørne til hjørne, Shift = kvadrat), **Cirkel** (træk fra midten, Shift = cirkel) og **Frihånd** (lukkes af sig selv). En form har en **kant** (en hvilken som helst linjetype, eller ingen) og en **udfyldning** (et hvilket som helst terrænmateriale: trægulv, brosten, fliser, græs, vand …), så en bygning er en firkant med stenmur og plankegulv. Udfyldningen tegnes som terræn i formens omrids (`render/shapeFill.ts`) og skæres præcis ved kanten, og kanten kan have døre, hvis den er en mur.

*Vælg* (V) viser punkthåndtag på en linje eller form: træk et firkantet punkt for at ændre formen, en rund prik midt på et stykke for at indsætte et punkt, dobbeltklik for at fjerne et punkt, træk i selve linjen eller formen for at flytte den. Kant, tykkelse, udfyldning og vending rettes i panelet til højre (`ui/WallInspector.svelte`).

**Objektlisten** øverst i panelet til højre (`ui/ObjectList.svelte`) viser alle genstande, linjer og former på tværs af lag (øverste først), med søgning. Klik for at vælge (og skifte til Vælg-værktøjet), × sletter. Terrænlag står som en række uden slet-knap.

*Dør* (D): klik på en mur for at sætte en åbning ind (åbning, dør, dobbeltdør, port eller vindue). Åbninger, dørene og portene skærer et hul i muren; vinduer sidder i den. Vælg en åbning for at åbne den, vende den eller trække den langs muren.

## Scatter

*Spred* (S) spreder den valgte familie eller variant over et område, mens man trækker. **Tilfældig** trækker en ny variant for hver genstand (en skov med flere slags træer). Indstillinger: penselstørrelse, tæthed (tæt = kroner overlapper), *Undgå vand* (kigger på terrænet under) og *Fjern i stedet for at spredes* (markerer genstande i cirklen med rødt og fjerner dem, når man slipper). Genstande lægges ikke oven i hinanden og ikke oven i mure; et strøg er én fortryd-handling (`model/scatter.ts`).

## Eksport (udgaver)

Et kort har en liste af udgaver (`exports[]`): navn (bliver filnavnet), hvilke lag der udelades, format (PNG, WebP, JPEG), pixels pr. felt og kvalitet. Så kan samme kort give "Skovsti - ren" og "Skovsti - med lig". Billedet tegnes i browseren i fliser (grid og penselring er aldrig med).

**Mål pr. udgave:** *Hent som fil*, eller **send til det simple VTT**: General Maps eller en kampagne, evt. i et room (rooms hentes fra `GET /api/simpelvtt/tree`). Billedet lægges med VTT'ets eget upload (`POST /api/simpelvtt/upload`), så navnerensning, filtjek og dublet-navne (` (2)`, ingen overskrivning) er de samme som ved almindelig upload. Målet gemmes i kortet, så "Skovsti - ren" hver gang går til samme sted. Rooms skal findes i forvejen (undtagen under General Maps, hvor et room oprettes). Grænse: højst 16384 px på den lange led og 120 mio. pixels.

## Data

Alt ligger i `$USERDATA/mapcreator/` (miljøvariabel `USERDATA`, standard `/userdata`; i dev/Docker er det `vol/userdata/` i arbejdsmappen, mountet som `/userdata`, så dataene også kan nås, når containeren ikke kører; ét sted at tage backup):

| Sti | Indhold |
|---|---|
| `maps/<id>.json` | Kortdokumenter |
| `assets/library.json`, `assets/<id>.webp` | Egne genstande: biblioteket og ét billede pr. genstand |
| `exports/` | Evt. færdige billeder (senere) |

Serveren opretter aldrig selve `/userdata`, kun undermapperne. Mangler den, svarer API'et 503 (opret `vol/userdata/` og mount den).

Dokumentet (`mapcreator/src/model/types.ts`): `version`, `id`, `name`, `widthCells`, `heightCells` (1 felt = 5 ft = 50 px), `seed`, `lightAngle`, `layers[]` (nederst først). Serveren validerer kun rammerne (`validate_doc`); indholdet er klientens ansvar.

## API (`/api/mapcreator/`)

`GET maps` (liste), `GET|PUT|DELETE maps/<id>`; malede fliser: `GET maps/<id>/paint/<lag>/<tx>_<ty>.png`, `POST maps/<id>/paint/<lag>` (multipart: `keep` = JSON-liste over alle fliser, laget har, og `t_<tx>_<ty>` for nye og ændrede; resten slettes); egne genstande: `GET|POST assets`, `PATCH|DELETE assets/<id>`, `GET assets/<id>.webp` (se [mapcreator-format.md](mapcreator-format.md)). Id'er er `a-z0-9-`, 4 til 64 tegn. Ingen login: kun til internt brug.

## Udvikling

Node er kun et byggeværktøj; det kører i en container:

```bash
mapcreator/build-docker.sh          # byg til webui/static/mapcreator/ (gitignoreret)
mapcreator/build-docker.sh dev      # byg løbende ved ændringer
mapcreator/build-docker.sh test     # vitest
mapcreator/build-docker.sh check    # svelte-check (typer)
```

Dockerfilen bygger klienten i et Node-trin, så produktionsimaget kun har resultatet. I dev bind-mountes repoet, så kør `build-docker.sh` efter ændringer i `mapcreator/src/` og genindlæs siden.
