import type { ComplianceRule } from '../rules/rule-engine.js';
import type { MonitoringRule } from '../monitoring/transaction-monitor.js';

export const defaultComplianceRules: ComplianceRule[] = [
  {
    id: 'kyc-verification',
    name: 'KYC Verification Check',
    description: 'Ensures user has completed KYC verification',
    type: 'kyc',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'user.kyc_status',
        operator: 'eq',
        value: 'verified'
      }
    ],
    actions: [
      {
        type: 'reject',
        parameters: {
          message: 'KYC verification is required before proceeding',
          code: 'KYC_REQUIRED'
        }
      }
    ]
  },
  {
    id: 'aml-risk-score',
    name: 'AML Risk Score Check',
    description: 'Evaluates AML risk score thresholds',
    type: 'aml',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'user.aml_risk_score',
        operator: 'lt',
        value: 70
      }
    ],
    actions: [
      {
        type: 'manual_review',
        parameters: {
          message: 'High AML risk score detected',
          escalation_level: 2
        }
      }
    ]
  },
  {
    id: 'transaction-limit-daily',
    name: 'Daily Transaction Limit',
    description: 'Enforces daily transaction limits',
    type: 'transaction',
    priority: 80,
    enabled: true,
    conditions: [
      {
        field: 'transaction.amount',
        operator: 'lte',
        value: 100000
      }
    ],
    actions: [
      {
        type: 'flag',
        parameters: {
          message: 'Daily transaction limit exceeded',
          notification: true
        }
      }
    ]
  },
  {
    id: 'accreditation-check',
    name: 'Accredited Investor Check',
    description: 'Verifies accredited investor status for certain assets',
    type: 'accreditation',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'user.accreditation_status',
        operator: 'eq',
        value: 'verified'
      }
    ],
    actions: [
      {
        type: 'reject',
        parameters: {
          message: 'Accredited investor status required',
          code: 'ACCREDITATION_REQUIRED'
        }
      }
    ]
  },
  {
    id: 'jurisdiction-restrictions',
    name: 'Jurisdiction Restrictions',
    description: 'Enforces geographic restrictions',
    type: 'jurisdiction',
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: 'user.jurisdiction',
        operator: 'nin',
        value: ['North Korea', 'Iran', 'Syria', 'Cuba', 'Crimea']
      }
    ],
    actions: [
      {
        type: 'reject',
        parameters: {
          message: 'Service not available in your jurisdiction',
          code: 'RESTRICTED_JURISDICTION'
        }
      }
    ]
  }
];

