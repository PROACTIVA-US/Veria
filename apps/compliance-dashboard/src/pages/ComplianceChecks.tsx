import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { fetchComplianceChecks } from '../services/api';

export default function ComplianceChecks() {
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);
  
  const { data: checks, isLoading } = useQuery({
    queryKey: ['compliance-checks'],
    queryFn: fetchComplianceChecks,
    refetchInterval: 10000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Compliance Checks</h2>
        <p className="text-gray-600">Monitor real-time compliance verification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Recent Checks</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : (
                checks?.map((check: any) => (
                  <div
                    key={check.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedCheck(check.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(check.status)}
                        <div>
                          <h4 className="font-medium text-gray-900">{check.type}</h4>
                          <p className="text-sm text-gray-600">{check.userId}</p>
                          <p className="text-xs text-gray-500 mt-1">{check.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${
                          check.score >= 80 ? 'text-green-600' :
                          check.score >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          Score: {check.score}
                        </span>
                      </div>
                    </div>
                    {check.flags && check.flags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {check.flags.map((flag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Check Statistics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Pass Rate</span>
                  <span className="font-medium">87%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '87%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Avg Response Time</span>
                  <span className="font-medium">245ms</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '24%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Active Rules</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">KYC Verification</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AML Screening</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sanctions Check</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accreditation</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Jurisdiction</span>
                <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full">Limited</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}