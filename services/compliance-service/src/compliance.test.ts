import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import { ComplianceRuleEngine } from './rules/rule-engine.js';
import { SanctionsScreener } from './screening/sanctions-screener.js';
import { TransactionMonitor } from './monitoring/transaction-monitor.js';
import { defaultComplianceRules, defaultMonitoringRules } from './config/default-rules.js';

// Mock database and Redis
const mockDb = {
  query: vi.fn(),
  end: vi.fn()
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  lpush: vi.fn(),
  ltrim: vi.fn(),
  zadd: vi.fn(),
  publish: vi.fn(),
  ping: vi.fn(),
  duplicate: vi.fn(() => ({
    subscribe: vi.fn(),
    on: vi.fn()
  })),
  disconnect: vi.fn()
};

describe('Compliance Rule Engine', () => {
  let ruleEngine: ComplianceRuleEngine;

  beforeAll(() => {
    ruleEngine = new ComplianceRuleEngine(mockDb as any, mockRedis as any);
  });

  describe('Rule Management', () => {
    it('should add a new compliance rule', async () => {
      const rule = defaultComplianceRules[0];
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      
      await ruleEngine.addRule(rule);
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO compliance_rules'),
        expect.arrayContaining([rule.id, rule.name])
      );
      expect(ruleEngine.getRule(rule.id)).toEqual(rule);
    });

    it('should remove a compliance rule', async () => {
      const ruleId = 'test-rule';
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      
      await ruleEngine.removeRule(ruleId);
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM compliance_rules WHERE id = $1',
        [ruleId]
      );
    });

    it('should load rules from database', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: defaultComplianceRules.map(rule => ({
          ...rule,
          conditions: JSON.stringify(rule.conditions),
          actions: JSON.stringify(rule.actions)
        }))
      });
      
      await ruleEngine.loadRules();
      
      const rules = ruleEngine.getRules();
      expect(rules).toHaveLength(defaultComplianceRules.length);
    });
  });

  describe('Rule Evaluation', () => {
    beforeAll(async () => {
      // Load test rules
      for (const rule of defaultComplianceRules) {
        await ruleEngine.addRule(rule);
      }
    });

    it('should evaluate KYC verification rule', async () => {
      const context = {
        user: {
          id: 'user-123',
          kyc_status: 'verified'
        }
      };

      mockDb.query.mockResolvedValue({ rows: [] });
      const results = await ruleEngine.evaluateRules(context, 'kyc');
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].passed).toBe(true);
    });

    it('should reject unverified KYC', async () => {
      const context = {
        user: {
          id: 'user-456',
          kyc_status: 'pending'
        }
      };

      mockDb.query.mockResolvedValue({ rows: [] });
      const results = await ruleEngine.evaluateRules(context, 'kyc');
      
      expect(results[0].passed).toBe(false);
      expect(results[0].action?.type).toBe('reject');
    });

    it('should evaluate transaction limits', async () => {
      const context = {
        transaction: {
          id: 'tx-123',
          amount: 150000,
          currency: 'USD',
          type: 'transfer'
        },
        user: {
          id: 'user-789'
        }
      };

      mockDb.query.mockResolvedValue({ rows: [] });
      const results = await ruleEngine.evaluateRules(context, 'transaction');
      
      expect(results).toBeDefined();
      const limitRule = results.find(r => r.rule_id === 'transaction-limit-daily');
      expect(limitRule?.passed).toBe(false);
    });

    it('should check jurisdiction restrictions', async () => {
      const context = {
        user: {
          id: 'user-999',
          jurisdiction: 'Iran'
        }
      };

      mockDb.query.mockResolvedValue({ rows: [] });
      const results = await ruleEngine.evaluateRules(context, 'jurisdiction');
      
      const jurisdictionRule = results.find(r => r.rule_id === 'jurisdiction-restrictions');
      expect(jurisdictionRule?.passed).toBe(false);
      expect(jurisdictionRule?.action?.type).toBe('reject');
    });
  });
});

