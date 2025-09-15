import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { isInvestorPortalEnabled } from '@/lib/features';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Veria Investor Portal',
  description: 'Manage your investments and portfolio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isInvestorPortalEnabled()) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Feature Not Available</h1>
              <p className="text-muted-foreground">
                The Investor Portal is currently not available.
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  );
}