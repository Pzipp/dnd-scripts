# Kortbygger (`/mapcreator`)

Editor til slagkort (top-down, uden grid i selve billedet): lag med terræn, genstande, mure og effekter. Klienten (`mapcreator/`, TypeScript + Svelte) ejer dokumentet og tegningen, serveren (`webui/mapcreator/`) gemmer kortene og lægger senere færdige billeder i det simple VTT.

## Status

Færdigt: dokumentmodel og lag (tilføj, slet, flyt, skjul, lås, opacitet, højde), kamera (pan, zoom, knib), fortryd/gentag, gem og åbn, **terrænmaling** (pensel, viskelæder, fyld; 8 materialer), **genstande** (familier med varianter, vælger, flyt/skalér/rotér, skygger), **mure** med døre, porte og vinduer, et **scatter-værktøj** til skov og planter, og **eksport** med navngivne udgaver (download eller direkte i VTT'et). **Egne genstande** (billedimport med automatisk fjernelse af baggrund) er også med. En **generator** laver en base ud fra et områdetema, og kortets **størrelse** kan ændres bagefter. Mangler: polering. Se [mapcreator-plan.md](mapcreator-plan.md).

Flere dokumenter: [mapcreator-format.md](mapcreator-format.md) (JSON-format og API), [mapcreator-objects.md](mapcreator-objects.md) (laver og forbedre genstande) og [`mapcreator/README.md`](../mapcreator/README.md) (kode og udvikling).

## Genveje

| Tast | Værktøj eller handling |
|---|---|
| H | Hånd (flyt kortet; hjul zoomer, to fingre knibes) |
| V | Vælg (genstande, mure, åbninger) |
| G | Genstand (sæt ud) |
| S | Spred (scatter) |
| M | Mur |
| D | Dør/åbning |
| B / E | Pensel / viskelæder (terræn) |
| Ctrl+Z / Ctrl+Y | Fortryd / gentag |
| Ctrl+S | Gem |
| Ctrl+D | Duplikér valgt genstand |
| Delete | Slet valgt (åbning, mur eller genstand) |
| Piltaster (Shift = stort skridt) | Flyt valgt genstand |
| Esc | Tilbage til Vælg / fravælg / afbryd mur |
| Shift under træk | Lås proportioner eller rund af til 15° / lås murens vinkel til 15° |

## Terræn

Et grundlag (`type: ground`) har en maske med 4 × 4 celler pr. felt; hver celle er et materiale-id (`render/materials.ts`, id'er må aldrig omnummereres, 0 = tomt). Masken gemmes kørselslængde-kodet og base64 i kortets JSON.

**Materialer.** Natur: tre slags græs (mark, skov, tørt), jord, mudder, sne. Sand og sten: fire slags sand (almindeligt, strand, rødt, mørkt), ørken, sten, mørkt fjeld (grottevæg). Vand. Veje og gulve: brosten, grus, fliser, trægulv. Hvert materiale er en lille funktion af position (`shade` i `materials.ts`); nye materialer tilføjes bagerst med nyt id.

**Overgange.** Maskens celler glattes til vægte pr. materiale i et fast gitter (`render/ground.ts`), og to materialer blandes blødt over en overgang på ca. 40 px. Overgangens kant forskydes med støj, så den bliver organisk. Mellem vand og land er der en lys skumkant og våd jord. Fliserne passer sammen, fordi gitteret ligger fast i verdenen.

**Græs.** De tre slags græs får deres strå fra en lille tekstur (`render/grassTexture.ts`): ca. 3400 buede strå med mørk rod, lys spids og svag skygge tegnes én gang ved første brug og slås derefter blot op pr. pixel (to opslag i forskellig skala og retning skjuler gentagelsen, og forhåndsvisningen bruger en udglattet halv størrelse). Det koster kun ca. 10 % mere regnetid pr. flise end de gamle støjpletter (mål med `mapcreator/tools/bench/grass.ts`) og giver et tydeligt mere naturligt græs. Teksturen er den samme på alle kort; kortets seed forskyder den. Ændres den, skal `GROUND_RENDER_VERSION` hæves.

**Hele sten og planker.** Brosten, fliser og trægulv blandes ikke blødt, men er lagt som hele sten og planker i forskudte rækker (`render/stones.ts`), ligesom genstanden Brosten. Terrænet afgør pr. sten, om den hører til materialet (efter terrænet ved stenens midte, med lidt tilfældighed), så en overgang består af hele sten uden halve, og kanten af en plet opløses i enkeltsten. Stenene har lys fra øverst til venstre. Fugen er gennemsigtig (kun en blød skygge), så det, der ligger under, skinner igennem: læg fx grus på et Grund-lag under et lag med brosten eller planker, eller mal brosten som sti oven på andet terræn. Hvor sten og planker er hele sten, eller skåres til, afgøres af **lagtypen**: på et **Grund**-lag er de hele (en plet eller vej får en kant af enkeltsten, og de kan række lidt ud over det malede), på et **Gulv**-lag skæres de til præcis ved kanten af det malede område, så et gulv i et hus eller et dungeonrum ender nøjagtigt ved væggen. Gulv er ellers et almindeligt terrænlag (samme maske, materialer, pensel og gemte fliser) og lægges oven på Grund; fugerne er gennemsigtige, så læg jord eller sten på Grund under. Generatoren lægger bygningers og dungeonrums sten- og plankegulve på et Gulv-lag over jord eller sten. Det gælder både som terræn og som sti. Størrelse og farver pr. materiale står i `STONE_STYLES`; et nyt rækkemateriale tilføjes dér og i `shade`.

**Sti oven på.** Pensel-værktøjet kan male enten **Terræn** eller **Sti oven på**. En sti ligger i en separat maske (`path`) oven på terrænet, så terrænet under ikke ændres og stien kan fjernes igen med viskelæderen. Stien blandes med det, den ligger på: ved kanten skinner terrænet igennem (græs vokser ind i en jordsti, sand dusker en grussti), og i midten tager den lidt farve fra underlaget. Stier kan være jord, mudder, sne, sand, ørken, sten, brosten, grus, fliser eller trægulv. Brosten kan altså males som en hel by-gade eller et torv uden at sætte tusind genstande ud.

Samme tegnekode bruges i forhåndsvisningen (i fliser og lavere opløsning, `render/groundCache.ts`) og i eksporten (fuld opløsning).

**Gemte terrænfliser.** Terrænet er dyrt at regne (især på en telefon), så de færdigtegnede fliser gemmes som webp hos serveren, når kortet gemmes (`$USERDATA/mapcreator/bake/<kort>/<lag>/`). Hver flise har et fingeraftryk af de maskeceller, den er regnet ud fra (`tileSignature` i `groundCache.ts`: masken og stien omkring flisen, seed, skala og `GROUND_RENDER_VERSION`). Ved åbning hentes de fliser, hvis fingeraftryk stadig passer, og resten regnes forfra; et penselstrøg ændrer kun fingeraftrykket for de fliser, det rører, så kun de regnes og gemmes igen (ved næste Gem, eller automatisk lidt efter, at tegningen er færdig). Cachen kan slettes uden tab. Ændres `renderGroundTile` så billedet bliver et andet, skal `GROUND_RENDER_VERSION` hæves. Eksport i fuld opløsning bruger ikke de gemte fliser.

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

## Tomrum og grottevægge

Under *Tomrum* i terrænpaletten findes tre sorte materialer (brun, lilla og is-kant). Mal dem, hvor der ikke skal være kort: mod andet terræn får de automatisk en kantet klippekant med skygge på gulvsiden, og resten er sort. Det er det samme som at male "væg på den ene side og sort på den anden". Mure-værktøjet har desuden tre grottevægge (*Grottevæg, brun / mørk / is*) af overlappende sten til frie vægge og afgrænsninger. Grotte-temaet i generatoren bruger tomrum som fjeld.

## Kortstørrelse

**Størrelse …** øverst ændrer et eksisterende kort (felter i bredde og højde, de samme standardstørrelser som ved Nyt). Vælg, hvor det nuværende kort placeres (9 felter): resten udvides eller beskæres derfra. Terrænet udvides med det, der ligger ved kanten; genstande og mure flyttes med, og genstande, hvis midte havner uden for kortet, fjernes. Det kan fortrydes.

## Egne genstande (billedimport)

Knappen **Egne genstande …** øverst åbner importen. Vælg (eller træk ind) et billede: enten ét billede af en genstand eller et ark med mange, fx 5 × 5 genstande fra en billedgenerator. Billedet skal vise genstandene **set oppefra** på en **ensfarvet** (hvid, magenta …) eller **ternet** baggrund, uden skygge og med luft imellem.

1. Baggrunden findes ud fra billedets kant. Er den forkert, så klik på baggrunden i billedet. **Tolerance** styrer, hvor stor forskel fra baggrundsfarven der stadig er baggrund.
2. Baggrunden fjernes kun, hvor den hænger sammen med kanten, så hvidt i en genstand (sne, knogler) bliver stående. Vil du også fjerne baggrund inde i en genstand (huller), så sæt flueben i "Fjern også baggrund inde i genstande". Kanten blødgøres, så der ikke er en lys kant rundt om genstanden.
3. Hver genstand skæres ud for sig. Dele, der ligger tættere end **Saml dele** (pixels), regnes for én genstand (en vogn med hjul i to stykker). Hver genstand vises på et ternet felt, så du kan se, om baggrunden virkelig er væk.
4. Vælg familie (fx Træer, Borde eller **Egne genstande**), skygge, tilfældig rotation og evt. tags. Giv hver genstand et navn og en bredde i felter (den midterste genstand får "Midterste genstand = N felter", resten følger forholdet). Fjern flueben ved dem, du ikke vil have.
5. **Gem** lægger genstandene i vælgeren, hvor de optræder som almindelige varianter i deres familie. Den første er valgt til udsætning.

Fanen **Mine genstande** viser alle importerede genstande og lader dig omdøbe, flytte til en anden familie, ændre størrelsen, slå skygge og rotation til og fra og slette. Kort, der bruger en slettet genstand, viser en rød stiplet boks.

Klienten skærer billedet ud og skalerer hver genstand til højst 512 px. Serveren genkoder alt (kun PNG, WebP og JPEG; højst ca. 36 megapixel; ingen metadata) og gemmer genstanden som WebP med gennemsigtighed. En genstand, der er næsten helt hvid eller lignende baggrunden, kan få hul i sig; brug i så fald magenta som baggrund i billedet.

## Mure

Et mur-lag (`type: walls`) har `walls[]`: en linje af punkter med `thickness`, `style` (sten, mursten, træ, hæk), `closed` og `openings[]`. Længde og form følger af punkterne (`model/walls.ts`); tegningen er vektor (`render/walls.ts`), så den er skarp ved enhver zoom.

*Mur* (M): klik for hvert hjørne; klik på sidste punkt eller Enter afslutter, klik på første punkt lukker, Shift låser vinklen til 15°, Backspace fjerner sidste punkt, Esc afbryder. *Vælg* (V) på en mur viser punkthåndtag: træk et firkantet punkt for at ændre form og længde, en rund prik midt på et stykke for at indsætte et punkt, dobbeltklik for at fjerne et punkt, træk i selve muren for at flytte den. Tykkelse og type rettes i panelet til højre.

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

`GET maps` (liste), `GET|PUT|DELETE maps/<id>`; gemte terrænfliser: `GET maps/<id>/bake` (manifester), `GET maps/<id>/bake/<lag>/<tx>_<ty>.webp`, `POST maps/<id>/bake/<lag>` (multipart: `manifest` og `t_<tx>_<ty>`); egne genstande: `GET|POST assets`, `PATCH|DELETE assets/<id>`, `GET assets/<id>.webp` (se [mapcreator-format.md](mapcreator-format.md)). Id'er er `a-z0-9-`, 4 til 64 tegn. Ingen login: kun til internt brug.

## Udvikling

Node er kun et byggeværktøj; det kører i en container:

```bash
mapcreator/build-docker.sh          # byg til webui/static/mapcreator/ (gitignoreret)
mapcreator/build-docker.sh dev      # byg løbende ved ændringer
mapcreator/build-docker.sh test     # vitest
mapcreator/build-docker.sh check    # svelte-check (typer)
```

Dockerfilen bygger klienten i et Node-trin, så produktionsimaget kun har resultatet. I dev bind-mountes repoet, så kør `build-docker.sh` efter ændringer i `mapcreator/src/` og genindlæs siden.
