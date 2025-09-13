import { v4 as uuidv4 } from 'uuid';

interface Account {
  id: string;
  name: string;
  type: string;
  subType?: string;
  balance: number;
  isTokenizedAsset?: boolean;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  accountId?: string;
  tokenizedAssetId?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  description: string;
  transactionId: string;
}

export class QuickBooksSync {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  async syncChartOfAccounts(): Promise<Account[]> {
    const mockAccounts: Account[] = [
      {
        id: 'acc_001',
        name: 'Cash and Cash Equivalents',
        type: 'Asset',
        subType: 'Current',
        balance: 100000
      },
      {
        id: 'acc_002',
        name: 'Tokenized Assets - T-Bills',
        type: 'Asset',
        subType: 'Current',
        balance: 50000,
        isTokenizedAsset: true
      },
      {
        id: 'acc_003',
        name: 'Tokenized Assets - MMF',
        type: 'Asset',
        subType: 'Current',
        balance: 25000,
        isTokenizedAsset: true
      },
      {
        id: 'acc_004',
        name: 'Interest Income - Tokenized',
        type: 'Revenue',
        balance: 1500,
        isTokenizedAsset: true
      },
      {
        id: 'acc_005',
        name: 'Unrealized Gains - Tokenized',
        type: 'Revenue',
        balance: 500,
        isTokenizedAsset: true
      }
    ];

    return mockAccounts;
  }

  async mapTransactionsToAccounts(
    transactions: Transaction[],
    accounts: Account[]
  ): Promise<Transaction[]> {
    const tokenizedAccounts = accounts.filter(acc => acc.isTokenizedAsset);

    return transactions.map(tx => {
      if (tx.tokenizedAssetId) {
        const matchingAccount = tokenizedAccounts.find(
          acc => acc.name.includes(tx.type)
        );
        if (matchingAccount) {
          tx.accountId = matchingAccount.id;
        }
      }
      return tx;
    });
  }

  async createJournalEntries(transactions: Transaction[]): Promise<JournalEntry[]> {
    return transactions.map(tx => ({
      id: `je_${uuidv4()}`,
      date: tx.date,
      debitAccount: tx.type === 'buy' ? 'acc_002' : 'acc_001',
      creditAccount: tx.type === 'buy' ? 'acc_001' : 'acc_002',
      amount: tx.amount,
      description: tx.description,
      transactionId: tx.id
    }));
  }

  async reconcileAccounts(startDate: string, endDate: string): Promise<any> {
    return {
      reconciliationId: `rec_${uuidv4()}`,
      companyId: this.companyId,
      startDate,
      endDate,
      accountsReconciled: 3,
      discrepancies: [],
      status: 'completed',
      timestamp: new Date().toISOString()
    };
  }
}