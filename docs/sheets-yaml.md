# Karakterark (nyt system): format for `sheets.yaml`

Én fil pr. choices.yaml-karakter: `karakterer/<navn>/sheets.yaml`. Spiller
den samme rolle som den gamle `karakter.yaml`s [`sider:`-sektion](karakterark-yaml.md#layout)
- samme layout-sprog (bokse, kolonner, rækker), bare med engelske nøgler.

Skabelon: [`karakterer/_skabelon/sheets.yaml`](../karakterer/_skabelon/sheets.yaml).
Findes filen ikke, kopieres skabelonen ind første gang (`webui/builder/sheets.py`s
`ensure_exists()`), ligesom skabelonen i dag kopieres manuelt med `cp -r`.

**Redigeres frit, overskrives aldrig automatisk** - i modsætning til
[`character.yaml`](character-yaml.md), som genberegnes ved hvert gem.
Fritekst-sektionerne (baggrund, kampagnenoter, egne træk) udfyldes i hånden,
ligesom i dag.

## Opbygning

```yaml
pages:
- margin: small
  top: {}                      # sidehoved med character.name + character.summary
  layout:
  - type: stats
  - columns:
    - width: 1
      content:
      - type: abilities
    - width: 2
      content:
      - type: features
        title: Evner &amp; træk
        items:
        - {name: Action Surge, tag: Niveau 2, text: Skriv teksten her.}
  footer: 'Kilde: PHB 2024'
```

## Nøgle-oversættelse (engelsk → dansk i `karakterark.py`)

Print-fanen bygger arket via den EKSISTERENDE `scripts/karakterark/karakterark.py`
(uændret) ved at oversætte `sheets.yaml` til det format den allerede forstår
- se `webui/builder/legacy_adapter.py`s `NODE_KEY_MAP`/`BOX_TYPES`. De
engelske feltnavne følger den gamle [layout-tabel](karakterark-yaml.md#layout)
1:1, bare på engelsk: `columns`/`rows` for `kolonner`/`raekker`, `width` for
`bredde`, `content` for `indhold`, `items` for `punkter`, `title`/`subtitle`
for `titel`/`undertitel`, `footer` for `foot`, `summary` for `ident`,
`blank_lines` for `tomme`. Bokstyperne (`type:`) er også engelske - fx
`abilities` for `evner`, `features` for `traek`, `attacks` for `angreb` - se
den fulde liste i `legacy_adapter.py`s `BOX_TYPES`.

## Afgrænsning

Boksenes `items`/`punkter` udfyldes IKKE automatisk fra `character.yaml`s
`feats`/`spells_known`/`class_features`/`race_traits` endnu - de skrives i
hånden, ligesom i det gamle system. De danske beskrivelser, som
`webui/builder/descriptions.py` finder/genererer (se [`docs/karakterark-bygger-plan.md`](karakterark-bygger-plan.md)),
er derfor i dag kun data til rådighed (vist som "mangler"-banner på
Print-fanen) - at koble dem automatisk ind i layoutet er en naturlig næste
udvidelse, men ikke bygget i denne omgang.
