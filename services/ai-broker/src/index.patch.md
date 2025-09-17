# How to register middleware (apply to your Express app)

```ts
import express from 'express';
import { policyEngine } from './middleware/policyEngine';
import { provenanceLogger } from './middleware/provenance';
import fs from 'fs/promises';

const app = express();

async function loadPolicy() {
  const raw = await fs.readFile(process.env.POLICY_PATH || 'policy/policy.example.json','utf8');
  return JSON.parse(raw);
}

app.use(provenanceLogger());
app.use(await policyEngine(loadPolicy));

// ... your existing routes

export default app;
```
