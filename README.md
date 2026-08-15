# Webmius

Web-based SSH connection manager. See [`DOCS.md`](./DOCS.md) for the technical spec and [`ROADMAP.md`](./ROADMAP.md) for build progress.

## Quickstart

Requires **either** [Docker](https://docs.docker.com/get-docker/) (with the Compose plugin) **or** [Podman](https://podman.io/) (with `podman-compose` or the `podman compose` plugin) — the same `docker-compose.yml` works with both.

```bash
cp .env.example .env      # fill in real secrets before deploying anywhere but localhost
docker compose up --build # or: podman compose up --build
```

Then open:

* Frontend — http://localhost:5173
* Backend health check — http://localhost:5000/health

`docker-compose.override.yml` is auto-merged and enables hot reload (bind mounts) for local dev.

### Using Podman

On SELinux-enforcing hosts (e.g. Fedora), bind-mounted volumes need an SELinux label to be readable/writable inside the container — the compose override already sets `:z` (shared label, since both the `backend` and `frontend` containers need concurrent access to their own mount), so no extra flags are needed.

If `podman compose` fails to connect, make sure the Podman API socket is running:

```bash
systemctl --user start podman.socket
```

## HTTPS / "prod" profile

A `proxy` service (Caddy) terminates real TLS in front of the dev services, for exercising the `Secure`-cookie / rate-limiting / CSRF hardening described in `ROADMAP.md` M6 without a real domain. It's opt-in via a compose profile and **excludes the dev override** (so the frontend serves through Vite's dev server, not a production build):

```bash
VITE_API_URL=https://localhost:8443 CORS_ORIGINS=http://localhost:5173,https://localhost:8443 \
  podman compose -f docker-compose.yml --profile prod up --build
```

Then open https://localhost:8443 (accept the self-signed cert warning — Caddy's internal CA isn't in your system trust store). On a rootful/production host, set `PROXY_PORT=443` to bind the standard port instead.

## Stopping

```bash
docker compose down   # or: podman compose down
```
