from app.security import get_password_hash, verify_password, create_access_token


def test_password_hash_and_verify_ok():
    password = "VeryLongPassword_1234567890_!@#"
    hashed = get_password_hash(password)

    assert isinstance(hashed, str)
    assert verify_password(password, hashed) is True


def test_password_verify_wrong_password():
    hashed = get_password_hash("password-1")
    assert verify_password("password-2", hashed) is False


def test_create_access_token_returns_string():
    token = create_access_token({"sub": "unit@test.com"})
    assert isinstance(token, str)
    assert len(token) > 20
