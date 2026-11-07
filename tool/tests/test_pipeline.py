# tool/tests/test_pipeline.py
import json, shutil
from pathlib import Path
from foreverjourney.config import load_config
from foreverjourney.pipeline import sync_character, sync_all

FIX = Path(__file__).parent / "fixtures" / "MyCharForever.lua"
NOW = 1794063600

def setup(tmp_path):
    cfg = load_config((lambda p: (p.write_text(f'wow_dir = "{tmp_path.as_posix()}/wow"\naccount = "A"\nrepo_dir = "{tmp_path.as_posix()}/repo"\n', encoding="utf-8"), p)[1])(tmp_path / "c.toml"))
    sv = cfg.account_dir / "Eisenbart" / "Thorgrim" / "SavedVariables"; sv.mkdir(parents=True)
    shutil.copy(FIX, sv / "MyCharForever.lua"); cfg.screenshot_dir.mkdir(); cfg.repo_dir.mkdir()
    return cfg, sv / "MyCharForever.lua"

def test_first_run_writes_record(tmp_path):
    cfg, lua = setup(tmp_path)
    r = sync_character(lua, cfg, NOW)
    assert r.changed and r.error is None and r.display_name == "Thorgrim Eisenbart"
    data = json.loads((cfg.repo_dir / "data" / "thorgrim-eisenbart.json").read_text(encoding="utf-8"))
    assert data["updatedAt"] == NOW and "profileKey" not in data["meta"]

def test_second_run_unchanged_does_not_rewrite(tmp_path):
    cfg, lua = setup(tmp_path)
    sync_character(lua, cfg, NOW)
    p = cfg.repo_dir / "data" / "thorgrim-eisenbart.json"; before = p.read_text(encoding="utf-8")
    assert sync_character(lua, cfg, NOW + 10).changed is False and p.read_text(encoding="utf-8") == before

def test_unparsable_export_leaves_repo_untouched(tmp_path):
    cfg, lua = setup(tmp_path)
    sync_character(lua, cfg, NOW)
    p = cfg.repo_dir / "data" / "thorgrim-eisenbart.json"; before = p.read_text(encoding="utf-8")
    lua.write_text(lua.read_text(encoding="utf-8")[:500], encoding="utf-8")
    r = sync_character(lua, cfg, NOW + 10)
    assert r.error and p.read_text(encoding="utf-8") == before

def test_unknown_export_version_is_rejected(tmp_path):
    cfg, lua = setup(tmp_path)
    lua.write_text(lua.read_text(encoding="utf-8").replace('["exportVersion"] = 3', '["exportVersion"] = 4'), encoding="utf-8")
    r = sync_character(lua, cfg, NOW)
    assert "exportVersion" in r.error and not (cfg.repo_dir / "data").exists()

def test_sync_all_builds_index_and_marks_missing_retired(tmp_path):
    cfg, lua = setup(tmp_path)
    sync_all(cfg, NOW)
    idx = json.loads((cfg.repo_dir / "data" / "index.json").read_text(encoding="utf-8"))
    assert [c["id"] for c in idx["characters"]] == ["thorgrim-eisenbart"] and idx["characters"][0]["status"] == "active"
    assert (cfg.repo_dir / "data" / "exclude.txt").exists()
    lua.unlink()
    sync_all(cfg, NOW + 5)
    idx = json.loads((cfg.repo_dir / "data" / "index.json").read_text(encoding="utf-8"))
    assert idx["characters"][0]["status"] == "retired" and (cfg.repo_dir / "data" / "thorgrim-eisenbart.json").exists()

def test_show_companions_false_drops_companions(tmp_path):
    cfg, lua = setup(tmp_path); cfg.show_companions = False
    sync_character(lua, cfg, NOW)
    data = json.loads((cfg.repo_dir / "data" / "thorgrim-eisenbart.json").read_text(encoding="utf-8"))
    assert "companions" not in data["state"]
