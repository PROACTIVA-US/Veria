# Veria API Documentation

## Authentication
All API requests require authentication via JWT tokens.

## Endpoints

### Asset Management
- `POST /api/assets/tokenize` - Tokenize a real world asset
- `GET /api/assets/{id}` - Get asset details
- `PUT /api/assets/{id}` - Update asset metadata

### Treasury Operations
- `POST /api/treasury/deposit` - Deposit funds
- `POST /api/treasury/withdraw` - Withdraw funds
- `GET /api/treasury/balance` - Get treasury balance

### Compliance
- `POST /api/compliance/kyc` - Submit KYC information
- `GET /api/compliance/status/{userId}` - Check compliance status
- `POST /api/compliance/verify` - Verify transaction compliance

### DeFi Integration
- `POST /api/defi/stake` - Stake tokens
- `POST /api/defi/provide-liquidity` - Provide liquidity
- `GET /api/defi/yields` - Get current yields
