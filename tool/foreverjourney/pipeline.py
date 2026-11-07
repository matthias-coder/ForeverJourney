"""One sync run without git: export files -> repo data, shots and index."""
from __future__ import annotations

import json
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


def _ensure_exclude(data_dir: Path) -> Path:
    path = data_dir / "exclude.txt"
    if not path.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        path.write_text(EXCLUDE_HEADER, encoding="utf-8")
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
            target.write_text(_dump(record), encoding="utf-8")
        return CharResult(cid, name, changed, len(added), None)
    except Exception as e:  # one broken character must not stop the others
        return CharResult(cid, name, False, 0, f"{type(e).__name__}: {e}")


def sync_all(cfg: Config, now: int) -> list[CharResult]:
    data_dir = cfg.repo_dir / "data"
    results = [sync_character(p, cfg, now) for p in find_export_files(cfg)]
    exported = {r.id for r in results if r.id}
    records = []
    for p in sorted(data_dir.glob("*.json")) if data_dir.exists() else []:
        if p.name == "index.json":
            continue
        try:
            record = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        records.append((record, record.get("id", p.stem) in exported))
    if records or data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        _ensure_exclude(data_dir)
        index = build_index(records, now)
        (data_dir / "index.json").write_text(_dump(index), encoding="utf-8")
    return results
