# karakterer/

Én mappe pr. karakter. Alt til en karakter ligger samlet her.

```
karakterer/
  <navn>/
    karakter.yaml     karakterarket (4 sider)       -> docs/karakterark-yaml.md
    kort.yaml         kortbunken                    -> docs/kort-yaml.md
    udskrifter/       genererede filer (rediger aldrig i hånden)
      karakterark-farve.pdf    karakterark-sorthvid.pdf
      kort-farve.pdf           kort-sorthvid.pdf
  _skabelon/          kommenteret skabelon til nye karakterer
```

`.html`-filerne i `udskrifter/` committes ikke (de laves på ny med `python3 dnd.py ...`). PDF'erne committes, så alle kan printe uden Python.

## Ny karakter

```bash
cp -r karakterer/_skabelon karakterer/min-karakter
# ret karakter.yaml og kort.yaml
python3 dnd.py tjek
python3 dnd.py alt min-karakter --pdf
```

Mappenavn: små bogstaver og bindestreg (`mighty-bird`). Hver spiller ejer sin egen mappe. Skabelonen (`_skabelon`) bygges af `python3 dnd.py tjek`, så den altid virker.
