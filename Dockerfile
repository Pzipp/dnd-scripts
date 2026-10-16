# Trin 1: kortbyggerens klient (TypeScript + Svelte) bygges med Node. Node kommer ikke med i det endelige image.
FROM node:24-slim AS mapcreator-build
WORKDIR /build
COPY mapcreator/package.json mapcreator/package-lock.json ./
RUN npm ci
COPY mapcreator/ ./
ENV MAPCREATOR_OUT=/out
RUN npm run build

# Webui til dnd-scripts: HTML og PDF. PDF laves med Playwright + Chromium (scripts/pdf/).
# Python 3.12 er nødvendig: scripts/karakterark bruger f-strings, der kræver det.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    # Chromium ligger i en fælles mappe, så brugeren (uid 1000) også kan starte den.
    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    HOME=/tmp

WORKDIR /app

COPY requirements.txt ./requirements.txt
COPY webui/requirements.txt ./webui/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -r webui/requirements.txt \
    && playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

COPY . .
COPY --from=mapcreator-build /out /app/webui/static/mapcreator

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/', timeout=3)" || exit 1

CMD ["python", "webui/app.py"]
