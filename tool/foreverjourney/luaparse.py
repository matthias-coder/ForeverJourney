import re
from pathlib import Path


class LuaParseError(ValueError):
    pass


_TOKEN = re.compile(
    r"""
    (?P<ws>\s+)
  | (?P<comment>--\[(?P<eq>=*)\[.*?\](?P=eq)\]|--[^\n]*)
  | (?P<number>0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)
  | (?P<string>"(?:[^"\\\n]|\\.)*")
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<punct>[{}\[\]=,;-])
    """,
    re.VERBOSE | re.DOTALL,
)

_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", '"': '"', "'": "'", "|": "|", "\n": "\n"}
_ESC_RE = re.compile(r"\\(\d{1,3}|.)", re.DOTALL)


def _unescape(raw: str) -> str:
    out = bytearray()
    pos = 0
    body = raw[1:-1]
    for m in _ESC_RE.finditer(body):
        out += body[pos:m.start()].encode("utf-8")
        e = m.group(1)
        if e.isdigit():
            out.append(int(e) & 0xFF)
        else:
            out += _ESCAPES.get(e, e).encode("utf-8")
        pos = m.end()
    out += body[pos:].encode("utf-8")
    return out.decode("utf-8", errors="replace")


class BoolKey:
    """Table key `true`/`false`; kept distinct from the integer keys 1/0."""

    __slots__ = ("value",)

    def __init__(self, value: bool):
        self.value = value

    def __eq__(self, other):
        return isinstance(other, BoolKey) and other.value == self.value

    def __hash__(self):
        return hash(("BoolKey", self.value))

    def __repr__(self):
        return f"BoolKey({self.value})"


def _tokenize(text: str):
    pos = 0
    out = []
    while pos < len(text):
        m = _TOKEN.match(text, pos)
        if not m:
            raise LuaParseError(f"unexpected character {text[pos]!r} at {pos}")
        kind = m.lastgroup
        if kind not in ("ws", "comment"):
            out.append((kind, m.group(), pos))
        pos = m.end()
    return out


class _Parser:
    def __init__(self, tokens, end=0):
        self.t = tokens
        self.i = 0
        self.end = end

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else None

    def next(self):
        tok = self.peek()
        if tok is None:
            raise LuaParseError(f"unexpected end of input at {self.end}")
        self.i += 1
        return tok

    def expect(self, value):
        tok = self.next()
        if tok[0] != "punct" or tok[1] != value:
            raise LuaParseError(f"expected {value!r} at {tok[2]}, got {tok[1]!r}")

    def at_punct(self, value):
        tok = self.peek()
        return tok is not None and tok[0] == "punct" and tok[1] == value

    def parse_value(self):
        kind, val, pos = self.next()
        if kind == "punct":
            if val == "{":
                return self.parse_table()
            if val == "-":
                k2, v2, p2 = self.next()
                if k2 != "number":
                    raise LuaParseError(f"expected number after '-' at {p2}")
                return -self._number(v2)
            raise LuaParseError(f"unexpected {val!r} at {pos}")
        if kind == "number":
            return self._number(val)
        if kind == "string":
            return _unescape(val)
        if kind == "name":
            if val == "true":
                return True
            if val == "false":
                return False
            if val == "nil":
                return None
        raise LuaParseError(f"unexpected token {val!r} at {pos}")

    @staticmethod
    def _number(s):
        if s[:2] in ("0x", "0X"):
            return int(s, 16)
        if re.fullmatch(r"\d+", s):
            return int(s)
        return float(s)

    def parse_table(self):
        entries = {}
        n = 0
        while True:
            if self.at_punct("}"):
                self.next()
                break
            tok = self.peek()
            if tok is None:
                raise LuaParseError(f"unexpected end of input in table at {self.end}")
            if tok[0] == "punct" and tok[1] == "[":
                self.next()
                key = self.parse_value()
                if isinstance(key, bool):
                    key = BoolKey(key)
                self.expect("]")
                self.expect("=")
                entries[key] = self.parse_value()
            elif (
                tok[0] == "name"
                and self.i + 1 < len(self.t)
                and self.t[self.i + 1][:2] == ("punct", "=")
            ):
                self.next()
                self.next()
                entries[tok[1]] = self.parse_value()
            else:
                n += 1
                entries[n] = self.parse_value()
            if self.at_punct(",") or self.at_punct(";"):
                self.next()
            elif not self.at_punct("}"):
                nxt = self.peek()
                if nxt is None:
                    raise LuaParseError(f"unexpected end of input in table at {self.end}")
                raise LuaParseError(f"expected ',' or '}}' at {nxt[2]}")
        if entries and all(type(k) is int for k in entries) and set(entries) == set(range(1, len(entries) + 1)):
            return [entries[k] for k in range(1, len(entries) + 1)]
        return entries


def parse_saved_variables(text: str) -> dict[str, object]:
    p = _Parser(_tokenize(text), len(text))
    result = {}
    while p.peek() is not None:
        kind, name, pos = p.next()
        if kind != "name":
            raise LuaParseError(f"expected variable name at {pos}")
        p.expect("=")
        result[name] = p.parse_value()
    return result


def load_export(path: Path) -> dict:
    text = Path(path).read_text(encoding="utf-8", errors="ignore")
    variables = parse_saved_variables(text)
    if "MyCharForeverExportDB" not in variables:
        raise LuaParseError("MyCharForeverExportDB not found (incomplete file?)")
    return variables["MyCharForeverExportDB"]
