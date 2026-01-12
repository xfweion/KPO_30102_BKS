def _register_and_login(client, email="hist@test.com", password="pass12345"):
    r = client.post("/register", json={"email": email, "password": password})
    assert r.status_code == 200, r.text

    r = client.post("/login", json={"email": email, "password": password})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_search_saves_history_when_authed(client, monkeypatch):
    from app.routers import search as search_router

    async def fake_find_by_ingredients(*args, **kwargs):
        return [
            {"id": 1, "title": "Fake recipe 1"},
            {"id": 2, "title": "Fake recipe 2"},
        ]

    monkeypatch.setattr(search_router, "find_by_ingredients", fake_find_by_ingredients)

    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        "/search/search",
        json={"ingredients": ["tomato", "cheese"], "number": 2},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    r = client.get("/history", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()

    items = data.get("items") or data.get("history") or data
    assert len(items) >= 1
    assert "tomato" in items[0]["ingredients"]

