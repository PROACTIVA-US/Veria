# Veria Investor Portal

Read-only investor/client portal for portfolio viewing, KYC status, and statement access.

## Features

- Portfolio summary view (positions, cash, NAV)
- KYC status tracking
- Statement downloads
- Transfer requests (flag-gated)

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start
```

## Feature Flag

The portal is controlled by the `FEATURE_INVESTOR_PORTAL` environment variable:
- `false` (default): Portal is hidden and routes return 404
- `true`: Portal is accessible with preview banner

## API Integration

The app proxies API calls to the gateway at `/api/investor/*`:
- `GET /api/investor/portfolio`
- `GET /api/investor/kyc`
- `GET /api/investor/statements`
- `POST /api/investor/transfers/request` (flag-gated)

## Authentication

JWT-based authentication with role-based access control:
- Roles: `investor`, `client`, `admin`
- Scopes: `portfolio:read`, `kyc:read`, `statements:read`

## Deployment

The app is containerized and deployed to Cloud Run:
- Dev: `veria-investor-dev`
- Staging: `veria-investor-staging`
- Prod: `veria-investor` (flag OFF by default)# Trigger rebuild
