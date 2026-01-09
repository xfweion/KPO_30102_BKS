import pytest
import httpx

from app import spoonacular_client


class FakeResponse:
    def __init__(self, json_data=None, raise_exc: Exception | None = None):
        self._json_data = json_data
        self._raise_exc = raise_exc

    def raise_for_status(self):
        if self._raise_exc:
            raise self._raise_exc

    def json(self):
        return self._json_data


class FakeAsyncClient:
    def __init__(self, timeout=20, response: FakeResponse | None = None):
        self.timeout = timeout
        self._response = response or FakeResponse(json_data={})
        self.last_url = None
        self.last_params = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url, params=None):
        self.last_url = url
        self.last_params = params
        return self._response


@pytest.mark.asyncio
async def test_find_by_ingredients_ok(monkeypatch):
    monkeypatch.setattr(spoonacular_client, "SPOONACULAR_API_KEY", "test-key")

    fake = FakeAsyncClient(response=FakeResponse(json_data=[{"id": 1, "title": "A"}]))
    monkeypatch.setattr(spoonacular_client.httpx, "AsyncClient", lambda timeout=20: fake)

    data = await spoonacular_client.find_by_ingredients(["tomato", "cheese"], number=2)

    assert data == [{"id": 1, "title": "A"}]
    assert fake.last_url.endswith("/recipes/findByIngredients")
    assert fake.last_params["apiKey"] == "test-key"
    assert fake.last_params["ingredients"] == "tomato,cheese"
    assert fake.last_params["number"] == 2
    assert fake.last_params["ranking"] == 1
    assert fake.last_params["ignorePantry"] is True


@pytest.mark.asyncio
async def test_find_by_ingredients_raises_on_bad_status(monkeypatch):
    req = httpx.Request("GET", "https://example.test")
    resp = httpx.Response(500, request=req)
    err = httpx.HTTPStatusError("boom", request=req, response=resp)

    fake = FakeAsyncClient(response=FakeResponse(raise_exc=err))
    monkeypatch.setattr(spoonacular_client.httpx, "AsyncClient", lambda timeout=20: fake)

    with pytest.raises(httpx.HTTPStatusError):
        await spoonacular_client.find_by_ingredients(["x"])


@pytest.mark.asyncio
async def test_get_recipe_information_ok(monkeypatch):
    monkeypatch.setattr(spoonacular_client, "SPOONACULAR_API_KEY", "test-key")

    fake = FakeAsyncClient(response=FakeResponse(json_data={"id": 123, "title": "Mock"}))
    monkeypatch.setattr(spoonacular_client.httpx, "AsyncClient", lambda timeout=20: fake)

    data = await spoonacular_client.get_recipe_information(123)

    assert data["id"] == 123
    assert data["title"] == "Mock"
    assert fake.last_url.endswith("/recipes/123/information")
    assert fake.last_params["apiKey"] == "test-key"
    assert fake.last_params["includeNutrition"] is False


@pytest.mark.asyncio
async def test_get_recipe_information_raises_on_bad_status(monkeypatch):
    req = httpx.Request("GET", "https://example.test")
    resp = httpx.Response(404, request=req)
    err = httpx.HTTPStatusError("not found", request=req, response=resp)

    fake = FakeAsyncClient(response=FakeResponse(raise_exc=err))
    monkeypatch.setattr(spoonacular_client.httpx, "AsyncClient", lambda timeout=20: fake)

    with pytest.raises(httpx.HTTPStatusError):
        await spoonacular_client.get_recipe_information(999)