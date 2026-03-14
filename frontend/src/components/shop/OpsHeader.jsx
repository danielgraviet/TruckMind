import { useState, useEffect, useRef, useCallback } from 'react'

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(value)
  const currentRef = useRef(value)
  const rafRef = useRef(null)

  useEffect(() => {
    const start = currentRef.current
    const end = value
    if (start === end) return

    const duration = 600
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      currentRef.current = current

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return (
    <span className="tabular-nums font-mono">
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}

function MetricChip({ label, value, prefix = '', suffix = '', decimals = 0 }) {
  return (
    <div className="flex flex-col items-center px-3">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-white">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </span>
    </div>
  )
}

export default function OpsHeader({
  businessName = 'Food Truck',
  mockMode = true,
  rushMode = false,
  rushCountdown = 0,
  shopState = {},
  customerTrickle = false,
  onStartRush,
  onToggleTrickle,
  isRushing = false,
}) {
  const revenue = shopState.totalRevenue ?? 0
  const cogs = shopState.totalCogs ?? 0
  const profit = shopState.grossProfit ?? 0
  const orders = shopState.totalOrders ?? 0
  const cash = shopState.cashOnHand ?? 0

  const formatCountdown = useCallback((seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [])

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-4">
      {/* Left: Business name */}
      <div className="flex-shrink-0">
        <h1 className="text-lg font-bold text-white leading-tight">{businessName}</h1>
        <p className="text-xs text-gray-500">Operations Center</p>
      </div>

      {/* Center: Metrics */}
      <div className="flex-1 flex items-center justify-center gap-1">
        <MetricChip label="Revenue" value={revenue} prefix="$" decimals={2} />
        <div className="w-px h-6 bg-gray-800" />
        <MetricChip label="COGS" value={cogs} prefix="$" decimals={2} />
        <div className="w-px h-6 bg-gray-800" />
        <MetricChip label="Profit" value={profit} prefix="$" decimals={2} />
        <div className="w-px h-6 bg-gray-800" />
        <MetricChip label="Orders" value={orders} decimals={0} />
        <div className="w-px h-6 bg-gray-800" />
        <MetricChip label="Cash" value={cash} prefix="$" decimals={2} />
      </div>

      {/* Right: Badges and Rush */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Customer trickle indicator */}
        {customerTrickle && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Customers Active
          </span>
        )}

        {/* LIVE / DEMO badge */}
        {mockMode ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            DEMO
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}

        {/* Rush button / badge */}
        {rushMode ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse bg-red-900 text-red-200 border border-red-700">
            RUSH MODE {formatCountdown(rushCountdown)}
          </span>
        ) : (
          <button
            onClick={onStartRush}
            disabled={isRushing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700 hover:bg-red-900/50 hover:text-red-200 hover:border-red-700 transition-colors"
          >
            Rush Mode
          </button>
        )}
      </div>
    </header>
  )
}
