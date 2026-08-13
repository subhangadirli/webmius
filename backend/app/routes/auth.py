from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import User
from ..security.passwords import hash_password

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


def _user_to_dict(user):
    return {"id": user.id, "username": user.username, "email": user.email}


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify(error="username, email, and password are required"), 400

    if User.query.filter_by(username=username).first():
        return jsonify(error="username already taken"), 409

    if User.query.filter_by(email=email).first():
        return jsonify(error="email already registered"), 409

    user = User(username=username, email=email, password_hash=hash_password(password))
    db.session.add(user)
    db.session.commit()

    return jsonify(_user_to_dict(user)), 201
