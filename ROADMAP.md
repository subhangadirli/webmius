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

- [x] GitHub Actions workflow: build both Docker images, run backend tests (pytest) and frontend tests (vitest/jest) on push/PR
- [x] **Exit criteria verified:** `.github/workflows/ci.yml` runs three parallel jobs on push to `main` and on every PR. `backend-tests` installs `backend/requirements.txt` under Python 3.12 and runs `pytest -q` (33/33 passing). `frontend-tests` installs the frontend via pnpm (pinned to `9.15.9` via corepack, matching `frontend/Dockerfile`) and runs `pnpm run typecheck`, `pnpm run test` (Vitest + Testing Library — 4 new tests added covering `Home` and `ProtectedRoute`, since no frontend test scaffolding existed before this milestone), and `pnpm run build`. `docker-build` builds both `./backend` and `./frontend` images with `docker/build-push-action` (no push) to confirm the Dockerfiles stay buildable. All three verified locally end-to-end with `podman build` + `podman run` against the real Dockerfiles before being committed (not just asserted): backend image installs cleanly and its containerized `pytest` run is 33/33 green; frontend image's containerized `pnpm run test`/`typecheck`/`build` all pass under the actual `node:20-slim` runtime the Dockerfile pins — this caught and fixed a real incompatibility (jsdom 30 requires Node ≥22 and silently crashed under Node 20, so the test dependency was pinned to jsdom 26 instead, which supports Node ≥18 and matches the Dockerfile's runtime). No GitHub Actions runner was available in this environment to observe an actual green run of the workflow YAML itself, so a first real push/PR should be watched to confirm the Actions-hosted environment behaves the same as the local container verification.

### M8 — MVP Polish & Docs

- [x] UX polish on the connection list and forms; empty/error/loading states
- [x] `README.md` with a docker-first quickstart (`git clone` → `docker compose up` → login)
- [x] Reconcile `DOCS.md` with any scope drift that happened during the build
- [x] **Exit criteria verified:** a new user can clone the repo, run one command, and complete the full MVP user flow from DOCS.md §9.

  UX polish: the dashboard's delete action previously had no error handling at all (a failed `DELETE` was an unhandled promise rejection with no user feedback) — it now surfaces the error inline and shows a per-row "Deleting…" disabled state. A failed connection *list* load now offers a "Retry" button instead of being a dead end. The terminal page now offers a "Reconnect" button once a session closes or errors, instead of forcing a trip back to the dashboard.

  `DOCS.md` reconciled against actual scope drift: §4/§5 now say React + TypeScript/Vite (not "React/Next.js"), list the container-first deployment unit, and name Flask-SocketIO + the Socket.IO client explicitly; §7 documents `/api/logout` and `/api/me` (added in M2/M3 but never listed) and the CSRF header requirement (M6); §8 documents CSRF, rate limiting, cookie flags, and the TLS reverse-proxy profile (all M6); §10 describes the actual `docker compose up` deployment path instead of a generic "runs via Flask" description; §11 now notes that `auth_type: "key"` connections exist in the schema but are rejected end-to-end (an M5 MVP limitation that was previously undocumented); §12 moves xterm.js out of "Future Improvements" since it shipped in M5.

  `README.md` gained a "Using Webmius" walkthrough (register → add connection → connect → run commands) mirroring DOCS.md §9, and a "Running tests" section pointing at the same `docker compose run` commands CI uses.

  **A real bug was caught and fixed during this milestone's exit-criteria verification, not just asserted:** a `docker compose down -v && docker compose up --build` from a genuinely empty Postgres volume failed register/login with a 500 (`relation "users" does not exist`) — Alembic migrations were never run automatically, only ever by hand during earlier milestones' verification. Fixed with `backend/entrypoint.sh` (`flask db upgrade` then `exec "$@"`) wired in via `ENTRYPOINT ["sh", "entrypoint.sh"]` in `backend/Dockerfile` (invoked through `sh` rather than relying on the executable bit, since the dev compose override bind-mounts the host `./backend` directory over `/app` and a checked-out file's mode — not the image's `RUN chmod +x` — wins once that happens; this was hit and fixed live, `podman compose start` failed with `OCI permission denied` on the first attempt). Re-verified from a fully fresh volume: `podman compose up -d` now runs migrations automatically before serving, and the entire DOCS.md §9 flow was driven end-to-end for real — `POST /api/register` → `/api/login` → `POST /api/connections` → dashboard list → a Socket.IO client authenticated with the real session cookie drove `ssh_connect`/`ssh_input` against a disposable `linuxserver/openssh-server` container on the same Compose network and got the `echo` output back over `ssh_output`, then `DELETE /api/connections/{id}` (204). Backend `pytest` (33/33) re-verified via `podman compose run --rm backend pytest -q`; frontend `pnpm run typecheck` / `pnpm run test` / `pnpm run build` re-verified via `podman compose run --rm frontend ...` against a freshly built image (a stale anonymous `node_modules` volume from an earlier session had to be removed first — noted here in case it bites a future contributor: `podman compose down -v` clears it). No headless browser was available to click through the polished UI states directly — the underlying state transitions were verified via the real API/WS calls above, but a manual pass in an actual browser is still recommended before calling the UI polish fully signed off.

