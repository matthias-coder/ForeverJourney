# ForeverJourney – Design

Datum: 2026-11-07
Status: Entwurf zur Freigabe

## 1. Absicht

Matthias spielt World of Warcraft **Forever** (Classic-Variante, Interface 16001) und
möchte die komplette Reise jedes seiner Charaktere als öffentliches, automatisch gepflegtes
**Tagebuch im Stil eines klassischen Buches** auf GitHub Pages veröffentlichen.

Hinweis: Forever ist **kein Permadeath-Modus**. Das Addon zählt mehrere Tode je Charakter,
Geisterläufe und Rückkehr nach Pausen. Ein Charakter verschwindet also nur, wenn Matthias ihn
aufgibt oder löscht. Das Buch behält ihn trotzdem.

Die Rohdaten liefert das Addon **MyCharForever** (Autor: Devchris, CurseForge). Es zeichnet im
Spiel alles auf und schreibt beim Ausloggen oder `/reload` pro Charakter eine Export-Datei. Ein
lokales Tool auf dem Spiele-PC liest diese Dateien, bereitet sie auf und pusht sie in ein
GitHub-Repository. GitHub Pages rendert daraus das Buch.

**Warum:** Das Buch soll die Geschichte jedes Charakters bewahren und teilbar machen, ohne dass
nach jedem Spielabend Handarbeit nötig ist, und auch dann bestehen bleiben, wenn ein Charakter
aufgegeben wird oder das Addon alte Ereignisse verwirft.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele**
- Nach dem Ausloggen ist die Seite innerhalb weniger Minuten aktuell, ohne Klick.
- Mehrere Charaktere in einem Buch. Aufgegebene oder gelöschte Charaktere bleiben dauerhaft mit
  vollem Kapitel.
- Chronologisches Tagebuch pro Charakter plus Kategorien für besondere Aufzeichnungen.
- Fotoalbum-Charakter: Screenshots groß, Text knapp.
- Öffentlich lesbar, ohne Erklärung verständlich für Fremde.
- Sichtbare Credits an den Addon-Autor im Repo und auf der Seite.

**Nicht-Ziele (jetzt nicht)**
- Kein Nachbau der offiziellen MyCharForever-Webseite (Design, Texte, Grafiken sind dort
  ausdrücklich nicht freigegeben). ForeverJourney ist ein eigenständiges Tagebuch mit eigener Optik.
- Keine Unterstützung für andere Addons (Echoes of the Trail wurde geprüft und verworfen: manuelles
  Journal, kein dokumentiertes Format).
- Keine manuellen Tagebuch-Einträge über die Seite. Nur Daten aus dem Addon.
- Keine Mehrsprachigkeit. Seite und Texte auf Deutsch.
- Kein Server, keine Datenbank, kein Login.

**Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)**
- Der WoW-Account-Name (Ordnername unter `WTF/Account/`) oder andere Kontodaten landen im Repo.
- Das Repo wächst unkontrolliert, weil Screenshots in Originalgröße gepusht werden.
- Das Tool stört das Spiel (CPU-Last, Pop-ups, Fehlerdialoge während des Spielens).
- Ein halb geschriebener Export wird gepusht und zerstört ein Charakter-Kapitel.

## 3. Rahmenbedingungen

