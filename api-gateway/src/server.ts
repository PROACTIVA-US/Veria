import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});

app.use(cors());
app.use(express.json());
app.use('/api', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', phase: 'Phase 3 - Planned' });
});

app.get('/api/accounts/sync', (req, res) => {
  res.json({
    message: 'Account sync endpoint - Phase 3 implementation pending',
    connectors: ['quickbooks', 'xero', 'netsuite']
  });
});

app.get('/api/assets/tokenized', (req, res) => {
  res.json({
    message: 'Tokenized assets endpoint - Phase 3 implementation pending',
    mockAssets: [
      { type: 'T-Bills', value: 50150 },
      { type: 'MMF', value: 25000 }
    ]
  });
});

app.get('/api/reports/audit', (req, res) => {
  res.json({
    message: 'Audit reports endpoint - Phase 3 implementation pending',
    reportTypes: ['compliance', 'reconciliation', 'audit_trail']
  });
});

app.get('/api/tax/forms', (req, res) => {
  res.json({
    message: 'Tax forms endpoint - Phase 3 implementation pending',
    supportedForms: ['8949', '1099', 'K-1']
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT} (Phase 3 - Scaffold Only)`);
});