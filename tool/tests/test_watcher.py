import time, threading
from foreverjourney.watcher import ExportWatcher

def test_calls_once_after_stable_period(tmp_path):
    sv = tmp_path / "Realm" / "Char" / "SavedVariables"; sv.mkdir(parents=True)
    f = sv / "MyCharForever.lua"; calls = []
    w = ExportWatcher(tmp_path, lambda p: calls.append(p), stable_seconds=0.5, poll_seconds=0.2)
    w.start()
    try:
        f.write_text("a"); time.sleep(0.2); f.write_text("ab"); time.sleep(0.2); f.write_text("abc")
        time.sleep(0.3); assert calls == []            # still within stable window
        time.sleep(1.0); assert calls == [f]            # exactly one call
        (sv / "Other.lua").write_text("x"); time.sleep(1.0); assert calls == [f]
    finally:
        w.stop()

def test_polling_fallback_detects_change(tmp_path):
    sv = tmp_path / "R" / "C" / "SavedVariables"; sv.mkdir(parents=True)
    f = sv / "MyCharForever.lua"; f.write_text("a"); calls = []
    w = ExportWatcher(tmp_path, lambda p: calls.append(p), stable_seconds=0.3, poll_seconds=0.2, use_events=False)
    w.start()
    try:
        time.sleep(0.5); assert calls == []            # existing file: no call at start
        f.write_text("ab"); time.sleep(1.2); assert calls == [f]
    finally:
        w.stop()
