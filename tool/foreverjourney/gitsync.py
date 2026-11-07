"""Git synchronisation: commit and push data/ and shots/ with offline tolerance."""
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

TIMEOUT = 120
NOTHING_TO_COMMIT = "nothing to commit"


@dataclass
class SyncResult:
    committed: bool
    pushed: bool
    message: str


def _git(repo_dir: Path, *args: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    return subprocess.run(
        ["git", *args], cwd=repo_dir, capture_output=True, text=True,
        timeout=TIMEOUT, env=env,
    )


def _err(p: subprocess.CompletedProcess) -> str:
    return (p.stderr or p.stdout or "").strip() or f"git exited with {p.returncode}"


def commit_and_push(repo_dir: Path, message: str,
                    paths: list[str] = ["data", "shots"]) -> SyncResult:
    repo_dir = Path(repo_dir)
    existing = [p for p in paths if (repo_dir / p).exists()]
    if existing:
        add = _git(repo_dir, "add", "--", *existing)
        if add.returncode != 0:
            return SyncResult(False, False, f"git add failed: {_err(add)}")
    # Only our own paths with staged changes; foreign staged files stay out of the commit.
    staged = [p for p in existing
              if _git(repo_dir, "diff", "--cached", "--quiet", "--", p).returncode != 0]
    if not staged:
        return SyncResult(False, False, NOTHING_TO_COMMIT)
    commit = _git(repo_dir, "commit", "-m", message, "--", *staged)
    if commit.returncode != 0:
        return SyncResult(False, False, f"git commit failed: {_err(commit)}")
    try:
        push = _git(repo_dir, "push")
    except subprocess.TimeoutExpired:
        return SyncResult(True, False, f"git push timed out after {TIMEOUT} s")
    if push.returncode != 0:
        return SyncResult(True, False, f"git push failed: {_err(push)}")
    return SyncResult(True, True, "pushed")


def current_branch(repo_dir: Path) -> str | None:
    """Name of the checked-out branch, or None (detached HEAD, no repo, git error)."""
    try:
        p = _git(Path(repo_dir), "symbolic-ref", "--short", "-q", "HEAD")
    except (OSError, subprocess.TimeoutExpired):
        return None
    name = p.stdout.strip()
    return name if p.returncode == 0 and name else None


def push_pending(repo_dir: Path) -> SyncResult:
    """Push local commits that are ahead of the upstream (e.g. after an offline run)."""
    repo_dir = Path(repo_dir)
    ahead = _git(repo_dir, "rev-list", "--count", "@{u}..HEAD")
    if ahead.returncode != 0:
        return SyncResult(False, False, f"no upstream configured: {_err(ahead)}")
    if ahead.stdout.strip() == "0":
        return SyncResult(False, False, "nothing to push")
    try:
        push = _git(repo_dir, "push")
    except subprocess.TimeoutExpired:
        return SyncResult(False, False, f"git push timed out after {TIMEOUT} s")
    if push.returncode != 0:
        return SyncResult(False, False, f"git push failed: {_err(push)}")
    return SyncResult(False, True, "pushed")


def _dir_size(path: Path) -> int:
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


def repo_size_mb(repo_dir: Path) -> float:
    repo_dir = Path(repo_dir)
    return (_dir_size(repo_dir / ".git") + _dir_size(repo_dir / "shots")) / (1024 * 1024)


def check_credentials(repo_dir: Path) -> str | None:
    p = _git(Path(repo_dir), "config", "--get-all", "credential.helper")
    if p.returncode == 0 and p.stdout.strip():
        return None
    return ("Kein Git-Credential-Helper konfiguriert. Ohne gespeicherte Zugangsdaten "
            "schlaegt der Push fehl. Bitte einmalig 'gh auth setup-git' ausfuehren "
            "(nach 'gh auth login').")


def is_diverged(message: str) -> bool:
    low = message.lower()
    return "rejected" in low or "non-fast-forward" in low


DIVERGED_HINT = ("Das Remote-Repository ist weiter als dein lokales (divergiert). "
                 "Bitte im Repo 'git pull --rebase' ausfuehren, danach klappt der Push wieder.")


def no_upstream_hint(branch: str | None) -> str:
    return ("Kein Upstream-Branch konfiguriert, Push nicht moeglich. "
            f"Bitte einmalig 'git push -u origin {branch or 'main'}' ausfuehren.")


def commit_message(display_name: str, now: int) -> str:
    return f"chronicle: {display_name} {datetime.fromtimestamp(now).strftime('%Y-%m-%d')}"
