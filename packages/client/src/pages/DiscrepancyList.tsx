import { useEffect, useState } from 'react'
import axios from 'axios'

interface Discrepancy {
  id: string
  driverId: string
  storeId: string
  expectedCount: number
  actualCount: number
  difference: number
  timestamp: string
  status: string
}

export default function DiscrepancyList() {
  const [items, setItems] = useState<Discrepancy[]>([])
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function fetch() {
    try {
      const { data } = await axios.get<Discrepancy[]>('/api/discrepancies?status=open')
      setItems(data)
    } catch {}
  }

  useEffect(() => { fetch() }, [])

  async function handleResolve(id: string) {
    setError(null)
    if (!note.trim()) { setError('Resolution note is required'); return }
    try {
      await axios.patch(`/api/discrepancies/${id}/resolve`, { resolutionNote: note })
      setResolveId(null)
      setNote('')
      fetch()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to resolve')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Open Discrepancies</h1>
      {items.length === 0 && <p className="text-sm text-gray-500">No open discrepancies.</p>}
      <div className="space-y-3">
        {items.map(d => (
          <div key={d.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">Driver:</span> {d.driverId} | <span className="font-medium">Store:</span> {d.storeId}
              </div>
              <span className="text-xs text-gray-500">{new Date(d.timestamp).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm">Expected: {d.expectedCount} | Actual: {d.actualCount} | Diff: <span className="font-bold text-red-600">+{d.difference}</span></p>
            {resolveId === d.id ? (
              <div className="mt-3 space-y-2">
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note (required)"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm" rows={2} />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => handleResolve(d.id)} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">Resolve</button>
                  <button onClick={() => { setResolveId(null); setNote(''); setError(null) }} className="rounded bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setResolveId(d.id)} className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">Resolve</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