### M9 — Optional / Stretch (Post-MVP)

Not required for MVP completion; pulled from DOCS.md §3 ("Optional") and §12 ("Future Improvements"):

- [x] SSH key-based authentication
- [x] Tagging / grouping servers
- [ ] Connection history (logs)
- [ ] Role-based access control
- [ ] Full terminal emulation improvements, mobile-friendly UI

**SSH key-based authentication — exit criteria verified:** `ssh_connections` gained `encrypted_private_key` and `encrypted_private_key_passphrase` columns (migration `f3f0e6e0e2a1`, chained after the initial migration; applied and verified against a live Postgres both as a fresh-DB upgrade and as an incremental upgrade on top of an already-migrated DB). `POST`/`PUT /api/connections` now accept `private_key` (PEM/OpenSSH) and an optional `private_key_passphrase` when `auth_type: "key"`, validated server-side via a new `security/ssh_keys.parse_private_key` helper (tries Ed25519/RSA/ECDSA/DSS) at *save* time — a bad key format or a missing/wrong passphrase is rejected with a 400 immediately rather than surfacing only when a user later tries to connect. `sockets/ssh_session.py`'s `on_ssh_connect` now branches on `auth_type` and authenticates Paramiko with `pkey=` for key connections (previously any non-password `auth_type` was hard-rejected with "only password-based connections are supported"). Frontend: `ConnectionForm` gained an Authentication selector that swaps the password field for a private-key textarea + optional passphrase field (same "leave blank to keep unchanged" semantics as password on edit), and `ConnectionList` now shows a Password/SSH key badge per connection.

Verified for real, not just asserted: `pytest` (44/44, +11 new — 7 in `test_connections.py` covering create/update success, missing-key, garbage-key, and passphrase-required/wrong-passphrase 400s, 4 in new `test_ssh_keys.py` unit-testing the parser directly) re-run via `podman compose run --rm backend pytest -q`. End-to-end: registered a real user, created a key-auth connection via the live API pointing at a disposable `linuxserver/openssh-server` container configured for key-only auth (`PASSWORD_ACCESS=false`) with the matching public key installed, then drove the same Socket.IO-client-against-the-real-session-cookie approach used in M5/M8 — `ssh_connect` → `ssh_connected` → a real `echo` command executed and its output captured back over `ssh_output` → clean teardown. Frontend `pnpm run typecheck` / `pnpm run test` (7/7, +3 new covering the auth-type toggle and that a key submission sends `private_key` instead of `password`) / `pnpm run build` all re-verified via `podman compose run --rm frontend ...` against a freshly built image. `DOCS.md` §6/§7/§11/§12 updated to drop the "key auth is schema-only" limitation and move it out of Future Improvements.

**Tagging / grouping servers — exit criteria verified:** `ssh_connections` gained a `tags` column (migration `b1c9f0a2d7e4`, chained after the key-auth migration; applied and verified against a live Postgres as an incremental upgrade on top of both prior migrations). `POST`/`PUT /api/connections` accept an optional `tags: string[]`, normalized server-side (trimmed, lowercased, deduped, order-preserving) via a new `_normalize_tags` helper; unlike `password`/`private_key` this is a full replace on every write rather than "leave unchanged if omitted," since tags aren't secret and the edit form always round-trips the connection's current tags. `GET /api/connections` gained an optional `?tag=` filter (exact match against a connection's parsed tag list, not a substring match on the stored comma-joined string — avoids `"prod"` false-matching `"preprod"`). Frontend: `ConnectionForm` gained a comma-separated Tags input pre-filled on edit; `ConnectionList` shows each connection's tags as clickable badges; `Dashboard` derives the set of in-use tags from the loaded connections and renders them as filter chips (clicking a chip *or* a tag badge in the list sets the same `activeTag` filter state) — filtering is done client-side against the already-loaded list rather than round-tripping through `?tag=`, which is simpler at this app's scale and keeps the query param available for API-level use/testing.

Verified for real: `pytest` (49/49, +5 new covering create/update with tags, empty-list clears tags, dedup+normalization, and the `?tag=` filter) re-run via `podman compose run --rm backend pytest -q`. End-to-end via the live API against a freshly migrated Postgres: created two connections with overlapping tags (including a `"Prod"`/`"prod"` duplicate-after-normalization case), confirmed `GET /api/connections?tag=web` returns only the matching one, confirmed `PUT` with a new tag list replaces the old one and `tags: []` clears it, then deleted both. Frontend `pnpm run typecheck` / `pnpm run test` (9/9, +2 new covering tag parsing and edit-mode pre-fill) / `pnpm run build` re-verified via `podman compose run --rm frontend ...` against a freshly built image. `DOCS.md` §6/§7/§12 updated (schema, API, and Future Improvements). No headless browser was available to click through the filter-chip/badge interaction directly — the underlying state (API responses, form pre-fill, payload shape) was verified via the tests and live API calls above, but a manual pass in an actual browser is still recommended before calling this fully signed off.

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
