'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface Asset {
  id: string
  name: string
  type: string
  balance: number
  yield: number
  change24h: number
}

const mockPortfolioData = {
  totalValue: 157500,
  totalYield: 1650,
  change24h: 2.1,
  assets: [
    { id: '1', name: 'T-Bills', type: 'Treasury', balance: 50150, yield: 4.5, change24h: 0.3 },
    { id: '2', name: 'MMF', type: 'Money Market', balance: 25000, yield: 3.8, change24h: 0.0 },
    { id: '3', name: 'Cash', type: 'Cash', balance: 82350, yield: 0, change24h: -2.5 },
  ],
}

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444']

export function PortfolioView() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      return mockPortfolioData
    },
  })

  if (isLoading) {
    return <div className="animate-pulse">Loading portfolio...</div>
  }

  const chartData = portfolio?.assets.map(asset => ({
    name: asset.name,
    value: asset.balance,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${portfolio?.totalValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary-500" />
          </div>
          <div className="mt-4 flex items-center">
            {portfolio?.change24h && portfolio.change24h > 0 ? (
              <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-danger-500 mr-1" />
            )}
            <span className={`text-sm ${portfolio?.change24h && portfolio.change24h > 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {Math.abs(portfolio?.change24h || 0)}% (24h)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Yield</p>
              <p className="text-2xl font-bold text-gray-900">
                ${portfolio?.totalYield.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-success-500" />
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">This month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tokenized Assets</p>
              <p className="text-2xl font-bold text-gray-900">
                ${((portfolio?.assets.filter(a => a.type !== 'Cash').reduce((sum, a) => sum + a.balance, 0) || 0)).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              {portfolio?.assets.filter(a => a.type !== 'Cash').length} assets
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Holdings</h3>
          <div className="space-y-3">
            {portfolio?.assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{asset.name}</p>
                  <p className="text-sm text-gray-500">{asset.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${asset.balance.toLocaleString()}</p>
                  {asset.yield > 0 && (
                    <p className="text-sm text-success-600">{asset.yield}% APY</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}