import { useEffect, useState } from 'react'
import axios from 'axios'
import BarcodeInput from '../components/BarcodeInput'

interface Store {
  id: string
  name: string
}

type Mode = 'pickup' | 'return'

export default function BagScanPage() {
  const [mode, setMode] = useState<Mode>('pickup')
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    axios.get<Store[]>('/api/stores').then((r) => setStores(r.data)).catch(() => {})
  }, [])

  async function handleScan(barcode: string) {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'pickup') {
        await axios.post('/api/bags/pickup', { barcode })
        setSuccess(`Bag "${barcode}" picked up successfully.`)
      } else {
        if (!storeId) {
          setError('Please select a return store.')
          setLoading(false)
          return
        }
        await axios.post('/api/bags/return', { barcode, storeId })
        setSuccess(`Bag "${barcode}" returned successfully.`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? `${mode === 'pickup' ? 'Pickup' : 'Return'} failed`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Scan Bags</h1>
      <div className="space-y-4 rounded-xl bg-white p-6 shadow">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('pickup')}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'pickup'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pickup
          </button>
          <button
            type="button"
            onClick={() => setMode('return')}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'return'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Return
          </button>
        </div>

        {/* Return store selector */}
        {mode === 'return' && (
          <div>
            <label htmlFor="returnStore" className="mb-1 block text-sm font-medium text-gray-700">
              Return Store
            </label>
            <select
              id="returnStore"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Barcode scanner input */}
        <BarcodeInput onScan={handleScan} placeholder="Scan barcode and press Enter" />

        {loading && <p className="text-sm text-gray-500">Processing…</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}
      </div>
    </div>
  )
}
