# Simpelt VTT (`/simpelvtt`)

Et lille virtuelt bord i webui'en: kort og billeder organiseret i kampagner og rooms, en DM-skærm og en spillerskærm, der følger DM'en automatisk. Vanilla JS/CSS, ingen ekstra frameworks. Kode: `webui/simpelvtt/__init__.py` (blueprint), `webui/templates/simpelvtt*.html`, `webui/static/simpelvtt*.{js,css}`.

**Ingen login.** Siden og API'et er åbne for alle, der kan nå webui'en. Kør kun på et netværk, du stoler på, og eksponér ikke `/simpelvtt` udadtil.

## Struktur og data

Kun to niveauer: **kampagne** (øverste mappe) og **room** (undermappe). Billeder ligger i rooms eller løst direkte i kampagnen. Alt ligger under det gitignorerede `vol/simpelvtt/` (kan flyttes med miljøvariablen `SIMPELVTT_DATA`):

| Sti | Indhold |
|---|---|
| `campaigns/<kampagne>/[<room>/]<fil>` | Uploadede billeder |
| `views.json` | Gemt visning pr. kort (zoom/pan/rotation for billede, zoom/pan for grid, grid-indstillinger) |
| `state.json` | Hvilket kort spillerskærmen viser nu, plus en tæller (`rev`) |
| `general-maps/<room>/<fil>` | Brugerens egne General Maps-kort (se nedenfor) |
| `.thumbs/` | Miniaturer (kræver Pillow; ellers bruges originalen) |

Docker: `docker-compose.yml` bind-mounter hele repoet på `/app`, så `vol/simpelvtt/` ligger på værten og overlever genstart. Pillow står i `webui/requirements.txt` (byg imaget forfra efter opdatering).

Upload: png, jpg, webp og gif (kontrolleret på både endelse og filens første bytes), op til 100 MB pr. request (`MAX_CONTENT_LENGTH` i `app.py`). Mappenavne må ikke indeholde `/ \ : * ? " < > |` eller starte med punktum; filnavne renses og får ` (2)` osv. ved dubletter. Alle stier løses og kontrolleres mod `vol/simpelvtt/campaigns/` (ingen path traversal).

## Brug

* **EDIT** (blå): det eneste sted, hvor noget kan ændres i biblioteket: opret, omdøb og slet kampagner og rooms; upload (knapper og træk fra computeren); flyt billeder ved at trække dem til et andet room/kampagnen eller med "Flyt…"-menuen; omdøb billeder (knappen "Omdøb" på kortet); slet billeder. Filer kan også trækkes direkte fra computeren ind på et room.
* **PLAY** (grøn): vælg kampagne i dropdown; dens rooms vises som sektioner med miniaturer. Klik på et kort for at vise det, og justér visningen (zoom, pan, grid, rotation). Upload, nyt room, flyt, slet, omdøb og træk-og-slip findes ikke i PLAY: knapperne er skjult, drop-targets og handlere er slået fra, og skift af tilstand rydder en halvfærdig filvælger. Det er kun UI; API'et er åbent.
* Preview til højre viser, hvad spillerne ser. Træk i det for at panne, hjul/+/- for at zoome; vælg om **Billede** eller **Grid** skal flyttes. Billede og grid har hver sin zoom og pan. Skydere/felter: billedzoom, grid til/fra, celle, farve, gennemsigtighed, gridzoom, offset X/Y.
* **Åbn spillerskærm** åbner `/simpelvtt/vis` i en ny fane (genbruger fanen, hvis den allerede er åben). Her er knappen "Fuldskærm" (eller tasten F).

