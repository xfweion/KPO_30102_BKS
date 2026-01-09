import pytest

pytestmark = pytest.mark.integration


def test_get_recipe_ok(client, monkeypatch):
    from app.routers import recipes as recipes_router

    async def fake_get_recipe_information(spoonacular_id: int):
        return {"id": spoonacular_id, "title": "Mock Recipe", "image": None}

    monkeypatch.setattr(recipes_router, "get_recipe_information", fake_get_recipe_information)

    r = client.get("/recipes/123")
    assert r.status_code == 200
    assert r.json()["id"] == 123
    assert r.json()["title"] == "Mock Recipe"


def test_get_recipe_spoonacular_error_returns_502(client, monkeypatch):
    from app.routers import recipes as recipes_router

    async def boom(_spoonacular_id: int):
        raise Exception("Spoonacular down")

    monkeypatch.setattr(recipes_router, "get_recipe_information", boom)

    r = client.get("/recipes/123")
    assert r.status_code == 502
    assert r.json()["detail"] == "Spoonacular API error"
