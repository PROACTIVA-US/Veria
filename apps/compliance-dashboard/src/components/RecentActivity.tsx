import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface Activity {
  id: string;
  type: 'kyc_verified' | 'kyc_rejected' | 'compliance_check' | 'risk_alert';
  user: string;
  timestamp: string;
  details: string;
  status: 'success' | 'error' | 'warning' | 'pending';
}

interface RecentActivityProps {
  activities?: Activity[];
}

const statusIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  pending: Clock,
};

const statusColors = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  pending: 'text-gray-500',
};

export default function RecentActivity({ activities = [] }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = statusIcons[activity.status];
        return (
          <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <Icon className={clsx('h-5 w-5 mt-0.5', statusColors[activity.status])} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{activity.user}</span>
                <span className="text-sm text-gray-500">
                  {format(new Date(activity.timestamp), 'MMM d, HH:mm')}
                </span>
              </div>
              <p className="text-sm text-gray-600">{activity.details}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}