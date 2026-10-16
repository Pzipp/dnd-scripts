# General Maps (leverede kort)

Denne mappe følger git og bliver en del af det færdige docker-image. Kortene her vises i det simple VTT (`/simpelvtt`) under sektionen **General Maps**, som er tilgængelig i alle kampagner. Mappen er skrivebeskyttet i UI'et (låseikon): man kan ikke slette, omdøbe eller flytte dem derfra.

Struktur: maks. to niveauer, ligesom resten af VTT'et.

```
general_maps/
  <room>/billede.png     # et room
  billede.jpg            # løst kort
```

Rooms med samme navn i `vol/userdata/simpelvtt/general-maps/` (brugerens egne tilføjelser, ikke i git) slås sammen med rooms herfra i visningen.

**Ophavsret:** læg kun billeder her, som gruppen har ret til at distribuere (egne tegninger, CC0/CC-BY med kildeangivelse, eller materiale med tilladelse). Mappen følger repoet, og repoet er offentligt. Alt andet hører til i `vol/userdata/simpelvtt/general-maps/` (eller i en kampagne) og kommer aldrig i git.

Filtyper: png, jpg, webp, gif.
