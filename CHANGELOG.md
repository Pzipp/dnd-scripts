# Ændringslog

Hver udgivelse (`vX.Y.Z`, se [docs/versioner.md](docs/versioner.md)) med de ændringer, der kom med. Nyeste øverst.
Lav udgivelser med `python3 scripts/release.py`; skriv ikke i de udgivne afsnit i hånden.

## Ikke udgivet

## [0.1.0] – 2026-10-17

Første udgivelse. Alt før den er opbygning af projektet og ikke ændringer: listen herunder viser, hvad der blev bygget, og ikke hvad der blev ændret i noget eksisterende.

### Changelog

- note om første udgivelse (`24ed31a`)

### Andet

- Omdøb projektet til dnd-tools (D&D Tools): navne i tekster, compose, containere og sidetitel (`8bb4d76`)
- Karakterer gemmes i userdata (vol/userdata/karakterer); kun skabelonen følger repoet (`987d36b`)
- Simpelvtt og homebrew gemmes i userdata (vol/userdata/simpelvtt og homebrew) (`2891a15`)
- Register new crafting and shop object families (`6acfd26`)
- Register new crafting and shop object families (`41a5386`)
- Add crafted workshop and shop map objects (`f937e68`)
- Add crafted workshop and shop map objects (`a50b0d2`)
- Add crafted workshop and shop map objects (`666d955`)
- Add crafted workshop and shop map objects (`95c2383`)
- Add crafted workshop and shop map objects (`4850dcb`)
- Add crafted workshop and shop map objects (`892c5b5`)
- Remove unused mushroom drawing import (`43f18b4`)
- Register new map creator objects and family (`7b4f45f`)
- Register new map creator objects and family (`09a0ceb`)
- Register new map creator objects and family (`2815c3a`)
- Register new map creator objects and family (`e5b3e78`)
- Register new map creator objects and family (`eab9751`)
- Add new map creator objects (`5d71474`)
- Add new map creator objects (`8d74dbe`)
- Add new map creator objects (`71d9116`)
- Add new map creator objects (`8992fc3`)
- ark uden den visuelle bygger: kontrol af character.yaml og dnd.py ark (`761bb12`)
- 5etools-data flyttet til /srv/dnd5etools (v2.37.0); stier opdateret (`b31f05a`)
- feats oversat (`83af985`)
- translator (`fe62959`)
- dev mappe har fået sin agen karakter mappe, adskildt fra personlige. (`444b3ab`)
- Document five optional card style overlays (`3cf2b6e`)
- Add muted burgundy and parchment card theme (`952c3e2`)
- Add muted slate blue card theme (`e12cdc8`)
- Add muted woodland color card theme (`5d39984`)
- Add restrained monochrome herbarium card theme (`e97b2bc`)
- Add restrained monochrome engraving card theme (`226dce1`)
- Add antique parchment with broken royal seal SVG (`346035b`)
- Add heavily handled antique parchment SVG (`bdd49c1`)
- Add Kongens Arkiv website theme (`e5e1d08`)
- Add subtle botanical parchment background (`9f9b3ad`)
- Add subtle cartographer parchment background (`62983c8`)
- Add greenwood website theme (`920b2c0`)
- Add arcane night website theme (`1d5640a`)
- Add cartographer parchment website theme (`0fd5764`)
- Expose ornamental themes in character builder (`ca02356`)
- Register three ornamental character sheet themes (`ad4d657`)
- Add Starline character sheet theme (`a393a7e`)
- Add Leaf scroll character sheet theme (`6dce751`)
- Add Ink & ornament character sheet theme (`ee1ee75`)
- Add three character sheet themes to style selector (`1bb230f`)
- Register three additional character sheet themes (`8d8d120`)
- Add arcane character sheet theme (`92d66e1`)
- Add blood and steel character sheet theme (`942ad6b`)
- Add royal blue and gold character sheet theme (`b36acbd`)
- Refresh character sheet preview when theme changes (`a0600b3`)
- Add character sheet theme selector (`c440dc2`)
- Pass selected theme to character sheet renderer (`25416a0`)
- Support selectable character sheet themes (`eb53c8b`)
- Add dark fantasy character sheet theme (`1311676`)
- Add woodland character sheet theme (`ad4a1fc`)
- Add modern character sheet theme (`ba36d6b`)
- descriptions/llm_client: name_da som eget felt, ikke konflateret med beskrivelse (`e181c87`)
- character.yaml: initiative er et felt, ikke en udregning i render.py (`b0de9b4`)
- render.py: PB på initiativ kun med Alert-feat'et, ikke altid (`2ab9c46`)
- character.yaml: medregn baggrundens ability_split og ASI-feats i evnescorer (`8080b1c`)
- Ignorer genererede udskrifter (HTML og PDF) (`ca58805`)
- Valak og Chukio: behold kun version 2 (`b07e750`)
- Document D&D WebUI setup (`6c8b64e`)
- Fix WebUI color override (`6467ded`)
- Add D&D WebUI (`c71eed3`)
- Add D&D WebUI (`ef52430`)
- Add D&D WebUI (`fc6cc02`)
- Add D&D WebUI (`79c2aa3`)
- Add WebUI scaffold (`9c8af11`)
- Omstrukturér repoet: YAML-data, fælles dnd.py, farve + sort/hvid, AI-instruktioner (`e95214f`)
- Add files via upload (`858ce77`)
- Add files via upload (`33cc996`)

