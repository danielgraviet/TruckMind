import { motion } from 'framer-motion'

function TimelineNode({ step, label, content, isLast = false }) {
  return (
    <div className="flex gap-3">
      {/* Connector line + dot */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-400 shrink-0" />
        {!isLast && <div className="w-0.5 flex-1 bg-red-800/50 min-h-[16px]" />}
      </div>
      {/* Content */}
      <div className="pb-4 min-w-0 flex-1">
        <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">{label}</span>
        <div className="mt-0.5">{content}</div>
      </div>
    </div>
  )
}

function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100)
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-red-500"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
      <span className="text-[10px] text-gray-500 tabular-nums">{pct}%</span>
    </div>
  )
}

export default function EscalationCard({ action }) {
  if (!action || !action.escalated) return null

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-red-950 border border-red-800 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide">Escalation Chain</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
          ACTIVE
        </span>
      </div>

      <div className="ml-1">
        {/* Step 1: What Failed */}
        <TimelineNode
          step={1}
          label="What Failed"
          content={
            <p className="text-xs text-gray-300">{action.description}</p>
          }
        />

        {/* Step 2: What AI Tried */}
        <TimelineNode
          step={2}
          label="What AI Tried"
          content={
            <div className="space-y-1">
              {(action.options_considered ?? []).length > 0 ? (
                action.options_considered.map((opt, i) => (
                  <div key={i} className="text-xs bg-red-900/30 rounded px-2 py-1">
                    <span className="text-gray-300">{opt.option ?? opt.name ?? `Option ${i + 1}`}</span>
                    {opt.reason && <span className="text-gray-500 ml-1.5">- {opt.reason}</span>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No alternatives attempted</p>
              )}
            </div>
          }
        />

        {/* Step 3: Confidence Level */}
        <TimelineNode
          step={3}
          label="Confidence Level"
          content={<ConfidenceBar confidence={action.confidence ?? 0} />}
        />

        {/* Step 4: Policy Restriction */}
        <TimelineNode
          step={4}
          label="Policy Restriction"
          content={
            <p className="text-xs text-gray-300">
              {action.reasoning || 'Policy constraint triggered escalation'}
            </p>
          }
        />

        {/* Step 5: Escalated To */}
        <TimelineNode
          step={5}
          label="Escalated To"
          content={
            <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
              {action.channel === 'escalation' ? 'Escalation Channel' : action.channel ?? 'Manager'}
            </span>
          }
          isLast
        />
      </div>
    </motion.div>
  )
}
