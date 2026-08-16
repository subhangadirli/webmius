from flask import Blueprint, g, jsonify

from ..extensions import db
from ..models import SSHConnection, User
from ..security.auth import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _user_to_dict(user):
    connection_count = SSHConnection.query.filter_by(user_id=user.id).count()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "connection_count": connection_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@admin_bp.get("/users")
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.asc()).all()
    return jsonify([_user_to_dict(u) for u in users]), 200


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    if user_id == g.current_user.id:
        return jsonify(error="cannot delete your own account"), 400

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="user not found"), 404

    if user.role == "admin" and User.query.filter_by(role="admin").count() <= 1:
        return jsonify(error="cannot delete the last remaining admin"), 400

    db.session.delete(user)
    db.session.commit()

    return "", 204
