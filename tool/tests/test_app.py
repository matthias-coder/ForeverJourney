import logging, shutil, subprocess
from pathlib import Path
from foreverjourney.config import load_config
from foreverjourney.app import App

FIX = Path(__file__).parent / "fixtures" / "MyCharForever.lua"

def git(cwd, *a): subprocess.run(["git", *a], cwd=cwd, check=True, capture_output=True)

def setup(tmp_path):
    bare = tmp_path / "remote.git"; git(tmp_path, "init", "--bare", "-q", str(bare))
    repo = tmp_path / "repo"; repo.mkdir(); git(repo, "init", "-q", "-b", "main"); git(repo, "config", "user.email", "t@t"); git(repo, "config", "user.name", "t")
    git(repo, "remote", "add", "origin", str(bare)); (repo / "README.md").write_text("x"); git(repo, "add", "."); git(repo, "commit", "-q", "-m", "init"); git(repo, "push", "-q", "-u", "origin", "main")
    cfg = load_config((lambda p: (p.write_text(f'wow_dir = "{tmp_path.as_posix()}/wow"\naccount = "A"\nrepo_dir = "{repo.as_posix()}"\n', encoding="utf-8"), p)[1])(tmp_path / "c.toml"))
    sv = cfg.account_dir / "Eisenbart" / "Thorgrim" / "SavedVariables"; sv.mkdir(parents=True); shutil.copy(FIX, sv / "MyCharForever.lua"); cfg.screenshot_dir.mkdir()
    return cfg

def test_run_sync_reports_and_notifies(tmp_path):
    cfg = setup(tmp_path); toasts = []
    app = App(cfg, notifier=lambda t, x: toasts.append((t, x)), log=logging.getLogger("t"))
    msg = app.run_sync("test")
    assert "Thorgrim Eisenbart" in msg and toasts and app.last_status == msg
    assert app.run_sync("test") == "Keine Änderungen"

def test_run_sync_never_raises_on_bad_config_paths(tmp_path):
    cfg = setup(tmp_path); cfg.account_dir = tmp_path / "nope"
    app = App(cfg, notifier=lambda t, x: None, log=logging.getLogger("t"))
    assert isinstance(app.run_sync("test"), str)

def test_run_sync_survives_internal_exception(tmp_path, monkeypatch):
    cfg = setup(tmp_path); toasts = []
    def boom(*a, **k): raise RuntimeError("kaputt")
    monkeypatch.setattr("foreverjourney.app.sync_all", boom)
    app = App(cfg, notifier=lambda t, x: toasts.append((t, x)), log=logging.getLogger("t"))
    assert app.run_sync("test").startswith("Fehler") and app.had_error and toasts

def test_pending_push_is_retried_without_new_data(tmp_path):
    cfg = setup(tmp_path); bare = tmp_path / "remote.git"
    git(cfg.repo_dir, "remote", "set-url", "origin", str(tmp_path / "missing.git"))
    app = App(cfg, notifier=lambda t, x: None, log=logging.getLogger("t"))
    assert "Push fehlgeschlagen" in app.run_sync("test")
    assert "Push weiterhin fehlgeschlagen" in app.run_sync("test")
    git(cfg.repo_dir, "remote", "set-url", "origin", str(bare))
    msg = app.run_sync("test")
    assert "nachgeholt" in msg and not app.had_error
    log = subprocess.run(["git", "log", "--oneline", "main"], cwd=bare, capture_output=True, text=True).stdout
    assert "chronicle: Thorgrim Eisenbart" in log
    assert app.run_sync("test") == "Keine Änderungen"

def test_run_sync_reports_push_failure_and_keeps_commit(tmp_path):
    cfg = setup(tmp_path); toasts = []
    git(cfg.repo_dir, "remote", "set-url", "origin", str(tmp_path / "missing.git"))
    app = App(cfg, notifier=lambda t, x: toasts.append((t, x)), log=logging.getLogger("t"))
    msg = app.run_sync("test")
    assert "Push fehlgeschlagen" in msg and "committed" in msg
    log = subprocess.run(["git", "log", "--oneline"], cwd=cfg.repo_dir, capture_output=True, text=True).stdout
    assert "chronicle: Thorgrim Eisenbart" in log

def bare_log(tmp_path):
    return subprocess.run(["git", "log", "--oneline", "main"], cwd=tmp_path / "remote.git", capture_output=True, text=True).stdout

def test_index_only_change_is_committed_and_pushed(tmp_path):
    cfg = setup(tmp_path)
    app = App(cfg, notifier=lambda t, x: None, log=logging.getLogger("t"))
    app.run_sync("test")
    next((cfg.account_dir).glob("*/*/SavedVariables/MyCharForever.lua")).unlink()
    msg = app.run_sync("test")
    assert "Status aktualisiert" in msg and not app.had_error
    assert "chronicle: Status " in bare_log(tmp_path)
    assert app.run_sync("test") == "Keine Änderungen"

def test_wrong_branch_skips_commit(tmp_path):
    cfg = setup(tmp_path); toasts = []
    git(cfg.repo_dir, "checkout", "-q", "-b", "feature")
    app = App(cfg, notifier=lambda t, x: toasts.append((t, x)), log=logging.getLogger("t"))
    msg = app.run_sync("test")
    assert "Chronik nicht veröffentlicht" in msg and "feature" in msg and "main" in msg
    assert not app.had_error and toasts
    assert "chronicle:" not in bare_log(tmp_path)
    log = subprocess.run(["git", "log", "--oneline"], cwd=cfg.repo_dir, capture_output=True, text=True).stdout
    assert "chronicle:" not in log

def test_diverged_remote_names_pull_rebase(tmp_path):
    cfg = setup(tmp_path); toasts = []
    other = tmp_path / "other"; git(tmp_path, "clone", "-q", "-b", "main", str(tmp_path / "remote.git"), str(other))
    git(other, "config", "user.email", "o@o"); git(other, "config", "user.name", "o")
    (other / "o.txt").write_text("o"); git(other, "add", "."); git(other, "commit", "-q", "-m", "o"); git(other, "push", "-q")
    app = App(cfg, notifier=lambda t, x: toasts.append((t, x)), log=logging.getLogger("t"))
    msg = app.run_sync("test")
    assert "git pull --rebase" in msg and app.had_error
    assert any("git pull --rebase" in x for _, x in toasts)

def test_no_upstream_hint_shown_once(tmp_path):
    cfg = setup(tmp_path); toasts = []
    git(cfg.repo_dir, "branch", "--unset-upstream")
    app = App(cfg, notifier=lambda t, x: toasts.append((t, x)), log=logging.getLogger("t"))
    app.run_sync("test"); app.run_sync("test"); app.run_sync("test")
    hints = [x for _, x in toasts if "git push -u origin main" in x]
    assert len(hints) == 1

def test_wait_idle_blocks_while_running(tmp_path):
    import threading, time
    cfg = setup(tmp_path)
    app = App(cfg, notifier=lambda t, x: None, log=logging.getLogger("t"))
    app._lock.acquire()
    done = threading.Event()
    threading.Thread(target=lambda: (app.wait_idle(), done.set()), daemon=True).start()
    time.sleep(0.2); assert not done.is_set()
    app._lock.release(); assert done.wait(2)
