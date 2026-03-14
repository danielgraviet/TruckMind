import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'

export const POSITIONING_META = {
  value:   { label: 'Value',   accent: '#60a5fa', gradient: 'linear-gradient(135deg, #0f1f40 0%, #1a3060 100%)' },
  premium: { label: 'Premium', accent: '#f59e0b', gradient: 'linear-gradient(135deg, #2a1a05 0%, #4a3010 100%)' },
  niche:   { label: 'Niche',   accent: '#a78bfa', gradient: 'linear-gradient(135deg, #1a0f2e 0%, #2e1a50 100%)' },
}

function StrategySkeleton() {
  return (
    <div
      className="rounded-2xl p-5 space-y-4 animate-pulse"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="space-y-2">
        <div className="h-5 rounded-lg w-2/5" style={{ background: 'var(--bg-card)' }} />
        <div className="h-4 rounded-lg w-3/5" style={{ background: 'var(--bg-card)' }} />
      </div>
      <div className="h-3 rounded-lg w-16" style={{ background: 'var(--bg-card)' }} />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5 h-10" style={{ background: 'var(--bg-card)' }} />
        ))}
      </div>
    </div>
  )
}

// ── Testing progress card (strategy strip) ──────────────────────────────

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
      className="rounded-2xl p-4 relative overflow-hidden transition-all"
      style={{
        background: isSelected || isCurrent ? pos.gradient : 'var(--bg-surface)',
        border: `1px solid ${isCurrent || isSelected ? `${pos.accent}40` : 'var(--border)'}`,
        boxShadow: isSelected ? `0 0 20px ${pos.accent}18` : 'none',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: !isComplete && !isCurrent ? 0.5 : 1,
      }}
    >
      {/* Active ping */}
      {isCurrent && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: pos.accent }}
          />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: pos.accent }} />
        </span>
      )}

      <div
        className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5"
        style={{ color: pos.accent, fontFamily: 'var(--font-body)' }}
      >
        {pos.label}
      </div>
      <div className="text-sm font-semibold text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
        {strategy?.businessName}
      </div>
      <div
        className="text-xs mt-0.5 truncate italic"
        style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
      >
        "{strategy?.tagline}"
      </div>

      {isComplete && stats && (
        <div className="mt-3 flex gap-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--accent)' }}>{interestPct}</span>
          <span style={{ color: 'var(--text-2)' }}>{revenue}</span>
        </div>
      )}
      {isCurrent && !stats && (
        <div
          className="mt-3 text-[11px] animate-pulse"
          style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
        >
          Testing…
        </div>
      )}
    </motion.div>
  )
}

// ── Winner result card ──────────────────────────────────────────────────

export function WinnerCard({ strategy, stats, rationale, isWinner = true }) {
  const pos = POSITIONING_META[strategy?.positioning] ?? POSITIONING_META.value

  return (
    <motion.div
      key={strategy?.businessName}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
      style={{
        background: pos.gradient,
        border: `1px solid ${pos.accent}35`,
        boxShadow: isWinner ? `0 0 30px ${pos.accent}14` : 'none',
      }}
    >
      {/* Subtle noise */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
      />

      <div className="flex items-start justify-between gap-3 relative">
        <div>
          <div
            className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1"
            style={{ color: pos.accent, fontFamily: 'var(--font-body)' }}
          >
            {pos.label}{isWinner ? ' · Best Strategy' : ''}
          </div>
          <h2
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {strategy?.businessName}
          </h2>
          <p
            className="text-sm mt-0.5 italic"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}
          >
            "{strategy?.tagline}"
          </p>
        </div>
        {isWinner && (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            🏆
          </div>
        )}
      </div>

      {rationale && (
        <p
          className="text-sm pl-3 relative"
          style={{
            color: 'rgba(255,255,255,0.6)',
            borderLeft: `2px solid ${pos.accent}50`,
            fontFamily: 'var(--font-body)',
          }}
        >
          {rationale}
        </p>
      )}

      {strategy?.menu?.length > 0 && (
        <div className="relative">
          <div
            className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2.5"
            style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)' }}
          >
            Menu
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {strategy.menu.map((item, i) => (
              <div
                key={i}
                className="rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(0,0,0,0.25)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-sm text-white truncate"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="text-sm shrink-0"
                    style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                  >
                    ${Number(item.base_price).toFixed(2)}
                  </span>
                </div>
                {item.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {item.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded-md"
                        style={{
                          color: 'rgba(255,255,255,0.35)',
                          background: 'rgba(255,255,255,0.07)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {tag}
                      </span>
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

// ── Default: active strategy display ──────────────────────────────────

export default function StrategyCard({ strategy, phase }) {
  const isLoading = phase !== 'idle' && !strategy
  const pos = POSITIONING_META[strategy?.positioning] ?? POSITIONING_META.value

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
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {strategy.businessName}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
              {strategy.tagline}
            </p>
          </div>
          {strategy.menu?.length > 0 && (
            <div>
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-2.5"
                style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
              >
                Menu
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {strategy.menu.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white truncate" style={{ fontFamily: 'var(--font-body)' }}>
                        {item.name}
                      </span>
                      <span className="text-sm shrink-0" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        ${Number(item.base_price).toFixed(2)}
                      </span>
                    </div>
                    {item.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-md"
                            style={{ color: 'var(--text-3)', background: 'rgba(255,255,255,0.05)', fontFamily: 'var(--font-body)' }}
                          >
                            {tag}
                          </span>
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
