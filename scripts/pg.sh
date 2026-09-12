#!/usr/bin/env bash
# Lokální Postgres bez Dockeru a bez rootu.
#
# Cluster běží pod přihlášeným uživatelem v ~/.local/share/samet-larp/pgdata
# na portu 5433 (stejný port jako docker-compose.yml, aby .env platilo pro obojí).
# Autentizace je `trust` na loopbacku — je to lokální vývojová databáze,
# heslo v DATABASE_URL server ignoruje.
#
# Použití: scripts/pg.sh init | start | stop | status | psql
set -euo pipefail

ROOT="${SAMET_PG_ROOT:-$HOME/.local/share/samet-larp}"
PGDATA="$ROOT/pgdata"
LOG="$ROOT/server.log"
PORT=5433
USER_NAME=larp
DB_NAME=samet_larp

case "${1:-}" in
  init)
    mkdir -p "$ROOT"
    if [ -f "$PGDATA/PG_VERSION" ]; then
      echo "Cluster už existuje: $PGDATA"
    else
      initdb -D "$PGDATA" -U "$USER_NAME" --auth-local=trust --auth-host=trust -E UTF8
    fi
    "$0" start
    if ! psql -h 127.0.0.1 -p "$PORT" -U "$USER_NAME" -d postgres -tc \
        "select 1 from pg_database where datname='$DB_NAME'" | grep -q 1; then
      createdb -h 127.0.0.1 -p "$PORT" -U "$USER_NAME" "$DB_NAME"
      echo "Databáze $DB_NAME založena."
    fi
    ;;
  start)
    pg_ctl -D "$PGDATA" -l "$LOG" \
      -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" start -w
    ;;
  stop)
    pg_ctl -D "$PGDATA" stop -w
    ;;
  status)
    pg_ctl -D "$PGDATA" status
    ;;
  psql)
    shift
    psql -h 127.0.0.1 -p "$PORT" -U "$USER_NAME" -d "$DB_NAME" "$@"
    ;;
  *)
    echo "Použití: scripts/pg.sh init | start | stop | status | psql" >&2
    exit 1
    ;;
esac
