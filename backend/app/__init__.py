import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from config import get_config

from .extensions import db, limiter, migrate, socketio
from .security.csrf import CSRF_HEADER_NAME, register_csrf_protection


def _register_spa(app):
    # Single-origin deploy (Heroku): serve the built frontend straight from
    # Flask when frontend/dist exists next to the repo. Same-origin serving
    # keeps the SameSite=Lax session/CSRF cookies working with zero extra
    # configuration. The check makes this a no-op for dev containers that
    # only contain the backend/ directory and for the test suite.
    dist = os.path.abspath(
        os.path.join(os.path.dirname(__file__), os.pardir, os.pardir, "frontend", "dist")
    )
    if not os.path.isfile(os.path.join(dist, "index.html")):
        return

    @app.route("/", defaults={"asset_path": ""})
    @app.route("/<path:asset_path>")
    def spa(asset_path):  # noqa: F811 - intentionally generic route name
        candidate = os.path.join(dist, asset_path)
        if asset_path and os.path.isfile(candidate):
            return send_from_directory(dist, asset_path)
        # Unknown paths fall back to index.html so client-side routing
        # (React Router) works on refresh/deep links.
        return send_from_directory(dist, "index.html")


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())
    CORS(
        app,
        supports_credentials=True,
        origins=app.config["CORS_ORIGINS"],
        allow_headers=["Content-Type", CSRF_HEADER_NAME],
    )

    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins=app.config["CORS_ORIGINS"], async_mode="threading")
    limiter.init_app(app)
    register_csrf_protection(app)

    from . import models  # noqa: F401  (registers models with SQLAlchemy metadata)

    from .routes.health import health_bp
    app.register_blueprint(health_bp)

    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from .routes.connections import connections_bp
    app.register_blueprint(connections_bp)

    from .routes.history import history_bp
    app.register_blueprint(history_bp)

    from .routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    from .sockets.ssh_session import register_ssh_namespace
    register_ssh_namespace()

    _register_spa(app)

    return app
