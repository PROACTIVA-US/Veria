import { Pool } from 'pg';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'trade';
  source: string;
  destination: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AMLAlert {
  id: string;
  userId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  transactionIds: string[];
  score: number;
  indicators: string[];
  createdAt: Date;
  status: 'new' | 'investigating' | 'escalated' | 'resolved' | 'false_positive';
}

export interface UserRiskProfile {
  userId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  transactionCount: number;
  totalVolume: number;
  averageTransactionSize: number;
  largestTransaction: number;
  unusualPatterns: string[];
  lastUpdated: Date;
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  condition: (transaction: Transaction, profile: UserRiskProfile) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  enabled: boolean;
}

export class AMLMonitor extends EventEmitter {
  private db: Pool;
  private redis: Redis;
  private rules: Map<string, MonitoringRule> = new Map();
  private monitoring: boolean = false;
  
  constructor(db: Pool, redis: Redis) {
    super();
    this.db = db;
    this.redis = redis;
    this.initializeRules();
  }
  
  private initializeRules() {
    // High-value transaction monitoring
    this.addRule({
      id: 'high_value_transaction',
      name: 'High Value Transaction',
      description: 'Detects transactions above threshold',
      condition: (tx) => tx.amount > 10000,
      severity: 'medium',
      indicators: ['HIGH_VALUE_TRANSACTION'],
      enabled: true
    });
    
    // Rapid movement of funds (velocity check)
    this.addRule({
      id: 'rapid_movement',
      name: 'Rapid Fund Movement',
      description: 'Detects rapid movement of funds',
      condition: async (tx, profile) => {
        const recentTxKey = `recent_tx:${tx.userId}`;
        const recentCount = await this.redis.get(recentTxKey);
        return parseInt(recentCount || '0') > 5; // More than 5 tx in window
      },
      severity: 'high',
      indicators: ['RAPID_MOVEMENT', 'VELOCITY_SPIKE'],
      enabled: true
    });
    
    // Structuring detection (smurfing)
    this.addRule({
      id: 'structuring',
      name: 'Potential Structuring',
      description: 'Detects potential structuring behavior',
      condition: (tx) => {
        // Multiple transactions just under reporting threshold
        return tx.amount >= 9000 && tx.amount <= 9999;
      },
      severity: 'high',
      indicators: ['STRUCTURING', 'SMURFING'],
      enabled: true
    });
    
    // Round amount detection
    this.addRule({
      id: 'round_amounts',
      name: 'Round Amount Pattern',
      description: 'Detects suspicious round amounts',
      condition: (tx) => {
        return tx.amount % 1000 === 0 && tx.amount >= 5000;
      },
      severity: 'low',
      indicators: ['ROUND_AMOUNT'],
      enabled: true
    });
    
    // Geographic risk
    this.addRule({
      id: 'high_risk_jurisdiction',
      name: 'High Risk Jurisdiction',
      description: 'Transaction involving high-risk countries',
      condition: (tx) => {
        const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Cuba', 'Myanmar'];
        const metadata = tx.metadata || {};
        return highRiskCountries.includes(metadata.sourceCountry) ||
               highRiskCountries.includes(metadata.destinationCountry);
      },
      severity: 'critical',
      indicators: ['HIGH_RISK_JURISDICTION', 'SANCTIONS_RISK'],
      enabled: true
    });
    
    // Dormant account sudden activity
    this.addRule({
      id: 'dormant_account',
      name: 'Dormant Account Activity',
      description: 'Sudden activity in previously dormant account',
      condition: async (tx, profile) => {
        const lastActivityKey = `last_activity:${tx.userId}`;
        const lastActivity = await this.redis.get(lastActivityKey);
        if (!lastActivity) return false;
        
        const daysSinceLastActivity = 
          (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60 * 24);
        
        return daysSinceLastActivity > 90 && tx.amount > 5000;
      },
      severity: 'medium',
      indicators: ['DORMANT_ACCOUNT_ACTIVITY'],
      enabled: true
    });
    
    // Pattern break detection
    this.addRule({
      id: 'pattern_break',
      name: 'Unusual Pattern',
      description: 'Transaction breaks user normal pattern',
      condition: (tx, profile) => {
        if (profile.averageTransactionSize === 0) return false;
        
        // Transaction is 5x larger than average
        return tx.amount > profile.averageTransactionSize * 5;
      },
      severity: 'medium',
      indicators: ['PATTERN_BREAK', 'UNUSUAL_BEHAVIOR'],
      enabled: true
    });
  }
  
  addRule(rule: MonitoringRule) {
    this.rules.set(rule.id, rule);
  }
  
  removeRule(ruleId: string) {
    this.rules.delete(ruleId);
  }
  