**Rotation:** én knap "↻ Roter 90°" under Billede i PLAY (ét klik = 90° med uret; ingen skyder eller fri vinkel). Vinklen (`img.rot`, grader, normaliseres af API'et til 0/90/180/270) gemmes pr. kort i visningen og synkroniseres til spillerskærmen. Billedet drejes om sit eget midtpunkt; gridet roterer ikke med, men beholder sin egen zoom og offset.

Zoom 1 betyder, at billedet passer i vinduet (for et roteret billede regnes med den omsluttende boks om det roterede billede, så det ikke klippes); pan er brøkdele af vinduets størrelse. Det giver samme udsnit på alle skærmstørrelser. Gridets cellestørrelse er knyttet til viewporten (se nedenfor).

**Grid og skærm:** gridets cellestørrelse (`grid.size`) og offset er i tusindedele af viewportens korteste side (vmin/10) og ganges med gridzoom. De følger altså skærmen, ikke billedets dimensioner, zoom, pan eller rotation, og preview og spillerskærm får samme antal celler uanset opløsning. Standard er 60 (ca. 17 celler på korteste side) og standardfarven er `#1D2026`. Gemte grids uden `grid.v: 2` (ældre, i billedpixel) falder tilbage til standardstørrelse, offset 0 og standardfarve (hvid blev til standard).

**Nat:** afkrydsningsfeltet "Nat" (pr. kort, `view.night`, gemt i `views.json` og synkroniseret) lægger et mørkt, blåligt multiply-lag over billedet; gridet ligger over laget. Tegnes af `vttRender`, så preview og spillerskærm er ens.

## General Maps

Særlig mappe, der vises som en sammenfoldet sektion (foldet som standard) i kampagneoversigten i både PLAY og EDIT, uanset valgt kampagne. Navnet `General Maps` er reserveret (kan ikke oprettes/omdøbes/slettes som kampagne). Kortene vises uden at blive kopieret. To kilder slås sammen (maks. to niveauer: room og billede):

1. **Leveret** i `webui/simpelvtt/general_maps/` (sporet i git, kopieres ind i imaget af `COPY . .`; bind-mountet i dev). Read-only: låseikon, ingen slet/omdøb/flyt (API'et svarer 403). Kun billeder, gruppen har ret til at distribuere (se README dér).
2. **Egne** i `vol/simpelvtt/general-maps/` (gitignoreret, overlever opdatering). Upload, flyt, omdøb og slet i EDIT virker her. Upload til et leveret room lægger filen i det tilsvarende room i `vol/`.

Rooms med samme navn slås sammen til ét room. Ved samme filnavn vinder den leverede. Billedreferencen er `General Maps/<room>/<fil>`, så visning, zoom, rotation, nat og grid ligger stabilt i `views.json`. Stier kontrolleres mod de to rødder (ingen path traversal). API'et: `GET tree` returnerer `general` ud over `campaigns` (`locked` = leverede filnavne, `shipped` = room findes i den leverede mappe).

## Synk

Serveren er sandheden. `state.json` husker det aktive kort og en `rev`-tæller, der stiger ved kortskift og ved ændring af det aktive korts visning. Spillerskærmen spørger `GET /api/simpelvtt/state?rev=<sidste>` hvert 0,7 sekund; er `rev` uændret, svarer serveren `{"unchanged": true}`, ellers kort og visning. DM-skærmen gemmer visningen (debounced, 150 ms) i `views.json` pr. kort, så den huskes næste gang kortet vises. Ingen websockets eller SSE.

## API (alt under `/api/simpelvtt/`, JSON)

| Metode og sti | Formål |
|---|---|
| `GET tree` | Kampagner, rooms og billeder |
| `POST/PATCH/DELETE campaign` | `{name}` / `{name, to}` / `{name}` |
| `POST/PATCH/DELETE room` | `{campaign, name}` / `{campaign, name, to}` / `{campaign, name}` |
| `POST upload` | multipart: `campaign`, `room` (valgfri), `files` (flere) |
| `POST move` | `{image, campaign, room}` (room tom = løst i kampagnen) |
| `PATCH image` | `{image, to}`: omdøb filnavnet (endelsen bevares; renset som ved upload; dublet får ` (2)`). Visning, aktivt kort og miniaturer følger med |
| `DELETE image` | `{image}` |
| `GET state?rev=N` / `PUT state` | Aktivt kort og visning / `{image}` (`null` = tom skærm) |
| `GET view?image=` / `PUT view` | Gemt visning for et kort / `{image, view}` |

Et billede angives som `kampagne/room/fil` eller `kampagne/fil`. Billeder: `GET /simpelvtt/img/<ref>` og miniature `GET /simpelvtt/thumb/<ref>`. Omdøbning, flytning og sletning flytter/fjerner de gemte visninger og det aktive kort med.

## Begrænsninger

Ingen login og ingen roller; spillerskærmen kan ikke ændre noget, men API'et er åbent. Kun ét aktivt kort ad gangen (ét bord). Ingen tokens, tåge eller måleværktøj.
