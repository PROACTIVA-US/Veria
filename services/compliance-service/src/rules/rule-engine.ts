import type { Pool } from 'pg';
import type Redis from 'ioredis';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: 'kyc' | 'aml' | 'sanctions' | 'transaction' | 'jurisdiction' | 'accreditation';
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata?: Record<string, any>;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'approve' | 'reject' | 'flag' | 'manual_review' | 'notify' | 'log';
  parameters?: Record<string, any>;
}

export interface RuleContext {
  transaction?: {
    id: string;
    amount: number;
    currency: string;
    type: string;
    from_account?: string;
    to_account?: string;
    metadata?: Record<string, any>;
  };
  user?: {
    id: string;
    kyc_status?: string;
    aml_risk_score?: number;
    jurisdiction?: string;
    accreditation_status?: string;
    account_age_days?: number;
    total_transaction_volume?: number;
    metadata?: Record<string, any>;
  };
  environment?: {
    timestamp: string;
    source_ip?: string;
    user_agent?: string;
    session_id?: string;
  };
}

export interface RuleEvaluationResult {
  rule_id: string;
  rule_name: string;
  passed: boolean;
  action: RuleAction | null;
  evaluation_time_ms: number;
  matched_conditions: RuleCondition[];
  context: Record<string, any>;
}

