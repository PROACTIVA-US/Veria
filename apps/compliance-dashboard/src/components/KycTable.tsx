import { format } from 'date-fns';
import { Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface KycVerification {
  id: string;
  userId: string;
  userName: string;
  status: 'verified' | 'pending' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  provider: string;
  verifiedAt: string;
  score: number;
}

interface KycTableProps {
  data: KycVerification[];
  isLoading: boolean;
}

const statusIcons = {
  verified: CheckCircle,
  rejected: XCircle,
  pending: Clock,
};

const statusColors = {
  verified: 'text-green-600 bg-green-50',
  rejected: 'text-red-600 bg-red-50',
  pending: 'text-yellow-600 bg-yellow-50',
};

const riskColors = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

export default function KycTable({ data, isLoading }: KycTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No verifications found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-4 font-medium text-gray-700">User</th>
            <th className="text-left p-4 font-medium text-gray-700">Status</th>
            <th className="text-left p-4 font-medium text-gray-700">Risk Level</th>
            <th className="text-left p-4 font-medium text-gray-700">Score</th>
            <th className="text-left p-4 font-medium text-gray-700">Provider</th>
            <th className="text-left p-4 font-medium text-gray-700">Verified At</th>
            <th className="text-left p-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((verification) => {
            const StatusIcon = statusIcons[verification.status];
            return (
              <tr key={verification.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4">
                  <div>
                    <div className="font-medium text-gray-900">{verification.userName}</div>
                    <div className="text-sm text-gray-500">{verification.userId}</div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={clsx(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    statusColors[verification.status]
                  )}>
                    <StatusIcon className="h-3 w-3" />
                    {verification.status}
                  </span>
                </td>
                <td className="p-4">
                  <span className={clsx(
                    'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                    riskColors[verification.riskLevel]
                  )}>
                    {verification.riskLevel}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${verification.score}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{verification.score}%</span>
                  </div>
                </td>
                <td className="p-4 text-gray-600">{verification.provider}</td>
                <td className="p-4 text-gray-600">
                  {format(new Date(verification.verifiedAt), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="p-4">
                  <button className="text-primary-600 hover:text-primary-700">
                    <Eye className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}