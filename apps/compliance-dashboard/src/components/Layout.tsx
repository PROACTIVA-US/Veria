import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  Shield, 
  FileText, 
  TrendingUp,
  Settings
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'KYC Verifications', href: '/kyc', icon: UserCheck },
  { name: 'Compliance', href: '/compliance', icon: Shield },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Risk Analysis', href: '/risk', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <nav className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-600">Veria</h1>
          <p className="text-sm text-gray-500">Compliance Dashboard</p>
        </div>
        <ul className="space-y-1 px-3">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}