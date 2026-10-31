#!/usr/bin/env bash
# Starts a throwaway Postgres, applies every migration, runs the row-level security tests.
set -euo pipefail

if [ "$(id -u)" = "0" ]; then
  command -v runuser >/dev/null || { echo "run as a non-root user"; exit 1; }
  exec runuser -u postgres -- bash "$0" "$@"
fi

HERE="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || { echo "Postgres binaries not found; set PGBIN"; exit 1; }

DIR="$(mktemp -d)"
PORT=54329
cleanup() { "$PGBIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
PSQL=("$PGBIN/psql" -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -c "CREATE DATABASE rlstest" >/dev/null
PSQL+=(-d rlstest)
for m in "$HERE"/prisma/migrations/*/migration.sql; do "${PSQL[@]}" -f "$m" >/dev/null; done
"${PSQL[@]}" -f "$HERE/scripts/rls-test.sql"