- **Spiele-PC:** Windows 11. WoW Forever liegt unter
  `C:\Program Files (x86)\World of Warcraft\_forever_\`. Addon unter `Interface\AddOns\MyCharForever`,
  Exportdaten unter `WTF\Account\<ACCOUNT>\<Realm>\<Char>\SavedVariables\MyCharForever.lua`,
  Screenshots unter `Screenshots\` (Format laut `meta.screenshotFormat`, meist `jpg`).
- **Datenquelle:** `MyCharForeverExportDB` (exportVersion 3). Vollständig dokumentiert in
  `Interface\AddOns\MyCharForever\docs\EXPORT_SCHEMA.md` – diese Datei ist die Referenz für den
  Builder und wird beim Bau gelesen. Die Rohvariable `MyCharForeverDB` wird **nicht** verwendet.
- **Lizenz-Hinweis des Autors:** Export-Format ist für eigene Auswertungen freigegeben; Webseite
  nicht zum Nachbau. Kontakt: wow@cinechris.de. Matthias schickt vor der Veröffentlichung eine kurze
  Info-Mail (seine Aufgabe, kein Blocker für den Bau).
- **GitHub:** Konto und Git sind vorhanden. Repo wird öffentlich sein.
- **Lebenszyklus der Daten:** Das Addon hält nur die letzten 2000 Ereignisse. Das Tool muss daher
  ältere Ereignisse selbst bewahren (siehe 5.2).

## 4. Erlebnis der Seite (entschieden)

Referenz: `2026-11-07-forever-journey-mockup.html` im selben Ordner (klickbarer Entwurf mit
erfundenen Daten; Optik und Übergänge sind abgenommen, Inhalte sind Platzhalter).

### 4.1 Grundform
- Ein aufgeschlagenes Buch, Doppelseite, Papieroptik, Serifenschrift, Einband in Leder und Gold.
  Dunkler Hintergrund („Tisch“).
- Seitentitel: **Chronik der Ewigen** (Arbeitstitel, Matthias kann ihn später ändern).
- Desktop ist die Hauptzielgröße. Auf schmalen Bildschirmen werden die zwei Seiten untereinander
  gezeigt, kein horizontales Scrollen.

### 4.2 Heldenregister (Startseite)
- Linke Seite: Vorwort (was das Buch ist, dass es automatisch entsteht) und Credits an Devchris /
  MyCharForever mit Link.
- Rechte Seite: alle Charaktere als Karten: Porträt, Name, Rasse, Klasse, aktuelles Level,
  Spielzeit, Anzahl Tode, Status (aktiv / rastet / aufgegeben), zuletzt gesehen.
  Aufgegebene Charaktere ausgegraut, bleiben klickbar.
- Porträt, in dieser Reihenfolge: (1) Charakter-Render aus dem offiziellen Blizzard-Arsenal für
  Forever (`https://worldofwarcraft.blizzard.com/de-de/forever/eu/armory`, Charaktere erscheinen
  dort ab Stufe 10), per URL eingebunden und **nicht** ins Repo kopiert (Blizzard-Bildmaterial);
  (2) der vom Addon ausgelöste Porträt-Screenshot (`reason = PORTRAIT`, mit Bildausschnitt
  `portrait.zoom/x/y`); (3) Platzhalter in Klassenfarbe mit Anfangsbuchstaben.
  Die Arsenal-Profil-URL je Charakter steht in der Konfiguration (5.4); wie der Render daraus
  ermittelt wird, ist Builder-Sache. Ist der Render nicht erreichbar, greift die Seite zur Laufzeit
  auf (2) bzw. (3) zurück.
- Jede Karte zeigt zusätzlich den **Realm-Typ** (PvP, PvE, RP-PvP, RP-PvE) als kleines Abzeichen.
  Das Addon exportiert ihn nicht (auf Forever steht im Realm-Feld der Nachname des Charakters),
  daher kommt er aus der Konfiguration je Charakter (5.4), ebenso ein Anzeigename des Realms.
- Status-Regel (Claudes Entscheidung): „aufgegeben“ nur per Konfiguration (siehe 5.4) oder wenn
  die Export-Datei des Charakters verschwindet (Charakter gelöscht) – das Kapitel bleibt dann aus
  dem Repo-Stand erhalten; „rastet“ wenn länger als 14 Tage nicht gespielt; sonst „aktiv“.
  Es gibt keinen Tod-Status, weil Tode in Forever nicht endgültig sind.
