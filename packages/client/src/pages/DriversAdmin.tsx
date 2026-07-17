import { FormEvent, useEffect, useState } from 'react'
import axios from 'axios'

interface Driver { id: string; name: string; email?: string; phone?: string; status: string; bagInventory: number }

export default function DriversAdmin() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [form, setForm] = useState({ id: '', name: '', email: '', phone: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function fetchDrivers() {
    try { const { data } = await axios.get<Driver[]>('/api/drivers'); setDrivers(data) } catch {}
  }
  useEffect(() => { fetchDrivers() }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null)
    try {
      await axios.post('/api/drivers', { id: form.id, name: form.name, email: form.email || undefined, phone: form.phone || undefined })
      setSuccess(`Driver "${form.id}" created in DRAFT`)
      setForm({ id: '', name: '', email: '', phone: '' })
      fetchDrivers()
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Failed') }
  }

  async function handleActivate(id: string) {
    setError(null); setSuccess(null)
    try { await axios.patch(`/api/drivers/${id}`); setSuccess(`Driver "${id}" activated`); fetchDrivers() }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Failed to activate') }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Manage Drivers</h1>
      <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-2 gap-3">
          <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="ID (1-50)" required className="rounded border px-2 py-1 text-sm" />
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (1-100)" required className="rounded border px-2 py-1 text-sm" />
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="rounded border px-2 py-1 text-sm" />
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="rounded border px-2 py-1 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Create Driver</button>
      </form>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Bags</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody className="divide-y">
            {drivers.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{d.id}</td>
                <td className="px-3 py-2">{d.name}</td>
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.status}</span></td>
                <td className="px-3 py-2">{d.bagInventory}</td>
                <td className="px-3 py-2">{d.status === 'DRAFT' && <button onClick={() => handleActivate(d.id)} className="text-xs text-blue-600 hover:underline">Activate</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
