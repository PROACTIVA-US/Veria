# Veria Setup Instructions

## Install Dependencies
```bash
npm install -g pnpm
pnpm install
```

## Database Setup
```bash
createdb veria_dev
cd packages/database
pnpm prisma migrate dev
pnpm prisma generate
cd ../..
```

## Environment Setup
```bash
cp .env.example .env
```

## Build Project
```bash
pnpm run build:packages
pnpm run build
```

## Run Development
```bash
pnpm run dev
```

## Service Ports
- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- Services run on ports 4001-4005

## Tech Stack
- Node.js 18+, TypeScript
- Next.js 14 (frontend)
- PostgreSQL, Prisma ORM
- pnpm monorepo

## Notes
- This is a monorepo using pnpm workspaces
- Frontend is in /apps/compliance-dashboard
- Backend services in /services/*
- Build packages before services
- All services connect through the Gateway
