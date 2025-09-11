import { useState } from 'react';
import { Save, Bell, Shield, Database, Users, Globe } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    notifications: {
      highRiskAlerts: true,
      complianceFailures: true,
      newVerifications: false,
      reportGenerated: true,
    },
    thresholds: {
      riskScore: 70,
      amlScore: 60,
      transactionLimit: 10000,
    },
    providers: {
      kyc: 'chainalysis',
      aml: 'trm',
    },
  });

  const handleSave = () => {
    // Save settings
    console.log('Saving settings:', settings);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Configure compliance and monitoring preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Notifications</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-gray-700">High Risk Alerts</span>
                <input
                  type="checkbox"
                  checked={settings.notifications.highRiskAlerts}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, highRiskAlerts: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Compliance Failures</span>
                <input
                  type="checkbox"
                  checked={settings.notifications.complianceFailures}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, complianceFailures: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-700">New Verifications</span>
                <input
                  type="checkbox"
                  checked={settings.notifications.newVerifications}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, newVerifications: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Report Generated</span>
                <input
                  type="checkbox"
                  checked={settings.notifications.reportGenerated}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, reportGenerated: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 rounded"
                />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Risk Thresholds</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Score Threshold
                </label>
                <input
                  type="number"
                  value={settings.thresholds.riskScore}
                  onChange={(e) => setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, riskScore: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AML Score Threshold
                </label>
                <input
                  type="number"
                  value={settings.thresholds.amlScore}
                  onChange={(e) => setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, amlScore: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Limit (USD)
                </label>
                <input
                  type="number"
                  value={settings.thresholds.transactionLimit}
                  onChange={(e) => setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, transactionLimit: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Provider Configuration</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KYC Provider
                </label>
                <select
                  value={settings.providers.kyc}
                  onChange={(e) => setSettings({
                    ...settings,
                    providers: { ...settings.providers, kyc: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="chainalysis">Chainalysis</option>
                  <option value="trm">TRM Labs</option>
                  <option value="elliptic">Elliptic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AML Provider
                </label>
                <select
                  value={settings.providers.aml}
                  onChange={(e) => setSettings({
                    ...settings,
                    providers: { ...settings.providers, aml: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="trm">TRM Labs</option>
                  <option value="chainalysis">Chainalysis</option>
                  <option value="coinfirm">Coinfirm</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Team</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Admin Users</p>
                  <p className="text-sm text-gray-500">Full access</p>
                </div>
                <span className="text-2xl font-bold">3</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compliance Officers</p>
                  <p className="text-sm text-gray-500">Review access</p>
                </div>
                <span className="text-2xl font-bold">8</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Viewers</p>
                  <p className="text-sm text-gray-500">Read only</p>
                </div>
                <span className="text-2xl font-bold">15</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold">API Status</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Gateway</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Identity Service</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Policy Engine</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Compliance</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Audit Logger</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}