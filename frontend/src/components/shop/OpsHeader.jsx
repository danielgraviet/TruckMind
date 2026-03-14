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
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return (
    <span style={{ fontFamily: 'var(--font-mono)' }}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}

function MetricChip({ label, value, prefix = '', suffix = '', decimals = 0, accent = false }) {
  return (
    <div className="flex flex-col items-center px-4 py-2">
      <span
        className="text-[9px] uppercase mb-1.5 tracking-[0.18em]"
        style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: accent ? 'var(--accent)' : 'var(--text-1)', fontFamily: 'var(--font-mono)' }}
      >
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </span>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-7 flex-shrink-0" style={{ background: 'var(--border)' }} />
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
  const cogs    = shopState.totalCogs ?? 0
  const profit  = shopState.grossProfit ?? 0
  const orders  = shopState.totalOrders ?? 0
  const cash    = shopState.cashOnHand ?? 0

  const formatCountdown = useCallback((seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [])

  return (
    <header
      className="flex items-center gap-4 px-5 flex-shrink-0 p-4"
      style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', minHeight: '52px' }}
    >
      {/* Left: Business name */}
      <div className="flex-shrink-0">
        <h1
          className="text-[15px] font-bold leading-tight text-white tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {businessName}
        </h1>
        <p
          className="text-[9px] uppercase tracking-[0.2em] mt-0.5"
          style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
        >
          Operations Center
        </p>
      </div>

      {/* Center: Metrics pill */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <MetricChip label="Revenue"  value={revenue} prefix="$" decimals={2} accent />
          <Divider />
          <MetricChip label="COGS"     value={cogs}    prefix="$" decimals={2} />
          <Divider />
          <MetricChip label="Profit"   value={profit}  prefix="$" decimals={2} />
          <Divider />
          <MetricChip label="Orders"   value={orders}  decimals={0} />
          <Divider />
          <MetricChip label="Cash"     value={cash}    prefix="$" decimals={2} />
        </div>
      </div>

      {/* Right: Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {customerTrickle && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
            style={{ background: 'rgba(59,130,246,0.10)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.18)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Live
          </span>
        )}

        {mockMode ? (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
            style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.18)' }}
          >
            Demo
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(201,241,53,0.18)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            Live
          </span>
        )}

        {rushMode ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase animate-pulse"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            Rush {formatCountdown(rushCountdown)}
          </span>
        ) : (
          <button
            onClick={onStartRush}
            disabled={isRushing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-all disabled:opacity-40"
            style={{ background: 'var(--bg-card)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; e.currentTarget.style.color = '#fca5a5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            Rush Mode
          </button>
        )}
      </div>
    </header>
  )
}
