---
title: Webmius – Build Roadmap
date: 2026-08-12
---

# Webmius – Roadmap

This roadmap turns the spec in [`DOCS.md`](./DOCS.md) into an ordered set of build milestones. `DOCS.md` remains the source of truth for *what* the system does; this file tracks *in what order* it gets built. Milestones are phase-based (no fixed dates) — work through them in order, at whatever pace fits.

* * *

## Guiding Principles

* **Docker-first from day one.** Every milestone must be runnable via `docker compose up`. There is no "install Python/Node locally and hope it matches prod" workflow — the container *is* the dev environment.
* **Secrets are never in plaintext**, even in dev. SSH credentials are encrypted at rest starting with the first milestone that stores them.
* **Small vertical slices.** Each milestone should produce something runnable end-to-end (even if minimal), rather than large horizontal layers integrated all at once.

* * *

## Milestones

### M0 — Repo & Docker Scaffolding

* `docker-compose.yml` with `backend` (Flask), `frontend` (React/Vite), and `db` (PostgreSQL) services
* `docker-compose.override.yml` for local dev (bind mounts, hot reload)
* `backend/Dockerfile` and `frontend/Dockerfile`
* `.env.example` documenting required env vars (DB creds, secret keys)
* Minimal Flask app factory with a `GET /health` route
* Minimal React app shell that calls `/health` and renders the result
* `.gitignore` / `.dockerignore`

**Exit criteria:** `docker compose up` brings up all three services; the frontend successfully displays the backend's health status.

### M1 — Backend Foundation & Data Layer

* SQLAlchemy models: `User`, `SSHConnection` (per DOCS.md §6)
* Alembic migrations wired into the `backend` container
* Config management via environment variables (dev/prod split)
* Password hashing utility (bcrypt)
* Credential encryption utility for stored SSH passwords (e.g. `cryptography`'s Fernet, key sourced from env)

**Exit criteria:** migrations run cleanly against the `db` container; models have unit test coverage (hashing round-trips, encryption round-trips).

### M2 — Auth API

* `POST /api/register`
* `POST /api/login`
* Session/JWT-based auth middleware for protected routes

**Exit criteria:** pytest coverage for register/login happy paths and failure cases (duplicate username/email, wrong password, missing fields).

### M3 — Frontend Foundation & Auth UI

* React Router setup, API client wrapper
* Login and Register pages
* Protected-route wrapper / auth context
* Basic dashboard layout shell (empty state)

**Exit criteria:** manual login/register flow works end-to-end through Docker against the real backend (no mocks).

### M4 — SSH Connections CRUD

* `GET /api/connections`, `POST /api/connections`, `PUT /api/connections/{id}`, `DELETE /api/connections/{id}` (DOCS.md §7)
* Ownership checks — a user can only read/modify their own connections
* Frontend: connection list on the dashboard, add/edit/delete forms

**Exit criteria:** pytest API tests for CRUD + ownership enforcement; manual create/edit/delete walkthrough works in the UI.

### M5 — Web Terminal (WebSocket + SSH)

* Flask-SocketIO `/ws/ssh-session` namespace
* Paramiko-based SSH session bridging (connect, stream stdin/stdout, disconnect)
* xterm.js terminal component on the frontend
* Error surfacing for auth failure, unreachable host, dropped connection

**Exit criteria:** from the browser, open a real SSH session to a test container/VM and run commands interactively.

### M6 — Security Hardening Pass

* Reverse proxy (Caddy or nginx) added to compose as a "prod-like" profile for TLS termination
* CSRF protection on state-changing endpoints
* Rate limiting on auth endpoints
* Audit: confirm SSH credentials are encrypted at rest end-to-end, cookies are `HttpOnly`/`Secure`/`SameSite`

**Exit criteria:** every item in DOCS.md §8 (Security Considerations) is verifiably satisfied.

### M7 — CI & Test Scaffolding

* GitHub Actions workflow: build both Docker images, run backend tests (pytest) and frontend tests (vitest/jest) on push/PR

**Exit criteria:** pipeline is green on a clean clone with no local setup beyond `docker compose`.

### M8 — MVP Polish & Docs

* UX polish on the connection list and forms; empty/error/loading states
* `README.md` with a docker-first quickstart (`git clone` → `docker compose up` → login)
* Reconcile `DOCS.md` with any scope drift that happened during the build

**Exit criteria:** a new user can clone the repo, run one command, and complete the full MVP user flow from DOCS.md §9.

### M9 — Optional / Stretch (Post-MVP)

Not required for MVP completion; pulled from DOCS.md §3 ("Optional") and §12 ("Future Improvements"):

* SSH key-based authentication
* Tagging / grouping servers
* Connection history (logs)
* Role-based access control
* Full terminal emulation improvements, mobile-friendly UI

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
