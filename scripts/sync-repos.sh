#!/bin/sh
echo "$(date): Checking for updates..."
for repo in /repos/*.git; do
  if [ -d "$repo" ]; then
    echo "Updating $repo..."
    cd "$repo" && git remote update --prune
  fi
done
# Trigger Redmine changeset fetch if REDMINE_API_KEY is configured.
# Set REDMINE_API_KEY in .env (Administration > Settings > Repositories > API key).
if [ -n "${REDMINE_API_KEY:-}" ]; then
  echo "Triggering Redmine changeset fetch..."
  # We use 'redmine' as the hostname since it's the service name in docker-compose.
  # We set the Host header to 'localhost' to bypass Rails Host Authorization in development.
  curl -s -H "Host: localhost" "http://redmine:3000/sys/fetch_changesets?key=${REDMINE_API_KEY}"
else
  echo "Skipping changeset fetch (REDMINE_API_KEY not set)."
fi
echo "$(date): Done."
