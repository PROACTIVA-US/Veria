import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import ComplianceChart from '../components/ComplianceChart';
import RecentActivity from '../components/RecentActivity';
import RiskHeatmap from '../components/RiskHeatmap';
import { fetchDashboardStats } from '../services/api';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Compliance Overview</h2>
        <p className="text-gray-600">Real-time monitoring and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          change={stats?.userChange || 0}
          icon={Users}
          trend={stats?.userChange > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="KYC Verified"
          value={stats?.kycVerified || 0}
          change={stats?.kycChange || 0}
          icon={CheckCircle}
          trend="up"
          color="green"
        />
        <StatsCard
          title="Pending Reviews"
          value={stats?.pendingReviews || 0}
          change={stats?.pendingChange || 0}
          icon={Clock}
          trend="neutral"
          color="yellow"
        />
        <StatsCard
          title="Risk Alerts"
          value={stats?.riskAlerts || 0}
          change={stats?.alertChange || 0}
          icon={AlertCircle}
          trend={stats?.alertChange > 0 ? 'up' : 'down'}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
          <ComplianceChart data={stats?.complianceTrends} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
          <RiskHeatmap data={stats?.riskDistribution} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <RecentActivity activities={stats?.recentActivities} />
      </div>
    </div>
  );
}