const HOURS = Array.from({ length: 12 }, (_, i) => i + 7) // 7am - 6pm

function SchedulingPanel({ shopState }) {
  const currentHour = new Date().getHours()
  const openHour = shopState?.openHour ?? 7
  const closeHour = shopState?.closeHour ?? 18

  const isOpen = currentHour >= openHour && currentHour < closeHour
  const isPeak = currentHour >= 11 && currentHour <= 13

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Operating Hours</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
          isPeak
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : isOpen
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }`}>
          {isPeak ? 'Peak' : isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
      <div className="flex gap-0.5">
        {HOURS.map((h) => (
          <div
            key={h}
            className={`flex-1 h-6 rounded-sm flex items-center justify-center text-[9px] transition-colors ${
              h === currentHour
                ? 'bg-indigo-600 text-white font-bold'
                : h >= openHour && h < closeHour
                ? 'bg-gray-800 text-gray-500'
                : 'bg-gray-900 text-gray-700'
            }`}
          >
            {h}
          </div>
        ))}
      </div>
    </div>
  )
}

function StaffingPanel({ orders }) {
  const demandByHour = [2, 3, 5, 10, 12, 8, 6, 9, 11, 7, 4, 2]
  const maxDemand = Math.max(...demandByHour)
  const currentIdx = Math.max(0, new Date().getHours() - 7)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Crew Capacity</span>
        <span className="text-xs text-gray-500">{orders?.length ?? 0} orders today</span>
      </div>
      <div className="flex items-end gap-0.5 h-16">
        {demandByHour.map((d, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-sm transition-colors ${
              i === currentIdx
                ? 'bg-indigo-500'
                : i < currentIdx
                ? 'bg-gray-700'
                : 'bg-gray-800'
            }`}
            style={{ height: `${(d / maxDemand) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Current Load:</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(((orders?.length ?? 0) / 20) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function RoutingPanel({ orders }) {
  const priorities = [
    { label: 'Escalation orders', priority: 1, color: 'bg-red-500' },
    { label: 'Rush mode orders', priority: 2, color: 'bg-amber-500' },
    { label: 'Text orders (async)', priority: 3, color: 'bg-blue-500' },
    { label: 'Walk-up orders', priority: 4, color: 'bg-gray-500' },
  ]

  return (
    <div className="space-y-3">
      <span className="text-xs text-gray-400">Order Queue Priority</span>
      <div className="space-y-1.5">
        {priorities.map((p) => (
          <div key={p.priority} className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${p.color}`}>
              {p.priority}
            </span>
            <span className="text-xs text-gray-400">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MonitoringPanel({
  title = 'Monitor',
  type = 'scheduling',
  strategy,
  shopState,
  orders,
}) {
  const panels = {
    scheduling: SchedulingPanel,
    staffing: StaffingPanel,
    routing: RoutingPanel,
  }
  const PanelComponent = panels[type] ?? panels.scheduling

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-600 border border-gray-700">
          Simulated
        </span>
      </div>
      <PanelComponent strategy={strategy} shopState={shopState} orders={orders} />
    </div>
  )
}
