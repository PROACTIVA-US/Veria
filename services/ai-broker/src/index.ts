import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import suggestRouter from './routes/suggest.js';
import { policyEngine, PolicyRuleset } from './middleware/policyEngine.js';
import { provenanceLogger } from './middleware/provenance.js';
import fs from 'fs/promises';

const PORT = Number(process.env.PORT || 4001);

// Policy caching mechanism
let cachedPolicy: PolicyRuleset | null = null;
let policyLoadTime = 0;
const POLICY_CACHE_TTL = 60000; // 1 minute cache

async function loadPolicy(): Promise<PolicyRuleset> {
  const now = Date.now();
  if (!cachedPolicy || (now - policyLoadTime) > POLICY_CACHE_TTL) {
    try {
      const policyPath = process.env.POLICY_PATH || 'policy/policy.example.json';
      const raw = await fs.readFile(policyPath, 'utf8');
      cachedPolicy = JSON.parse(raw);
      policyLoadTime = now;
      console.log(`Policy loaded from ${policyPath}`);
    } catch (error) {
      console.error('Failed to load policy:', error);
      // Return a default restrictive policy on error
      return {
        version: 'error-fallback',
        jurisdictions: {},
        quotas: { default: { rps: 1, burst: 2 } },
        redaction: { fields: [], rules: [] }
      };
    }
  }
  return cachedPolicy!;
}

// Initialize app and middleware in async context
async function initializeApp() {
  const app = express();

  // == Veria Policy/Provenance (Agent-Era) ==
  app.use(provenanceLogger());
  app.use(await policyEngine(loadPolicy));
  // == /Veria Policy/Provenance ==

  // Middleware
  app.use(express.json({ limit: '2mb' }));
  app.use(cors());
  app.use(helmet());
  app.use(morgan('dev'));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'ai-broker', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/ai/graph', suggestRouter);

  // Error handler (4 parameters required for Express error middleware)
  app.use((err: Error, _req: Request, res: Response, _next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 ai-broker service listening on port ${PORT}`);
  });
}

// Start the application
initializeApp().catch(console.error);