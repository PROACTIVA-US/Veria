import type { Pool } from 'pg';
import type Redis from 'ioredis';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'trade' | 'stake' | 'unstake';
  amount: number;
  currency: string;
  from_account?: string;
  to_account?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  risk_score?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  type: 'velocity' | 'amount' | 'pattern' | 'behavior' | 'aggregate';
  enabled: boolean;
  parameters: Record<string, any>;
  risk_weight: number;
  actions: MonitoringAction[];
}

export interface MonitoringAction {
  type: 'alert' | 'block' | 'flag' | 'review' | 'report';
  threshold: number;
  parameters?: Record<string, any>;
}

export interface MonitoringAlert {
  id: string;
  rule_id: string;
  rule_name: string;
  transaction_id: string;
  user_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  risk_score: number;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  user_id: string;
  average_transaction_amount: number;
  typical_transaction_frequency: number;
  common_counterparties: string[];
  risk_profile: 'low' | 'medium' | 'high';
  historical_patterns: PatternData[];
  last_updated: Date;
}

export interface PatternData {
  pattern_type: string;
  frequency: number;
  last_observed: Date;
  confidence: number;
}

export class TransactionMonitor {
  private db: Pool;
  private redis: Redis;
  private rules: Map<string, MonitoringRule> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }

  async initialize(): Promise<void> {
    await this.loadMonitoringRules();
    await this.initializeRealtimeProcessing();
  }

  private async loadMonitoringRules(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT * FROM monitoring_rules 
        WHERE enabled = true
      `);

      this.rules.clear();
      for (const row of result.rows) {
        const rule: MonitoringRule = {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          enabled: row.enabled,
          parameters: row.parameters,
          risk_weight: row.risk_weight,
          actions: JSON.parse(row.actions || '[]')
        };
        this.rules.set(rule.id, rule);
      }
    } catch (error) {
      console.error('Failed to load monitoring rules:', error);
    }
  }

  private async initializeRealtimeProcessing(): Promise<void> {
    // Subscribe to transaction events
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe('transactions:new');
    
    subscriber.on('message', async (channel, message) => {
      if (channel === 'transactions:new') {
        const transaction = JSON.parse(message) as Transaction;
        await this.processTransaction(transaction);
      }
    });
  }

  async analyzeTransaction(transaction: Transaction): Promise<{
    risk_score: number;
    alerts: MonitoringAlert[];
    requiresReview: boolean;
    blocked: boolean;
  }> {
    const startTime = Date.now();
    const alerts: MonitoringAlert[] = [];
    let totalRiskScore = 0;
    let requiresReview = false;
    let blocked = false;

    // Load or create user profile
    const userProfile = await this.getUserProfile(transaction.user_id);

    // Check each monitoring rule
    for (const rule of this.rules.values()) {
      const ruleResult = await this.evaluateRule(rule, transaction, userProfile);
      
      if (ruleResult.triggered) {
        const alert = await this.createAlert(rule, transaction, ruleResult);
        alerts.push(alert);
        
        totalRiskScore += ruleResult.riskScore * rule.risk_weight;
        
        // Process actions
        for (const action of rule.actions) {
          if (ruleResult.riskScore >= action.threshold) {
            switch (action.type) {
              case 'block':
                blocked = true;
                break;
              case 'review':
                requiresReview = true;
                break;
              case 'report':
                await this.generateReport(transaction, rule, ruleResult);
                break;
            }
          }
        }
      }
    }

    // Update user profile with this transaction
    await this.updateUserProfile(userProfile, transaction);

    // Log monitoring result
    await this.logMonitoringResult(transaction, {
      risk_score: Math.min(totalRiskScore, 100),
      alerts_count: alerts.length,
      processing_time: Date.now() - startTime,
      blocked,
      requiresReview
    });

    return {
      risk_score: Math.min(totalRiskScore, 100),
      alerts,
      requiresReview,
      blocked
    };
  }

  private async evaluateRule(
    rule: MonitoringRule,
    transaction: Transaction,
    userProfile: UserProfile
  ): Promise<{
    triggered: boolean;
    riskScore: number;
    reason?: string;
    details?: Record<string, any>;
  }> {
    switch (rule.type) {
      case 'velocity':
        return await this.evaluateVelocityRule(rule, transaction, userProfile);
      case 'amount':
        return this.evaluateAmountRule(rule, transaction, userProfile);
      case 'pattern':
        return await this.evaluatePatternRule(rule, transaction, userProfile);
      case 'behavior':
        return await this.evaluateBehaviorRule(rule, transaction, userProfile);
      case 'aggregate':
        return await this.evaluateAggregateRule(rule, transaction, userProfile);
      default:
        return { triggered: false, riskScore: 0 };
    }
  }

  private async evaluateVelocityRule(
    rule: MonitoringRule,
    transaction: Transaction,
    userProfile: UserProfile
  ): Promise<{ triggered: boolean; riskScore: number; reason?: string; details?: Record<string, any> }> {
    const { timeWindow, maxTransactions, maxAmount } = rule.parameters;
    
    // Query recent transactions
    const windowStart = new Date(Date.now() - timeWindow * 1000);
    const result = await this.db.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM transactions
      WHERE user_id = $1 AND timestamp >= $2
    `, [transaction.user_id, windowStart]);

    const { count, total } = result.rows[0];
    const newCount = parseInt(count) + 1;
    const newTotal = parseFloat(total || 0) + transaction.amount;

    if (maxTransactions && newCount > maxTransactions) {
      return {
        triggered: true,
        riskScore: Math.min((newCount / maxTransactions) * 50, 100),
        reason: `High transaction velocity: ${newCount} transactions in ${timeWindow}s`,
        details: { count: newCount, timeWindow, threshold: maxTransactions }
      };
    }

    if (maxAmount && newTotal > maxAmount) {
      return {
        triggered: true,
        riskScore: Math.min((newTotal / maxAmount) * 50, 100),
        reason: `High transaction volume: ${newTotal} in ${timeWindow}s`,
        details: { total: newTotal, timeWindow, threshold: maxAmount }
      };
    }

    return { triggered: false, riskScore: 0 };
  }

  private evaluateAmountRule(
    rule: MonitoringRule,
    transaction: Transaction,
    userProfile: UserProfile
  ): { triggered: boolean; riskScore: number; reason?: string; details?: Record<string, any> } {
    const { minAmount, maxAmount, deviationThreshold } = rule.parameters;

    // Check absolute thresholds
    if (minAmount && transaction.amount < minAmount) {
      return {
        triggered: true,
        riskScore: 30,
        reason: `Transaction amount below threshold: ${transaction.amount} < ${minAmount}`,
        details: { amount: transaction.amount, threshold: minAmount }
      };
    }

    if (maxAmount && transaction.amount > maxAmount) {
      return {
        triggered: true,
        riskScore: Math.min((transaction.amount / maxAmount) * 60, 100),
        reason: `Transaction amount above threshold: ${transaction.amount} > ${maxAmount}`,
        details: { amount: transaction.amount, threshold: maxAmount }
      };
    }

    // Check deviation from user's normal behavior
    if (deviationThreshold && userProfile.average_transaction_amount > 0) {
      const deviation = Math.abs(transaction.amount - userProfile.average_transaction_amount) / userProfile.average_transaction_amount;
      if (deviation > deviationThreshold) {
        return {
          triggered: true,
          riskScore: Math.min(deviation * 40, 100),
          reason: `Unusual transaction amount: ${(deviation * 100).toFixed(2)}% deviation from average`,
          details: {
            amount: transaction.amount,
            average: userProfile.average_transaction_amount,
            deviation: deviation
          }
        };
      }
    }

    return { triggered: false, riskScore: 0 };
  }

  private async evaluatePatternRule(
    rule: MonitoringRule,
    transaction: Transaction,
    userProfile: UserProfile
  ): Promise<{ triggered: boolean; riskScore: number; reason?: string; details?: Record<string, any> }> {
    const { patterns, threshold } = rule.parameters;

    // Check for suspicious patterns
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'structuring':
          const isStructuring = await this.detectStructuring(transaction, pattern);
          if (isStructuring) {
            return {
              triggered: true,
              riskScore: 80,
              reason: 'Potential structuring detected',
              details: { pattern: 'structuring', confidence: isStructuring }
            };
          }
          break;

        case 'rapid_movement':
          const rapidMovement = await this.detectRapidMovement(transaction, pattern);
          if (rapidMovement) {
            return {
              triggered: true,
              riskScore: 70,
              reason: 'Rapid fund movement detected',
              details: { pattern: 'rapid_movement', transactions: rapidMovement }
            };
          }
          break;

        case 'round_amount':
          if (this.isRoundAmount(transaction.amount, pattern.precision || 100)) {
            return {
              triggered: true,
              riskScore: 40,
              reason: 'Round amount transaction',
              details: { pattern: 'round_amount', amount: transaction.amount }
            };
          }
          break;
      }
    }

    return { triggered: false, riskScore: 0 };
  }

  private async evaluateBehaviorRule(
    rule: MonitoringRule,
    transaction: Transaction,
    userProfile: UserProfile
  ): Promise<{ triggered: boolean; riskScore: number; reason?: string; details?: Record<string, any> }> {
    const { behaviors } = rule.parameters;

    for (const behavior of behaviors) {
      switch (behavior.type) {
        case 'new_counterparty':
          if (transaction.to_account && !userProfile.common_counterparties.includes(transaction.to_account)) {
            return {
              triggered: true,
              riskScore: 35,
              reason: 'Transaction to new counterparty',
              details: { counterparty: transaction.to_account, known_counterparties: userProfile.common_counterparties.length }
            };
          }
          break;

        case 'dormant_account':
          const lastActivity = await this.getLastActivityDate(transaction.user_id);
          const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity > (behavior.dormancy_days || 90)) {
            return {
              triggered: true,
              riskScore: 60,
              reason: 'Activity on dormant account',
              details: { days_dormant: daysSinceActivity }
            };
          }
          break;

        case 'unusual_time':
          const hour = transaction.timestamp.getHours();
          if (behavior.unusual_hours && behavior.unusual_hours.includes(hour)) {
            return {
              triggered: true,
              riskScore: 25,
              reason: 'Transaction at unusual time',
              details: { hour, timestamp: transaction.timestamp }
            };
          }
          break;
      }
    }

    return { triggered: false, riskScore: 0 };
  }

  private async evaluateAggregateRule(
    rule: MonitoringRule,
    transaction: Transaction,
    userProfile: UserProfile
  ): Promise<{ triggered: boolean; riskScore: number; reason?: string; details?: Record<string, any> }> {
    const { aggregation_period, aggregation_field, threshold } = rule.parameters;

    const periodStart = new Date(Date.now() - aggregation_period * 1000);
    const query = `
      SELECT ${aggregation_field} as value
      FROM transactions
      WHERE user_id = $1 AND timestamp >= $2
    `;

    const result = await this.db.query(query, [transaction.user_id, periodStart]);
    const aggregatedValue = result.rows[0]?.value || 0;

    if (aggregatedValue > threshold) {
      return {
        triggered: true,
        riskScore: Math.min((aggregatedValue / threshold) * 50, 100),
        reason: `Aggregate threshold exceeded: ${aggregation_field} = ${aggregatedValue}`,
        details: {
          field: aggregation_field,
          value: aggregatedValue,
          threshold,
          period: aggregation_period
        }
      };
    }

    return { triggered: false, riskScore: 0 };
  }

  private async detectStructuring(transaction: Transaction, pattern: any): Promise<number> {
    const { amount_threshold, time_window, min_transactions } = pattern;
    
    const windowStart = new Date(Date.now() - time_window * 1000);
    const result = await this.db.query(`
      SELECT amount, timestamp
      FROM transactions
      WHERE user_id = $1 
        AND timestamp >= $2
        AND amount < $3
        AND amount > $4
      ORDER BY timestamp DESC
    `, [
      transaction.user_id,
      windowStart,
      amount_threshold,
      amount_threshold * 0.8 // Looking for amounts just below threshold
    ]);

    if (result.rows.length >= min_transactions) {
      // Calculate confidence based on pattern consistency
      const amounts = result.rows.map(r => r.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      // Low standard deviation indicates consistent amounts (potential structuring)
      const confidence = stdDev < (avgAmount * 0.1) ? 0.9 : 0.5;
      return confidence;
    }

    return 0;
  }

  private async detectRapidMovement(transaction: Transaction, pattern: any): Promise<any> {
    const { time_window, min_hops } = pattern;
    
    // Track fund movement through accounts
    const movements = await this.traceFundMovement(transaction, time_window);
    
    if (movements.length >= min_hops) {
      return movements;
    }
    
    return null;
  }

  private async traceFundMovement(transaction: Transaction, timeWindow: number): Promise<any[]> {
    const movements = [];
    const windowStart = new Date(Date.now() - timeWindow * 1000);
    
    // Simplified tracing - in production, this would be more sophisticated
    const result = await this.db.query(`
      SELECT t1.*, t2.to_account as next_hop
      FROM transactions t1
      LEFT JOIN transactions t2 ON t1.to_account = t2.from_account
      WHERE t1.user_id = $1 
        AND t1.timestamp >= $2
        AND t2.timestamp > t1.timestamp
        AND t2.timestamp < t1.timestamp + interval '1 hour'
      ORDER BY t1.timestamp
    `, [transaction.user_id, windowStart]);
    
    return result.rows;
  }

  private isRoundAmount(amount: number, precision: number): boolean {
    return amount % precision === 0;
  }

  private async getLastActivityDate(userId: string): Promise<Date> {
    const result = await this.db.query(`
      SELECT MAX(timestamp) as last_activity
      FROM transactions
      WHERE user_id = $1
    `, [userId]);
    
    return result.rows[0]?.last_activity || new Date(0);
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    // Check cache first
    let profile = this.userProfiles.get(userId);
    if (profile && (Date.now() - profile.last_updated.getTime()) < 3600000) { // 1 hour cache
      return profile;
    }

    // Load from database
    const result = await this.db.query(`
      SELECT 
        AVG(amount) as avg_amount,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        COUNT(*) as total_transactions,
        ARRAY_AGG(DISTINCT to_account) as counterparties
      FROM transactions
      WHERE user_id = $1
        AND timestamp > NOW() - INTERVAL '90 days'
    `, [userId]);

    const row = result.rows[0];
    profile = {
      user_id: userId,
      average_transaction_amount: parseFloat(row?.avg_amount || 0),
      typical_transaction_frequency: (row?.total_transactions || 0) / Math.max(row?.active_days || 1, 1),
      common_counterparties: row?.counterparties?.filter(Boolean) || [],
      risk_profile: 'low', // This would be calculated based on historical data
      historical_patterns: [],
      last_updated: new Date()
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  private async updateUserProfile(profile: UserProfile, transaction: Transaction): Promise<void> {
    // Update running averages
    const alpha = 0.1; // Exponential moving average factor
    profile.average_transaction_amount = 
      profile.average_transaction_amount * (1 - alpha) + transaction.amount * alpha;

    // Update counterparties
    if (transaction.to_account && !profile.common_counterparties.includes(transaction.to_account)) {
      profile.common_counterparties.push(transaction.to_account);
      if (profile.common_counterparties.length > 100) {
        profile.common_counterparties.shift(); // Keep only last 100
      }
    }

    profile.last_updated = new Date();
    
    // Update in cache
    this.userProfiles.set(profile.user_id, profile);
    
    // Persist to database periodically (not on every transaction)
    if (Math.random() < 0.1) { // 10% chance to persist
      await this.persistUserProfile(profile);
    }
  }

  private async persistUserProfile(profile: UserProfile): Promise<void> {
    await this.db.query(`
      INSERT INTO user_profiles 
      (user_id, average_transaction_amount, typical_transaction_frequency, common_counterparties, risk_profile, historical_patterns, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        average_transaction_amount = $2,
        typical_transaction_frequency = $3,
        common_counterparties = $4,
        risk_profile = $5,
        historical_patterns = $6,
        last_updated = $7
    `, [
      profile.user_id,
      profile.average_transaction_amount,
      profile.typical_transaction_frequency,
      JSON.stringify(profile.common_counterparties),
      profile.risk_profile,
      JSON.stringify(profile.historical_patterns),
      profile.last_updated
    ]);
  }

  private async createAlert(
    rule: MonitoringRule,
    transaction: Transaction,
    ruleResult: any
  ): Promise<MonitoringAlert> {
    const alert: MonitoringAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rule_id: rule.id,
      rule_name: rule.name,
      transaction_id: transaction.id,
      user_id: transaction.user_id,
      severity: this.calculateSeverity(ruleResult.riskScore),
      type: rule.type,
      description: ruleResult.reason || `Rule ${rule.name} triggered`,
      risk_score: ruleResult.riskScore,
      status: 'new',
      created_at: new Date(),
      metadata: ruleResult.details
    };

    // Store alert
    await this.db.query(`
      INSERT INTO monitoring_alerts 
      (id, rule_id, rule_name, transaction_id, user_id, severity, type, description, risk_score, status, created_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      alert.id,
      alert.rule_id,
      alert.rule_name,
      alert.transaction_id,
      alert.user_id,
      alert.severity,
      alert.type,
      alert.description,
      alert.risk_score,
      alert.status,
      alert.created_at,
      JSON.stringify(alert.metadata)
    ]);

    // Publish alert for real-time monitoring
    await this.redis.publish('monitoring:alerts', JSON.stringify(alert));

    return alert;
  }

  private calculateSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private async generateReport(transaction: Transaction, rule: MonitoringRule, ruleResult: any): Promise<void> {
    const report = {
      transaction,
      rule,
      ruleResult,
      timestamp: new Date(),
      report_type: 'automated_monitoring'
    };

    // Store report
    await this.db.query(`
      INSERT INTO compliance_reports 
      (type, data, created_at)
      VALUES ($1, $2, $3)
    `, ['monitoring_alert', JSON.stringify(report), new Date()]);

    // Notify compliance team
    await this.redis.publish('compliance:reports:new', JSON.stringify({
      type: 'monitoring_alert',
      transaction_id: transaction.id,
      rule_id: rule.id,
      severity: this.calculateSeverity(ruleResult.riskScore)
    }));
  }

  private async logMonitoringResult(transaction: Transaction, result: any): Promise<void> {
    await this.db.query(`
      INSERT INTO transaction_monitoring_log 
      (transaction_id, user_id, risk_score, alerts_count, processing_time, blocked, requires_review, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      transaction.id,
      transaction.user_id,
      result.risk_score,
      result.alerts_count,
      result.processing_time,
      result.blocked,
      result.requiresReview,
      new Date()
    ]);
  }

  async processTransaction(transaction: Transaction): Promise<void> {
    const result = await this.analyzeTransaction(transaction);
    
    // Update transaction status based on monitoring result
    if (result.blocked) {
      transaction.status = 'rejected';
    } else if (result.requiresReview) {
      transaction.status = 'flagged';
    } else {
      transaction.status = 'approved';
    }
    
    transaction.risk_score = result.risk_score;
    
    // Update transaction in database
    await this.db.query(`
      UPDATE transactions 
      SET status = $1, risk_score = $2
      WHERE id = $3
    `, [transaction.status, transaction.risk_score, transaction.id]);
  }

  async getAlerts(filters?: {
    user_id?: string;
    severity?: string;
    status?: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<MonitoringAlert[]> {
    let query = 'SELECT * FROM monitoring_alerts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.user_id) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(filters.user_id);
    }
    if (filters?.severity) {
      query += ` AND severity = $${paramIndex++}`;
      params.push(filters.severity);
    }
    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters?.start_date) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.start_date);
    }
    if (filters?.end_date) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.end_date);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await this.db.query(query, params);
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async updateAlertStatus(alertId: string, status: string, notes?: string): Promise<void> {
    await this.db.query(`
      UPDATE monitoring_alerts 
      SET status = $1, updated_at = $2, notes = $3
      WHERE id = $4
    `, [status, new Date(), notes, alertId]);
  }
}