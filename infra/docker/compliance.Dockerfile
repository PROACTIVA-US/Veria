
FROM python:3.11-slim

WORKDIR /app
COPY packages/compliance_middleware /app/packages/compliance_middleware
COPY pyproject.toml poetry.lock* README.md /app/

RUN pip install --no-cache-dir poetry &&     poetry config virtualenvs.create false &&     poetry install --no-interaction --no-ansi --no-root

EXPOSE 8000
CMD ["uvicorn", "packages.compliance_middleware.app:app", "--host", "0.0.0.0", "--port", "8000"]
