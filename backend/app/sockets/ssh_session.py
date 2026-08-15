import threading

import paramiko
from flask import request
from flask_socketio import Namespace, disconnect, emit

from ..extensions import socketio
from ..models import SSHConnection
from ..security.auth import get_current_user
from ..security.crypto import decrypt_value

NAMESPACE = "/ws/ssh-session"

_sessions = {}
_sessions_lock = threading.Lock()


class _SSHSession:
    def __init__(self, client, channel):
        self.client = client
        self.channel = channel


def _set_session(sid, session):
    with _sessions_lock:
        _sessions[sid] = session


def _get_session(sid):
    with _sessions_lock:
        return _sessions.get(sid)


def _pop_session(sid):
    with _sessions_lock:
        return _sessions.pop(sid, None)


def _close_session(session):
    try:
        session.channel.close()
    except Exception:
        pass
    try:
        session.client.close()
    except Exception:
        pass


def _stream_output(sid, channel):
    while True:
        try:
            data = channel.recv(4096)
        except OSError:
            break
        if not data:
            break
        socketio.emit(
            "ssh_output",
            {"data": data.decode("utf-8", errors="replace")},
            to=sid,
            namespace=NAMESPACE,
        )
    socketio.emit("ssh_closed", {}, to=sid, namespace=NAMESPACE)
    session = _pop_session(sid)
    if session is not None:
        _close_session(session)


class SSHSessionNamespace(Namespace):
    def on_connect(self):
        if get_current_user() is None:
            raise ConnectionRefusedError("authentication required")

    def on_disconnect(self, reason=None):
        session = _pop_session(request.sid)
        if session is not None:
            _close_session(session)

    def on_ssh_connect(self, payload):
        sid = request.sid
        user = get_current_user()
        if user is None:
            emit("ssh_error", {"message": "authentication required"})
            disconnect()
            return

        if _get_session(sid) is not None:
            emit("ssh_error", {"message": "a session is already active"})
            return

        payload = payload or {}
        connection = SSHConnection.query.filter_by(
            id=payload.get("connection_id"), user_id=user.id
        ).first()
        if connection is None:
            emit("ssh_error", {"message": "connection not found"})
            return

        if connection.auth_type != "password" or not connection.encrypted_password:
            emit("ssh_error", {"message": "only password-based connections are supported"})
            return

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            client.connect(
                hostname=connection.host,
                port=connection.port,
                username=connection.username,
                password=decrypt_value(connection.encrypted_password),
                timeout=10,
                allow_agent=False,
                look_for_keys=False,
            )
        except paramiko.AuthenticationException:
            emit("ssh_error", {"message": "SSH authentication failed"})
            return
        except (paramiko.SSHException, OSError) as exc:
            emit("ssh_error", {"message": f"unable to reach host: {exc}"})
            return

        channel = client.invoke_shell(term="xterm-256color")
        _set_session(sid, _SSHSession(client, channel))
        socketio.start_background_task(_stream_output, sid, channel)

        emit("ssh_connected", {})

    def on_ssh_input(self, payload):
        session = _get_session(request.sid)
        if session is None:
            return
        data = (payload or {}).get("data", "")
        if data:
            session.channel.send(data)

    def on_ssh_resize(self, payload):
        session = _get_session(request.sid)
        if session is None:
            return
        payload = payload or {}
        try:
            cols = int(payload.get("cols", 80))
            rows = int(payload.get("rows", 24))
        except (TypeError, ValueError):
            return
        session.channel.resize_pty(width=cols, height=rows)


def register_ssh_namespace():
    socketio.on_namespace(SSHSessionNamespace(NAMESPACE))
