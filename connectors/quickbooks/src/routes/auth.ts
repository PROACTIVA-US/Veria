import { Router } from 'express';
import { QuickBooksAuth } from '../services/quickbooksAuth';

const router = Router();
const qbAuth = new QuickBooksAuth();

router.post('/', async (req, res) => {
  try {
    const authUrl = qbAuth.getAuthorizationUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to authUrl for QuickBooks authorization'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL'
    });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, realmId } = req.query;

    if (!code || !realmId) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or realm ID'
      });
    }

    const tokens = await qbAuth.handleCallback(
      code as string,
      realmId as string
    );

    res.json({
      success: true,
      message: 'Successfully connected to QuickBooks',
      companyId: realmId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to complete authorization'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const newTokens = await qbAuth.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      tokens: newTokens
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

export default router;