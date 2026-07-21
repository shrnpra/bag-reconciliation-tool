import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import CountryFilter from '../components/CountryFilter'

interface AccountabilityRow {
  driverId: string
  driverName: string
  totalBagsOut: number
  overdueBags: number
}

export default function AccountabilityDashboard() {
  const [country, setCountry] = useState<string | undefined>()
  const [rows, setRows] = useState<AccountabilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = country ? { country } : {}
    axios
      .get<AccountabilityRow[]>('/api/dashboard/accountability', { params })
      .then((r) => setRows(r.data))
      .catch((err) => setError(err?.response?.data?.error ?? 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [country])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Driver Accountability</h1>
        <CountryFilter value={country} onChange={setCountry} />
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="rounded-xl bg-white shadow overflow-hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No drivers with active bags.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Driver</th>
                    <th className="px-4 py-2">Bags Out</th>
                    <th className="px-4 py-2">Overdue</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.driverId}>
                      <td className="px-4 py-2 font-medium">{row.driverName}</td>
                      <td className="px-4 py-2">{row.totalBagsOut}</td>
                      <td className="px-4 py-2">
                        <span className={row.overdueBags > 0 ? 'font-semibold text-red-600' : ''}>
                          {row.overdueBags}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          to={`/dashboard/drivers/${row.driverId}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View Details
                        </Link>
                      </td>
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
