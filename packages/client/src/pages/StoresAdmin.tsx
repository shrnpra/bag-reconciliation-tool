import { FormEvent, useEffect, useState } from 'react'
import axios from 'axios'

interface Store { id: string; name: string; address: string; status: string; bagInventory: number }

export default function StoresAdmin() {
  const [stores, setStores] = useState<Store[]>([])
  const [form, setForm] = useState({ id: '', name: '', address: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function fetchStores() {
    try { const { data } = await axios.get<Store[]>('/api/stores'); setStores(data) } catch {}
  }
  useEffect(() => { fetchStores() }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null)
    try {
      await axios.post('/api/stores', { id: form.id, name: form.name, address: form.address })
      setSuccess(`Store "${form.id}" created in DRAFT`)
      setForm({ id: '', name: '', address: '' })
      fetchStores()
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Failed') }
  }

  async function handleActivate(id: string) {
    setError(null); setSuccess(null)
    try { await axios.patch(`/api/stores/${id}`); setSuccess(`Store "${id}" activated`); fetchStores() }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Failed to activate') }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Manage Stores</h1>
      <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-3 gap-3">
          <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="ID (1-50)" required className="rounded border px-2 py-1 text-sm" />
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (1-100)" required className="rounded border px-2 py-1 text-sm" />
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address (1-200)" required className="rounded border px-2 py-1 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Create Store</button>
      </form>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Address</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Bags</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody className="divide-y">
            {stores.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{s.id}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.address}</td>
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span></td>
                <td className="px-3 py-2">{s.bagInventory}</td>
                <td className="px-3 py-2">{s.status === 'DRAFT' && <button onClick={() => handleActivate(s.id)} className="text-xs text-blue-600 hover:underline">Activate</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
