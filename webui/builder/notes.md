# Noter til karakterbyggerens data-lag

## Spell-deduplikering ved overlappende kildebøger

`model._spells_for_filter()` indlæser spells fra ALLE tilladte kilders egne
spell-filer (`e5tools._all_spells()` slår `spells/index.json` op og loader
hver fil, hvis kildekode er tilladt - ikke kun XPHB). Flere kilder kan
indeholde den samme spell under samme navn, fx Fire Bolt genoptrykt næsten
identisk i både PHB (2014) og XPHB (2024). Uden videre ville en sådan spell
stå dobbelt i enhver valgliste, hvis begge kilder er slået til samtidig.

`_spells_for_filter()` deduplikerer derfor på `spell["name"]` og beholder
kun den FØRSTE forekomst. Hvilken udgave det bliver, afgøres af
filrækkefølgen i `spells/index.json`, ikke et bevidst valg af hvilken bogs
version der skal vinde.

**Risiko:** deduplikeringen går ud fra, at to bøgers version af samme
spell-navn er reelt ens (en reprint). Er det ikke tilfældet - en bog har
faktisk ændret reglerne for en spell under samme navn - vil brugeren kun se
ÉN af de to udgaver, uden at vide hvilken, og uden mulighed for selv at
vælge den anden.

**Hvis det bliver et problem:** stop med at dedupliere blindt, og vis i
stedet alle udgaver med kilde-henvisning i parentes - samme mønster som
`_label_options()` allerede bruger for racer/baggrunde/feats (navnet
suffikses kun med `(KILDE)`, når samme navn findes under mere end én
tilladt kilde). Det kræver at spell-valgenes `options`-liste bærer kilde
sammen med navnet (ligesom race/baggrunds-options gør), ikke bare en liste
af rene navne, som den er i dag.
