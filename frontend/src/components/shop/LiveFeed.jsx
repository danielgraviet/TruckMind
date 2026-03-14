import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTimeWithSeconds } from '../../utils/formatTime.js'

const EVENT_STYLES = {
  order:            { dot: 'bg-emerald-500', icon: '\uD83D\uDCB3' },
  pricing:          { dot: 'bg-blue-500',    icon: '\uD83D\uDCC8' },
  restock:          { dot: 'bg-amber-500',   icon: '\uD83D\uDCE6' },
  escalation:       { dot: 'bg-red-500',     icon: '\uD83D\uDEA8' },
  rush:             { dot: 'bg-red-500 animate-pulse', icon: '\u26A1' },
  customer_arrival: { dot: 'bg-gray-500',    icon: '\uD83D\uDC64' },
  default:          { dot: 'bg-gray-500',    icon: '\uD83D\uDCCB' },
}

function EventItem({ event }) {
  const [expanded, setExpanded] = useState(false)
  const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.default

  return (
    <motion.div
      layout
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-gray-800/50 rounded-md transition-colors">
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{formatTimeWithSeconds(event.timestamp)}</span>
            <span className="text-xs">{style.icon}</span>
            <span className="text-xs text-gray-300 truncate">{event.text}</span>
          </div>
          {expanded && event.details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-1.5 ml-0.5 pl-2 border-l border-gray-700"
            >
              {typeof event.details === 'object' ? (
                Object.entries(event.details).map(([key, val]) => (
                  <div key={key} className="text-[11px] text-gray-400 py-0.5">
                    <span className="text-gray-500">{key}:</span> {String(val)}
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-gray-400">{String(event.details)}</p>
              )}
            </motion.div>
          )}
        </div>
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
    <div className="bg-gray-900 border-l border-gray-800 w-72 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Feed</h3>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 py-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-600 text-center mt-8 px-4"
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
