import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';

// Mock the database module
vi.mock('@veria/database', () => ({
  createPostgresPool: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn()
  })),
  createRedisClient: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    zadd: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    disconnect: vi.fn()
  })),
  dbQueries: {
    getUserById: 'SELECT * FROM users WHERE id = $1',
    createComplianceCheck: 'INSERT INTO compliance_checks...',
    getComplianceChecksByTransaction: 'SELECT * FROM compliance_checks WHERE transaction_id = $1'
  }
}));

describe('Compliance Service', () => {
  let app: any;
  let mockDb: any;
  let mockRedis: any;

  beforeAll(async () => {
    const module = await import('./index.js');
    app = module.app || Fastify();
    
    const { createPostgresPool, createRedisClient } = await import('@veria/database');
    mockDb = createPostgresPool();
    mockRedis = createRedisClient();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status with database status', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        status: 'ok',
        name: 'compliance-service',
        database: 'connected',
        redis: 'connected'
      });
    });
  });

  describe('POST /compliance/check', () => {
    it('should return cached compliance check if available', async () => {
      const cachedResult = {
        transaction_id: 'txn_123',
        user_id: 'user_123',
        overall_status: 'passed',
        checks: []
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedResult));

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/check',
        payload: {
          transaction_id: 'txn_123',
          user_id: 'user_123'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(cachedResult);
      expect(body.meta.cached).toBe(true);
    });

    it('should run all compliance checks when not cached', async () => {
      const user = {
        id: 'user_123',
        kyc_status: 'verified',
        kyc_verified_at: new Date(),
        kyc_level: 'enhanced'
      };

      mockRedis.get.mockResolvedValueOnce(null);
      
      // Mock KYC check
      mockDb.query.mockResolvedValueOnce({ 
        rows: [user], 
        rowCount: 1 
      });

      // Mock storing compliance checks (5 times for 5 check types)
      for (let i = 0; i < 5; i++) {
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: `check_${i}`, status: 'passed' }],
          rowCount: 1
        });
      }

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/check',
        payload: {
          transaction_id: 'txn_123',
          user_id: 'user_123',
          amount: 5000,
          jurisdiction: 'United States'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.transaction_id).toBe('txn_123');
      expect(body.data.checks).toHaveLength(5);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/compliance/check',
        payload: {
          user_id: 'user_123'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.errors[0].code).toBe('MISSING_PARAMS');
    });

    it('should handle KYC check failures', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      
      // User not found
      mockDb.query.mockResolvedValueOnce({ 
        rows: [], 
        rowCount: 0 
      });

      // Mock storing failed KYC check
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'check_1', status: 'failed' }],
        rowCount: 1
      });

      // Mock storing other checks
      for (let i = 0; i < 4; i++) {
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: `check_${i + 2}`, status: 'passed' }],
          rowCount: 1
        });
      }

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/check',
        payload: {
          transaction_id: 'txn_124',
          user_id: 'user_unknown'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.overall_status).toBe('failed');
    });

    it('should handle jurisdiction restrictions', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      
      // Mock user for KYC check
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 'user_123', kyc_status: 'verified' }], 
        rowCount: 1 
      });

      // Mock storing compliance checks
      for (let i = 0; i < 5; i++) {
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: `check_${i}`, status: i === 4 ? 'failed' : 'passed' }],
          rowCount: 1
        });
      }

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/check',
        payload: {
          transaction_id: 'txn_125',
          user_id: 'user_123',
          jurisdiction: 'North Korea' // Restricted jurisdiction
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.overall_status).toBe('failed');
    });
  });

  describe('GET /compliance/checks/:transactionId', () => {
    it('should return compliance checks for transaction', async () => {
      const checks = [
        { id: 'check_1', check_type: 'kyc', status: 'passed' },
        { id: 'check_2', check_type: 'aml', status: 'passed' },
        { id: 'check_3', check_type: 'sanctions', status: 'passed' }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: checks,
        rowCount: 3
      });

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/checks/txn_123'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.transaction_id).toBe('txn_123');
      expect(body.data.checks).toEqual(checks);
      expect(body.data.overall_status).toBe('passed');
    });

    it('should return 404 for non-existent transaction', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/checks/txn_nonexistent'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.errors[0].code).toBe('NOT_FOUND');
    });
  });

  describe('POST /compliance/monitor', () => {
    it('should set up compliance monitoring', async () => {
      mockRedis.set.mockResolvedValueOnce('OK');
      mockRedis.zadd.mockResolvedValueOnce(1);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/monitor',
        payload: {
          user_id: 'user_123',
          monitoring_type: 'aml',
          frequency: 'daily',
          criteria: { threshold: 10000 }
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.monitoring_id).toBe('monitoring:user_123:aml');
      expect(body.data.frequency).toBe('daily');
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'monitoring:queue',
        expect.any(Number),
        'monitoring:user_123:aml'
      );
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/compliance/monitor',
        payload: {
          user_id: 'user_123'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.errors[0].code).toBe('MISSING_PARAMS');
    });
  });

  describe('POST /compliance/report', () => {
    it('should generate summary compliance report', async () => {
      const checks = [
        { check_type: 'kyc', status: 'passed', created_at: new Date() },
        { check_type: 'aml', status: 'passed', created_at: new Date() },
        { check_type: 'sanctions', status: 'failed', created_at: new Date() },
        { check_type: 'accreditation', status: 'manual_review', created_at: new Date() }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: checks,
        rowCount: 4
      });

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/report',
        payload: {
          user_id: 'user_123',
          report_type: 'summary'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user_id).toBe('user_123');
      expect(body.data.report.total_checks).toBe(4);
      expect(body.data.report.passed).toBe(2);
      expect(body.data.report.failed).toBe(1);
      expect(body.data.report.manual_review).toBe(1);
      expect(body.data.report.compliance_rate).toBe('50.00%');
    });

    it('should generate detailed compliance report', async () => {
      const checks = [
        { check_type: 'kyc', status: 'passed', created_at: new Date(), result: {} },
        { check_type: 'aml', status: 'passed', created_at: new Date(), result: {} }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: checks,
        rowCount: 2
      });

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/report',
        payload: {
          user_id: 'user_123',
          report_type: 'detailed',
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end_date: new Date()
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.report.timeline).toHaveLength(2);
      expect(body.data.report.checks_by_type).toBeDefined();
      expect(body.data.report.checks_by_status).toBeDefined();
    });

    it('should return 400 for missing user_id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/compliance/report',
        payload: {
          report_type: 'summary'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.errors[0].code).toBe('MISSING_PARAMS');
    });
  });

  describe('Compliance Check Functions', () => {
    it('should properly evaluate AML risk scores', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      
      // Mock user for KYC
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 'user_123', kyc_status: 'verified' }], 
        rowCount: 1 
      });

      // Mock storing checks
      for (let i = 0; i < 5; i++) {
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: `check_${i}` }],
          rowCount: 1
        });
      }

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/check',
        payload: {
          transaction_id: 'txn_aml',
          user_id: 'user_123'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Check that AML check was performed
      const amlCheck = body.data.checks.find((c: any) => c.check_type === 'aml');
      expect(amlCheck).toBeDefined();
    });
  });
});