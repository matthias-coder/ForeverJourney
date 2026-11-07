from foreverjourney import __main__ as m

def test_tray_config_error_shows_toast(tmp_path, monkeypatch):
    toasts = []
    monkeypatch.setattr(m, "windows_toast", lambda t, x: toasts.append((t, x)))
    monkeypatch.setattr(m, "_setup_logging", lambda console: __import__("logging").getLogger("t"))
    assert m.main(["tray", "--config", str(tmp_path / "missing.toml")]) == 2
    assert toasts and "fehlt" in toasts[0][1]
