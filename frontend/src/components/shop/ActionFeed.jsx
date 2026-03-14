import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ACTION_COLORS } from '../../constants/actionTypes.js'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function ActionCard({ action, isNew }) {
  const colors = ACTION_COLORS[action.type] ?? ACTION_COLORS.update_status

  return (
    <motion.div
      layout
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`${colors.bg} ${colors.border} border rounded-lg px-3 py-2.5 ${isNew ? 'ring-1 ring-white/10' : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className={`${colors.text} text-sm font-mono shrink-0 mt-0.5`}>{colors.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-white truncate">{action.description}</span>
            <span className="text-xs text-gray-500 shrink-0">{timeAgo(action.timestamp)}</span>
          </div>
          {action.details && (
            <p className="text-xs text-gray-400 mt-0.5">{action.details}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function ActionFeed({ actions = [] }) {
  const scrollRef = useRef(null)
  const prevLenRef = useRef(0)

  useEffect(() => {
    if (actions.length > prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevLenRef.current = actions.length
  }, [actions.length])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="text-base">&#9889;</span> Agent Activity
      </h3>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 min-h-0 scrollbar-thin">
        <AnimatePresence initial={false}>
          {actions.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <p className="text-sm text-gray-600 animate-pulse">Waiting for first order...</p>
            </motion.div>
          ) : (
            actions.map((action, i) => (
              <ActionCard
                key={action.id}
                action={action}
                isNew={i >= actions.length - 2}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
