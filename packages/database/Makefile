# Database Package Makefile

.PHONY: help setup install migrate seed test clean reset health

# Variables
PYTHON := python3
PIP := pip3
DATABASE_URL := postgresql://veria:veria123@localhost:5432/veria

help:
	@echo "Available commands:"
	@echo "  make setup      - Set up Python virtual environment"
	@echo "  make install    - Install dependencies"
	@echo "  make migrate    - Run database migrations"
	@echo "  make seed       - Seed database with test data"
	@echo "  make test       - Run tests"
	@echo "  make clean      - Clean up generated files"
	@echo "  make reset      - Reset database (DROP ALL TABLES)"
	@echo "  make health     - Check database health"

setup:
	$(PYTHON) -m venv venv
	@echo "Virtual environment created. Run 'source venv/bin/activate' to activate"

install:
	$(PIP) install -r requirements.txt
	@echo "Dependencies installed"

migrate:
	@echo "Creating database schema..."
	$(PYTHON) init_db.py
	@echo "Database initialized"

migration-new:
	@read -p "Enter migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

migration-up:
	alembic upgrade head

migration-down:
	alembic downgrade -1

seed:
	$(PYTHON) -c "from init_db import seed_development_data; seed_development_data()"
	@echo "Database seeded with development data"

test:
	pytest tests/ -v --cov=. --cov-report=term-missing

test-models:
	pytest tests/test_models.py -v

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov

reset:
	@echo "⚠️  WARNING: This will DROP ALL TABLES!"
	@read -p "Are you sure? Type 'yes' to continue: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(PYTHON) -c "from connection import db_manager; db_manager.drop_all_tables(); print('Database reset complete')"; \
	else \
		echo "Reset cancelled"; \
	fi

health:
	@$(PYTHON) -c "from connection import check_database_health; import json; print(json.dumps(check_database_health(), indent=2))"

# Docker commands
docker-up:
	docker run --name veria-postgres \
		-e POSTGRES_USER=veria \
		-e POSTGRES_PASSWORD=veria123 \
		-e POSTGRES_DB=veria \
		-p 5432:5432 \
		-d postgres:14

docker-stop:
	docker stop veria-postgres

docker-rm:
	docker rm veria-postgres

docker-logs:
	docker logs veria-postgres

# Development shortcuts
dev: docker-up install migrate
	@echo "Development environment ready!"

.DEFAULT_GOAL := help
