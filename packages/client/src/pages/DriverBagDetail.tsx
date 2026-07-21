import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import OverdueIndicator from '../components/OverdueIndicator'

interface BagEntry {
  barcode: string
  pickupTime: string
  isOverdue: boolean
  elapsedHours: number
}

interface DriverDetail {
  driverId: string
  driverName: string
  bags: BagEntry[]
}

export default function DriverBagDetail() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<DriverDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    axios
      .get<DriverDetail>(`/api/dashboard/accountability/${id}`)
      .then((r) => setDetail(r.data))
      .catch((err) => setError(err?.response?.data?.error ?? 'Failed to load driver details'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/dashboard/accountability" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Accountability
      </Link>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {detail && (
        <>
          <h1 className="mb-6 text-xl font-bold text-gray-800">{detail.driverName} — Active Bags</h1>

          <div className="rounded-xl bg-white shadow overflow-hidden">
            {detail.bags.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">No active bags.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Barcode</th>
                      <th className="px-4 py-2">Pickup Time</th>
                      <th className="px-4 py-2">Elapsed (hrs)</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.bags.map((bag) => (
                      <tr key={bag.barcode}>
                        <td className="px-4 py-2 font-mono">{bag.barcode}</td>
                        <td className="px-4 py-2">{new Date(bag.pickupTime).toLocaleString()}</td>
                        <td className="px-4 py-2">{bag.elapsedHours.toFixed(1)}</td>
                        <td className="px-4 py-2">
                          <OverdueIndicator isOverdue={bag.isOverdue} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
