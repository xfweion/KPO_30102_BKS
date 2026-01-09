def _register_and_login(client, email="fav@test.com", password="pass12345"):
    r = client.post("/register", json={"email": email, "password": password})
    assert r.status_code == 200

    r = client.post("/login", json={"email": email, "password": password})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_favorites_flow(client, monkeypatch):
    from app.routers import favorites as favorites_router

    async def fake_get_recipe_information(spoonacular_id: int):
        return {
            "id": spoonacular_id,
            "title": "Mock Recipe",
            "image": "http://img.test/x.jpg",
        }

    monkeypatch.setattr(favorites_router, "get_recipe_information", fake_get_recipe_information)

    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/favorites", json={"spoonacular_id": 123}, headers=headers)
    assert r.status_code == 200

    r = client.get("/favorites", headers=headers)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["spoonacular_id"] == 123
    assert items[0]["title"] == "Mock Recipe"

    r = client.delete("/favorites/123", headers=headers)
    assert r.status_code == 200

    r = client.get("/favorites", headers=headers)
    assert r.status_code == 200
    assert r.json()["items"] == []

def test_favorites_spoonacular_error_returns_502(client, monkeypatch):
    from app.routers import favorites as favorites_router

    async def boom(_spoonacular_id: int):
        raise Exception("Spoonacular down")

    monkeypatch.setattr(favorites_router, "get_recipe_information", boom)

    # login
    r = client.post("/register", json={"email": "x@test.com", "password": "pass12345"})
    assert r.status_code == 200
    r = client.post("/login", json={"email": "x@test.com", "password": "pass12345"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/favorites", json={"spoonacular_id": 123}, headers=headers)
    assert r.status_code == 502
    assert r.json()["detail"] == "Spoonacular API error"

def test_favorites_duplicate_returns_400(client, monkeypatch):
    from app.routers import favorites as favorites_router

    async def ok(spoonacular_id: int):
        return {"id": spoonacular_id, "title": "Mock", "image": None}

    monkeypatch.setattr(favorites_router, "get_recipe_information", ok)

    # login
    client.post("/register", json={"email": "dup@test.com", "password": "pass12345"})
    r = client.post("/login", json={"email": "dup@test.com", "password": "pass12345"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/favorites", json={"spoonacular_id": 777}, headers=headers)
    assert r.status_code == 200

    r = client.post("/favorites", json={"spoonacular_id": 777}, headers=headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "Recipe already in favorites"