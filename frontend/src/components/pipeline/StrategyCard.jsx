import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'

export const POSITIONING_META = {
  value:   { label: 'Value',   color: 'text-blue-400',   border: 'border-blue-500/50',   ring: 'ring-blue-500',   bg: 'bg-blue-500/10' },
  premium: { label: 'Premium', color: 'text-amber-400',  border: 'border-amber-500/50',  ring: 'ring-amber-500',  bg: 'bg-amber-500/10' },
  niche:   { label: 'Niche',   color: 'text-violet-400', border: 'border-violet-500/50', ring: 'ring-violet-500', bg: 'bg-violet-500/10' },
}

function StrategySkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 bg-gray-800 rounded w-2/5" />
        <div className="h-4 bg-gray-800 rounded w-3/5" />
      </div>
      <div className="h-3 bg-gray-800 rounded w-12" />
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/5" />
              <div className="h-4 bg-gray-700 rounded w-1/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Testing progress card (shown in the strategy strip) ───────────────

export function StrategyTestCard({ strategy, isCurrent, isComplete, stats, onClick, isSelected }) {
  const pos = POSITIONING_META[strategy?.positioning] ?? POSITIONING_META.value
  const interestPct = stats ? `${(stats.interestRate * 100).toFixed(0)}%` : null
  const revenue     = stats ? `$${Math.round(stats.projectedDailyRevenue)}/day` : null
  const isClickable = isComplete && !!onClick

  return (
    <motion.div
      animate={isCurrent ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={isClickable ? onClick : undefined}
      className={[
        'rounded-xl p-4 border transition-all relative overflow-hidden',
        isClickable ? 'cursor-pointer' : '',
        isCurrent
          ? `bg-gray-900 ${pos.border} ring-1 ${pos.ring}`
          : isSelected
            ? `bg-gray-900 ${pos.border} ring-2 ${pos.ring}`
            : isComplete
              ? 'bg-gray-900 border-gray-700 hover:border-gray-600'
              : 'bg-gray-900 border-gray-800 opacity-60',
      ].join(' ')}
    >
      {isCurrent && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-white" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      )}

      <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${pos.color}`}>
        {pos.label}
      </div>
      <div className="text-sm font-semibold text-white truncate">{strategy?.businessName}</div>
      <div className="text-xs text-gray-500 mt-0.5 truncate italic">"{strategy?.tagline}"</div>

      {isComplete && stats && (
        <div className="mt-3 flex gap-3 text-xs">
          <span className="text-emerald-400">{interestPct} interest</span>
          <span className="text-gray-400">{revenue}</span>
        </div>
      )}
      {isCurrent && !stats && (
        <div className="mt-3 text-xs text-gray-500 animate-pulse">Testing…</div>
      )}
    </motion.div>
  )
}

// ── Winner result card (shown in complete phase) ──────────────────────

export function WinnerCard({ strategy, stats, rationale, isWinner = true }) {
  const pos = POSITIONING_META[strategy?.positioning] ?? POSITIONING_META.value

  return (
    <motion.div
      key={strategy?.businessName}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className={`bg-gray-900 border-2 ${pos.border} rounded-xl p-5 space-y-4 relative`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-xs font-bold uppercase tracking-widest ${pos.color} mb-1`}>
            {pos.label}{isWinner ? ' · Best Strategy' : ''}
          </div>
          <h2 className="text-xl font-bold text-white">{strategy?.businessName}</h2>
          <p className="text-gray-400 text-sm mt-0.5 italic">"{strategy?.tagline}"</p>
        </div>
        {isWinner && <Trophy className="w-5 h-5 text-amber-400 shrink-0" />}
      </div>

      {rationale && (
        <p className="text-sm text-gray-300 border-l-2 border-gray-700 pl-3">{rationale}</p>
      )}

      {strategy?.menu?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Menu</div>
          <div className="grid grid-cols-2 gap-1.5">
            {strategy.menu.map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white truncate">{item.name}</span>
                  <span className="text-sm text-emerald-400 shrink-0">${Number(item.base_price).toFixed(2)}</span>
                </div>
                {item.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── Default: active strategy display ─────────────────────────────────

export default function StrategyCard({ strategy, phase }) {
  const isLoading = phase !== 'idle' && !strategy

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <StrategySkeleton />
        </motion.div>
      ) : strategy ? (
        <motion.div
          key="content"
          initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4"
        >
          <div>
            <h2 className="text-xl font-bold text-white">{strategy.businessName}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{strategy.tagline}</p>
          </div>
          {strategy.menu?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Menu</div>
              <div className="grid grid-cols-2 gap-1.5">
                {strategy.menu.map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white truncate">{item.name}</span>
                      <span className="text-sm text-emerald-400 shrink-0">${Number(item.base_price).toFixed(2)}</span>
                    </div>
                    {item.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
