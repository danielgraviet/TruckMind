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
    <div className="bg-gray-800 rounded-lg px-3 py-2.5">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-lg font-bold text-white">{children}</div>
    </div>
  )
}

const SENTIMENTS = ['excited', 'positive', 'neutral', 'negative', 'hostile']

function SentimentBar({ dist }) {
  const total = SENTIMENTS.reduce((sum, s) => sum + (dist[s] ?? 0), 0)
  if (total === 0) return null

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1.5">Sentiment Distribution</div>
      <div className="flex h-2 rounded-full overflow-hidden">
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
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {SENTIMENTS.map(s => (dist[s] > 0) && (
          <span key={s} className="text-xs text-gray-500">
            <span style={{ color: SENTIMENT_COLORS[s] }}>●</span> {s} {dist[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-3 bg-gray-800 rounded w-1/3" />
      {/* 2×2 metrics */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg px-3 py-2.5 space-y-1.5">
            <div className="h-3 bg-gray-700 rounded w-2/3" />
            <div className="h-6 bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
      {/* Sentiment bar */}
      <div className="space-y-1.5">
        <div className="h-3 bg-gray-800 rounded w-1/3" />
        <div className="h-2 bg-gray-800 rounded-full" />
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-800 rounded w-12" />
          ))}
        </div>
      </div>
      {/* Strengths + Concerns */}
      {[0, 1].map(section => (
        <div key={section} className="space-y-1.5">
          <div className="h-3 bg-gray-800 rounded w-1/5" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-800 rounded" style={{ width: `${70 + i * 8}%` }} />
          ))}
        </div>
      ))}
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
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
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
              <div className="text-xs text-gray-500 mb-1.5">Strengths</div>
              <ul className="space-y-1">
                {stats.topStrengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-emerald-400 flex gap-1.5 items-start">
                    <span className="shrink-0 mt-px">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.topConcerns?.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">Concerns</div>
              <ul className="space-y-1">
                {stats.topConcerns.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-xs text-orange-400 flex gap-1.5 items-start">
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
