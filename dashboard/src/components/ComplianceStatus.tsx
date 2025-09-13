'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react'

interface ComplianceCheck {
  id: string
  name: string
  status: 'passed' | 'failed' | 'warning'
  description: string
  lastChecked: string
}

const mockComplianceData = {
  overallStatus: 'passed',
  score: 98,
  checks: [
    {
      id: '1',
      name: 'KYC Verification',
      status: 'passed',
      description: 'All customer identities verified',
      lastChecked: '2024-01-31T10:00:00Z',
    },
    {
      id: '2',
      name: 'AML Screening',
      status: 'passed',
      description: 'No suspicious activities detected',
      lastChecked: '2024-01-31T10:00:00Z',
    },
    {
      id: '3',
      name: 'Transaction Limits',
      status: 'passed',
      description: 'All transactions within regulatory limits',
      lastChecked: '2024-01-31T10:00:00Z',
    },
    {
      id: '4',
      name: 'Tax Reporting',
      status: 'warning',
      description: 'Q4 reports pending submission',
      lastChecked: '2024-01-31T10:00:00Z',
    },
    {
      id: '5',
      name: 'Audit Trail',
      status: 'passed',
      description: 'Complete audit logs maintained',
      lastChecked: '2024-01-31T10:00:00Z',
    },
  ] as ComplianceCheck[],
}

export function ComplianceStatus() {
  const { data: compliance, isLoading } = useQuery({
    queryKey: ['compliance'],
    queryFn: async () => {
      return mockComplianceData
    },
  })

  if (isLoading) {
    return <div className="animate-pulse">Loading compliance status...</div>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-success-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-danger-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-success-50 text-success-700 border-success-200'
      case 'failed':
        return 'bg-danger-50 text-danger-700 border-danger-200'
      case 'warning':
        return 'bg-warning-50 text-warning-700 border-warning-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compliance Overview</h2>
            <p className="text-gray-600 mt-1">Real-time compliance monitoring</p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${compliance?.score && compliance.score >= 90 ? 'text-success-600' : compliance?.score && compliance.score >= 70 ? 'text-warning-600' : 'text-danger-600'}`}>
              {compliance?.score}%
            </div>
            <p className="text-sm text-gray-500">Compliance Score</p>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${getStatusColor(compliance?.overallStatus || 'passed')}`}>
          <div className="flex items-center">
            {getStatusIcon(compliance?.overallStatus || 'passed')}
            <span className="ml-2 font-medium">
              Overall Status: {compliance?.overallStatus?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Compliance Checks</h3>
        </div>
        <div className="divide-y">
          {compliance?.checks.map((check) => (
            <div key={check.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{check.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{check.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Last checked: {new Date(check.lastChecked).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Passed Checks</p>
              <p className="text-2xl font-bold text-success-600">
                {compliance?.checks.filter(c => c.status === 'passed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Warnings</p>
              <p className="text-2xl font-bold text-warning-600">
                {compliance?.checks.filter(c => c.status === 'warning').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-warning-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed Checks</p>
              <p className="text-2xl font-bold text-danger-600">
                {compliance?.checks.filter(c => c.status === 'failed').length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-danger-500" />
          </div>
        </div>
      </div>
    </div>
  )
}