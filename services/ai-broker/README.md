# AI Broker (Veria)

Provider-agnostic endpoint for graph suggestions. Supports OpenAI, Anthropic,
Gemini, and a deterministic local fallback.

## Routes
- `POST /ai/graph/suggest` → `{ nodes, edges, explanations }`

## Env
- `OPENAI_API_KEY`, optional `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`
- `GOOGLE_API_KEY` (Gemini)
- `PORT` (default 4001)

## Dev
```bash
pnpm install
pnpm dev
```
