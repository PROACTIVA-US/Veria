import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ComplianceRuleEngine, type ComplianceRule, type RuleContext } from '../rules/rule-engine.js';
import { SanctionsScreener, type ScreeningRequest } from '../screening/sanctions-screener.js';
import { TransactionMonitor, type Transaction } from '../monitoring/transaction-monitor.js';

export async function complianceRoutes(app: FastifyInstance) {
  // Initialize modules
  const ruleEngine = new ComplianceRuleEngine(app.db, app.redis);
  const sanctionsScreener = new SanctionsScreener(app.db, app.redis);
  const transactionMonitor = new TransactionMonitor(app.db, app.redis);

  // Initialize on startup
  await ruleEngine.loadRules();
  await sanctionsScreener.initialize();
  await transactionMonitor.initialize();

  // ============= Rule Engine Endpoints =============

  // GET /compliance/rules - List all compliance rules
  app.get('/compliance/rules', async (req: FastifyRequest<{
    Querystring: { type?: string; enabled?: boolean }
  }>, reply: FastifyReply) => {
    try {
      const { type, enabled } = req.query;
      let rules = ruleEngine.getRules(type);
      
      if (enabled !== undefined) {
        rules = rules.filter(r => r.enabled === enabled);
      }

      return {
        success: true,
        data: rules,
        meta: {
          count: rules.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to fetch compliance rules');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'FETCH_ERROR',
          message: 'Failed to fetch compliance rules'
        }]
      });
    }
  });

  // POST /compliance/rules - Create a new compliance rule
  app.post('/compliance/rules', async (req: FastifyRequest<{
    Body: ComplianceRule
  }>, reply: FastifyReply) => {
    try {
      const rule = req.body;
      await ruleEngine.addRule(rule);

      return {
        success: true,
        data: rule,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to create compliance rule');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'CREATE_ERROR',
          message: 'Failed to create compliance rule'
        }]
      });
    }
  });

  // PUT /compliance/rules/:ruleId - Update a compliance rule
  app.put('/compliance/rules/:ruleId', async (req: FastifyRequest<{
    Params: { ruleId: string };
    Body: Partial<ComplianceRule>
  }>, reply: FastifyReply) => {
    try {
      const { ruleId } = req.params;
      const updates = req.body;
      
      await ruleEngine.updateRule(ruleId, updates);
      const updatedRule = ruleEngine.getRule(ruleId);

      return {
        success: true,
        data: updatedRule,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to update compliance rule');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'UPDATE_ERROR',
          message: 'Failed to update compliance rule'
        }]
      });
    }
  });

  // DELETE /compliance/rules/:ruleId - Delete a compliance rule
  app.delete('/compliance/rules/:ruleId', async (req: FastifyRequest<{
    Params: { ruleId: string }
  }>, reply: FastifyReply) => {
    try {
      const { ruleId } = req.params;
      await ruleEngine.removeRule(ruleId);

      return {
        success: true,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to delete compliance rule');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'DELETE_ERROR',
          message: 'Failed to delete compliance rule'
        }]
      });
    }
  });

  // POST /compliance/rules/evaluate - Evaluate rules against context
  app.post('/compliance/rules/evaluate', async (req: FastifyRequest<{
    Body: {
      context: RuleContext;
      ruleType?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      const { context, ruleType } = req.body;
      const results = await ruleEngine.evaluateRules(context, ruleType);

      const overallPassed = results.every(r => r.passed);
      const requiresReview = results.some(r => r.action?.type === 'manual_review');

      return {
        success: true,
        data: {
          passed: overallPassed,
          requiresReview,
          evaluations: results
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to evaluate compliance rules');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'EVALUATION_ERROR',
          message: 'Failed to evaluate compliance rules'
        }]
      });
    }
  });

  // ============= Sanctions Screening Endpoints =============

  // POST /compliance/sanctions/screen - Screen entity against sanctions lists
  app.post('/compliance/sanctions/screen', async (req: FastifyRequest<{
    Body: ScreeningRequest
  }>, reply: FastifyReply) => {
    try {
      const request = req.body;
      request.requestId = request.requestId || `screen-${Date.now()}`;
      
      const result = await sanctionsScreener.screen(request);

      // Log high-risk matches
      if (result.status === 'confirmed_match') {
        app.log.warn({ request, result }, 'Sanctions match detected');
      }

      return {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Sanctions screening failed');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'SCREENING_ERROR',
          message: 'Failed to perform sanctions screening'
        }]
      });
    }
  });

  // POST /compliance/sanctions/batch-screen - Batch screening
  app.post('/compliance/sanctions/batch-screen', async (req: FastifyRequest<{
    Body: {
      requests: ScreeningRequest[];
    }
  }>, reply: FastifyReply) => {
    try {
      const { requests } = req.body;
      const results = await Promise.all(
        requests.map(r => {
          r.requestId = r.requestId || `batch-${Date.now()}-${Math.random()}`;
          return sanctionsScreener.screen(r);
        })
      );

      return {
        success: true,
        data: results,
        meta: {
          total: results.length,
          matches: results.filter(r => r.status !== 'clear').length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Batch sanctions screening failed');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'BATCH_SCREENING_ERROR',
          message: 'Failed to perform batch sanctions screening'
        }]
      });
    }
  });

  // POST /compliance/sanctions/custom-list - Add to custom sanctions list
  app.post('/compliance/sanctions/custom-list', async (req: FastifyRequest<{
    Body: {
      entry: any;
      listName?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      const { entry, listName } = req.body;
      await sanctionsScreener.addToCustomList(entry, listName);

      return {
        success: true,
        data: entry,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to add to custom sanctions list');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'CUSTOM_LIST_ERROR',
          message: 'Failed to add to custom sanctions list'
        }]
      });
    }
  });

  // ============= Transaction Monitoring Endpoints =============

  // POST /compliance/monitor/transaction - Analyze a transaction
  app.post('/compliance/monitor/transaction', async (req: FastifyRequest<{
    Body: Transaction
  }>, reply: FastifyReply) => {
    try {
      const transaction = req.body;
      transaction.id = transaction.id || `tx-${Date.now()}`;
      transaction.timestamp = transaction.timestamp || new Date();

      const result = await transactionMonitor.analyzeTransaction(transaction);

      // Take action based on result
      if (result.blocked) {
        app.log.warn({ transaction, result }, 'Transaction blocked by monitoring');
      }

      return {
        success: true,
        data: {
          transaction_id: transaction.id,
          ...result
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Transaction monitoring failed');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'MONITORING_ERROR',
          message: 'Failed to monitor transaction'
        }]
      });
    }
  });

  // GET /compliance/monitor/alerts - Get monitoring alerts
  app.get('/compliance/monitor/alerts', async (req: FastifyRequest<{
    Querystring: {
      user_id?: string;
      severity?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      const filters = {
        ...req.query,
        start_date: req.query.start_date ? new Date(req.query.start_date) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date) : undefined
      };

      const alerts = await transactionMonitor.getAlerts(filters);

      return {
        success: true,
        data: alerts,
        meta: {
          count: alerts.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to fetch monitoring alerts');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'FETCH_ALERTS_ERROR',
          message: 'Failed to fetch monitoring alerts'
        }]
      });
    }
  });

  // PUT /compliance/monitor/alerts/:alertId - Update alert status
  app.put('/compliance/monitor/alerts/:alertId', async (req: FastifyRequest<{
    Params: { alertId: string };
    Body: {
      status: string;
      notes?: string;
    }
  }>, reply: FastifyReply) => {
    try {
      const { alertId } = req.params;
      const { status, notes } = req.body;

      await transactionMonitor.updateAlertStatus(alertId, status, notes);

      return {
        success: true,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Failed to update alert status');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'UPDATE_ALERT_ERROR',
          message: 'Failed to update alert status'
        }]
      });
    }
  });

  // ============= Comprehensive Compliance Check =============

  // POST /compliance/comprehensive-check - Run all compliance checks
  app.post('/compliance/comprehensive-check', async (req: FastifyRequest<{
    Body: {
      user_id: string;
      transaction?: Transaction;
      screening_data?: {
        name: string;
        dateOfBirth?: string;
        nationality?: string;
        address?: string;
      };
    }
  }>, reply: FastifyReply) => {
    try {
      const { user_id, transaction, screening_data } = req.body;
      const results: any = {
        user_id,
        checks: []
      };

      // 1. Run rule engine evaluation
      const ruleContext: RuleContext = {
        user: { id: user_id },
        transaction: transaction ? {
          id: transaction.id || '',
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          from_account: transaction.from_account,
          to_account: transaction.to_account,
          metadata: transaction.metadata
        } : undefined
      };

      const ruleResults = await ruleEngine.evaluateRules(ruleContext);
      results.checks.push({
        type: 'rules',
        passed: ruleResults.every(r => r.passed),
        details: ruleResults
      });

      // 2. Run sanctions screening if data provided
      if (screening_data) {
        const screeningResult = await sanctionsScreener.screen({
          requestId: `comp-${Date.now()}`,
          subjectType: 'individual',
          ...screening_data
        });
        
        results.checks.push({
          type: 'sanctions',
          passed: screeningResult.status === 'clear',
          details: screeningResult
        });
      }

      // 3. Run transaction monitoring if transaction provided
      if (transaction) {
        const monitoringResult = await transactionMonitor.analyzeTransaction({
          ...transaction,
          user_id,
          id: transaction.id || `tx-${Date.now()}`,
          timestamp: transaction.timestamp || new Date()
        });
        
        results.checks.push({
          type: 'monitoring',
          passed: !monitoringResult.blocked && monitoringResult.risk_score < 70,
          details: monitoringResult
        });
      }

      // Determine overall compliance status
      results.overall_passed = results.checks.every((c: any) => c.passed);
      results.risk_score = Math.max(...results.checks.map((c: any) => 
        c.type === 'monitoring' ? c.details.risk_score : 
        c.type === 'sanctions' && c.details.status !== 'clear' ? 100 : 
        c.passed ? 0 : 50
      ));

      return {
        success: true,
        data: results,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      app.log.error(error, 'Comprehensive compliance check failed');
      return reply.status(500).send({
        success: false,
        errors: [{
          code: 'COMPREHENSIVE_CHECK_ERROR',
          message: 'Failed to perform comprehensive compliance check'
        }]
      });
    }
  });
}