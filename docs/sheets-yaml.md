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

**Redigeres via en indbygget YAML-editor på byggerens Print-fane**
("Rediger layout"-knappen) - CodeMirror med syntaksfarver, linjenumre,
fejlmarkering og live-forhåndsvisning, samme opsætning som den gamle
YAML-editor (`/editor`, se [webui/README-yaml-editor.md](../webui/README-yaml-editor.md)),
bare mod `/api/builder/sheets_*`-endepunkterne og `render.py` i stedet for
`karakterark.py`. Den gamle editor redigerer IKKE `sheets.yaml` - to
samtidige redigeringsflader mod samme fil var en dårlig idé.

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

`top.summary` udeladt helt (`top: {}` eller ingen `summary`-nøgle) viser
automatisk `character.yaml`s `summary` (Klasse/Art/Baggrund) - ingen
hånd-indtastning pr. side. Angives `top.summary` selv, bruges den i stedet
(fx side 2's Slag/Fordel/Ulempe-forklaring, der intet har med karakteren at
gøre). `top.extra_summary` lægges ALTID til bagefter, til felter uden en
datakilde i `choices.yaml` endnu (fx Holdning/alignment):

```yaml
top:
  extra_summary:
  - [Holdning, Neutral]
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

## Passive sanser

`type: passive` beregner som standard alle tre passive sanser (Perception,
Investigation, Insight: `10 + ability + PB` hvis trænet, `+2×PB` ved
Expertise, ellers ingen PB - samme regel som et almindeligt skill check)
ud fra `character.yaml`s `skills`/`expertise`. Ingen `items` behøves:

```yaml
- type: passive
  title: Passive sanser
```

`items` kan stadig angives (samme `[label, '{...}']`-par som andre bokse)
for at overstyre - fx en fjerde, situationsbestemt passiv sans.

## Sprog og AC

`type: languages` falder på samme måde tilbage til `character.yaml`s
`languages` (Common + de 2 valgt i byggeren, se
[choices-yaml.md](choices-yaml.md)), hvis `text` udelades:

```yaml
- type: languages
  title: Sprog
```

`text` kan stadig angives for at overstyre eller tilføje et klasse-/
feature-tildelt sprog (fx Thieves' Cant), som IKKE tælles med automatisk -
se [character-yaml.md](character-yaml.md#afledte-felter-med-et-kendt-gap).

AC (i `type: stats`-rækken) er på samme måde altid beregnet fra
`equipment.armor`/`equipment.shield`, ikke et felt i sheets.yaml selv - se
samme afsnit i character-yaml.md.

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
