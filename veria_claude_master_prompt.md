# Master Prompt for Claude Code (Veria repo)

**System intent:** You are a senior platform engineer working in the `PROACTIVA-US/Veria` monorepo. Make minimal, production-sane changes. Use pnpm workspaces. Add new services, domain packs, Blitzy integration, and Gateway routes. Open PRs.

**Do exactly the following:**

---

### 0) Branch
1. Create a new branch in Veria:  
   ```
   git checkout -b feat/blitzy-vislzr-integration
   ```

---

### 1) Add Blitzy files (repo root)
- Create `.blitzyignore` in the repo root with:
  ```
  node_modules/
  **/node_modules/
  **/.env
  .env*
  infra/secrets/
  **/dist/
  **/.turbo/
  **/.next/
  **/build/
  **/*.log
  ```
- Add `docs/BLITZY_RUNBOOK.md` (deployment instructions).
- Add `docs/INTEGRATION_GUIDE.md` (summarize Gateway, services, domain packs).
- Add `docs/USAGE_METERS.md` (simple counters for usage).

---

### 2) Add new services under `services/`

#### graph-service
- Language: Node 20 + Express + Prisma 5.22 + Postgres.
- Include:
  - `services/graph-service/package.json` (scripts: dev, build, start, migrate, generate).
  - `tsconfig.json`.
  - `prisma/schema.prisma` with models: `Node`, `Edge`, `Milestone` (org-scoped).
  - `src/index.ts`, `src/routes/{nodes.ts,edges.ts,milestones.ts}`, `src/ws/graphSocket.ts`, `src/utils/validate.ts`.
  - `.env.example` with `GRAPH_DB_URL=` and `PORT=4000`.

#### ai-broker
- Node 20 + Express + zod.
- Include:
  - `services/ai-broker/package.json`, `tsconfig.json`.
  - `src/index.ts`, `src/routes/suggest.ts`, `src/utils/schema.ts`.
  - Providers: `src/providers/{openai.ts,anthropic.ts,gemini.ts,local.ts}`.
  - `.env.example` with AI keys and `PORT=4001`.

**Workspace config:**  
Update `pnpm-workspace.yaml` to include `services/*` and `packages/*`.

---

### 3) Add Domain Packs
Under `packages/domain-packs/`:

- `accounting/manifest.json` with nodeTypes (`Client`, `Engagement`, `KYCCase`), edgeKinds (`engages`, `complies_with`, `violates`), prompts (`suggestOnboarding`, `flagAml`).
- `ide/manifest.json` with nodeTypes (`Repo`, `Module`, `Test`), edgeKinds (`depends_on`, `builds`, `deploys_to`, `triggers`), prompts (`suggestRefactor`, `genTests`).

---

### 4) Gateway integration
Patch the gateway to add:

```ts
app.use('/graph',    proxy({ target: process.env.GRAPH_SERVICE_URL || 'http://graph-service:4000', changeOrigin: true }));
app.use('/ai/graph', proxy({ target: process.env.AI_BROKER_URL    || 'http://ai-broker:4001',     changeOrigin: true }));
app.use('/ws/graph', proxy({ target: process.env.GRAPH_SERVICE_WS_URL || 'ws://graph-service:4000', ws: true, changeOrigin: true }));

app.use('/packs', express.static(path.resolve(process.cwd(), 'packages/domain-packs')));
```

---

### 5) Verify local build
Run:
```
pnpm install
pnpm -r build
```
Ensure both new services typecheck and build cleanly.

---

### 6) Commit and push
```
git add services/graph-service services/ai-broker packages/domain-packs docs .blitzyignore
git commit -m "feat: add graph-service, ai-broker, domain packs, gateway integration, blitzy files"
git push origin feat/blitzy-vislzr-integration
```

Open a PR titled:
```
feat: Blitzy + Vislzr integration (graph-service, ai-broker, domain packs, gateway)
```

---

### 7) Success criteria
Claude should confirm in the PR description that:
- `graph-service` and `ai-broker` compile and run.
- Gateway proxies `/graph`, `/ai/graph`, `/ws/graph`, and serves `/packs/*`.
- Domain pack manifests (`accounting`, `ide`) load correctly.
- `.blitzyignore` and docs are in repo root.
- Ready for Blitzy to provision DB, inject secrets, and deploy.