# Plan: karakterark-bygger ud fra `choices.yaml`

**Status: IKKE bygget.** Dette er en beskrivelse af hvad der er bedt om, så
en ny session kan fortsætte derfra - ikke en implementeret feature, og ikke
en bindende arkitektur-beslutning. Hvor noget nedenfor er åbent/uafklaret,
står det udtrykkeligt.

## Hvad det skal gøre

En ny bygger, der laver det printbare karakterark direkte ud fra
karakterbyggerens data (`choices.yaml`, se [choices-yaml.md](choices-yaml.md)),
i stedet for den eksisterende manuelle vej (`karakter.yaml`, se
[karakterark-yaml.md](karakterark-yaml.md)).

## Input: to YAML-filer

Byggeren læser to filer, ikke én:

1. **Data** - stats, spells, feats osv. Dette er `choices.yaml` (eller en
   udregnet/opsummeret udgave af den, se nedenfor).
2. **Side-opsætning** - hvordan indholdet fordeles på sider/bokse.

Hvilket format fil nr. 2 skal have, og om det er en ny fil pr. karakter
eller en delt skabelon, er IKKE afklaret. Det eksisterende system har et
layout-sprog til dette (`karakter.yaml`s `sider`/`layout`, se
[karakterark-yaml.md](karakterark-yaml.md#layout)) - om den nye bygger
genbruger det, eller får sit eget, er et åbent spørgsmål.

## Data: rå eller udregnet, i filen eller en anden fil

Byggeren skal kunne læse sin data **enten** direkte fra `choices.yaml`
(rå valg, slået op i 5etools selv, som `model.state()` allerede gør),
**eller** fra en opsummeret/udregnet udgave - og den udregnede udgave kan
ligge **enten** inde i samme fil **eller** i en separat fil. Hvilken af de
fire kombinationer der reelt skal bygges, er ikke besluttet.

## Dansk tekst: slå op via id, generér med LLM hvis den mangler

Hvert valg i `choices.yaml` er et engelsk `{name, source}`-id (se
[choices-yaml.md](choices-yaml.md#navneopslag-engelsk-id--kilde-ikke-en-fast-liste)).
Byggeren skal ud fra det rigtige id kunne se, hvad karakteren har, og
hente DEN DANSKE udgave af det. Findes der ikke allerede en dansk udgave,
skal byggeren kunne lave én ved et LLM-kald.

Ikke specificeret endnu: hvor en genereret dansk udgave gemmes/caches (så
den ikke skal genereres igen ved næste bygning), og det nøjagtige format
for en "dansk udgave" af et opslag.

**Relevant eksisterende regel, værd at holde sig til:** AGENTS.md's
navnekonvention siger at engelske regelnavne (stats, spells, feats,
tilstande osv.) altid står ALENE, uden dansk oversættelse i parentes -
kun forklarende tekst er dansk. En "dansk udgave" af et opslag bliver
derfor sandsynligvis en dansk GENGIVELSE/forklaring af reglen, ikke en
oversættelse af selve navnet - men det er min kobling til en eksisterende
regel, ikke noget der er sagt direkte om den nye bygger.