### Versionssystem

- VERSION, CHANGELOG, scripts/release.py, version- og bygningsmærke i kort og karakterer, dnd.py version (`ab59415`)

### Kortbygger

- test af alle murtyper kører grottekanten med en forfalsket canvas (`9b3ea68`)
- grottekanten (Tomrums klippekant) som linjestil: brun, lilla og is (`cdeaa78`)
- Tomrum med klippekant kan males med Pensel igen (grottekanter); fjerner fejlagtigt indlagt _rim.ppm (`dc1eef6`)
- layout til små skærme (værktøjsrække og fanelinje med paneler nederst under 900 px) (`5af8728`)
- 37 malede billedmaterialer (webp, 768 px) af de nye originaler: gulve, klipper, vand, lava, græs m.m.; originalerne ligger udenfor git (`0fe1501`)
- nyt egegulv, ødelagt egegulv, dybt og uroligt vand som malematerialer (id 22, 29-31) (`dc9ea85`)
- grå plankegulv, stille vand og tre slags græs som malematerialer (billeder, id 24-28) (`288cd01`)
- genstandene samlet i én ordning (taxonomy.ts): 100 familier slået sammen til 69, nye kategorier Dyr og Fælder og farer; nøgler, tags og generator uændrede (`b138b6a`)
- Plankegulv, ødelagt som malemateriale (id 23) (`d664c49`)
- Plankegulv, eg vises i mindre skala (planker ca. 25 cm) (`b92ff9b`)
- Plankegulv, eg som malemateriale (gentagende billede, id 22) (`9ef7448`)
- egenskaber for valgt genstand/linje i værktøjskolonnen, valgt lag i lagkolonnen, kortstørrelse i lille footer; værktøjskolonnen folder ind, når der intet er at vise (`9237d1a`)
- ikoner til værktøjer og lagtyper; værktøjskolonne til venstre; lag- og objektkolonner til højre (kan foldes); Vælg kun på det valgte lag; skriftstørrelser 9/10 px (`a727660`)
- underlaget er et fladt malet billede (pensler: rund, kant, gitter, totter; gennemsigtighed, hårdhed, mønster), gemt som fliser; ældre kort omdannes ved åbning (`5cd9754`)
- to fingre afbryder en påbegyndt frihåndslinje eller form (`242cddd`)
- Linje-værktøj (punkter og frihånd; mure, stier, broer, kløfter, hegn), Form-værktøj (firkant, cirkel, frihånd med kant og udfyldning), vending, objektliste (`4a5b56d`)
- kvalitetsvalg (Lav/Medium/Høj) til forhåndsvisningen; gemte terrænfliser pr. skala; eksporten er uændret fuld kvalitet (`96976ac`)
- halvfærdigt arbejde fra afbrudte agenter (fælder/magi, skibe, kit) gemt uændret; ikke gennemgået visuelt (`041318e`)
- tom pakke pack11 til nye genstande (`e7ca55b`)
- stenkredse, gravsteder, fantasy-miljoe, lejr-, kaj- og ruinting oppefra (pack6) (`2fd6748`)
- tom pakke pack10 til nye genstande (`79676c0`)
- landbrug og have, miner, kirkegård og afsides steder set oppefra (pack8) (`311f7d2`)
- tom pakke pack9 til nye genstande (`f8201a3`)
- ræv, bjørn, kanin og sovende varianter (pack7) (`82af91b`)
- ruiner, helligdomme, lejre, belejring, både og fantasy set oppefra (pack6) (`c8d73e3`)
- trone, banket, kirke, boerneværelse, musik og madvarer (pack7) (`57f70cb`)
- nye træer og planter, vand og kyst set oppefra (pack8) (`3f6650b`)
- græs med strå fra en lille tekstur (billigt opslag pr. pixel) for alle tre græstyper (`7a004a3`)
- koekken, bibliotek, soeveværelse, badehus og alkymi (pack7) (`7c3489b`)
- tom pakke pack8 til nye genstande (`a526117`)
- mystik (fremmede obelisker, runesten, tentakler, kødhob, æg, portaler, flydende sten, lyskugler, maskiner, glaskrukker, artefakter, revner, kapsel) (pack5) (`60af0a3`)
- husdyr, vildt, smådyr og skygge-væsner (pack7), bedre dyrelig og skelet (pack3) (`448ca2e`)
- facade og bygningsdele (skorstene, markiser, skilte, veranda, altan, trapper, vinduer, tagrender, regntønde, vejrhane, flag) (pack5) (`b3c222d`)
- forbedret stenbue, pyramidetaarn, klippeknold, stoevlespor og kloeftens gren (pack4) (`52c113e`)
- døre og porte (stendøre, jerndøre, bue- og kirkeport, rund dør, bogreolsdør, gravdør, kældernedgang, låger, åbne døre, porthus, vindebro) (pack5) (`c7bef11`)
- tom pakke pack7 til nye genstande (`16a71c8`)
- lig, skeletter og dyrelig (pack3) (`fbdd93c`)
- tage (saddel-, valm-, kegle-, L-tage, ruin, glas) i teglsten, skifer, spåner og strå (pack5) (`0311ec2`)
- tom pakke pack6 til nye genstande (`c1f1030`)
- broer, tårne, spor og mærker (pack4) (`136d998`)
- vaabenstativer, rustningsstativer, daekker og maalskiver (pack3) (`f77f3c3`)
- bjerge, klippeformationer, vulkaner, kløfter og afgrunde (pack4) (`e5caba9`)
- tortur- og henrettelsesgenstande (pack3) (`964a793`)
- ny lagtype Gulv (planker, brosten og fliser skæres til ved det malede); generatoren lægger hus- og rumgulve på Gulv (`833a5ee`)
- værksteder og håndværk (pack3) (`44a9eac`)
- markedsboder, butiksdisk og varebord (pack3) (`2409bfe`)
- planker og fliser skæres til ved kanten af det malede område; tomme pakker (pack3-5) til nye genstande (`d2425e1`)
- færdigtegnede terrænfliser gemmes som webp ved Gem og hentes ved åbning; stenlogik springes over langt fra sten (`591732c`)
- gennemsigtige fuger i brosten, fliser og planker; rettet at et tomt lag kunne fyldes med sten (`895d142`)
- brosten, fliser og trægulv som hele sten og planker i rækker, så overgange består af hele sten (`c55de07`)
- pil og fyr poleret, docs om tomrum og dungeon-genstande (`1d00f7f`)
- tomrum med klippekant, grottevægge, dungeon-genstande (gitre, nedfald, trapper, broer, vægdetaljer) (`d25ba21`)
- generator med 11 temaer, ændr kortstørrelse, størrelsesvalg ved nyt kort, Designer-genstande i selve bygget, manual til genstande (`6dde244`)
- basisgenstande forbedret på stedet og 49 nye varianter (træer, sten, planter, stammer, indretning, levn) (`861db28`)
- terræn med bløde overgange, nye materialer (3 græs, 4 sand, brosten, grus, fliser, trægulv) og sti oven på terrænet (`429f6a1`)
- pakke 2 (40 genstande i 13 familier), uden indbagte skygge, med tags (`1f8993f`)
- import af egne genstande (baggrund væk, udskæring af ark, bibliotek, Pillow-kontrol på serveren) (`91365be`)
- tags på genstande, replacedBy for udgåede varianter, spor til nye basisgenstande (`c2bed31`)
- pakke 1 med 47 genstande i 19 familier (by, indretning, dungeon, lejr, natur) (`3fac0ac`)
- dokumentation af eksport til VTT, ret tekst i eksportdialog (`5de0584`)
- eksport til VTT (kampagne, room, General Maps), spor til pakke 2, større galleri (`77a2f61`)
- mure (tegning, redigering, åbninger) og scatter-værktøj (`3eb8830`)
- genstandsgalleri, plads til ekstra genstande og tegning af mure (`3944bed`)
- mur-model (geometri, åbninger, kommandoer) med tests (`8ccd93f`)
- genstande (familier med varianter, vælger med Tilfældig, flyt/skalér/rotér, skygger) og eksport af genstande (`a741dc4`)
- terrænmaling (pensel, viskelæder, fyld, 8 materialer) og eksport af navngivne udgaver (`b170d06`)
- data i vol/userdata (mountes som /userdata) (`849ee68`)
- værtsmappen er /srv/userdata (mountes som /userdata) (`fb6dccf`)
- skelet til kortbygger (Node/Vite/Svelte-klient, Flask-blueprint, /userdata) (`e51de5c`)

