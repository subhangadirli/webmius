from datetime import datetime, timezone

from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    connections = db.relationship(
        "SSHConnection", backref="owner", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.username}>"


class SSHConnection(db.Model):
    __tablename__ = "ssh_connections"
    __table_args__ = (
        db.CheckConstraint("auth_type IN ('password', 'key')", name="ck_ssh_connections_auth_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False, default=22)
    username = db.Column(db.String(80), nullable=False)
    auth_type = db.Column(db.String(20), nullable=False, default="password")
    encrypted_password = db.Column(db.Text, nullable=True)
    encrypted_private_key = db.Column(db.Text, nullable=True)
    encrypted_private_key_passphrase = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SSHConnection {self.name} ({self.host})>"
