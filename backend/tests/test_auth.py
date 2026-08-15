import pytest

from app import create_app
from app.extensions import db
from config import TestingConfig


@pytest.fixture()
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register(client, username="alice", email="alice@example.com", password="correcthorse"):
    return client.post(
        "/api/register",
        json={"username": username, "email": email, "password": password},
    )


def login(client, username="alice", password="correcthorse"):
    return client.post("/api/login", json={"username": username, "password": password})


def test_register_success(client):
    response = register(client)
    assert response.status_code == 201
    body = response.get_json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "password" not in body
    assert "password_hash" not in body


def test_register_missing_fields(client):
    response = client.post("/api/register", json={"username": "bob"})
    assert response.status_code == 400


def test_register_duplicate_username(client):
    register(client, username="alice", email="alice@example.com")
    response = register(client, username="alice", email="different@example.com")
    assert response.status_code == 409


def test_register_duplicate_email(client):
    register(client, username="alice", email="alice@example.com")
    response = register(client, username="different", email="alice@example.com")
    assert response.status_code == 409


def test_login_success_sets_session(client):
    register(client)
    response = login(client)
    assert response.status_code == 200
    body = response.get_json()
    assert body["username"] == "alice"

    me_response = client.get("/api/me")
    assert me_response.status_code == 200
    assert me_response.get_json()["username"] == "alice"


def test_login_wrong_password(client):
    register(client)
    response = login(client, password="wrong-password")
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = login(client, username="nobody")
    assert response.status_code == 401


def test_login_missing_fields(client):
    response = client.post("/api/login", json={"username": "alice"})
    assert response.status_code == 400


def test_me_without_session_is_unauthorized(client):
    response = client.get("/api/me")
    assert response.status_code == 401


def test_logout_clears_session(client):
    register(client)
    login(client)
    assert client.get("/api/me").status_code == 200

    csrf_token = client.get_cookie("csrf_token").value
    logout_response = client.post("/api/logout", headers={"X-CSRF-Token": csrf_token})
    assert logout_response.status_code == 204

    assert client.get("/api/me").status_code == 401
