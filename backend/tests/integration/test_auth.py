import pytest

def test_register_and_login(client):
    email = "testuser@example.com"
    password = "super-secret-password"

    r = client.post("/register", json={"email": email, "password": password})
    assert r.status_code == 200

    r = client.post("/login", json={"email": email, "password": password})
    assert r.status_code == 200

    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_me_requires_auth(client):
    r = client.get("/me")
    assert r.status_code in (401, 403) #если проблемы с заголовком(Authorization: Bearer)


def test_me_with_token(client):
    email = "testme@example.com"
    password = "pass123456"

    client.post("/register", json={"email": email, "password": password})
    login = client.post("/login", json={"email": email, "password": password})
    token = login.json()["access_token"]

    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == email

@pytest.mark.parametrize(
    "payload",
    [
        {"email": "nope@test.com", "password": "pass123"},
        {"email": "bademail", "password": "pass123"},
        {"email": "x@test.com", "password": ""},
    ],
)
def test_login_invalid_payloads(client, payload):
    r = client.post("/login", json=payload)
    assert r.status_code in (400, 401, 422)