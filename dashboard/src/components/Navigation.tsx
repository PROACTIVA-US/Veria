'use client'

import { User, Settings, LogOut } from 'lucide-react'

export function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">Veria</span>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Dashboard
              </a>
              <a href="#" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Reports
              </a>
              <a href="#" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Integrations
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>CPA User</span>
            </div>
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <Settings className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}