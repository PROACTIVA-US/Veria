# Veria Database Package

Core database layer for the Veria RWA distribution platform.

## 📋 Overview

This package provides:
- PostgreSQL database schema
- SQLAlchemy ORM models
- Alembic migrations
- Connection pooling
- Redis caching
- Database utilities

## 🚀 Quick Start

### 1. Start PostgreSQL

Using Docker:
```bash
make docker-up
```

Or use existing PostgreSQL and update `.env`:
```bash
cp .env.example .env
# Edit DATABASE_URL in .env
```

### 2. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Initialize Database

```bash
# Create all tables and seed data
python init_db.py

# Or use make
make migrate
```

## 📊 Database Schema

### Core Tables

- **organizations** - Issuers, distributors, investors
- **users** - Individual users within organizations  
- **products** - Tokenized assets (treasuries, MMFs)
- **transactions** - All blockchain and fiat transactions
- **holdings** - User token balances
- **compliance_rules** - Configurable compliance requirements
- **compliance_verifications** - KYC/KYB records
- **audit_logs** - Immutable audit trail
- **sessions** - User authentication sessions
- **notifications** - Notification queue

### Relationships

```
Organization (1) ─── (N) Users
     │
     └──── (N) Products
                  │
                  ├──── (N) Transactions
                  ├──── (N) Holdings
                  └──── (N) Compliance Rules
```

## 🔧 Configuration

Environment variables (`.env`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/veria
REDIS_URL=redis://localhost:6379/0
ENVIRONMENT=development
```

## 📝 Usage

### Basic Operations

```python
from database.connection import get_db
from database.models import User, Product

# Get database session
with get_db() as db:
    # Query users
    users = db.query(User).filter_by(role="investor").all()
    
    # Create product
    product = Product(
        name="US Treasury Token",
        symbol="USTT",
        asset_type="treasury"
    )
    db.add(product)
    db.commit()
```

### Connection Management

```python
from database.connection import DatabaseManager

# Create manager
db_manager = DatabaseManager()

# Check health
if db_manager.health_check():
    print("Database is healthy")

# Execute raw SQL
result = db_manager.execute_raw_sql(
    "SELECT COUNT(*) FROM users WHERE role = :role",
    {"role": "investor"}
)
```

## 🧪 Testing

Run all tests:
```bash
make test
```

Run specific tests:
```bash
pytest tests/test_models.py -v
```

Check coverage:
```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

## 📦 Migrations

### Create New Migration

```bash
alembic revision --autogenerate -m "Add new table"
```

### Apply Migrations

```bash
alembic upgrade head
```

### Rollback Migration

```bash
alembic downgrade -1
```

## 🛠️ Makefile Commands

```bash
make help       # Show all commands
make setup      # Create virtual environment
make install    # Install dependencies
make migrate    # Initialize database
make seed       # Add test data
make test       # Run tests
make clean      # Clean temporary files
make reset      # DROP all tables (careful!)
make health     # Check database status
```

## 📐 Model Examples

### Create Organization and User

```python
from database.models import Organization, User

org = Organization(
    name="Acme Fund",
    type="investor",
    jurisdiction="US",
    kyb_status="approved"
)

user = User(
    organization=org,
    email="john@acmefund.com",
    role="investor",
    kyc_status="approved"
)
```

### Record Transaction

```python
from database.models import Transaction

tx = Transaction(
    type="subscription",
    status="pending",
    from_user_id=user.id,
    product_id=product.id,
    amount=Decimal("10000.00"),
    token_amount=Decimal("10000.00")
)
```

### Add Compliance Rule

```python
from database.models import ComplianceRule

rule = ComplianceRule(
    name="US Investors Only",
    rule_type="jurisdiction",
    product_id=product.id,
    conditions={"allowed": ["US"]},
    is_active=True
)
```

## 🔐 Security Features

- UUID primary keys
- Encrypted PII fields (coming soon)
- Row-level security (RLS)
- Audit logging for all changes
- Connection pooling with limits
- Prepared statements only

## 📊 Performance

- Connection pool: 20 connections
- Query timeout: 30 seconds
- Index on all foreign keys
- Partitioned audit logs (planned)
- Redis caching for hot data

## 🐛 Troubleshooting

### Cannot connect to database

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://veria:veria123@localhost:5432/veria -c "SELECT 1"

# Check logs
docker logs veria-postgres
```

### Migration errors

```bash
# Reset migrations
alembic downgrade base
alembic upgrade head

# Or full reset
make reset
make migrate
```

### Test failures

```bash
# Run with verbose output
pytest tests/ -vvs

# Check specific test
pytest tests/test_models.py::TestUser::test_create_user -v
```

## 📚 Documentation

- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Alembic Docs](https://alembic.sqlalchemy.org/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## 🤝 Contributing

1. Create feature branch
2. Add tests for new features
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

---

**Sprint 1 - Database Foundation**
Week 1 of 8 towards MVP
