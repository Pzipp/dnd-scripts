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

## Feats: manuel eller automatisk

`type: features` kan bygge sine `items` på to måder, pr. boks:

```yaml
# Manuel (standard) - items skrives i hånden, som ovenfor.
- type: features
  title: Evner &amp; træk
  items: [{name: Action Surge, tag: Niveau 2, text: Skriv teksten her.}]

# Automatisk - items bygges fra character.yamls feats-liste, navn + dansk
# beskrivelse slået op via samme kæde som "mangler beskrivelse"-banneret
# (håndkurateret kort -> delt cache -> mangler, se descriptions.lookup()).
- type: features
  title: Feats
  auto: true
  exclude: [Ability Score Improvement]   # valgfri - feat-navne der IKKE skal vises her
```

`exclude` er til feats, du hellere vil beskrive i hånden et andet sted
(fx et avanceret feat, der fortjener sin egen boks). En feat uden
oversættelse endnu vises med sit engelske navn og tom tekst - ingen fejl,
ingen opfundet tekst. Kun `feats` dækkes i dag - `class_features`/
`spells_known`/`race_traits` er stadig ikke automatiserede (se
[Afgrænsning](#afgrænsning)).

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

`feats` kan vises automatisk (se [Feats: manuel eller automatisk](#feats-manuel-eller-automatisk)
ovenfor). `spells_known`/`class_features`/`race_traits` udfyldes stadig
IKKE automatisk nogen steder - de skrives i hånden, ligesom i det gamle
system, eller dækkes slet ikke af selve arket (spells/klasseevner hører i
dag til det separate kort-system, `kort.yaml`/`spellkort.py`).
