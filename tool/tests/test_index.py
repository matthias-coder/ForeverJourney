from pathlib import Path
from foreverjourney.luaparse import load_export
from foreverjourney.merge import export_to_record
from foreverjourney.index import compute_status, summarize, build_index

FIX = Path(__file__).parent / "fixtures" / "MyCharForever.lua"
NOW = 1794063600

def rec(**cfg):
    r = export_to_record(load_export(FIX), None); r["shots"] = {}; r["config"].update(cfg); return r

def test_status_rules():
    assert compute_status(rec(), True, NOW) == "active"
    assert compute_status(rec(), True, NOW + 15 * 86400) == "resting"
    assert compute_status(rec(status="retired"), True, NOW) == "retired"
    assert compute_status(rec(status="fallen", mode="hardcore"), True, NOW) == "fallen"
    assert compute_status(rec(status="fallen"), True, NOW) == "active"      # fallen needs hardcore

def test_status_retired_when_export_missing():
    assert compute_status(rec(), False, NOW) == "retired"

def test_summarize_fields_and_portrait():
    r = rec(realmType="PvE", realmName="Ewigborn")
    s = summarize(r, True, NOW)
    assert (s["id"], s["file"], s["displayName"], s["class"], s["level"]) == ("thorgrim-eisenbart", "data/thorgrim-eisenbart.json", "Thorgrim Eisenbart", "WARRIOR", 3)
    assert s["playedSeconds"] == 7200 and s["deaths"] == 1 and s["lastSeen"] == 1793998860 and s["created"] == 1791792000
    assert s["portrait"] == {"kind": "none"}
    r["shots"]["WoWScrnShot_101226_210000.jpg"] = {"file": "shots/x/a.jpg", "thumb": "shots/x/t_a.jpg", "time": 1791831600, "reason": "PORTRAIT", "portrait": {"zoom": 1.6, "x": 50, "y": 30}}
    assert summarize(r, True, NOW)["portrait"] == {"kind": "shot", "file": "shots/x/a.jpg", "thumb": "shots/x/t_a.jpg", "crop": {"zoom": 1.6, "x": 50, "y": 30}}
    r["config"]["armoryUrl"] = "https://example/armory/x"
    assert summarize(r, True, NOW)["portrait"]["kind"] == "armory"

def test_display_name_prefers_meta_label():
    r = rec()
    r["meta"]["displayName"] = "Orkalla Ewigborn"
    assert summarize(r, True, NOW)["displayName"] == "Orkalla Ewigborn"

def test_build_index_order():
    a = rec(); b = rec(status="retired"); c = rec()
    c["lists"]["sessions"][0]["endTime"] = 1793908800; c["meta"]["exportedAt"] = 1793908800  # older than a
    idx = build_index([(b, True), (c, True), (a, True)], NOW)
    assert idx["schemaVersion"] == 1 and idx["generatedAt"] == NOW and idx["title"] == "Chronik der Ewigen"
    assert [x["status"] for x in idx["characters"]] == ["active", "active", "retired"]
    assert idx["characters"][0]["lastSeen"] >= idx["characters"][1]["lastSeen"]