- **Vorsorge für Hardcore:** Blizzard könnte Forever später um einen Hardcore-Modus ergänzen.
  Das Datenmodell sieht deshalb je Charakter ein Feld `mode` (`normal` / `hardcore`) vor, zunächst
  aus der Konfiguration, später aus dem Export, falls das Addon es liefert. Nur im Modus
  `hardcore` ist der Status „gefallen“ erlaubt. Bauen muss der Builder für Hardcore jetzt nichts
  außer dem Feld und der Statusregel.

### 4.3 Übergänge
- **Char-Wechsel und Rückweg zum Register:** Buch klappt zu, der Einband zeigt eine Prägung
  (Charaktername bzw. „Chronik der Ewigen“ und das Ziel-Kapitel), kurze Pause, Buch klappt an der
  neuen Stelle auf. Gesamt etwa 2,5 s. Abgenommen im Entwurf.
- **Innerhalb eines Kapitels** (Inhaltsverzeichnis, Tagebuchseiten, Kategorien): nur weiches
  Überblenden. Eselsohren unten links/rechts blättern vor und zurück.
- Jede Doppelseite hat eine eigene URL (Hash oder Pfad), damit sich einzelne Seiten verlinken lassen.

### 4.4 Kapitel eines Charakters
Beginnt mit einer Doppelseite:
- Links: Steckbrief (Porträt groß, Name, Rasse, Klasse, Level, Status, Erschaffen am, Spielzeit,
  Tode, Verliese, Gold, besuchte Zonen, längstes Level mit AFK-Anteil, Gefährten, Erfolge).
- Rechts: **Inhaltsverzeichnis** mit Seitenzahlen:
  1. Tagebuch (unterteilt nach Monaten, jeweils mit Levelspanne)
  2. Fotogalerie
  3. Tode (und Beinahe-Tode)
  4. Levelaufstiege mit Ausrüstung
  5. Verliese und Beute
  6. Schatzkammer (Gold-Verlauf)
  7. Handwerk (Berufe und Sammeln)
  8. Gefährten
  9. Ikonische Momente und Erfolge
  10. Reiseroute (Karte)
  11. Unnütze Statistiken

### 4.5 Tagebuch
- Chronologisch nach Spieltag (lokale Zeit des Spielers, `meta.utcOffset`). Jeder Tag: Datum,
  Zonen, Spielzeit, dann kurze erzeugte Sätze zu den Ereignissen des Tages (Level-Ups, Tode,
  Verliese, Gildenereignisse, ikonische Momente, Erfolge, besondere Beute, Gold-Marken,
  Erstbesuche von Zonen) mit kleinen Markierungen je Typ.
- Screenshots des Tages erscheinen groß an ihrer zeitlichen Stelle („eingeklebtes Foto“ mit
  Bildunterschrift aus `reason`, Ort, Level). Fotoalbum vor Text: wenige Tage pro Doppelseite.
- Automatische Journal-Einträge des Addons (`journal[]` mit `auto = true`) werden als Zitatblock
  übernommen.
- Texterzeugung: deutsch, knapp, in der ersten Person („Stufe 10 erreicht. Zum ersten Mal mit
  Schild.“). Regelbasiert aus den Ereignistypen, keine KI zur Laufzeit.

### 4.6 Kategorien (Inhalt je Seite)
- **Fotogalerie:** alle Screenshots des Charakters in Zeitreihenfolge, Raster aus Vorschaubildern,
  Klick öffnet das große Bild mit Datum, Grund, Ort, Level.
- **Tode:** Tabelle je Tod (Datum, Level, Zone/Unterzone, Ursache aus `deathCauses` bzw.
  `levelActivity[].deaths[].cause`), dazu Karte mit Todesmarkierungen. Beinahe-Tode, falls das
  Schema sie liefert; sonst Abschnitt weglassen.
