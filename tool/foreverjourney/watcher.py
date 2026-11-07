"""Watch for finished writes of MyCharForever.lua (quiet period before firing)."""
from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Callable

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

TARGET_NAME = "MyCharForever.lua"
log = logging.getLogger("foreverjourney.watcher")


class _Handler(FileSystemEventHandler):
    def __init__(self, observe: Callable[[Path], None]):
        self._observe = observe

    def on_any_event(self, event):
        if event.is_directory:
            return
        for raw in (getattr(event, "src_path", None), getattr(event, "dest_path", None)):
            if raw and Path(raw).name == TARGET_NAME:
                self._observe(Path(raw))


class ExportWatcher:
    def __init__(self, account_dir: Path, on_stable: Callable[[Path], None],
                 stable_seconds: float, poll_seconds: float, use_events: bool = True):
        self._dir = Path(account_dir)
        self._on_stable = on_stable
        self._stable = stable_seconds
        self._poll = poll_seconds
        self._use_events = use_events
        self._interval = min(stable_seconds / 2, poll_seconds)
        self._lock = threading.Lock()
        # path -> (size, mtime_ns, last_change_monotonic); pending = not yet fired
        self._state: dict[Path, tuple[int, int, float]] = {}
        self._pending: set[Path] = set()
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []
        self._observer = None

    def _observe(self, path: Path, baseline: bool = False) -> None:
        try:
            st = path.stat()
        except OSError:
            with self._lock:
                self._state.pop(path, None)
                self._pending.discard(path)
            return
        sig = (st.st_size, st.st_mtime_ns)
        with self._lock:
            old = self._state.get(path)
            if old is not None and old[:2] == sig:
                return
            self._state[path] = (*sig, time.monotonic())
            if not baseline:
                self._pending.add(path)

    def _scan(self, baseline: bool = False) -> None:
        for path in self._dir.rglob(TARGET_NAME):
            self._observe(path, baseline)

    def _poll_loop(self) -> None:
        while not self._stop.wait(self._poll):
            try:
                self._scan()
            except Exception:
                log.exception("poll scan failed")

    def _check_loop(self) -> None:
        while not self._stop.wait(self._interval):
            now = time.monotonic()
            with self._lock:
                due = [p for p in self._pending if now - self._state[p][2] >= self._stable]
                self._pending.difference_update(due)
            for path in due:
                try:
                    self._on_stable(path)
                except Exception:
                    log.exception("on_stable failed for %s", path)

    def start(self) -> None:
        self._stop.clear()
        self._scan(baseline=True)
        if self._use_events:
            self._observer = Observer()
            self._observer.schedule(_Handler(self._observe), str(self._dir), recursive=True)
            self._observer.daemon = True
            self._observer.start()
        for target in (self._poll_loop, self._check_loop):
            t = threading.Thread(target=target, daemon=True)
            t.start()
            self._threads.append(t)

    def stop(self) -> None:
        self._stop.set()
        if self._observer is not None:
            self._observer.stop()
            self._observer.join(timeout=2)
            self._observer = None
        for t in self._threads:
            t.join(timeout=2)
        self._threads.clear()
