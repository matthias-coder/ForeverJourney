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

def test_run_sync_reports_push_failure_and_keeps_commit(tmp_path):
    cfg = setup(tmp_path); toasts = []
    git(cfg.repo_dir, "remote", "set-url", "origin", str(tmp_path / "missing.git"))
    app = App(cfg, notifier=lambda t, x: toasts.append((t, x)), log=logging.getLogger("t"))
    msg = app.run_sync("test")
    assert "Push fehlgeschlagen" in msg and "committed" in msg
    log = subprocess.run(["git", "log", "--oneline"], cwd=cfg.repo_dir, capture_output=True, text=True).stdout
    assert "chronicle: Thorgrim Eisenbart" in log
