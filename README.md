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

On SELinux-enforcing hosts (e.g. Fedora), bind-mounted volumes need the `:Z` label to be readable/writable inside the container — the compose override already sets this, so no extra flags are needed.

If `podman compose` fails to connect, make sure the Podman API socket is running:

```bash
systemctl --user start podman.socket
```

## Stopping

```bash
docker compose down   # or: podman compose down
```
