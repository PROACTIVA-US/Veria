import { Router, Request, Response } from 'express';
import { PortfolioDTO, KycDTO, StatementDTO, TransferResponseDTO } from '@veria/types-investor';
import { authenticateToken, requireScope, auditLog } from '../middleware/auth';

const router = Router();

// Feature flag check middleware
const checkFeatureFlag = (req: Request, res: Response, next: Function) => {
  if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
    return res.status(404).json({ error: 'Feature not available' });
  }
  next();
};

// Apply feature flag check to all investor routes
router.use(checkFeatureFlag);

// Apply authentication to all investor routes
router.use(authenticateToken);

// GET /api/investor/portfolio
router.get('/portfolio',
  requireScope('portfolio:read'),
  auditLog('VIEW_PORTFOLIO'),
  async (req: Request, res: Response) => {
  try {
    // Mock portfolio data
    const portfolio: PortfolioDTO = {
      positions: [
        { symbol: 'AAPL', quantity: 100, price: 175.50, value: 17550 },
        { symbol: 'GOOGL', quantity: 50, price: 140.25, value: 7012.50 },
        { symbol: 'MSFT', quantity: 75, price: 380.00, value: 28500 },
        { symbol: 'AMZN', quantity: 25, price: 145.75, value: 3643.75 },
      ],
      cash: { currency: 'USD', amount: 25000 },
      nav: 81706.25,
      asOf: new Date().toISOString(),
    };

    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// GET /api/investor/kyc
router.get('/kyc',
  requireScope('kyc:read'),
  auditLog('VIEW_KYC_STATUS'),
  async (req: Request, res: Response) => {
  try {
    // Mock KYC status
    const kyc: KycDTO = {
      status: 'pending',
      provider: 'mock',
      updatedAt: new Date().toISOString(),
    };

    res.json(kyc);
  } catch (error) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// GET /api/investor/statements
router.get('/statements',
  requireScope('statements:read'),
  auditLog('VIEW_STATEMENTS'),
  async (req: Request, res: Response) => {
  try {
    // Mock statements
    const statements: StatementDTO[] = [
      { id: '1', period: '2024 Q4', url: null },
      { id: '2', period: '2024 Q3', url: '/statements/2024-q3.pdf' },
      { id: '3', period: '2024 Q2', url: '/statements/2024-q2.pdf' },
      { id: '4', period: '2024 Q1', url: '/statements/2024-q1.pdf' },
    ];

    res.json(statements);
  } catch (error) {
    console.error('Error fetching statements:', error);
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

// POST /api/investor/transfers/request (flag-gated)
router.post('/transfers/request',
  requireScope('transfers:write'),
  auditLog('REQUEST_TRANSFER'),
  async (req: Request, res: Response) => {
  try {
    // Double-check feature flag for sensitive operations
    if (process.env.FEATURE_INVESTOR_PORTAL !== 'true') {
      return res.status(403).json({ error: 'Transfer requests are disabled' });
    }

    // Mock response - no actual processing
    const response: TransferResponseDTO = {
      requestId: `req_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Return 202 Accepted for async processing
    res.status(202).json(response);
  } catch (error) {
    console.error('Error processing transfer request:', error);
    res.status(500).json({ error: 'Failed to process transfer request' });
  }
});

export default router;