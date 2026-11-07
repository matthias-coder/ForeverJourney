DAY = 86400
RESTING_AFTER = 14 * DAY
STATUS_RANK = {"active": 0, "resting": 1, "retired": 2, "fallen": 2}


def _last_seen(record: dict) -> int:
    sessions = record.get("lists", {}).get("sessions", [])
    ends = [s.get("endTime") or 0 for s in sessions]
    return max([*ends, record["meta"].get("exportedAt") or 0])


def compute_status(record: dict, export_present: bool, now: int) -> str:
    cfg = record["config"]
    if cfg.get("status") == "retired" or not export_present:
        return "retired"
    if cfg.get("mode") == "hardcore" and cfg.get("status") == "fallen":
        return "fallen"
    if now - _last_seen(record) > RESTING_AFTER:
        return "resting"
    return "active"


def _level(record: dict) -> int:
    return max((int(k) for k in record["state"].get("levels", {})), default=0)


def _played_seconds(record: dict) -> int:
    snapshots = record["state"].get("levelSnapshots", {}).values()
    largest_total = max((s.get("playedTotal") or 0 for s in snapshots), default=0)
    session_sum = sum(s.get("duration") or 0 for s in record.get("lists", {}).get("sessions", []))
    return max(largest_total, session_sum)


def _deaths(record: dict) -> int:
    return sum(len(a.get("deaths", [])) for a in record["state"].get("levelActivity", {}).values())


def _portrait(record: dict) -> dict:
    cfg = record["config"]
    if cfg.get("armoryUrl"):
        return {"kind": "armory", "url": cfg["armoryUrl"]}
    portraits = [s for s in record.get("shots", {}).values() if s.get("reason") == "PORTRAIT"]
    if portraits:
        newest = max(portraits, key=lambda s: s["time"])
        return {"kind": "shot", "file": newest["file"], "thumb": newest["thumb"],
                "crop": newest.get("portrait")}
    return {"kind": "none"}


def summarize(record: dict, export_present: bool, now: int) -> dict:
    meta = record["meta"]
    cfg = record["config"]
    return {
        "id": record["id"],
        "file": f"data/{record['id']}.json",
        "name": meta["name"],
        "surname": meta["realm"],
        "displayName": meta.get("displayName") or f"{meta['name']} {meta['realm']}",
        "class": meta["class"],
        "race": meta["race"],
        "faction": meta["faction"],
        "level": _level(record),
        "status": compute_status(record, export_present, now),
        "mode": cfg["mode"],
        "realmType": cfg["realmType"],
        "realmName": cfg["realmName"],
        "armoryUrl": cfg["armoryUrl"],
        "portrait": _portrait(record),
        "playedSeconds": _played_seconds(record),
        "deaths": _deaths(record),
        "created": record["state"]["character"]["created"],
        "lastSeen": _last_seen(record),
    }


def build_index(records: list[tuple[dict, bool]], now: int, title: str = "Chronik der Ewigen") -> dict:
    entries = [summarize(rec, present, now) for rec, present in records]
    entries.sort(key=lambda e: e["lastSeen"], reverse=True)
    entries.sort(key=lambda e: STATUS_RANK[e["status"]])
    return {"schemaVersion": 1, "generatedAt": now, "title": title, "characters": entries}
