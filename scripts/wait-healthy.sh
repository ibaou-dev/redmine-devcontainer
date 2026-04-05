#!/usr/bin/env bash
# scripts/wait-healthy.sh <service-label> <port> [timeout-seconds]
# Polls http://localhost:<port>/ until a 2xx/3xx response or timeout.
# Used by setup.sh and the test target in Makefile.
set -euo pipefail

SERVICE="${1:-redmine}"
PORT="${2:-4000}"
TIMEOUT="${3:-120}"
ELAPSED=0

echo "Waiting for ${SERVICE} on port ${PORT} (timeout: ${TIMEOUT}s)..."

until curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" 2>/dev/null \
    | grep -qE '^[23]'; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo ""
    echo "ERROR: Timed out waiting for ${SERVICE} on port ${PORT} after ${TIMEOUT}s."
    echo "Check logs with: docker compose -f docker-compose.yml -f docker-compose.local.yml logs redmine"
    exit 1
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  printf "  ...%ds\r" "$ELAPSED"
done

echo "  ${SERVICE} is ready at http://localhost:${PORT}"
