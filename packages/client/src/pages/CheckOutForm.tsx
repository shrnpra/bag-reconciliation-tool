import { FormEvent, useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

interface Store { id: string; name: string }

export default function CheckOutForm() {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState('')
  const [bagCount, setBagCount] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ driverInventory: number; storeInventory: number } | null>(null)

  useEffect(() => {
    axios.get<Store[]>('/api/stores').then(r => setStores(r.data)).catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const { data } = await axios.post('/api/visits/checkout', {
        driverId: user!.id,
        storeId,
        bagCount,
      })
      setSuccess({ driverInventory: data.driverInventory, storeInventory: data.storeInventory })
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Check-out failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Bag Check-Out</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow">
        <div>
          <label htmlFor="store" className="mb-1 block text-sm font-medium text-gray-700">Store</label>
          <select id="store" value={storeId} onChange={e => setStoreId(e.target.value)} required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
            <option value="">Select a store</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bagCount" className="mb-1 block text-sm font-medium text-gray-700">Bag Count</label>
          <input id="bagCount" type="number" min={1} value={bagCount} onChange={e => setBagCount(Number(e.target.value))} required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <p className="font-medium">Check-out successful!</p>
            <p>Your bags: {success.driverInventory} | Store bags: {success.storeInventory}</p>
          </div>
        )}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'Processing…' : 'Record Check-Out'}
        </button>
      </form>
    </div>
  )
}
