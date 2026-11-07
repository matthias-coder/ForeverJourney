import copy
from pathlib import Path
from foreverjourney.luaparse import load_export
from foreverjourney.merge import export_to_record, merge_records

FIX = Path(__file__).parent / "fixtures" / "MyCharForever.lua"

def fresh():
    return export_to_record(load_export(FIX), None)

def test_record_shape_and_privacy():
    r = fresh()
    assert r["schemaVersion"] == 1 and r["id"] == "thorgrim-eisenbart"
    assert "profileKey" not in r["meta"] and r["meta"]["clientFlavor"] == "forever"
    assert "settings" not in r["state"]
    assert r["state"]["levels"]["3"]["duration"] >= 0          # numeric keys → strings
    assert [e["type"] for e in r["lists"]["events"]] == ["LOGIN", "LEVEL_UP", "DEATH", "LOGOUT"]
    assert r["lists"]["journeySegments"][0][0] == [1791830400, 1426, 0.4, 0.5, 1]
    assert r["lists"]["journeyGhost"] == [False]
    assert r["config"] == {"status": None, "mode": "normal", "realmType": None, "realmName": None, "armoryUrl": None}

def test_merge_keeps_events_dropped_by_addon():
    old = fresh()
    new = fresh()
    new["lists"]["events"] = new["lists"]["events"][2:] + [{"time": 1793556000, "type": "LOGIN"}]
    m = merge_records(old, new)
    assert [e["time"] for e in m["lists"]["events"]] == [1791830400, 1791830651, 1791831200, 1791834000, 1793556000]

def test_merge_new_wins_on_duplicate_and_state_replaced():
    old = fresh(); new = copy.deepcopy(old)
    new["lists"]["sessions"][0]["duration"] = 999
    new["state"]["levelSnapshots"]["2"]["money"] = 1
    old["goldHistory"]["2020-01-01"] = {"first": 1}
    m = merge_records(old, new)
    assert m["lists"]["sessions"][0]["duration"] == 999 and len(m["lists"]["sessions"]) == 1
    assert m["state"]["levelSnapshots"]["2"]["money"] == 1
    assert set(m["goldHistory"]) == {"2026-10-12", "2020-01-01"}

def test_merge_keeps_existing_shots_and_rejects_other_id():
    old = fresh(); old["shots"] = {"a.jpg": {"file": "x"}}
    assert merge_records(old, fresh())["shots"] == {"a.jpg": {"file": "x"}}
    other = fresh(); other["id"] = "someone-else"
    import pytest
    with pytest.raises(ValueError):
        merge_records(old, other)

def test_merge_without_existing_returns_fresh():
    r = fresh()
    assert merge_records(None, r)["lists"] == r["lists"]

def test_level_keyed_lists_become_objects_and_pvp_history_split():
    exp = load_export(FIX)
    exp["data"]["professions"] = {"byLevel": [{"a": 1}, {"a": 2}], "list": [1, 2]}
    exp["data"]["pvp"] = {"kills": 3, "history": [{"time": 5}]}
    exp["data"]["journey"]["segmentGhost"] = {1: True}
    r = export_to_record(exp, None)
    assert r["state"]["professions"]["byLevel"] == {"1": {"a": 1}, "2": {"a": 2}}
    assert r["state"]["professions"]["list"] == [1, 2]
    assert r["state"]["pvp"] == {"kills": 3} and r["lists"]["pvpHistory"] == [{"time": 5}]
    assert r["lists"]["journeyGhost"] == [True]
    assert "segments" not in r["state"]["journeyMeta"]

def test_nested_by_level_list_becomes_object():
    from foreverjourney.merge import _norm
    out = _norm({"fun": {"byLevel": [{"a": 1}, {"a": 2}]}, "other": [1, 2], "levels": [{"x": 1}]})
    assert out["fun"]["byLevel"] == {"1": {"a": 1}, "2": {"a": 2}}
    assert out["other"] == [1, 2] and out["levels"] == {"1": {"x": 1}}
