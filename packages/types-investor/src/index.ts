export interface Money {
  currency: string;
  amount: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  price: number;
  value: number;
}

export interface PortfolioDTO {
  positions: Position[];
  cash: Money;
  nav: number;
  asOf: string;
}

export type KycStatus = 'pending' | 'approved' | 'failed';

export interface KycDTO {
  status: KycStatus;
  provider: 'mock' | 'sumsub' | 'onfido';
  updatedAt: string;
}

export interface StatementDTO {
  id: string;
  period: string;
  url: string | null;
}

export interface TransferRequestDTO {
  amount: Money;
  direction: 'deposit' | 'withdrawal';
  accountId: string;
  notes?: string;
}

export interface TransferResponseDTO {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'investor' | 'client' | 'admin';
  orgId: string;
  scopes: string[];
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode: number;
}