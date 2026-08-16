import pytest

from app import create_app
from app.extensions import db
from app.models import ConnectionLog, User
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


def _add_log(app, user_id, **overrides):
    with app.app_context():
        log = ConnectionLog(
            user_id=user_id,
            connection_id=None,
            connection_name="prod-box",
            host="10.0.0.5",
            port=22,
            username="deploy",
            status="success",
        )
        for key, value in overrides.items():
            setattr(log, key, value)
        db.session.add(log)
        db.session.commit()
        return log.id


def test_connection_logs_requires_auth(client):
    assert client.get("/api/connection-logs").status_code == 401


def test_connection_logs_lists_own_entries(client, app):
    alice = register_and_login(client).get_json()
    _add_log(app, alice["id"], status="success")
    _add_log(app, alice["id"], status="failed", error_message="SSH authentication failed")

    response = client.get("/api/connection-logs")
    assert response.status_code == 200
    entries = response.get_json()
    assert len(entries) == 2
    statuses = {e["status"] for e in entries}
    assert statuses == {"success", "failed"}


def test_connection_logs_only_shows_own_entries(client, app):
    alice = register_and_login(client, username="alice", email="alice@example.com").get_json()
    register_and_login(client, username="bob", email="bob@example.com")
    bob = client.get("/api/me").get_json()

    _add_log(app, alice["id"], connection_name="alice-box")
    _add_log(app, bob["id"], connection_name="bob-box")

    response = client.get("/api/connection-logs")
    entries = response.get_json()
    assert len(entries) == 1
    assert entries[0]["connection_name"] == "bob-box"


def test_connection_log_survives_connection_deletion(client, app):
    alice = register_and_login(client).get_json()
    _add_log(app, alice["id"], connection_id=9999)

    response = client.get("/api/connection-logs")
    assert len(response.get_json()) == 1
