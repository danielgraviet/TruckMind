function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function PriceChangeIndicator({ basePrice, currentPrice }) {
  if (currentPrice > basePrice) return <span className="text-emerald-400">&#8593;</span>
  if (currentPrice < basePrice) return <span className="text-red-400">&#8595;</span>
  return <span className="text-gray-500">&#8212;</span>
}

function pctChange(base, current) {
  if (!base || base === 0) return 0
  return ((current - base) / base) * 100
}

function priceColor(base, current) {
  if (current > base) return 'text-emerald-400'
  if (current < base) return 'text-red-400'
  return 'text-amber-400'
}

export default function PricingTimeline({ actions = [], menu = [] }) {
  // Filter pricing-related actions
  const pricingActions = actions
    .filter((a) => a.action_type === 'pricing' || a.action_type === 'adjust_price')
    .slice(-5)
    .reverse()

  return (
    <div className="space-y-4">
      {/* Current prices table */}
      {menu.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Current Prices
          </h3>
          <div className="space-y-0.5">
            {/* Header */}
            <div className="grid grid-cols-5 gap-2 text-[10px] text-gray-500 uppercase tracking-wider pb-1.5 border-b border-gray-800">
              <span className="col-span-2">Item</span>
              <span className="text-right">Base</span>
              <span className="text-right">Current</span>
              <span className="text-right">Change</span>
            </div>
            {menu.map((item) => {
              const base = item.basePrice ?? item.price ?? 0
              const current = item.currentPrice ?? item.price ?? 0
              const change = pctChange(base, current)

              return (
                <div key={item.name ?? item.id} className="grid grid-cols-5 gap-2 py-1.5 text-xs items-center">
                  <span className="col-span-2 text-gray-300 truncate">{item.name}</span>
                  <span className="text-right text-gray-500">${base.toFixed(2)}</span>
                  <span className={`text-right font-medium ${priceColor(base, current)}`}>
                    ${current.toFixed(2)}
                  </span>
                  <span className={`text-right flex items-center justify-end gap-1 ${priceColor(base, current)}`}>
                    <PriceChangeIndicator basePrice={base} currentPrice={current} />
                    <span className="tabular-nums">{change >= 0 ? '+' : ''}{change.toFixed(0)}%</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent price changes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Recent Price Changes
        </h3>
        {pricingActions.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">No price changes yet.</p>
        ) : (
          <div className="space-y-2">
            {pricingActions.map((action, i) => (
              <div
                key={action.id ?? `price-${i}`}
                className="bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatTime(action.timestamp)}</span>
                  <span className="text-[10px] text-blue-400 font-medium uppercase">Price Change</span>
                </div>
                <p className="text-xs text-gray-300 mt-1">{action.description}</p>
                {action.reasoning && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{action.reasoning}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
