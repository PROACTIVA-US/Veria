'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { PortfolioDTO } from '@veria/types-investor';
import { formatCurrency, formatDate } from '@/lib/utils';
// import { fetchWithAuth } from '@/lib/auth';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        // Mock data for now since API isn't implemented yet
        const mockPortfolio: PortfolioDTO = {
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
        setPortfolio(mockPortfolio);

        // Uncomment when API is ready
        // const response = await fetchWithAuth('/api/investor/portfolio');
        // if (!response.ok) throw new Error('Failed to fetch portfolio');
        // const data = await response.json();
        // setPortfolio(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-secondary rounded"></div>
            <div className="h-32 bg-secondary rounded"></div>
            <div className="h-32 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Portfolio</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const totalPositionsValue = portfolio.positions.reduce((sum, p) => sum + p.value, 0);
  const changePercent = 2.5; // Mock change percentage

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Portfolio Overview</h1>
        <p className="text-muted-foreground">
          Last updated: {formatDate(portfolio.asOf)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolio.nav)}</div>
            <p className="text-xs text-muted-foreground">Net Asset Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPositionsValue)}</div>
            <p className="text-xs text-muted-foreground">
              {portfolio.positions.length} holdings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash</CardTitle>
            {changePercent > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolio.cash.amount, portfolio.cash.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>Your current investment positions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Symbol</th>
                  <th className="text-right py-2">Quantity</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Value</th>
                  <th className="text-right py-2">% of Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((position) => (
                  <tr key={position.symbol} className="border-b">
                    <td className="py-3 font-medium">{position.symbol}</td>
                    <td className="text-right py-3">{position.quantity}</td>
                    <td className="text-right py-3">
                      {formatCurrency(position.price)}
                    </td>
                    <td className="text-right py-3">
                      {formatCurrency(position.value)}
                    </td>
                    <td className="text-right py-3">
                      {((position.value / portfolio.nav) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-3">Cash</td>
                  <td className="text-right py-3">-</td>
                  <td className="text-right py-3">-</td>
                  <td className="text-right py-3">
                    {formatCurrency(portfolio.cash.amount)}
                  </td>
                  <td className="text-right py-3">
                    {((portfolio.cash.amount / portfolio.nav) * 100).toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}