- **Levelaufstiege:** je Level Dauer, Ort, Zeitpunkt, AFK-Anteil und die Ausrüstung beim Abschluss
  (`levelSnapshots[].equipment`), Item-Namen mit Qualitätsfarbe.
- **Verliese:** je Lauf Name, Datum, Dauer, Bosse, Tode, vollendet ja/nein, Beuteliste.
- **Schatzkammer:** Gold-Verlauf als einfache Linie über die Zeit (`goldHistory`), Einnahmen und
  Ausgaben nach Kategorie je Level (`goldByLevel.src`).
- **Handwerk:** Berufe mit Skillverlauf je Level, gesammelte Ressourcen (`gathering`).
- **Gefährten:** Mitspieler aus `companions.people` mit Anzahl gemeinsamer Gruppen. Nur Spielernamen,
  keine Realm-/Kontodaten.
- **Ikonische Momente und Erfolge:** freigeschaltete Momente/Erfolge mit Datum, Level, Ort.
- **Reiseroute:** Laufweg aus `journey.segments` je Karte (`mapID`) als Linie, Geisterläufe in Blau,
  Level-Ups und Tode als Markierungen. Kartenhintergrund: siehe „Offen für den Builder“.
- **Unnütze Statistiken:** Werte aus `fun` (Sprünge, Emotes, Chat, volle Taschen usw.) als Liste.

### 4.7 Credits
- Im Heldenregister (Vorwort) und im Seitenfuß jeder Seite: „Daten aufgezeichnet mit dem Addon
  MyCharForever von Devchris“ mit CurseForge-Link.
- Im Repo: README-Abschnitt „Credits“ sowie Hinweis, dass ForeverJourney kein offizielles
  MyCharForever-Projekt ist.

## 5. Lokales Tool (entschieden)

### 5.1 Form
- **Python 3** (Claudes Wahl: Lua-Parsen und Bildverkleinerung sind dort einfach; Autostart unter
  Windows unkompliziert). Läuft als Hintergrundprozess mit Tray-Symbol, startet mit Windows.
- Beobachtet den `SavedVariables`-Pfad aller Charaktere des Accounts (Dateiwächter, Fallback:
  Abfrage alle 30 s). Reagiert auf Änderungen von `MyCharForever.lua`.
- Wartet nach einer Änderung, bis die Datei mindestens 5 s unverändert ist, und prüft, dass sie
  vollständig parsebar ist, bevor sie verarbeitet wird (Schutz gegen halb geschriebene Dateien).
- Tray-Menü: „Jetzt synchronisieren“, „Seite öffnen“, „Letzten Lauf anzeigen“, „Beenden“.
  Kurze Windows-Benachrichtigung nach erfolgreichem Push („Thorgrim aktualisiert, 3 neue Bilder“).
- Fehler erscheinen nie als blockierender Dialog, nur als Tray-Hinweis und im Logfile.

### 5.2 Verarbeitung
1. `MyCharForeverExportDB` aus der Lua-Datei parsen (eigener Lua-Table-Parser für die
   SavedVariables-Syntax; keine externe Lua-Laufzeit).
2. Nach `exportVersion` prüfen; unbekannte Version: Lauf abbrechen, Hinweis, nichts überschreiben.
3. In ein eigenes JSON je Charakter umwandeln (`data/<realm>/<char>.json` o. ä.; genaue Struktur ist
   Builder-Sache). Dabei **zusammenführen** mit dem bereits im Repo liegenden JSON, Regel
   (Claudes Entscheidung): **Jede Liste, die das Addon begrenzt oder ausdünnt, wird kumulativ
   bewahrt**: Ereignisse, Sessions, Screenshots, Journal, Verliese, PvP-Verlauf, Weltdrops und die
   Reiseroute (`journey.segments`, vereinigt nach Zeitstempel des ersten Punkts je Segment).
   Identität eines Eintrags = Zeitstempel plus Typ bzw. Schlüssel. Zähler und Zustände (Level,
   Gold, Statistiken, Berufe, Gefährten, Fun-Zähler) werden durch den neuen Export ersetzt, weil
   das Addon sie selbst kumulativ führt. Das Repo-JSON ist damit die Langzeit-Wahrheit, der Export
   nur der jüngste Stand.
