# Database Schema

The current database schema has been moved to:

**📁 Location**: [`packages/database/schemas/core.sql`](../packages/database/schemas/core.sql)

## Quick Reference

### Core Tables (12 total):
- `organizations` - Issuers, distributors, investors
- `users` - Individual users with KYC/KYB
- `products` - Tokenized assets (treasuries, MMFs)
- `transactions` - Blockchain and fiat transactions
- `holdings` - User token balances
- `compliance_rules` - Configurable compliance
- `compliance_verifications` - KYC/KYB records
- `audit_logs` - Immutable audit trail
- `sessions` - Authentication sessions
- `notifications` - Notification queue
- `product_documents` - Disclosures and documents
- `transaction_approvals` - Approval workflow

### SQLAlchemy Models:
See [`packages/database/models.py`](../packages/database/models.py)

### Documentation:
See [`packages/database/README.md`](../packages/database/README.md)

---
*Schema version: 1.0.0*
*Last updated: September 7, 2025*
