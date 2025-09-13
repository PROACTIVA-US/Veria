import { Router } from 'express';
import { QuickBooksSync } from '../services/quickbooksSync';
import { TransactionMapper } from '../services/transactionMapper';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const sync = new QuickBooksSync(companyId as string);
    const chartOfAccounts = await sync.syncChartOfAccounts();

    const mockTransactions = TransactionMapper.generateMockTransactions();
    const mappedTransactions = await sync.mapTransactionsToAccounts(
      mockTransactions,
      chartOfAccounts
    );

    res.json({
      success: true,
      data: {
        accountsSynced: chartOfAccounts.length,
        transactionsSynced: mappedTransactions.length,
        accounts: chartOfAccounts,
        transactions: mappedTransactions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to sync data from QuickBooks'
    });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const { companyId, transactions } = req.body;

    if (!companyId || !transactions) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and transactions are required'
      });
    }

    const sync = new QuickBooksSync(companyId);
    const journalEntries = await sync.createJournalEntries(transactions);

    res.json({
      success: true,
      data: {
        entriesCreated: journalEntries.length,
        entries: journalEntries
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create journal entries'
    });
  }
});

export default router;