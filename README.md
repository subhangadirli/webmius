# Webmius

Web-based SSH connection manager. See [`DOCS.md`](./DOCS.md) for the technical spec and [`ROADMAP.md`](./ROADMAP.md) for build progress.

## Quickstart

Requires **either** [Docker](https://docs.docker.com/get-docker/) (with the Compose plugin) **or** [Podman](https://podman.io/) (with `podman-compose` or the `podman compose` plugin) — the same `docker-compose.yml` works with both.

```bash
git clone https://github.com/subhangadirli/webmius.git && cd webmius
cp .env.example .env      # fill in real secrets before deploying anywhere but localhost
docker compose up --build # or: podman compose up --build
```

Then open:

* Frontend — http://localhost:5173
* Backend health check — http://localhost:5000/health

`docker-compose.override.yml` is auto-merged and enables hot reload (bind mounts) for local dev.

> **Don't skip `cp .env.example .env`.** `docker-compose.yml` has insecure
> fallback values for the database/secret env vars so a quick localhost test
> still boots without it, but if you skip it and hit weird startup errors
> (especially with Podman — see below), that's almost always why.

### Using Podman

On SELinux-enforcing hosts (e.g. Fedora), bind-mounted volumes need an SELinux label to be readable/writable inside the container — the compose override already sets `:z` (shared label, since both the `backend` and `frontend` containers need concurrent access to their own mount), so no extra flags are needed.

If `podman compose` fails to connect, make sure the Podman API socket is running:

```bash
systemctl --user start podman.socket
```

**Heads up:** unlike Docker Compose, `podman-compose` does not warn when a
variable referenced in `docker-compose.yml` is undefined — it silently
substitutes an empty string. If you forget `cp .env.example .env`, you won't
see a helpful warning; you'll only notice once a container fails (see
Troubleshooting below). Always double check `.env` exists before reporting
an issue with Podman.

## Using Webmius

1. Open http://localhost:5173 and **register** an account (or **log in** if you already have one).
2. From the dashboard, click **Add connection** and fill in a name, host, port, SSH username, and password.
3. Click **Connect** on a saved connection to open a web-based terminal to that server.
4. Run commands as you normally would over SSH — output streams back live. Use **Back** to return to the dashboard, or **Reconnect** if the session drops.

## HTTPS / "prod" profile

A `proxy` service (Caddy) terminates real TLS in front of the dev services, for exercising the `Secure`-cookie / rate-limiting / CSRF hardening described in `ROADMAP.md` M6 without a real domain. It's opt-in via a compose profile and **excludes the dev override** (so the frontend serves through Vite's dev server, not a production build):

```bash
VITE_API_URL=https://localhost:8443 CORS_ORIGINS=http://localhost:5173,https://localhost:8443 \
  podman compose -f docker-compose.yml --profile prod up --build
```

Then open https://localhost:8443 (accept the self-signed cert warning — Caddy's internal CA isn't in your system trust store). On a rootful/production host, set `PROXY_PORT=443` to bind the standard port instead.

## Deploying to Heroku

Single-origin deploy: Flask serves the built frontend from the same domain, so the session/CSRF cookies stay first-party and no CORS setup is needed. The frontend is compiled automatically during slug compilation (Node.js + Python buildpacks), so there is nothing to build or commit by hand.

### One command

```bash
deploy/heroku.sh my-webmius-app
```

That creates the app, provisions Heroku Postgres, generates and sets `SECRET_KEY`/`ENCRYPTION_KEY`, pushes the current branch, points `FRONTEND_URL` at the app's public URL, and opens it. (Requires the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).)

### One click

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://dashboard.heroku.com/new?template=https://github.com/subhangadirli/webmius) — driven by [`app.json`](./app.json), which declares the Postgres addon and auto-generates the two secrets; you only optionally fill in `FRONTEND_URL` for email links.

### Manual

```bash
heroku create my-webmius-app
heroku addons:create heroku-postgresql:essential          # sets DATABASE_URL
heroku config:set SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
heroku config:set ENCRYPTION_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
heroku config:set FLASK_ENV=production
git push heroku main
```

### How it works

* Root [`Procfile`](./Procfile): `release` runs DB migrations (`flask db upgrade`); `web` starts gunicorn with **one worker** (`--threads 8`) — Socket.IO runs in threading mode, which can't scale past one worker without adding a message queue.
* Root [`package.json`](./package.json) + [`.buildpacks`](./.buildpacks): the Node.js buildpack compiles `frontend/` into `frontend/dist/` during the build with `VITE_API_URL=''`, which makes the built app call the API same-origin.
* Flask serves `frontend/dist/` itself (see `_register_spa` in `backend/app/__init__.py`); with no `dist/` present (dev/test) it's a no-op.
* Root [`requirements.txt`](./requirements.txt) exists only so the Python buildpack detects the project; it just includes `backend/requirements.txt`.
* Optional: set `SMTP_*` config vars to send real password-reset email; without them, reset links are logged to `heroku logs --tail`.

## Running tests

## Running tests

Both suites also run in CI (`.github/workflows/ci.yml`) on every push/PR, alongside a build check for both Docker images. Swap `docker compose` for `podman compose` as elsewhere in this README.

```bash
# Backend (pytest) — inside the backend image, or any Python 3.12 env with backend/requirements.txt installed
docker compose run --rm backend pytest -q

# Frontend (Vitest) — inside the frontend image, or any Node 20+ env with the frontend deps installed
docker compose run --rm frontend pnpm run typecheck
docker compose run --rm frontend pnpm run test
```

## Troubleshooting

### `Error: Database is uninitialized and superuser password is not specified`

The `db` container failed to boot because `POSTGRES_PASSWORD` was empty.
This happens when:

1. `.env` doesn't exist (you skipped `cp .env.example .env`), **and**
2. a `db_data` volume from a *previous* run already exists — Postgres only
   reads `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` the first time it
   initializes an empty data directory, so once a volume exists with one set
   of credentials, mismatched env vars on a later run won't fix it.

Fix it by making sure `.env` exists, then resetting the database volume so
it re-initializes with the right credentials:

```bash
cp .env.example .env   # if you haven't already
docker compose down -v # or: podman compose down -v (the -v removes db_data)
docker compose up --build
```

### Backend/frontend hang waiting on `db`, or can't authenticate to Postgres

Same root cause as above — `backend` won't start until `db` reports healthy,
so a crash-looping `db` looks like everything is just hanging. Check its
logs first:

```bash
docker compose logs db   # or: podman compose logs db
```

### Login/session doesn't persist, or CSRF errors, over plain HTTP

Make sure you're using the dev override (the default, un-suffixed
`docker compose up`) rather than the `prod` profile without HTTPS —
`SESSION_COOKIE_SECURE` needs to be `false` for cookies to work over plain
`http://localhost`, which the dev config already handles for you.

## Stopping

```bash
docker compose down   # or: podman compose down
```
