---
title: Webmius – Build Roadmap
date: 2026-08-12
---

# Webmius – Roadmap

This roadmap turns the spec in [`DOCS.md`](./DOCS.md) into an ordered set of build milestones. `DOCS.md` remains the source of truth for *what* the system does; this file tracks *in what order* it gets built. Milestones are phase-based (no fixed dates) — work through them in order, at whatever pace fits.

* * *

## Guiding Principles

* **Container-first from day one.** Every milestone must be runnable via `docker compose up` **or** `podman compose up` — both are first-class, kept interchangeable by sticking to the standard Compose spec (e.g. `:Z`-labeled bind mounts for SELinux hosts, which Docker safely ignores where SELinux isn't in play). There is no "install Python/Node locally and hope it matches prod" workflow — the container *is* the dev environment.
* **Secrets are never in plaintext**, even in dev. SSH credentials are encrypted at rest starting with the first milestone that stores them.
* **Small vertical slices.** Each milestone should produce something runnable end-to-end (even if minimal), rather than large horizontal layers integrated all at once.

* * *

## Milestones

### M0 — Repo & Docker Scaffolding

- [x] `.gitignore` / `.dockerignore`
- [x] Minimal Flask app factory with a `GET /health` route, `backend/Dockerfile`
- [x] Minimal React app shell that calls `/health` and renders the result, `frontend/Dockerfile`
- [x] `docker-compose.yml` with `backend` (Flask), `frontend` (React/Vite), and `db` (PostgreSQL) services
- [x] `docker-compose.override.yml` for local dev (bind mounts, hot reload) + `.env.example` documenting required env vars (DB creds, secret keys)
- [x] **Exit criteria verified:** `docker compose up` / `podman compose up` brings up all three services; backend `/health` returns `{"status": "ok"}` and the frontend serves successfully. Verified live with `podman compose up --build` (db healthy, backend on :5000, frontend on :5173).

### M1 — Backend Foundation & Data Layer

- [x] SQLAlchemy models: `User`, `SSHConnection` (per DOCS.md §6)
- [x] Alembic migrations wired into the `backend` container
- [x] Config management via environment variables (dev/prod split)
- [x] Password hashing utility (bcrypt)
- [x] Credential encryption utility for stored SSH passwords (e.g. `cryptography`'s Fernet, key sourced from env)
- [x] **Exit criteria verified:** migrations run cleanly against a freshly wiped `db` container (`flask db upgrade` creates `users`, `ssh_connections`, `alembic_version`); 7/7 pytest cases pass covering bcrypt hash/verify round-trips and Fernet encrypt/decrypt round-trips.

### M2 — Auth API

- [x] `POST /api/register`
- [x] `POST /api/login`
- [x] Session/JWT-based auth middleware for protected routes
- [x] **Exit criteria verified:** pytest coverage for register/login happy paths and failure cases (duplicate username/email, wrong password, missing fields). 17/17 tests passing (10 new auth tests covering register, login, `/me`, `/logout`, plus 7 from M1).

### M3 — Frontend Foundation & Auth UI

- [x] React Router setup, API client wrapper
- [x] Login and Register pages
- [x] Protected-route wrapper / auth context
- [x] Basic dashboard layout shell (empty state)
- [x] **Exit criteria verified:** register → login → `/api/me` → logout flow exercised against the real backend (no mocks) via `podman compose`, replicating the exact requests the React app makes (`credentials: 'include'`, `Origin: http://localhost:5173`) — session cookie issuance, CORS credential headers, and auth enforcement all confirmed correct. All frontend routes (`/`, `/login`, `/register`, `/dashboard`) and JS modules serve and compile cleanly under Vite with no transform errors. No headless browser was available in this environment to click through the UI directly — a quick manual pass in an actual browser is still recommended before considering this fully signed off.

### M4 — SSH Connections CRUD

- [x] `GET /api/connections`, `POST /api/connections`, `PUT /api/connections/{id}`, `DELETE /api/connections/{id}` (DOCS.md §7)
- [x] Ownership checks — a user can only read/modify their own connections
- [x] Frontend: connection list on the dashboard, add/edit/delete forms
- [x] **Exit criteria verified:** 13 new pytest cases cover CRUD happy paths, validation, and cross-user ownership enforcement (30/30 tests passing). Full create → list → update → delete lifecycle exercised against the real backend via `curl` replicating the browser's exact request pattern (`credentials: 'include'`, `Origin: http://localhost:5173`, session cookie) — encrypted-at-rest password never echoed in responses, ownership checks return 404 for another user's connection. All new frontend modules (`Dashboard.jsx`, `ConnectionForm.jsx`, `ConnectionList.jsx`) serve and compile cleanly under Vite. No headless browser was available to click through the UI directly — a quick manual pass in an actual browser is still recommended.

### M5 — Web Terminal (WebSocket + SSH)

- [x] Flask-SocketIO `/ws/ssh-session` namespace
- [x] Paramiko-based SSH session bridging (connect, stream stdin/stdout, disconnect)
- [x] xterm.js terminal component on the frontend
- [x] Error surfacing for auth failure, unreachable host, dropped connection
- [x] **Exit criteria verified:** backend adds `flask-socketio` + `paramiko`; the `/ws/ssh-session` Socket.IO namespace authenticates via the existing Flask session cookie (`on_connect` refuses unauthenticated sockets), then bridges an owned `SSHConnection` to a Paramiko `invoke_shell` PTY — `ssh_connect`/`ssh_input`/`ssh_resize` in, `ssh_connected`/`ssh_output`/`ssh_error`/`ssh_closed` out, with a background thread streaming channel output per-socket. Frontend adds `socket.io-client` + `@xterm/xterm` + `@xterm/addon-fit`; a new `Terminal` component wraps xterm with a `ResizeObserver`-driven `FitAddon`, and `TerminalPage` (route `/connections/:id/terminal`, reachable via a "Connect" button on each dashboard connection card) wires it to the socket. Verified against a real disposable OpenSSH container on the same Podman network (not mocked): a Python `socketio.Client()` script drove the full protocol end-to-end — real login banner + `echo` command executed and its output captured back over the stream; a wrong-password connection correctly emitted `ssh_error: "SSH authentication failed"`; an unreachable host (black-hole IP) correctly emitted `ssh_error: "unable to reach host: timed out"` after the 10s connect timeout. `tsc -b && vite build` and the full `pytest` suite (30/30) still pass. Known MVP limitation: host keys are accepted via `AutoAddPolicy` (no pinning/verification) and only password auth is supported end-to-end (`auth_type='key'` connections are rejected with a clear error) — key-based auth remains M9 stretch scope per DOCS.md §3.

### M6 — Security Hardening Pass

- [x] Reverse proxy (Caddy or nginx) added to compose as a "prod-like" profile for TLS termination
- [x] CSRF protection on state-changing endpoints
- [x] Rate limiting on auth endpoints
- [x] Audit: confirm SSH credentials are encrypted at rest end-to-end, cookies are `HttpOnly`/`Secure`/`SameSite`
- [x] **Exit criteria verified:** `deploy/Caddyfile` + a `proxy` service (`docker-compose.yml`, gated behind `--profile prod`, excluded from the default dev `up`) terminates real TLS via Caddy's internal CA and reverse-proxies `/api/*` + `/socket.io/*` to the backend and everything else to the frontend. CSRF uses the double-submit-cookie pattern (`backend/app/security/csrf.py`): a non-`HttpOnly` `csrf_token` cookie/session pair is issued for every visitor, and any mutating `/api/*` request from an authenticated session must echo it back via `X-CSRF-Token` or gets a 403 — verified directly with `curl` (missing header → 403, correct header → 201) both in plain dev HTTP and through the HTTPS proxy. `Flask-Limiter` caps `/api/register` and `/api/login` at 10/minute per IP (`memory://` storage — a documented single-instance limitation); verified with `curl` (11 rapid logins → 401×9 then 429). Cookies are `HttpOnly` + `SameSite=Lax` always, and `Secure` whenever `SESSION_COOKIE_SECURE` is true (the default; the dev compose override explicitly disables it since dev runs over plain HTTP) — verified `Secure` appears on both `session` and `csrf_token` `Set-Cookie` headers when hit through the HTTPS proxy with `FLASK_ENV=production`, and is absent over the plain-HTTP dev server. SSH credentials audited end-to-end: `encrypted_password` in Postgres is genuine Fernet ciphertext (checked via `psql` directly), plaintext is never returned in any API response (from M4) or logged (grepped `backend/app` for password handling). Full `pytest` suite (33/33, incl. two new CSRF-rejection cases and a dedicated rate-limit test) and the M5 real-SSH-container walkthrough both re-verified with all of the above layered in — no regressions. `CORS_ORIGINS` is now parsed as a comma-separated list so dev and prod origins can coexist. Passwords-hashed-with-bcrypt and session-based-auth (DOCS.md §8) were already satisfied as of M2; JWT remains explicitly optional per spec.

### M7 — CI & Test Scaffolding

- [ ] GitHub Actions workflow: build both Docker images, run backend tests (pytest) and frontend tests (vitest/jest) on push/PR
- [ ] **Exit criteria verified:** pipeline is green on a clean clone with no local setup beyond `docker compose`.

### M8 — MVP Polish & Docs

- [ ] UX polish on the connection list and forms; empty/error/loading states
- [ ] `README.md` with a docker-first quickstart (`git clone` → `docker compose up` → login)
- [ ] Reconcile `DOCS.md` with any scope drift that happened during the build
- [ ] **Exit criteria verified:** a new user can clone the repo, run one command, and complete the full MVP user flow from DOCS.md §9.

### M9 — Optional / Stretch (Post-MVP)

Not required for MVP completion; pulled from DOCS.md §3 ("Optional") and §12 ("Future Improvements"):

- [ ] SSH key-based authentication
- [ ] Tagging / grouping servers
- [ ] Connection history (logs)
- [ ] Role-based access control
- [ ] Full terminal emulation improvements, mobile-friendly UI

* * *

## Milestone Dependencies

```
M0 → M1 → M2 → M3 → M4 → M5
              ↘ M6 (can start once M2 exists)
              ↘ M7 (can start once M2 exists)
M4, M5, M6, M7 → M8 → M9
```

M0 through M3 are strictly sequential (each depends on the last). M4 needs both auth (M2) and the frontend shell (M3). M5 needs connections to exist (M4). M6 and M7 can run in parallel with M4/M5 once basic auth (M2) is in place. M8 is the final MVP gate before any M9 stretch work begins.

* * *

## Out of Scope for MVP

Per DOCS.md §11 (Limitations), the following are explicitly **not** part of MVP delivery:

* Advanced terminal features (multiplexing, session recording, etc.)
* Enterprise-grade security (SSO, secrets vaulting, audit logging beyond basic connection history)
* Multi-user collaboration (shared connections, teams, permissions beyond single-owner)
