import { useEffect, useState } from 'react'
import axios from 'axios'

interface InventoryEntry { id: string; bagInventory: number }

export default function InventoryView() {
  const [drivers, setDrivers] = useState<InventoryEntry[]>([])
  const [stores, setStores] = useState<InventoryEntry[]>([])

  async function fetchAll() {
    try {
      const [d, s] = await Promise.all([
        axios.get<InventoryEntry[]>('/api/drivers'),
        axios.get<InventoryEntry[]>('/api/stores'),
      ])
      setDrivers(d.data.map(x => ({ id: x.id, bagInventory: (x as any).bagInventory ?? 0 })))
      setStores(s.data.map(x => ({ id: x.id, bagInventory: (x as any).bagInventory ?? 0 })))
    } catch {}
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [])

  function Table({ title, data }: { title: string; data: InventoryEntry[] }) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <h2 className="border-b px-4 py-3 text-sm font-semibold text-gray-700">{title}</h2>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Bag Inventory</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{e.id}</td>
                <td className="px-4 py-2">{e.bagInventory}</td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={2} className="px-4 py-3 text-gray-400 text-center">No records</td></tr>}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-800">Bag Inventory</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Table title="Drivers" data={drivers} />
        <Table title="Stores" data={stores} />
      </div>
      <p className="mt-3 text-xs text-gray-400">Auto-refreshes every 5 seconds</p>
    </div>
  )
}
