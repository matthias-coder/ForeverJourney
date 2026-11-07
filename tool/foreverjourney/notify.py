"""Windows toast notifications; failures are only logged."""
import logging

log = logging.getLogger("foreverjourney")


def windows_toast(title: str, text: str) -> None:
    try:
        from winotify import Notification
        Notification(app_id="ForeverJourney", title=title, msg=text).show()
    except Exception:
        log.exception("toast failed")
