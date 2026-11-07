"""One sync run without git: export files -> repo data, shots and index."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from .config import Config, find_export_files
from .ids import char_id
from .index import build_index
from .luaparse import load_export
from .merge import export_to_record, merge_records
from .shots import apply_exclusions, read_exclude, update_shots

EXPORT_VERSION = 3
EXCLUDE_HEADER = (
    "# Screenshots, die nicht veroeffentlicht werden sollen.\n"
    "# Ein Dateiname pro Zeile (z. B. WoWScrnShot_010126_120000.jpg).\n"
    "# Zeilen mit # am Anfang werden ignoriert.\n"
)


@dataclass
class CharResult:
    id: str
    display_name: str
    changed: bool
    added_shots: int
    error: str | None


def _dump(record: dict) -> str:
    return json.dumps(record, indent=1, ensure_ascii=False, sort_keys=True)


def _without_updated(record: dict) -> dict:
    return {k: v for k, v in record.items() if k != "updatedAt"}


def _without_generated(index: dict) -> dict:
    return {k: v for k, v in index.items() if k != "generatedAt"}


def _write(path: Path, text: str) -> None:
    tmp = path.with_name(path.name + ".tmp")
    try:
        with open(tmp, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        os.replace(tmp, path)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def _ensure_exclude(data_dir: Path) -> Path:
    path = data_dir / "exclude.txt"
    if not path.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        _write(path, EXCLUDE_HEADER)
    return path


def sync_character(lua_path: Path, cfg: Config, now: int) -> CharResult:
    cid, name = "", ""
    try:
        export = load_export(lua_path)
        if export.get("exportVersion") != EXPORT_VERSION:
            return CharResult("", "", False, 0,
                              f"unsupported exportVersion {export.get('exportVersion')!r} "
                              f"(expected {EXPORT_VERSION})")
        cid = char_id(export["meta"])
        name = export["meta"].get("displayName") or cid
        if cid in cfg.excluded_characters:
            return CharResult(cid, name, False, 0, None)

        data_dir = cfg.repo_dir / "data"
        target = data_dir / f"{cid}.json"
        existing = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None
        fresh = export_to_record(export, cfg.characters.get(cid))
        record = merge_records(existing, fresh)
        exclude = read_exclude(data_dir / "exclude.txt")
        added = update_shots(record, cfg, cfg.repo_dir, exclude)
        apply_exclusions(record, cfg.repo_dir / "shots" / cid, exclude)
        if not cfg.show_companions:
            record.get("state", {}).pop("companions", None)

        record["updatedAt"] = existing.get("updatedAt", now) if existing else now
        changed = existing is None or bool(added) or \
            _dump(_without_updated(record)) != _dump(_without_updated(existing))
        if changed:
            record["updatedAt"] = now
            data_dir.mkdir(parents=True, exist_ok=True)
            _write(target, _dump(record))
        return CharResult(cid, name, changed, len(added), None)
    except Exception as e:  # one broken character must not stop the others
        return CharResult(cid, name, False, 0, f"{type(e).__name__}: {e}")


def sync_all(cfg: Config, now: int) -> tuple[list[CharResult], bool]:
    """Returns (results, index_changed); index_changed ignores the generatedAt timestamp."""
    data_dir = cfg.repo_dir / "data"
    results = [sync_character(p, cfg, now) for p in find_export_files(cfg)]
    exported = {r.id for r in results if r.id}
    # An export that failed without an id may belong to any record: no retirement decision then.
    unknown_failure = any(r.error and not r.id for r in results)
    records = []
    index_changed = False
    for p in sorted(data_dir.glob("*.json")) if data_dir.exists() else []:
        if p.name == "index.json":
            continue
        try:
            record = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            results.append(CharResult(p.stem, p.stem, False, 0, f"unreadable data file: {e}"))
            continue
        if not isinstance(record, dict):
            results.append(CharResult(p.stem, p.stem, False, 0, "data file is not a JSON object"))
            continue
        present = unknown_failure or record.get("id", p.stem) in exported
        records.append((record, present))
    if records or data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        _ensure_exclude(data_dir)
        index = build_index(records, now)
        target = data_dir / "index.json"
        try:
            old = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None
        except (OSError, ValueError):
            old = None
        if not isinstance(old, dict) or _without_generated(old) != _without_generated(index):
            _write(target, _dump(index))
            index_changed = True
    return results, index_changed
