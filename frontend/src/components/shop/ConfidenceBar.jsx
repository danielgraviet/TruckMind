import { motion } from 'framer-motion'

export default function ConfidenceBar({ confidence = 1, barClass = 'bg-indigo-500' }) {
  const pct = Math.round(confidence * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
      <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}
