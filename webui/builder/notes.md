# Noter til karakterbyggerens data-lag

## Spell-navne under overlappende kildebøger

`model._spells_for_filter()` indlæser spells fra ALLE tilladte kilders egne
spell-filer (`e5tools._all_spells()` slår `spells/index.json` op og loader
hver fil, hvis kildekode er tilladt - ikke kun XPHB). Flere kilder kan
indeholde den samme spell under samme navn, fx Fire Bolt genoptrykt næsten
identisk i både PHB (2014) og XPHB (2024).

De to udgaver fjernes IKKE fra hinanden (det blev prøvet først, men viste
sig at vælge rent efter nøgle-rækkefølgen i `spells/index.json` - ikke en
bevidst regel. Bekræftet konkret: med både PHB og XPHB tilladt vandt
2014-udgaven af Fire Bolt over 2024-udgaven, fordi "PHB" står før "XPHB" i
indeksfilen - stik modsat hvad man ville forvente, og uden at brugeren får
besked om, hvilken udgave der reelt blev valgt).

I stedet vises BÅDE navnet suffikset med kilden, fx `Fire Bolt (PHB)` og
`Fire Bolt (XPHB)` som to separate muligheder i valglisten - samme mønster
som `_label_options()` allerede bruger for racer/baggrunde/feats. Suffikset
tilføjes kun, når navnet reelt er ambigut (findes under mere end én kilde
blandt de aktuelle kandidater) - med kun XPHB tilladt (standard) ser alt ud
som før, uden suffiks.

**Kendt begrænsning:** dette løser kun SELVE VALGET (brugeren ser og kan
vælge mellem begge udgaver). Det løser ikke, om de to udgaver reelt ER
identiske - mindre ordlydsændringer mellem en 2014- og 2024-udgave af samme
spell-navn forekommer, og intet her sammenligner deres faktiske indhold.
