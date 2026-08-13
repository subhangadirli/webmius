from flask import Blueprint, g, jsonify, request, session

from ..extensions import db
from ..models import User
from ..security.auth import login_required
from ..security.passwords import hash_password, verify_password

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


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify(error="username and password are required"), 400

    user = User.query.filter_by(username=username).first()
    if user is None or not verify_password(password, user.password_hash):
        return jsonify(error="invalid username or password"), 401

    session["user_id"] = user.id

    return jsonify(_user_to_dict(user)), 200


@auth_bp.post("/logout")
def logout():
    session.pop("user_id", None)
    return "", 204


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(_user_to_dict(g.current_user)), 200
