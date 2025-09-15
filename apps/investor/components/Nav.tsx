'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, FileText, CreditCard, LogOut, User, AlertCircle } from 'lucide-react';
import { isInvestorPortalEnabled } from '@/lib/features';

const navigation = [
  { name: 'Portfolio', href: '/', icon: Home },
  { name: 'KYC Status', href: '/kyc', icon: User },
  { name: 'Statements', href: '/statements', icon: FileText },
  { name: 'Transfers', href: '/transfers', icon: CreditCard },
];

export function Nav() {
  const pathname = usePathname();

  if (!isInvestorPortalEnabled()) {
    return null;
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-semibold">
              Veria Investor Portal
            </Link>
            <div className="flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span>Preview — Not for production fund flows</span>
          </div>
        </div>
      </div>
    </nav>
  );
}