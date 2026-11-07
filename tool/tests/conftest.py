import pytest


@pytest.fixture(autouse=True)
def _no_real_wow_check(monkeypatch):
    """Never let a really running WoW defer syncs in tests."""
    monkeypatch.setattr("foreverjourney.app.is_wow_running", lambda names: False)
