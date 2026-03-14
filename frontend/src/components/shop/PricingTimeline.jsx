import { formatTime } from '../../utils/formatTime.js'

function summarize(action) {
  const details = action.details ?? {}
  const appliedPrice = details.applied_price ?? details.new_price ?? 0
  const basePrice = details.base_price ?? 0
  const deltaPct = details.price_delta_pct
    ?? (basePrice > 0 && appliedPrice > 0 ? (((appliedPrice - basePrice) / basePrice) * 100) : 0)

  return {
    itemName: details.item_name ?? 'Menu item',
    appliedPrice,
    basePrice,
    deltaPct,
    reason: details.reason ?? action.reasoning ?? 'AI pricing adjustment',
  }
}

export default function PricingTimeline({ actions = [], menu = [], currentPrices = {} }) {
  const pricingActions = actions
    .filter((action) => ['adjust_price', 'add_special'].includes(action.action_type ?? action.type))
    .slice(-6)
    .reverse()

  const activeOverrides = menu.filter((item) => {
    const base = item.base_price ?? item.basePrice ?? 0
    return (currentPrices[item.name] ?? base) !== base
  }).length

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-slate-950 to-cyan-950/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">AI Pricing Brain</h3>
            <p className="mt-1 text-sm text-gray-400">Autonomous pricing is watching demand, throughput, and margin in real time.</p>
          </div>
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200">
            {pricingActions.length} recent moves
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Active Overrides</p>
            <p className="mt-2 text-2xl font-semibold text-white">{activeOverrides}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Menu Items</p>
            <p className="mt-2 text-2xl font-semibold text-white">{menu.length}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Mode</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Demand + Time + Margin</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Recent Price Decisions</h3>
          <span className="text-xs text-gray-500">Most recent first</span>
        </div>

        {pricingActions.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">No pricing adjustments yet. The AI will post them here when it reacts to demand.</p>
        ) : (
          <div className="space-y-3">
            {pricingActions.map((action, index) => {
              const summary = summarize(action)
              const improved = summary.deltaPct >= 0
              return (
                <div
                  key={action.id ?? `pricing-${index}`}
                  className="rounded-xl border border-gray-800 bg-gray-950/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{formatTime(action.timestamp)}</p>
                      <h4 className="mt-1 text-sm font-semibold text-white">{summary.itemName}</h4>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      improved
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}>
                      {improved ? 'Lifted' : 'Discounted'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Base ${summary.basePrice.toFixed(2)}</p>
                      <p className="text-lg font-semibold text-white">${summary.appliedPrice.toFixed(2)}</p>
                    </div>
                    <p className={`text-sm font-semibold ${improved ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {summary.deltaPct >= 0 ? '+' : ''}{summary.deltaPct.toFixed(1)}%
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-gray-300">{action.description}</p>
                  <p className="mt-1 text-xs text-gray-500">{summary.reason}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
