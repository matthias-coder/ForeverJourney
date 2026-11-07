import time
from pathlib import Path
from PIL import Image
from foreverjourney.shots import read_exclude, screenshot_time, select_candidates, process_image, apply_exclusions, update_shots
from foreverjourney.config import load_config
from foreverjourney.luaparse import load_export
from foreverjourney.merge import export_to_record

FIX = Path(__file__).parent / "fixtures" / "MyCharForever.lua"

def make_img(p, w=2560, h=1440):
    Image.new("RGB", (w, h), (30, 90, 40)).save(p)

def test_read_exclude_handles_missing_and_comments(tmp_path):
    assert read_exclude(tmp_path / "none.txt") == set()
    (tmp_path / "e.txt").write_text("# comment\n a.jpg \n\nb.jpg\n", encoding="utf-8")
    assert read_exclude(tmp_path / "e.txt") == {"a.jpg", "b.jpg"}

def test_screenshot_time_parses_local_time():
    t = screenshot_time("WoWScrnShot_101226_204411.jpg")
    assert time.localtime(t)[:6] == (2026, 10, 12, 20, 44, 11)
    assert screenshot_time("foo.jpg") is None

def test_select_candidates_export_session_and_missing(tmp_path):
    rec = export_to_record(load_export(FIX), None)
    rec["shots"] = {}
    sd = tmp_path / "Screenshots"; sd.mkdir()
    make_img(sd / "WoWScrnShot_101226_204411.jpg")           # referenced in export -> export
    in_session = time.strftime("WoWScrnShot_%m%d%y_%H%M%S.jpg", time.localtime(1791831000))
    make_img(sd / in_session)                                   # inside session -> session
    outside = time.strftime("WoWScrnShot_%m%d%y_%H%M%S.jpg", time.localtime(1791925200))
    make_img(sd / outside)                                      # outside any session -> ignored
    c = {x.name: x for x in select_candidates(rec, sd, exclude=set())}
    assert c["WoWScrnShot_101226_204411.jpg"].source == "export"
    assert c[in_session].source == "session" and c[in_session].meta["reason"] == "GAME"
    assert outside not in c
    assert "WoWScrnShot_101226_210000.jpg" not in c             # test_missing_file_is_skipped

def test_missing_file_is_skipped(tmp_path):
    rec = export_to_record(load_export(FIX), None); rec["shots"] = {}
    sd = tmp_path / "Screenshots"; sd.mkdir()
    assert select_candidates(rec, sd, exclude=set()) == []

def test_process_image_resizes_and_writes_thumb(tmp_path):
    src = tmp_path / "WoWScrnShot_101226_204411.tga"; make_img(src)
    f, t, w, h = process_image(src, tmp_path / "out", src.name, 1600, 320, 80)
    assert f.name == "WoWScrnShot_101226_204411.jpg" and t.name == "t_WoWScrnShot_101226_204411.jpg"
    assert (w, h) == (1600, 900) and Image.open(t).size[0] == 320
    assert f.stat().st_size < 400_000

def test_update_shots_and_exclusions(tmp_path):
    cfg = load_config((lambda p: (p.write_text(f'wow_dir = "{tmp_path.as_posix()}/wow"\naccount = "A"\nrepo_dir = "{tmp_path.as_posix()}/repo"\n', encoding="utf-8"), p)[1])(tmp_path / "c.toml"))
    cfg.screenshot_dir.mkdir(parents=True); cfg.repo_dir.mkdir()
    make_img(cfg.screenshot_dir / "WoWScrnShot_101226_204411.jpg")
    rec = export_to_record(load_export(FIX), None); rec["shots"] = {}
    added = update_shots(rec, cfg, cfg.repo_dir, exclude=set())
    assert added == ["WoWScrnShot_101226_204411.jpg"]
    s = rec["shots"]["WoWScrnShot_101226_204411.jpg"]
    assert s["file"] == "shots/thorgrim-eisenbart/WoWScrnShot_101226_204411.jpg" and s["reason"] == "LEVEL_UP" and s["source"] == "export"
    assert (cfg.repo_dir / s["thumb"]).exists()
    assert update_shots(rec, cfg, cfg.repo_dir, exclude=set()) == []     # idempotent
    removed = apply_exclusions(rec, cfg.repo_dir / "shots" / rec["id"], {"WoWScrnShot_101226_204411.jpg"})
    assert removed == ["WoWScrnShot_101226_204411.jpg"] and rec["shots"] == {} and not (cfg.repo_dir / s["file"]).exists()

def test_corrupt_screenshot_is_skipped_and_retried(tmp_path, caplog):
    cfg = load_config((lambda p: (p.write_text(f'wow_dir = "{tmp_path.as_posix()}/wow"\naccount = "A"\nrepo_dir = "{tmp_path.as_posix()}/repo"\n', encoding="utf-8"), p)[1])(tmp_path / "c.toml"))
    cfg.screenshot_dir.mkdir(parents=True); cfg.repo_dir.mkdir()
    bad = "WoWScrnShot_101226_204411.jpg"
    (cfg.screenshot_dir / bad).write_bytes(b"")                # referenced in export, 0 bytes
    good = time.strftime("WoWScrnShot_%m%d%y_%H%M%S.jpg", time.localtime(1791831000))
    make_img(cfg.screenshot_dir / good)                         # inside session window
    rec = export_to_record(load_export(FIX), None); rec["shots"] = {}
    added = update_shots(rec, cfg, cfg.repo_dir, exclude=set())
    assert added == [good] and bad not in rec["shots"]
    assert "skipping unreadable screenshot" in caplog.text