export const defaultMonitoringRules: MonitoringRule[] = [
  {
    id: 'velocity-check',
    name: 'Transaction Velocity Monitor',
    description: 'Monitors transaction velocity within time windows',
    type: 'velocity',
    enabled: true,
    parameters: {
      timeWindow: 3600, // 1 hour in seconds
      maxTransactions: 20,
      maxAmount: 100000
    },
    risk_weight: 1.5,
    actions: [
      {
        type: 'alert',
        threshold: 50
      },
      {
        type: 'review',
        threshold: 70
      },
      {
        type: 'block',
        threshold: 90
      }
    ]
  },
  {
    id: 'large-amount',
    name: 'Large Transaction Monitor',
    description: 'Flags unusually large transactions',
    type: 'amount',
    enabled: true,
    parameters: {
      maxAmount: 50000,
      deviationThreshold: 5 // 5x average
    },
    risk_weight: 1.3,
    actions: [
      {
        type: 'flag',
        threshold: 40
      },
      {
        type: 'review',
        threshold: 60
      }
    ]
  },
  {
    id: 'structuring-detection',
    name: 'Structuring Pattern Detection',
    description: 'Detects potential structuring behavior',
    type: 'pattern',
    enabled: true,
    parameters: {
      patterns: [
        {
          type: 'structuring',
          amount_threshold: 10000,
          time_window: 86400, // 24 hours
          min_transactions: 3,
          precision: 100
        }
      ]
    },
    risk_weight: 2.0,
    actions: [
      {
        type: 'alert',
        threshold: 60
      },
      {
        type: 'report',
        threshold: 75
      },
      {
        type: 'block',
        threshold: 95
      }
    ]
  },
  {
    id: 'rapid-movement',
    name: 'Rapid Fund Movement',
    description: 'Detects rapid movement of funds through accounts',
    type: 'pattern',
    enabled: true,
    parameters: {
      patterns: [
        {
          type: 'rapid_movement',
          time_window: 3600, // 1 hour
          min_hops: 3
        }
      ]
    },
    risk_weight: 1.8,
    actions: [
      {
        type: 'alert',
        threshold: 50
      },
      {
        type: 'review',
        threshold: 70
      }
    ]
  },
  {
    id: 'dormant-account',
    name: 'Dormant Account Activity',
    description: 'Monitors activity on previously dormant accounts',
    type: 'behavior',
    enabled: true,
    parameters: {
      behaviors: [
        {
          type: 'dormant_account',
          dormancy_days: 90
        }
      ]
    },
    risk_weight: 1.4,
    actions: [
      {
        type: 'flag',
        threshold: 30
      },
      {
        type: 'review',
        threshold: 50
      }
    ]
  },
  {
    id: 'new-counterparty',
    name: 'New Counterparty Detection',
    description: 'Flags transactions to new counterparties',
    type: 'behavior',
    enabled: true,
    parameters: {
      behaviors: [
        {
          type: 'new_counterparty'
        }
      ]
    },
    risk_weight: 1.1,
    actions: [
      {
        type: 'flag',
        threshold: 25
      }
    ]
  },
  {
    id: 'unusual-time',
    name: 'Unusual Transaction Time',
    description: 'Detects transactions at unusual hours',
    type: 'behavior',
    enabled: true,
    parameters: {
      behaviors: [
        {
          type: 'unusual_time',
          unusual_hours: [0, 1, 2, 3, 4, 5] // Midnight to 5 AM
        }
      ]
    },
    risk_weight: 1.0,
    actions: [
      {
        type: 'flag',
        threshold: 20
      }
    ]
  },
  {
    id: 'aggregate-daily-volume',
    name: 'Daily Volume Aggregation',
    description: 'Monitors aggregate daily transaction volume',
    type: 'aggregate',
    enabled: true,
    parameters: {
      aggregation_period: 86400, // 24 hours
      aggregation_field: 'SUM(amount)',
      threshold: 500000
    },
    risk_weight: 1.6,
    actions: [
      {
        type: 'alert',
        threshold: 50
      },
      {
        type: 'review',
        threshold: 75
      }
    ]
  }
];

// Sanctions list sources configuration
export const sanctionsListSources = {
  OFAC: {
    name: 'Office of Foreign Assets Control',
    url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
    updateFrequency: 'daily'
  },
  UN: {
    name: 'United Nations Security Council',
    url: 'https://www.un.org/securitycouncil/sanctions/1267/aq_sanctions_list',
    updateFrequency: 'weekly'
  },
  EU: {
    name: 'European Union Consolidated List',
    url: 'https://webgate.ec.europa.eu/fsd/fsf',
    updateFrequency: 'daily'
  },
  UK: {
    name: 'UK HM Treasury',
    url: 'https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets',
    updateFrequency: 'daily'
  }
};

// Risk scoring weights
export const riskScoringWeights = {
  kyc: {
    unverified: 30,
    pending: 15,
    expired: 20,
    verified: 0
  },
  aml: {
    high: 40,
    medium: 20,
    low: 5,
    clear: 0
  },
  sanctions: {
    confirmed_match: 100,
    potential_match: 50,
    clear: 0
  },
  transaction: {
    velocity_high: 30,
    amount_unusual: 25,
    pattern_suspicious: 40,
    behavior_abnormal: 20
  },
  jurisdiction: {
    restricted: 100,
    high_risk: 30,
    medium_risk: 10,
    low_risk: 0
  }
};

// Compliance thresholds
export const complianceThresholds = {
  autoApprove: {
    maxRiskScore: 20,
    requireAllChecks: true
  },
  manualReview: {
    minRiskScore: 21,
    maxRiskScore: 70
  },
  autoReject: {
    minRiskScore: 71
  },
  transactionLimits: {
    daily: {
      count: 100,
      volume: 1000000
    },
    monthly: {
      count: 1000,
      volume: 10000000
    }
  }
};