### Dokumentation

- vejledning til brug af Designer-billederne i prompt-filen (`1aa5b0b`)
- prompts til totter (græs og mark) i Designer-listen (`e0fd526`)
- alle Designer-prompts til materialer og genstandsark med status (lavet / ikke lavet) (`c62bc56`)
- README og dokumentation for kortbyggeren (format, genstande, genveje) (`204da58`)
- plan og status for kortbyggeren (`5dd0969`)
- dev kører på port 8082, prod på 8081 (`c783fbd`)
- LLM-vejen og ark uden bygger er beskrevet (`d4907c9`)
- oversættelsesværktøjet beskriver slutplacering og backup (`16bffdb`)
- formater, README'er og plan afspejler det nye system (`7bb232e`)
- AGENTS.md og README.md beskriver webuien som hovedvej (`9a58dd1`)
- opdatér character-yaml.md/llm-effect-extraction-prompt.md til bygget tilstand (`9183630`)
- dokumentér choices.yaml-formatet + plan for en kommende karakterark-bygger (`739ba64`)
- karakterark-dokumentation i takt med det nye format (`a55d4d4`)

### Simpelt VTT

- Nat som slider (0-100) med varm skumring over i blå nat (`ea62d30`)
- Nat-tilstand, skærmrelativt grid (standardfarve #1D2026) og General Maps (leveret + egne) (`be1e485`)
- omdøb kort, ret kollapset flyt-felt, rotation som enkelt 90°-knap (`0189261`)
- rotation af billeder og redigering kun i EDIT (`82514f8`)

### Sheets

- standardlayout ud fra character.yaml, spell-/cantrip-bokse, udstyrsvælger og klassesprog (`c140afa`)

### Webui

- simpelt VTT på /simpelvtt (`508d5b7`)
- fjern den gamle YAML-editor (/editor) (`965b8f8`)
- logoet linker til forsiden, og forsiden har links til 5etools (`dcac8d0`)
- server 5etools-siden på /5etools/ (`27d0615`)
- kort-tema og baggrund, download-link til ark-PDF, advarsel om tekst uden for kortrammer (`de274fc`)
- layout-editor i Print-fanen, "/" bliver en menu (`b930a9d`)
- fortryd sheets.yaml i den gamle YAML-editor ("/") (`1d51f1d`)
- YAML-editoren redigerer nu også sheets.yaml, dev-wizzard bruger auto-feats (`3eaca7d`)
- opdel README i fælles del + YAML-editor-specifik del (`e203226`)
- fejl og indrykningslinjer i YAML-editoren (`cf4ea58`)
- CodeMirror-editor til YAML (`cf76808`)
- live-forhåndsvisning af ugemt YAML og output via srcdoc (`ffc1ba8`)
- PDF-generering med Playwright/Chromium i containeren (`b0ab7a8`)
- download-links til valgt karakters filer (`9c9f3b9`)
- README med instruktioner til at stoppe serveren (`b2ccaa0`)
- farvevælger virker nu også på kort (`c7594f3`)
- document real YAML and character output paths (`5015a7f`)
- add save button for character YAML (`1ad53db`)
- save real YAML and write output to character folder (`f77b0d4`)

### Llm-vejen

- prompt til character.yaml og generator af opslagsfil (`e1b4cd0`)

### Oprydning

- fjern ubrugte STANDARD_STATS, _SPELL_FILTER_KEYS og _plain() (`1e4fd4e`)
- vol/karakterer ud af git, .env ud af docker-imaget (`41380b5`)

### Ark

- tekstboksen (backstory) respekterer blank_lines (`14fd788`)

### Pr-skabelon

- ingen fast AI-attribution (`187d70e`)

### Homebrew

- registrér Felis-varianten (kopi af Tabaxi MPMM) i index.json (`50df737`)

### Karakterbygger

- _copy i homebrew kan pege på officielle poster (`87579f5`)
- ret opslag der knækkede af de danske oversættelser (`f86fb39`)
- løs _copy/_mod i racer, baggrunde og klasser; oversættelse af _copy-tekster (`db826c9`)
- træk og slip af bokse på Ark-fanen; mobilvisning, indstillings-tandhjul (`ba6c864`)
- Kort-fane - spil-kort bygget af 5etools-data (`5b7ccad`)
- live karakterark ved siden af builderen på alle faner; logo og ikoner (`7daf3bb`)
- danske oversættelser (data/<fil>-da.json) lægges ovenpå 5etools-data; feats-da.json bruges (`9fc31dd`)
- Foundry-data bruges til fart, sanser, resistenser, AC, ressourcer, klasse-tal og aktiveringer; nye ark-bokse (`0a0a113`)
- HP- og initiativeffekter fra 5etools' Foundry-data (Dwarven Toughness, Tough m.fl.) før LLM-effekter (`c00d279`)
- klikbart mangler-overblik; forberedte spells er valgfrie (`9b97cfd`)
- spells valgt et sted gråes ud i klassens øvrige spell-valg (forberedte undtaget) (`7847970`)
- Lessons-feat-slot, Agonizing Blast kræver skadecantrip, Expertise/Weapon Mastery-huller, Evocation Savant kun leveled spells; tjek dækker builder-karakterer (`d5ff562`)
- valgfrie klassefeatures (Metamagic, Eldritch Invocations, Maneuvers) fra optionalfeatures.json (`c0208ff`)
- spells vælges korrekt pr. klasse (antal, niveau, kun gyldige), slots og altid-forberedte fra data (`2a909b6`)
- baggrundens faste feat som feat-slot med undervalg (Skilled, Magic Initiate, Crafter, Musician) (`80c16f2`)
- ældre kilder - subraces, racers evnepoint (indstilling), træning, immuniteter, Variant Human feat (`dba8a60`)
- feats' spells i granted_spells, ind i beskrivelser/kort og ny ark-boks (`6f0f762`)
- racer læses fra 5etools' felter inkl. afstamninger (_versions), baggrundes værktøjsvalg rettet (`74b94d6`)
- læs feats' strukturerede 5etools-felter generisk, fjern half_feats (`392940f`)
- bonus_actions med auto: true henter nu bonushandlinger i stedet for feats (`4809503`)
- Expertise- og Weapon Mastery-valg pr. klasse, ny dev-terrin (`72009ea`)
- PDF-eksport i Print-fanen, manuel LLM-fallback, ret langsom Print-fane (`3435677`)
- automatisk Passive sanser, AC fra rustningsvalg, sprogvalg, auto-summary (`72f258d`)
- ret Cold Caster - ét evne-valg, ikke additiv dobbelt cantrip (`681e347`)
- spell-dedup viser begge udgaver med kilde-suffiks, ikke én vilkårlig (`f2799b6`)
- klasse-dropdown og spell-pulje bruger faktisk tilladte kilder (`73b825c`)
- indstillinger pr. karakter, half-feats-switch, datahuller i feat-spells (`91d3b1c`)
- pergament-tekstur på baggrund og sheet (`bf228a4`)
- generaliser half-feat evne-forbedring + flere manglende valg (`db8df90`)
- systematisk spell-valg fra additionalSpells (Shadow-Touched m.fl.) (`74700db`)
- Elemental Adept - spellcasting-krav + manglende skadetype-valg (`64bda8d`)
- ret dropdown-desync for allerede valgte sekundære klasser (`964b345`)
- korrekte multiclass-regler for sekundære klasser (`1169c75`)
- vis Epic Boons' egne undervalg (evne, resistance, expertise) (`609a6d5`)
- ret variabel-genbrug der ødelagde total-niveau (`c17d44d`)
- vis rigtig subclass-feature i stedet for generisk placeholder (`eff6939`)
- ret manglende rød markering/auto-fold for feat-valg (`736fe3e`)
- morphdom erstatter fuld innerHTML-genopbygning ved render (`ab895b6`)
- wizard-UI i karakterarkets parkment-stil (`a37a3cd`)
- data-lag og tilstandsmaskine til en ny karakterbygger (`0597344`)

### Kvist

- Felis fra gruppens egen homebrew-fil i stedet for udledt version (`cf49179`)
- Felis som 5etools-homebrew-race i stedet for håndrettelser (`55be06f`)

### Karakterer

- valak, terrin, chukio og kvist i byggerens format (`c940191`)
- otte karakterer konverteret til sider-formatet (`ce64ea4`)
- dev-one bruger layout-træ på alle ark (`73bbdf3`)
- tilføj dev-one til udvikling (`41bce96`)
- ret Roland (YAML, værktøj under INT, startudstyr) (`ac19bc8`)
- tilføj Roland (Monk 12, Dwarf, Hermit) (`ac9cd02`)

### Oversættelse

- backgrounds, items, skills, actions og klasser; danske filer ligger i data/ (`7aa9c59`)
- støtte til opslagsfiler (spells, races, feats) (`64472d3`)
- flow til bogoversættelse samlet i data/books/oversaettelse (værktøj pr. bog-id, ordliste, CLAUDE.md); bogtekster gitignoreret (`32c0ab8`)

### Uodate

- igtignore (`f506dad`)

### Update

- docker compose (`d1dba80`)

### Todo

- Dwarven Toughness mangler i HP (kun tekst, ikke i effects) (`0906d6e`)

### Data

- afled grant-felter i feats-XPHB-da.yaml fra 5etools' originalfelter (`5636d68`)
- batch 1 af XPHB-feats (Origin): dansk tekst, kort og arkfelter (`440177e`)
- XPHB-feats med egne felter til dansk oversættelse, ark og kort (`45e073c`)

### Descriptions

- ret hængende "Generér beskrivelser"-knap, gem fremskridt pr. batch (`e1e99e4`)

### Render

- automatisk Feats-boks (auto: true + exclude), manuel forbliver standard (`717ef6f`)

### Effects

- hp_per_level skalerer med den GRANTENDE klasses niveau, ikke total (`db0719a`)
- LLM-udtræk af permanente tal-effects, foldet ind i initiative/hp (`ea2f6ba`)

### Hp

- pr.-klasse terningslag + poolet Hit Dice (korrekt multiclass-regel) (`705e895`)

### Llm_client

- navnekonvention-regel, few-shot-eksempler, klasse/niveau-kontekst (`002b5e8`)

### Cards

- kort-udkast til bibliotek/_cards.yaml fra samme LLM-kald (`3ea4cd9`)

### Bibliotek

- omdøb _beskrivelser.yaml til _descriptions.yaml (`8dec420`)
- tre feats oversat via LLM-kaldet (Resilient, Chef, Shadow-Touched) (`983683a`)

### Karakterark

- omdøb side1.css/side1-sorthvid.css til sheets.css/sheets-bw.css (`b6b65f7`)
- native engelsk renderer, fjern oversættelses-adapter (`339db88`)
- nyt system for choices.yaml-karakterer (character.yaml + sheets.yaml + Print-fane) (`5ec7de2`)
- magi-celle viser slag, DC og formler som den gamle (`ef957fd`)
- DC-celle i magi-boksen har synligt mellemrum (`c0d71a9`)
- magi-boks til besværgelser (`a970d0e`)
- ingen mellemrum efter parentes før engelsk navn (`37e7d46`)
- tekst som synonym for liste, titel: false og undertitel (`098b8b0`)
- tjek finder manglende felter i bokse med linjenumre (`285bf76`)
- mellemrum mellem dansk og engelsk navn på samme linje (`7f750ae`)
- Din tur-boksens liste og overskrift har sidens indrykning (`3ca66ed`)
- bokstype: none fjerner boksrammer på side eller boks (`39bcd40`)
- margin: none giver hele A4-bredden (`98c2d95`)
- engelsk navn i handlingstabellen står på samme linje (`09998ce`)
- samlet: tæt og margin: small som YAML-indstillinger (`c0a1b31`)
- handlinger har kasse, side 2-kolonner er samlet i dev-one (`6bb0d0e`)
- samlet kolonne og side 2 tilbage på én side (`9187a14`)
- tjek bruger REGISTRY, og side 2–4-bokse har stil i side1.css (`7a401b4`)
- højdekontrol i webui, notetitler, docs og skabelon i nyt format (`f0bda37`)
- ét system med sider, bokse og én stil (`c21ec0d`)
- kolonner stables lodret på smal skærm (`406e57c`)
- side 2–4 bygges fra layout-træet (`9617771`)
- side 1 bygges fra layout-træet (`6941c01`)

### Fixup

- fuldfør native-renderer-committet (routes.py, docs, CSS) (`d9e8719`)

### Terrin

- udseende og tro udfyldt (`551afd5`)

### Github

- PR-skabelon til karakterark og andre ændringer (`5ed5139`)

### Dev-one

- side 2 højre kolonne har bredde 1 (`381ead3`)
- side 2 uden boksrammer (bokstype: none) (`93fcb0d`)
- margin: small på alle sider (`08e235b`)

### Skabelon

- alle bokse fra dev-one er med, på samme side (`0fa887f`)
- evner ligger i venstre kolonne, ikke på tværs af siden (`3a8d30a`)
- sprog- og tur-bokse er tilbage i eksemplet (`4a69225`)
- karakterark-eksempel i det nye format med kommentarer (`05883a7`)

### Kommandolinje

- rettelser til Dori og besværgelseskort efter gennemgang (`28ea97a`)
- testkaraktererne Jogoha (Halfling Rogue 3) og Dori (Dwarf Cleric 3) (`26475d3`)
- webui vælger stil (farve/sort-hvid), karakterark responsiv på skærm (`96fe055`)
- docker-compose med valgbar port og bind-adresse (`76246e0`)
- Docker-webui + Python 3.10-kompatibel karakterark (`25fbf52`)

### Chukio

- fjern Hunter's Mark (Ranger-besværgelse, ikke Fighter) (`cbe1321`)

### Navnekonvention

- D20 Test i stedet for slag, terningboks som datanøgle (`c8f7b26`)
- homebrew-mærke gælder både forside og bagside (`37d1c49`)
- udstyr, homebrew, skills, kortbagside og tegnkodning (`8c59957`)
- engelske regelnavne, ft og layout i angreb/udstyr (`637aa91`)
