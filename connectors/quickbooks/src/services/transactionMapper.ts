import { v4 as uuidv4 } from 'uuid';

interface TokenizedTransaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  tokenizedAssetId: string;
  blockchainTxHash?: string;
  custodian?: string;
}

export class TransactionMapper {
  static generateMockTransactions(): TokenizedTransaction[] {
    const transactions: TokenizedTransaction[] = [
      {
        id: `tx_${uuidv4()}`,
        date: '2024-01-15',
        amount: 10000,
        type: 'T-Bills',
        description: 'Purchase of tokenized T-Bills',
        tokenizedAssetId: 'token_tbill_001',
        blockchainTxHash: '0x' + crypto.randomBytes(32).toString('hex'),
        custodian: 'Mock Custodian'
      },
      {
        id: `tx_${uuidv4()}`,
        date: '2024-01-20',
        amount: 5000,
        type: 'MMF',
        description: 'Investment in tokenized Money Market Fund',
        tokenizedAssetId: 'token_mmf_001',
        blockchainTxHash: '0x' + crypto.randomBytes(32).toString('hex'),
        custodian: 'Mock Custodian'
      },
      {
        id: `tx_${uuidv4()}`,
        date: '2024-01-25',
        amount: 150,
        type: 'Interest',
        description: 'Interest income from T-Bills',
        tokenizedAssetId: 'token_tbill_001',
        blockchainTxHash: '0x' + crypto.randomBytes(32).toString('hex'),
        custodian: 'Mock Custodian'
      },
      {
        id: `tx_${uuidv4()}`,
        date: '2024-01-30',
        amount: 2500,
        type: 'Redemption',
        description: 'Partial redemption of MMF tokens',
        tokenizedAssetId: 'token_mmf_001',
        blockchainTxHash: '0x' + crypto.randomBytes(32).toString('hex'),
        custodian: 'Mock Custodian'
      }
    ];

    return transactions;
  }

  static mapToQuickBooksFormat(transactions: TokenizedTransaction[]): any[] {
    return transactions.map(tx => ({
      Line: [
        {
          Amount: tx.amount,
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: {
            PostingType: tx.type === 'Redemption' ? 'Credit' : 'Debit',
            AccountRef: {
              value: tx.type.includes('Interest') ? 'acc_004' : 'acc_002'
            }
          },
          Description: tx.description
        },
        {
          Amount: tx.amount,
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: {
            PostingType: tx.type === 'Redemption' ? 'Debit' : 'Credit',
            AccountRef: {
              value: 'acc_001'
            }
          },
          Description: tx.description
        }
      ],
      DocNumber: tx.id,
      TxnDate: tx.date,
      PrivateNote: `Blockchain TX: ${tx.blockchainTxHash}`
    }));
  }

  static classifyTransaction(transaction: TokenizedTransaction): string {
    if (transaction.type.includes('Interest')) {
      return 'income';
    } else if (transaction.type === 'Redemption') {
      return 'redemption';
    } else if (transaction.type === 'T-Bills' || transaction.type === 'MMF') {
      return 'purchase';
    }
    return 'other';
  }
}

const crypto = { randomBytes: (n: number) => ({ toString: (format: string) => 'mock_hash_' + Math.random().toString(36).substring(7) }) };