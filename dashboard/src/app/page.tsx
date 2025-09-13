'use client'

import { useState } from 'react'
import { PortfolioView } from '@/components/PortfolioView'
import { ComplianceStatus } from '@/components/ComplianceStatus'
import { ExportButton } from '@/components/ExportButton'
import { Navigation } from '@/components/Navigation'

export default function Dashboard() {
  const [activeView, setActiveView] = useState<'portfolio' | 'compliance'>('portfolio')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Veria Compliance Dashboard
          </h1>
          <ExportButton />
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveView('portfolio')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'portfolio'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveView('compliance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'compliance'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Compliance
              </button>
            </nav>
          </div>
        </div>

        <div className="grid gap-6">
          {activeView === 'portfolio' ? (
            <PortfolioView />
          ) : (
            <ComplianceStatus />
          )}
        </div>
      </main>
    </div>
  )
}