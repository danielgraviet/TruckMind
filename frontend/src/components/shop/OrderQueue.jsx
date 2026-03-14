import { motion, AnimatePresence } from 'framer-motion'
import { formatTime } from '../../utils/formatTime.js'

const STATUS_STYLES = {
  pending:   { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Pending' },
  preparing: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Preparing' },
  ready:     { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Ready' },
  completed: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/20', label: 'Done' },
}

const CHANNEL_LABELS = {
  walk_up: 'Walk-up',
  text_order: 'Text',
  escalation: 'Escalation',
}

function OrderCard({ order }) {
  const status = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending
  const isCompleted = order.status === 'completed'

  return (
    <motion.div
      layout
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -10, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`bg-gray-800 border border-gray-700 rounded-lg p-3 ${isCompleted ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{order.customerName ?? 'Customer'}</span>
          {order.channel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {CHANNEL_LABELS[order.channel] ?? order.channel}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-0.5 mb-2">
        {(order.items ?? []).map((item, i) => (
          <div key={i} className="text-xs text-gray-400 flex justify-between">
            <span>{item.name ?? item}</span>
            {item.price != null && <span className="text-gray-500">${item.price.toFixed(2)}</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{formatTime(order.timestamp)}</span>
        {order.total != null && (
          <span className="text-sm font-semibold text-white">${order.total.toFixed(2)}</span>
        )}
      </div>
    </motion.div>
  )
}

export default function OrderQueue({ orders = [] }) {
  const visible = orders.slice(-10).reverse()

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="text-base">&#128203;</span> Order Queue
        {orders.length > 0 && (
          <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">
            {orders.length}
          </span>
        )}
      </h3>

      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {visible.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-600 text-center py-6"
            >
              No orders yet. Customers will appear here.
            </motion.p>
          ) : (
            visible.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
