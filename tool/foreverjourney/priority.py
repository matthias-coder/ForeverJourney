"""Lower the process priority so syncing never competes with the game."""
import os
import sys

BELOW_NORMAL_PRIORITY_CLASS = 0x00004000


def lower_priority() -> bool:
    """Best effort; never raises. Returns True on success."""
    try:
        if sys.platform == "win32":
            import ctypes
            k = ctypes.windll.kernel32
            k.GetCurrentProcess.restype = ctypes.c_void_p
            k.SetPriorityClass.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
            return bool(k.SetPriorityClass(k.GetCurrentProcess(), BELOW_NORMAL_PRIORITY_CLASS))
        os.nice(10)
        return True
    except Exception:
        return False
