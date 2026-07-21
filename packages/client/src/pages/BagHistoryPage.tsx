import { useState } from 'react'
import axios from 'axios'
import BarcodeInput from '../components/BarcodeInput'

interface HistoryEntry {
  id: string
  pickupTime: string
  returnTime: string | null
  orderReference: string | null
  driver: { id: string; name: string }
}

export default function BagHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedBarcode, setSearchedBarcode] = useState('')

  async function handleSearch(barcode: string) {
    setError(null)
    setHistory([])
    setSearchedBarcode(barcode)
    setLoading(true)

    try {
      const { data } = await axios.get<HistoryEntry[]>(`/api/bags/${encodeURIComponent(barcode)}/history`)
      setHistory(data)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to fetch bag history')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Bag History</h1>

      <div className="mb-6">
        <BarcodeInput onScan={handleSearch} placeholder="Enter barcode and press Enter" />
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {searchedBarcode && !loading && !error && (
        <div className="rounded-xl bg-white shadow overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">
              History for: <span className="font-mono">{searchedBarcode}</span>
            </h2>
          </div>
          {history.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No assignments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Driver</th>
                    <th className="px-4 py-2">Pickup</th>
                    <th className="px-4 py-2">Return</th>
                    <th className="px-4 py-2">Order Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-2">{h.driver.name}</td>
                      <td className="px-4 py-2">{new Date(h.pickupTime).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        {h.returnTime ? new Date(h.returnTime).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2">{h.orderReference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