4. Screenshots (Claudes Entscheidung zur Zuordnung): übernommen werden alle im Export
   referenzierten Dateien (`screenshots[].expectedFileName`) **und** alle Dateien im
   Screenshot-Ordner, deren Zeitstempel innerhalb einer Session dieses Charakters liegt
   (`sessions[].startTime..endTime`, plus 60 s Toleranz). Sessions verschiedener Charaktere
   überlappen nicht, die Zuordnung ist daher eindeutig. Bilder außerhalb jeder Session
   (Charakterauswahl, Ladebildschirm) werden ignoriert. Jedes Bild wird auf max. 1600 px Breite
   als JPEG mit Qualität 80 verkleinert (Ziel etwa 150–250 KB), dazu ein Vorschaubild von 320 px
   Breite. Originale bleiben unberührt. Bereits übernommene Bilder werden nicht erneut verarbeitet.
   Repo-Wachstum: das Tool zeigt die Repo-Größe im Tray und warnt ab 700 MB (GitHub empfiehlt
   unter 1 GB; Pages-Limit 1 GB). Dann ist Ausdünnen über `exclude.txt` oder eine kleinere
   Bildbreite in der Konfiguration der vorgesehene Weg.
5. Bilder, deren Dateiname in `exclude.txt` im Repo steht, werden entfernt bzw. nicht übernommen
   (späteres Ausdünnen ohne Git-Kenntnisse).
6. Ein Index aller Charaktere (`data/index.json`) wird aktualisiert.
7. `git add`, `git commit` („chronicle: <Char> <Datum>“), `git push`. Bei Push-Fehler (offline):
   lokal committen, beim nächsten Lauf erneut pushen.
   Authentifizierung: Matthias ist mit der GitHub-CLI (`gh`) per HTTPS angemeldet. Das Tool
   verlässt sich darauf, dass `gh auth setup-git` einmalig als Credential-Helper eingerichtet ist
   (Teil der Einrichtungsanleitung; der Builder prüft es beim ersten Lauf und gibt sonst einen
   Tray-Hinweis). Keine eigene Token-Verwaltung im Tool.

### 5.3 Was nie ins Repo darf
- Account-Name, Pfade des Spiele-PCs, `profileKey` aus `meta`, Rohvariable `MyCharForeverDB`,
  `settings` des Addons, Originale der Screenshots.
- Daten über andere Spieler (Claudes Entscheidung): Gefährten- und Gildennamen sind im Spiel
  öffentlich sichtbar und dürfen erscheinen, aber nur als Charaktername ohne Realm- oder
  Kontoangaben. Ein Schalter `show_companions` in der Konfiguration (Standard: an) blendet die
  Gefährten-Seite komplett aus. Chat-Inhalte werden nie exportiert (das Addon liefert nur Zähler).

### 5.4 Konfiguration
Eine Datei `config.toml` im Tool-Ordner: WoW-Pfad, Repo-Pfad, optionale Liste von Charakteren,
die ausgeschlossen sind, Bildgrößen, `show_companions`, und je Charakter optional:
Status-Übersteuerung (z. B. „aufgegeben“), `mode` (`normal`/`hardcore`), `realm_type`
(PvP/PvE/RP-PvP/RP-PvE), `realm_name` (Anzeige), `armory_url` (Profil im Blizzard-Arsenal). Beim ersten Start fragt das Tool die Pfade ab, wenn sie nicht gesetzt sind.

## 6. Repo und Hosting (entschieden)

