# Graph Service (Veria)

A lightweight REST + WebSocket service for storing and streaming graph data
(nodes, edges, milestones) with org-level multi-tenancy.

## Quick start (local)

```bash
cp .env.example .env   # set GRAPH_DB_URL to your Postgres
pnpm install
pnpm generate
npx prisma migrate dev --name init
pnpm dev
```

- REST base: `http://localhost:4000/graph`
- WS: `ws://localhost:4000/ws/graph?org=your-org`

## Env

- `PORT` (default 4000)
- `GRAPH_DB_URL=postgresql://user:pass@host:5432/graph`

## Tenancy

The gateway should inject `X-Org-Id` header; this starter uses `demo-org` if absent.
Mask PII at the serializer layer before returning data to clients.