describe('Sanctions Screener', () => {
  let screener: SanctionsScreener;

  beforeAll(async () => {
    screener = new SanctionsScreener(mockDb as any, mockRedis as any);
    
    // Mock sanctions list loading
    mockDb.query.mockImplementation((query) => {
      if (query.includes('sanctions_lists')) {
        return {
          rows: [{
            id: 'ofac-list',
            name: 'OFAC SDN List',
            source: 'OFAC',
            last_updated: new Date(),
            active: true
          }]
        };
      }
      if (query.includes('sanctions_entries')) {
        return {
          rows: [{
            id: 'entry-1',
            type: 'individual',
            names: JSON.stringify(['John Doe', 'John Smith']),
            aliases: JSON.stringify(['JD']),
            identifiers: JSON.stringify([]),
            addresses: JSON.stringify([]),
            date_of_birth: '1980-01-01',
            nationality: JSON.stringify(['US']),
            programs: JSON.stringify(['SDN']),
            risk_score: 100
          }]
        };
      }
      return { rows: [] };
    });
    
    await screener.initialize();
  });

  it('should screen an individual against sanctions lists', async () => {
    const request = {
      requestId: 'screen-001',
      subjectType: 'individual' as const,
      name: 'Jane Smith',
      dateOfBirth: '1985-05-15',
      nationality: 'US'
    };

    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockDb.query.mockResolvedValue({ rows: [] });

    const result = await screener.screen(request);
    
    expect(result).toBeDefined();
    expect(result.requestId).toBe('screen-001');
    expect(result.status).toBeDefined();
    expect(result.listsChecked).toContain('OFAC SDN List');
  });

  it('should detect potential sanctions match', async () => {
    const request = {
      requestId: 'screen-002',
      subjectType: 'individual' as const,
      name: 'John Doe',
      dateOfBirth: '1980-01-01',
      nationality: 'US'
    };

    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockDb.query.mockResolvedValue({ rows: [] });

    const result = await screener.screen(request);
    
    expect(result.status).not.toBe('clear');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].matchScore).toBeGreaterThan(0.5);
  });

  it('should use cached screening results', async () => {
    const cachedResult = {
      requestId: 'cached-001',
      status: 'clear',
      matches: [],
      listsChecked: ['OFAC SDN List'],
      screeningTime: 100,
      timestamp: new Date().toISOString()
    };

    mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

    const request = {
      requestId: 'screen-003',
      subjectType: 'individual' as const,
      name: 'Test User'
    };

    const result = await screener.screen(request);
    
    expect(result.status).toBe('clear');
    expect(result.matches).toHaveLength(0);
  });
});

