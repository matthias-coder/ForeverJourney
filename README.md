# ForeverJourney

ForeverJourney ist eine Buch-Website, die die Reise meiner World-of-Warcraft-Charaktere
festhält: ein Heldenregister, je Charakter Kapitel, Tagebuch und Bilder. Die Seite ist
statisches HTML/CSS/JS ohne Build-Schritt und liest die JSON-Daten und Bilder direkt aus
diesem Repo. Ein kleines lokales Tool hält die Daten aktuell.

**Seite:** https://matthias-coder.github.io/ForeverJourney/

## Aufbau des Repos

| Pfad | Inhalt |
|---|---|
| `index.html`, `assets/` | Buch-Oberfläche (GitHub Pages, Root des Branches `main`) |
| `data/` | JSON je Charakter, Index, `exclude.txt` |
| `shots/<char>/` | verkleinerte Bilder und Vorschaubilder |
| `tool/` | Python-Tool für Windows (Tray, Sync, Autostart), siehe [tool/README.md](tool/README.md) |
| `docs/superpowers/` | Design-Dokument und Pläne |

## Seite lokal ansehen

Vom Repo-Root aus einen statischen Server starten und die Seite im Browser öffnen:

```bash
python -m http.server 8080
# danach im Browser: http://localhost:8080/#/
```

Die Tests der Seite laufen mit Node (ohne Abhängigkeiten):

```bash
node --test "tests/site/*.test.mjs"
```

## Einrichtung des Tools

Siehe [tool/README.md](tool/README.md).

## Credits

Alle Spieldaten werden vom Addon MyCharForever von Devchris aufgezeichnet
([CurseForge](https://www.curseforge.com/wow/addons/mycharforever-an-automatic-character-chronicle)). ForeverJourney ist ein
unabhängiges Projekt und kein offizieller Teil von MyCharForever. Das Export-Format wird mit
freundlicher Dokumentation des Autors genutzt.

## Lizenz

Der eigene Code steht unter der MIT-Lizenz (siehe [LICENSE](LICENSE)). Sie gilt nicht für
Addon-Daten und Bilder.
