import re
import time
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

from .config import Config

_NAME_RE = re.compile(r"^WoWScrnShot_(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.\w+$")
_EXTS = {".jpg", ".jpeg", ".tga", ".png"}
_MARGIN = 60


@dataclass
class Candidate:
    name: str
    path: Path
    source: str
    meta: dict = field(default_factory=dict)


def read_exclude(path: Path) -> set[str]:
    if not path.exists():
        return set()
    out = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.add(line)
    return out


def screenshot_time(name: str) -> int | None:
    m = _NAME_RE.match(name)
    if not m:
        return None
    mo, d, y, hh, mi, ss = (int(x) for x in m.groups())
    try:
        return int(time.mktime((2000 + y, mo, d, hh, mi, ss, 0, 0, -1)))
    except (ValueError, OverflowError):
        return None


def select_candidates(record: dict, screenshot_dir: Path, exclude: set[str]) -> list[Candidate]:
    skip = set(record.get("shots") or {}) | set(exclude)
    lists = record.get("lists", {})
    out: list[Candidate] = []
    seen: set[str] = set()
    for e in lists.get("screenshots", []):
        name = e.get("expectedFileName")
        if not name:
            continue
        seen.add(name)
        p = screenshot_dir / name
        if name in skip or not p.is_file():
            continue
        meta = {k: e.get(k) for k in ("reason", "level", "zone", "subZone", "mapID", "time")}
        if e.get("portrait"):
            meta["portrait"] = e["portrait"]
        out.append(Candidate(name, p, "export", meta))
    sessions = lists.get("sessions", [])
    if sessions and screenshot_dir.is_dir():
        for p in sorted(screenshot_dir.iterdir()):
            name = p.name
            if name in skip or name in seen or p.suffix.lower() not in _EXTS or not p.is_file():
                continue
            t = screenshot_time(name)
            if t is None:
                continue
            for s in sessions:
                st, en = s.get("startTime"), s.get("endTime")
                if st is None or en is None:
                    continue
                if st - _MARGIN <= t <= en + _MARGIN:
                    out.append(Candidate(name, p, "session", {
                        "reason": "GAME", "level": s.get("levelStart"),
                        "zone": s.get("zoneStart"), "time": t}))
                    break
    return out


def process_image(src: Path, dest_dir: Path, name: str, max_width: int,
                  thumb_width: int, quality: int) -> tuple[Path, Path, int, int]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(name).stem
    with Image.open(src) as opened:
        im = opened.convert("RGB")
    if im.width > max_width:
        im = im.resize((max_width, max(1, round(im.height * max_width / im.width))), Image.LANCZOS)
    f = dest_dir / f"{stem}.jpg"
    im.save(f, "JPEG", quality=quality, optimize=True)
    tw = min(thumb_width, im.width)
    thumb = im.resize((tw, max(1, round(im.height * tw / im.width))), Image.LANCZOS)
    t = dest_dir / f"t_{stem}.jpg"
    thumb.save(t, "JPEG", quality=quality, optimize=True)
    return f, t, im.width, im.height


def apply_exclusions(record: dict, shots_dir: Path, exclude: set[str]) -> list[str]:
    shots = record.get("shots") or {}
    removed = []
    for name in [n for n in shots if n in exclude]:
        stem = Path(name).stem
        for fn in (f"{stem}.jpg", f"t_{stem}.jpg"):
            (shots_dir / fn).unlink(missing_ok=True)
        del shots[name]
        removed.append(name)
    return removed


def update_shots(record: dict, cfg: Config, repo_dir: Path, exclude: set[str]) -> list[str]:
    shots = record.setdefault("shots", {})
    rel = f"shots/{record['id']}"
    added = []
    for c in select_candidates(record, cfg.screenshot_dir, exclude):
        f, t, w, h = process_image(c.path, repo_dir / rel, c.name,
                                   cfg.max_width, cfg.thumb_width, cfg.jpeg_quality)
        entry = {"file": f"{rel}/{f.name}", "thumb": f"{rel}/{t.name}", "width": w, "height": h}
        entry.update(c.meta)
        entry["source"] = c.source
        shots[c.name] = entry
        added.append(c.name)
    return added
