import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fetchReports, generateReport } from '../services/api';

export default function Reports() {
  const [reportType, setReportType] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['reports', reportType, dateRange],
    queryFn: () => fetchReports({ type: reportType, range: dateRange }),
  });

  const handleGenerateReport = async (type: string) => {
    setIsGenerating(true);
    try {
      await generateReport(type);
      refetch();
    } finally {
      setIsGenerating(false);
    }
  };

  const reportTypes = [
    { id: 'sar', name: 'Suspicious Activity Report', desc: 'Generate SAR for regulatory filing' },
    { id: 'ctr', name: 'Currency Transaction Report', desc: 'CTR for transactions over $10,000' },
    { id: 'compliance', name: 'Compliance Summary', desc: 'Monthly compliance overview' },
    { id: 'risk', name: 'Risk Assessment', desc: 'Portfolio risk analysis report' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Regulatory Reports</h2>
        <p className="text-gray-600">Generate and manage compliance reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Reports</h3>
                <div className="flex gap-2">
                  <select
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="sar">SAR</option>
                    <option value="ctr">CTR</option>
                    <option value="compliance">Compliance</option>
                    <option value="risk">Risk</option>
                  </select>
                  <select
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="quarter">Last Quarter</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : reports?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No reports found for the selected criteria
                </div>
              ) : (
                reports?.map((report: any) => (
                  <div key={report.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900">{report.name}</h4>
                          <p className="text-sm text-gray-600">Type: {report.type}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Generated: {format(new Date(report.createdAt), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <button className="text-primary-600 hover:text-primary-700">
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Generate</h3>
            <div className="space-y-3">
              {reportTypes.map((type) => (
                <div key={type.id} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900">{type.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{type.desc}</p>
                  <button
                    onClick={() => handleGenerateReport(type.id)}
                    disabled={isGenerating}
                    className="mt-2 w-full px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Schedule</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily CTR</span>
                <span className="text-gray-900">02:00 UTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Weekly SAR Review</span>
                <span className="text-gray-900">Monday 09:00 UTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Compliance</span>
                <span className="text-gray-900">1st of month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quarterly Risk</span>
                <span className="text-gray-900">Quarter end</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}