from functools import wraps

from flask import g, jsonify, session

from ..extensions import db
from ..models import User


def get_current_user():
    user_id = session.get("user_id")
    if user_id is None:
        return None
    return db.session.get(User, user_id)


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if user is None:
            return jsonify(error="authentication required"), 401
        g.current_user = user
        return view_func(*args, **kwargs)

    return wrapped


def admin_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if user is None:
            return jsonify(error="authentication required"), 401
        if user.role != "admin":
            return jsonify(error="admin access required"), 403
        g.current_user = user
        return view_func(*args, **kwargs)

    return wrapped
