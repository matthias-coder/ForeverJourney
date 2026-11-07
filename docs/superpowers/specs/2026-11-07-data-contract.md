# ForeverJourney – Datenvertrag zwischen Tool und Seite

Datum: 2026-11-07. Gilt für `schemaVersion: 1`. Das Tool schreibt, die Seite liest. Beide Pläne
(`docs/superpowers/plans/2026-11-07-tool.md`, `docs/superpowers/plans/2026-11-07-site.md`) bauen
darauf. Alle Zeitstempel sind Unix-Sekunden UTC (wie im Addon-Export), alle Pfade relativ zum
Repo-Root und mit `/` getrennt.

## Charakter-ID

`id = slug(meta.name) + "-" + slug(meta.realm)` – Kleinbuchstaben, Umlaute transliteriert
(ä→ae, ö→oe, ü→ue, ß→ss), alles außer `[a-z0-9]` wird `-`, Mehrfach-`-` zusammengezogen.
Beispiel: `Thorgrim` / `Eisenbart` → `thorgrim-eisenbart`. Auf Forever enthält `meta.realm` den
Nachnamen des Charakters (siehe EXPORT_SCHEMA).

## `data/index.json`

```json
{
  "schemaVersion": 1,
  "generatedAt": 1794063600,
  "title": "Chronik der Ewigen",
  "characters": [
    {
      "id": "thorgrim-eisenbart",
      "file": "data/thorgrim-eisenbart.json",
      "name": "Thorgrim",
      "surname": "Eisenbart",
      "displayName": "Thorgrim Eisenbart",
      "class": "WARRIOR",
      "race": "Dwarf",
      "faction": "Alliance",
      "level": 27,
      "status": "active",
      "mode": "normal",
      "realmType": "PvE",
      "realmName": "Ewigborn",
      "armoryUrl": null,
      "portrait": { "kind": "shot", "file": "shots/thorgrim-eisenbart/WoWScrnShot_101226_204411.jpg",
                    "thumb": "shots/thorgrim-eisenbart/t_WoWScrnShot_101226_204411.jpg",
                    "crop": { "zoom": 1.6, "x": 50, "y": 30 } },
      "playedSeconds": 137520,
      "deaths": 2,
      "created": 1791792000,
      "lastSeen": 1793998860
    }
  ]
}
```

- `status`: `"active" | "resting" | "retired"`. Regel: `retired` wenn Konfiguration es setzt oder
  die Export-Datei fehlt; sonst `resting` wenn `lastSeen` älter als 14 Tage (gemessen an
  `generatedAt`); sonst `active`. Im Modus `hardcore` zusätzlich `"fallen"` erlaubt (nur per
  Konfiguration gesetzt; noch nicht aus dem Export ableitbar).
- `mode`: `"normal" | "hardcore"`, aus Konfiguration, Standard `normal`.
- `realmType`: `"PvP" | "PvE" | "RP-PvP" | "RP-PvE" | null`, `realmName`: string | null, `armoryUrl`:
  string | null – alle aus der Konfiguration.
- `portrait.kind`: `"armory" | "shot" | "none"`. Bei `armory` ist `url` gesetzt (die Seite lädt
  ihn zur Laufzeit; Fallback auf `shot`, dann `none`). Bei `shot` sind `file`, `thumb` gesetzt und
  `crop` ist `portrait` aus dem Screenshot-Eintrag (`zoom`, `x`, `y` in Prozent) oder null.
- `level` = höchster Schlüssel in `state.levels`. `playedSeconds` = Maximum aus dem größten
  `levelSnapshots[*].playedTotal` und der Summe der `sessions[].duration`. `deaths` = Summe `levelActivity[*].deaths` (Länge der Listen).
- `lastSeen` = max(`sessions[].endTime`, `exportedAt`). `created` = `data.character.created`.
- Reihenfolge: zuerst `active`, dann `resting`, dann `retired`/`fallen`; innerhalb nach `lastSeen`
  absteigend.

## `data/<id>.json`

