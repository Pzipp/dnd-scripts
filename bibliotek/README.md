# bibliotek/

Kort, som gruppen deler. En karakters `kort.yaml` henviser til dem med id.

| Fil | Indhold |
|---|---|
| `besvaergelser.yaml` | Besværgelser og regelkort om magi (Cantrips og spell slots, Koncentration og ritualer) |
| `evner.yaml` | Klasseevner, Weapon Mastery, feats, art-træk og regelkort (To våben, Heroic Inspiration) |
| `udstyr.yaml` | Nyttigt udstyr: Ball Bearings, Oil, Healer's Kit, Thieves' Tools, lys, Grappling Hook |
| `_descriptions.yaml` | **Genereret, ikke håndskrevet.** Delt cache af korte danske beskrivelser til det nye system (choices.yaml-karakterer), fundet/genereret af `webui/builder/descriptions.py` - se [docs/karakterark-bygger-plan.md](../docs/karakterark-bygger-plan.md). `_`-præfikset er bevidst: andet format end et kort, skal IKKE indlæses af `scripts/kort/spellkort.py`s kortbibliotek. |

Alle `.yaml`-filer i mappen indlæses som kort (filer, der starter med `_`, springes over - det er derfor `_descriptions.yaml` har præfikset). Nøglen er kortets **id**, og et id må kun findes én gang på tværs af filerne. Du kan frit lægge nye filer her, fx `homebrew.yaml`.

Format for et kort: [`docs/kort-yaml.md`](../docs/kort-yaml.md). Kort er generelle og viser formler, aldrig karaktertal. Navne følger [navnekonventionen](../docs/navnekonvention.md): `navn` er engelsk, `dansk` er undertitlen.