- Ein öffentliches GitHub-Repo `ForeverJourney` (Name = Projektordner). Pages aus dem Branch `main`,
  **Root-Ordner** (Claudes Entscheidung: GitHub Pages erlaubt nur Root oder `/docs`, und `/docs`
  gehört den Design-Dokumenten). Keine Build-Pipeline und kein Build-Schritt: die Seite ist
  statisches HTML/CSS/JS ohne Framework und liest die JSON-Dateien und Bilder direkt. Dass dabei
  auch `docs/` und `tool/` über Pages erreichbar sind, ist unkritisch (alles ist ohnehin öffentlich).
- Struktur (Vorschlag, Builder darf anpassen):
  - `index.html`, `assets/` – Buch-Oberfläche im Root
  - `data/` – JSON je Charakter + Index, `exclude.txt`
  - `shots/<char>/` – verkleinerte Bilder und Vorschaubilder
  - `tool/` – Python-Tool mit `config.example.toml`, Autostart-Anleitung
  - `docs/superpowers/` – dieses Design, Pläne
  - `README.md` mit Zweck, Einrichtung, Credits
- Lizenz des eigenen Codes: MIT (Claudes Wahl). Gilt nicht für Addon-Daten oder Bilder.

## 7. Dem Builder überlassen

- Genaue JSON-Struktur und Dateinamen.
- Wie die Seitenumbrüche im Buch entstehen (fester Seitenrahmen, Inhalt wird in Seiten aufgeteilt;
  ein Tag darf sich über mehrere Seiten erstrecken).
- Kartenhintergrund für die Reiseroute und Todeskarte: bevorzugt eine freie, selbst gezeichnete
  oder schematische Zonenkarte; keine Blizzard-Kartengrafiken ins Repo kopieren. Falls kein
  brauchbarer Hintergrund machbar ist: Linie auf neutralem Grund mit Zonenname.
- Wie Porträt-Ausschnitte umgesetzt werden.
- Technik für Tray, Dateiwächter, Bildverkleinerung (Bibliotheken frei wählbar, aber ohne
  Installation außerhalb eines Python-Venv).
- Autostart-Mechanismus (Aufgabenplanung oder Autostart-Ordner).
- Teststrategie: Mindestens Parser und Zusammenführung müssen mit einer echten
  `MyCharForever.lua` getestet werden. Matthias liefert eine solche Datei, sobald er eine Sitzung
  gespielt hat; bis dahin dient `/mcf export write` im Spiel bzw. der Beispielcharakter des Addons
  (falls verfügbar) als Quelle.

## 8. Offene Punkte für Matthias

- Je Charakter Realm-Typ, Realm-Name und (ab Stufe 10) die Arsenal-URL in die Konfiguration eintragen.
- Mail an den Addon-Autor (Info über das Projekt) – vor dem ersten öffentlichen Push.
- Einmalig `gh auth setup-git` ausführen (Teil der Einrichtung).
- Endgültiger Seitentitel.

## 9. Entscheidungen von Claude nach dem Builder-Check (zum Gegenlesen)

- Kein Tod-Status; Status = aktiv / rastet / aufgegeben; Feld `mode` als Vorsorge für Hardcore (4.2).
- Porträt-Reihenfolge Arsenal-Render (nur verlinkt) → Addon-Porträt → Platzhalter; Realm-Typ aus
  der Konfiguration, weil das Addon ihn nicht liefert (4.2).
- Alle vom Addon begrenzten Listen werden im Repo kumulativ bewahrt, auch Reiseroute und Verliese (5.2).
- Screenshots werden per Session-Zeitfenster zugeordnet, Bilder außerhalb jeder Session ignoriert (5.2).
- Bildbreite 1600 px, Qualität 80, Warnung ab 700 MB Repo-Größe (5.2).
- Gefährten- und Gildennamen erscheinen, abschaltbar per `show_companions` (5.3).
- Push-Anmeldung über die GitHub-CLI als Credential-Helper (5.2).
- Pages aus dem Root des Repos (6).
