from foreverjourney.ids import slug, char_id

def test_slug_transliterates_and_collapses():
    assert slug("Lünara Mönd-Schatten!!") == "luenara-moend-schatten"
    assert slug("Straße") == "strasse"

def test_char_id_includes_realm():
    assert char_id({"name": "Thorgrim", "realm": "Eisenbart"}) == "thorgrim-eisenbart"
    assert char_id({"name": "Thorgrim", "realm": "Sturmfaust"}) == "thorgrim-sturmfaust"
