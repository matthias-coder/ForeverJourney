"""Build a character record from an addon export and merge records cumulatively."""
import copy
from typing import Callable

from .config import CharConfig
from .ids import char_id

STATE_KEYS: tuple[str, ...] = (
    "character", "levels", "levelSnapshots", "gearByLevel", "levelActivity", "stats",
    "afk", "statistics", "iconic", "camping", "pvp", "goldByLevel", "fun", "gathering",
    "professions", "firstVisitedZones", "locationTime", "zoneTime", "social",
    "playerTrades", "companions", "services", "tracking", "combat", "combatRecords",
    "journeyMeta",
)

# Paths (dotted, relative to state) whose tables are keyed by level: always JSON objects.
_LEVEL_KEYED = {
    "levels", "levelSnapshots", "gearByLevel", "levelActivity", "goldByLevel",
    "professions.byLevel", "tracking.time.byLevel", "afk.stationary.byLevel",
    "statistics.byLevel",
}


def _first_t(seg) -> object:
    return seg[0][0] if seg and seg[0] else 0


def _seg_identity(entry: dict) -> tuple:
    seg = entry["seg"]
    first = seg[0] if seg else []
    return (first[0] if first else None, first[1] if len(first) > 1 else None)


def _seg_sort(entry: dict) -> object:
    return _first_t(entry["seg"])


# list name -> (identity function, sort field); journeySegments is handled as a unit
# with journeyGhost (entries are {"seg": [...], "ghost": bool}).
LIST_SPECS: dict[str, tuple[Callable[[dict], object], str]] = {
    "events": (lambda e: (e.get("time"), e.get("type")), "time"),
    "sessions": (lambda e: e.get("startTime"), "startTime"),
    "journal": (lambda e: (e.get("time"), e.get("title")), "time"),
    "screenshots": (lambda e: e.get("expectedFileName") or e.get("time"), "time"),
    "dungeons": (lambda e: e.get("entered"), "entered"),
    "worldDrops": (lambda e: (e.get("time"), e.get("itemLink") or e.get("item")), "time"),
    "journeySegments": (_seg_identity, "t"),
    "pvpHistory": (lambda e: e.get("time"), "time"),
}


def _norm(value, path: str = ""):
    """Normalize Lua-parsed data: int keys -> str keys; level-keyed lists -> objects."""
    if isinstance(value, list):
        if path in _LEVEL_KEYED:
            return {str(i + 1): _norm(v, f"{path}.{i + 1}") for i, v in enumerate(value)}
        return [_norm(v, path + ".[]") for v in value]
    if isinstance(value, dict):
        return {str(k): _norm(v, f"{path}.{k}" if path else str(k)) for k, v in value.items()}
    return value


def _as_list(value) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, dict) and value:
        return [value[k] for k in sorted(value)]
    return []


def _flavor(meta: dict) -> str | None:
    client = meta.get("client")
    if isinstance(client, dict) and client.get("flavor"):
        return client["flavor"]
    build = meta.get("gameBuild")
    if isinstance(build, int):
        if build == 16001:
            return "forever"
        if 11000 <= build < 12000:
            return "era"
        if 20000 <= build < 30000:
            return "tbc"
    return None


def _ghost_flags(raw, n: int) -> list[bool]:
    if isinstance(raw, dict):
        return [bool(raw.get(i + 1, False)) for i in range(n)]
    raw = raw if isinstance(raw, list) else []
    return [bool(raw[i]) if i < len(raw) else False for i in range(n)]


def export_to_record(export: dict, char_cfg: CharConfig | None) -> dict:
    meta = copy.deepcopy(export["meta"])
    meta.pop("profileKey", None)
    meta["clientFlavor"] = _flavor(meta)
    data = export.get("data", {})
    cid = char_id(meta)

    state_src = {k: data[k] for k in STATE_KEYS if k in data and k != "journeyMeta"}
    pvp = data.get("pvp")
    if isinstance(pvp, dict):
        state_src["pvp"] = {k: v for k, v in pvp.items() if k != "history"}
    journey = data.get("journey")
    journey = journey if isinstance(journey, dict) else {}
    if journey:
        state_src["journeyMeta"] = {k: v for k, v in journey.items()
                                    if k not in ("segments", "segmentGhost")}
    state = _norm(state_src)

    segments = _as_list(journey.get("segments"))
    ghosts = _ghost_flags(journey.get("segmentGhost"), len(segments))
    lists = {name: _norm(_as_list(data.get(name)))
             for name in ("events", "sessions", "journal", "screenshots", "dungeons", "worldDrops")}
    lists["journeySegments"] = _norm(segments)
    lists["journeyGhost"] = ghosts
    lists["pvpHistory"] = _norm(_as_list(pvp.get("history"))) if isinstance(pvp, dict) else []

    cfg = char_cfg or CharConfig()
    return {
        "schemaVersion": 1,
        "id": cid,
        "meta": _norm(meta),
        "config": {"status": cfg.status, "mode": cfg.mode, "realmType": cfg.realm_type,
                   "realmName": cfg.realm_name, "armoryUrl": cfg.armory_url},
        "maps": _norm(export.get("maps", {})),
        "state": state,
        "lists": lists,
        "goldHistory": _norm(data.get("goldHistory", {})),
        "shots": {},
        "updatedAt": 0,
    }


def _union(old: list, new: list, spec: tuple[Callable[[dict], object], str]) -> list:
    ident, field = spec
    merged = {ident(e): e for e in old}
    merged.update({ident(e): e for e in new})
    return sorted(merged.values(), key=lambda e: (e.get(field) is None, e.get(field) or 0))


def _union_segments(old: dict, new: dict) -> tuple[list, list]:
    def pack(lists):
        segs = lists.get("journeySegments", [])
        ghosts = _ghost_flags(lists.get("journeyGhost"), len(segs))
        return [{"seg": s, "ghost": g} for s, g in zip(segs, ghosts)]

    merged = {_seg_identity(e): e for e in pack(old)}
    merged.update({_seg_identity(e): e for e in pack(new)})
    entries = sorted(merged.values(), key=_seg_sort)
    return [e["seg"] for e in entries], [e["ghost"] for e in entries]


def merge_records(existing: dict | None, fresh: dict) -> dict:
    if existing is None:
        return copy.deepcopy(fresh)
    if existing["id"] != fresh["id"]:
        raise ValueError(f"id mismatch: {existing['id']!r} != {fresh['id']!r}")
    out = copy.deepcopy(fresh)
    old_lists, new_lists = existing.get("lists", {}), fresh.get("lists", {})
    lists = {}
    for name, spec in LIST_SPECS.items():
        if name == "journeySegments":
            continue
        lists[name] = copy.deepcopy(_union(old_lists.get(name, []), new_lists.get(name, []), spec))
    segs, ghosts = _union_segments(old_lists, new_lists)
    lists["journeySegments"], lists["journeyGhost"] = copy.deepcopy(segs), ghosts
    out["lists"] = {k: lists[k] for k in ("events", "sessions", "journal", "screenshots",
                                          "dungeons", "worldDrops", "journeySegments",
                                          "journeyGhost", "pvpHistory")}
    out["goldHistory"] = {**existing.get("goldHistory", {}), **fresh.get("goldHistory", {})}
    out["shots"] = copy.deepcopy(existing.get("shots", {}))
    return out
