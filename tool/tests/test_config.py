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

@pytest.mark.parametrize("opt,value", [("mode", "ironman"), ("status", "dead")])
def test_invalid_mode_or_status_rejected(tmp_path, opt, value):
    body = f'wow_dir = "w"\naccount = "A"\nrepo_dir = "r"\n[characters.x]\n{opt} = "{value}"\n'
    with pytest.raises(ConfigError):
        load_config(write(tmp_path, body))

def test_unknown_top_level_key_rejected(tmp_path):
    with pytest.raises(ConfigError, match="max_widht"):
        load_config(write(tmp_path, 'wow_dir = "w"\naccount = "A"\nrepo_dir = "r"\nmax_widht = 800\n'))

def test_init_only_field_rejected(tmp_path):
    with pytest.raises(ConfigError, match="account_dir"):
        load_config(write(tmp_path, 'wow_dir = "w"\naccount = "A"\nrepo_dir = "r"\naccount_dir = "x"\n'))

def test_invalid_toml_wrapped(tmp_path):
    with pytest.raises(ConfigError):
        load_config(write(tmp_path, 'wow_dir = "w\n'))

def test_non_string_path_rejected(tmp_path):
    with pytest.raises(ConfigError):
        load_config(write(tmp_path, 'wow_dir = 5\naccount = "A"\nrepo_dir = "r"\n'))

def test_example_config_loads():
    example = Path(__file__).resolve().parent.parent / "config.example.toml"
    cfg = load_config(example)
    assert cfg.account == "DEIN_ACCOUNT"

def test_find_export_files(tmp_path):
    cfg = load_config(write(tmp_path, f'wow_dir = "{tmp_path.as_posix()}/wow"\naccount = "ACC"\nrepo_dir = "r"\n'))
    for realm, name in [("Eisenbart", "Thorgrim"), ("Mondschatten", "Lunara")]:
        d = cfg.account_dir / realm / name / "SavedVariables"; d.mkdir(parents=True)
        (d / "MyCharForever.lua").write_text("x", encoding="utf-8")
        (d / "Other.lua").write_text("x", encoding="utf-8")
    assert [p.parts[-3] for p in find_export_files(cfg)] == ["Thorgrim", "Lunara"]


def test_defer_options_are_known(tmp_path):
    p = tmp_path / "c.toml"
    p.write_text('wow_dir = "x"\naccount = "A"\nrepo_dir = "y"\n'
                 'defer_while_wow_running = false\nwow_process_names = ["Foo.exe"]\n', encoding="utf-8")
    cfg = load_config(p)
    assert cfg.defer_while_wow_running is False and cfg.wow_process_names == ["Foo.exe"]
