"""Application core: serialized sync runs, commit/push, status text and notifications."""
import logging
import threading
import time
from datetime import datetime
from typing import Callable

from .config import Config
from .gitsync import (DIVERGED_HINT, NOTHING_TO_COMMIT, check_credentials, commit_and_push,
                      commit_message, current_branch, is_diverged, no_upstream_hint,
                      push_pending, repo_size_mb)
from .pipeline import sync_all
from .watcher import ExportWatcher
from .wowproc import is_wow_running

SIZE_WARN_MB = 700
NO_CHANGES = "Keine Änderungen"
DEFERRED = "Sync aufgeschoben: WoW läuft"


def should_defer(cfg: Config, wow_running: bool, force: bool) -> bool:
    return cfg.defer_while_wow_running and wow_running and not force


def _shots(n: int) -> str:
    return "1 neues Bild" if n == 1 else f"{n} neue Bilder"


class App:
    def __init__(self, cfg: Config, notifier: Callable[[str, str], None], log: logging.Logger):
        self.cfg = cfg
        self._notify = notifier
        self._log = log
        self._lock = threading.Lock()
        self._watcher: ExportWatcher | None = None
        self.last_status = "Noch kein Lauf"
        self.had_error = False
        self._upstream_hinted = False
        self.deferred = False
        self._stop = threading.Event()
        self._defer_thread: threading.Thread | None = None

    def wait_idle(self) -> None:
        """Block until a running sync has finished."""
        with self._lock:
            pass

    def _toast(self, title: str, text: str) -> None:
        try:
            self._notify(title, text)
        except Exception:
            self._log.exception("notifier failed")

    def run_sync(self, reason: str, force: bool = False) -> str:
        if not force and self.cfg.defer_while_wow_running:
            if should_defer(self.cfg, is_wow_running(self.cfg.wow_process_names), force):
                self.deferred = True
                self._log.info(DEFERRED)
                self.last_status = DEFERRED
                return DEFERRED
        if force:
            self.deferred = False
        with self._lock:
            try:
                status = self._run(reason)
            except Exception as e:
                self._log.exception("sync failed (%s)", reason)
                self.had_error = True
                status = f"Fehler: {type(e).__name__}: {e}"
                self._toast("ForeverJourney: Fehler", status)
            self.last_status = status
            return status

    def _defer_tick(self) -> None:
        """Run the deferred sync once WoW has closed."""
        if self.deferred and not is_wow_running(self.cfg.wow_process_names):
            self.deferred = False
            self.run_sync("deferred", force=True)

    def _defer_loop(self) -> None:
        while not self._stop.wait(self.cfg.poll_seconds):
            try:
                self._defer_tick()
            except Exception:
                self._log.exception("defer loop failed")

    def _run(self, reason: str) -> str:
        now = int(time.time())
        self._log.info("sync started (%s)", reason)
        results, index_changed = sync_all(self.cfg, now)
        errors = [r for r in results if r.error]
        self.had_error = bool(errors)
        for r in errors:
            self._log.error("%s: %s", r.display_name, r.error)
        changed = [r for r in results if r.changed]
        parts: list[str] = []
        branch = current_branch(self.cfg.repo_dir)
        wrong_branch = branch != self.cfg.branch
        if wrong_branch:
            warn = (f"Chronik nicht veröffentlicht: Repo steht auf Branch {branch or '(keiner)'}, "
                    f"erwartet {self.cfg.branch}")
            self._log.warning(warn)
            parts.append(warn)
            self._toast("ForeverJourney: Chronik nicht veröffentlicht", warn)
        elif changed or index_changed:
            shots = sum(r.added_shots for r in changed)
            if not changed:
                msg = f"chronicle: Status {datetime.fromtimestamp(now):%Y-%m-%d}"
                head = "Status aktualisiert"
            elif len(changed) == 1:
                msg = commit_message(changed[0].display_name, now)
                head = f"{changed[0].display_name} aktualisiert"
            else:
                msg = f"chronicle: {len(changed)} Charaktere {datetime.fromtimestamp(now):%Y-%m-%d}"
                head = f"{len(changed)} Charaktere aktualisiert"
            if shots:
                head += f", {_shots(shots)}"
            res = commit_and_push(self.cfg.repo_dir, msg)
            if res.pushed:
                self._log.info("%s (pushed)", head)
                parts.append(head)
                self._toast("ForeverJourney", head)
            elif res.committed:
                self.had_error = True
                self._log.warning("push failed: %s", res.message)
                hint = self._push_hint(res.message, branch)
                parts.append(f"{head}, committed, Push fehlgeschlagen (später erneut)"
                             + (", Remote divergiert: git pull --rebase nötig"
                                if is_diverged(res.message) else ""))
                self._toast("ForeverJourney: Push fehlgeschlagen",
                            hint or "Änderungen sind committed und werden später erneut gepusht.")
            elif res.message != NOTHING_TO_COMMIT:
                self.had_error = True
                self._log.error("commit failed: %s", res.message)
                parts.append(f"{head}, aber Commit fehlgeschlagen: {res.message}")
                self._toast("ForeverJourney: Fehler", f"Commit fehlgeschlagen: {res.message}")
        if not parts:
            pending = push_pending(self.cfg.repo_dir)
            if pending.pushed:
                self._log.info("pending push done")
                parts.append("Keine Änderungen, ausstehender Push nachgeholt")
                self._toast("ForeverJourney", "Ausstehender Push nachgeholt")
            elif pending.message.startswith("no upstream"):
                hint = no_upstream_hint(branch)
                self._log.warning("%s (%s)", hint, pending.message)
                if not self._upstream_hinted:
                    self._upstream_hinted = True
                    self._toast("ForeverJourney: Push nicht möglich", hint)
            elif pending.message.startswith("git push"):
                self.had_error = True
                self._log.warning("pending push failed: %s", pending.message)
                if is_diverged(pending.message):
                    self._log.warning(DIVERGED_HINT)
                    parts.append("Push abgelehnt: Remote divergiert, bitte 'git pull --rebase' ausführen")
                    self._toast("ForeverJourney: Remote divergiert", DIVERGED_HINT)
                else:
                    parts.append("Keine Änderungen, Push weiterhin fehlgeschlagen (später erneut)")
            else:
                self._log.info("push_pending: %s", pending.message)
        for r in errors:
            parts.append(f"Fehler bei {r.display_name}: {r.error}")
        if errors:
            self._toast("ForeverJourney: Fehler",
                        "; ".join(f"{r.display_name}: {r.error}" for r in errors))
        size = repo_size_mb(self.cfg.repo_dir)
        if size > SIZE_WARN_MB:
            warn = (f"Repository ist {size:.0f} MB groß (Warnschwelle {SIZE_WARN_MB} MB), "
                    "bitte Bilder ausdünnen")
            self._log.warning(warn)
            parts.append(warn)
            self._toast("ForeverJourney: Repository wird groß", warn)
        return "; ".join(parts) if parts else NO_CHANGES

    def _push_hint(self, message: str, branch: str | None) -> str | None:
        """User-facing hint for a failed push (also logged); None if no specific cause is known."""
        if is_diverged(message):
            hint = DIVERGED_HINT
        elif "no upstream" in message.lower():
            hint = no_upstream_hint(branch)
            self._upstream_hinted = True
        else:
            hint = check_credentials(self.cfg.repo_dir)
        if hint:
            self._log.warning(hint)
        return hint

    def start_watching(self) -> None:
        if self._watcher is not None:
            return
        self._watcher = ExportWatcher(
            self.cfg.account_dir, lambda path: self.run_sync(f"watcher: {path.name}"),
            self.cfg.stable_seconds, self.cfg.poll_seconds)
        self._watcher.start()
        if self._defer_thread is None:
            self._stop.clear()
            self._defer_thread = threading.Thread(target=self._defer_loop, daemon=True)
            self._defer_thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._defer_thread = None
        if self._watcher is not None:
            self._watcher.stop()
            self._watcher = None
