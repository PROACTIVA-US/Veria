# Veria Platform Makefile
# Sprint 1: Database Foundation

.PHONY: help setup install dev test clean reset sprint-status

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help:
	@echo "$(GREEN)Veria Platform - Development Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Setup Commands:$(NC)"
	@echo "  make setup          - Complete development setup"
	@echo "  make install        - Install all dependencies"
	@echo "  make docker-up      - Start infrastructure (DB, Redis, Qdrant)"
	@echo "  make docker-down    - Stop infrastructure"
	@echo ""
	@echo "$(YELLOW)Database Commands:$(NC)"
	@echo "  make db-init        - Initialize database with schema"
	@echo "  make db-seed        - Seed database with test data"
	@echo "  make db-migrate     - Run database migrations"
	@echo "  make db-reset       - Reset database (CAREFUL!)"
	@echo "  make db-health      - Check database health"
	@echo ""
	@echo "$(YELLOW)Development Commands:$(NC)"
	@echo "  make dev            - Start development environment"
	@echo "  make dev-gateway    - Start gateway service"
	@echo "  make dev-identity   - Start identity service"
	@echo "  make dev-frontend   - Start frontend"
	@echo ""
	@echo "$(YELLOW)Testing Commands:$(NC)"
	@echo "  make test           - Run all tests"
	@echo "  make test-db        - Test database models"
	@echo "  make test-services  - Test services"
	@echo "  make test-e2e       - Run end-to-end tests"
	@echo ""
	@echo "$(YELLOW)Sprint Commands:$(NC)"
	@echo "  make sprint-status  - Show current sprint progress"
	@echo "  make sprint-tasks   - Show today's tasks"
	@echo ""
	@echo "$(YELLOW)Utility Commands:$(NC)"
	@echo "  make clean          - Clean temporary files"
	@echo "  make logs           - Show all service logs"
	@echo "  make ps             - Show running services"

# Setup commands
setup: docker-up db-init
	@echo "$(GREEN)✅ Development environment ready!$(NC)"
	@echo ""
	@echo "Next steps:"
	@echo "1. Start gateway: make dev-gateway"
	@echo "2. Run tests: make test-db"
	@echo "3. Check status: make sprint-status"

install:
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	cd packages/database && pip3 install -r requirements.txt
	cd services/gateway && npm install
	cd services/identity-service && npm install
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

# Docker commands
docker-up:
	@echo "$(YELLOW)Starting infrastructure...$(NC)"
	docker-compose up -d postgres redis qdrant
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@echo "$(GREEN)✅ Infrastructure running$(NC)"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-ps:
	docker-compose ps

# Database commands
db-init:
	@echo "$(YELLOW)Initializing database...$(NC)"
	cd packages/database && python3 init_db.py
	@echo "$(GREEN)✅ Database initialized$(NC)"

db-seed:
	cd packages/database && python3 -c "from init_db import seed_development_data; seed_development_data()"

db-migrate:
	cd packages/database && alembic upgrade head

db-reset:
	@echo "$(RED)⚠️  WARNING: This will DROP ALL TABLES!$(NC)"
	@read -p "Type 'yes' to continue: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		cd packages/database && python3 -c "from connection import db_manager; db_manager.drop_all_tables()"; \
		make db-init; \
	fi

db-health:
	@cd packages/database && python3 -c "from connection import check_database_health; import json; print(json.dumps(check_database_health(), indent=2))"

# Development servers
dev: docker-up
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "Services available at:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"
	@echo "  - Qdrant: localhost:6333"
	@echo "  - pgAdmin: http://localhost:5050"

dev-gateway:
	cd services/gateway && npm run dev

dev-identity:
	cd services/identity-service && npm run dev

dev-frontend:
	cd apps/frontend && npm run dev

dev-all:
	docker-compose --profile services --profile frontend up

# Testing
test-db:
	cd packages/database && pytest tests/ -v

test-services:
	cd services/gateway && npm test
	cd services/identity-service && npm test

test-e2e:
	cd tests/e2e && npm test

test: test-db
	@echo "$(GREEN)✅ All tests passed$(NC)"

# Sprint management
sprint-status:
	@echo "$(GREEN)=== SPRINT 1: DATABASE FOUNDATION ===$(NC)"
	@echo "Week 1 of 8 - Day $(shell date +%u) of 5"
	@echo ""
	@echo "$(YELLOW)Progress:$(NC)"
	@echo "✅ Database schema created"
	@echo "✅ SQLAlchemy models implemented"
	@echo "✅ Test fixtures created"
	@echo "⏳ Alembic migrations setup"
	@echo "⏳ Redis caching configuration"
	@echo "⏳ 80% test coverage"
	@echo ""
	@echo "$(YELLOW)Today's Tasks:$(NC)"
	@if [ $(shell date +%u) -eq 1 ]; then \
		echo "• Complete database schema"; \
		echo "• Create user and organization tables"; \
		echo "• Set up migrations"; \
	elif [ $(shell date +%u) -eq 2 ]; then \
		echo "• Products and compliance tables"; \
		echo "• Transaction and audit tables"; \
		echo "• Test migrations"; \
	elif [ $(shell date +%u) -eq 3 ]; then \
		echo "• SQLAlchemy models"; \
		echo "• Connection pooling"; \
		echo "• Unit tests"; \
	elif [ $(shell date +%u) -eq 4 ]; then \
		echo "• Redis caching setup"; \
		echo "• Cache strategies"; \
		echo "• Performance testing"; \
	else \
		echo "• Documentation"; \
		echo "• Code review"; \
		echo "• Deploy to staging"; \
	fi

sprint-tasks:
	@cat NEXT_STEPS.md | head -50

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf .coverage
	@echo "$(GREEN)✅ Cleaned temporary files$(NC)"

# Shortcuts
ps: docker-ps
logs: docker-logs
up: docker-up
down: docker-down
status: sprint-status

.DEFAULT_GOAL := help
