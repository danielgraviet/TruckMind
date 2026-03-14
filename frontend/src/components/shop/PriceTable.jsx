function decisionTone(action) {
  const text = `${action?.description ?? ''} ${action?.reasoning ?? ''}`.toLowerCase()
  if (text.includes('surge') || text.includes('bestseller')) return { label: 'AI UP', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
  if (text.includes('discount') || text.includes('slow')) return { label: 'AI DOWN', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  return { label: 'AI AUTO', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
}

export default function PriceTable({ menu = [], currentPrices = {}, actions = [] }) {
  if (!menu.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Price Table</h3>
        <p className="text-gray-600 text-sm">No menu loaded.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Current Prices</h3>
          <p className="mt-1 text-xs text-gray-500">The AI adjusts this grid when demand spikes, items stall, or the lunch rush changes throughput.</p>
        </div>
        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300">
          Pricing Autopilot
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left pb-2">Item</th>
            <th className="text-right pb-2">Base</th>
            <th className="text-right pb-2">Current</th>
            <th className="text-right pb-2">Change</th>
            <th className="text-right pb-2">AI Status</th>
          </tr>
        </thead>
        <tbody>
          {menu.map((item) => {
            const base = item.base_price ?? item.basePrice ?? 0
            const current = currentPrices[item.name] ?? base
            const pct = base > 0 ? ((current - base) / base) * 100 : 0
            const color = pct > 0 ? 'text-green-400' : pct < 0 ? 'text-red-400' : 'text-gray-500'
            const latestAction = [...actions].reverse().find((action) => {
              const type = action.action_type ?? action.type
              return ['adjust_price', 'add_special'].includes(type) && action.details?.item_name === item.name
            })
            const tone = latestAction ? decisionTone(latestAction) : null
            return (
              <tr key={item.name} className="border-b border-gray-800/50">
                <td className="py-1.5 text-white">{item.name}</td>
                <td className="py-1.5 text-right text-gray-400">${base.toFixed(2)}</td>
                <td className="py-1.5 text-right text-white font-medium">${current.toFixed(2)}</td>
                <td className={`py-1.5 text-right ${color}`}>
                  {pct === 0 ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
                </td>
                <td className="py-1.5 text-right">
                  {tone ? (
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.cls}`}>
                      {tone.label}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-gray-600">Stable</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
