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

## Renderer

Print-fanen bygger arket via `webui/builder/render.py` - en selvstændig,
engelsk-nøglet renderer, der læser `sheets.yaml`/`character.yaml` direkte
(ingen dansk mellemform, ingen oversættelses-adapter). Boks-typerne
(`type:`) og felt-navnene er engelske fra kilden - se `render.py`s
`REGISTRY` for den fulde liste af boks-typer (`abilities`, `stats`,
`features`, `attacks`, `training` osv.) og hver `box_*`-funktion for det
felt den forventer.

`render.py` er en bevidst uafhængig kopi af
`scripts/karakterark/karakterark.py`s rendering-logik (samme HTML/CSS,
samme boks-for-boks-opbygning), lavet fordi en oversættelses-adapter mellem
to parallelle sprog blev vurderet som en unødvendig, voksende
vedligeholdelsesbyrde. De to renderere deler CSS'en i
`scripts/karakterark/*.css` uændret. Når de 8 håndskrevne spillerkarakterer
en dag migreres til `character.yaml`/`sheets.yaml`, kan
`scripts/karakterark/karakterark.py` fjernes helt - se
[`docs/karakterark-bygger-plan.md`](karakterark-bygger-plan.md).

## Afgrænsning

Boksenes `items`/`punkter` udfyldes IKKE automatisk fra `character.yaml`s
`feats`/`spells_known`/`class_features`/`race_traits` endnu - de skrives i
hånden, ligesom i det gamle system. De danske beskrivelser, som
`webui/builder/descriptions.py` finder/genererer (se [`docs/karakterark-bygger-plan.md`](karakterark-bygger-plan.md)),
er derfor i dag kun data til rådighed (vist som "mangler"-banner på
Print-fanen) - at koble dem automatisk ind i layoutet er en naturlig næste
udvidelse, men ikke bygget i denne omgang.
