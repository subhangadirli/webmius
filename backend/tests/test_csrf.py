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


def register_and_login(client, username="alice", email="alice@example.com", password="correcthorse"):
    client.post("/api/register", json={"username": username, "email": email, "password": password})
    return client.post("/api/login", json={"username": username, "password": password})


def csrf_header(client):
    cookie = client.get_cookie("csrf_token")
    return {"X-CSRF-Token": cookie.value} if cookie else {}


def test_csrf_cookie_is_issued_even_without_a_session(client):
    # The SPA must be able to read the csrf cookie on an unauthenticated request
    # so its first authenticated mutation carries a valid token.
    resp = client.get("/api/health")
    assert resp.status_code == 200
    cookie = client.get_cookie("csrf_token")
    assert cookie is not None and cookie.value


def test_missing_csrf_token_blocks_authenticated_mutation(client):
    register_and_login(client)
    resp = client.patch("/api/me", json={})
    assert resp.status_code == 403


def test_wrong_csrf_token_blocks_authenticated_mutation(client):
    register_and_login(client)
    resp = client.patch("/api/me", json={}, headers={"X-CSRF-Token": "not-the-real-token"})
    assert resp.status_code == 403


def test_valid_csrf_token_allows_authenticated_mutation(client):
    register_and_login(client)
    resp = client.patch("/api/me", json={"username": "alice2"}, headers=csrf_header(client))
    assert resp.status_code == 200
    assert resp.get_json()["username"] == "alice2"


def test_safe_methods_are_csrf_exempt(client):
    register_and_login(client)
    assert client.get("/api/me").status_code == 200


def test_auth_endpoints_are_csrf_exempt(client):
    # login establishes the session, so it must not demand a CSRF header itself.
    register_and_login(client)
    resp = client.post("/api/login", json={"username": "alice", "password": "correcthorse"})
    assert resp.status_code == 200