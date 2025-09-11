import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const fetchDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};

// KYC
export const fetchKycVerifications = async (params: {
  searchTerm?: string;
  statusFilter?: string;
  riskFilter?: string;
}) => {
  const { data } = await api.get('/kyc/verifications', { params });
  return data;
};

// Compliance
export const fetchComplianceChecks = async () => {
  const { data } = await api.get('/compliance/checks');
  return data;
};

// Reports
export const fetchReports = async (params: {
  type?: string;
  range?: string;
}) => {
  const { data } = await api.get('/reports', { params });
  return data;
};

export const generateReport = async (type: string) => {
  const { data } = await api.post('/reports/generate', { type });
  return data;
};

// Risk
export const fetchRiskMetrics = async () => {
  const { data } = await api.get('/risk/metrics');
  return data;
};

// Mock data for development
api.interceptors.response.use(
  response => response,
  error => {
    // Return mock data when backend is not available
    if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
      const url = error.config.url;
      
      if (url.includes('/dashboard/stats')) {
        return {
          data: {
            totalUsers: 1247,
            userChange: 12,
            kycVerified: 1089,
            kycChange: 8,
            pendingReviews: 43,
            pendingChange: -5,
            riskAlerts: 7,
            alertChange: 2,
            complianceTrends: [
              { date: 'Jan', verified: 120, pending: 30, rejected: 10 },
              { date: 'Feb', verified: 145, pending: 25, rejected: 8 },
              { date: 'Mar', verified: 160, pending: 35, rejected: 12 },
              { date: 'Apr', verified: 180, pending: 20, rejected: 5 },
              { date: 'May', verified: 195, pending: 28, rejected: 7 },
            ],
            riskDistribution: [
              { level: 'Low', count: 850, color: '#10b981' },
              { level: 'Medium', count: 300, color: '#f59e0b' },
              { level: 'High', count: 80, color: '#ef4444' },
              { level: 'Critical', count: 17, color: '#991b1b' },
            ],
            recentActivities: [
              {
                id: '1',
                type: 'kyc_verified',
                user: 'John Smith',
                timestamp: new Date().toISOString(),
                details: 'KYC verification completed successfully',
                status: 'success',
              },
              {
                id: '2',
                type: 'risk_alert',
                user: 'Jane Doe',
                timestamp: new Date().toISOString(),
                details: 'High risk score detected - manual review required',
                status: 'warning',
              },
            ],
          }
        };
      }
      
      if (url.includes('/kyc/verifications')) {
        return {
          data: {
            verifications: [
              {
                id: 'KYC001',
                userId: 'USR123',
                userName: 'Alice Johnson',
                status: 'verified',
                riskLevel: 'low',
                provider: 'Chainalysis',
                verifiedAt: new Date().toISOString(),
                score: 95,
              },
              {
                id: 'KYC002',
                userId: 'USR124',
                userName: 'Bob Williams',
                status: 'pending',
                riskLevel: 'medium',
                provider: 'TRM Labs',
                verifiedAt: new Date().toISOString(),
                score: 65,
              },
            ]
          }
        };
      }
      
      if (url.includes('/compliance/checks')) {
        return {
          data: [
            {
              id: 'CHK001',
              type: 'AML Screening',
              userId: 'USR123',
              status: 'PASSED',
              score: 92,
              timestamp: new Date().toISOString(),
              flags: [],
            },
            {
              id: 'CHK002',
              type: 'Sanctions Check',
              userId: 'USR124',
              status: 'WARNING',
              score: 45,
              timestamp: new Date().toISOString(),
              flags: ['POTENTIAL_MATCH'],
            },
          ]
        };
      }
      
      if (url.includes('/risk/metrics')) {
        return {
          data: {
            overallScore: 72,
            highRiskUsers: 23,
            mitigatedRisks: 156,
            activeMonitors: 8,
            categoryDistribution: [
              { category: 'Identity', low: 120, medium: 30, high: 10 },
              { category: 'Transaction', low: 200, medium: 50, high: 20 },
              { category: 'Geographic', low: 150, medium: 40, high: 15 },
              { category: 'Behavioral', low: 180, medium: 35, high: 8 },
            ],
            indicators: [
              { name: 'Transaction Velocity', value: 35 },
              { name: 'Geographic Risk', value: 48 },
              { name: 'PEP Exposure', value: 22 },
              { name: 'Sanctions Risk', value: 15 },
              { name: 'Behavioral Anomalies', value: 62 },
            ],
            recentEvents: [
              {
                id: 'EVT001',
                title: 'Unusual Transaction Pattern',
                description: 'Multiple high-value transactions detected from USR456',
                severity: 'medium',
                timestamp: '10 minutes ago',
                action: 'Review Details',
              },
              {
                id: 'EVT002',
                title: 'New High Risk Jurisdiction',
                description: 'User USR789 connected from restricted country',
                severity: 'high',
                timestamp: '1 hour ago',
                action: 'Investigate',
              },
            ],
          }
        };
      }
      
      if (url.includes('/reports')) {
        return {
          data: [
            {
              id: 'RPT001',
              name: 'Monthly Compliance Summary',
              type: 'compliance',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'RPT002',
              name: 'Suspicious Activity Report',
              type: 'sar',
              createdAt: new Date().toISOString(),
            },
          ]
        };
      }
    }
    return Promise.reject(error);
  }
);

export default api;