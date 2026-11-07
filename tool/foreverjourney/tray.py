"""System tray icon with the sync menu."""
import os
import threading
import webbrowser
from pathlib import Path

from .app import App
from .notify import windows_toast

TOOL_DIR = Path(__file__).resolve().parent.parent
ICON_PATH = TOOL_DIR / "icon.ico"
LOG_PATH = TOOL_DIR / "foreverjourney.log"


def run_tray(app: App, site_url: str | None) -> None:
    import pystray  # lazy: keeps tests free of the GUI dependency
    from PIL import Image

    def sync(icon=None, item=None):
        threading.Thread(target=app.run_sync, args=("tray",), daemon=True).start()

    def show_status(icon=None, item=None):
        windows_toast("ForeverJourney", app.last_status)

    def open_log(icon=None, item=None):
        if LOG_PATH.exists():
            os.startfile(LOG_PATH)

    def quit_app(icon, item=None):
        app.stop()
        icon.stop()

    items = [pystray.MenuItem("Jetzt synchronisieren", sync)]
    if site_url:
        items.append(pystray.MenuItem("Seite öffnen", lambda icon, item: webbrowser.open(site_url)))
    items += [
        pystray.MenuItem("Letzten Lauf anzeigen", show_status),
        pystray.MenuItem("Log öffnen", open_log),
        pystray.MenuItem("Beenden", quit_app),
    ]
    icon = pystray.Icon("ForeverJourney", Image.open(ICON_PATH), "ForeverJourney",
                        pystray.Menu(*items))
    app.start_watching()
    sync()  # catch up on changes made while the tool was not running
    icon.run()
