function formatValue(metric) {
  if (metric.format === 'currency') return `$${(metric.value ?? 0).toFixed(2)}`
  if (metric.format === 'percent')  return `${((metric.value ?? 0) * 100).toFixed(1)}%`
  return `${metric.value ?? 0}`
}

// Icon components
function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function PieIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function CpuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  )
}

function KpiCard({ metric }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 transition-transform hover:scale-[1.015] cursor-default select-none"
      style={{ background: metric.gradient, border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
      />

      {/* Icon badge */}
      <div
        className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.30)', color: 'rgba(255,255,255,0.5)' }}
      >
        <metric.Icon />
      </div>

      {/* Label */}
      <p
        className="text-[9.5px] uppercase tracking-[0.22em] mb-2.5"
        style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)' }}
      >
        {metric.label}
      </p>

      {/* Value */}
      <p
        className="text-[22px] font-bold text-white leading-none"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {formatValue(metric)}
      </p>

      {/* Helper */}
      <p
        className="mt-2.5 text-[10.5px] leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)' }}
      >
        {metric.helper}
      </p>
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
      helper: 'Top-line sales from the AI cashier.',
      gradient: 'linear-gradient(135deg, #1e3a70 0%, #4e21a0 100%)',
      Icon: TrendIcon,
    },
    {
      label: 'Cost of Goods',
      value: shopState?.totalCogs ?? 0,
      format: 'currency',
      helper: 'Ingredient cost from fulfilled orders.',
      gradient: 'linear-gradient(135deg, #152a15 0%, #2a5020 100%)',
      Icon: ShoppingBagIcon,
    },
    {
      label: 'Gross Profit',
      value: shopState?.grossProfit ?? 0,
      format: 'currency',
      helper: 'Revenue minus food cost.',
      gradient: 'linear-gradient(135deg, #0d3240 0%, #195858 100%)',
      Icon: LayersIcon,
    },
    {
      label: 'Gross Margin',
      value: kpis.grossMarginPct ?? 0,
      format: 'percent',
      helper: 'Menu efficiency at printing profit.',
      gradient: 'linear-gradient(135deg, #222e14 0%, #3a5018 100%)',
      Icon: PieIcon,
    },
    {
      label: 'Avg Ticket',
      value: kpis.avgOrderValue ?? 0,
      format: 'currency',
      helper: 'Average spend per order.',
      gradient: 'linear-gradient(135deg, #0a1c38 0%, #183360 100%)',
      Icon: TagIcon,
    },
    {
      label: 'AI Decisions',
      value: kpis.autonomousActions ?? 0,
      helper: `${kpis.pricingActions ?? 0} pricing · ${kpis.restocks ?? 0} restocks · ${kpis.escalations ?? 0} escalations`,
      gradient: 'linear-gradient(135deg, #2a0f1e 0%, #481428 100%)',
      Icon: CpuIcon,
    },
  ]

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-[11px] uppercase tracking-[0.25em]"
            style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
          >
            Owner Dashboard
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
          >
            The AI is running the truck. Here's how it's going.
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-1.5 text-[11px]"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ${((kpis.inventoryValueOnHand ?? 0)).toFixed(2)} stock · {kpis.lowStockItems ?? 0} low
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
