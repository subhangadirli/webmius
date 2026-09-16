from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models import ConnectionLog, PasswordResetToken, SSHConnection, User, get_app_settings
from ..security.auth import admin_required
from ..security.passwords import hash_password

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _user_to_dict(user):
    connection_count = SSHConnection.query.filter_by(user_id=user.id).count()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": bool(user.is_active),
        "can_ssh": bool(user.can_ssh),
        "max_connections": user.max_connections,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "connection_count": connection_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _connection_to_dict(connection):
    tags = connection.tags.split(",") if connection.tags else []
    return {
        "id": connection.id,
        "name": connection.name,
        "host": connection.host,
        "port": connection.port,
        "username": connection.username,
        "auth_type": connection.auth_type,
        "tags": tags,
        "created_at": connection.created_at.isoformat() if connection.created_at else None,
    }


def _log_to_dict(log):
    return {
        "id": log.id,
        "connection_id": log.connection_id,
        "connection_name": log.connection_name,
        "host": log.host,
        "port": log.port,
        "username": log.username,
        "status": log.status,
        "error_message": log.error_message,
        "has_recording": bool(log.recording),
        "started_at": log.started_at.isoformat() if log.started_at else None,
        "ended_at": log.ended_at.isoformat() if log.ended_at else None,
    }


def _active_admin_count():
    return User.query.filter_by(role="admin", is_active=True).count()


@admin_bp.get("/users")
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.asc()).all()
    result = [_user_to_dict(u) for u in users]

    # Optional server-side filtering/sorting for API consumers. The frontend
    # also filters client-side for instant UX; both paths share semantics:
    # q matches username/email substring (case-insensitive).
    q = (request.args.get("q") or "").strip().lower()
    if q:
        result = [u for u in result if q in u["username"].lower() or q in u["email"].lower()]

    role = (request.args.get("role") or "").strip()
    if role in ("user", "admin"):
        result = [u for u in result if u["role"] == role]

    status = (request.args.get("status") or "").strip()
    if status == "active":
        result = [u for u in result if u["is_active"]]
    elif status == "disabled":
        result = [u for u in result if not u["is_active"]]

    sort = (request.args.get("sort") or "").strip()
    order = (request.args.get("order") or "asc").strip().lower()
    reverse = order == "desc"
    if sort == "username":
        result.sort(key=lambda u: u["username"].lower(), reverse=reverse)
    elif sort == "email":
        result.sort(key=lambda u: u["email"].lower(), reverse=reverse)
    elif sort == "created_at":
        result.sort(key=lambda u: u["created_at"] or "", reverse=reverse)
    elif sort == "connection_count":
        result.sort(key=lambda u: u["connection_count"], reverse=reverse)

    return jsonify(result), 200


@admin_bp.get("/users/<int:user_id>")
@admin_required
def get_user(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404
    return jsonify(_user_to_dict(user)), 200


@admin_bp.get("/users/<int:user_id>/connections")
@admin_required
def list_user_connections(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404
    connections = (
        SSHConnection.query.filter_by(user_id=user.id)
        .order_by(SSHConnection.created_at.desc())
        .all()
    )
    return jsonify([_connection_to_dict(c) for c in connections]), 200


@admin_bp.get("/users/<int:user_id>/logs")
@admin_required
def list_user_logs(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404
    logs = (
        ConnectionLog.query.filter_by(user_id=user.id)
        .order_by(ConnectionLog.started_at.desc())
        .limit(100)
        .all()
    )
    return jsonify([_log_to_dict(l) for l in logs]), 200


@admin_bp.post("/users/<int:user_id>/password")
@admin_required
def reset_user_password(user_id):
    data = request.get_json(silent=True) or {}
    new_password = data.get("new_password") or ""
    if not new_password:
        return jsonify(error="new_password is required"), 400

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404

    user.password_hash = hash_password(new_password)
    # Outstanding self-service reset links for this user must not survive an
    # admin-initiated password change.
    PasswordResetToken.query.filter_by(user_id=user.id).delete()
    db.session.commit()

    return jsonify(_user_to_dict(user)), 200


@admin_bp.patch("/users/<int:user_id>")
@admin_required
def update_user(user_id):
    data = request.get_json(silent=True) or {}

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404

    is_self = user.id == g.current_user.id

    if "role" in data:
        role = data.get("role")
        if role not in ("user", "admin"):
            return jsonify(error="role must be 'user' or 'admin'"), 400
        if is_self and role != user.role:
            return jsonify(error="cannot change your own role"), 400
        if user.role == "admin" and role == "user" and _active_admin_count() <= 1:
            return jsonify(error="cannot demote the last remaining admin"), 400
        user.role = role

    if "is_active" in data:
        is_active = data.get("is_active")
        if not isinstance(is_active, bool):
            return jsonify(error="is_active must be a boolean"), 400
        if is_self and not is_active:
            return jsonify(error="cannot deactivate your own account"), 400
        if user.role == "admin" and not is_active and _active_admin_count() <= 1:
            return jsonify(error="cannot deactivate the last remaining admin"), 400
        user.is_active = is_active

    if "can_ssh" in data:
        can_ssh = data.get("can_ssh")
        if not isinstance(can_ssh, bool):
            return jsonify(error="can_ssh must be a boolean"), 400
        user.can_ssh = can_ssh

    if "max_connections" in data:
        max_connections = data.get("max_connections")
        if max_connections is not None and (
            not isinstance(max_connections, int)
            or isinstance(max_connections, bool)
            or max_connections < 0
        ):
            return jsonify(error="max_connections must be a non-negative integer or null"), 400
        user.max_connections = max_connections

    db.session.commit()

    return jsonify(_user_to_dict(user)), 200


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    if user_id == g.current_user.id:
        return jsonify(error="cannot delete your own account"), 400

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404

    if user.role == "admin" and user.is_active and _active_admin_count() <= 1:
        return jsonify(error="cannot delete the last remaining admin"), 400

    db.session.delete(user)
    db.session.commit()

    return "", 204


def _settings_to_dict(settings):
    return {
        "registration_enabled": settings.registration_enabled,
        "session_timeout_minutes": settings.session_timeout_minutes,
    }


@admin_bp.get("/settings")
@admin_required
def get_settings():
    return jsonify(_settings_to_dict(get_app_settings())), 200


@admin_bp.patch("/settings")
@admin_required
def update_settings():
    data = request.get_json(silent=True) or {}
    settings = get_app_settings()

    if "registration_enabled" in data:
        value = data.get("registration_enabled")
        if not isinstance(value, bool):
            return jsonify(error="registration_enabled must be a boolean"), 400
        settings.registration_enabled = value

    if "session_timeout_minutes" in data:
        value = data.get("session_timeout_minutes")
        if value is not None and (not isinstance(value, int) or isinstance(value, bool) or value <= 0):
            return jsonify(error="session_timeout_minutes must be a positive integer or null"), 400
        settings.session_timeout_minutes = value

    db.session.commit()
    return jsonify(_settings_to_dict(settings)), 200
