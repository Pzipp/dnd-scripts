# karakterer/

Her ligger kun skabelonen (`_skabelon/`). Selve karaktererne ligger i `$USERDATA/karakterer/` (`vol/userdata/karakterer/` i dev; ikke i git). Uden `USERDATA` bruger `dnd.py` `vol/userdata/karakterer/`, hvis den findes. Én mappe pr. karakter, og alt til en karakter ligger samlet:

```
$USERDATA/karakterer/
  <navn>/
    choices.yaml      byggerens rå valg                -> docs/choices-yaml.md        (nyt system)
    character.yaml    udregnede stats, genberegnes     -> docs/character-yaml.md      (nyt system)
    sheets.yaml       arkets layout, redigeres frit    -> docs/sheets-yaml.md         (nyt system)
    kort.yaml         kortbunken                       -> docs/kort-yaml.md           (begge systemer)
    karakter.yaml     karakterarket, typisk 4 sider    -> docs/karakterark-yaml.md    (ældre system)
    udskrifter/       genererede filer (rediger aldrig i hånden)
      karakterark-farve.pdf    karakterark-sorthvid.pdf    karakterark-<tema>.pdf
      kort-farve.pdf           kort-sorthvid.pdf           kort-<tema>.pdf
karakterer/ (i repoet)
  _skabelon/          kommenterede skabeloner til nye karakterer (karakter.yaml, kort.yaml, sheets.yaml)
```

Nye karakterer oprettes i webui'en (`/builder`), som skriver `choices.yaml`, `character.yaml`, `sheets.yaml` og `kort.yaml`. Ældre karakterer har `karakter.yaml` og `kort.yaml` og bruges med `dnd.py`. Nogle mapper har begge slags filer (`valak`, `terrin`, `chukio`, `kvist`). PDF-filerne for temaer laves kun i webui'en; `dnd.py` laver `farve` og `sorthvid`.

`udskrifter/` committes ikke (`.gitignore`). Alt i den, HTML som PDF, laves på ny i webui'en eller med `python3 dnd.py ... --pdf`. Mappen oprettes af scriptet, første gang du laver noget.

## Ny karakter

I webui'en: åbn `/builder` og opret en karakter. Det ældre format:

```bash
cp -r karakterer/_skabelon karakterer/min-karakter
# ret karakter.yaml og kort.yaml
python3 dnd.py tjek
python3 dnd.py alt min-karakter --pdf
```

Mappenavn: små bogstaver og bindestreg (`mighty-bird`). Hver spiller ejer sin egen mappe. Skabelonen (`_skabelon`) bygges af `python3 dnd.py tjek`, så den altid virker.
