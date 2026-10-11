# Oversættelse af D&D-bøger (5etools-JSON) til dansk

Mappen oversætter `data/books/book-<bog>.json` til `data/books/book-<bog>-da.json` i batches. Sproget er dansk; reglerne følger `ordliste.md`, som skal læses før første batch i en session.

## Mappen

| Sti | Hvad |
|---|---|
| `oversaet_bog.py` | Værktøjet. Første argument er bog-id (`xphb` for `book-xphb.json`) |
| `ordliste.md` | Oversættelsesregler og faste termer. Fælles for alle bøger |
| `<bog>/engelsk/NNN.json` | Udtrukne engelske tekster, `{id: tekst}`, ca. 9000 tegn pr. batch |
| `<bog>/dansk/NNN.json` | Oversættelsen af samme batch, samme id'er. Ret her, når noget skal rettes |
| `<bog>/stier.json` | Id → sti i kilde-JSON'en. Genereres af `udtraek` |

Det samlede resultat `book-<bog>-da.json` genereres. Ret aldrig i den, men i `<bog>/dansk/` og kør `saml`.

## Arbejdsgang for en ny bog

1. Læg kilden som `data/books/book-<bog>.json`.
2. `python3 oversaet_bog.py <bog> udtraek` laver `<bog>/engelsk/` og `<bog>/stier.json`.
3. Gentag, til intet er tilbage:
   - `python3 oversaet_bog.py <bog> naeste` viser næste batch uden dansk fil.
   - Skriv oversættelsen til `<bog>/dansk/NNN.json`. Enten hele batchen, eller kun de ids der skal ændres, i en midlertidig fil, som `flet NNN FIL` lægger ind i `dansk/NNN.json`. `flet` kopierer selv ids med ren tal+enhed (`2 lb.`, `25 GP`) uændret og melder, hvad der mangler.
   - `python3 oversaet_bog.py <bog> tjek` skal melde alle batches gyldige, før du går videre.
4. `python3 oversaet_bog.py <bog> saml` bygger `book-<bog>-da.json`. Det kan køres når som helst; uoversatte batches bliver stående på engelsk.

Genoptagelse efter afbrydelse: `status` viser antal færdige batches, `naeste` giver den næste. Start den næste batch selv, når en er færdig, til `naeste` melder, at alle er oversat.

## Opslagsfiler (spells, races, feats)

Samme værktøj bruges til 5etools' opslagsfiler. Bog-id er et frit navn, og kilden er `data/books/book-<id>.json` (lav et symlink til filen i `/srv/dnd5etools/data/`, fx `ln -s /srv/dnd5etools/data/spells/spells-xphb.json ../book-spells-xphb.json` og `.../races.json` som `../book-races.json`). Arbejdsgangen er den samme. Forskelle:

* Navne på poster i listerne `spell`, `race`, `subrace` og `feat` (og på `_versions`) udtrækkes ikke. `_copy`, `_abstract` og `additionalSpells` røres ikke.
* Materialekomponenter (`components.m`) og `time[].condition` udtrækkes.
* `saml` retter `_mod ... replace`-henvisninger til oversatte trækoverskrifter og melder dem, der ikke kunne findes.

## Hvad oversættes

`udtraek` tager tekstværdier i `name`, `entries`, `entry`, `items`, `row`/`rows`, `colLabels`, `footnotes`, `caption`, `title` og `by`. `statblock`-referencer, `credit`, `source`, `id`, `page`, `href` og andre tekniske felter røres ikke. Strenge uden bogstaver uden for tags udtrækkes ikke.

## Faste regler

* `{@...}`-tags er uændrede, tegn for tegn, også visningsteksten. `tjek` afviser en batch, hvor tags afviger. Omgivende tekst bøjes efter dansk grammatik.
* Spilbegreber (egenskaber, tilstande, skadetyper, handlinger, enheder) står som dansk med engelsk i parentes. Navne på genstande, klasser, subclasses, besværgelser, monstre og species står på engelsk. Detaljer og faste termer: `ordliste.md`.
* Navne på personer og kreditlister oversættes ikke; kun etiketterne.
* Ids i en `dansk/`-fil skal være præcis de samme som i `engelsk/`. Tomme værdier afvises.
* Ændr aldrig `engelsk/` i hånden. Hvis kilden ændres, så kør `udtraek` igen (det overskriver `engelsk/` og `stier.json`) og ret `dansk/` til, så ids passer.
* Ret `ordliste.md` i stedet for at lade en beslutning stå kun i en batch, så senere batches og bøger er konsistente.
* Kun filer til denne mappe og `data/books/` ændres. Commit kun, når brugeren beder om det.
