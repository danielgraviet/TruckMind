function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isEmergency(action) {
  const desc = (action.description ?? '').toLowerCase()
  const reasoning = (action.reasoning ?? '').toLowerCase()
  return desc.includes('emergency') || desc.includes('urgent') || desc.includes('out of stock')
    || reasoning.includes('emergency') || reasoning.includes('sold out')
    || (action.confidence != null && action.confidence < 0.5)
}

export default function InventoryTimeline({ actions = [] }) {
  const restockActions = actions
    .filter((a) => a.action_type === 'restock' || a.action_type === 'inventory')
    .reverse()

  const recentCount = restockActions.filter((a) => {
    if (!a.timestamp) return false
    const diff = Date.now() - new Date(a.timestamp).getTime()
    return diff < 3600000 // 1 hour
  }).length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Restock History
        </h3>
        {recentCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
            {recentCount} in last hour
          </span>
        )}
      </div>

      {restockActions.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-6">No restocks yet.</p>
      ) : (
        <div className="space-y-0.5 max-h-80 overflow-y-auto scrollbar-thin">
          {restockActions.map((action, i) => {
            const emergency = isEmergency(action)
            return (
              <div
                key={action.id ?? `restock-${i}`}
                className={`flex items-start gap-3 py-2 ${
                  i < restockActions.length - 1 ? 'border-b border-gray-800/50' : ''
                }`}
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    emergency ? 'bg-red-500' : 'bg-emerald-500'
                  }`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 tabular-nums shrink-0">
                      {formatTime(action.timestamp)}
                    </span>
                    {emergency && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">{action.description}</p>
                  {action.reasoning && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{action.reasoning}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
