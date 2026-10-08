# Noter til karakterbyggerens data-lag

## Spell-deduplikering ved overlappende kildebøger

`model._spells_for_filter()` indlæser spells fra ALLE tilladte kilders egne
spell-filer (`e5tools._all_spells()` slår `spells/index.json` op og loader
hver fil, hvis kildekode er tilladt - ikke kun XPHB). Flere kilder kan
indeholde den samme spell under samme navn, fx Fire Bolt genoptrykt næsten
identisk i både PHB (2014) og XPHB (2024). Uden videre ville en sådan spell
stå dobbelt i enhver valgliste, hvis begge kilder er slået til samtidig.

`_spells_for_filter()` deduplikerer derfor på `spell["name"]` og beholder
kun den FØRSTE forekomst. Hvilken udgave det bliver, er IKKE et bevidst
valg - det er simpelthen nøgle-rækkefølgen i `spells/index.json`, som 5etools
selv har skrevet filen i, uden nogen garanti for at nyere udgave kommer sidst
(eller først).

**Bekræftet problem, ikke kun en teoretisk risiko:** med både PHB (2014) og
XPHB (2024) tilladt vinder 2014-udgaven af Fire Bolt over 2024-udgaven ved
dedup - altså den ÆLDRE, ikke den nyere/aktuelle regel - fordi "PHB" står
før "XPHB" i `spells/index.json`. Brugeren får ingen besked om at det er
2014-reglen, der reelt blev valgt. Det er desuden ikke sikkert at ALLE
genoptryk rent faktisk er identiske tekstligt (mindre ordlydsændringer
forekommer mellem udgaver) - deduplikeringen skelner ikke mellem "ren
reprint" og "reelt ændret regel under samme navn".

**Hvis det bliver et problem:** stop med at dedupliere blindt, og vis i
stedet alle udgaver med kilde-henvisning i parentes - samme mønster som
`_label_options()` allerede bruger for racer/baggrunde/feats (navnet
suffikses kun med `(KILDE)`, når samme navn findes under mere end én
tilladt kilde). Det kræver at spell-valgenes `options`-liste bærer kilde
sammen med navnet (ligesom race/baggrunds-options gør), ikke bare en liste
af rene navne, som den er i dag.
