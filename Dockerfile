# Webui til dnd-scripts. Kun Flask og PyYAML: webui'en laver HTML, ikke PDF,
# så Playwright/Chromium er bevidst ikke med (se scripts/pdf/README.md til CLI-PDF).
# Python 3.12 er nødvendig: scripts/karakterark bruger f-strings, der kræver det.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY webui/requirements.txt ./webui/requirements.txt
RUN pip install --no-cache-dir -r webui/requirements.txt

COPY . .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/', timeout=3)" || exit 1

CMD ["python", "webui/app.py"]