```json
{
  "schemaVersion": 1,
  "id": "thorgrim-eisenbart",
  "meta": { "...": "meta aus dem Export OHNE profileKey; zusätzlich 'clientFlavor' (meta.client.flavor oder aus gameBuild abgeleitet)" },
  "config": { "status": "active", "mode": "normal", "realmType": "PvE", "realmName": "Ewigborn", "armoryUrl": null },
  "maps": { "1426": { "name": "Dun Morogh", "parent": 1414 } },
  "state": { "...": "siehe unten" },
  "lists": {
    "events": [], "sessions": [], "journal": [], "screenshots": [], "dungeons": [],
    "worldDrops": [], "journeySegments": [], "journeyGhost": [], "pvpHistory": []
  },
  "goldHistory": { "2026-10-12": { "first": 0, "last": 1234, "min": 0, "max": 1300, "level": 5 } },
  "shots": {
    "WoWScrnShot_101226_204411.jpg": {
      "file": "shots/thorgrim-eisenbart/WoWScrnShot_101226_204411.jpg",
      "thumb": "shots/thorgrim-eisenbart/t_WoWScrnShot_101226_204411.jpg",
      "width": 1600, "height": 900, "time": 1791830651,
      "reason": "LEVEL_UP", "level": 5, "zone": "Dun Morogh", "subZone": "Kharanos", "mapID": 1426,
      "source": "export"
    }
  },
  "updatedAt": 1794063600
}
```

### `state` – wird bei jedem Lauf durch den Export ersetzt

Direkte Übernahme folgender Export-Gruppen unter ihrem Addon-Namen, unverändert:
`character`, `levels`, `levelSnapshots`, `gearByLevel`, `levelActivity`, `stats`, `afk`,
`statistics`, `iconic`, `camping`, `pvp` (ohne `history`), `goldByLevel`, `fun`, `gathering`,
`professions`, `firstVisitedZones`, `locationTime`, `zoneTime`, `social`, `playerTrades`,
`companions`, `services`, `tracking`, `combat`, `combatRecords` (falls vorhanden),
`journeyMeta` = `journey` ohne `segments`/`segmentGhost`.
Nie übernommen: `settings`.

Lua-Tabellen mit Zahlen-Schlüsseln (z. B. `levels[5]`) werden als JSON-Objekt mit String-Schlüsseln
(`"5"`) geschrieben. Lua-Arrays (1..n lückenlos) werden JSON-Arrays.

### `lists` – kumulativ, werden beim Lauf vereinigt

| Liste | Quelle im Export | Identität (Duplikat-Erkennung) | Sortierung |
|---|---|---|---|
| `events` | `data.events[]` | `(time, type)` | `time` |
| `sessions` | `data.sessions[]` | `startTime` | `startTime` |
| `journal` | `data.journal[]` | `(time, title)` | `time` |
| `screenshots` | `data.screenshots[]` | `expectedFileName`, sonst `time` | `time` |
| `dungeons` | `data.dungeons[]` | `entered` | `entered` |
| `worldDrops` | `data.worldDrops[]` | `(time, itemLink oder item)` | `time` |
| `journeySegments` | `data.journey.segments[]` | `(erstes t, mapID)` des Segments | erstes `t` |
| `journeyGhost` | `data.journey.segmentGhost[]` | parallel zu `journeySegments` (gleicher Index; fehlt → `false`) | wie oben |
| `pvpHistory` | `data.pvp.history[]` (falls vorhanden) | `time` | `time` |

Bei Duplikat gewinnt der **neue** Eintrag (Export) vollständig. `goldHistory` ist ein Objekt
mit Datums-Schlüssel; neue Schlüssel ergänzen, vorhandene werden ersetzt.
`journeySegments[i]` ist eine Liste von Punkten `[t, mapID, x, y, level]` (Reihenfolge aus
`journey.fields`).

### `shots`

Schlüssel = Original-Dateiname im WoW-Screenshot-Ordner. `source`: `"export"` (im Export
referenziert, Felder `reason`, `level`, `zone`, `subZone`, `mapID`, ggf. `portrait` aus dem
Eintrag) oder `"session"` (nur über das Session-Zeitfenster zugeordnet; `reason = "GAME"`).
Bilder aus `exclude.txt` fehlen hier und im Ordner.

## `data/exclude.txt`

Eine Zeile je Original-Dateiname (ohne Pfad), Zeilen mit `#` sind Kommentare. Gilt für alle
Charaktere.

## Bilddateien

`shots/<id>/<originalname>.jpg` (max. 1600 px breit, JPEG Qualität 80) und
`shots/<id>/t_<originalname>.jpg` (320 px breit). Die Erweiterung ist immer `.jpg`, auch wenn das
Original `.tga` oder `.png` war; der Schlüssel in `shots` behält den Originalnamen.
