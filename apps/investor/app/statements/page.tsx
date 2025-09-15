'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { StatementDTO } from '@veria/types-investor';
import { fetchWithAuth } from '@/lib/auth';
import { FileText, Download, Calendar } from 'lucide-react';

export default function StatementsPage() {
  const [statements, setStatements] = useState<StatementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatements() {
      try {
        // Mock data for now
        const mockStatements: StatementDTO[] = [
          { id: '1', period: '2024 Q4', url: null },
          { id: '2', period: '2024 Q3', url: '/statements/2024-q3.pdf' },
          { id: '3', period: '2024 Q2', url: '/statements/2024-q2.pdf' },
          { id: '4', period: '2024 Q1', url: '/statements/2024-q1.pdf' },
        ];
        setStatements(mockStatements);

        // Uncomment when API is ready
        // const response = await fetchWithAuth('/api/investor/statements');
        // if (!response.ok) throw new Error('Failed to fetch statements');
        // const data = await response.json();
        // setStatements(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statements');
      } finally {
        setLoading(false);
      }
    }

    fetchStatements();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-24 bg-secondary rounded"></div>
            <div className="h-24 bg-secondary rounded"></div>
            <div className="h-24 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Statements</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Account Statements</h1>
        <p className="text-muted-foreground">
          Download your quarterly and annual account statements
        </p>
      </div>

      {statements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No statements available</p>
            <p className="text-sm text-muted-foreground">
              Statements will appear here once they are generated
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {statements.map((statement) => (
            <Card key={statement.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{statement.period} Statement</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Period: {statement.period}</span>
                    </div>
                  </div>
                </div>
                <div>
                  {statement.url ? (
                    <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md">
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Statements are typically available within 10 business days after the end of each quarter.
          </p>
          <p className="text-sm text-muted-foreground">
            If you need assistance or have questions about your statements, please contact support at{' '}
            <a href="mailto:support@veria.app" className="text-primary hover:underline">
              support@veria.app
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}