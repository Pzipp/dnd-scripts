# Versioner og udgivelser

Der er tre ting, som hver har sit formål:

| Hvad | Hvor | Til hvad |
|---|---|---|
| **Udgivelse** (`v0.2.0`) | filen `VERSION`, git-tag `vX.Y.Z`, [CHANGELOG.md](../CHANGELOG.md) | Et stabilt punkt, man kan pege på: "karakteren er lavet med 0.2.0" |
| **Bygning** (`5af8728`) | den korte commit-hash | Præcis hvilken kode, der kørte, også mellem udgivelser |
| **Dokumentversion** | `DOC_VERSION` (kort, `mapcreator/src/model/types.ts`) | Filformatet; stiger kun, når formatet ændres, og klienten omdanner ældre filer ved åbning |

Udgivelsen og bygningen vises sammen som `0.2.0 (5af8728)`.

## Hvad tæller version

[SemVer](https://semver.org/lang/da/): `MAJOR.MINOR.PATCH`. Så længe tallet starter med 0 er alt "før 1.0", men reglen er den samme:

- **MAJOR**: et filformat ændres, så ældre karakterer eller kort skal omdannes (en migrering følger med).
- **MINOR**: nye ting: værktøjer, genstande, materialer, felter i byggeren. Ældre filer virker uændret.
- **PATCH**: rettelser.

`VERSION` er den **seneste udgivelse**. Mellem to udgivelser viser alt derfor samme udgave, men med forskellig bygning; det er bygningen, der fortæller, hvilken commit der kørte.

## Commit-beskeder

Skriv `område: hvad der er ændret på dansk`, fx `mapcreator: grottekanten som linjestil` eller `docs: vejledning til versioner`. Præfikset (`mapcreator`, `builder`, `simpelvtt`, `docs`, `dnd`, `webui`, `docker`, `test`) bruges til at samle ændringslogen. Uden præfiks havner beskeden under *Andet*.

## Lav en udgivelse

1. Merge `dev` til `main` med en pull request (som hidtil).
2. På `main`: `python3 scripts/release.py minor` (eller `patch`, `major`, eller et nummer `0.1.0`). Tilføj `--preview` for kun at se ændringslogen.
3. Scriptet hæver `VERSION`, tilføjer et afsnit i `CHANGELOG.md` med alle commits siden sidste udgivelse (grupperet efter område), laver en commit `Udgivelse vX.Y.Z` og et annoteret tag. Skriv noter, du vil have med i udgivelsen (fx "OBS: kort fra før 0.2 åbnes og omdannes"), under `## Ikke udgivet` i `CHANGELOG.md` før du kører det; de kommer øverst i afsnittet.
4. Send det afsted: `git push && git push origin vX.Y.Z`.
5. Prod: bygges med bygningens commit, så den kan vises: `docker compose build --build-arg APP_COMMIT=$(git ls-remote https://github.com/Pzipp/dnd-scripts main | cut -c1-7) dnd-webui`, derefter `docker compose up -d dnd-webui`. Uden `APP_COMMIT` vises kun udgaven.

Første udgivelse: `python3 scripts/release.py 0.1.0`.

## Hvad der mærkes med version

Hver gang et kort eller en karakter gemmes, skriver serveren et `app`-felt i filen:

```yaml
app:
  created: {version: 0.2.0, build: 5af8728, date: '2026-10-17'}   # første gang filen blev gemt
  saved:   {version: 0.2.0, build: 9b3ea68, date: '2026-10-20'}   # sidste gang
```

- **Karakterer**: `choices.yaml` og `character.yaml` (øverst). Se [choices-yaml.md](choices-yaml.md) og [character-yaml.md](character-yaml.md).
- **Kort**: nøglen `app` i kortets JSON, og kortlisten i *Åbn* viser "gemt med …". Se [mapcreator-format.md](mapcreator-format.md).
- Filer fra før versioneringen har intet mærke og vises som **før versionering**.
- `created` ændres aldrig. Ved en opdatering (en migrering) er det `saved`, der siger, at filen er gennemgået af den nye udgave.

Kommandoen `python3 dnd.py version` viser udgaven og mærket for alle karakterer og kort; `--aeldre-end 0.2.0` viser kun dem, der sidst er gemt med en ældre udgave, altså dem, der skal opdateres.

## Opdater ældre filer (migrering)

Når en ændring kræver det: hæv dokumentversionen (kort: `DOC_VERSION` i klienten og i `webui/mapcreator/__init__.py`), skriv omdannelsen, der kører ved åbning (kortbyggeren gør det allerede for ældre kort), og nævn det under *Ikke udgivet* i ændringsloggen. Mærket `saved` fortæller bagefter, hvilke filer der endnu ikke er gemt med den nye udgave.

## Hvor versionen ses

- Menuen (`/`): nederst.
- Kortbyggeren: i den lille tekst nederst til venstre på kortet.
- `GET /api/version`: `{"version": "0.2.0", "build": "5af8728", "label": "0.2.0 (5af8728)"}`.
- Koden: `scripts/appinfo.py`.
