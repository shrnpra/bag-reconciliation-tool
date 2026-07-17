import { FormEvent, useState } from 'react'
import axios from 'axios'

interface ReportResult {
  entityType: string
  entityId: string
  dateRange: { from: string; to: string }
  openingInventory: number
  visits: Array<{ id: string; type: string; bagCount: number; timestamp: string; status: string }>
  closingInventory: number
  discrepancies: Array<{ id: string; expectedCount: number; actualCount: number; difference: number }>
  calculationError: boolean
  expectedClosing?: number
  actualClosing?: number
}

export default function ReportView() {
  const [entityType, setEntityType] = useState<'driver' | 'store'>('driver')
  const [entityId, setEntityId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [report, setReport] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setReport(null)
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (from) params.from = new Date(from).toISOString()
      if (to) params.to = new Date(to).toISOString()
      const endpoint = entityType === 'driver' ? `/api/drivers/${entityId}/report` : `/api/stores/${entityId}/report`
      const { data } = await axios.get<ReportResult>(endpoint, { params })
      setReport(data)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Reconciliation Report</h1>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-3 items-end rounded-lg bg-white p-4 shadow">
        <div>
          <label className="block text-xs text-gray-500">Entity Type</label>
          <select value={entityType} onChange={e => setEntityType(e.target.value as 'driver' | 'store')}
            className="rounded border border-gray-300 px-2 py-1 text-sm">
            <option value="driver">Driver</option>
            <option value="store">Store</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">ID</label>
          <input value={entityId} onChange={e => setEntityId(e.target.value)} required
            className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Entity ID" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <button type="submit" disabled={loading}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {report && (
        <div className="space-y-4">
          {report.calculationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">⚠️ Calculation error detected</p>
              <p>Expected closing: {report.expectedClosing} | Actual stored: {report.actualClosing}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-xs text-gray-500">Opening</p>
              <p className="text-2xl font-bold text-gray-800">{report.openingInventory}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-xs text-gray-500">Movements</p>
              <p className="text-2xl font-bold text-gray-800">{report.visits.length}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-xs text-gray-500">Closing</p>
              <p className="text-2xl font-bold text-gray-800">{report.closingInventory}</p>
            </div>
          </div>
          {report.visits.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-2">Time</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Bags</th><th className="px-4 py-2">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.visits.map(v => (
                    <tr key={v.id}><td className="px-4 py-2">{new Date(v.timestamp).toLocaleString()}</td><td className="px-4 py-2">{v.type}</td><td className="px-4 py-2">{v.bagCount}</td><td className="px-4 py-2">{v.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {report.discrepancies.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-yellow-800">Flagged Discrepancies ({report.discrepancies.length})</h3>
              {report.discrepancies.map(d => (
                <p key={d.id} className="text-sm">Expected: {d.expectedCount} | Actual: {d.actualCount} | Diff: {d.difference}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
