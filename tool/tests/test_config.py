from pathlib import Path
import pytest
from foreverjourney.config import load_config, ConfigError, find_export_files

def write(tmp_path, body):
    p = tmp_path / "config.toml"; p.write_text(body, encoding="utf-8"); return p

def test_load_minimal(tmp_path):
    cfg = load_config(write(tmp_path, f'wow_dir = "{tmp_path.as_posix()}/wow"\naccount = "ACC1"\nrepo_dir = "{tmp_path.as_posix()}/repo"\n'))
    assert cfg.account_dir == tmp_path / "wow" / "WTF" / "Account" / "ACC1"
    assert cfg.screenshot_dir == tmp_path / "wow" / "Screenshots"
    assert cfg.max_width == 1600 and cfg.show_companions is True

def test_char_overrides(tmp_path):
    cfg = load_config(write(tmp_path, f'wow_dir = "w"\naccount = "A"\nrepo_dir = "r"\n[characters."thorgrim-eisenbart"]\nrealm_type = "RP-PvP"\nmode = "hardcore"\nstatus = "fallen"\narmory_url = "https://example/x"\n'))
    c = cfg.characters["thorgrim-eisenbart"]
    assert (c.realm_type, c.mode, c.status, c.armory_url) == ("RP-PvP", "hardcore", "fallen", "https://example/x")

def test_invalid_realm_type_rejected(tmp_path):
    with pytest.raises(ConfigError):
        load_config(write(tmp_path, 'wow_dir = "w"\naccount = "A"\nrepo_dir = "r"\n[characters.x]\nrealm_type = "PVPVP"\n'))

def test_missing_required_rejected(tmp_path):
    with pytest.raises(ConfigError):
        load_config(write(tmp_path, 'wow_dir = "w"\n'))

def test_find_export_files(tmp_path):
    cfg = load_config(write(tmp_path, f'wow_dir = "{tmp_path.as_posix()}/wow"\naccount = "ACC"\nrepo_dir = "r"\n'))
    for realm, name in [("Eisenbart", "Thorgrim"), ("Mondschatten", "Lunara")]:
        d = cfg.account_dir / realm / name / "SavedVariables"; d.mkdir(parents=True)
        (d / "MyCharForever.lua").write_text("x", encoding="utf-8")
        (d / "Other.lua").write_text("x", encoding="utf-8")
    assert [p.parts[-3] for p in find_export_files(cfg)] == ["Thorgrim", "Lunara"]
