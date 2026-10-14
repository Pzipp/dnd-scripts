#!/bin/sh
# Bygger mapcreator-klienten til webui/static/mapcreator/ i en Node-container (Node behøver ikke være på værten).
# Brug: ./build-docker.sh [build|dev|check|test]   (standard: build; dev = vite build --watch)
set -e
cd "$(dirname "$0")"
exec docker run --rm --name dnd-mapcreator-build -u "$(id -u):$(id -g)" \
  -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
  -v "$PWD/..:/repo" -w /repo/mapcreator node:24-slim \
  sh -c "[ -d node_modules ] || { if [ -f package-lock.json ]; then npm ci; else npm install; fi; }; npm run ${1:-build}"
