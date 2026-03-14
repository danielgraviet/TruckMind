import { motion } from 'framer-motion'

function barColor(pct) {
  if (pct <= 0) return 'bg-gray-600'
  if (pct < 20) return 'bg-rose-500'
  if (pct <= 50) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function badge(pct) {
  if (pct <= 0) return { label: 'OUT', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse' }
  if (pct < 20) return { label: 'LOW STOCK', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
  return null
}

export default function InventoryBars({ inventory = {}, currentPrices = {}, removedItems = [] }) {
  const items = Object.entries(inventory)
  if (items.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="text-base">&#128230;</span> Inventory
      </h3>

      <div className="space-y-2.5">
        {items.map(([name, { quantity, maxCapacity }]) => {
          const pct = maxCapacity > 0 ? (quantity / maxCapacity) * 100 : 0
          const isRemoved = removedItems.includes(name)
          const price = currentPrices[name]
          const b = badge(pct)

          return (
            <div key={name} className={isRemoved ? 'opacity-40' : ''}>
              <div className="flex items-baseline justify-between mb-1">
                <span className={`text-sm text-gray-200 ${isRemoved ? 'line-through' : ''}`}>
                  {name}
                </span>
                <div className="flex items-center gap-2">
                  {price != null && (
                    <span className="text-xs text-gray-500">${price.toFixed(2)}</span>
                  )}
                  {b && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${b.cls}`}>
                      {b.label}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 tabular-nums w-12 text-right">
                    {quantity}/{maxCapacity}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barColor(pct)}`}
                  initial={false}
                  animate={{ width: `${Math.max(pct, 0)}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
