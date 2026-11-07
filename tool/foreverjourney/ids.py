import re

_TRANSLIT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
                           "Ä": "ae", "Ö": "oe", "Ü": "ue"})


def slug(text: str) -> str:
    """Lowercase, transliterate umlauts, replace non [a-z0-9] runs with '-'."""
    s = text.translate(_TRANSLIT).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def char_id(meta: dict) -> str:
    """Stable character id: '<name>-<realm>' as slugs."""
    return f"{slug(meta['name'])}-{slug(meta['realm'])}"
