import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.TAX_ENGINE_PORT || 3003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'tax-engine', phase: 'Phase 2 - Planned' });
});

app.get('/tax/liability', (req, res) => {
  res.json({
    message: 'Tax liability calculation - Phase 2 implementation pending',
    plannedFeatures: ['Gain/loss tracking', 'Tax calculations', 'Multi-jurisdiction support']
  });
});

app.post('/tax/forms/:type', (req, res) => {
  const { type } = req.params;
  res.json({
    message: `Tax form generation (${type}) - Phase 2 implementation pending`,
    supportedForms: ['8949', '1099', 'K-1']
  });
});

app.listen(PORT, () => {
  console.log(`Tax Engine running on port ${PORT} (Phase 2 - Scaffold Only)`);
});