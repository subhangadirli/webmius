#!/usr/bin/env bash
# One-command Heroku deploy for Webmius.
#
#   ./deploy/heroku.sh <app-name> [branch]
#
# Creates the Heroku app, provisions Heroku Postgres, generates and sets
# SECRET_KEY/ENCRYPTION_KEY, pushes the current branch (frontend is built
# automatically during slug compilation), and opens the running app.
#
# Requires: the Heroku CLI (https://devcenter.heroku.com/articles/heroku-cli),
# git, and push access to the app.
set -euo pipefail

APP="${1:?usage: ./deploy/heroku.sh <app-name> [branch]}"
BRANCH="${2:-main}"

command -v heroku >/dev/null 2>&1 || {
  echo "error: Heroku CLI not found - https://devcenter.heroku.com/articles/heroku-cli" >&2
  exit 1
}
command -v git >/dev/null 2>&1 || { echo "error: git not found" >&2; exit 1; }

gen_secret() {
  python3 -c 'import secrets; print(secrets.token_hex(32))' 2>/dev/null \
    || openssl rand -hex 32
}

if heroku apps:info "$APP" >/dev/null 2>&1; then
  echo "==> App '$APP' already exists; skipping create/addon/config."
else
  echo "==> Creating app '$APP'..."
  heroku apps:create "$APP" --stack heroku-24

  echo "==> Provisioning Heroku Postgres (sets DATABASE_URL)..."
  heroku addons:create heroku-postgresql:essential -a "$APP"

  echo "==> Setting config vars..."
  heroku config:set -a "$APP" \
    SECRET_KEY="$(gen_secret)" \
    ENCRYPTION_KEY="$(gen_secret)" \
    FLASK_ENV=production
fi

echo "==> Wiring git remote..."
git remote remove heroku >/dev/null 2>&1 || true
heroku git:remote -a "$APP"

echo "==> Pushing $BRANCH (frontend builds automatically)..."
git push heroku "$BRANCH"

echo "==> Pointing FRONTEND_URL at the app's public URL (for emailed links)..."
WEB_URL="$(heroku apps:info -a "$APP" | awk '/Web URL:/ {print $3}')"
if [ -n "${WEB_URL:-}" ]; then
  heroku config:set -a "$APP" FRONTEND_URL="$WEB_URL"
else
  echo "warning: could not read Web URL; set FRONTEND_URL manually if using email features." >&2
fi

echo "==> Done. Opening $WEB_URL"
heroku open -a "$APP"
