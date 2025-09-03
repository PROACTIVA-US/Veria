
SHELL := /bin/zsh

.PHONY: help setup lint test build docker-up docker-down cf-run api

help:
	@echo "Common targets:"
	@echo "  setup      - bootstrap dev env (python + node + hooks)"
	@echo "  lint       - run linters (ruff + mypy + eslint)"
	@echo "  test       - run unit tests"
	@echo "  build      - docker build images"
	@echo "  docker-up  - compose up -d"
	@echo "  docker-down- compose down"
	@echo "  cf-run     - run a devassist example"
	@echo "  api        - start FastAPI locally"

setup:
	./scripts/setup_mac.sh

lint:
	poetry run ruff check packages/compliance_middleware
	poetry run mypy packages/compliance_middleware
	npx eslint packages/edge_proxy --ext .ts,.js

test:
	poetry run pytest -q

build:
	docker build -t compliance-mw:dev -f infra/docker/compliance.Dockerfile .

docker-up:
	docker compose up -d

docker-down:
	docker compose down

cf-run:
	devassist run devassist/flows/composer/01_bootstrap.yaml

api:
	poetry run uvicorn packages.compliance_middleware.app:app --reload --port 8000
