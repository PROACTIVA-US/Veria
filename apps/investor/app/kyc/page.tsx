'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { KycDTO } from '@veria/types-investor';
import { formatDate } from '@/lib/utils';
// import { fetchWithAuth } from '@/lib/auth';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function KycPage() {
  const [kyc, setKyc] = useState<KycDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKyc() {
      try {
        // Mock data for now
        const mockKyc: KycDTO = {
          status: 'pending',
          provider: 'mock',
          updatedAt: new Date().toISOString(),
        };
        setKyc(mockKyc);

        // Uncomment when API is ready
        // const response = await fetchWithAuth('/api/investor/kyc');
        // if (!response.ok) throw new Error('Failed to fetch KYC status');
        // const data = await response.json();
        // setKyc(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load KYC status');
      } finally {
        setLoading(false);
      }
    }

    fetchKyc();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary rounded w-1/4 mb-8"></div>
          <div className="h-64 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading KYC Status</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!kyc) return null;

  const getStatusIcon = () => {
    switch (kyc.status) {
      case 'approved':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'failed':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-12 w-12 text-yellow-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (kyc.status) {
      case 'approved':
        return 'Your KYC verification has been approved. You have full access to all platform features.';
      case 'failed':
        return 'Your KYC verification was unsuccessful. Please contact support for assistance.';
      case 'pending':
      default:
        return 'Your KYC verification is currently being processed. This typically takes 1-2 business days.';
    }
  };

  const getStatusColor = () => {
    switch (kyc.status) {
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">KYC Verification Status</h1>
        <p className="text-muted-foreground">
          Know Your Customer (KYC) verification is required for regulatory compliance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>Last updated: {formatDate(kyc.updatedAt)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center space-y-4 py-8">
            {getStatusIcon()}
            <div className={`px-4 py-2 rounded-full font-medium ${getStatusColor()}`}>
              {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
            </div>
            <p className="text-muted-foreground max-w-md">{getStatusMessage()}</p>
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold mb-4">Verification Details</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Provider:</dt>
                <dd className="font-medium capitalize">{kyc.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status:</dt>
                <dd className="font-medium capitalize">{kyc.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Updated:</dt>
                <dd className="font-medium">{formatDate(kyc.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {kyc.status === 'pending' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">What happens next?</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Our team is reviewing your submitted documents</li>
                    <li>You will receive an email once verification is complete</li>
                    <li>No action is required from you at this time</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {kyc.status === 'failed' && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">Next Steps</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Review the email sent to your registered address</li>
                    <li>Ensure all documents are clear and valid</li>
                    <li>Contact support at support@veria.app for assistance</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}