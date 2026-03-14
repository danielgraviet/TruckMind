function formatValue(metric) {
  if (metric.format === 'currency') return `$${(metric.value ?? 0).toFixed(2)}`
  if (metric.format === 'percent') return `${((metric.value ?? 0) * 100).toFixed(1)}%`
  return `${metric.value ?? 0}`
}

function KpiCard({ metric }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${metric.border} ${metric.bg}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${metric.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-gray-400">{metric.label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{formatValue(metric)}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${metric.badge}`}>
          {metric.tag}
        </span>
      </div>
      <p className="mt-3 text-xs text-gray-400">{metric.helper}</p>
    </div>
  )
}

export default function OwnerKpiStrip({ shopState }) {
  const kpis = shopState?.kpis ?? {}

  const metrics = [
    {
      label: 'Revenue',
      value: shopState?.totalRevenue ?? 0,
      format: 'currency',
      helper: 'Top-line sales processed by the AI cashier.',
      tag: 'Live',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/20',
      accent: 'bg-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300',
    },
    {
      label: 'Cost of Goods',
      value: shopState?.totalCogs ?? 0,
      format: 'currency',
      helper: 'Total ingredient cost consumed by fulfilled orders.',
      tag: 'COGS',
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/20',
      accent: 'bg-amber-400',
      badge: 'bg-amber-500/15 text-amber-300',
    },
    {
      label: 'Gross Profit',
      value: shopState?.grossProfit ?? 0,
      format: 'currency',
      helper: 'Revenue minus food cost before labor and overhead.',
      tag: 'Margin',
      bg: 'bg-sky-950/40',
      border: 'border-sky-500/20',
      accent: 'bg-sky-400',
      badge: 'bg-sky-500/15 text-sky-300',
    },
    {
      label: 'Gross Margin',
      value: kpis.grossMarginPct ?? 0,
      format: 'percent',
      helper: 'How efficiently the current menu is printing profit.',
      tag: 'Health',
      bg: 'bg-fuchsia-950/35',
      border: 'border-fuchsia-500/20',
      accent: 'bg-fuchsia-400',
      badge: 'bg-fuchsia-500/15 text-fuchsia-300',
    },
    {
      label: 'Average Ticket',
      value: kpis.avgOrderValue ?? 0,
      format: 'currency',
      helper: 'Average customer spend per order.',
      tag: 'AOV',
      bg: 'bg-indigo-950/40',
      border: 'border-indigo-500/20',
      accent: 'bg-indigo-400',
      badge: 'bg-indigo-500/15 text-indigo-300',
    },
    {
      label: 'AI Decisions',
      value: kpis.autonomousActions ?? 0,
      helper: `${kpis.pricingActions ?? 0} pricing, ${kpis.restocks ?? 0} restocks, ${kpis.escalations ?? 0} escalations`,
      tag: 'Auto',
      bg: 'bg-rose-950/35',
      border: 'border-rose-500/20',
      accent: 'bg-rose-400',
      badge: 'bg-rose-500/15 text-rose-300',
    },
  ]

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-gray-400">Owner Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">The AI is running the truck. These are the numbers that explain how.</p>
        </div>
        <div className="rounded-full border border-gray-800 bg-gray-900/80 px-3 py-1 text-xs text-gray-400">
          Inventory value ${((kpis.inventoryValueOnHand ?? 0)).toFixed(2)} | Low stock {kpis.lowStockItems ?? 0}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <KpiCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  )
}
