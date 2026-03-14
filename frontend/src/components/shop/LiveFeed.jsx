import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTimeWithSeconds } from '../../utils/formatTime.js'

const EVENT_CONFIG = {
  order:            { color: '#c9f135', tag: 'ORDER' },
  pricing:          { color: '#60a5fa', tag: 'PRICE' },
  restock:          { color: '#f59e0b', tag: 'STOCK' },
  escalation:       { color: '#f87171', tag: 'ESCL' },
  rush:             { color: '#f87171', tag: 'RUSH', pulse: true },
  customer_arrival: { color: '#555555', tag: 'IN' },
  default:          { color: '#555555', tag: 'EVT' },
}

function EventItem({ event }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.default

  return (
    <motion.div
      layout
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onClick={() => setExpanded(!expanded)}
      className="cursor-pointer"
    >
      <div
        className="mx-2 mb-0.5 px-3 py-2 rounded-lg transition-colors"
        style={{ ':hover': { background: 'rgba(255,255,255,0.02)' } }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-[9px] font-bold tracking-[0.12em] px-1.5 py-0.5 rounded flex-shrink-0 ${cfg.pulse ? 'animate-pulse' : ''}`}
            style={{ color: cfg.color, background: `${cfg.color}18`, fontFamily: 'var(--font-body)' }}
          >
            {cfg.tag}
          </span>
          <span
            className="text-[10px] tabular-nums flex-shrink-0"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
          >
            {formatTimeWithSeconds(event.timestamp)}
          </span>
        </div>
        <p
          className="text-[11.5px] leading-snug truncate"
          style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
        >
          {event.text}
        </p>
        {expanded && event.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pl-2 space-y-0.5"
            style={{ borderLeft: `1px solid ${cfg.color}35` }}
          >
            {typeof event.details === 'object'
              ? Object.entries(event.details).map(([k, v]) => (
                  <div key={k} className="text-[10px]">
                    <span style={{ color: 'var(--text-3)' }}>{k}:</span>
                    {' '}
                    <span style={{ color: 'var(--text-2)' }}>{String(v)}</span>
                  </div>
                ))
              : <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{String(event.details)}</p>
            }
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default function LiveFeed({ events = [] }) {
  const scrollRef = useRef(null)
  const prevLenRef = useRef(0)

  useEffect(() => {
    if (events.length > prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    prevLenRef.current = events.length
  }, [events.length])

  return (
    <div
      className="w-72 flex flex-col overflow-hidden flex-shrink-0"
      style={{ background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
          >
            Live Feed
          </span>
        </div>
        <span
          className="text-[10px] tabular-nums px-2 py-0.5 rounded-full"
          style={{ color: 'var(--text-3)', background: 'var(--bg-card)', fontFamily: 'var(--font-mono)' }}
        >
          {events.length}
        </span>
      </div>

      {/* Events */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 py-1.5">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-12 text-[12px]"
              style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
            >
              Events will appear here...
            </motion.p>
          ) : (
            events.map((event, i) => (
              <EventItem key={event.id ?? `${event.timestamp}-${i}`} event={event} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
