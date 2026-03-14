export default function ShopPage({ strategy }) {
  const businessName = strategy?.businessName ?? 'Your Food Truck'
  const tagline = strategy?.tagline ?? 'Live Operations'

  const panels = [
    { label: 'Chat', icon: '💬', desc: 'Customer orders & chat' },
    { label: 'Inventory', icon: '📦', desc: 'Stock levels & restocking' },
    { label: 'Revenue', icon: '💰', desc: 'Sales & earnings tracker' },
    { label: 'Actions', icon: '⚡', desc: 'Autonomous decisions feed' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚚</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">{businessName}</span>
                <span className="px-2 py-0.5 rounded-full bg-green-900/50 border border-green-600/40 text-green-400 text-xs font-medium">
                  Open
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{tagline}</p>
            </div>
          </div>
          <span className="text-gray-600 text-sm">Live Operations</span>
        </div>
      </header>

      {/* Panel grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {panels.map(({ label, icon, desc }) => (
            <div
              key={label}
              className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 flex flex-col gap-3 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <span className="font-semibold text-gray-200">{label}</span>
              </div>
              <p className="text-xs text-gray-500">{desc}</p>
              <div className="mt-auto pt-4 border-t border-gray-800 text-xs text-gray-600 italic">
                Coming soon
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder message */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>The shop is open — full operations coming in the next phase.</p>
        </div>
      </div>
    </div>
  )
}
