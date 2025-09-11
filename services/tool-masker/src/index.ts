import Fastify from 'fastify';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Handlebars from 'handlebars';
import { createRedisClient } from '@veria/database';
import { authenticate, authorize, Permission } from '@veria/auth-middleware';
import NodeCache from 'node-cache';
import axios from 'axios';
import { z } from 'zod';
import type Redis from 'ioredis';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Fastify
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Initialize services
const redis: Redis = createRedisClient();
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// Mask configuration interface
interface MaskConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: string[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  template: string;
  providers: {
    primary: ProviderConfig;
    fallback?: ProviderConfig;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

interface ProviderConfig {
  type: 'api' | 'database' | 'mock';
  endpoint?: string;
  apiKey?: string;
  query?: string;
  transform?: string;
}

// Load all mask definitions
const masks = new Map<string, MaskConfig>();

function loadMasks() {
  const masksDir = join(__dirname, 'masks');
  try {
    const files = readdirSync(masksDir).filter(f => f.endsWith('.yaml'));
    
    for (const file of files) {
      const content = readFileSync(join(masksDir, file), 'utf-8');
      const mask = YAML.parse(content) as MaskConfig;
      masks.set(mask.id, mask);
      app.log.info(`Loaded mask: ${mask.id} - ${mask.name}`);
    }
  } catch (error) {
    app.log.warn('No mask definitions found, loading defaults');
    loadDefaultMasks();
  }
}

// Load default masks if no YAML files exist
function loadDefaultMasks() {
  const defaultMasks: MaskConfig[] = [
    {
      id: 'compliance_kyc',
      name: 'KYC Verification',
      description: 'Perform Know Your Customer verification',
      category: 'compliance',
      permissions: ['compliance:write'],
      rateLimit: { requests: 100, window: 60 },
      inputs: {
        user_id: { type: 'string', required: true },
        full_name: { type: 'string', required: true },
        date_of_birth: { type: 'string', format: 'date' },
        ssn_last4: { type: 'string', pattern: '^\\d{4}$' },
        address: { type: 'object' }
      },
      outputs: {
        verified: { type: 'boolean' },
        risk_score: { type: 'number' },
        flags: { type: 'array' }
      },
      template: 'KYC verification for {{full_name}}',
      providers: {
        primary: {
          type: 'api',
          endpoint: process.env.KYC_PROVIDER_URL || 'https://api.chainalysis.com/kyc',
          apiKey: process.env.KYC_API_KEY || 'mock_key'
        },
        fallback: {
          type: 'mock'
        }
      },
      cache: { enabled: true, ttl: 3600 }
    },
    {
      id: 'treasury_yield',
      name: 'Treasury Yield Data',
      description: 'Get current US Treasury yield rates',
      category: 'market_data',
      permissions: ['market:read'],
      inputs: {
        maturity: { type: 'string', enum: ['1M', '3M', '6M', '1Y', '5Y', '10Y', '30Y'] }
      },
      outputs: {
        yield: { type: 'number' },
        date: { type: 'string' },
        change: { type: 'number' }
      },
      template: 'Treasury {{maturity}} yield',
      providers: {
        primary: {
          type: 'api',
          endpoint: 'https://api.treasury.gov/yields',
          transform: 'response.data.observations[0].value'
        }
      },
      cache: { enabled: true, ttl: 900 }
    },
    {
      id: 'order_subscribe_mmfs',
      name: 'Money Market Fund Subscription',
      description: 'Subscribe to money market funds',
      category: 'trading',
      permissions: ['transaction:create'],
      inputs: {
        fund_id: { type: 'string', required: true },
        amount: { type: 'number', required: true, minimum: 1000 },
        currency: { type: 'string', default: 'USD' }
      },
      outputs: {
        order_id: { type: 'string' },
        status: { type: 'string' },
        estimated_shares: { type: 'number' },
        settlement_date: { type: 'string' }
      },
      template: 'Subscribe ${{amount}} to fund {{fund_id}}',
      providers: {
        primary: {
          type: 'api',
          endpoint: process.env.FUND_PROVIDER_URL || 'https://api.blackrock.com/buidl',
          apiKey: process.env.FUND_API_KEY
        }
      }
    },
    {
      id: 'sec_recent_10k',
      name: 'SEC 10-K Filings',
      description: 'Retrieve recent SEC 10-K filings',
      category: 'regulatory',
      permissions: ['regulatory:read'],
      inputs: {
        ticker: { type: 'string', required: true },
        limit: { type: 'number', default: 5 }
      },
      outputs: {
        filings: { type: 'array' },
        company: { type: 'object' }
      },
      template: 'SEC 10-K filings for {{ticker}}',
      providers: {
        primary: {
          type: 'api',
          endpoint: 'https://data.sec.gov/api/xbrl/companyfacts',
          transform: 'response.data.facts'
        }
      },
      cache: { enabled: true, ttl: 3600 }
    },
    {
      id: 'distribution_onboard_client',
      name: 'Client Onboarding',
      description: 'Onboard new distribution client',
      category: 'operations',
      permissions: ['user:write', 'compliance:write'],
      inputs: {
        client_type: { type: 'string', enum: ['individual', 'institutional'] },
        client_data: { type: 'object', required: true }
      },
      outputs: {
        client_id: { type: 'string' },
        onboarding_status: { type: 'string' },
        next_steps: { type: 'array' }
      },
      template: 'Onboard {{client_type}} client',
      providers: {
        primary: {
          type: 'database',
          query: 'INSERT INTO clients (type, data) VALUES ($1, $2) RETURNING *'
        }
      }
    },
    {
      id: 'rwa_tokenize',
      name: 'Tokenize Real World Asset',
      description: 'Create tokenized representation of RWA',
      category: 'blockchain',
      permissions: ['blockchain:write'],
      inputs: {
        asset_type: { type: 'string', required: true },
        value: { type: 'number', required: true },
        metadata: { type: 'object' }
      },
      outputs: {
        token_address: { type: 'string' },
        transaction_hash: { type: 'string' },
        token_id: { type: 'string' }
      },
      template: 'Tokenize {{asset_type}} worth ${{value}}',
      providers: {
        primary: {
          type: 'api',
          endpoint: process.env.BLOCKCHAIN_RPC || 'https://polygon-rpc.com'
        }
      }
    },
    {
      id: 'portfolio_analytics',
      name: 'Portfolio Analytics',
      description: 'Analyze portfolio performance and risk',
      category: 'analytics',
      permissions: ['portfolio:read'],
      inputs: {
        portfolio_id: { type: 'string', required: true },
        metrics: { type: 'array', items: { type: 'string' } }
      },
      outputs: {
        performance: { type: 'object' },
        risk_metrics: { type: 'object' },
        recommendations: { type: 'array' }
      },
      template: 'Analyze portfolio {{portfolio_id}}',
      providers: {
        primary: {
          type: 'database',
          query: 'SELECT * FROM portfolio_analytics WHERE portfolio_id = $1'
        }
      },
      cache: { enabled: true, ttl: 600 }
    }
  ];

  for (const mask of defaultMasks) {
    masks.set(mask.id, mask);
  }
}

// Execute mask function
async function executeMask(
  maskId: string,
  inputs: Record<string, any>,
  context: { userId: string; permissions: string[] }
): Promise<any> {
  const mask = masks.get(maskId);
  if (!mask) {
    throw new Error(`Mask ${maskId} not found`);
  }

  // Check permissions
  const hasPermission = mask.permissions.every(p => 
    context.permissions.includes(p)
  );
  if (!hasPermission) {
    throw new Error('Insufficient permissions');
  }

  // Check cache
  const cacheKey = `mask:${maskId}:${JSON.stringify(inputs)}`;
  if (mask.cache?.enabled) {
    const cached = cache.get(cacheKey) || await redis.get(cacheKey);
    if (cached) {
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  }

  // Validate inputs
  validateInputs(inputs, mask.inputs);

  // Execute provider
  let result;
  try {
    result = await executeProvider(mask.providers.primary, inputs, mask);
  } catch (error) {
    if (mask.providers.fallback) {
      app.log.warn(`Primary provider failed, using fallback: ${error}`);
      result = await executeProvider(mask.providers.fallback, inputs, mask);
    } else {
      throw error;
    }
  }

  // Cache result
  if (mask.cache?.enabled && result) {
    cache.set(cacheKey, result, mask.cache.ttl);
    await redis.setex(cacheKey, mask.cache.ttl, JSON.stringify(result));
  }

  return result;
}

// Execute provider
async function executeProvider(
  provider: ProviderConfig,
  inputs: Record<string, any>,
  mask: MaskConfig
): Promise<any> {
  switch (provider.type) {
    case 'api':
      return executeApiProvider(provider, inputs, mask);
    case 'database':
      return executeDatabaseProvider(provider, inputs);
    case 'mock':
      return executeMockProvider(inputs, mask);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

// API provider execution
async function executeApiProvider(
  provider: ProviderConfig,
  inputs: Record<string, any>,
  mask: MaskConfig
): Promise<any> {
  if (!provider.endpoint) {
    throw new Error('API endpoint not configured');
  }

  const template = Handlebars.compile(provider.endpoint);
  const url = template(inputs);

  const response = await axios({
    method: 'POST',
    url,
    data: inputs,
    headers: {
      'Authorization': `Bearer ${provider.apiKey || ''}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  // Apply transformation if specified
  if (provider.transform) {
    return applyTransform(response.data, provider.transform);
  }

  return response.data;
}

// Database provider execution
async function executeDatabaseProvider(
  provider: ProviderConfig,
  inputs: Record<string, any>
): Promise<any> {
  // This would connect to the actual database
  // For now, return mock data
  return {
    success: true,
    data: inputs,
    timestamp: new Date().toISOString()
  };
}

// Mock provider execution
function executeMockProvider(
  inputs: Record<string, any>,
  mask: MaskConfig
): any {
  // Generate mock response based on output schema
  const mockResponse: Record<string, any> = {};
  
  for (const [key, schema] of Object.entries(mask.outputs)) {
    mockResponse[key] = generateMockValue(schema);
  }
  
  return mockResponse;
}

// Generate mock values based on schema
function generateMockValue(schema: any): any {
  switch (schema.type) {
    case 'boolean':
      return Math.random() > 0.5;
    case 'number':
      return Math.floor(Math.random() * 100);
    case 'string':
      return `mock_${Math.random().toString(36).substring(7)}`;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

// Validate inputs against schema
function validateInputs(inputs: Record<string, any>, schema: Record<string, any>) {
  for (const [key, rules] of Object.entries(schema)) {
    const value = inputs[key];
    
    if (rules.required && value === undefined) {
      throw new Error(`Missing required input: ${key}`);
    }
    
    if (value !== undefined) {
      if (rules.type && typeof value !== rules.type) {
        throw new Error(`Invalid type for ${key}: expected ${rules.type}`);
      }
      
      if (rules.enum && !rules.enum.includes(value)) {
        throw new Error(`Invalid value for ${key}: must be one of ${rules.enum.join(', ')}`);
      }
      
      if (rules.minimum && value < rules.minimum) {
        throw new Error(`Value for ${key} must be at least ${rules.minimum}`);
      }
      
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        throw new Error(`Invalid format for ${key}`);
      }
    }
  }
}

// Apply transformation to response
function applyTransform(data: any, transform: string): any {
  // Simple dot notation path resolver
  const paths = transform.split('.');
  let result = data;
  
  for (const path of paths) {
    result = result?.[path];
  }
  
  return result;
}

// API Routes

// Health check
app.get('/health', async () => ({
  status: 'ok',
  name: 'tool-masker',
  masks: masks.size,
  timestamp: new Date().toISOString()
}));

// List available masks
app.get('/masks', {
  preHandler: [authenticate]
}, async (request: any) => {
  const userPermissions = request.user.permissions || [];
  
  // Filter masks by user permissions
  const availableMasks = Array.from(masks.values()).filter(mask =>
    mask.permissions.every(p => userPermissions.includes(p))
  );
  
  return {
    success: true,
    data: availableMasks.map(mask => ({
      id: mask.id,
      name: mask.name,
      description: mask.description,
      category: mask.category,
      inputs: mask.inputs,
      outputs: mask.outputs
    }))
  };
});

// Get specific mask details
app.get('/masks/:maskId', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  const { maskId } = request.params;
  const mask = masks.get(maskId);
  
  if (!mask) {
    return reply.status(404).send({
      success: false,
      error: 'Mask not found'
    });
  }
  
  const userPermissions = request.user.permissions || [];
  const hasPermission = mask.permissions.every(p => 
    userPermissions.includes(p)
  );
  
  if (!hasPermission) {
    return reply.status(403).send({
      success: false,
      error: 'Insufficient permissions'
    });
  }
  
  return {
    success: true,
    data: mask
  };
});

// Execute a mask
app.post('/masks/:maskId/execute', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  const { maskId } = request.params;
  const inputs = request.body || {};
  
  try {
    const result = await executeMask(maskId, inputs, {
      userId: request.user.userId,
      permissions: request.user.permissions
    });
    
    // Log execution for audit
    app.log.info({
      maskId,
      userId: request.user.userId,
      inputs: Object.keys(inputs),
      success: true
    }, 'Mask executed');
    
    return {
      success: true,
      data: result,
      metadata: {
        maskId,
        executedAt: new Date().toISOString(),
        executedBy: request.user.userId
      }
    };
  } catch (error: any) {
    app.log.error({
      maskId,
      userId: request.user.userId,
      error: error.message
    }, 'Mask execution failed');
    
    return reply.status(400).send({
      success: false,
      error: error.message
    });
  }
});

// Batch execute multiple masks
app.post('/masks/batch', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  const executions = request.body || [];
  const results = [];
  
  for (const execution of executions) {
    try {
      const result = await executeMask(
        execution.maskId,
        execution.inputs || {},
        {
          userId: request.user.userId,
          permissions: request.user.permissions
        }
      );
      
      results.push({
        maskId: execution.maskId,
        success: true,
        data: result
      });
    } catch (error: any) {
      results.push({
        maskId: execution.maskId,
        success: false,
        error: error.message
      });
    }
  }
  
  return {
    success: true,
    results
  };
});

// Admin: Reload masks
app.post('/admin/reload-masks', {
  preHandler: [authenticate, authorize(Permission.POLICY_WRITE)]
}, async () => {
  loadMasks();
  
  return {
    success: true,
    message: `Loaded ${masks.size} masks`
  };
});

// Admin: Clear cache
app.post('/admin/clear-cache', {
  preHandler: [authenticate, authorize(Permission.POLICY_WRITE)]
}, async () => {
  cache.flushAll();
  await redis.flushdb();
  
  return {
    success: true,
    message: 'Cache cleared'
  };
});

// Start server
const start = async () => {
  try {
    // Load masks on startup
    loadMasks();
    
    // Test Redis connection
    await redis.ping();
    app.log.info('Redis connected');
    
    const port = parseInt(process.env.PORT || '3006', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`Tool Masker service listening on ${host}:${port}`);
    app.log.info(`Loaded ${masks.size} mask definitions`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully');
  await app.close();
  redis.disconnect();
  process.exit(0);
});

start();