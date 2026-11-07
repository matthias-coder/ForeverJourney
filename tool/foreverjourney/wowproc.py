"""Detect a running WoW client via tasklist (Windows)."""
import csv
import io
import logging
import subprocess
import sys

_log = logging.getLogger("foreverjourney")


def is_wow_running(names: list[str], run=subprocess.run) -> bool:
    """True if any process image name in `names` is running. Any error -> False."""
    try:
        kwargs = {}
        if sys.platform == "win32":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
        proc = run(["tasklist", "/FO", "CSV", "/NH"], capture_output=True, text=True, errors="replace",
                   timeout=10, **kwargs)
        if proc.returncode != 0:
            _log.debug("tasklist exited with %s", proc.returncode)
            return False
        wanted = {n.lower() for n in names}
        return any(row and row[0].lower() in wanted
                   for row in csv.reader(io.StringIO(proc.stdout)))
    except Exception as e:
        _log.debug("tasklist failed: %s", e)
        return False
