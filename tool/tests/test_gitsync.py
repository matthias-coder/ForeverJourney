import subprocess
from pathlib import Path
from foreverjourney.gitsync import commit_and_push, repo_size_mb, commit_message, check_credentials

def git(cwd, *a): return subprocess.run(["git", *a], cwd=cwd, check=True, capture_output=True, text=True).stdout

def make_repos(tmp_path):
    bare = tmp_path / "remote.git"; git(tmp_path, "init", "--bare", "-q", str(bare))
    work = tmp_path / "work"; work.mkdir(); git(work, "init", "-q", "-b", "main")
    git(work, "config", "user.email", "t@t"); git(work, "config", "user.name", "t")
    git(work, "remote", "add", "origin", str(bare))
    (work / "README.md").write_text("x"); git(work, "add", "."); git(work, "commit", "-q", "-m", "init"); git(work, "push", "-q", "-u", "origin", "main")
    return work, bare

def test_commit_message_format():
    assert commit_message("Thorgrim Eisenbart", 1793998860).startswith("chronicle: Thorgrim Eisenbart 2026-11-")

def test_nothing_to_commit(tmp_path):
    work, _ = make_repos(tmp_path)
    r = commit_and_push(work, "chronicle: x")
    assert r.committed is False and r.pushed is False

def test_commit_and_push(tmp_path):
    work, bare = make_repos(tmp_path)
    (work / "data").mkdir(); (work / "data" / "index.json").write_text("{}")
    r = commit_and_push(work, "chronicle: Thorgrim 2026-11-07")
    assert r.committed and r.pushed
    assert "chronicle: Thorgrim" in git(bare, "log", "--oneline", "-1", "main")

def test_push_failure_keeps_commit(tmp_path):
    work, _ = make_repos(tmp_path)
    git(work, "remote", "set-url", "origin", str(tmp_path / "does-not-exist.git"))
    (work / "data").mkdir(); (work / "data" / "index.json").write_text("{}")
    r = commit_and_push(work, "chronicle: x")
    assert r.committed and not r.pushed and r.message
    assert "chronicle: x" in git(work, "log", "--oneline", "-1")

def test_repo_size_mb(tmp_path):
    work, _ = make_repos(tmp_path)
    assert repo_size_mb(work) > 0

def test_check_credentials_hint_and_none(tmp_path, monkeypatch):
    work, _ = make_repos(tmp_path)
    monkeypatch.setenv("GIT_CONFIG_NOSYSTEM", "1")
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", str(tmp_path / "nonexistent-gitconfig"))
    hint = check_credentials(work)
    assert hint and "gh auth setup-git" in hint
    git(work, "config", "credential.helper", "store")
    assert check_credentials(work) is None
