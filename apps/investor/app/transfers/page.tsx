'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { isInvestorPortalEnabled } from '@/lib/features';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ArrowUpRight, ArrowDownRight, Lock } from 'lucide-react';

export default function TransfersPage() {
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'deposit' | 'withdrawal'>('deposit');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isInvestorPortalEnabled()) {
      alert('Transfer requests are currently disabled');
      return;
    }

    // This would normally make an API call
    alert('Transfer request feature is not yet implemented');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transfer Funds</h1>
        <p className="text-muted-foreground">
          Request deposits or withdrawals from your investment account
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>New Transfer Request</CardTitle>
            <CardDescription>
              Submit a request to transfer funds to or from your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Feature Disabled</p>
                  <p>Transfer requests are currently disabled in preview mode.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 opacity-50 pointer-events-none">
              <div>
                <label className="block text-sm font-medium mb-2">Transfer Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDirection('deposit')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      direction === 'deposit'
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <ArrowDownRight className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="font-medium">Deposit</p>
                    <p className="text-xs text-muted-foreground">Add funds</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('withdrawal')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      direction === 'withdrawal'
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <ArrowUpRight className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <p className="font-medium">Withdrawal</p>
                    <p className="text-xs text-muted-foreground">Remove funds</p>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Add any special instructions..."
                  disabled
                />
              </div>

              <button
                type="submit"
                disabled
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Transfer Request
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Minimum Deposit:</dt>
                  <dd className="font-medium">{formatCurrency(1000)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Maximum Deposit:</dt>
                  <dd className="font-medium">{formatCurrency(1000000)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Minimum Withdrawal:</dt>
                  <dd className="font-medium">{formatCurrency(500)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Processing Time:</dt>
                  <dd className="font-medium">2-3 business days</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  All transfer requests are subject to review and approval
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Withdrawals may be subject to early redemption fees
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Bank wire transfers are processed on business days only
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}