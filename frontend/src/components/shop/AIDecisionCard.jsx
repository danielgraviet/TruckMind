import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ConfidenceBar from './ConfidenceBar.jsx'

const TYPE_STYLES = {
  pricing:   { bg: 'bg-blue-950', border: 'border-blue-800', accent: 'text-blue-400', bar: 'bg-blue-500' },
  adjust_price: { bg: 'bg-blue-950', border: 'border-blue-800', accent: 'text-blue-400', bar: 'bg-blue-500' },
  inventory: { bg: 'bg-amber-950', border: 'border-amber-800', accent: 'text-amber-400', bar: 'bg-amber-500' },
  restock:   { bg: 'bg-amber-950', border: 'border-amber-800', accent: 'text-amber-400', bar: 'bg-amber-500' },
  escalation: { bg: 'bg-red-950', border: 'border-red-800', accent: 'text-red-400', bar: 'bg-red-500' },
}

const DEFAULT_STYLE = { bg: 'bg-gray-900', border: 'border-gray-700', accent: 'text-gray-400', bar: 'bg-gray-500' }

function DecisionItem({ decision }) {
  const [expanded, setExpanded] = useState(false)
  const actionType = decision.action_type ?? decision.type
  const style = TYPE_STYLES[actionType] ?? DEFAULT_STYLE

  return (
    <motion.div
      layout
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`${style.bg} ${style.border} border rounded-lg p-3 cursor-pointer transition-colors hover:brightness-110`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Summary */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold uppercase ${style.accent}`}>
              {actionType}
            </span>
            {decision.escalated && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                ESCALATED
              </span>
            )}
          </div>
          <p className="text-sm text-gray-200 mt-0.5">{decision.description}</p>
        </div>
        <span className="text-gray-600 text-xs shrink-0">{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>

      <ConfidenceBar confidence={decision.confidence} barClass={style.bar} />

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
              {/* Context Gathered */}
              {decision.context_gathered?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Context Gathered</h4>
                  <ul className="space-y-0.5">
                    {decision.context_gathered.map((ctx, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="text-gray-600 mt-0.5">&#8226;</span>
                        {ctx}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Options Considered */}
              {decision.options_considered?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Options Considered</h4>
                  <div className="space-y-1">
                    {decision.options_considered.map((opt, i) => (
                      <div key={i} className="text-xs bg-gray-800/50 rounded px-2 py-1.5">
                        <span className="text-gray-300 font-medium">{opt.option ?? opt.name ?? `Option ${i + 1}`}</span>
                        {opt.reason && <span className="text-gray-500 ml-1.5">- {opt.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision / Reasoning */}
              {decision.reasoning && (
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Decision</h4>
                  <p className="text-xs text-gray-400">{decision.reasoning}</p>
                </div>
              )}

              {/* Outcome */}
              <div>
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Outcome</h4>
                <p className="text-xs text-gray-300">{decision.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AIDecisionCard({ decisions = [] }) {
  const visible = decisions
    .filter((decision) => decision.autonomous !== false)
    .slice(-5)
    .reverse()

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="text-base">&#129302;</span> AI Decision Engine
      </h3>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visible.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-600 text-center py-6 animate-pulse"
            >
              AI is watching... decisions will appear here.
            </motion.p>
          ) : (
            visible.map((d, i) => (
              <DecisionItem key={d.id ?? `decision-${i}`} decision={d} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
