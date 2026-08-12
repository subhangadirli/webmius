from flask import Flask
from flask_cors import CORS

from config import get_config

from .extensions import db, migrate


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())
    CORS(app)

    db.init_app(app)
    migrate.init_app(app, db)

    from .routes.health import health_bp
    app.register_blueprint(health_bp)

    return app
