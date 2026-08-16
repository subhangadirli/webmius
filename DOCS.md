---
title: Webmius – Web-based SSH Management System
date: 2026-08-12
---

# Webmius – Web-based SSH Management System

## Technical Documentation (MVP)

### 1\. Project Overview

Webmius is a self-hostable web application that allows users to store, manage, and connect to SSH servers from a browser interface. The system is inspired by tools like Termius but focuses on a simplified MVP version suitable for basic remote server management.

The application enables users to:

* Save SSH connection credentials
* Organize servers
* Connect to servers via a web-based terminal
* Execute commands remotely

* * *

### 2\. Objectives

* Provide a centralized SSH connection manager
* Enable browser-based remote server access
* Ensure secure storage of credentials
* Build a lightweight and self-hostable system

* * *

### 3. Scope (MVP Features)

#### Core Features

* User authentication (login/register)
* Add / edit / delete SSH connections
* Store host, port, username, authentication method
* Web-based terminal (basic command execution)
* Connection list dashboard

#### Optional (If time permits)

* SSH key authentication support
* Tagging or grouping servers
* Connection history (logs)

* * *

### 4\. System Architecture

The system follows a client-server architecture:

* **Frontend:** React (TypeScript, built with Vite)
* **Backend:** Python Flask
* **Database:** PostgreSQL
* **Communication:** REST API + WebSocket (for terminal)
* **Deployment unit:** Docker/Podman Compose (`db` + `backend` + `frontend`, plus an opt-in `proxy` service for TLS — see §10)

* * *

### 5\. Technology Stack

| Layer        | Technology                                     |
| ------------ | ----------------------------------------------- |
| Frontend     | React + TypeScript (Vite, Tailwind, Skeleton)  |
| Backend      | Flask (Python)                                 |
| Database     | PostgreSQL                                     |
| SSH Handling | Paramiko (Python)                              |
| Real-time    | WebSockets (Flask-SocketIO + Socket.IO client) |

* * *

### 6\. Database Design

#### Users Table

* id
* username
* email
* password\_hash

#### SSH\_Connections Table

* id
* user\_id (FK)
* name
* host
* port
* username
* auth_type (password/key)
* encrypted\_password (optional, used when auth_type is "password")
* encrypted\_private\_key (optional, used when auth_type is "key")
* encrypted\_private\_key\_passphrase (optional, only if the stored key is itself passphrase-protected)

* * *

### 7. API Design (Simplified)

#### Authentication

* POST /api/register
* POST /api/login
* POST /api/logout
* GET /api/me — current session's user, used by the frontend to restore auth state on load

#### SSH Connections

* GET /api/connections
* POST /api/connections
* PUT /api/connections/{id}
* DELETE /api/connections/{id}

`auth_type` is `"password"` or `"key"`. Password connections take a `password` field; key connections take a `private_key` (PEM/OpenSSH format) and an optional `private_key_passphrase` if the key itself is encrypted. The key is parsed and validated server-side at save time (unrecognized formats or a missing/wrong passphrase are rejected with a 400), not just at connect time. As with `password`, omitting `private_key`/`private_key_passphrase` on an update leaves the stored value unchanged.

All `/api/*` mutating requests (state-changing methods) additionally require an `X-CSRF-Token` header echoing the `csrf_token` cookie (double-submit pattern) — see §8.

#### SSH Session

* WS /ws/ssh-session (Flask-SocketIO namespace, authenticated via the existing session cookie)
    
    * `ssh_connect` / `ssh_input` / `ssh_resize` — client → server
    * `ssh_connected` / `ssh_output` / `ssh_error` / `ssh_closed` — server → client

* * *

### 8\. Security Considerations

* Passwords hashed using bcrypt
* SSH credentials encrypted at rest (Fernet, key sourced from env) and never echoed back in API responses
* Session cookies are `HttpOnly` + `SameSite=Lax`, and `Secure` whenever served over HTTPS
* CSRF protection on all state-changing `/api/*` requests via a double-submit cookie/header pair
* Rate limiting on `/api/register` and `/api/login` (10/min per IP)
* HTTPS available via an opt-in reverse-proxy ("prod" Compose profile, Caddy) that terminates TLS in front of the dev services — see §10
* Session-based authentication (JWT optional, not implemented in the MVP)

* * *

### 9\. User Flow

1. User registers/logs in
2. User adds SSH server details
3. User selects a server from dashboard
4. Web terminal opens
5. Commands are executed remotely via backend

* * *

### 10\. Deployment

* Self-hosted on VPS or local server, container-first: `docker compose up` / `podman compose up` brings up `db` (PostgreSQL), `backend` (Flask), and `frontend` (Vite dev server) with no local Python/Node install required
* An opt-in `proxy` service (Caddy, `--profile prod`) terminates real TLS in front of the dev services, for exercising the `Secure`-cookie / HTTPS path locally or on a real host
* See `README.md` for the exact commands

* * *

### 11. Limitations (MVP)

* No advanced terminal features (multiplexing, session recording)
* Limited security compared to enterprise tools (no secrets vaulting, no SSO)
* No multi-user collaboration

* * *

### 12\. Future Improvements

* Tagging / grouping servers
* Connection history (logs)
* Role-based access control
* Further terminal emulation improvements (multiplexing, session recording), mobile-friendly UI

Terminal emulation via xterm.js and SSH key-based authentication both shipped as part of the MVP (§5, §7) rather than remaining stretch goals.

* * *

### 13\. Conclusion

Webmius provides a simple and practical solution for managing SSH connections via a web interface. The MVP focuses on essential functionality while leaving room for future scalability and improvements.