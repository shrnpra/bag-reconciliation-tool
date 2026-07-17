import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

interface Visit {
  id: string
  type: 'CHECK_IN' | 'CHECK_OUT'
  driverId: string
  storeId: string
  bagCount: number
  timestamp: string
  status: string
}

export default function VisitHistory() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const [visits, setVisits] = useState<Visit[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchVisits() {
    if (!type || !id) return
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (from) params.from = new Date(from).toISOString()
      if (to) params.to = new Date(to).toISOString()
      const endpoint = type === 'driver' ? `/api/drivers/${id}/visits` : `/api/stores/${id}/visits`
      const { data } = await axios.get<Visit[]>(endpoint, { params })
      setVisits(data)
    } catch {
      setVisits([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVisits() }, [type, id])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-gray-800">
        Visit History — {type} <span className="text-blue-600">{id}</span>
      </h1>

      {/* Date range filter */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
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
        <button onClick={fetchVisits}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Filter
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && visits.length === 0 && (
        <p className="text-sm text-gray-500">No visits found for this {type}.</p>
      )}

      {!loading && visits.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Bags</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">{type === 'driver' ? 'Store' : 'Driver'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visits.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(v.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${v.type === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {v.type === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-medium">{v.bagCount}</td>
                  <td className="px-4 py-2">{v.status}</td>
                  <td className="px-4 py-2">{type === 'driver' ? v.storeId : v.driverId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
