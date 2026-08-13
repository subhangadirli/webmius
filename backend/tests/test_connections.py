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


def create_connection(client, **overrides):
    payload = {
        "name": "prod-box",
        "host": "10.0.0.5",
        "port": 22,
        "username": "deploy",
        "password": "hunter2",
    }
    payload.update(overrides)
    return client.post("/api/connections", json=payload)


def test_list_connections_requires_auth(client):
    response = client.get("/api/connections")
    assert response.status_code == 401


def test_create_connection_requires_auth(client):
    response = create_connection(client)
    assert response.status_code == 401


def test_create_connection_success(client):
    register_and_login(client)
    response = create_connection(client)
    assert response.status_code == 201
    body = response.get_json()
    assert body["name"] == "prod-box"
    assert body["host"] == "10.0.0.5"
    assert body["port"] == 22
    assert body["username"] == "deploy"
    assert body["auth_type"] == "password"
    assert "password" not in body
    assert "encrypted_password" not in body


def test_create_connection_missing_fields(client):
    register_and_login(client)
    response = client.post("/api/connections", json={"name": "prod-box"})
    assert response.status_code == 400


def test_create_connection_password_auth_requires_password(client):
    register_and_login(client)
    response = create_connection(client, password="")
    assert response.status_code == 400


def test_create_connection_invalid_auth_type(client):
    register_and_login(client)
    response = create_connection(client, auth_type="totp")
    assert response.status_code == 400


def test_create_connection_invalid_port(client):
    register_and_login(client)
    response = create_connection(client, port="not-a-port")
    assert response.status_code == 400


def test_list_connections_returns_only_own(client):
    register_and_login(client)
    create_connection(client, name="alice-box")
    client.post("/api/logout")

    register_and_login(client, username="bob", email="bob@example.com", password="correcthorse")
    create_connection(client, name="bob-box")

    response = client.get("/api/connections")
    assert response.status_code == 200
    names = [c["name"] for c in response.get_json()]
    assert names == ["bob-box"]


def test_get_own_connection_via_update_ownership(client):
    register_and_login(client, username="alice", email="alice@example.com")
    created = create_connection(client).get_json()
    connection_id = created["id"]
    client.post("/api/logout")

    register_and_login(client, username="bob", email="bob@example.com")
    response = client.put(f"/api/connections/{connection_id}", json={"name": "hijacked"})
    assert response.status_code == 404

    delete_response = client.delete(f"/api/connections/{connection_id}")
    assert delete_response.status_code == 404


def test_update_connection_success(client):
    register_and_login(client)
    created = create_connection(client).get_json()

    response = client.put(
        f"/api/connections/{created['id']}",
        json={"name": "renamed-box", "port": 2222},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["name"] == "renamed-box"
    assert body["port"] == 2222
    assert body["host"] == "10.0.0.5"


def test_update_nonexistent_connection(client):
    register_and_login(client)
    response = client.put("/api/connections/9999", json={"name": "nope"})
    assert response.status_code == 404


def test_delete_connection_success(client):
    register_and_login(client)
    created = create_connection(client).get_json()

    response = client.delete(f"/api/connections/{created['id']}")
    assert response.status_code == 204

    list_response = client.get("/api/connections")
    assert list_response.get_json() == []


def test_delete_nonexistent_connection(client):
    register_and_login(client)
    response = client.delete("/api/connections/9999")
    assert response.status_code == 404
