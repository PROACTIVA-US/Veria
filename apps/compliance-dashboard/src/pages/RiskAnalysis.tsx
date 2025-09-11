import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, Shield, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchRiskMetrics } from '../services/api';

export default function RiskAnalysis() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['risk-metrics'],
    queryFn: fetchRiskMetrics,
    refetchInterval: 30000,
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Risk Analysis</h2>
        <p className="text-gray-600">Portfolio and transaction risk assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Overall Risk Score</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics?.overallScore || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Updated 5 min ago</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">High Risk Users</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics?.highRiskUsers || 0}</p>
          <p className="text-xs text-red-600 mt-1">+3 from yesterday</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Mitigated Risks</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics?.mitigatedRisks || 0}</p>
          <p className="text-xs text-green-600 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm mb-1">Active Monitors</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics?.activeMonitors || 0}</p>
          <p className="text-xs text-gray-500 mt-1">All systems</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Distribution by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.categoryDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="low" fill="#10b981" stackId="a" />
              <Bar dataKey="medium" fill="#f59e0b" stackId="a" />
              <Bar dataKey="high" fill="#ef4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Indicators</h3>
          <div className="space-y-4">
            {metrics?.indicators?.map((indicator: any, idx: number) => (
              <div key={idx}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{indicator.name}</span>
                  <span className="text-sm text-gray-500">{indicator.value}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      indicator.value > 70 ? 'bg-red-600' :
                      indicator.value > 40 ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}
                    style={{ width: `${indicator.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Risk Events</h3>
        <div className="space-y-4">
          {metrics?.recentEvents?.map((event: any) => (
            <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                event.severity === 'high' ? 'text-red-600' :
                event.severity === 'medium' ? 'text-yellow-600' :
                'text-blue-600'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{event.title}</span>
                  <span className="text-sm text-gray-500">{event.timestamp}</span>
                </div>
                <p className="text-sm text-gray-600">{event.description}</p>
                {event.action && (
                  <button className="mt-2 text-sm text-primary-600 hover:text-primary-700">
                    {event.action}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}