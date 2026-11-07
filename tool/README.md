# ForeverJourney – lokales Tool

Läuft unter Windows im Hintergrund (Tray-Symbol), beobachtet die `MyCharForever.lua`-Exporte
aller Charaktere eines Accounts, verkleinert neue Screenshots, schreibt die JSON-Daten ins Repo
und pusht sie nach GitHub.

## Einrichtung

Alle Befehle im Ordner `tool/`.

1. Virtuelle Umgebung anlegen:
   ```powershell
   python -m venv .venv
   ```
2. Abhängigkeiten installieren:
   ```powershell
   .venv\Scripts\pip install -r requirements.txt
   ```
3. Konfiguration anlegen: `config.example.toml` nach `config.toml` kopieren und ausfüllen
   (`wow_dir`, `account`, `repo_dir`; optional `site_url`). `config.toml` bleibt lokal und
   wird nicht eingecheckt.
4. Git-Zugangsdaten einmalig hinterlegen, damit der Push ohne Rückfrage klappt:
   ```powershell
   gh auth login
   gh auth setup-git
   ```
5. Probelauf (einmal synchronisieren, Ausgabe auf der Konsole; Exit-Code 1 bei Fehlern,
   2 bei fehlender oder ungültiger Konfiguration):
   ```powershell
   .venv\Scripts\python -m foreverjourney sync
   ```
6. Autostart einrichten:
   ```powershell
   powershell -ExecutionPolicy Bypass -File install-autostart.ps1
   ```
   Entfernen mit `-Remove`. Das Tool startet danach mit Windows ohne Konsolenfenster.

Weitere Befehle: `python -m foreverjourney watch` (Beobachten in der Konsole, ohne Tray) und
`python -m foreverjourney tray` (Standard). Mit `--config <pfad>` lässt sich eine andere
Konfigurationsdatei verwenden.

Das Tray-Menü bietet „Jetzt synchronisieren“, „Seite öffnen“ (nur mit `site_url`),
„Letzten Lauf anzeigen“, „Log öffnen“ und „Beenden“. Fehler erscheinen nie als Dialog, nur als
Windows-Benachrichtigung und im Logfile.

## Bilder ausdünnen

Screenshots, die nicht veröffentlicht werden sollen, trägst du in `data/exclude.txt` im Repo
ein, ein Dateiname pro Zeile (z. B. `WoWScrnShot_010126_120000.jpg`). Zeilen mit `#` am Anfang
werden ignoriert. Beim nächsten Lauf werden diese Bilder nicht mehr verarbeitet.

## Charakter aufgeben

Ein Charakter, den du nicht mehr spielst, bekommt in `config.toml` den Status `retired`:

```toml
[characters."thorgrim-eisenbart"]
status = "retired"
```

Der Schlüssel ist die Charakter-ID aus Name und Realm, klein geschrieben und ohne Umlaute.
Mögliche Status: `active`, `resting`, `retired`, `fallen`. Mit `excluded_characters` lassen sich
Charaktere komplett ignorieren.

## Realm-Typ und Arsenal

Pro Charakter gibt es in `config.toml` optionale Felder:

| Feld | Werte |
|---|---|
| `realm_type` | `PvP`, `PvE`, `RP-PvP`, `RP-PvE` |
| `realm_name` | Anzeigename des Realms |
| `mode` | `normal`, `hardcore` |
| `armory_url` | Link zum Arsenal-Eintrag des Charakters |

## Logfile

`tool/foreverjourney.log` (rotierend, 1 MB, drei Sicherungen). Dort stehen Läufe, Warnungen
(z. B. Repo größer als 700 MB, fehlgeschlagener Push) und Fehler mit Details. Im Tray-Menü
öffnet „Log öffnen“ die Datei.

Schlägt ein Push fehl (z. B. offline), bleibt der Commit lokal erhalten und wird beim nächsten
erfolgreichen Lauf mit gepusht.
