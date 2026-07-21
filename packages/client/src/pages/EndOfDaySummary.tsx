import { useEffect, useState } from 'react'
import axios from 'axios'
import CountryFilter from '../components/CountryFilter'

interface OverdueBag {
  barcode: string
  pickupTime: string
  elapsedHours: number
  orderReference: string | null
}

interface DriverSummaryRow {
  driverName: string
  driverId: string
  overdueBags: OverdueBag[]
}

export default function EndOfDaySummary() {
  const [country, setCountry] = useState<string | undefined>()
  const [rows, setRows] = useState<DriverSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = country ? { country } : {}
    axios
      .get<DriverSummaryRow[]>('/api/dashboard/end-of-day', { params })
      .then((r) => setRows(r.data))
      .catch((err) => setError(err?.response?.data?.error ?? 'Failed to load end-of-day data'))
      .finally(() => setLoading(false))
  }, [country])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">End of Day Summary</h1>
        <CountryFilter value={country} onChange={setCountry} />
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-gray-500">No overdue bags. All clear!</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-6">
          {rows.map((driver) => (
            <div key={driver.driverId} className="rounded-xl bg-white shadow overflow-hidden">
              <div className="border-b bg-gray-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  {driver.driverName}
                  <span className="ml-2 text-xs font-normal text-red-600">
                    ({driver.overdueBags.length} overdue)
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Barcode</th>
                      <th className="px-4 py-2">Pickup Time</th>
                      <th className="px-4 py-2">Elapsed (hrs)</th>
                      <th className="px-4 py-2">Order Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {driver.overdueBags.map((bag) => (
                      <tr key={bag.barcode}>
                        <td className="px-4 py-2 font-mono">{bag.barcode}</td>
                        <td className="px-4 py-2">{new Date(bag.pickupTime).toLocaleString()}</td>
                        <td className="px-4 py-2 text-red-600 font-medium">{bag.elapsedHours.toFixed(1)}</td>
                        <td className="px-4 py-2">{bag.orderReference ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
