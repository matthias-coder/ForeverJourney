# ForeverJourney – lokales Tool

Läuft unter Windows im Hintergrund (Tray-Symbol), beobachtet die `MyCharForever.lua`-Exporte
aller Charaktere eines Accounts, verkleinert neue Screenshots, schreibt die JSON-Daten ins Repo
und pusht sie nach GitHub.

## Einrichtung

Befehle ab Schritt 4 im Ordner `tool/`.

1. Python 3.12 oder neuer installieren: Installer von <https://www.python.org/downloads/>
   herunterladen und beim Start des Installers **„Add python.exe to PATH“** ankreuzen.
   Prüfen mit `python --version`.
2. Git installieren (<https://git-scm.com/download/win>) und einmalig deinen Namen und deine
   E-Mail-Adresse hinterlegen, sonst schlagen Commits fehl:
   ```powershell
   git config --global user.name "Dein Name"
   git config --global user.email "du@example.com"
   ```
3. Das GitHub-Repository klonen. `repo_dir` in der Konfiguration muss ein solcher Klon sein
   (mit `origin` und Upstream), kein bloßer Ordner:
   ```powershell
   git clone https://github.com/<benutzer>/foreverjourney.git C:\Users\DEIN_NAME\foreverjourney
   ```
   Der Klon steht auf dem Branch `main` (siehe Option `branch`).
4. Im Ordner `tool/` die virtuelle Umgebung anlegen und die Abhängigkeiten installieren:
   ```powershell
   python -m venv .venv
   .venv\Scripts\pip install -r requirements.txt
   ```
5. Konfiguration anlegen: `config.example.toml` nach `config.toml` kopieren und ausfüllen
   (`wow_dir`, `account`, `repo_dir`; optional `branch`, `site_url`). `config.toml` bleibt lokal
   und wird nicht eingecheckt. Mit `branch` (Standard `main`) legst du fest, auf welchem Branch
   veröffentlicht wird: Steht das Repo auf einem anderen Branch, committet und pusht das Tool
   nicht und meldet es im Log und per Benachrichtigung.
6. Git-Zugangsdaten einmalig hinterlegen, damit der Push ohne Rückfrage klappt:
   ```powershell
   gh auth login
   gh auth setup-git
   ```
7. Probelauf (einmal synchronisieren, Ausgabe auf der Konsole; Exit-Code 1 bei Fehlern,
   auch wenn der Push fehlgeschlagen ist, 2 bei fehlender oder ungültiger Konfiguration):
   ```powershell
   .venv\Scripts\python -m foreverjourney sync
   ```
8. Autostart einrichten:
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

Schlägt ein Push fehl (z. B. offline), bleibt der Commit lokal erhalten. Beim nächsten Lauf
(auch ohne neue Daten, z. B. über „Jetzt synchronisieren“) wird der ausstehende Push nachgeholt.

Ist das Remote weiter als dein lokales Repo (Push abgelehnt, „non-fast-forward“), meldet das Tool
„Remote divergiert“. Behebe es im Repo mit `git pull --rebase`. Fehlt der Upstream, einmalig
`git push -u origin main` ausführen.
