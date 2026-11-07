import sys
import pytest
from foreverjourney.priority import lower_priority


@pytest.mark.skipif(sys.platform != "win32", reason="Windows only")
def test_lower_priority_sets_below_normal():
    import ctypes
    assert lower_priority() is True
    k = ctypes.windll.kernel32
    k.GetCurrentProcess.restype = ctypes.c_void_p
    k.GetPriorityClass.argtypes = [ctypes.c_void_p]
    assert k.GetPriorityClass(k.GetCurrentProcess()) == 0x4000
