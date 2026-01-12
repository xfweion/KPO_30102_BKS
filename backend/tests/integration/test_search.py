def test_search_without_auth_mocked(client, monkeypatch):
    from app import spoonacular_client

    async def fake_find_by_ingredients(ingredients, number=10):
        return [
            {"id": 1, "title": "Fake recipe 1"},
            {"id": 2, "title": "Fake recipe 2"},
        ]

    monkeypatch.setattr(spoonacular_client, "find_by_ingredients", fake_find_by_ingredients)

    r = client.post("/search/search", json={"ingredients": ["tomato", "cheese"], "number": 2})
    assert r.status_code == 200

    data = r.json()
    assert data["ingredients"] == ["tomato", "cheese"]
    assert len(data["results"]) == 2
