# Veria — Bundle 10 (CI + Dockerfiles)

Adds:
- GitHub Actions CI (install, typecheck, unit tests)
- Minimal Dockerfiles for all services + frontend
- Optional `infra/docker-compose.prod.yml` to run built images locally

Quick start:
```bash
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml up
```
