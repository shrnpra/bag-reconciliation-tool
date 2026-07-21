export default function TrainingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-800">📚 Training Guide</h1>
      <p className="mb-8 text-sm text-gray-500">Simple steps for drivers and managers. Follow the icons!</p>

      {/* ─── DRIVER SECTION ─────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-blue-700 border-b pb-2">🚗 For Drivers</h2>

        {/* Step 1: Pickup */}
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="mb-3 text-base font-bold text-gray-800">Step 1: Pick Up a Bag</h3>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-4xl">📦</div>
            <div className="text-sm text-gray-700 space-y-2">
              <p>When you pick up an ice cream bag for delivery:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to <span className="font-semibold text-blue-700">Scan Bags</span> in the menu</li>
                <li>Make sure <span className="font-semibold">Pickup</span> mode is selected (blue button)</li>
                <li>Scan the barcode on the bag OR type it in</li>
                <li>Press <span className="font-semibold">Enter</span></li>
                <li>You'll see ✅ "Bag picked up successfully"</li>
              </ol>
            </div>
          </div>
          {/* Visual flow */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <span className="rounded-lg bg-white px-3 py-2 border shadow-sm">📱 Open App</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-white px-3 py-2 border shadow-sm">🔍 Scan Bags</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-blue-600 text-white px-3 py-2 shadow-sm">Pickup</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-white px-3 py-2 border shadow-sm">📷 Scan Barcode</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-green-100 text-green-700 px-3 py-2 border border-green-200 shadow-sm">✅ Done!</span>
          </div>
        </div>

        {/* Step 2: Return */}
        <div className="mb-6 rounded-xl border border-green-100 bg-green-50 p-5">
          <h3 className="mb-3 text-base font-bold text-gray-800">Step 2: Return the Bag</h3>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-4xl">🏪</div>
            <div className="text-sm text-gray-700 space-y-2">
              <p>After delivering ice cream, return the bag to any store:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to <span className="font-semibold text-blue-700">Scan Bags</span> in the menu</li>
                <li>Tap <span className="font-semibold">Return</span> mode (blue button)</li>
                <li>Select which store you're returning to</li>
                <li>Scan the barcode on the bag OR type it in</li>
                <li>Press <span className="font-semibold">Enter</span></li>
                <li>You'll see ✅ "Bag returned successfully"</li>
              </ol>
            </div>
          </div>
          {/* Visual flow */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm flex-wrap">
            <span className="rounded-lg bg-white px-3 py-2 border shadow-sm">📱 Open App</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-white px-3 py-2 border shadow-sm">🔍 Scan Bags</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-blue-600 text-white px-3 py-2 shadow-sm">Return</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-white px-3 py-2 border shadow-sm">🏪 Select Store</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-white px-3 py-2 border shadow-sm">📷 Scan</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-lg bg-green-100 text-green-700 px-3 py-2 border border-green-200 shadow-sm">✅ Done!</span>
          </div>
        </div>

        {/* Important rules */}
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <h3 className="mb-2 text-base font-bold text-gray-800">⚠️ Important Rules</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2"><span>⏰</span><span><span className="font-semibold">Return bags within 4 hours</span> — after 4 hours, the bag is marked OVERDUE and your manager will be notified</span></li>
            <li className="flex items-start gap-2"><span>🔄</span><span><span className="font-semibold">Return to any store</span> — you don't have to return to the same store you picked up from</span></li>
            <li className="flex items-start gap-2"><span>📷</span><span><span className="font-semibold">Always scan</span> — every pickup and every return must be scanned. No scan = bag stays on your name</span></li>
          </ul>
        </div>
      </section>

      {/* ─── MANAGER SECTION ────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-purple-700 border-b pb-2">👔 For Managers</h2>

        <div className="space-y-4">
          {/* Register bags */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-base font-bold text-gray-800">1️⃣ Register New Bags</h3>
            <p className="text-sm text-gray-600 mb-2">Before bags can be tracked, add them to the system:</p>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Register Bags</span> → Enter barcode → Select store → Submit
            </div>
          </div>

          {/* Monitor accountability */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-base font-bold text-gray-800">2️⃣ Monitor Driver Accountability</h3>
            <p className="text-sm text-gray-600 mb-2">See who has bags out and who is overdue:</p>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Accountability</span> → Filter by country → See bags out & overdue per driver → Click driver for details
            </div>
          </div>

          {/* End of day */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-base font-bold text-gray-800">3️⃣ End of Day Review</h3>
            <p className="text-sm text-gray-600 mb-2">Before closing, check all unreturned bags:</p>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">End of Day</span> → See all overdue bags grouped by driver → Follow up with drivers who haven't returned
            </div>
          </div>

          {/* Mark lost */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-base font-bold text-gray-800">4️⃣ Mark Bags as Lost</h3>
            <p className="text-sm text-gray-600 mb-2">If a bag cannot be recovered:</p>
            <div className="text-sm text-gray-700">
              Use the API: <code className="bg-gray-100 px-1 rounded">PATCH /api/bags/BARCODE/status</code> with <code className="bg-gray-100 px-1 rounded">{`{"status": "LOST"}`}</code>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROCESS OVERVIEW ───────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-700 border-b pb-2">🔄 Full Process Flow</h2>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-100 px-4 py-2 font-medium text-blue-800">1. Order Staged</span>
              <span className="text-gray-400 text-lg">↓</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-100 px-4 py-2 font-medium text-blue-800">2. Ice cream placed in bag</span>
              <span className="text-gray-400 text-lg">↓</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-100 px-4 py-2 font-medium text-green-800">3. Driver scans bag (PICKUP)</span>
              <span className="text-gray-400 text-lg">↓</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-100 px-4 py-2 font-medium text-blue-800">4. Driver delivers to customer</span>
              <span className="text-gray-400 text-lg">↓</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-100 px-4 py-2 font-medium text-green-800">5. Driver scans bag at store (RETURN)</span>
              <span className="text-gray-400 text-lg">↓</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-purple-100 px-4 py-2 font-medium text-purple-800">6. Bag back in pool → Ready for next driver</span>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-gray-500">⏰ Bags must be returned within 4 hours of pickup</p>
        </div>
      </section>
    </div>
  )
}
