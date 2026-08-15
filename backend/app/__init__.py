from flask import Flask
from flask_cors import CORS

from config import get_config

from .extensions import db, migrate, socketio


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())
    CORS(app, supports_credentials=True, origins=app.config["CORS_ORIGINS"])

    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins=app.config["CORS_ORIGINS"], async_mode="threading")

    from . import models  # noqa: F401  (registers models with SQLAlchemy metadata)

    from .routes.health import health_bp
    app.register_blueprint(health_bp)

    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from .routes.connections import connections_bp
    app.register_blueprint(connections_bp)

    from .sockets.ssh_session import register_ssh_namespace
    register_ssh_namespace()

    return app