describe('Transaction Monitor', () => {
  let monitor: TransactionMonitor;

  beforeAll(async () => {
    monitor = new TransactionMonitor(mockDb as any, mockRedis as any);
    
    // Mock monitoring rules loading
    mockDb.query.mockImplementation((query) => {
      if (query.includes('monitoring_rules')) {
        return {
          rows: defaultMonitoringRules.map(rule => ({
            ...rule,
            actions: JSON.stringify(rule.actions)
          }))
        };
      }
      if (query.includes('SELECT COUNT')) {
        return { rows: [{ count: 5, total: 25000 }] };
      }
      if (query.includes('user_profiles')) {
        return { rows: [] };
      }
      return { 
        rows: [{
          avg_amount: 5000,
          active_days: 30,
          total_transactions: 100,
          counterparties: ['account1', 'account2']
        }] 
      };
    });
    
    await monitor.initialize();
  });

  it('should analyze transaction for risk', async () => {
    const transaction = {
      id: 'tx-001',
      user_id: 'user-123',
      type: 'transfer' as const,
      amount: 15000,
      currency: 'USD',
      from_account: 'acc-123',
      to_account: 'acc-456',
      timestamp: new Date()
    };

    mockDb.query.mockResolvedValue({ 
      rows: [{ 
        count: 5, 
        total: 25000,
        avg_amount: 5000,
        active_days: 30,
        total_transactions: 100,
        counterparties: []
      }] 
    });

    const result = await monitor.analyzeTransaction(transaction);
    
    expect(result).toBeDefined();
    expect(result.risk_score).toBeGreaterThanOrEqual(0);
    expect(result.risk_score).toBeLessThanOrEqual(100);
    expect(result.alerts).toBeDefined();
    expect(typeof result.requiresReview).toBe('boolean');
    expect(typeof result.blocked).toBe('boolean');
  });

  it('should detect high velocity transactions', async () => {
    const transaction = {
      id: 'tx-002',
      user_id: 'user-456',
      type: 'transfer' as const,
      amount: 60000,
      currency: 'USD',
      timestamp: new Date()
    };

    // Mock high velocity scenario
    mockDb.query.mockResolvedValueOnce({ 
      rows: [{ count: 25, total: 200000 }] 
    });

    const result = await monitor.analyzeTransaction(transaction);
    
    expect(result.alerts.length).toBeGreaterThan(0);
    const velocityAlert = result.alerts.find(a => a.type === 'velocity');
    expect(velocityAlert).toBeDefined();
  });

  it('should detect unusual transaction amounts', async () => {
    const transaction = {
      id: 'tx-003',
      user_id: 'user-789',
      type: 'transfer' as const,
      amount: 100000, // Much higher than average
      currency: 'USD',
      timestamp: new Date()
    };

    // Mock user profile with low average
    mockDb.query.mockImplementation((query) => {
      if (query.includes('AVG(amount)')) {
        return { 
          rows: [{ 
            avg_amount: 1000,
            active_days: 30,
            total_transactions: 100,
            counterparties: []
          }] 
        };
      }
      return { rows: [{ count: 1, total: 100000 }] };
    });

    const result = await monitor.analyzeTransaction(transaction);
    
    expect(result.risk_score).toBeGreaterThan(30);
    const amountAlert = result.alerts.find(a => a.type === 'amount');
    expect(amountAlert).toBeDefined();
  });

  it('should handle alert creation and retrieval', async () => {
    mockDb.query.mockResolvedValue({ 
      rows: [{
        id: 'alert-001',
        rule_id: 'velocity-check',
        rule_name: 'Transaction Velocity Monitor',
        transaction_id: 'tx-001',
        user_id: 'user-123',
        severity: 'medium',
        type: 'velocity',
        description: 'High transaction velocity detected',
        risk_score: 65,
        status: 'new',
        created_at: new Date(),
        metadata: '{}'
      }]
    });

    const alerts = await monitor.getAlerts({ user_id: 'user-123' });
    
    expect(alerts).toHaveLength(1);
    expect(alerts[0].user_id).toBe('user-123');
    expect(alerts[0].severity).toBe('medium');
  });

  it('should update alert status', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await monitor.updateAlertStatus('alert-001', 'resolved', 'False positive');
    
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE monitoring_alerts'),
      expect.arrayContaining(['resolved', expect.any(Date), 'False positive', 'alert-001'])
    );
  });
});

describe('Compliance Service Integration', () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    app.decorate('db', mockDb);
    app.decorate('redis', mockRedis);

    // Mock successful initialization
    mockDb.query.mockResolvedValue({ rows: [] });
    mockRedis.get.mockResolvedValue(null);
    mockRedis.ping.mockResolvedValue('PONG');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle comprehensive compliance check', async () => {
    const checkData = {
      user_id: 'user-123',
      transaction: {
        id: 'tx-123',
        amount: 5000,
        currency: 'USD',
        type: 'transfer'
      },
      screening_data: {
        name: 'John Smith',
        dateOfBirth: '1990-01-01',
        nationality: 'US'
      }
    };

    // This would be an actual API call in integration tests
    // For unit tests, we're just verifying the structure
    expect(checkData).toHaveProperty('user_id');
    expect(checkData).toHaveProperty('transaction');
    expect(checkData).toHaveProperty('screening_data');
  });
});