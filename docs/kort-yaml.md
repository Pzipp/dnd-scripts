# Kort: format for bibliotek og kortbunker

Kort er i pokerstørrelse (63 × 88 mm), 9 pr. A4. De er **generelle**: de viser formler (`d20 + spellangreb`, `2d8 + magi-mod`), aldrig en spillers tal. Derfor ændrer de sig ikke ved level-stigning og kan deles mellem karakterer.

```
python3 dnd.py kort <navn> [--stil farve|sorthvid|begge] [--pdf]
```

To slags filer:

| Fil | Indhold |
|---|---|
| `bibliotek/*.yaml` | Alle kort, som gruppen deler. Nøglen er kortets **id** |
| `karakterer/<navn>/kort.yaml` | En bunke: liste af id'er, evt. med egne kort |

## Bunke (`kort.yaml`)

```yaml
titel: Valak spellkort           # titel på HTML/PDF
kort: [eldritch-blast, hex, regel-slots]   # id'er fra bibliotek/, i rækkefølge
egne:                            # valgfri: kort kun til denne karakter
  mit-kort: {...}                # samme felter som i biblioteket. Id'et må ikke findes i forvejen
```

* Et ukendt id stopper scriptet og foreslår det nærmeste id.
* Et id må kun findes én gang på tværs af alle filer i `bibliotek/` (og `egne`).
* Et eget kort printes kun, hvis id'et også står under `kort:`.

## Print

9 kort pr. A4. Arkene kommer i rækkefølgen: ark 1 forsider, ark 1 bagsider, ark 2 forsider … Print i A4, margin 0 og **ikke** dobbeltsidet. Klip langs de stiplede linjer, og læg for- og bagside ryg mod ryg i samme kortlomme.

## Forside og bagside

* **Forside:** navn (engelsk) + dansk navn, segl (∞ = cantrip, tal = grad, § = regelkort, øvrige se nedenfor), skole, tid/afstand/varighed/komponenter, mærker for koncentration og ritual, kort effekt, terningboks og skala-tabel.
* **Bagside:** detaljer, "Godt at vide", materialer.

## Korttyper

`type` styrer seglet og farven i farve-stilen:

| `type` | Segl | Brug |
|---|---|---|
| *(ingen)* | ∞ eller graden | Besværgelse |
| `regel` | § | Regelkort (fx "Cantrips og spell slots"). Kan lægges i enhver bunke |
| `klasse` | ✦ | Klasseevne |
| `mastery` | ⚔ | Weapon Mastery |
| `feat` | ★ | Feat |
| `art` | ◆ | Art-træk (species) |
| `udstyr` | ⚒ | Nyttigt udstyr |

`kilde: Hjemmelavet` markerer homebrew (fx Felis) og ændrer sidefoden på både forside og bagside. Nederst på bagsiden står kildehenvisningen: `Hjemmelavet`, eller `ref:` hvis kortet har en (fx `ref: "PHB 2024 s. 129"`). Uden `ref` står der `PHB 2024 kap. 7` for besværgelser og `PHB 2024` for andre kort. Sidetal skrives kun, når de er kontrolleret i PHB.

## Nyt kort: besværgelse

```yaml
navn-id:
  navn: Eldritch Blast          # engelsk navn (oversættes ikke)
  dansk: Overjordisk stråle
  grad: 0                       # 0 = cantrip
  skole: Evocation
  skole_da: Fremkaldelse
  tid: Action
  afstand: 120 fod
  varighed: Øjeblikkelig
  komp: V, S
  konc: true                    # valgfri: koncentration
  ritual: true                  # valgfri
  effekt: Kort tekst til forsiden (2–4 linjer).
  terningboks:                         # terningboksen, højst 3 rækker [etiket, værdi, undertekst]
    - [Angreb, d20 + spellangreb, afstand]
  skala:                        # valgfri: [[etiket, værdi], ...]
    - [Level 1, 1 stråle]
    - ['5', '2']
  skala_titel: Stråler efter level   # valgfri
  bag:                          # bagsiden
    - {titel: Sådan virker det, tekst: ...}
    - titel: Godt at vide
      punkter: [..., ...]
```

## Nyt kort: evne, mastery, feat, art, udstyr

Bruger `felter` (præcis 4 × `[etiket, værdi]`) i stedet for `tid`/`afstand`/`varighed`/`komp`, og `kicker` til linjen under navnet:

```yaml
sneak-attack:
  type: klasse
  navn: Sneak Attack
  dansk: Snigangreb
  kicker: Klasseevne · Rogue <i>level 1</i>
  felter: [[Tid, Når du rammer], [Brug, 1 gang pr. tur], [Våben, Finesse eller afstand], [Kræver, Fordel eller en ven ved målet]]
  effekt: ...
  terningboks: [[Ekstra skade, +1d6, samme type som våbnet]]
  skala: [[Level 1, 1d6], ['3', 2d6]]
  skala_titel: Ekstra skade efter level
  bag: [...]
```

## Regelkort

`type: regel` bruger `foran` (sektioner på forsiden) i stedet for effekt og terningboks. Sektioner er `{titel, tekst}` eller `{titel, punkter: [...]}`.

## Regler for indholdet

* 2024-regler (Player's Handbook 2024, kap. 7 for besværgelser). Skriv kilden, når du er i tvivl.
* Afstande i ft. Ingen karaktertal.
* Hold forsidens effekt på 2–4 linjer. Detaljer hører til på bagsiden.
* Generatoren tjekker ikke selv, om teksten passer. Dele, der ikke kan skrumpe (terningboks, skala), har forrang, og en for lang effekttekst bliver skåret af. Kig på kortet, før du printer.
* HTML `<b>`, `<i>` er tilladt. Skriv `&` som `&amp;`.
* Følg [navnekonventionen](navnekonvention.md).
