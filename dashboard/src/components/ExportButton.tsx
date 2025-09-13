'use client'

import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react'

export function ExportButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    setIsExporting(true)

    try {
      const mockData = {
        timestamp: new Date().toISOString(),
        format,
        portfolio: {
          totalValue: 157500,
          assets: [
            { name: 'T-Bills', value: 50150 },
            { name: 'MMF', value: 25000 },
            { name: 'Cash', value: 82350 },
          ],
        },
        compliance: {
          score: 98,
          status: 'passed',
        },
      }

      const blob = new Blob([JSON.stringify(mockData, null, 2)], {
        type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/pdf',
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `veria-report-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <Download className="h-4 w-4 mr-2" />
        Export Report
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
          <div className="py-1">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as PDF
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </button>
          </div>
        </div>
      )}
    </div>
  )
}