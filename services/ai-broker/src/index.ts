import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Mutex } from 'async-mutex';
import suggestRouter from './routes/suggest.js';
import { policyEngine, PolicyRuleset } from './middleware/policyEngine.js';
import { provenanceLogger } from './middleware/provenance.js';
import fs from 'fs/promises';

const PORT = Number(process.env.PORT || 4001);

// Policy caching mechanism with mutex for thread safety
let cachedPolicy: PolicyRuleset | null = null;
let policyLoadTime = 0;
const POLICY_CACHE_TTL = 60000; // 1 minute cache
const policyMutex = new Mutex();
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadPolicyWithRetry(attempt: number = 1): Promise<PolicyRuleset> {
  try {
    const policyPath = process.env.POLICY_PATH || 'policy/policy.example.json';
    const raw = await fs.readFile(policyPath, 'utf8');
    const policy = JSON.parse(raw);
    console.log(`Policy loaded from ${policyPath} (attempt ${attempt})`);
    return policy;
  } catch (error) {
    console.error(`Failed to load policy (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`, error);

    if (attempt < MAX_RETRY_ATTEMPTS) {
      await sleep(RETRY_DELAY * attempt); // Exponential backoff
      return loadPolicyWithRetry(attempt + 1);
    }

    // Return a default restrictive policy after all retries fail
    console.error('All retry attempts failed, using fallback policy');
    return {
      version: 'error-fallback',
      jurisdictions: {},
      quotas: { default: { rps: 1, burst: 2 } },
      redaction: { fields: [], rules: [] },
      denyList: []
    };
  }
}

async function loadPolicy(): Promise<PolicyRuleset> {
  return policyMutex.runExclusive(async () => {
    const now = Date.now();
    if (!cachedPolicy || (now - policyLoadTime) > POLICY_CACHE_TTL) {
      cachedPolicy = await loadPolicyWithRetry();
      policyLoadTime = now;
    }
    return cachedPolicy!;
  });
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