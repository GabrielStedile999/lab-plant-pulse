FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY apps/simulator/pyproject.toml apps/simulator/uv.lock ./
RUN uv sync --frozen --no-dev
COPY apps/simulator/simulator ./simulator
COPY infra/machines.json ./machines.json
ENV MACHINES_FILE=/app/machines.json PYTHONUNBUFFERED=1
CMD ["uv", "run", "--no-sync", "python", "-m", "simulator"]