import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 50 },   // Ramp down to 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test_token';

// Setup function - runs once before the test
export function setup() {
  // Verify gateway is healthy
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'Gateway is healthy': (r) => r.status === 200,
  });
  
  return { 
    baseUrl: BASE_URL,
    authToken: AUTH_TOKEN 
  };
}

// Main test function - runs for each virtual user
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.authToken}`,
  };

  // Scenario 1: Health check (10% of requests)
  if (Math.random() < 0.1) {
    const healthRes = http.get(`${data.baseUrl}/health`);
    check(healthRes, {
      'Health check status is 200': (r) => r.status === 200,
      'Health check response time < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(healthRes.status !== 200);
  }

  // Scenario 2: Policy operations (40% of requests)
  if (Math.random() < 0.4) {
    // Get policies list
    const policiesRes = http.get(`${data.baseUrl}/policies`, { headers });
    check(policiesRes, {
      'Get policies status OK': (r) => r.status === 200 || r.status === 401,
      'Get policies response time < 300ms': (r) => r.timings.duration < 300,
    });
    errorRate.add(policiesRes.status >= 500);

    // Create a new policy (10% chance)
    if (Math.random() < 0.1) {
      const policyPayload = JSON.stringify({
        name: `Load Test Policy ${Date.now()}`,
        version: '1.0',
        rules: {
          kyc_required: true,
          min_investment: 1000,
          max_investment: 100000,
        },
        status: 'draft',
      });

      const createPolicyRes = http.post(
        `${data.baseUrl}/policies`,
        policyPayload,
        { headers }
      );
      
      check(createPolicyRes, {
        'Create policy status OK': (r) => r.status === 201 || r.status === 401,
        'Create policy response time < 500ms': (r) => r.timings.duration < 500,
      });
      errorRate.add(createPolicyRes.status >= 500);

      // If policy was created, try to retrieve it
      if (createPolicyRes.status === 201) {
        const policyData = JSON.parse(createPolicyRes.body);
        if (policyData.data && policyData.data.id) {
          sleep(0.5); // Small delay before retrieval
          
          const getPolicyRes = http.get(
            `${data.baseUrl}/policies/${policyData.data.id}`,
            { headers }
          );
          
          check(getPolicyRes, {
            'Get specific policy status is 200': (r) => r.status === 200,
            'Get specific policy response time < 200ms': (r) => r.timings.duration < 200,
          });
          errorRate.add(getPolicyRes.status !== 200);
        }
      }
    }

    // Validate policy (20% chance)
    if (Math.random() < 0.2) {
      const validatePayload = JSON.stringify({
        version: '1.0',
        metadata: {
          name: 'Validation Test Policy',
          jurisdiction: ['US', 'EU'],
        },
        requirements: {
          sanctions: 'cleared',
        },
        limits: {
          min_investment: 5000,
          max_investment: 500000,
        },
      });

      const validateRes = http.post(
        `${data.baseUrl}/policies/validate`,
        validatePayload,
        { headers }
      );
      
      check(validateRes, {
        'Validate policy status is 200': (r) => r.status === 200 || r.status === 401,
        'Validate policy response time < 300ms': (r) => r.timings.duration < 300,
      });
      errorRate.add(validateRes.status >= 500);
    }
  }

  // Scenario 3: Compliance checks (30% of requests)
  if (Math.random() < 0.3) {
    const compliancePayload = JSON.stringify({
      transaction_id: `txn_load_${Date.now()}_${__VU}`,
      user_id: `user_${__VU}`,
      amount: Math.floor(Math.random() * 100000) + 1000,
      jurisdiction: ['United States', 'United Kingdom', 'Germany'][Math.floor(Math.random() * 3)],
      context: {
        kyc_verified: Math.random() > 0.2,
        accredited_investor: Math.random() > 0.3,
      },
    });

    const complianceRes = http.post(
      `${data.baseUrl}/compliance/check`,
      compliancePayload,
      { headers }
    );
    
    check(complianceRes, {
      'Compliance check status OK': (r) => r.status === 200 || r.status === 401,
      'Compliance check response time < 400ms': (r) => r.timings.duration < 400,
    });
    errorRate.add(complianceRes.status >= 500);
  }

  // Scenario 4: Policy simulation (20% of requests)
  if (Math.random() < 0.2) {
    const simulatePayload = JSON.stringify({
      context: {
        investment_amount: Math.floor(Math.random() * 50000) + 5000,
        jurisdiction: 'US',
        kyc_verified: true,
      },
    });

    const simulateRes = http.post(
      `${data.baseUrl}/policies/simulate`,
      simulatePayload,
      { headers }
    );
    
    check(simulateRes, {
      'Simulate policy status OK': (r) => r.status === 200 || r.status === 401,
      'Simulate policy response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(simulateRes.status >= 500);
  }

  // Random sleep between 0.5 and 2 seconds to simulate real user behavior
  sleep(0.5 + Math.random() * 1.5);
}

// Teardown function - runs once after the test
export function teardown(data) {
  // Could perform cleanup here if needed
  console.log('Load test completed');
}