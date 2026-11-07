from pathlib import Path
import pytest
from foreverjourney.luaparse import parse_saved_variables, load_export, LuaParseError, BoolKey

FIX = Path(__file__).parent / "fixtures" / "MyCharForever.lua"

def test_parses_scalars_and_escapes():
    t = 'X = {\n\t["a"] = 1,\n\t["b"] = -2.5,\n\t["c"] = "Hogger \\"der\\" \\n",\n\t["d"] = true,\n\t["e"] = nil,\n}\n'
    r = parse_saved_variables(t)["X"]
    assert r == {"a": 1, "b": -2.5, "c": 'Hogger "der" \n', "d": True, "e": None}

def test_array_tables_become_lists():
    r = parse_saved_variables('X = {\n\t{\n\t\t["t"] = 1,\n\t}, -- [1]\n\t{\n\t\t["t"] = 2,\n\t}, -- [2]\n\t"s", -- [3]\n}\n')["X"]
    assert r == [{"t": 1}, {"t": 2}, "s"]

def test_sparse_numeric_keys_stay_dict():
    r = parse_saved_variables('X = {\n\t[5] = "five",\n\t[7] = "seven",\n}\n')["X"]
    assert r == {5: "five", 7: "seven"}

def test_multiple_top_level_variables():
    r = parse_saved_variables('A = {\n}\nB = {\n\t["k"] = 1,\n}\n')
    assert set(r) == {"A", "B"} and r["B"] == {"k": 1}

def test_truncated_file_raises():
    text = FIX.read_text(encoding="utf-8")
    with pytest.raises(LuaParseError):
        parse_saved_variables(text[: len(text) // 2])

def test_load_export_fixture():
    exp = load_export(FIX)
    assert exp["exportVersion"] == 3
    assert exp["meta"]["name"] == "Thorgrim"
    assert exp["data"]["events"][1]["type"] == "LEVEL_UP"
    assert exp["data"]["journey"]["segments"][0][0] == [1791830400, 1426, 0.4, 0.5, 1]


def test_cut_between_variables_raises(tmp_path):
    text = FIX.read_text(encoding="utf-8")
    cut = text[: text.index("}\n") + 2]
    assert "MyCharForeverExportDB" not in cut
    f = tmp_path / "MyCharForever.lua"
    f.write_text(cut, encoding="utf-8")
    with pytest.raises(LuaParseError):
        load_export(f)


def test_bool_keys_do_not_collide_with_int_keys():
    r = parse_saved_variables('X = {\n\t[true] = "t",\n\t[1] = "one",\n}\n')["X"]
    assert isinstance(r, dict) and len(r) == 2
    assert r[1] == "one" and r[BoolKey(True)] == "t"


def test_bool_key_is_not_a_list():
    r = parse_saved_variables('X = {\n\t[true] = "t",\n}\n')["X"]
    assert isinstance(r, dict)


def test_decimal_escapes():
    r = parse_saved_variables('X = { "\\195\\164", "a\\10b", "\\65" }')["X"]
    assert r == ["ä", "a\nb", "A"]


def test_exponent_hex_and_comment_in_table():
    t = 'X = {\n\t["a"] = 1e3, -- note\n\t["b"] = 0x1F,\n\t["c"] = 2.5E-1,\n}\n'
    assert parse_saved_variables(t)["X"] == {"a": 1000.0, "b": 31, "c": 0.25}


def test_eof_error_carries_position():
    with pytest.raises(LuaParseError, match=r"at \d+"):
        parse_saved_variables("X = {")