  async monitorTransaction(transaction: Transaction): Promise<AMLAlert[]> {
    const alerts: AMLAlert[] = [];
    
    // Get user risk profile
    const profile = await this.getUserRiskProfile(transaction.userId);
    
    // Update transaction velocity tracking
    await this.updateVelocityTracking(transaction);
    
    // Check each rule
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      try {
        const triggered = await Promise.resolve(rule.condition(transaction, profile));
        
        if (triggered) {
          const alert = await this.createAlert({
            userId: transaction.userId,
            alertType: rule.name,
            severity: rule.severity,
            description: rule.description,
            transactionIds: [transaction.id],
            indicators: rule.indicators,
            score: this.calculateAlertScore(rule.severity, profile.riskScore)
          });
          
          alerts.push(alert);
          
          // Emit alert event
          this.emit('alert', alert);
        }
      } catch (error) {
        console.error(`Error checking rule ${ruleId}:`, error);
      }
    }
    
    // Update user risk profile
    await this.updateUserRiskProfile(transaction, alerts);
    
    // Check for alert correlation
    await this.correlateAlerts(transaction.userId, alerts);
    
    return alerts;
  }
  
  private async getUserRiskProfile(userId: string): Promise<UserRiskProfile> {
    // Try cache first
    const cached = await this.redis.get(`risk_profile:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database
    const result = await this.db.query(
      `SELECT 
        user_id,
        risk_score,
        risk_level,
        transaction_count,
        total_volume,
        average_transaction_size,
        largest_transaction,
        unusual_patterns,
        last_updated
      FROM user_risk_profiles
      WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create default profile
      return {
        userId,
        riskScore: 0,
        riskLevel: 'low',
        transactionCount: 0,
        totalVolume: 0,
        averageTransactionSize: 0,
        largestTransaction: 0,
        unusualPatterns: [],
        lastUpdated: new Date()
      };
    }
    
    const profile = {
      userId: result.rows[0].user_id,
      riskScore: result.rows[0].risk_score,
      riskLevel: result.rows[0].risk_level,
      transactionCount: result.rows[0].transaction_count,
      totalVolume: result.rows[0].total_volume,
      averageTransactionSize: result.rows[0].average_transaction_size,
      largestTransaction: result.rows[0].largest_transaction,
      unusualPatterns: result.rows[0].unusual_patterns || [],
      lastUpdated: result.rows[0].last_updated
    };
    
    // Cache for 1 hour
    await this.redis.setex(
      `risk_profile:${userId}`,
      3600,
      JSON.stringify(profile)
    );
    
    return profile;
  }
  
  private async updateVelocityTracking(transaction: Transaction) {
    const velocityKey = `recent_tx:${transaction.userId}`;
    const velocityWindow = 3600; // 1 hour window
    
    // Increment transaction count
    await this.redis.multi()
      .incr(velocityKey)
      .expire(velocityKey, velocityWindow)
      .exec();
    
    // Track transaction amounts
    const amountKey = `tx_amounts:${transaction.userId}`;
    await this.redis.multi()
      .zadd(amountKey, Date.now(), `${transaction.id}:${transaction.amount}`)
      .expire(amountKey, velocityWindow)
      .exec();
    
    // Update last activity
    await this.redis.set(
      `last_activity:${transaction.userId}`,
      Date.now().toString()
    );
  }
  
  private async createAlert(data: Omit<AMLAlert, 'id' | 'createdAt' | 'status'>): Promise<AMLAlert> {
    const alert: AMLAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
      status: 'new'
    };
    
    // Store in database
    await this.db.query(
      `INSERT INTO aml_alerts 
      (id, user_id, alert_type, severity, description, transaction_ids, 
       score, indicators, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        alert.id,
        alert.userId,
        alert.alertType,
        alert.severity,
        alert.description,
        JSON.stringify(alert.transactionIds),
        alert.score,
        JSON.stringify(alert.indicators),
        alert.status,
        alert.createdAt
      ]
    );
    
    return alert;
  }
  
  private calculateAlertScore(severity: string, userRiskScore: number): number {
    const severityScores = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 90
    };
    
    const baseScore = severityScores[severity as keyof typeof severityScores] || 0;
    const adjustedScore = baseScore + (userRiskScore * 0.2);
    
    return Math.min(adjustedScore, 100);
  }
  
  private async updateUserRiskProfile(transaction: Transaction, alerts: AMLAlert[]) {
    const profile = await this.getUserRiskProfile(transaction.userId);
    
    // Update transaction statistics
    profile.transactionCount += 1;
    profile.totalVolume += transaction.amount;
    profile.averageTransactionSize = profile.totalVolume / profile.transactionCount;
    
    if (transaction.amount > profile.largestTransaction) {
      profile.largestTransaction = transaction.amount;
    }
    
    // Update risk score based on alerts
    if (alerts.length > 0) {
      const alertScoreIncrease = alerts.reduce((sum, alert) => sum + alert.score, 0) / 10;
      profile.riskScore = Math.min(profile.riskScore + alertScoreIncrease, 100);
    } else {
      // Decay risk score slightly for clean transactions
      profile.riskScore = Math.max(profile.riskScore - 0.5, 0);
    }
    
    // Update risk level
    if (profile.riskScore >= 70) {
      profile.riskLevel = 'critical';
    } else if (profile.riskScore >= 50) {
      profile.riskLevel = 'high';
    } else if (profile.riskScore >= 30) {
      profile.riskLevel = 'medium';
    } else {
      profile.riskLevel = 'low';
    }
    
    // Add new unusual patterns
    const newPatterns = alerts.flatMap(a => a.indicators);
    profile.unusualPatterns = [...new Set([...profile.unusualPatterns, ...newPatterns])];
    
    profile.lastUpdated = new Date();
    
    // Save to database
    await this.db.query(
      `INSERT INTO user_risk_profiles 
      (user_id, risk_score, risk_level, transaction_count, total_volume, 
       average_transaction_size, largest_transaction, unusual_patterns, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        risk_score = $2,
        risk_level = $3,
        transaction_count = $4,
        total_volume = $5,
        average_transaction_size = $6,
        largest_transaction = $7,
        unusual_patterns = $8,
        last_updated = $9`,
      [
        profile.userId,
        profile.riskScore,
        profile.riskLevel,
        profile.transactionCount,
        profile.totalVolume,
        profile.averageTransactionSize,
        profile.largestTransaction,
        JSON.stringify(profile.unusualPatterns),
        profile.lastUpdated
      ]
    );
    
    // Update cache
    await this.redis.setex(
      `risk_profile:${profile.userId}`,
      3600,
      JSON.stringify(profile)
    );
  }
  
  private async correlateAlerts(userId: string, newAlerts: AMLAlert[]) {
    if (newAlerts.length === 0) return;
    
    // Get recent alerts for the user
    const recentAlerts = await this.db.query(
      `SELECT * FROM aml_alerts 
      WHERE user_id = $1 
        AND created_at > NOW() - INTERVAL '24 hours'
        AND status != 'resolved'
      ORDER BY created_at DESC`,
      [userId]
    );
    
    // Check for patterns
    const alertTypes = new Set(recentAlerts.rows.map(a => a.alert_type));
    
    // Multiple alert types in short period
    if (alertTypes.size >= 3) {
      await this.createAlert({
        userId,
        alertType: 'Multiple Alert Pattern',
        severity: 'critical',
        description: 'Multiple different alert types triggered within 24 hours',
        transactionIds: newAlerts.flatMap(a => a.transactionIds),
        indicators: ['MULTIPLE_ALERTS', 'PATTERN_DETECTED'],
        score: 85
      });
    }
    
    // Escalate if too many high severity alerts
    const highSeverityCount = recentAlerts.rows.filter(
      a => a.severity === 'high' || a.severity === 'critical'
    ).length;
    
    if (highSeverityCount >= 2) {
      // Escalate to compliance team
      this.emit('escalation', {
        userId,
        reason: 'Multiple high severity alerts',
        alertCount: highSeverityCount,
        alerts: recentAlerts.rows
      });
    }
  }
  
  async generateSAR(userId: string, alertIds: string[]): Promise<any> {
    // Generate Suspicious Activity Report
    const alerts = await this.db.query(
      'SELECT * FROM aml_alerts WHERE id = ANY($1)',
      [alertIds]
    );
    
    const transactions = await this.db.query(
      `SELECT * FROM transactions 
      WHERE id = ANY($1)
      ORDER BY timestamp DESC`,
      [alerts.rows.flatMap(a => JSON.parse(a.transaction_ids))]
    );
    
    const user = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    return {
      reportId: `SAR_${Date.now()}`,
      userId,
      userInfo: user.rows[0],
      alerts: alerts.rows,
      transactions: transactions.rows,
      totalAmount: transactions.rows.reduce((sum, tx) => sum + tx.amount, 0),
      indicators: [...new Set(alerts.rows.flatMap(a => JSON.parse(a.indicators)))],
      generatedAt: new Date(),
      status: 'draft'
    };
  }
  
  async startMonitoring() {
    this.monitoring = true;
    console.log('AML monitoring started');
    this.emit('monitoring_started');
  }
  
  async stopMonitoring() {
    this.monitoring = false;
    console.log('AML monitoring stopped');
    this.emit('monitoring_stopped');
  }
  
  isMonitoring(): boolean {
    return this.monitoring;
  }
}