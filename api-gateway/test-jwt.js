const jwt = require('jsonwebtoken');
const token = jwt.sign({
  id: 'test-user',
  email: 'test@veria.app',
  role: 'investor',
  orgId: 'org-123',
  scopes: ['portfolio:read', 'kyc:read', 'statements:read']
}, 'dev-secret-change-in-production');
console.log(token);