export class ComplianceRuleEngine {
  private rules: Map<string, ComplianceRule> = new Map();
  private db: Pool;
  private redis: Redis;

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }

  async loadRules(): Promise<void> {
    // Load rules from database
    const query = `
      SELECT * FROM compliance_rules 
      WHERE enabled = true 
      ORDER BY priority DESC
    `;
    
    try {
      const result = await this.db.query(query);
      this.rules.clear();
      
      for (const row of result.rows) {
        const rule: ComplianceRule = {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          priority: row.priority,
          enabled: row.enabled,
          conditions: JSON.parse(row.conditions || '[]'),
          actions: JSON.parse(row.actions || '[]'),
          metadata: row.metadata
        };
        this.rules.set(rule.id, rule);
      }
      
      // Cache rules in Redis for faster access
      await this.redis.set(
        'compliance:rules:loaded',
        JSON.stringify(Array.from(this.rules.values())),
        'EX',
        300 // 5 minutes TTL
      );
    } catch (error) {
      console.error('Failed to load compliance rules:', error);
      // Try to load from cache if database fails
      const cached = await this.redis.get('compliance:rules:loaded');
      if (cached) {
        const rules = JSON.parse(cached) as ComplianceRule[];
        this.rules.clear();
        rules.forEach(rule => this.rules.set(rule.id, rule));
      }
    }
  }

  async evaluateRules(context: RuleContext, ruleType?: string): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    
    // Filter rules by type if specified
    const rulesToEvaluate = ruleType
      ? Array.from(this.rules.values()).filter(r => r.type === ruleType)
      : Array.from(this.rules.values());
    
    // Sort by priority
    rulesToEvaluate.sort((a, b) => b.priority - a.priority);
    
    for (const rule of rulesToEvaluate) {
      const startTime = Date.now();
      const result = await this.evaluateRule(rule, context);
      result.evaluation_time_ms = Date.now() - startTime;
      results.push(result);
      
      // If rule has a reject action and failed, stop processing
      if (!result.passed && result.action?.type === 'reject') {
        break;
      }
    }
    
    return results;
  }

  private async evaluateRule(rule: ComplianceRule, context: RuleContext): Promise<RuleEvaluationResult> {
    const matchedConditions: RuleCondition[] = [];
    let overallResult = true;
    let currentGroupResult = true;
    let lastLogic: 'AND' | 'OR' = 'AND';

    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, context);
      
      if (conditionResult) {
        matchedConditions.push(condition);
      }
      
      // Handle logical operators
      if (condition.logic === 'OR') {
        if (lastLogic === 'AND') {
          overallResult = overallResult && currentGroupResult;
          currentGroupResult = conditionResult;
        } else {
          currentGroupResult = currentGroupResult || conditionResult;
        }
      } else {
        currentGroupResult = currentGroupResult && conditionResult;
      }
      
      lastLogic = condition.logic || 'AND';
    }
    
    // Final evaluation
    overallResult = overallResult && currentGroupResult;
    
    // Determine action based on result
    let action: RuleAction | null = null;
    if (overallResult && rule.actions.length > 0) {
      action = rule.actions.find(a => a.type === 'approve') || rule.actions[0];
    } else if (!overallResult && rule.actions.length > 0) {
      action = rule.actions.find(a => a.type === 'reject' || a.type === 'flag' || a.type === 'manual_review') || rule.actions[0];
    }
    
    // Log evaluation result
    await this.logEvaluation(rule, overallResult, context);
    
    return {
      rule_id: rule.id,
      rule_name: rule.name,
      passed: overallResult,
      action,
      evaluation_time_ms: 0,
      matched_conditions: matchedConditions,
      context: { rule_metadata: rule.metadata }
    };
  }

  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    const value = this.extractValue(condition.field, context);
    const targetValue = condition.value;
    
    switch (condition.operator) {
      case 'eq':
        return value === targetValue;
      case 'neq':
        return value !== targetValue;
      case 'gt':
        return Number(value) > Number(targetValue);
      case 'gte':
        return Number(value) >= Number(targetValue);
      case 'lt':
        return Number(value) < Number(targetValue);
      case 'lte':
        return Number(value) <= Number(targetValue);
      case 'in':
        return Array.isArray(targetValue) && targetValue.includes(value);
      case 'nin':
        return Array.isArray(targetValue) && !targetValue.includes(value);
      case 'contains':
        return String(value).includes(String(targetValue));
      case 'regex':
        return new RegExp(targetValue).test(String(value));
      default:
        return false;
    }
  }

  private extractValue(field: string, context: RuleContext): any {
    const parts = field.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private async logEvaluation(rule: ComplianceRule, passed: boolean, context: RuleContext): Promise<void> {
    const logEntry = {
      rule_id: rule.id,
      rule_name: rule.name,
      passed,
      context,
      timestamp: new Date().toISOString()
    };
    
    // Store in Redis for real-time monitoring
    await this.redis.lpush('compliance:evaluations:log', JSON.stringify(logEntry));
    await this.redis.ltrim('compliance:evaluations:log', 0, 999); // Keep last 1000 entries
    
    // Store in database for audit trail
    try {
      await this.db.query(
        `INSERT INTO compliance_rule_evaluations 
         (rule_id, rule_name, passed, context, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [rule.id, rule.name, passed, JSON.stringify(context), new Date()]
      );
    } catch (error) {
      console.error('Failed to log rule evaluation:', error);
    }
  }

  async addRule(rule: ComplianceRule): Promise<void> {
    // Store in database
    await this.db.query(
      `INSERT INTO compliance_rules 
       (id, name, description, type, priority, enabled, conditions, actions, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
       name = $2, description = $3, type = $4, priority = $5, 
       enabled = $6, conditions = $7, actions = $8, metadata = $9`,
      [
        rule.id,
        rule.name,
        rule.description,
        rule.type,
        rule.priority,
        rule.enabled,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        JSON.stringify(rule.metadata || {})
      ]
    );
    
    // Update in-memory cache
    this.rules.set(rule.id, rule);
    
    // Invalidate Redis cache
    await this.redis.del('compliance:rules:loaded');
  }

  async removeRule(ruleId: string): Promise<void> {
    // Remove from database
    await this.db.query('DELETE FROM compliance_rules WHERE id = $1', [ruleId]);
    
    // Remove from in-memory cache
    this.rules.delete(ruleId);
    
    // Invalidate Redis cache
    await this.redis.del('compliance:rules:loaded');
  }

  async updateRule(ruleId: string, updates: Partial<ComplianceRule>): Promise<void> {
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    const updatedRule = { ...existingRule, ...updates, id: ruleId };
    await this.addRule(updatedRule);
  }

  getRules(type?: string): ComplianceRule[] {
    if (type) {
      return Array.from(this.rules.values()).filter(r => r.type === type);
    }
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): ComplianceRule | undefined {
    return this.rules.get(ruleId);
  }
}