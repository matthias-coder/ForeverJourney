import subprocess
import pytest
from foreverjourney.wowproc import is_wow_running

NAMES = ["Wow.exe", "WowClassic.exe"]
WITH = '"System","4","Services","0","8 K"\r\n"Wow.exe","48024","Console","1","1.200.000 K"\r\n'
WITHOUT = '"System","4","Services","0","8 K"\r\n"notepad.exe","12","Console","1","9 K"\r\n'


def fake(out):
    return lambda *a, **k: subprocess.CompletedProcess(a, 0, stdout=out, stderr="")


def test_running_detected():
    assert is_wow_running(NAMES, run=fake(WITH)) is True


def test_case_insensitive():
    assert is_wow_running(NAMES, run=fake(WITH.replace("Wow.exe", "WOW.EXE"))) is True


def test_not_running():
    assert is_wow_running(NAMES, run=fake(WITHOUT)) is False


def test_error_is_false():
    def boom(*a, **k):
        raise OSError("no tasklist")
    assert is_wow_running(NAMES, run=boom) is False


def test_timeout_is_false():
    def slow(*a, **k):
        raise subprocess.TimeoutExpired("tasklist", 10)
    assert is_wow_running(NAMES, run=slow) is False


def test_nonzero_exit_is_false():
    assert is_wow_running(NAMES, run=lambda *a, **k: subprocess.CompletedProcess(a, 1, stdout=WITH, stderr="")) is False
