import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SENTIMENT_COLORS } from '../../constants/sentiments.js'

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)
  const currentRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (value == null) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = currentRef.current
    const end = value
    const duration = 800
    const startTime = performance.now()

    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      const current = start + (end - start) * eased
      currentRef.current = current
      setDisplay(current)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString()

  return <span>{prefix}{formatted}{suffix}</span>
}

function Metric({ label, children }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="text-[9.5px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
        {label}
      </div>
      <div className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{children}</div>
    </div>
  )
}

const SENTIMENTS = ['excited', 'positive', 'neutral', 'negative', 'hostile']

function SentimentBar({ dist }) {
  const total = SENTIMENTS.reduce((sum, s) => sum + (dist[s] ?? 0), 0)
  if (total === 0) return null

  return (
    <div>
      <div
        className="text-[9.5px] uppercase tracking-[0.18em] mb-1.5"
        style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
      >
        Sentiment Distribution
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden">
        {SENTIMENTS.map(s => {
          const pct = ((dist[s] ?? 0) / total) * 100
          return pct > 0 ? (
            <div
              key={s}
              style={{ width: `${pct}%`, backgroundColor: SENTIMENT_COLORS[s] }}
              title={`${s}: ${Math.round(pct)}%`}
            />
          ) : null
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {SENTIMENTS.map(s => (dist[s] > 0) && (
          <span key={s} className="text-[10px]" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
            <span style={{ color: SENTIMENT_COLORS[s] }}>●</span> {s} {dist[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 space-y-4 animate-pulse"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="h-3 rounded w-1/3" style={{ background: 'var(--bg-card)' }} />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5 space-y-1.5" style={{ background: 'var(--bg-card)' }}>
            <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="h-5 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SimulationStats({ stats, phase }) {
  const isLoading = (phase === 'simulation' || phase === 'complete') && !stats

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <StatsSkeleton />
        </motion.div>
      ) : stats ? (
        <motion.div
          key="content"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <h3
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
          >
            Simulation Results
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Interest Rate">
              <AnimatedNumber value={stats.interestRate * 100} suffix="%" decimals={1} />
            </Metric>
            <Metric label="Daily Customers">
              <AnimatedNumber value={stats.projectedDailyCustomers} />
            </Metric>
            <Metric label="Daily Revenue">
              <AnimatedNumber value={stats.projectedDailyRevenue} prefix="$" decimals={0} />
            </Metric>
            <Metric label="Sentiment Score">
              <AnimatedNumber value={stats.avgSentimentScore * 10} suffix="/10" decimals={1} />
            </Metric>
          </div>

          {stats.sentimentDistribution && (
            <SentimentBar dist={stats.sentimentDistribution} />
          )}

          {stats.topStrengths?.length > 0 && (
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.18em] mb-1.5"
                style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
              >
                Strengths
              </div>
              <ul className="space-y-1">
                {stats.topStrengths.slice(0, 3).map((s, i) => (
                  <li
                    key={i}
                    className="text-xs flex gap-1.5 items-start"
                    style={{ color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
                  >
                    <span className="shrink-0 mt-px">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.topConcerns?.length > 0 && (
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.18em] mb-1.5"
                style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
              >
                Concerns
              </div>
              <ul className="space-y-1">
                {stats.topConcerns.slice(0, 3).map((c, i) => (
                  <li
                    key={i}
                    className="text-xs flex gap-1.5 items-start"
                    style={{ color: 'var(--negative)', fontFamily: 'var(--font-body)' }}
                  >
                    <span className="shrink-0 mt-px">–</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
