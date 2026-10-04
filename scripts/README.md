# scripts/

Generatorerne. Du kører dem normalt via `python3 dnd.py ...` i roden af repoet (se [`../README.md`](../README.md)). Hver mappe har sin egen README.

| Mappe | Laver | README |
|---|---|---|
| `karakterark/` | Karakterark, 4 sider A4, farve og sort/hvid | [karakterark/README.md](karakterark/README.md) |
| `kort/` | Spell-/evne-/udstyrskort, 63 × 88 mm, farve og sort/hvid | [kort/README.md](kort/README.md) |
| `pdf/` | PDF ud fra HTML | [pdf/README.md](pdf/README.md) |
| `faelles.py` | Fælles hjælpere (indlæs YAML/JSON, find filer, stile, outputstier) | |

## Fælles konventioner

* **Inddata** er YAML (JSON kan også læses). **Uddata** er selvstændige HTML-filer, og PDF ved behov.
* **Stile:** `farve` og `sorthvid`. Hvert script har `--stil farve|sorthvid|begge` (standard `begge`).
* **Filnavne:** `<type>-<stil>.html|pdf`, fx `kort-farve.pdf`, lagt i `karakterer/<navn>/udskrifter/` (eller `--ud MAPPE`).
* **Kilde-argument:** et karakternavn (`valak`), en mappe eller en filsti. `faelles.find_fil()` finder filen.
* Fejl stopper scriptet med en forklarende dansk besked (`faelles.fejl()`), ikke en lang traceback.

## Nyt script

1. Læg det i en ny mappe under `scripts/` med en README.
2. Brug `faelles.py` til indlæsning, `--stil` og outputstier, så det opfører sig som de andre.
3. Giv det en `lav(kilde, stil, ud_mappe)`-funktion, tilføj det i `dnd.py`, og lav både farve og sort/hvid.
4. Opdatér `README.md`, `AGENTS.md` og `docs/`.
